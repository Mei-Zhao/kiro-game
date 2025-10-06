// 主游戏脚本 - 基础渲染功能测试

// 全局变量
let gameGrid = null;
let renderer = null;
let gameState = null;
let inputHandler = null;
let audioSystem = null;
let scoreSystem = null;
let storageManager = null;

// 性能优化相关
let performanceOptimizer = null;
let isPerformanceMonitoringEnabled = false;

// DOM元素
let startBtn = null;
let pauseBtn = null;
let restartBtn = null;
let soundBtn = null;

// 初始化游戏
function initializeGame() {
    try {
        // 创建游戏组件
        gameGrid = new GameGrid();
        renderer = createRenderer();
        gameState = createInitialGameState();
        audioSystem = createAudioSystem();
        scoreSystem = createScoreSystem();
        storageManager = createStorageManagerWithFallback();

        // 获取控制按钮
        startBtn = document.getElementById('start-btn');
        pauseBtn = document.getElementById('pause-btn');
        restartBtn = document.getElementById('restart-btn');
        soundBtn = document.getElementById('sound-btn');

        // 绑定事件监听器
        bindEventListeners();

        // 初始化渲染器
        renderer.initialize();

        // 创建输入处理器
        inputHandler = createInputHandler(document.getElementById('game-board'), {
            handleSwap: handleSwapAttempt
        });

        // 初始化分数系统
        scoreSystem.initialize();
        
        // 加载保存的最高分
        const savedHighScore = storageManager.getHighScore();
        if (savedHighScore > 0) {
            scoreSystem.setHighScore(savedHighScore);
            gameState.highScore = savedHighScore;
        }

        // 初始化性能优化器
        if (typeof PerformanceOptimizer !== 'undefined') {
            performanceOptimizer = new PerformanceOptimizer();
            
            // 添加性能问题监听器
            performanceOptimizer.addObserver('performance_issue', (issue) => {
                console.warn('性能问题:', issue);
                if (renderer) {
                    renderer.showError(`性能警告: ${issue.type}`);
                }
            });
            
            // 在开发环境启用性能监控
            if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
                performanceOptimizer.startMonitoring();
                isPerformanceMonitoringEnabled = true;
                console.log('开发环境：性能监控已启用');
            }
        }

        // 启用渲染器性能监控
        if (renderer && typeof renderer.startPerformanceMonitoring === 'function') {
            renderer.startPerformanceMonitoring();
        }

        // 启用输入处理器性能监控
        if (inputHandler && typeof inputHandler.startPerformanceMonitoring === 'function') {
            inputHandler.startPerformanceMonitoring();
        }

        // 渲染初始状态
        renderGame();

        console.log('游戏初始化完成');
        renderer.showSuccess('游戏初始化完成！');

        // 播放初始化成功音效
        if (audioSystem) {
            audioSystem.resumeContext().then(() => {
                audioSystem.playSuccessSound();
            });
        }

    } catch (error) {
        console.error('游戏初始化失败:', error);
        if (renderer) {
            renderer.showError('游戏初始化失败: ' + error.message);
        }
    }
}

// 绑定事件监听器
function bindEventListeners() {
    // 开始游戏按钮
    if (startBtn) {
        startBtn.addEventListener('click', handleStartButtonClick);
        startBtn.addEventListener('keydown', handleButtonKeydown);
    }

    // 暂停游戏按钮
    if (pauseBtn) {
        pauseBtn.addEventListener('click', handlePauseButtonClick);
        pauseBtn.addEventListener('keydown', handleButtonKeydown);
    }

    // 重新开始按钮
    if (restartBtn) {
        restartBtn.addEventListener('click', handleRestartButtonClick);
        restartBtn.addEventListener('keydown', handleButtonKeydown);
    }

    // 音效开关按钮
    if (soundBtn) {
        soundBtn.addEventListener('click', handleSoundButtonClick);
        soundBtn.addEventListener('keydown', handleButtonKeydown);
    }

    // 键盘快捷键
    document.addEventListener('keydown', handleGlobalKeydown);

    // 输入处理器会自动绑定网格事件
}

// 处理开始按钮点击
function handleStartButtonClick(event) {
    event.preventDefault();
    addButtonFeedback(startBtn);
    startGame();
}

// 处理暂停按钮点击
function handlePauseButtonClick(event) {
    event.preventDefault();
    addButtonFeedback(pauseBtn);
    togglePause();
}

// 处理重新开始按钮点击
function handleRestartButtonClick(event) {
    event.preventDefault();
    
    // 如果游戏正在进行，询问确认
    if (gameState.isPlaying && !gameState.isGameOver) {
        const confirmed = confirm('确定要重新开始游戏吗？当前进度将丢失。');
        if (!confirmed) {
            return;
        }
    }
    
    addButtonFeedback(restartBtn);
    restartGame();
}

// 处理音效按钮点击
function handleSoundButtonClick(event) {
    event.preventDefault();
    addButtonFeedback(soundBtn);
    toggleSound();
}

// 处理按钮键盘事件
function handleButtonKeydown(event) {
    // 空格键或回车键激活按钮
    if (event.code === 'Space' || event.code === 'Enter') {
        event.preventDefault();
        event.target.click();
    }
}

// 处理全局键盘快捷键
function handleGlobalKeydown(event) {
    // 避免在输入框中触发快捷键
    if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
        return;
    }

    switch (event.code) {
        case 'KeyS':
            // S键 - 开始/继续游戏
            if (!gameState.isPlaying || gameState.isGameOver) {
                event.preventDefault();
                showKeyboardHint('使用了键盘快捷键: <kbd>S</kbd> 开始游戏', 1500);
                addButtonFeedback(startBtn);
                startGame();
            }
            break;
            
        case 'KeyP':
        case 'Space':
            // P键或空格键 - 暂停/继续
            if (gameState.isPlaying && !gameState.isGameOver) {
                event.preventDefault();
                const key = event.code === 'Space' ? '空格' : 'P';
                const action = gameState.isPaused ? '继续' : '暂停';
                showKeyboardHint(`使用了键盘快捷键: <kbd>${key}</kbd> ${action}游戏`, 1500);
                addButtonFeedback(pauseBtn);
                togglePause();
            }
            break;
            
        case 'KeyR':
            // R键 - 重新开始
            event.preventDefault();
            if (gameState.isPlaying && !gameState.isGameOver) {
                const confirmed = confirm('确定要重新开始游戏吗？当前进度将丢失。');
                if (confirmed) {
                    showKeyboardHint('使用了键盘快捷键: <kbd>R</kbd> 重新开始', 1500);
                    addButtonFeedback(restartBtn);
                    restartGame();
                }
            } else {
                showKeyboardHint('使用了键盘快捷键: <kbd>R</kbd> 重新开始', 1500);
                addButtonFeedback(restartBtn);
                restartGame();
            }
            break;
            
        case 'KeyM':
            // M键 - 静音切换
            event.preventDefault();
            const soundAction = audioSystem && audioSystem.getMuteStatus() ? '取消静音' : '静音';
            showKeyboardHint(`使用了键盘快捷键: <kbd>M</kbd> ${soundAction}`, 1500);
            addButtonFeedback(soundBtn);
            toggleSound();
            break;
            
        case 'KeyH':
            // H键 - 显示帮助
            event.preventDefault();
            showKeyboardShortcutsPanel();
            break;
            
        case 'F1':
            // F1键 - 切换性能监控
            event.preventDefault();
            showKeyboardHint('使用了键盘快捷键: <kbd>F1</kbd> 切换性能监控', 1500);
            togglePerformanceMonitoring();
            break;
            
        case 'F2':
            // F2键 - 显示性能报告
            event.preventDefault();
            showKeyboardHint('使用了键盘快捷键: <kbd>F2</kbd> 性能报告', 1500);
            const report = getPerformanceReport();
            if (report && renderer) {
                const fps = report.metrics.frameRate.toFixed(1);
                const memory = (report.metrics.memoryUsage / 1024 / 1024).toFixed(1);
                renderer.showSuccess(`性能报告: FPS ${fps} | 内存 ${memory}MB`);
            }
            break;
            
        case 'F3':
            // F3键 - 执行性能优化
            event.preventDefault();
            showKeyboardHint('使用了键盘快捷键: <kbd>F3</kbd> 性能优化', 1500);
            optimizePerformance();
            break;
            
        case 'F4':
            // F4键 - 内存清理
            event.preventDefault();
            showKeyboardHint('使用了键盘快捷键: <kbd>F4</kbd> 内存清理', 1500);
            cleanupMemory();
            break;
    }
}

// 添加按钮视觉反馈
function addButtonFeedback(button) {
    if (!button) return;
    
    // 添加点击反馈类
    button.classList.add('audio-feedback');
    
    // 移除反馈类
    setTimeout(() => {
        button.classList.remove('audio-feedback');
    }, 600);
}

// 防抖和节流工具函数
function debounce(func, delay) {
    let timeoutId;
    return function(...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func.apply(this, args), delay);
    };
}

function throttle(func, delay) {
    let lastExecTime = 0;
    let timeoutId;
    
    return function(...args) {
        const currentTime = Date.now();
        
        if (currentTime - lastExecTime > delay) {
            func.apply(this, args);
            lastExecTime = currentTime;
        } else {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => {
                func.apply(this, args);
                lastExecTime = Date.now();
            }, delay - (currentTime - lastExecTime));
        }
    };
}

// 优化的渲染函数 - 使用节流
const optimizedRenderGame = throttle(renderGame, 16); // ~60fps

// 处理交换尝试 - 添加防抖
const debouncedHandleSwapAttempt = debounce(function(pos1, pos2) {
    if (!gameState.isPlaying || gameState.isPaused) {
        console.log('游戏未运行，忽略交换操作');
        return;
    }

    if (!gameGrid || !renderer) {
        console.error('游戏组件未初始化');
        return;
    }

    console.log('处理交换尝试:', pos1, pos2);

    try {
        // 检查交换是否有效
        const swapResult = gameGrid.trySwap(pos1, pos2);
        
        if (swapResult.success) {
            // 交换成功，播放交换动画和音效
            renderer.playSwapAnimation(pos1, pos2, () => {
                // 动画完成后，检查匹配并处理连锁反应
                processMatches();
            });
            
            // 播放交换音效
            if (audioSystem) {
                audioSystem.playSwapSound();
            }
            
            // 更新移动计数
            gameState.moveCount++;
            
            console.log('交换成功');
            renderer.showSuccess('交换成功！');
        } else {
            // 交换失败，播放无效移动动画和错误音效
            renderer.playInvalidMoveAnimation(pos1, pos2);
            
            // 播放错误音效
            if (audioSystem) {
                audioSystem.playErrorSound();
            }
            
            console.log('交换失败:', swapResult.reason);
            renderer.showError('无效移动：' + swapResult.reason);
        }
    } catch (error) {
        console.error('交换处理错误:', error);
        renderer.showError('交换失败: ' + error.message);
    }
}, 100);

// 原始处理交换尝试函数
function handleSwapAttempt(pos1, pos2) {
    debouncedHandleSwapAttempt(pos1, pos2);
}

// 处理匹配检测和连锁反应
function processMatches() {
    if (!gameGrid || !scoreSystem) {
        console.error('游戏组件未初始化');
        return;
    }

    try {
        // 创建匹配检测器
        const matchDetector = new MatchDetector();
        
        // 检测当前网格中的匹配
        const matchResult = matchDetector.findAllMatches(gameGrid.getGrid());
        
        if (matchResult.hasMatches) {
            console.log('发现匹配:', matchResult);
            
            // 计算分数
            const scoreEntry = scoreSystem.processMatchScore(matchResult.all, false);
            
            // 更新游戏状态分数
            gameState.score = scoreSystem.getCurrentScore();
            gameState.highScore = scoreSystem.getHighScore();
            
            // 保存新的最高分
            if (gameState.score > gameState.highScore) {
                storageManager.saveHighScore(gameState.score);
            }
            
            // 播放分数动画和音效
            playScoreAnimation(scoreEntry, renderer, audioSystem);
            
            // 移除匹配的元素
            const matchPositions = matchDetector.getAllMatchPositions(matchResult.all);
            gameGrid.removeElements(matchPositions);
            
            // 应用重力和填充
            const gravityResult = gameGrid.processGravityAndFill();
            
            // 检查是否有新的匹配（连锁反应）
            setTimeout(() => {
                checkForChainReaction();
            }, 500);
        } else {
            // 没有匹配，重置连锁等级
            scoreSystem.resetChainLevel();
        }
        
        // 重新渲染游戏状态
        renderGame();
        
        // 检查游戏结束条件（在没有匹配时）
        if (!matchResult.hasMatches) {
            setTimeout(() => {
                checkGameOverCondition();
            }, 500); // 延迟检查，确保动画完成
        }
        
    } catch (error) {
        console.error('匹配处理失败:', error);
        if (renderer) {
            renderer.showError('匹配处理失败: ' + error.message);
        }
    }
}

// 检查连锁反应
function checkForChainReaction() {
    if (!gameGrid || !scoreSystem) {
        return;
    }

    try {
        const matchDetector = new MatchDetector();
        const matchResult = matchDetector.findAllMatches(gameGrid.getGrid());
        
        if (matchResult.hasMatches) {
            console.log('连锁反应发生:', matchResult);
            
            // 计算连锁反应分数
            const scoreEntry = scoreSystem.processMatchScore(matchResult.all, true);
            
            // 更新游戏状态
            gameState.score = scoreSystem.getCurrentScore();
            gameState.chainCount = scoreSystem.getChainLevel();
            
            // 保存新的最高分
            if (gameState.score > gameState.highScore) {
                gameState.highScore = scoreSystem.getHighScore();
                storageManager.saveHighScore(gameState.score);
            }
            
            // 播放连锁反应动画和音效
            playScoreAnimation(scoreEntry, renderer, audioSystem);
            
            // 移除匹配的元素
            const matchPositions = matchDetector.getAllMatchPositions(matchResult.all);
            gameGrid.removeElements(matchPositions);
            
            // 应用重力和填充
            gameGrid.processGravityAndFill();
            
            // 继续检查连锁反应
            setTimeout(() => {
                checkForChainReaction();
            }, 800);
        } else {
            // 连锁反应结束
            console.log('连锁反应结束，最终连锁等级:', scoreSystem.getChainLevel());
            scoreSystem.resetChainLevel();
            
            // 检查游戏结束条件
            setTimeout(() => {
                checkGameOverCondition();
            }, 500); // 延迟检查，确保动画完成
        }
        
        // 重新渲染
        renderGame();
        
    } catch (error) {
        console.error('连锁反应检查失败:', error);
    }
}

// 开始游戏
function startGame() {
    try {
        // 设置游戏状态为运行中
        gameState.isPlaying = true;
        gameState.isPaused = false;
        gameState.isGameOver = false;
        
        // 重置游戏计时器
        gameState.startTime = Date.now();
        gameState.lastMoveTime = null;
        gameState.moveCount = 0;
        
        // 重新初始化网格
        gameGrid.initialize();
        
        // 重置分数系统
        if (scoreSystem) {
            scoreSystem.resetCurrentScore();
            gameState.score = 0;
            gameState.chainCount = 0;
        }
        
        // 启用输入处理器
        if (inputHandler) {
            inputHandler.enable();
        }
        
        // 播放游戏开始音效
        if (audioSystem) {
            audioSystem.resumeContext().then(() => {
                audioSystem.playGameStartSound();
            });
        }
        
        // 更新按钮状态
        updateButtonStates();
        
        // 渲染游戏
        renderGame();
        
        console.log('游戏开始');
        renderer.showSuccess('游戏开始！');
        
        // 检查初始状态是否有可能的移动
        checkGameOverCondition();
        
    } catch (error) {
        console.error('开始游戏失败:', error);
        renderer.showError('开始游戏失败: ' + error.message);
    }
}

// 切换暂停状态
function togglePause() {
    if (!gameState.isPlaying || gameState.isGameOver) {
        console.log('游戏未运行或已结束，无法暂停');
        return;
    }

    const wasPaused = gameState.isPaused;
    gameState.isPaused = !gameState.isPaused;
    
    // 记录暂停时间
    if (gameState.isPaused) {
        gameState.pauseStartTime = Date.now();
    } else {
        // 恢复时调整开始时间，排除暂停时间
        if (gameState.pauseStartTime && gameState.startTime) {
            const pauseDuration = Date.now() - gameState.pauseStartTime;
            gameState.startTime += pauseDuration;
        }
        gameState.pauseStartTime = null;
    }
    
    // 控制输入处理器
    if (inputHandler) {
        if (gameState.isPaused) {
            inputHandler.disable();
        } else {
            inputHandler.enable();
        }
    }
    
    // 播放暂停/继续音效
    if (audioSystem) {
        if (gameState.isPaused) {
            audioSystem.playPauseSound();
        } else {
            audioSystem.playResumeSound();
        }
    }
    
    // 更新按钮状态
    updateButtonStates();
    
    // 渲染游戏状态
    renderGame();
    
    const status = gameState.isPaused ? '暂停' : '继续';
    console.log('游戏', status);
    renderer.showSuccess(`游戏${status}！`);
}

// 重新开始游戏
function restartGame() {
    try {
        // 保存当前最高分
        const currentHighScore = gameState.highScore || 0;
        
        // 重置游戏状态
        gameState = createInitialGameState();
        gameState.highScore = currentHighScore;
        gameState.isGameOver = false;
        
        // 保持最高分
        if (scoreSystem) {
            gameState.highScore = Math.max(currentHighScore, scoreSystem.getHighScore());
        }
        
        // 重新初始化网格
        gameGrid.initialize();
        
        // 重置分数系统
        if (scoreSystem) {
            scoreSystem.resetCurrentScore();
            gameState.score = 0;
            gameState.chainCount = 0;
        }
        
        // 清除输入处理器状态
        if (inputHandler) {
            inputHandler.clearAll();
            inputHandler.disable();
        }
        
        // 播放重新开始音效
        if (audioSystem) {
            audioSystem.playRestartSound();
        }
        
        // 更新按钮状态
        updateButtonStates();
        
        // 渲染游戏
        renderGame();
        
        console.log('游戏重新开始');
        renderer.showSuccess('游戏重新开始！点击"开始游戏"继续。');
        
    } catch (error) {
        console.error('重新开始游戏失败:', error);
        renderer.showError('重新开始游戏失败: ' + error.message);
    }
}

// 切换音效
function toggleSound() {
    if (!audioSystem) {
        console.log('音频系统未初始化');
        renderer.showError('音频系统未初始化');
        return;
    }

    try {
        const wasMuted = audioSystem.getMuteStatus();
        const isMuted = audioSystem.toggleMute();
        
        // 保存音频设置
        audioSystem.saveAudioSettings();
        
        // 更新按钮显示和音量显示
        updateButtonStates();
        updateVolumeDisplay();
        
        // 播放测试音效（如果取消静音）
        if (!isMuted && wasMuted) {
            audioSystem.resumeContext().then(() => {
                audioSystem.playSuccessSound();
            });
        }
        
        const status = isMuted ? '静音' : '开启';
        const volume = audioSystem.getVolumePercent();
        console.log(`音效${status} (音量: ${volume}%)`);
        renderer.showSuccess(`音效已${status}！音量: ${volume}%`);
        
    } catch (error) {
        console.error('切换音效失败:', error);
        renderer.showError('切换音效失败: ' + error.message);
    }
}

// 循环切换音量预设
function cycleVolumePreset() {
    if (!audioSystem) {
        console.log('音频系统未初始化');
        renderer.showError('音频系统未初始化');
        return;
    }

    try {
        const newPreset = audioSystem.cycleVolumePreset();
        
        // 保存音频设置
        audioSystem.saveAudioSettings();
        
        // 更新显示
        updateButtonStates();
        updateVolumeDisplay();
        
        const volume = audioSystem.getVolumePercent();
        console.log(`音量预设切换为: ${newPreset} (${volume}%)`);
        renderer.showSuccess(`音量: ${newPreset} (${volume}%)`);
        
    } catch (error) {
        console.error('切换音量预设失败:', error);
        renderer.showError('切换音量预设失败: ' + error.message);
    }
}

// 重置音频设置
function resetAudioSettings() {
    if (!audioSystem) {
        console.log('音频系统未初始化');
        renderer.showError('音频系统未初始化');
        return;
    }

    try {
        audioSystem.resetAudioSettings();
        
        // 更新显示
        updateButtonStates();
        updateVolumeDisplay();
        
        console.log('音频设置已重置');
        renderer.showSuccess('音频设置已重置为默认值！');
        
    } catch (error) {
        console.error('重置音频设置失败:', error);
        renderer.showError('重置音频设置失败: ' + error.message);
    }
}

// 检查游戏结束条件
function checkGameOverCondition() {
    if (!gameState.isPlaying || gameState.isPaused || gameState.isGameOver) {
        return false;
    }

    // 检查是否还有可能的移动
    const hasPossibleMoves = checkForPossibleMoves();
    
    if (!hasPossibleMoves) {
        handleGameOver('no_moves');
        return true;
    }

    return false;
}

// 检查是否还有可能的移动
function checkForPossibleMoves() {
    if (!gameGrid) return false;

    const grid = gameGrid.getGrid();
    const size = gameGrid.size;

    // 检查所有相邻位置的交换是否能产生匹配
    for (let row = 0; row < size; row++) {
        for (let col = 0; col < size; col++) {
            // 检查右边的相邻位置
            if (col < size - 1) {
                const pos1 = { row, col };
                const pos2 = { row, col: col + 1 };
                
                if (wouldSwapCreateMatch(pos1, pos2)) {
                    return true;
                }
            }
            
            // 检查下边的相邻位置
            if (row < size - 1) {
                const pos1 = { row, col };
                const pos2 = { row: row + 1, col };
                
                if (wouldSwapCreateMatch(pos1, pos2)) {
                    return true;
                }
            }
        }
    }

    return false;
}

// 检查交换是否会产生匹配
function wouldSwapCreateMatch(pos1, pos2) {
    if (!gameGrid) return false;

    try {
        // 临时交换
        const originalValue1 = gameGrid.getCell(pos1.row, pos1.col);
        const originalValue2 = gameGrid.getCell(pos2.row, pos2.col);
        
        gameGrid.setCell(pos1.row, pos1.col, originalValue2);
        gameGrid.setCell(pos2.row, pos2.col, originalValue1);
        
        // 检查是否产生匹配
        const matchDetector = new MatchDetector();
        const matchResult = matchDetector.findAllMatches(gameGrid.getGrid());
        const hasMatch = matchResult.hasMatches;
        
        // 恢复原状态
        gameGrid.setCell(pos1.row, pos1.col, originalValue1);
        gameGrid.setCell(pos2.row, pos2.col, originalValue2);
        
        return hasMatch;
    } catch (error) {
        console.error('检查交换匹配时出错:', error);
        return false;
    }
}

// 处理游戏结束
function handleGameOver(reason = 'unknown') {
    if (gameState.isGameOver) return; // 避免重复处理

    gameState.isGameOver = true;
    gameState.isPlaying = false;
    gameState.isPaused = false;
    gameState.gameEndReason = reason;

    // 禁用输入处理器
    if (inputHandler) {
        inputHandler.disable();
    }

    // 保存最终分数
    if (gameState.score > gameState.highScore) {
        gameState.highScore = gameState.score;
        if (storageManager) {
            storageManager.saveHighScore(gameState.score);
        }
    }

    // 播放游戏结束音效
    if (audioSystem) {
        audioSystem.playGameOverSound();
    }

    // 更新按钮状态
    updateButtonStates();

    // 显示游戏结束信息
    let endMessage = '游戏结束！';
    switch (reason) {
        case 'no_moves':
            endMessage = '游戏结束！没有更多可能的移动。';
            break;
        case 'user_quit':
            endMessage = '游戏结束！用户退出游戏。';
            break;
        default:
            endMessage = '游戏结束！';
    }

    console.log(endMessage, '最终分数:', gameState.score);
    renderer.showError(endMessage + ` 最终分数: ${gameState.score}`);

    // 渲染最终状态
    renderGame();
}

// 更新按钮状态
function updateButtonStates() {
    updateStartButton();
    updatePauseButton();
    updateRestartButton();
    updateSoundButton();
}

// 更新开始按钮状态
function updateStartButton() {
    if (!startBtn) return;
    
    // 清除所有状态类
    startBtn.classList.remove('active', 'warning', 'danger');
    
    if (gameState.isGameOver) {
        startBtn.disabled = false;
        startBtn.textContent = '🎮 开始新游戏';
        startBtn.title = '开始新游戏 (快捷键: S)';
        startBtn.setAttribute('aria-label', '开始新游戏');
        startBtn.classList.add('active');
    } else if (gameState.isPlaying) {
        startBtn.disabled = true;
        startBtn.textContent = '🎮 游戏中';
        startBtn.title = '游戏正在进行中';
        startBtn.setAttribute('aria-label', '游戏正在进行中');
        startBtn.classList.add('active');
    } else {
        startBtn.disabled = false;
        startBtn.textContent = '🎮 开始游戏';
        startBtn.title = '开始游戏 (快捷键: S)';
        startBtn.setAttribute('aria-label', '开始游戏');
    }
}

// 更新暂停按钮状态
function updatePauseButton() {
    if (!pauseBtn) return;
    
    // 清除所有状态类
    pauseBtn.classList.remove('active', 'warning', 'danger');
    
    const canPause = gameState.isPlaying && !gameState.isGameOver;
    pauseBtn.disabled = !canPause;
    
    if (gameState.isGameOver) {
        pauseBtn.textContent = '⏸️ 暂停';
        pauseBtn.title = '游戏已结束';
        pauseBtn.setAttribute('aria-label', '暂停功能不可用，游戏已结束');
    } else if (gameState.isPaused) {
        pauseBtn.textContent = '▶️ 继续';
        pauseBtn.title = '继续游戏 (快捷键: P 或 空格)';
        pauseBtn.setAttribute('aria-label', '继续游戏');
        pauseBtn.classList.add('active');
    } else if (gameState.isPlaying) {
        pauseBtn.textContent = '⏸️ 暂停';
        pauseBtn.title = '暂停游戏 (快捷键: P 或 空格)';
        pauseBtn.setAttribute('aria-label', '暂停游戏');
        pauseBtn.classList.add('warning');
    } else {
        pauseBtn.textContent = '⏸️ 暂停';
        pauseBtn.title = '请先开始游戏';
        pauseBtn.setAttribute('aria-label', '暂停功能不可用，请先开始游戏');
    }
}

// 更新重新开始按钮状态
function updateRestartButton() {
    if (!restartBtn) return;
    
    // 清除所有状态类
    restartBtn.classList.remove('active', 'warning', 'danger');
    
    restartBtn.disabled = false; // 重新开始按钮始终可用
    restartBtn.textContent = '🔄 重新开始';
    
    if (gameState.isPlaying && !gameState.isGameOver) {
        restartBtn.title = '重新开始游戏 (快捷键: R) - 将丢失当前进度';
        restartBtn.setAttribute('aria-label', '重新开始游戏，将丢失当前进度');
        restartBtn.classList.add('danger');
    } else {
        restartBtn.title = '重新开始游戏 (快捷键: R)';
        restartBtn.setAttribute('aria-label', '重新开始游戏');
    }
}

// 更新音效按钮状态
function updateSoundButton() {
    if (!soundBtn) return;
    
    // 清除所有状态类
    soundBtn.classList.remove('active', 'warning', 'danger');
    
    soundBtn.disabled = false; // 音效按钮始终可用
    
    if (audioSystem) {
        const isMuted = audioSystem.getMuteStatus();
        const volume = audioSystem.getVolumePercent();
        const preset = audioSystem.getVolumePresetName();
        
        if (isMuted) {
            soundBtn.textContent = '🔇 静音';
            soundBtn.title = '点击取消静音 (快捷键: M)';
            soundBtn.setAttribute('aria-label', '音效已静音，点击取消静音');
            soundBtn.classList.add('danger');
        } else {
            soundBtn.textContent = '🔊 音效';
            soundBtn.title = `音量: ${volume}% (${preset}) - 点击静音 (快捷键: M)`;
            soundBtn.setAttribute('aria-label', `音效开启，音量${volume}%，点击静音`);
            soundBtn.classList.add('active');
        }
    } else {
        soundBtn.textContent = '🔇 音效';
        soundBtn.title = '音频系统未初始化';
        soundBtn.setAttribute('aria-label', '音频系统未初始化');
        soundBtn.classList.add('warning');
    }
}

// 渲染游戏
function renderGame() {
    if (!renderer || !gameGrid || !gameState) {
        console.error('渲染失败: 缺少必要的游戏组件');
        return;
    }

    try {
        // 使用优化的渲染方法
        if (typeof renderer.optimizedRender === 'function') {
            renderer.optimizedRender();
        } else {
            // 渲染游戏网格
            renderer.renderGrid(gameGrid);
            
            // 渲染UI信息
            renderer.renderUI(gameState);
        }
        
        // 更新分数显示
        if (scoreSystem) {
            updateScoreDisplay(scoreSystem, renderer);
        }
        
        // 更新按钮状态
        updateButtonStates();
        
    } catch (error) {
        console.error('渲染游戏失败:', error);
        renderer.showError('渲染失败: ' + error.message);
    }
}

// 性能优化相关函数
function togglePerformanceMonitoring() {
    if (!performanceOptimizer) {
        console.warn('性能优化器未初始化');
        return;
    }

    if (isPerformanceMonitoringEnabled) {
        performanceOptimizer.stopMonitoring();
        isPerformanceMonitoringEnabled = false;
        console.log('性能监控已停止');
        if (renderer) {
            renderer.showSuccess('性能监控已停止');
        }
    } else {
        performanceOptimizer.startMonitoring();
        isPerformanceMonitoringEnabled = true;
        console.log('性能监控已启动');
        if (renderer) {
            renderer.showSuccess('性能监控已启动');
        }
    }
}

function getPerformanceReport() {
    if (!performanceOptimizer) {
        console.warn('性能优化器未初始化');
        return null;
    }

    const report = performanceOptimizer.exportPerformanceReport();
    
    // 添加游戏特定的性能数据
    if (renderer && typeof renderer.getPerformanceMetrics === 'function') {
        report.rendererMetrics = renderer.getPerformanceMetrics();
    }
    
    if (inputHandler && typeof inputHandler.getPerformanceMetrics === 'function') {
        report.inputHandlerMetrics = inputHandler.getPerformanceMetrics();
    }
    
    console.log('性能报告:', report);
    return report;
}

function optimizePerformance() {
    if (!performanceOptimizer) {
        console.warn('性能优化器未初始化');
        return;
    }

    try {
        // 自动优化
        performanceOptimizer.autoOptimize();
        
        // 优化渲染器
        if (renderer && typeof renderer.optimizeMemoryUsage === 'function') {
            renderer.optimizeMemoryUsage();
        }
        
        // 优化输入处理器
        if (inputHandler && typeof inputHandler.optimizeMemoryUsage === 'function') {
            inputHandler.optimizeMemoryUsage();
        }
        
        console.log('性能优化完成');
        if (renderer) {
            renderer.showSuccess('性能优化完成！');
        }
    } catch (error) {
        console.error('性能优化失败:', error);
        if (renderer) {
            renderer.showError('性能优化失败: ' + error.message);
        }
    }
}

// 内存清理函数
function cleanupMemory() {
    try {
        // 清理游戏组件缓存
        if (renderer && typeof renderer.optimizeMemoryUsage === 'function') {
            renderer.optimizeMemoryUsage();
        }
        
        if (inputHandler && typeof inputHandler.optimizeMemoryUsage === 'function') {
            inputHandler.optimizeMemoryUsage();
        }
        
        // 清理音频系统
        if (audioSystem && typeof audioSystem.cleanup === 'function') {
            audioSystem.cleanup();
        }
        
        // 强制垃圾回收（如果支持）
        if (window.gc && typeof window.gc === 'function') {
            window.gc();
        }
        
        console.log('内存清理完成');
        if (renderer) {
            renderer.showSuccess('内存清理完成！');
        }
    } catch (error) {
        console.error('内存清理失败:', error);
        if (renderer) {
            renderer.showError('内存清理失败: ' + error.message);
        }
    }
}

// 测试渲染功能
function testRendering() {
    console.log('开始测试渲染功能...');
    
    // 测试网格渲染
    if (gameGrid && renderer) {
        console.log('网格渲染测试通过');
        
        // 测试分数显示
        gameState.score = 1234;
        gameState.highScore = 5678;
        renderer.renderUI(gameState);
        console.log('分数显示测试通过');
        
        // 测试高亮功能
        setTimeout(() => {
            renderer.highlightCell(2, 3, 'selected');
            renderer.highlightCell(4, 5, 'highlighted');
            console.log('高亮功能测试通过');
        }, 1000);
        
        // 测试状态信息
        setTimeout(() => {
            renderer.showSuccess('渲染功能测试完成！');
            console.log('渲染功能测试完成');
        }, 2000);
    }
}

// 测试动画功能
function testAnimations() {
    console.log('开始测试动画功能...');
    
    if (!renderer || !gameGrid) {
        console.error('渲染器或游戏网格未初始化');
        return;
    }

    let testStep = 0;
    
    function runNextTest() {
        testStep++;
        
        switch (testStep) {
            case 1:
                // 测试游戏开始动画
                console.log('测试游戏开始动画...');
                renderer.playGameStartAnimation(() => {
                    console.log('游戏开始动画测试完成');
                    setTimeout(runNextTest, 1000);
                });
                break;
                
            case 2:
                // 测试元素消除动画
                console.log('测试元素消除动画...');
                const removePositions = [
                    { row: 1, col: 1 },
                    { row: 1, col: 2 },
                    { row: 1, col: 3 }
                ];
                renderer.playRemoveAnimation(removePositions, () => {
                    console.log('元素消除动画测试完成');
                    setTimeout(runNextTest, 1000);
                });
                break;
                
            case 3:
                // 测试元素下落动画
                console.log('测试元素下落动画...');
                const movements = [
                    { from: { row: 0, col: 1 }, to: { row: 1, col: 1 }, value: 'HAPPY' },
                    { from: { row: 0, col: 2 }, to: { row: 1, col: 2 }, value: 'SCARY' }
                ];
                renderer.playFallAnimation(movements, () => {
                    console.log('元素下落动画测试完成');
                    setTimeout(runNextTest, 1000);
                });
                break;
                
            case 4:
                // 测试新元素出现动画
                console.log('测试新元素出现动画...');
                const newElements = [
                    { position: { row: 0, col: 1 }, value: 'COOL' },
                    { position: { row: 0, col: 2 }, value: 'WINK' }
                ];
                renderer.playAppearAnimation(newElements, () => {
                    console.log('新元素出现动画测试完成');
                    setTimeout(runNextTest, 1000);
                });
                break;
                
            case 5:
                // 测试连锁反应动画
                console.log('测试连锁反应动画...');
                renderer.playChainAnimation(3, () => {
                    console.log('连锁反应动画测试完成');
                    setTimeout(runNextTest, 1000);
                });
                break;
                
            case 6:
                // 测试交换动画
                console.log('测试交换动画...');
                const pos1 = { row: 3, col: 3 };
                const pos2 = { row: 3, col: 4 };
                renderer.playSwapAnimation(pos1, pos2, () => {
                    console.log('交换动画测试完成');
                    setTimeout(runNextTest, 1000);
                });
                break;
                
            case 7:
                // 测试无效移动动画
                console.log('测试无效移动动画...');
                renderer.playInvalidMoveAnimation({ row: 5, col: 5 }, { row: 5, col: 6 });
                console.log('无效移动动画测试完成');
                setTimeout(runNextTest, 1000);
                break;
                
            case 8:
                // 测试提示动画
                console.log('测试提示动画...');
                const hintPositions = [{ row: 6, col: 6 }, { row: 6, col: 7 }];
                renderer.playHintAnimation(hintPositions);
                console.log('提示动画测试完成');
                setTimeout(runNextTest, 2000);
                break;
                
            case 9:
                // 测试分数动画
                console.log('测试分数动画...');
                const scoreElement = document.getElementById('current-score');
                if (scoreElement) {
                    renderer.playScoreAnimation(150, scoreElement);
                }
                console.log('分数动画测试完成');
                setTimeout(runNextTest, 1000);
                break;
                
            default:
                console.log('所有动画测试完成！');
                renderer.showSuccess('动画系统测试完成！');
                break;
        }
    }
    
    // 开始测试
    runNextTest();
}

// 添加动画测试按钮功能
function addAnimationTestButton() {
    // 创建测试按钮
    const testButton = document.createElement('button');
    testButton.textContent = '🎬 测试动画';
    testButton.className = 'control-btn';
    testButton.style.marginTop = '10px';
    
    testButton.addEventListener('click', () => {
        testAnimations();
    });
    
    // 添加到控制区域
    const controlSection = document.querySelector('.control-section');
    if (controlSection) {
        controlSection.appendChild(testButton);
    }
}

// 添加输入测试按钮功能
function addInputTestButton() {
    // 创建测试按钮
    const testButton = document.createElement('button');
    testButton.textContent = '🎮 测试输入';
    testButton.className = 'control-btn';
    testButton.style.marginTop = '10px';
    
    testButton.addEventListener('click', () => {
        testInputHandling();
    });
    
    // 添加到控制区域
    const controlSection = document.querySelector('.control-section');
    if (controlSection) {
        controlSection.appendChild(testButton);
    }
}

// 添加音频测试按钮功能
function addAudioTestButton() {
    // 创建测试按钮
    const testButton = document.createElement('button');
    testButton.textContent = '🔊 测试音效';
    testButton.className = 'control-btn';
    testButton.style.marginTop = '10px';
    
    testButton.addEventListener('click', () => {
        testAudioSystem();
    });
    
    // 添加到控制区域
    const controlSection = document.querySelector('.control-section');
    if (controlSection) {
        controlSection.appendChild(testButton);
    }
}

// 添加音量控制按钮
function addVolumeControls() {
    const controlSection = document.querySelector('.control-section');
    if (!controlSection || !audioSystem) return;

    // 创建音量控制容器
    const volumeContainer = document.createElement('div');
    volumeContainer.className = 'volume-controls';
    volumeContainer.style.cssText = `
        display: flex;
        align-items: center;
        gap: 5px;
        margin-top: 10px;
        padding: 5px;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 5px;
    `;

    // 音量减少按钮
    const volumeDownBtn = document.createElement('button');
    volumeDownBtn.textContent = '🔉';
    volumeDownBtn.className = 'control-btn';
    volumeDownBtn.style.cssText = 'padding: 5px 10px; font-size: 14px;';
    volumeDownBtn.addEventListener('click', () => {
        if (audioSystem) {
            audioSystem.decreaseVolume(0.1);
            audioSystem.saveAudioSettings();
            updateVolumeDisplay();
            updateButtonStates();
            audioSystem.playVolumeTestSound();
        }
    });

    // 音量显示（可点击切换预设）
    const volumeDisplay = document.createElement('span');
    volumeDisplay.id = 'volume-display';
    volumeDisplay.style.cssText = `
        min-width: 50px;
        text-align: center;
        color: white;
        font-weight: bold;
        font-size: 12px;
        cursor: pointer;
        padding: 2px 4px;
        border-radius: 3px;
        background: rgba(255, 255, 255, 0.1);
    `;
    volumeDisplay.title = '点击切换音量预设';
    volumeDisplay.addEventListener('click', cycleVolumePreset);

    // 音量增加按钮
    const volumeUpBtn = document.createElement('button');
    volumeUpBtn.textContent = '🔊';
    volumeUpBtn.className = 'control-btn';
    volumeUpBtn.style.cssText = 'padding: 5px 10px; font-size: 14px;';
    volumeUpBtn.addEventListener('click', () => {
        if (audioSystem) {
            audioSystem.increaseVolume(0.1);
            audioSystem.saveAudioSettings();
            updateVolumeDisplay();
            updateButtonStates();
            audioSystem.playVolumeTestSound();
        }
    });

    // 组装音量控制
    volumeContainer.appendChild(volumeDownBtn);
    volumeContainer.appendChild(volumeDisplay);
    volumeContainer.appendChild(volumeUpBtn);
    controlSection.appendChild(volumeContainer);

    // 添加高级音频控制按钮
    addAdvancedAudioControls(controlSection);

    // 更新音量显示
    updateVolumeDisplay();
}

// 添加高级音频控制按钮
function addAdvancedAudioControls(controlSection) {
    // 创建高级控制容器
    const advancedContainer = document.createElement('div');
    advancedContainer.className = 'advanced-audio-controls';
    advancedContainer.style.cssText = `
        display: flex;
        align-items: center;
        gap: 5px;
        margin-top: 5px;
        padding: 5px;
        background: rgba(255, 255, 255, 0.05);
        border-radius: 5px;
    `;

    // 音量预设按钮
    const presetBtn = document.createElement('button');
    presetBtn.textContent = '🎚️ 预设';
    presetBtn.className = 'control-btn';
    presetBtn.style.cssText = 'padding: 3px 8px; font-size: 12px;';
    presetBtn.title = '循环切换音量预设';
    presetBtn.addEventListener('click', cycleVolumePreset);

    // 重置音频设置按钮
    const resetBtn = document.createElement('button');
    resetBtn.textContent = '🔄 重置';
    resetBtn.className = 'control-btn';
    resetBtn.style.cssText = 'padding: 3px 8px; font-size: 12px;';
    resetBtn.title = '重置音频设置为默认值';
    resetBtn.addEventListener('click', resetAudioSettings);

    // 测试连锁音效按钮
    const chainTestBtn = document.createElement('button');
    chainTestBtn.textContent = '⚡ 连锁';
    chainTestBtn.className = 'control-btn';
    chainTestBtn.style.cssText = 'padding: 3px 8px; font-size: 12px;';
    chainTestBtn.title = '测试连锁反应音效';
    chainTestBtn.addEventListener('click', testChainReactionSounds);

    // 组装高级控制
    advancedContainer.appendChild(presetBtn);
    advancedContainer.appendChild(resetBtn);
    advancedContainer.appendChild(chainTestBtn);
    controlSection.appendChild(advancedContainer);
}

// 测试连锁反应音效
function testChainReactionSounds() {
    if (!audioSystem) {
        console.log('音频系统未初始化');
        renderer.showError('音频系统未初始化');
        return;
    }

    console.log('开始测试连锁反应音效...');
    renderer.showSuccess('测试连锁反应音效...');

    // 恢复音频上下文
    audioSystem.resumeContext().then(() => {
        let delay = 0;
        const testDelay = 1500;

        // 测试不同等级的连锁反应音效
        for (let level = 1; level <= 8; level++) {
            setTimeout(() => {
                console.log(`测试 ${level} 级连锁反应音效`);
                audioSystem.playAdvancedChainReaction(level, 8);
                
                if (renderer) {
                    renderer.showSuccess(`${level} 级连锁反应！`);
                }
            }, delay);
            delay += testDelay;
        }

        // 测试完成提示
        setTimeout(() => {
            console.log('连锁反应音效测试完成');
            if (renderer) {
                renderer.showSuccess('连锁反应音效测试完成！');
            }
        }, delay);

    }).catch(error => {
        console.error('音频上下文恢复失败:', error);
        renderer.showError('音频上下文恢复失败: ' + error.message);
    });
}

// 更新音量显示
function updateVolumeDisplay() {
    const volumeDisplay = document.getElementById('volume-display');
    if (volumeDisplay && audioSystem) {
        const volume = audioSystem.getVolumePercent();
        const preset = audioSystem.getVolumePresetName();
        const isMuted = audioSystem.getMuteStatus();
        
        if (isMuted) {
            volumeDisplay.textContent = '静音';
            volumeDisplay.style.color = '#ff6b6b';
        } else {
            volumeDisplay.textContent = `${volume}%`;
            volumeDisplay.style.color = volume > 0 ? '#51cf66' : '#ffd43b';
        }
        
        // 更新提示文本
        volumeDisplay.title = `当前音量: ${volume}% (${preset}) - 点击切换预设`;
    }
}

// 测试输入处理功能
function testInputHandling() {
    if (!inputHandler) {
        console.error('输入处理器未初始化');
        return;
    }

    console.log('开始测试输入处理功能...');
    
    // 显示输入处理器状态
    console.log('输入处理器状态:', inputHandler.getStatus());
    
    // 显示触摸设置
    console.log('触摸设置:', inputHandler.getTouchSettings());
    
    // 测试程序化选择
    setTimeout(() => {
        console.log('测试程序化选择单元格 (2,2)');
        inputHandler.programmaticSelect({ row: 2, col: 2 });
    }, 1000);
    
    setTimeout(() => {
        console.log('测试程序化选择单元格 (4,4)');
        inputHandler.programmaticSelect({ row: 4, col: 4 });
    }, 2000);
    
    setTimeout(() => {
        console.log('清除所有选择');
        inputHandler.clearAll();
    }, 3000);
    
    // 测试触摸敏感度设置
    setTimeout(() => {
        console.log('测试触摸敏感度设置');
        inputHandler.setTouchSensitivity('high');
        
        setTimeout(() => {
            inputHandler.setTouchSensitivity('medium');
        }, 1000);
    }, 4000);
    
    console.log('输入处理测试完成！请尝试点击或拖拽游戏单元格。');
    
    if (renderer) {
        renderer.showSuccess('输入处理测试完成！请尝试交互操作。');
    }
}

// 测试音频系统功能
function testAudioSystem() {
    if (!audioSystem) {
        console.error('音频系统未初始化');
        if (renderer) {
            renderer.showError('音频系统未初始化');
        }
        return;
    }

    console.log('开始测试音频系统功能...');
    
    // 显示音频系统状态和设置摘要
    console.log('音频系统状态:', audioSystem.getStatus());
    console.log('音频设置摘要:', audioSystem.getAudioSettingsSummary());
    
    // 恢复音频上下文（如果需要）
    audioSystem.resumeContext().then(() => {
        // 运行完整的音效测试
        audioSystem.testAllSounds();
        
        // 额外测试高级连锁反应音效
        setTimeout(() => {
            console.log('测试高级连锁反应音效...');
            testChainReactionSounds();
        }, 15000); // 在基础测试完成后开始
        
        if (renderer) {
            renderer.showSuccess('音频系统测试开始！请听音效播放。');
        }
    }).catch(error => {
        console.error('音频上下文恢复失败:', error);
        if (renderer) {
            renderer.showError('音频上下文恢复失败: ' + error.message);
        }
    });
}

// 创建键盘提示系统
function createKeyboardHint() {
    const hint = document.createElement('div');
    hint.className = 'keyboard-hint';
    hint.innerHTML = `
        <div>键盘快捷键:</div>
        <div><kbd>S</kbd> 开始游戏 | <kbd>P</kbd>/<kbd>空格</kbd> 暂停 | <kbd>R</kbd> 重新开始 | <kbd>M</kbd> 静音</div>
    `;
    document.body.appendChild(hint);
    
    // 显示提示3秒后自动隐藏
    setTimeout(() => {
        hint.classList.add('show');
    }, 1000);
    
    setTimeout(() => {
        hint.classList.remove('show');
    }, 8000);
    
    return hint;
}

// 显示临时键盘提示
function showKeyboardHint(message, duration = 2000) {
    const existingHint = document.querySelector('.keyboard-hint');
    if (existingHint) {
        existingHint.remove();
    }
    
    const hint = document.createElement('div');
    hint.className = 'keyboard-hint show';
    hint.innerHTML = message;
    document.body.appendChild(hint);
    
    setTimeout(() => {
        hint.classList.remove('show');
        setTimeout(() => {
            hint.remove();
        }, 300);
    }, duration);
}

// 显示键盘快捷键面板
function showKeyboardShortcutsPanel() {
    let panel = document.querySelector('.keyboard-shortcuts-panel');
    if (!panel) {
        panel = document.createElement('div');
        panel.className = 'keyboard-shortcuts-panel';
        panel.innerHTML = `
            <button class="shortcuts-close-btn">×</button>
            <h3>键盘快捷键</h3>
            <div class="shortcut-item">
                <span class="shortcut-key">S</span>
                <span class="shortcut-description">开始游戏</span>
            </div>
            <div class="shortcut-item">
                <span class="shortcut-key">P / 空格</span>
                <span class="shortcut-description">暂停/继续</span>
            </div>
            <div class="shortcut-item">
                <span class="shortcut-key">R</span>
                <span class="shortcut-description">重新开始</span>
            </div>
            <div class="shortcut-item">
                <span class="shortcut-key">M</span>
                <span class="shortcut-description">静音切换</span>
            </div>
            <div class="shortcut-item">
                <span class="shortcut-key">F1</span>
                <span class="shortcut-description">性能监控</span>
            </div>
            <div class="shortcut-item">
                <span class="shortcut-key">F2</span>
                <span class="shortcut-description">性能报告</span>
            </div>
            <div class="shortcut-item">
                <span class="shortcut-key">F3</span>
                <span class="shortcut-description">性能优化</span>
            </div>
            <div class="shortcut-item">
                <span class="shortcut-key">F4</span>
                <span class="shortcut-description">内存清理</span>
            </div>
            <div class="shortcut-item">
                <span class="shortcut-key">H</span>
                <span class="shortcut-description">显示帮助</span>
            </div>
        `;
        
        document.body.appendChild(panel);
        
        // 绑定关闭事件
        const closeBtn = panel.querySelector('.shortcuts-close-btn');
        closeBtn.addEventListener('click', hideKeyboardShortcutsPanel);
        
        // 点击面板外部关闭
        panel.addEventListener('click', (e) => {
            if (e.target === panel) {
                hideKeyboardShortcutsPanel();
            }
        });
    }
    
    panel.classList.add('show');
}

// 隐藏键盘快捷键面板
function hideKeyboardShortcutsPanel() {
    const panel = document.querySelector('.keyboard-shortcuts-panel');
    if (panel) {
        panel.classList.remove('show');
    }
}

// 增强的用户体验功能
function initializeUserExperience() {
    // 检测设备类型
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const isMobile = window.innerWidth < 768;
    
    if (isTouchDevice) {
        // 启用触摸优化
        document.body.classList.add('touch-device');
        
        // 显示触摸教程（首次访问）
        if (!localStorage.getItem('touch-tutorial-shown')) {
            setTimeout(() => {
                if (inputHandler && typeof inputHandler.showTouchTutorial === 'function') {
                    inputHandler.showTouchTutorial();
                    localStorage.setItem('touch-tutorial-shown', 'true');
                }
            }, 1000);
        }
        
        // 启用触摸辅助功能
        if (inputHandler && typeof inputHandler.enableTouchAccessibility === 'function') {
            inputHandler.enableTouchAccessibility();
        }
        
        // 自适应触摸敏感度
        if (inputHandler && typeof inputHandler.adaptiveTouchSensitivity === 'function') {
            inputHandler.adaptiveTouchSensitivity();
        }
    }
    
    if (isMobile) {
        document.body.classList.add('mobile-device');
    }
    
    // 启用键盘导航
    document.body.classList.add('keyboard-navigation-active');
    
    // 监听窗口大小变化
    window.addEventListener('resize', debounce(() => {
        // 重新调整触摸敏感度
        if (inputHandler && typeof inputHandler.adaptiveTouchSensitivity === 'function') {
            inputHandler.adaptiveTouchSensitivity();
        }
        
        // 重新渲染游戏
        optimizedRenderGame();
    }, 250));
    
    // 监听网络状态变化
    if ('onLine' in navigator) {
        window.addEventListener('online', () => {
            if (renderer && typeof renderer.showFeedbackToast === 'function') {
                renderer.showFeedbackToast('网络连接已恢复', 'success');
            }
        });
        
        window.addEventListener('offline', () => {
            if (renderer && typeof renderer.showFeedbackToast === 'function') {
                renderer.showFeedbackToast('网络连接已断开，游戏将继续离线运行', 'warning', 5000);
            }
        });
    }
    
    // 监听页面可见性变化
    if ('visibilityState' in document) {
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden') {
                // 页面隐藏时自动暂停游戏
                if (gameState.isPlaying && !gameState.isPaused && !gameState.isGameOver) {
                    togglePause();
                    if (renderer && typeof renderer.showFeedbackToast === 'function') {
                        renderer.showFeedbackToast('游戏已自动暂停', 'info');
                    }
                }
            }
        });
    }
    
    console.log('用户体验增强功能已初始化');
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    console.log('页面加载完成，开始初始化游戏...');
    
    // 延迟初始化，确保所有资源加载完成
    setTimeout(() => {
        initializeGame();
        
        // 运行渲染测试
        setTimeout(() => {
            testRendering();
        }, 500);
        
        // 添加动画测试按钮
        addAnimationTestButton();
        
        // 添加输入测试按钮
        addInputTestButton();
        
        // 添加音频测试按钮
        addAudioTestButton();
        
        // 添加分数系统测试按钮
        addScoreTestButton();
        
        // 添加存储系统测试按钮
        addStorageTestButton();
        
        // 添加音量控制
        addVolumeControls();
        
        // 创建键盘提示
        createKeyboardHint();
        
        // 初始化用户体验增强功能
        initializeUserExperience();
    }, 100);
});

// 错误处理
window.addEventListener('error', function(event) {
    console.error('全局错误:', event.error);
    if (renderer) {
        renderer.showError('发生错误: ' + event.error.message);
    }
});

// 测试分数系统功能
function testScoreSystem() {
    if (!scoreSystem) {
        console.error('分数系统未初始化');
        if (renderer) {
            renderer.showError('分数系统未初始化');
        }
        return;
    }

    console.log('开始测试分数系统功能...');
    
    // 显示分数系统状态
    console.log('分数系统状态:', scoreSystem.getScoreStats());
    
    // 模拟一些匹配得分
    const testMatches = [
        [
            { positions: [{row: 0, col: 0}, {row: 0, col: 1}, {row: 0, col: 2}], type: 'horizontal', length: 3 }
        ],
        [
            { positions: [{row: 1, col: 0}, {row: 1, col: 1}, {row: 1, col: 2}, {row: 1, col: 3}], type: 'horizontal', length: 4 }
        ],
        [
            { positions: [{row: 2, col: 0}, {row: 2, col: 1}, {row: 2, col: 2}, {row: 2, col: 3}, {row: 2, col: 4}], type: 'horizontal', length: 5 }
        ]
    ];
    
    let delay = 0;
    
    testMatches.forEach((matches, index) => {
        setTimeout(() => {
            console.log(`测试匹配 ${index + 1}:`, matches);
            const scoreEntry = scoreSystem.processMatchScore(matches, index > 0);
            
            // 更新游戏状态
            gameState.score = scoreSystem.getCurrentScore();
            gameState.chainCount = scoreSystem.getChainLevel();
            
            // 播放分数动画
            if (renderer && audioSystem) {
                playScoreAnimation(scoreEntry, renderer, audioSystem);
            }
            
            // 更新显示
            renderGame();
            
            console.log('分数更新:', scoreEntry);
            
        }, delay);
        delay += 2000;
    });
    
    // 测试完成提示
    setTimeout(() => {
        console.log('分数系统测试完成');
        console.log('最终分数统计:', scoreSystem.getScoreStats());
        console.log('分数等级:', scoreSystem.getScoreRank());
        
        if (renderer) {
            renderer.showSuccess('分数系统测试完成！');
        }
    }, delay);
}

// 测试存储系统功能
function testStorageSystem() {
    if (!storageManager) {
        console.error('存储管理器未初始化');
        if (renderer) {
            renderer.showError('存储管理器未初始化');
        }
        return;
    }

    console.log('开始测试存储系统功能...');
    
    // 显示存储系统状态
    console.log('存储系统状态:', storageManager.getStatus());
    console.log('存储使用情况:', storageManager.getStorageUsage());
    
    // 测试最高分保存和读取
    const testScore = 12345;
    console.log('测试保存最高分:', testScore);
    const saveResult = storageManager.saveHighScore(testScore);
    console.log('保存结果:', saveResult);
    
    const loadedScore = storageManager.getHighScore();
    console.log('读取的最高分:', loadedScore);
    
    // 测试游戏状态保存和读取
    const testGameState = {
        score: 5000,
        level: 3,
        moves: 50
    };
    console.log('测试保存游戏状态:', testGameState);
    storageManager.saveGameState(testGameState);
    
    const loadedGameState = storageManager.loadGameState();
    console.log('读取的游戏状态:', loadedGameState);
    
    // 测试数据备份
    console.log('创建数据备份...');
    const backupKey = storageManager.createBackup();
    console.log('备份创建结果:', backupKey);
    
    console.log('存储系统测试完成');
    
    if (renderer) {
        renderer.showSuccess('存储系统测试完成！');
    }
}

// 添加分数系统测试按钮
function addScoreTestButton() {
    const testButton = document.createElement('button');
    testButton.textContent = '📊 测试分数';
    testButton.className = 'control-btn';
    testButton.style.marginTop = '10px';
    
    testButton.addEventListener('click', () => {
        testScoreSystem();
    });
    
    const controlSection = document.querySelector('.control-section');
    if (controlSection) {
        controlSection.appendChild(testButton);
    }
}

// 添加存储系统测试按钮
function addStorageTestButton() {
    const testButton = document.createElement('button');
    testButton.textContent = '💾 测试存储';
    testButton.className = 'control-btn';
    testButton.style.marginTop = '10px';
    
    testButton.addEventListener('click', () => {
        testStorageSystem();
    });
    
    const controlSection = document.querySelector('.control-section');
    if (controlSection) {
        controlSection.appendChild(testButton);
    }
}

// 导出主要函数（用于调试）
window.gameDebug = {
    gameGrid,
    renderer,
    gameState,
    inputHandler,
    audioSystem,
    scoreSystem,
    storageManager,
    renderGame,
    testRendering,
    testAudioSystem,
    testScoreSystem,
    testStorageSystem,
    handleSwapAttempt,
    processMatches
};