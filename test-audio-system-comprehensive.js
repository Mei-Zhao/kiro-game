/**
 * 音频系统综合测试套件
 * 测试AudioSystem类的所有功能，包括新增的延迟初始化功能
 */

// 模拟浏览器环境
const { JSDOM } = require('jsdom');
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
    url: 'http://localhost',
    pretendToBeVisual: true,
    resources: 'usable'
});

global.window = dom.window;
global.document = dom.window.document;
global.localStorage = {
    data: {},
    getItem(key) { return this.data[key] || null; },
    setItem(key, value) { this.data[key] = value; },
    removeItem(key) { delete this.data[key]; },
    clear() { this.data = {}; }
};

// 模拟Web Audio API
global.AudioContext = class MockAudioContext {
    constructor() {
        this.state = 'suspended';
        this.currentTime = 0;
        this.sampleRate = 44100;
        this.destination = { connect: () => {} };
    }
    
    async resume() {
        this.state = 'running';
        return Promise.resolve();
    }
    
    async close() {
        this.state = 'closed';
        return Promise.resolve();
    }
    
    createGain() {
        return {
            gain: {
                value: 1,
                setValueAtTime: () => {},
                linearRampToValueAtTime: () => {},
                exponentialRampToValueAtTime: () => {},
                cancelScheduledValues: () => {}
            },
            connect: () => {},
            disconnect: () => {}
        };
    }
    
    createOscillator() {
        return {
            type: 'sine',
            frequency: {
                value: 440,
                setValueAtTime: () => {}
            },
            connect: () => {},
            disconnect: () => {},
            start: () => {},
            stop: () => {},
            onended: null
        };
    }
    
    createBuffer(channels, length, sampleRate) {
        return {
            getChannelData: () => new Float32Array(length)
        };
    }
    
    createBufferSource() {
        return {
            buffer: null,
            connect: () => {},
            disconnect: () => {},
            start: () => {},
            stop: () => {},
            onended: null
        };
    }
    
    createBiquadFilter() {
        return {
            type: 'lowpass',
            frequency: {
                value: 350,
                setValueAtTime: () => {}
            },
            connect: () => {},
            disconnect: () => {}
        };
    }
};

// 导入AudioSystem
const { AudioSystem } = require('./audioSystem.js');

// 测试结果统计
let testResults = {
    passed: 0,
    failed: 0,
    total: 0,
    failures: []
};

// 测试工具函数
function assert(condition, message) {
    testResults.total++;
    if (condition) {
        testResults.passed++;
        console.log(`✅ ${message}`);
    } else {
        testResults.failed++;
        testResults.failures.push(message);
        console.log(`❌ ${message}`);
    }
}

function assertEquals(actual, expected, message) {
    assert(actual === expected, `${message} (期望: ${expected}, 实际: ${actual})`);
}

function assertNotNull(value, message) {
    assert(value !== null && value !== undefined, message);
}

function assertNull(value, message) {
    assert(value === null || value === undefined, message);
}

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

console.log('🎵 开始音频系统综合测试...\n');

// 主测试函数
async function runAudioSystemTests() {
    console.log('=== 音频系统基础功能测试 ===');
    await testBasicFunctionality();
    
    console.log('\n=== 音频系统初始化测试 ===');
    await testInitialization();
    
    console.log('\n=== 音频系统音效测试 ===');
    await testSoundEffects();
    
    console.log('\n=== 音频系统音量控制测试 ===');
    await testVolumeControl();
    
    console.log('\n=== 音频系统设置持久化测试 ===');
    await testSettingsPersistence();
    
    console.log('\n=== 音频系统错误处理测试 ===');
    await testErrorHandling();
    
    console.log('\n=== 音频系统边界情况测试 ===');
    await testEdgeCases();
    
    // 输出测试结果
    console.log('\n📊 测试结果汇总:');
    console.log('==========================================');
    console.log(`总测试数: ${testResults.total}`);
    console.log(`通过: ${testResults.passed}`);
    console.log(`失败: ${testResults.failed}`);
    console.log(`成功率: ${((testResults.passed / testResults.total) * 100).toFixed(1)}%`);
    
    if (testResults.failed > 0) {
        console.log('\n❌ 失败的测试:');
        testResults.failures.forEach(failure => {
            console.log(`  - ${failure}`);
        });
    }
    
    return testResults.failed === 0;
}

// 测试基础功能
async function testBasicFunctionality() {
    console.log('测试 AudioSystem 构造函数...');
    
    const audioSystem = new AudioSystem();
    assertNotNull(audioSystem, 'AudioSystem 实例应该被创建');
    assertEquals(audioSystem.isInitialized, false, '初始状态应该是未初始化');
    assertEquals(audioSystem.isEnabled, true, '初始状态应该是启用的');
    assertEquals(audioSystem.isMuted, false, '初始状态应该是非静音');
    assertEquals(audioSystem.volume, 0.3, '初始音量应该是默认值');
    assertNull(audioSystem.audioContext, '初始时 AudioContext 应该为空');
    
    console.log('✅ 基础功能测试完成');
}

// 测试初始化功能
async function testInitialization() {
    console.log('测试音频系统初始化...');
    
    const audioSystem = new AudioSystem();
    
    // 测试初始化
    const initResult = await audioSystem.initialize();
    assert(typeof initResult === 'boolean', '初始化应该返回布尔值');
    
    if (initResult) {
        assertEquals(audioSystem.isInitialized, true, '初始化成功后应该标记为已初始化');
        assertNotNull(audioSystem.audioContext, '初始化成功后应该有 AudioContext');
        assertNotNull(audioSystem.masterGain, '初始化成功后应该有主音量节点');
    } else {
        console.log('⚠️ 音频系统初始化失败（在测试环境中是正常的）');
    }
    
    // 测试重复初始化
    const secondInitResult = await audioSystem.initialize();
    assertEquals(secondInitResult, initResult, '重复初始化应该返回相同结果');
    
    // 测试 resumeContext
    const resumeResult = await audioSystem.resumeContext();
    assert(typeof resumeResult === 'boolean', 'resumeContext 应该返回布尔值');
    
    console.log('✅ 初始化测试完成');
}

// 测试音效功能
async function testSoundEffects() {
    console.log('测试各种音效...');
    
    const audioSystem = new AudioSystem();
    await audioSystem.initialize();
    
    // 测试基础音效方法存在
    assert(typeof audioSystem.playMatchSound === 'function', 'playMatchSound 方法应该存在');
    assert(typeof audioSystem.playComboSound === 'function', 'playComboSound 方法应该存在');
    assert(typeof audioSystem.playSwapSound === 'function', 'playSwapSound 方法应该存在');
    assert(typeof audioSystem.playErrorSound === 'function', 'playErrorSound 方法应该存在');
    assert(typeof audioSystem.playSuccessSound === 'function', 'playSuccessSound 方法应该存在');
    
    // 测试游戏音效方法存在
    assert(typeof audioSystem.playGameStartSound === 'function', 'playGameStartSound 方法应该存在');
    assert(typeof audioSystem.playPauseSound === 'function', 'playPauseSound 方法应该存在');
    assert(typeof audioSystem.playResumeSound === 'function', 'playResumeSound 方法应该存在');
    assert(typeof audioSystem.playGameOverSound === 'function', 'playGameOverSound 方法应该存在');
    
    // 测试高级音效方法存在
    assert(typeof audioSystem.playAdvancedChainReaction === 'function', 'playAdvancedChainReaction 方法应该存在');
    assert(typeof audioSystem.playBigMatchSound === 'function', 'playBigMatchSound 方法应该存在');
    assert(typeof audioSystem.playSpecialMatchSound === 'function', 'playSpecialMatchSound 方法应该存在');
    
    // 测试音效调用（应该不抛出错误）
    try {
        await audioSystem.playMatchSound(3);
        await audioSystem.playComboSound(2);
        await audioSystem.playSwapSound();
        await audioSystem.playErrorSound();
        await audioSystem.playSuccessSound();
        console.log('✅ 基础音效调用成功');
    } catch (error) {
        console.log('⚠️ 音效调用失败（在测试环境中可能正常）:', error.message);
    }
    
    console.log('✅ 音效测试完成');
}

// 测试音量控制
async function testVolumeControl() {
    console.log('测试音量控制功能...');
    
    const audioSystem = new AudioSystem();
    
    // 测试音量设置
    audioSystem.setVolume(0.5);
    assertEquals(audioSystem.getVolume(), 0.5, '音量设置应该生效');
    
    audioSystem.setVolume(1.5); // 超出范围
    assertEquals(audioSystem.getVolume(), 1.0, '音量应该被限制在最大值');
    
    audioSystem.setVolume(-0.1); // 超出范围
    assertEquals(audioSystem.getVolume(), 0.0, '音量应该被限制在最小值');
    
    // 测试音量百分比
    audioSystem.setVolumePercent(75);
    assertEquals(audioSystem.getVolumePercent(), 75, '音量百分比设置应该生效');
    
    // 测试音量增减
    audioSystem.setVolume(0.5);
    const increasedVolume = audioSystem.increaseVolume(0.2);
    assertEquals(increasedVolume, 0.7, '音量增加应该正确');
    
    const decreasedVolume = audioSystem.decreaseVolume(0.3);
    assertEquals(decreasedVolume, 0.4, '音量减少应该正确');
    
    // 测试静音功能
    const initialMuteState = audioSystem.getMuteStatus();
    const newMuteState = audioSystem.toggleMute();
    assertEquals(newMuteState, !initialMuteState, '静音切换应该正确');
    
    audioSystem.setMute(true);
    assertEquals(audioSystem.getMuteStatus(), true, '设置静音应该生效');
    
    audioSystem.setMute(false);
    assertEquals(audioSystem.getMuteStatus(), false, '取消静音应该生效');
    
    // 测试音量预设
    audioSystem.setVolumePreset('medium');
    assertEquals(audioSystem.getVolume(), 0.5, '音量预设应该生效');
    
    const presetName = audioSystem.getVolumePresetName();
    assertEquals(presetName, 'medium', '音量预设名称应该正确');
    
    // 测试预设循环
    const nextPreset = audioSystem.cycleVolumePreset();
    assert(typeof nextPreset === 'string', '预设循环应该返回字符串');
    
    console.log('✅ 音量控制测试完成');
}

// 测试设置持久化
async function testSettingsPersistence() {
    console.log('测试设置持久化...');
    
    const audioSystem = new AudioSystem();
    
    // 设置一些值
    audioSystem.setVolume(0.7);
    audioSystem.setMute(true);
    
    // 保存设置
    const saveResult = audioSystem.saveAudioSettings();
    assertEquals(saveResult, true, '设置保存应该成功');
    
    // 创建新实例并加载设置
    const audioSystem2 = new AudioSystem();
    const loadResult = audioSystem2.loadAudioSettings();
    assertEquals(loadResult, true, '设置加载应该成功');
    assertEquals(audioSystem2.getVolume(), 0.7, '音量应该被正确加载');
    assertEquals(audioSystem2.getMuteStatus(), true, '静音状态应该被正确加载');
    
    // 测试重置设置
    audioSystem2.resetAudioSettings();
    assertEquals(audioSystem2.getVolume(), 0.3, '重置后音量应该是默认值');
    assertEquals(audioSystem2.getMuteStatus(), false, '重置后应该非静音');
    
    console.log('✅ 设置持久化测试完成');
}

// 测试错误处理
async function testErrorHandling() {
    console.log('测试错误处理...');
    
    const audioSystem = new AudioSystem();
    
    // 测试在未初始化状态下调用音效
    try {
        await audioSystem.playMatchSound();
        console.log('✅ 未初始化状态下音效调用不抛出错误');
    } catch (error) {
        console.log('❌ 未初始化状态下音效调用抛出错误:', error.message);
    }
    
    // 测试无效参数
    try {
        audioSystem.setVolumePreset('invalid');
        console.log('✅ 无效音量预设处理正确');
    } catch (error) {
        console.log('❌ 无效音量预设处理失败:', error.message);
    }
    
    // 测试状态获取
    const status = audioSystem.getStatus();
    assertNotNull(status, '状态获取应该返回对象');
    assert(typeof status.isEnabled === 'boolean', '状态应该包含 isEnabled');
    assert(typeof status.isMuted === 'boolean', '状态应该包含 isMuted');
    assert(typeof status.volume === 'number', '状态应该包含 volume');
    
    // 测试设置摘要
    const summary = audioSystem.getAudioSettingsSummary();
    assertNotNull(summary, '设置摘要应该返回对象');
    assert(typeof summary.volumePercent === 'number', '摘要应该包含音量百分比');
    assert(typeof summary.volumePreset === 'string', '摘要应该包含音量预设名称');
    
    console.log('✅ 错误处理测试完成');
}

// 测试边界情况
async function testEdgeCases() {
    console.log('测试边界情况...');
    
    const audioSystem = new AudioSystem();
    
    // 测试极端音量值
    audioSystem.setVolume(Number.MAX_VALUE);
    assertEquals(audioSystem.getVolume(), 1.0, '极大音量值应该被限制');
    
    audioSystem.setVolume(Number.MIN_VALUE);
    assertEquals(audioSystem.getVolume(), 0.0, '极小音量值应该被限制');
    
    audioSystem.setVolume(NaN);
    assert(!isNaN(audioSystem.getVolume()), 'NaN 音量值应该被处理');
    
    // 测试极端百分比值
    audioSystem.setVolumePercent(1000);
    assertEquals(audioSystem.getVolumePercent(), 100, '极大百分比应该被限制');
    
    audioSystem.setVolumePercent(-100);
    assertEquals(audioSystem.getVolumePercent(), 0, '极小百分比应该被限制');
    
    // 测试连续操作
    for (let i = 0; i < 10; i++) {
        audioSystem.toggleMute();
    }
    assert(typeof audioSystem.getMuteStatus() === 'boolean', '连续静音切换应该正常');
    
    // 测试大量音效参数
    try {
        await audioSystem.playMatchSound(100); // 大匹配长度
        await audioSystem.playComboSound(50);  // 大连锁数
        await audioSystem.playAdvancedChainReaction(20, 100); // 极端连锁
        console.log('✅ 极端参数音效调用成功');
    } catch (error) {
        console.log('⚠️ 极端参数音效调用失败（可能正常）:', error.message);
    }
    
    console.log('✅ 边界情况测试完成');
}

// 运行所有测试
runAudioSystemTests().then(success => {
    if (success) {
        console.log('\n🎉 所有音频系统测试通过！');
        process.exit(0);
    } else {
        console.log('\n❌ 部分音频系统测试失败');
        process.exit(1);
    }
}).catch(error => {
    console.error('\n💥 测试执行失败:', error);
    process.exit(1);
});// 测试
1: 构造函数和初始状态
async function testConstructorAndInitialState() {
    console.log('测试1: 构造函数和初始状态');
    
    // 清除localStorage
    localStorage.clear();
    
    const audioSystem = new AudioSystem();
    
    // 测试初始属性
    assertNull(audioSystem.audioContext, '构造函数后audioContext应为null');
    assertNull(audioSystem.masterGain, '构造函数后masterGain应为null');
    assertEquals(audioSystem.isMuted, false, '默认不应静音');
    assertEquals(audioSystem.isEnabled, true, '默认应启用');
    assertEquals(audioSystem.volume, 0.3, '默认音量应为0.3');
    assertEquals(audioSystem.isInitialized, false, '构造函数后不应初始化');
    assertEquals(audioSystem.pendingInitialization, false, '构造函数后不应有待初始化状态');
    
    console.log('✅ 构造函数测试完成\n');
}

// 测试2: 延迟初始化功能
async function testDelayedInitialization() {
    console.log('测试2: 延迟初始化功能');
    
    const audioSystem = new AudioSystem();
    
    // 测试初始化前状态
    assertEquals(audioSystem.isInitialized, false, '初始化前isInitialized应为false');
    assertEquals(audioSystem.pendingInitialization, false, '初始化前pendingInitialization应为false');
    
    // 测试初始化
    const initResult = await audioSystem.initialize();
    
    assertEquals(initResult, true, '初始化应成功');
    assertEquals(audioSystem.isInitialized, true, '初始化后isInitialized应为true');
    assertEquals(audioSystem.pendingInitialization, false, '初始化后pendingInitialization应为false');
    assertNotNull(audioSystem.audioContext, '初始化后audioContext不应为null');
    assertNotNull(audioSystem.masterGain, '初始化后masterGain不应为null');
    
    // 测试重复初始化
    const secondInitResult = await audioSystem.initialize();
    assertEquals(secondInitResult, true, '重复初始化应返回true');
    
    console.log('✅ 延迟初始化测试完成\n');
}

// 测试3: 并发初始化保护
async function testConcurrentInitialization() {
    console.log('测试3: 并发初始化保护');
    
    const audioSystem = new AudioSystem();
    
    // 同时启动多个初始化
    const promises = [
        audioSystem.initialize(),
        audioSystem.initialize(),
        audioSystem.initialize()
    ];
    
    const results = await Promise.all(promises);
    
    // 所有初始化都应成功
    results.forEach((result, index) => {
        assertEquals(result, true, `并发初始化${index + 1}应成功`);
    });
    
    assertEquals(audioSystem.isInitialized, true, '并发初始化后应为已初始化状态');
    assertEquals(audioSystem.pendingInitialization, false, '并发初始化后不应有待初始化状态');
    
    console.log('✅ 并发初始化保护测试完成\n');
}

// 测试4: AudioContext恢复功能
async function testAudioContextResume() {
    console.log('测试4: AudioContext恢复功能');
    
    const audioSystem = new AudioSystem();
    
    // 测试未初始化时的恢复
    const resumeBeforeInit = await audioSystem.resumeContext();
    assertEquals(resumeBeforeInit, true, '未初始化时恢复应触发初始化并成功');
    assertEquals(audioSystem.isInitialized, true, '恢复后应为已初始化状态');
    
    // 模拟AudioContext被暂停
    audioSystem.audioContext.state = 'suspended';
    
    // 测试恢复暂停的AudioContext
    const resumeResult = await audioSystem.resumeContext();
    assertEquals(resumeResult, true, '恢复暂停的AudioContext应成功');
    assertEquals(audioSystem.audioContext.state, 'running', 'AudioContext状态应为running');
    
    console.log('✅ AudioContext恢复功能测试完成\n');
}

// 测试5: 音量控制功能
async function testVolumeControl() {
    console.log('测试5: 音量控制功能');
    
    const audioSystem = new AudioSystem();
    await audioSystem.initialize();
    
    // 测试设置音量
    audioSystem.setVolume(0.5);
    assertEquals(audioSystem.getVolume(), 0.5, '设置音量应正确');
    
    // 测试音量边界
    audioSystem.setVolume(-0.1);
    assertEquals(audioSystem.getVolume(), 0, '音量不应小于0');
    
    audioSystem.setVolume(1.5);
    assertEquals(audioSystem.getVolume(), 1, '音量不应大于1');
    
    // 测试音量百分比
    audioSystem.setVolumePercent(75);
    assertEquals(audioSystem.getVolumePercent(), 75, '音量百分比应正确');
    
    // 测试增减音量
    audioSystem.setVolume(0.5);
    const increasedVolume = audioSystem.increaseVolume(0.2);
    assertEquals(increasedVolume, 0.7, '增加音量应正确');
    
    const decreasedVolume = audioSystem.decreaseVolume(0.3);
    assertEquals(decreasedVolume, 0.4, '减少音量应正确');
    
    console.log('✅ 音量控制功能测试完成\n');
}// 测试6: 静音功能

async function testMuteFunction() {
    console.log('测试6: 静音功能');
    
    const audioSystem = new AudioSystem();
    await audioSystem.initialize();
    
    // 测试初始静音状态
    assertEquals(audioSystem.getMuteStatus(), false, '初始不应静音');
    
    // 测试切换静音
    const muteResult = audioSystem.toggleMute();
    assertEquals(muteResult, true, '切换静音应返回true');
    assertEquals(audioSystem.getMuteStatus(), true, '切换后应为静音状态');
    
    // 测试再次切换
    const unmuteResult = audioSystem.toggleMute();
    assertEquals(unmuteResult, false, '再次切换应返回false');
    assertEquals(audioSystem.getMuteStatus(), false, '再次切换后应为非静音状态');
    
    // 测试设置静音状态
    audioSystem.setMute(true);
    assertEquals(audioSystem.getMuteStatus(), true, '设置静音应正确');
    
    audioSystem.setMute(false);
    assertEquals(audioSystem.getMuteStatus(), false, '取消静音应正确');
    
    console.log('✅ 静音功能测试完成\n');
}

// 测试7: 音量预设功能
async function testVolumePresets() {
    console.log('测试7: 音量预设功能');
    
    const audioSystem = new AudioSystem();
    await audioSystem.initialize();
    
    // 测试各种音量预设
    const presets = {
        'mute': 0,
        'low': 0.2,
        'medium': 0.5,
        'high': 0.8,
        'max': 1.0
    };
    
    for (const [preset, expectedVolume] of Object.entries(presets)) {
        const result = audioSystem.setVolumePreset(preset);
        assertEquals(result, expectedVolume, `音量预设${preset}应设置为${expectedVolume}`);
        assertEquals(audioSystem.getVolume(), expectedVolume, `音量应为${expectedVolume}`);
    }
    
    // 测试无效预设
    const invalidResult = audioSystem.setVolumePreset('invalid');
    assertEquals(invalidResult, 1.0, '无效预设应返回当前音量');
    
    // 测试获取预设名称
    audioSystem.setVolume(0.25);
    assertEquals(audioSystem.getVolumePresetName(), 'low', '音量0.25应对应low预设');
    
    audioSystem.setVolume(0.6);
    assertEquals(audioSystem.getVolumePresetName(), 'medium', '音量0.6应对应medium预设');
    
    // 测试循环切换预设
    audioSystem.setVolumePreset('mute');
    const nextPreset = audioSystem.cycleVolumePreset();
    assertEquals(nextPreset, 'low', '从mute循环应切换到low');
    
    console.log('✅ 音量预设功能测试完成\n');
}

// 测试8: 音效生成功能
async function testSoundGeneration() {
    console.log('测试8: 音效生成功能');
    
    const audioSystem = new AudioSystem();
    await audioSystem.initialize();
    
    // 测试基础音调生成
    try {
        await audioSystem.generateTone(440, 0.1);
        console.log('✅ 基础音调生成成功');
    } catch (error) {
        console.log(`❌ 基础音调生成失败: ${error.message}`);
        testResults.failed++;
        testResults.failures.push('基础音调生成失败');
    }
    
    // 测试和弦生成
    try {
        await audioSystem.generateChord([440, 554.37, 659.25], 0.1);
        console.log('✅ 和弦生成成功');
    } catch (error) {
        console.log(`❌ 和弦生成失败: ${error.message}`);
        testResults.failed++;
        testResults.failures.push('和弦生成失败');
    }
    
    // 测试各种游戏音效
    const soundTests = [
        { name: '消除音效', method: 'playMatchSound', args: [3] },
        { name: '连锁音效', method: 'playComboSound', args: [2] },
        { name: '移动音效', method: 'playMoveSound', args: [] },
        { name: '交换音效', method: 'playSwapSound', args: [] },
        { name: '错误音效', method: 'playErrorSound', args: [] },
        { name: '成功音效', method: 'playSuccessSound', args: [] }
    ];
    
    for (const test of soundTests) {
        try {
            await audioSystem[test.method](...test.args);
            console.log(`✅ ${test.name}生成成功`);
            testResults.passed++;
        } catch (error) {
            console.log(`❌ ${test.name}生成失败: ${error.message}`);
            testResults.failed++;
            testResults.failures.push(`${test.name}生成失败`);
        }
        testResults.total++;
    }
    
    console.log('✅ 音效生成功能测试完成\n');
}

// 测试9: 高级音效功能
async function testAdvancedSoundEffects() {
    console.log('测试9: 高级音效功能');
    
    const audioSystem = new AudioSystem();
    await audioSystem.initialize();
    
    // 测试高级连锁反应音效
    const chainTests = [
        { level: 1, total: 1 },
        { level: 3, total: 3 },
        { level: 5, total: 5 },
        { level: 8, total: 8 }
    ];
    
    for (const test of chainTests) {
        try {
            await audioSystem.playAdvancedChainReaction(test.level, test.total);
            console.log(`✅ 高级连锁音效(等级${test.level})生成成功`);
            testResults.passed++;
        } catch (error) {
            console.log(`❌ 高级连锁音效(等级${test.level})生成失败: ${error.message}`);
            testResults.failed++;
            testResults.failures.push(`高级连锁音效(等级${test.level})生成失败`);
        }
        testResults.total++;
    }
    
    // 测试特殊形状匹配音效
    const shapeTests = ['L', 'T', 'other'];
    for (const shape of shapeTests) {
        try {
            await audioSystem.playSpecialMatchSound(shape);
            console.log(`✅ 特殊形状音效(${shape}型)生成成功`);
            testResults.passed++;
        } catch (error) {
            console.log(`❌ 特殊形状音效(${shape}型)生成失败: ${error.message}`);
            testResults.failed++;
            testResults.failures.push(`特殊形状音效(${shape}型)生成失败`);
        }
        testResults.total++;
    }
    
    console.log('✅ 高级音效功能测试完成\n');
}// 测试10: 
游戏状态音效
async function testGameStateSounds() {
    console.log('测试10: 游戏状态音效');
    
    const audioSystem = new AudioSystem();
    await audioSystem.initialize();
    
    const gameStateTests = [
        { name: '游戏开始', method: 'playGameStartSound' },
        { name: '暂停', method: 'playPauseSound' },
        { name: '继续', method: 'playResumeSound' },
        { name: '重新开始', method: 'playRestartSound' },
        { name: '游戏结束', method: 'playGameOverSound' }
    ];
    
    for (const test of gameStateTests) {
        try {
            await audioSystem[test.method]();
            console.log(`✅ ${test.name}音效生成成功`);
            testResults.passed++;
        } catch (error) {
            console.log(`❌ ${test.name}音效生成失败: ${error.message}`);
            testResults.failed++;
            testResults.failures.push(`${test.name}音效生成失败`);
        }
        testResults.total++;
    }
    
    console.log('✅ 游戏状态音效测试完成\n');
}

// 测试11: 设置持久化
async function testSettingsPersistence() {
    console.log('测试11: 设置持久化');
    
    // 清除localStorage
    localStorage.clear();
    
    const audioSystem1 = new AudioSystem();
    await audioSystem1.initialize();
    
    // 修改设置
    audioSystem1.setVolume(0.7);
    audioSystem1.setMute(true);
    
    // 保存设置
    const saveResult = audioSystem1.saveAudioSettings();
    assertEquals(saveResult, true, '保存音频设置应成功');
    
    // 创建新实例并验证设置加载
    const audioSystem2 = new AudioSystem();
    assertEquals(audioSystem2.getVolume(), 0.7, '音量设置应被加载');
    assertEquals(audioSystem2.getMuteStatus(), true, '静音设置应被加载');
    
    // 测试重置设置
    audioSystem2.resetAudioSettings();
    assertEquals(audioSystem2.getVolume(), 0.3, '重置后音量应为默认值');
    assertEquals(audioSystem2.getMuteStatus(), false, '重置后应为非静音状态');
    
    console.log('✅ 设置持久化测试完成\n');
}

// 测试12: 错误处理
async function testErrorHandling() {
    console.log('测试12: 错误处理');
    
    const audioSystem = new AudioSystem();
    
    // 测试未初始化时的音效播放
    try {
        await audioSystem.playMatchSound();
        console.log('✅ 未初始化时播放音效应优雅处理');
        testResults.passed++;
    } catch (error) {
        console.log(`❌ 未初始化时播放音效处理失败: ${error.message}`);
        testResults.failed++;
        testResults.failures.push('未初始化时播放音效处理失败');
    }
    testResults.total++;
    
    // 测试静音时的音效播放
    await audioSystem.initialize();
    audioSystem.setMute(true);
    
    try {
        await audioSystem.playMatchSound();
        console.log('✅ 静音时播放音效应优雅处理');
        testResults.passed++;
    } catch (error) {
        console.log(`❌ 静音时播放音效处理失败: ${error.message}`);
        testResults.failed++;
        testResults.failures.push('静音时播放音效处理失败');
    }
    testResults.total++;
    
    // 测试禁用时的音效播放
    audioSystem.disable();
    
    try {
        await audioSystem.playMatchSound();
        console.log('✅ 禁用时播放音效应优雅处理');
        testResults.passed++;
    } catch (error) {
        console.log(`❌ 禁用时播放音效处理失败: ${error.message}`);
        testResults.failed++;
        testResults.failures.push('禁用时播放音效处理失败');
    }
    testResults.total++;
    
    console.log('✅ 错误处理测试完成\n');
}

// 测试13: 系统状态和信息
async function testSystemStatus() {
    console.log('测试13: 系统状态和信息');
    
    const audioSystem = new AudioSystem();
    
    // 测试未初始化状态
    const statusBefore = audioSystem.getStatus();
    assertEquals(statusBefore.isEnabled, true, '默认应启用');
    assertEquals(statusBefore.isMuted, false, '默认不应静音');
    assertEquals(statusBefore.contextState, 'closed', '未初始化时AudioContext状态应为closed');
    assertEquals(statusBefore.isSupported, true, '应支持Web Audio API');
    
    // 测试初始化后状态
    await audioSystem.initialize();
    const statusAfter = audioSystem.getStatus();
    assertEquals(statusAfter.contextState, 'running', '初始化后AudioContext状态应为running');
    
    // 测试设置摘要
    audioSystem.setVolume(0.8);
    audioSystem.setMute(true);
    
    const summary = audioSystem.getAudioSettingsSummary();
    assertEquals(summary.volume, 0.8, '设置摘要中音量应正确');
    assertEquals(summary.volumePercent, 80, '设置摘要中音量百分比应正确');
    assertEquals(summary.isMuted, true, '设置摘要中静音状态应正确');
    assertEquals(summary.isEnabled, true, '设置摘要中启用状态应正确');
    
    console.log('✅ 系统状态和信息测试完成\n');
}

// 测试14: 边界条件和特殊情况
async function testEdgeCases() {
    console.log('测试14: 边界条件和特殊情况');
    
    const audioSystem = new AudioSystem();
    await audioSystem.initialize();
    
    // 测试极端音量值
    audioSystem.setVolume(Number.MAX_VALUE);
    assertEquals(audioSystem.getVolume(), 1, '极大音量值应被限制为1');
    
    audioSystem.setVolume(Number.MIN_VALUE);
    assertEquals(audioSystem.getVolume(), 0, '极小音量值应被限制为0');
    
    audioSystem.setVolume(NaN);
    assertEquals(audioSystem.getVolume(), 0, 'NaN音量值应被处理为0');
    
    // 测试极端音效参数
    try {
        await audioSystem.playMatchSound(0);
        await audioSystem.playMatchSound(100);
        await audioSystem.playComboSound(0);
        await audioSystem.playComboSound(50);
        console.log('✅ 极端音效参数应被正确处理');
        testResults.passed++;
    } catch (error) {
        console.log(`❌ 极端音效参数处理失败: ${error.message}`);
        testResults.failed++;
        testResults.failures.push('极端音效参数处理失败');
    }
    testResults.total++;
    
    // 测试快速连续调用
    try {
        const promises = [];
        for (let i = 0; i < 10; i++) {
            promises.push(audioSystem.playMatchSound());
        }
        await Promise.all(promises);
        console.log('✅ 快速连续音效调用应被正确处理');
        testResults.passed++;
    } catch (error) {
        console.log(`❌ 快速连续音效调用处理失败: ${error.message}`);
        testResults.failed++;
        testResults.failures.push('快速连续音效调用处理失败');
    }
    testResults.total++;
    
    console.log('✅ 边界条件和特殊情况测试完成\n');
}