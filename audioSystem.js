// 音频系统 - Web Audio API音效生成

// 音频配置常量
const AUDIO_CONFIG = {
    // 基础音效参数
    SAMPLE_RATE: 44100,
    DEFAULT_VOLUME: 0.3,
    FADE_DURATION: 0.1,
    
    // 音效频率设置
    FREQUENCIES: {
        MATCH_BASE: 440,      // A4 - 基础消除音效
        COMBO_BASE: 523.25,   // C5 - 连锁反应基础音
        MOVE_TONE: 329.63,    // E4 - 移动音效
        SWAP_TONE: 392.00,    // G4 - 交换音效
        ERROR_TONE: 220.00,   // A3 - 错误音效
        SUCCESS_TONE: 659.25  // E5 - 成功音效
    },
    
    // 音效持续时间
    DURATIONS: {
        MATCH: 0.2,
        COMBO: 0.3,
        MOVE: 0.1,
        SWAP: 0.15,
        ERROR: 0.25,
        SUCCESS: 0.4
    },
    
    // 波形类型
    WAVE_TYPES: {
        SINE: 'sine',
        SQUARE: 'square',
        SAWTOOTH: 'sawtooth',
        TRIANGLE: 'triangle'
    }
};

// AudioSystem类 - 音频系统管理器
class AudioSystem {
    constructor() {
        this.audioContext = null;
        this.masterGain = null;
        this.isMuted = false;
        this.isEnabled = true;
        this.volume = AUDIO_CONFIG.DEFAULT_VOLUME;
        this.isInitialized = false;
        this.pendingInitialization = false;
        
        // 不在构造函数中初始化AudioContext
        // 将在用户交互后初始化
        
        // 加载保存的音频设置
        this.loadAudioSettings();
    }

    // 初始化音频系统（需要用户交互后调用）
    async initialize() {
        if (this.isInitialized || this.pendingInitialization) {
            return this.isInitialized;
        }

        this.pendingInitialization = true;

        try {
            // 检查Web Audio API支持
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (!AudioContext) {
                console.warn('Web Audio API not supported');
                this.isEnabled = false;
                this.pendingInitialization = false;
                return false;
            }

            // 创建音频上下文
            this.audioContext = new AudioContext();
            
            // 如果AudioContext处于suspended状态，尝试恢复
            if (this.audioContext.state === 'suspended') {
                await this.audioContext.resume();
            }
            
            // 创建主音量控制节点
            this.masterGain = this.audioContext.createGain();
            this.masterGain.connect(this.audioContext.destination);
            this.masterGain.gain.setValueAtTime(this.volume, this.audioContext.currentTime);

            this.isInitialized = true;
            this.pendingInitialization = false;
            console.log('音频系统初始化成功');
            
            return true;
            
        } catch (error) {
            console.error('音频系统初始化失败:', error);
            this.isEnabled = false;
            this.isInitialized = false;
            this.pendingInitialization = false;
            return false;
        }
    }

    // 恢复音频上下文（用户交互后）
    async resumeContext() {
        try {
            // 如果还没有初始化，先初始化
            if (!this.isInitialized) {
                return await this.initialize();
            }
            
            // 如果AudioContext处于suspended状态，恢复它
            if (this.audioContext && this.audioContext.state === 'suspended') {
                await this.audioContext.resume();
                console.log('AudioContext已恢复');
                return true;
            }
            
            return this.isInitialized;
        } catch (error) {
            console.error('恢复AudioContext失败:', error);
            return false;
        }
    }

    // 生成基础音调
    generateTone(frequency, duration, waveType = AUDIO_CONFIG.WAVE_TYPES.SINE, volume = 1.0) {
        if (!this.isEnabled || this.isMuted || !this.audioContext) {
            return Promise.resolve();
        }

        return new Promise((resolve) => {
            try {
                // 创建振荡器
                const oscillator = this.audioContext.createOscillator();
                const gainNode = this.audioContext.createGain();

                // 设置波形类型和频率
                oscillator.type = waveType;
                oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);

                // 连接音频节点
                oscillator.connect(gainNode);
                gainNode.connect(this.masterGain);

                // 设置音量包络（淡入淡出）
                const now = this.audioContext.currentTime;
                const fadeIn = AUDIO_CONFIG.FADE_DURATION;
                const fadeOut = AUDIO_CONFIG.FADE_DURATION;
                const sustainTime = duration - fadeIn - fadeOut;

                gainNode.gain.setValueAtTime(0, now);
                gainNode.gain.linearRampToValueAtTime(volume, now + fadeIn);
                
                if (sustainTime > 0) {
                    gainNode.gain.setValueAtTime(volume, now + fadeIn + sustainTime);
                }
                
                gainNode.gain.linearRampToValueAtTime(0, now + duration);

                // 启动和停止振荡器
                oscillator.start(now);
                oscillator.stop(now + duration);

                // 清理资源
                oscillator.onended = () => {
                    oscillator.disconnect();
                    gainNode.disconnect();
                    resolve();
                };

            } catch (error) {
                console.error('生成音调失败:', error);
                resolve();
            }
        });
    }

    // 生成复合音调（和弦）
    generateChord(frequencies, duration, waveType = AUDIO_CONFIG.WAVE_TYPES.SINE, volume = 0.7) {
        if (!this.isEnabled || this.isMuted || !this.audioContext) {
            return Promise.resolve();
        }

        const promises = frequencies.map(freq => 
            this.generateTone(freq, duration, waveType, volume / frequencies.length)
        );

        return Promise.all(promises);
    }

    // 播放元素消除音效
    playMatchSound(matchLength = 3) {
        const baseFreq = AUDIO_CONFIG.FREQUENCIES.MATCH_BASE;
        const duration = AUDIO_CONFIG.DURATIONS.MATCH;
        
        // 根据消除长度调整音调高度
        const frequency = baseFreq * (1 + (matchLength - 3) * 0.2);
        
        return this.generateTone(
            frequency, 
            duration, 
            AUDIO_CONFIG.WAVE_TYPES.SINE,
            0.8
        );
    }

    // 播放连锁反应音效
    playComboSound(comboCount = 1) {
        const baseFreq = AUDIO_CONFIG.FREQUENCIES.COMBO_BASE;
        const duration = AUDIO_CONFIG.DURATIONS.COMBO;
        
        // 连锁反应使用上升的音调序列
        const frequencies = [];
        for (let i = 0; i < Math.min(comboCount, 5); i++) {
            frequencies.push(baseFreq * Math.pow(1.2, i));
        }
        
        return this.generateChord(
            frequencies,
            duration,
            AUDIO_CONFIG.WAVE_TYPES.TRIANGLE,
            0.9
        );
    }

    // 播放高级连锁反应音效序列
    playAdvancedChainReaction(chainLevel = 1, totalChains = 1) {
        if (!this.isEnabled || this.isMuted || !this.audioContext) {
            return Promise.resolve();
        }

        // 根据连锁等级创建不同的音效模式
        if (chainLevel === 1) {
            // 第一级：简单上升音调
            return this.playChainReactionSound(1);
        } else if (chainLevel <= 3) {
            // 2-3级：和弦 + 回声效果
            return this.playChainWithEcho(chainLevel);
        } else if (chainLevel <= 6) {
            // 4-6级：复杂和弦 + 颤音
            return this.playChainWithVibrato(chainLevel);
        } else {
            // 7级以上：史诗级音效
            return this.playEpicChainSound(chainLevel, totalChains);
        }
    }

    // 播放带回声效果的连锁音效
    playChainWithEcho(chainLevel) {
        const baseFreq = AUDIO_CONFIG.FREQUENCIES.COMBO_BASE;
        const duration = 0.4;
        const echoDelay = 0.15;
        const echoDecay = 0.6;

        // 主音效
        const mainFrequencies = [
            baseFreq * Math.pow(1.2, chainLevel - 1),
            baseFreq * Math.pow(1.2, chainLevel - 1) * 1.25
        ];

        const mainPromise = this.generateChord(
            mainFrequencies,
            duration,
            AUDIO_CONFIG.WAVE_TYPES.SINE,
            0.8
        );

        // 回声音效
        setTimeout(() => {
            this.generateChord(
                mainFrequencies,
                duration * 0.8,
                AUDIO_CONFIG.WAVE_TYPES.SINE,
                0.8 * echoDecay
            );
        }, echoDelay * 1000);

        // 第二次回声
        setTimeout(() => {
            this.generateChord(
                mainFrequencies,
                duration * 0.6,
                AUDIO_CONFIG.WAVE_TYPES.SINE,
                0.8 * echoDecay * echoDecay
            );
        }, (echoDelay * 2) * 1000);

        return mainPromise;
    }

    // 播放带颤音的连锁音效
    playChainWithVibrato(chainLevel) {
        const baseFreq = AUDIO_CONFIG.FREQUENCIES.COMBO_BASE;
        const duration = 0.5;

        const frequencies = [
            baseFreq * Math.pow(1.15, chainLevel - 1),
            baseFreq * Math.pow(1.15, chainLevel - 1) * 1.25,
            baseFreq * Math.pow(1.15, chainLevel - 1) * 1.5
        ];

        return this.generateChordWithVibrato(frequencies, duration, 0.9, 6);
    }

    // 播放史诗级连锁音效
    playEpicChainSound(chainLevel, totalChains) {
        const baseFreq = AUDIO_CONFIG.FREQUENCIES.COMBO_BASE;
        const duration = 0.8;

        // 创建复杂的和弦进行
        const chord1 = [
            baseFreq * Math.pow(1.1, chainLevel - 1),
            baseFreq * Math.pow(1.1, chainLevel - 1) * 1.25,
            baseFreq * Math.pow(1.1, chainLevel - 1) * 1.5,
            baseFreq * Math.pow(1.1, chainLevel - 1) * 2.0
        ];

        const chord2 = chord1.map(freq => freq * 1.125); // 上升小二度

        // 播放和弦进行
        const promise1 = this.generateChordWithVibrato(chord1, duration * 0.6, 1.0, 8);
        
        setTimeout(() => {
            this.generateChordWithVibrato(chord2, duration * 0.8, 1.0, 10);
        }, duration * 400);

        // 添加打击乐效果（使用噪音）
        setTimeout(() => {
            this.generatePercussiveEffect(chainLevel);
        }, duration * 200);

        return promise1;
    }

    // 生成打击乐效果
    generatePercussiveEffect(intensity = 1) {
        if (!this.isEnabled || this.isMuted || !this.audioContext) {
            return Promise.resolve();
        }

        return new Promise((resolve) => {
            try {
                // 创建白噪音
                const bufferSize = this.audioContext.sampleRate * 0.1; // 0.1秒
                const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
                const output = buffer.getChannelData(0);

                // 生成噪音数据
                for (let i = 0; i < bufferSize; i++) {
                    output[i] = (Math.random() * 2 - 1) * intensity * 0.3;
                }

                // 创建音频节点
                const source = this.audioContext.createBufferSource();
                const gainNode = this.audioContext.createGain();
                const filter = this.audioContext.createBiquadFilter();

                // 设置滤波器（高通滤波器模拟打击乐）
                filter.type = 'highpass';
                filter.frequency.setValueAtTime(200 + intensity * 100, this.audioContext.currentTime);

                // 连接节点
                source.buffer = buffer;
                source.connect(filter);
                filter.connect(gainNode);
                gainNode.connect(this.masterGain);

                // 设置音量包络（快速衰减）
                const now = this.audioContext.currentTime;
                const duration = 0.1;
                
                gainNode.gain.setValueAtTime(0.8, now);
                gainNode.gain.exponentialRampToValueAtTime(0.01, now + duration);

                // 播放
                source.start(now);
                source.stop(now + duration);

                source.onended = () => {
                    source.disconnect();
                    filter.disconnect();
                    gainNode.disconnect();
                    resolve();
                };

            } catch (error) {
                console.error('生成打击乐效果失败:', error);
                resolve();
            }
        });
    }

    // 播放特殊连锁反应音效（高级版本）
    playChainReactionSound(chainLevel = 1, maxChain = 5) {
        if (!this.isEnabled || this.isMuted || !this.audioContext) {
            return Promise.resolve();
        }

        const baseFreq = AUDIO_CONFIG.FREQUENCIES.COMBO_BASE;
        const duration = Math.min(0.5, 0.2 + chainLevel * 0.05);
        
        // 根据连锁等级创建更复杂的音效
        if (chainLevel === 1) {
            // 第一级连锁：简单的上升音调
            return this.generateTone(baseFreq * 1.2, duration, AUDIO_CONFIG.WAVE_TYPES.SINE, 0.7);
        } else if (chainLevel <= 3) {
            // 2-3级连锁：双音调和弦
            const frequencies = [
                baseFreq * Math.pow(1.2, chainLevel - 1),
                baseFreq * Math.pow(1.2, chainLevel - 1) * 1.25
            ];
            return this.generateChord(frequencies, duration, AUDIO_CONFIG.WAVE_TYPES.TRIANGLE, 0.8);
        } else {
            // 4级以上连锁：复杂和弦加特效
            const frequencies = [
                baseFreq * Math.pow(1.15, chainLevel - 1),
                baseFreq * Math.pow(1.15, chainLevel - 1) * 1.25,
                baseFreq * Math.pow(1.15, chainLevel - 1) * 1.5
            ];
            
            // 添加颤音效果
            return this.generateChordWithVibrato(frequencies, duration, 0.9, 5);
        }
    }

    // 生成带颤音效果的和弦
    generateChordWithVibrato(frequencies, duration, volume = 0.7, vibratoRate = 5) {
        if (!this.isEnabled || this.isMuted || !this.audioContext) {
            return Promise.resolve();
        }

        return new Promise((resolve) => {
            try {
                const oscillators = [];
                const gainNodes = [];

                frequencies.forEach((frequency, index) => {
                    // 创建主振荡器
                    const oscillator = this.audioContext.createOscillator();
                    const gainNode = this.audioContext.createGain();
                    
                    // 创建颤音振荡器
                    const vibratoOsc = this.audioContext.createOscillator();
                    const vibratoGain = this.audioContext.createGain();
                    
                    // 设置颤音参数
                    vibratoOsc.frequency.setValueAtTime(vibratoRate, this.audioContext.currentTime);
                    vibratoGain.gain.setValueAtTime(frequency * 0.02, this.audioContext.currentTime); // 2% 频率调制
                    
                    // 连接颤音
                    vibratoOsc.connect(vibratoGain);
                    vibratoGain.connect(oscillator.frequency);
                    
                    // 设置主振荡器
                    oscillator.type = AUDIO_CONFIG.WAVE_TYPES.SINE;
                    oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
                    
                    // 连接音频节点
                    oscillator.connect(gainNode);
                    gainNode.connect(this.masterGain);
                    
                    // 设置音量包络
                    const now = this.audioContext.currentTime;
                    const fadeIn = AUDIO_CONFIG.FADE_DURATION;
                    const fadeOut = AUDIO_CONFIG.FADE_DURATION;
                    const sustainTime = duration - fadeIn - fadeOut;
                    const noteVolume = volume / frequencies.length;

                    gainNode.gain.setValueAtTime(0, now);
                    gainNode.gain.linearRampToValueAtTime(noteVolume, now + fadeIn);
                    
                    if (sustainTime > 0) {
                        gainNode.gain.setValueAtTime(noteVolume, now + fadeIn + sustainTime);
                    }
                    
                    gainNode.gain.linearRampToValueAtTime(0, now + duration);

                    // 启动振荡器
                    oscillator.start(now);
                    oscillator.stop(now + duration);
                    vibratoOsc.start(now);
                    vibratoOsc.stop(now + duration);
                    
                    oscillators.push(oscillator);
                    gainNodes.push(gainNode);
                });

                // 清理资源
                const lastOscillator = oscillators[oscillators.length - 1];
                lastOscillator.onended = () => {
                    oscillators.forEach(osc => osc.disconnect());
                    gainNodes.forEach(gain => gain.disconnect());
                    resolve();
                };

            } catch (error) {
                console.error('生成颤音和弦失败:', error);
                resolve();
            }
        });
    }

    // 播放元素移动音效
    playMoveSound() {
        const frequency = AUDIO_CONFIG.FREQUENCIES.MOVE_TONE;
        const duration = AUDIO_CONFIG.DURATIONS.MOVE;
        
        return this.generateTone(
            frequency,
            duration,
            AUDIO_CONFIG.WAVE_TYPES.TRIANGLE,
            0.5
        );
    }

    // 播放元素交换音效
    playSwapSound() {
        const frequency = AUDIO_CONFIG.FREQUENCIES.SWAP_TONE;
        const duration = AUDIO_CONFIG.DURATIONS.SWAP;
        
        // 交换音效使用两个音调的快速序列
        const freq1 = frequency;
        const freq2 = frequency * 1.25;
        
        const promise1 = this.generateTone(freq1, duration * 0.6, AUDIO_CONFIG.WAVE_TYPES.SINE, 0.6);
        
        setTimeout(() => {
            this.generateTone(freq2, duration * 0.6, AUDIO_CONFIG.WAVE_TYPES.SINE, 0.6);
        }, duration * 400); // 40% 重叠
        
        return promise1;
    }

    // 播放错误音效
    playErrorSound() {
        const frequency = AUDIO_CONFIG.FREQUENCIES.ERROR_TONE;
        const duration = AUDIO_CONFIG.DURATIONS.ERROR;
        
        return this.generateTone(
            frequency,
            duration,
            AUDIO_CONFIG.WAVE_TYPES.SAWTOOTH,
            0.7
        );
    }

    // 播放成功音效
    playSuccessSound() {
        const baseFreq = AUDIO_CONFIG.FREQUENCIES.SUCCESS_TONE;
        const duration = AUDIO_CONFIG.DURATIONS.SUCCESS;
        
        // 成功音效使用上升的三和弦
        const frequencies = [
            baseFreq,           // 根音
            baseFreq * 1.25,    // 大三度
            baseFreq * 1.5      // 完全五度
        ];
        
        return this.generateChord(
            frequencies,
            duration,
            AUDIO_CONFIG.WAVE_TYPES.SINE,
            0.8
        );
    }

    // 播放游戏开始音效
    playGameStartSound() {
        const baseFreq = AUDIO_CONFIG.FREQUENCIES.SUCCESS_TONE;
        const duration = 0.6;
        
        // 游戏开始使用上升音阶
        const frequencies = [
            baseFreq * 0.75,    // 下属音
            baseFreq,           // 主音
            baseFreq * 1.25,    // 三度
            baseFreq * 1.5      // 五度
        ];
        
        // 依次播放音符
        let delay = 0;
        const noteDelay = 0.15;
        
        frequencies.forEach((freq, index) => {
            setTimeout(() => {
                this.generateTone(freq, 0.3, AUDIO_CONFIG.WAVE_TYPES.SINE, 0.7);
            }, delay);
            delay += noteDelay * 1000;
        });
        
        return Promise.resolve();
    }

    // 播放暂停音效
    playPauseSound() {
        if (!this.isEnabled || this.isMuted || !this.audioContext) {
            return Promise.resolve();
        }

        const baseFreq = AUDIO_CONFIG.FREQUENCIES.MOVE_TONE;
        const duration = 0.3;

        // 下降音调表示暂停
        return this.generateTone(baseFreq, duration * 0.5, AUDIO_CONFIG.WAVE_TYPES.SINE, 0.6)
            .then(() => {
                return this.generateTone(baseFreq * 0.75, duration * 0.5, AUDIO_CONFIG.WAVE_TYPES.SINE, 0.4);
            });
    }

    // 播放继续音效
    playResumeSound() {
        if (!this.isEnabled || this.isMuted || !this.audioContext) {
            return Promise.resolve();
        }

        const baseFreq = AUDIO_CONFIG.FREQUENCIES.MOVE_TONE;
        const duration = 0.3;

        // 上升音调表示继续
        return this.generateTone(baseFreq * 0.75, duration * 0.5, AUDIO_CONFIG.WAVE_TYPES.SINE, 0.4)
            .then(() => {
                return this.generateTone(baseFreq, duration * 0.5, AUDIO_CONFIG.WAVE_TYPES.SINE, 0.6);
            });
    }

    // 播放重新开始音效
    playRestartSound() {
        if (!this.isEnabled || this.isMuted || !this.audioContext) {
            return Promise.resolve();
        }

        const baseFreq = AUDIO_CONFIG.FREQUENCIES.SUCCESS_TONE;
        const duration = 0.4;

        // 快速的重置音效序列
        const notes = [
            baseFreq * 1.5,   // 高音
            baseFreq * 0.5,   // 低音
            baseFreq          // 中音
        ];

        let delay = 0;
        const noteDelay = 0.1;

        notes.forEach((freq, index) => {
            setTimeout(() => {
                this.generateTone(freq, 0.15, AUDIO_CONFIG.WAVE_TYPES.TRIANGLE, 0.7);
            }, delay);
            delay += noteDelay * 1000;
        });

        return Promise.resolve();
    }

    // 播放游戏结束音效
    playGameOverSound() {
        if (!this.isEnabled || this.isMuted || !this.audioContext) {
            return Promise.resolve();
        }

        const baseFreq = AUDIO_CONFIG.FREQUENCIES.ERROR_TONE;
        const duration = 0.8;

        // 下降音阶表示游戏结束
        const notes = [
            baseFreq * 1.5,   // 高音
            baseFreq * 1.25,  // 中高音
            baseFreq,         // 中音
            baseFreq * 0.75   // 低音
        ];

        let delay = 0;
        const noteDelay = 0.2;

        notes.forEach((freq, index) => {
            setTimeout(() => {
                this.generateTone(freq, 0.25, AUDIO_CONFIG.WAVE_TYPES.SAWTOOTH, 0.6);
            }, delay);
            delay += noteDelay * 1000;
        });

        return Promise.resolve();
    }

    // 设置主音量
    setVolume(volume) {
        this.volume = Math.max(0, Math.min(1, volume));
        
        if (this.masterGain && this.audioContext) {
            this.masterGain.gain.setValueAtTime(
                this.isMuted ? 0 : this.volume,
                this.audioContext.currentTime
            );
        }
        
        console.log(`音量设置为: ${Math.round(this.volume * 100)}%`);
    }

    // 获取当前音量
    getVolume() {
        return this.volume;
    }

    // 增加音量
    increaseVolume(step = 0.1) {
        const newVolume = Math.min(1, this.volume + step);
        this.setVolume(newVolume);
        return newVolume;
    }

    // 减少音量
    decreaseVolume(step = 0.1) {
        const newVolume = Math.max(0, this.volume - step);
        this.setVolume(newVolume);
        return newVolume;
    }

    // 设置音量百分比
    setVolumePercent(percent) {
        const volume = Math.max(0, Math.min(100, percent)) / 100;
        this.setVolume(volume);
        return volume;
    }

    // 获取音量百分比
    getVolumePercent() {
        return Math.round(this.volume * 100);
    }

    // 切换静音状态
    toggleMute() {
        this.isMuted = !this.isMuted;
        
        if (this.masterGain && this.audioContext) {
            // 使用平滑过渡避免爆音
            const now = this.audioContext.currentTime;
            const targetVolume = this.isMuted ? 0 : this.volume;
            
            this.masterGain.gain.cancelScheduledValues(now);
            this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, now);
            this.masterGain.gain.linearRampToValueAtTime(targetVolume, now + 0.05);
        }
        
        console.log(`音效${this.isMuted ? '静音' : '开启'}`);
        return this.isMuted;
    }

    // 设置静音状态
    setMute(muted) {
        if (this.isMuted !== muted) {
            this.toggleMute();
        }
        return this.isMuted;
    }

    // 获取静音状态
    getMuteStatus() {
        return this.isMuted;
    }

    // 启用音频系统
    enable() {
        this.isEnabled = true;
        if (!this.audioContext) {
            this.initialize();
        }
    }

    // 禁用音频系统
    disable() {
        this.isEnabled = false;
        if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
            this.masterGain = null;
        }
    }

    // 获取音频系统状态
    getStatus() {
        return {
            isEnabled: this.isEnabled,
            isMuted: this.isMuted,
            volume: this.volume,
            contextState: this.audioContext ? this.audioContext.state : 'closed',
            isSupported: !!(window.AudioContext || window.webkitAudioContext)
        };
    }

    // 播放大消除音效（4个或更多元素）
    playBigMatchSound(matchLength = 4) {
        const baseFreq = AUDIO_CONFIG.FREQUENCIES.MATCH_BASE;
        const duration = AUDIO_CONFIG.DURATIONS.MATCH * 1.5;
        
        // 大消除使用更丰富的和弦
        const frequencies = [
            baseFreq * (1 + (matchLength - 3) * 0.2),
            baseFreq * (1 + (matchLength - 3) * 0.2) * 1.25,
            baseFreq * (1 + (matchLength - 3) * 0.2) * 1.5
        ];
        
        return this.generateChord(
            frequencies,
            duration,
            AUDIO_CONFIG.WAVE_TYPES.SINE,
            1.0
        );
    }

    // 播放特殊形状匹配音效（L型、T型等）
    playSpecialMatchSound(shapeType = 'L') {
        const baseFreq = AUDIO_CONFIG.FREQUENCIES.COMBO_BASE;
        const duration = AUDIO_CONFIG.DURATIONS.COMBO;
        
        let frequencies;
        if (shapeType === 'L') {
            // L型：不协和音程
            frequencies = [baseFreq, baseFreq * 1.414, baseFreq * 1.682];
        } else if (shapeType === 'T') {
            // T型：大三和弦
            frequencies = [baseFreq, baseFreq * 1.25, baseFreq * 1.5];
        } else {
            // 其他特殊形状
            frequencies = [baseFreq, baseFreq * 1.333, baseFreq * 1.6];
        }
        
        return this.generateChord(
            frequencies,
            duration,
            AUDIO_CONFIG.WAVE_TYPES.TRIANGLE,
            0.9
        );
    }

    // 播放音量测试音效
    playVolumeTestSound() {
        const frequency = AUDIO_CONFIG.FREQUENCIES.SUCCESS_TONE;
        const duration = 0.3;
        
        return this.generateTone(
            frequency,
            duration,
            AUDIO_CONFIG.WAVE_TYPES.SINE,
            0.8
        );
    }

    // 设置音量预设
    setVolumePreset(preset) {
        const presets = {
            'mute': 0,
            'low': 0.2,
            'medium': 0.5,
            'high': 0.8,
            'max': 1.0
        };

        if (presets.hasOwnProperty(preset)) {
            this.setVolume(presets[preset]);
            console.log(`音量预设设置为: ${preset} (${Math.round(presets[preset] * 100)}%)`);
            return presets[preset];
        } else {
            console.warn('无效的音量预设:', preset);
            return this.volume;
        }
    }

    // 获取当前音量预设名称
    getVolumePresetName() {
        const volume = this.volume;
        if (volume === 0) return 'mute';
        if (volume <= 0.25) return 'low';
        if (volume <= 0.6) return 'medium';
        if (volume <= 0.85) return 'high';
        return 'max';
    }

    // 循环切换音量预设
    cycleVolumePreset() {
        const presets = ['mute', 'low', 'medium', 'high', 'max'];
        const currentPreset = this.getVolumePresetName();
        const currentIndex = presets.indexOf(currentPreset);
        const nextIndex = (currentIndex + 1) % presets.length;
        const nextPreset = presets[nextIndex];
        
        this.setVolumePreset(nextPreset);
        
        // 播放测试音效（除非是静音）
        if (nextPreset !== 'mute') {
            setTimeout(() => {
                this.playVolumeTestSound();
            }, 100);
        }
        
        return nextPreset;
    }

    // 保存音频设置到本地存储
    saveAudioSettings() {
        try {
            const settings = {
                volume: this.volume,
                isMuted: this.isMuted,
                isEnabled: this.isEnabled,
                timestamp: Date.now()
            };
            
            localStorage.setItem('ghostMatchGame_audioSettings', JSON.stringify(settings));
            console.log('音频设置已保存');
            return true;
        } catch (error) {
            console.error('保存音频设置失败:', error);
            return false;
        }
    }

    // 从本地存储加载音频设置
    loadAudioSettings() {
        try {
            const settingsStr = localStorage.getItem('ghostMatchGame_audioSettings');
            if (!settingsStr) {
                console.log('未找到保存的音频设置，使用默认设置');
                return false;
            }

            const settings = JSON.parse(settingsStr);
            
            // 验证设置数据
            if (typeof settings.volume === 'number' && settings.volume >= 0 && settings.volume <= 1) {
                this.setVolume(settings.volume);
            }
            
            if (typeof settings.isMuted === 'boolean') {
                this.setMute(settings.isMuted);
            }
            
            if (typeof settings.isEnabled === 'boolean') {
                if (settings.isEnabled) {
                    this.enable();
                } else {
                    this.disable();
                }
            }
            
            console.log('音频设置已加载:', settings);
            return true;
        } catch (error) {
            console.error('加载音频设置失败:', error);
            return false;
        }
    }

    // 重置音频设置为默认值
    resetAudioSettings() {
        this.setVolume(AUDIO_CONFIG.DEFAULT_VOLUME);
        this.setMute(false);
        this.enable();
        
        // 清除本地存储
        try {
            localStorage.removeItem('ghostMatchGame_audioSettings');
            console.log('音频设置已重置为默认值');
        } catch (error) {
            console.error('清除音频设置失败:', error);
        }
        
        // 播放测试音效
        setTimeout(() => {
            this.playVolumeTestSound();
        }, 100);
    }

    // 获取音频设置摘要
    getAudioSettingsSummary() {
        return {
            volume: this.volume,
            volumePercent: this.getVolumePercent(),
            volumePreset: this.getVolumePresetName(),
            isMuted: this.isMuted,
            isEnabled: this.isEnabled,
            contextState: this.audioContext ? this.audioContext.state : 'closed',
            isSupported: !!(window.AudioContext || window.webkitAudioContext)
        };
    }

    // 测试所有音效
    testAllSounds() {
        if (!this.isEnabled) {
            console.log('音频系统未启用');
            return;
        }

        console.log('开始测试所有音效...');
        
        let delay = 0;
        const testDelay = 1000;

        // 测试基础音调
        setTimeout(() => {
            console.log('测试基础音调');
            this.generateTone(440, 0.5);
        }, delay);
        delay += testDelay;

        // 测试消除音效
        setTimeout(() => {
            console.log('测试消除音效 (3个)');
            this.playMatchSound(3);
        }, delay);
        delay += testDelay;

        // 测试大消除音效
        setTimeout(() => {
            console.log('测试大消除音效 (5个)');
            this.playBigMatchSound(5);
        }, delay);
        delay += testDelay;

        // 测试L型匹配音效
        setTimeout(() => {
            console.log('测试L型匹配音效');
            this.playSpecialMatchSound('L');
        }, delay);
        delay += testDelay;

        // 测试T型匹配音效
        setTimeout(() => {
            console.log('测试T型匹配音效');
            this.playSpecialMatchSound('T');
        }, delay);
        delay += testDelay;

        // 测试连锁音效
        setTimeout(() => {
            console.log('测试连锁音效 (2级)');
            this.playComboSound(2);
        }, delay);
        delay += testDelay;

        // 测试高级连锁音效
        setTimeout(() => {
            console.log('测试高级连锁音效 (4级)');
            this.playChainReactionSound(4);
        }, delay);
        delay += testDelay;

        // 测试移动音效
        setTimeout(() => {
            console.log('测试移动音效');
            this.playMoveSound();
        }, delay);
        delay += testDelay;

        // 测试交换音效
        setTimeout(() => {
            console.log('测试交换音效');
            this.playSwapSound();
        }, delay);
        delay += testDelay;

        // 测试错误音效
        setTimeout(() => {
            console.log('测试错误音效');
            this.playErrorSound();
        }, delay);
        delay += testDelay;

        // 测试成功音效
        setTimeout(() => {
            console.log('测试成功音效');
            this.playSuccessSound();
        }, delay);
        delay += testDelay;

        // 测试游戏开始音效
        setTimeout(() => {
            console.log('测试游戏开始音效');
            this.playGameStartSound();
        }, delay);
        delay += testDelay;

        // 测试音量控制
        setTimeout(() => {
            console.log('测试音量控制 - 50%');
            this.setVolumePercent(50);
            this.playVolumeTestSound();
        }, delay);
        delay += testDelay;

        setTimeout(() => {
            console.log('测试音量控制 - 100%');
            this.setVolumePercent(100);
            this.playVolumeTestSound();
        }, delay);

        console.log('音效测试完成！');
    }
}

// 创建全局音频系统实例的工厂函数
function createAudioSystem() {
    return new AudioSystem();
}

// 导出音频系统类和工厂函数
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { AudioSystem, createAudioSystem, AUDIO_CONFIG };
} else {
    window.AudioSystem = AudioSystem;
    window.createAudioSystem = createAudioSystem;
    window.AUDIO_CONFIG = AUDIO_CONFIG;
}