// 主游戏脚本 - 使用GameEngine的新版本

// 全局变量
let gameEngine = null;

// 页面加载完成后初始化游戏
document.addEventListener('DOMContentLoaded', async function() {
    console.log('页面加载完成，开始初始化游戏...');
    
    try {
        // 获取游戏容器
        const gameContainer = document.querySelector('.game-container');
        if (!gameContainer) {
            throw new Error('游戏容器元素未找到');
        }
        
        // 创建游戏引擎
        gameEngine = createGameEngine(gameContainer);
        
        // 初始化游戏引擎
        const initSuccess = await gameEngine.initialize();
        
        if (initSuccess) {
            console.log('游戏初始化成功！');
            
            // 绑定全局事件监听器
            bindGlobalEvents();
            
            // 显示初始化成功消息
            showWelcomeMessage();
            
        } else {
            throw new Error('游戏引擎初始化失败');
        }
        
    } catch (error) {
        console.error('游戏初始化失败:', error);
        showInitializationError(error);
    }
});

/**
 * 绑定全局事件监听器
 */
function bindGlobalEvents() {
    // 绑定键盘快捷键
    document.addEventListener('keydown', handleGlobalKeydown);
    
    // 绑定窗口事件
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    // 绑定游戏引擎事件
    if (gameEngine) {
        gameEngine.on('gameStarted', handleGameStarted);
        gameEngine.on('gamePaused', handleGamePaused);
        gameEngine.on('gameResumed', handleGameResumed);
        gameEngine.on('gameOver', handleGameOver);
        gameEngine.on('engineError', handleEngineError);
    }
    
    console.log('全局事件监听器绑定完成');
}

/**
 * 处理全局键盘快捷键
 */
function handleGlobalKeydown(event) {
    // 避免在输入框中触发快捷键
    if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
        return;
    }
    
    if (!gameEngine) {
        return;
    }
    
    switch (event.code) {
        case 'KeyS':
            // S键 - 开始游戏
            event.preventDefault();
            if (gameEngine.state === ENGINE_STATES.READY || gameEngine.state === ENGINE_STATES.GAME_OVER) {
                showKeyboardHint('使用了键盘快捷键: <kbd>S</kbd> 开始游戏');
                gameEngine.startGame();
            }
            break;
            
        case 'KeyP':
        case 'Space':
            // P键或空格键 - 暂停/继续
            if (gameEngine.state === ENGINE_STATES.PLAYING || gameEngine.state === ENGINE_STATES.PAUSED) {
                event.preventDefault();
                const key = event.code === 'Space' ? '空格' : 'P';
                const action = gameEngine.state === ENGINE_STATES.PAUSED ? '继续' : '暂停';
                showKeyboardHint(`使用了键盘快捷键: <kbd>${key}</kbd> ${action}游戏`);
                gameEngine.togglePause();
            }
            break;
            
        case 'KeyR':
            // R键 - 重新开始
            event.preventDefault();
            if (gameEngine.state === ENGINE_STATES.PLAYING && !confirm('确定要重新开始游戏吗？当前进度将丢失。')) {
                return;
            }
            showKeyboardHint('使用了键盘快捷键: <kbd>R</kbd> 重新开始');
            gameEngine.restartGame();
            break;
            
        case 'KeyM':
            // M键 - 静音切换
            event.preventDefault();
            showKeyboardHint('使用了键盘快捷键: <kbd>M</kbd> 切换音效');
            gameEngine.toggleSound();
            break;
            
        case 'KeyH':
            // H键 - 显示帮助
            event.preventDefault();
            showKeyboardShortcutsPanel();
            break;
            
        case 'F1':
            // F1键 - 显示游戏状态
            event.preventDefault();
            showGameStatus();
            break;
            
        case 'F2':
            // F2键 - 显示性能统计
            event.preventDefault();
            showPerformanceStats();
            break;
    }
}

/**
 * 处理页面卸载前事件
 */
function handleBeforeUnload(event) {
    if (gameEngine) {
        // 保存游戏状态
        gameEngine.saveGameState();
    }
}

/**
 * 游戏引擎事件处理器
 */
function handleGameStarted() {
    console.log('游戏开始事件触发');
    showNotification('游戏开始！', 'success');
}

function handleGamePaused() {
    console.log('游戏暂停事件触发');
    showNotification('游戏已暂停', 'info');
}

function handleGameResumed() {
    console.log('游戏继续事件触发');
    showNotification('游戏继续！', 'success');
}

function handleGameOver(data) {
    console.log('游戏结束事件触发:', data);
    
    let message = '游戏结束！';
    if (data.isNewHighScore) {
        message += ' 🎉 恭喜创造新纪录！';
    }
    
    showNotification(message, data.isNewHighScore ? 'success' : 'info', 5000);
}

function handleEngineError(error) {
    console.error('游戏引擎错误:', error);
    showNotification('游戏引擎错误: ' + error.message, 'error', 10000);
}

/**
 * 显示欢迎消息
 */
function showWelcomeMessage() {
    const welcomeMessage = `
        <div class="welcome-message">
            <h2>🎮 欢迎来到小鬼消消乐！</h2>
            <p>点击"开始游戏"按钮开始你的消除之旅</p>
            <p>按 <kbd>H</kbd> 查看键盘快捷键</p>
        </div>
    `;
    
    showNotification(welcomeMessage, 'info', 5000);
}

/**
 * 显示初始化错误
 */
function showInitializationError(error) {
    const errorMessage = `
        <div class="error-message">
            <h3>❌ 游戏初始化失败</h3>
            <p>错误信息: ${error.message}</p>
            <p>请刷新页面重试，或检查浏览器兼容性</p>
        </div>
    `;
    
    document.body.innerHTML = errorMessage;
}

/**
 * 显示键盘快捷键面板
 */
function showKeyboardShortcutsPanel() {
    const shortcuts = `
        <div class="shortcuts-panel">
            <h3>⌨️ 键盘快捷键</h3>
            <div class="shortcuts-list">
                <div class="shortcut-item">
                    <kbd>S</kbd> <span>开始游戏</span>
                </div>
                <div class="shortcut-item">
                    <kbd>P</kbd> / <kbd>空格</kbd> <span>暂停/继续</span>
                </div>
                <div class="shortcut-item">
                    <kbd>R</kbd> <span>重新开始</span>
                </div>
                <div class="shortcut-item">
                    <kbd>M</kbd> <span>切换音效</span>
                </div>
                <div class="shortcut-item">
                    <kbd>H</kbd> <span>显示帮助</span>
                </div>
                <div class="shortcut-item">
                    <kbd>F1</kbd> <span>游戏状态</span>
                </div>
                <div class="shortcut-item">
                    <kbd>F2</kbd> <span>性能统计</span>
                </div>
            </div>
        </div>
    `;
    
    showModal(shortcuts);
}

/**
 * 显示游戏状态
 */
function showGameStatus() {
    if (!gameEngine) {
        showNotification('游戏引擎未初始化', 'error');
        return;
    }
    
    const status = gameEngine.getStatus();
    const stats = gameEngine.getGameStats();
    
    const statusInfo = `
        <div class="status-panel">
            <h3>🎮 游戏状态</h3>
            <div class="status-grid">
                <div class="status-item">
                    <strong>状态:</strong> ${status.state}
                </div>
                <div class="status-item">
                    <strong>分数:</strong> ${status.score.toLocaleString()}
                </div>
                <div class="status-item">
                    <strong>最高分:</strong> ${status.highScore.toLocaleString()}
                </div>
                <div class="status-item">
                    <strong>移动次数:</strong> ${status.moveCount}
                </div>
                <div class="status-item">
                    <strong>连锁等级:</strong> ${status.chainLevel}
                </div>
                <div class="status-item">
                    <strong>FPS:</strong> ${status.performance.current.fps.toFixed(1)}
                </div>
            </div>
        </div>
    `;
    
    showModal(statusInfo);
}

/**
 * 显示性能统计
 */
function showPerformanceStats() {
    if (!gameEngine) {
        showNotification('游戏引擎未初始化', 'error');
        return;
    }
    
    const stats = gameEngine.getPerformanceStats();
    
    const performanceInfo = `
        <div class="performance-panel">
            <h3>📊 性能统计</h3>
            <div class="performance-grid">
                <div class="performance-item">
                    <strong>当前FPS:</strong> ${stats.current.fps.toFixed(1)}
                </div>
                <div class="performance-item">
                    <strong>平均FPS:</strong> ${stats.average.fps.toFixed(1)}
                </div>
                <div class="performance-item">
                    <strong>帧时间:</strong> ${stats.current.frameTime.toFixed(2)}ms
                </div>
                <div class="performance-item">
                    <strong>更新时间:</strong> ${stats.current.updateTime.toFixed(2)}ms
                </div>
                <div class="performance-item">
                    <strong>渲染时间:</strong> ${stats.current.renderTime.toFixed(2)}ms
                </div>
                <div class="performance-item">
                    <strong>总帧数:</strong> ${stats.frameCount}
                </div>
            </div>
        </div>
    `;
    
    showModal(performanceInfo);
}

/**
 * 显示通知消息
 */
function showNotification(message, type = 'info', duration = 3000) {
    // 创建通知元素
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = message;
    
    // 添加到页面
    document.body.appendChild(notification);
    
    // 显示动画
    setTimeout(() => notification.classList.add('show'), 10);
    
    // 自动隐藏
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, duration);
}

/**
 * 显示模态框
 */
function showModal(content) {
    // 创建模态框
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-content">
            <button class="modal-close" aria-label="关闭">&times;</button>
            ${content}
        </div>
    `;
    
    // 添加到页面
    document.body.appendChild(modal);
    
    // 绑定关闭事件
    const closeBtn = modal.querySelector('.modal-close');
    const closeModal = () => {
        modal.classList.remove('show');
        setTimeout(() => {
            if (modal.parentNode) {
                modal.parentNode.removeChild(modal);
            }
        }, 300);
    };
    
    closeBtn.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeModal();
        }
    });
    
    // 键盘关闭
    const handleKeydown = (e) => {
        if (e.key === 'Escape') {
            closeModal();
            document.removeEventListener('keydown', handleKeydown);
        }
    };
    document.addEventListener('keydown', handleKeydown);
    
    // 显示动画
    setTimeout(() => modal.classList.add('show'), 10);
}

/**
 * 显示键盘提示
 */
function showKeyboardHint(message, duration = 2000) {
    showNotification(message, 'info', duration);
}

/**
 * 页面卸载时清理资源
 */
window.addEventListener('beforeunload', () => {
    if (gameEngine) {
        gameEngine.destroy();
    }
});

console.log('主游戏脚本加载完成');