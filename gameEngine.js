// GameEngine主控制器 - 整合所有子系统的核心游戏引擎

// 游戏引擎状态常量
const ENGINE_STATES = {
    INITIALIZING: 'initializing',
    READY: 'ready',
    PLAYING: 'playing',
    PAUSED: 'paused',
    GAME_OVER: 'game_over',
    ERROR: 'error'
};

// 游戏引擎配置
const ENGINE_CONFIG = {
    // 游戏循环配置
    TARGET_FPS: 60,
    FRAME_TIME: 1000 / 60, // 16.67ms
    MAX_DELTA_TIME: 100,   // 最大帧时间差
    
    // 连锁反应配置
    CHAIN_DELAY: 500,      // 连锁反应延迟
    ANIMATION_DELAY: 300,  // 动画延迟
    
    // 性能监控
    PERFORMANCE_SAMPLE_SIZE: 60,
    MEMORY_CHECK_INTERVAL: 10000, // 10秒
    
    // 自动保存
    AUTO_SAVE_INTERVAL: 30000, // 30秒
    
    // 调试模式
    DEBUG_MODE: false,
    VERBOSE_LOGGING: false
};

/**
 * GameEngine类 - 游戏主控制器
 * 负责整合所有子系统，管理游戏状态和主循环
 */
class GameEngine {
    constructor(gameContainer) {
        // 核心状态
        this.state = ENGINE_STATES.INITIALIZING;
        this.gameContainer = gameContainer;
        this.isInitialized = false;
        this.isPaused = false;
        this.isProcessing = false;
        
        // 子系统组件
        this.gameGrid = null;
        this.matchDetector = null;
        this.renderer = null;
        this.inputHandler = null;
        this.audioSystem = null;
        this.scoreSystem = null;
        this.storageManager = null;
        
        // 游戏状态数据
        this.gameState = null;
        this.lastUpdateTime = 0;
        this.frameCount = 0;
        this.performanceMetrics = {
            fps: 0,
            frameTime: 0,
            updateTime: 0,
            renderTime: 0
        };
        
        // 游戏循环控制
        this.gameLoopId = null;
        this.lastFrameTime = 0;
        this.deltaTime = 0;
        this.accumulator = 0;
        
        // 事件系统
        this.eventListeners = new Map();
        this.eventQueue = [];
        
        // 自动保存定时器
        this.autoSaveTimer = null;
        
        console.log('GameEngine构造函数完成');
    }

    /**
     * 初始化游戏引擎
     */
    async initialize() {
        try {
            console.log('开始初始化GameEngine...');
            this.state = ENGINE_STATES.INITIALIZING;
            
            // 初始化游戏状态
            this.initializeGameState();
            
            // 初始化子系统
            await this.initializeSubsystems();
            
            // 绑定事件
            this.bindEvents();
            
            // 启动性能监控
            this.startPerformanceMonitoring();
            
            // 标记为已初始化
            this.isInitialized = true;
            this.state = ENGINE_STATES.READY;
            
            // 更新UI按钮状态
            this.updateUIButtons();
            
            console.log('GameEngine初始化完成');
            this.emit('engineInitialized');
            
            return true;
        } catch (error) {
            console.error('GameEngine初始化失败:', error);
            this.state = ENGINE_STATES.ERROR;
            this.emit('engineError', error);
            return false;
        }
    }

    /**
     * 初始化游戏状态
     */
    initializeGameState() {
        this.gameState = createInitialGameState();
        console.log('游戏状态初始化完成');
    }    /**

     * 初始化所有子系统
     */
    async initializeSubsystems() {
        try {
            // 初始化存储管理器
            this.storageManager = createStorageManagerWithFallback();
            console.log('存储管理器初始化完成');
            
            // 加载保存的最高分
            const savedHighScore = this.storageManager.getHighScore();
            
            // 初始化分数系统
            this.scoreSystem = createScoreSystem();
            this.scoreSystem.setHighScore(savedHighScore);
            console.log('分数系统初始化完成');
            
            // 初始化游戏网格
            this.gameGrid = new GameGrid(GAME_CONFIG.GRID_SIZE);
            console.log('游戏网格初始化完成');
            
            // 初始化匹配检测器
            this.matchDetector = new MatchDetector(GAME_CONFIG.MIN_MATCH_LENGTH);
            console.log('匹配检测器初始化完成');
            
            // 初始化音频系统（不立即启动AudioContext）
            this.audioSystem = new AudioSystem();
            console.log('音频系统初始化完成');
            
            // 初始化渲染器
            await this.initializeRenderer();
            
            // 初始化输入处理器
            this.initializeInputHandler();
            
            // 启用自动保存
            this.enableAutoSave();
            
            console.log('所有子系统初始化完成');
        } catch (error) {
            console.error('子系统初始化失败:', error);
            throw error;
        }
    }

    /**
     * 初始化渲染器
     */
    async initializeRenderer() {
        try {
            // 获取DOM元素
            const gameBoard = this.gameContainer.querySelector('.game-board');
            const scoreElements = {
                currentScore: this.gameContainer.querySelector('#current-score'),
                highScore: this.gameContainer.querySelector('#high-score')
            };
            const statusElement = this.gameContainer.querySelector('#game-status');
            
            if (!gameBoard) {
                throw new Error('游戏板元素未找到');
            }
            
            // 创建渲染器
            this.renderer = new Renderer(gameBoard, scoreElements, statusElement);
            this.renderer.initialize();
            
            // 渲染初始状态
            this.renderer.renderGrid(this.gameGrid);
            this.renderer.renderUI(this.gameState);
            
            console.log('渲染器初始化完成');
        } catch (error) {
            console.error('渲染器初始化失败:', error);
            throw error;
        }
    }

    /**
     * 初始化输入处理器
     */
    initializeInputHandler() {
        try {
            const gameBoard = this.gameContainer.querySelector('.game-board');
            
            if (!gameBoard) {
                throw new Error('游戏板元素未找到');
            }
            
            // 创建输入处理器
            this.inputHandler = new InputHandler(gameBoard, this);
            
            console.log('输入处理器初始化完成');
        } catch (error) {
            console.error('输入处理器初始化失败:', error);
            throw error;
        }
    }

    /**
     * 绑定事件监听器
     */
    bindEvents() {
        // 绑定UI控制按钮事件
        this.bindUIEvents();
        
        // 绑定窗口事件
        this.bindWindowEvents();
        
        console.log('事件绑定完成');
    }    /**
  
   * 绑定UI控制按钮事件
     */
    bindUIEvents() {
        // 开始游戏按钮
        const startButton = this.gameContainer.querySelector('#start-btn');
        if (startButton) {
            startButton.addEventListener('click', () => this.startGame());
        }
        
        // 暂停/继续按钮
        const pauseButton = this.gameContainer.querySelector('#pause-btn');
        if (pauseButton) {
            pauseButton.addEventListener('click', () => this.togglePause());
        }
        
        // 重新开始按钮
        const restartButton = this.gameContainer.querySelector('#restart-btn');
        if (restartButton) {
            restartButton.addEventListener('click', () => this.restartGame());
        }
        
        // 音效开关按钮
        const soundButton = this.gameContainer.querySelector('#sound-btn');
        if (soundButton) {
            soundButton.addEventListener('click', () => this.toggleSound());
        }
    }

    /**
     * 绑定窗口事件
     */
    bindWindowEvents() {
        // 页面可见性变化
        document.addEventListener('visibilitychange', () => {
            if (document.hidden && this.state === ENGINE_STATES.PLAYING) {
                this.pauseGame();
            }
        });
        
        // 窗口失去焦点
        window.addEventListener('blur', () => {
            if (this.state === ENGINE_STATES.PLAYING) {
                this.pauseGame();
            }
        });
        
        // 页面卸载前保存
        window.addEventListener('beforeunload', () => {
            this.saveGameState();
        });
    }

    /**
     * 开始游戏
     */
    async startGame() {
        try {
            if (!this.isInitialized) {
                console.warn('游戏引擎未初始化');
                return false;
            }
            
            console.log('开始游戏');
            
            // 在用户交互后启动音频系统
            if (this.audioSystem) {
                await this.audioSystem.resumeContext();
            }
            
            // 重置游戏状态
            this.resetGameState();
            
            // 重新生成网格
            this.gameGrid.initialize();
            
            // 更新游戏状态
            this.gameState.isPlaying = true;
            this.gameState.isPaused = false;
            this.gameState.startTime = Date.now();
            this.state = ENGINE_STATES.PLAYING;
            
            // 启用输入处理
            if (this.inputHandler) {
                this.inputHandler.enable();
            }
            
            // 开始游戏循环
            this.startGameLoop();
            
            // 播放开始音效
            if (this.audioSystem) {
                this.audioSystem.playGameStartSound();
            }
            
            // 渲染初始状态
            this.render();
            
            // 更新UI按钮状态
            this.updateUIButtons();
            
            this.emit('gameStarted');
            return true;
        } catch (error) {
            console.error('开始游戏失败:', error);
            return false;
        }
    }

    /**
     * 暂停游戏
     */
    pauseGame() {
        if (this.state !== ENGINE_STATES.PLAYING) {
            return false;
        }
        
        console.log('暂停游戏');
        
        this.gameState.isPaused = true;
        this.gameState.pauseStartTime = Date.now();
        this.state = ENGINE_STATES.PAUSED;
        
        // 停止游戏循环
        this.stopGameLoop();
        
        // 禁用输入处理
        if (this.inputHandler) {
            this.inputHandler.disable();
        }
        
        // 播放暂停音效
        if (this.audioSystem) {
            this.audioSystem.playPauseSound();
        }
        
        // 更新UI
        this.render();
        this.updateUIButtons();
        
        this.emit('gamePaused');
        return true;
    }

    /**
     * 继续游戏
     */
    resumeGame() {
        if (this.state !== ENGINE_STATES.PAUSED) {
            return false;
        }
        
        console.log('继续游戏');
        
        // 计算暂停时间
        if (this.gameState.pauseStartTime) {
            this.gameState.totalPauseTime += Date.now() - this.gameState.pauseStartTime;
            this.gameState.pauseStartTime = null;
        }
        
        this.gameState.isPaused = false;
        this.state = ENGINE_STATES.PLAYING;
        
        // 启用输入处理
        if (this.inputHandler) {
            this.inputHandler.enable();
        }
        
        // 重新开始游戏循环
        this.startGameLoop();
        
        // 播放继续音效
        if (this.audioSystem) {
            this.audioSystem.playResumeSound();
        }
        
        // 更新UI
        this.render();
        this.updateUIButtons();
        
        this.emit('gameResumed');
        return true;
    }

    /**
     * 切换暂停状态
     */
    togglePause() {
        if (this.state === ENGINE_STATES.PLAYING) {
            return this.pauseGame();
        } else if (this.state === ENGINE_STATES.PAUSED) {
            return this.resumeGame();
        }
        return false;
    }

    /**
     * 重新开始游戏
     */
    restartGame() {
        console.log('重新开始游戏');
        
        // 停止当前游戏
        this.stopGame();
        
        // 播放重新开始音效
        if (this.audioSystem) {
            this.audioSystem.playRestartSound();
        }
        
        // 短暂延迟后开始新游戏
        setTimeout(() => {
            this.startGame();
        }, 300);
        
        this.emit('gameRestarted');
        return true;
    }

    /**
     * 停止游戏
     */
    stopGame() {
        console.log('停止游戏');
        
        // 保存游戏状态
        this.saveGameState();
        
        // 停止游戏循环
        this.stopGameLoop();
        
        // 禁用输入处理
        if (this.inputHandler) {
            this.inputHandler.disable();
            this.inputHandler.clearAll();
        }
        
        // 更新状态
        this.gameState.isPlaying = false;
        this.gameState.isPaused = false;
        this.state = ENGINE_STATES.READY;
        
        // 更新UI
        this.render();
        this.updateUIButtons();
        
        this.emit('gameStopped');
        return true;
    }

    /**
     * 游戏结束
     */
    gameOver(reason = 'unknown') {
        console.log('游戏结束:', reason);
        
        this.gameState.isGameOver = true;
        this.gameState.gameEndReason = reason;
        this.state = ENGINE_STATES.GAME_OVER;
        
        // 停止游戏循环
        this.stopGameLoop();
        
        // 禁用输入处理
        if (this.inputHandler) {
            this.inputHandler.disable();
        }
        
        // 检查是否创造新纪录
        const isNewHighScore = this.scoreSystem.getCurrentScore() > this.scoreSystem.getHighScore();
        if (isNewHighScore) {
            this.storageManager.saveHighScore(this.scoreSystem.getCurrentScore());
        }
        
        // 播放游戏结束音效
        if (this.audioSystem) {
            this.audioSystem.playGameOverSound();
        }
        
        // 显示游戏结束界面
        if (this.renderer) {
            this.renderer.showGameOver(this.scoreSystem.getCurrentScore(), isNewHighScore);
        }
        
        // 更新UI
        this.updateUIButtons();
        
        this.emit('gameOver', { reason, isNewHighScore });
        return true;
    } 
   /**
     * 开始游戏循环
     */
    startGameLoop() {
        if (this.gameLoopId) {
            this.stopGameLoop();
        }
        
        this.lastFrameTime = performance.now();
        this.gameLoopId = requestAnimationFrame(this.gameLoop.bind(this));
        
        console.log('游戏循环已启动');
    }

    /**
     * 停止游戏循环
     */
    stopGameLoop() {
        if (this.gameLoopId) {
            cancelAnimationFrame(this.gameLoopId);
            this.gameLoopId = null;
        }
        
        console.log('游戏循环已停止');
    }

    /**
     * 游戏主循环
     */
    gameLoop(currentTime) {
        if (this.state !== ENGINE_STATES.PLAYING) {
            return;
        }
        
        // 计算时间差
        this.deltaTime = currentTime - this.lastFrameTime;
        this.lastFrameTime = currentTime;
        
        // 限制最大时间差，防止大幅跳跃
        this.deltaTime = Math.min(this.deltaTime, ENGINE_CONFIG.MAX_DELTA_TIME);
        
        // 更新性能指标
        this.updatePerformanceMetrics(this.deltaTime);
        
        try {
            // 游戏逻辑更新
            const updateStartTime = performance.now();
            this.update(this.deltaTime);
            const updateEndTime = performance.now();
            this.performanceMetrics.updateTime = updateEndTime - updateStartTime;
            
            // 渲染
            const renderStartTime = performance.now();
            this.render();
            const renderEndTime = performance.now();
            this.performanceMetrics.renderTime = renderEndTime - renderStartTime;
            
        } catch (error) {
            console.error('游戏循环错误:', error);
            this.gameOver('error');
            return;
        }
        
        // 继续下一帧
        this.gameLoopId = requestAnimationFrame(this.gameLoop.bind(this));
    }

    /**
     * 游戏逻辑更新
     */
    update(deltaTime) {
        if (this.isProcessing) {
            return; // 避免重复处理
        }
        
        // 处理事件队列
        this.processEventQueue();
        
        // 检查游戏结束条件
        this.checkGameOverConditions();
        
        // 更新游戏统计
        this.updateGameStats();
    }

    /**
     * 渲染游戏
     */
    render() {
        if (!this.renderer) {
            return;
        }
        
        try {
            // 渲染游戏网格
            this.renderer.renderGrid(this.gameGrid);
            
            // 渲染UI信息
            this.renderer.renderUI(this.gameState);
            
            // 更新分数显示
            if (this.scoreSystem) {
                updateScoreDisplay(this.scoreSystem, this.renderer);
                
                // 同步gameState中的分数
                this.gameState.score = this.scoreSystem.getCurrentScore();
                this.gameState.highScore = this.scoreSystem.getHighScore();
            }
            
        } catch (error) {
            console.error('渲染失败:', error);
        }
    }

    /**
     * 处理元素交换
     */
    async handleSwap(pos1, pos2) {
        if (this.isProcessing || this.state !== ENGINE_STATES.PLAYING) {
            return false;
        }
        
        try {
            this.isProcessing = true;
            
            console.log('处理交换:', pos1, pos2);
            
            // 尝试交换
            const swapResult = this.gameGrid.trySwap(pos1, pos2);
            
            if (!swapResult.success) {
                console.log('交换无效:', swapResult.reason);
                
                // 播放错误音效
                if (this.audioSystem) {
                    this.audioSystem.playErrorSound();
                }
                
                this.isProcessing = false;
                return false;
            }
            
            // 播放交换音效
            if (this.audioSystem) {
                this.audioSystem.playSwapSound();
            }
            
            // 更新移动计数
            this.gameState.moveCount++;
            this.gameState.lastMoveTime = Date.now();
            
            // 处理连锁反应
            await this.processChainReactions();
            
            this.isProcessing = false;
            return true;
            
        } catch (error) {
            console.error('处理交换失败:', error);
            this.isProcessing = false;
            return false;
        }
    }  
  /**
     * 处理连锁反应
     */
    async processChainReactions() {
        let chainLevel = 0;
        let hasMatches = true;
        
        this.gameState.isProcessingChain = true;
        
        while (hasMatches && chainLevel < 20) { // 防止无限循环
            chainLevel++;
            
            // 检测匹配
            const matchResult = this.matchDetector.findAllMatches(this.gameGrid.getGrid());
            
            if (!matchResult.hasMatches) {
                hasMatches = false;
                break;
            }
            
            console.log(`连锁反应第${chainLevel}级:`, matchResult);
            
            // 计算分数
            const scoreEntry = this.scoreSystem.processMatchScore(
                matchResult.all, 
                chainLevel > 1
            );
            
            // 同步gameState中的分数
            this.gameState.score = this.scoreSystem.getCurrentScore();
            this.gameState.highScore = this.scoreSystem.getHighScore();
            
            // 播放分数动画和音效
            playScoreAnimation(scoreEntry, this.renderer, this.audioSystem);
            
            // 高亮匹配的元素
            if (this.renderer) {
                this.renderer.highlightMatches(matchResult.all);
            }
            
            // 等待动画
            await this.delay(ENGINE_CONFIG.ANIMATION_DELAY);
            
            // 移除匹配的元素
            const allMatchPositions = this.matchDetector.getAllMatchPositions(matchResult.all);
            
            // 播放消除动画
            if (this.renderer) {
                await this.renderer.playRemoveAnimation(allMatchPositions);
            }
            
            // 从网格中移除元素
            this.gameGrid.removeElements(allMatchPositions);
            
            // 应用重力和填充
            const gravityResult = this.gameGrid.processGravityAndFill();
            
            // 播放下落动画
            if (this.renderer && gravityResult.movements.length > 0) {
                await this.renderer.playFallAnimation(gravityResult.movements);
            }
            
            // 播放新元素出现动画
            if (this.renderer && gravityResult.newElements.length > 0) {
                await this.renderer.playAppearAnimation(gravityResult.newElements);
            }
            
            // 更新连锁统计
            this.gameState.chainCount = chainLevel;
            
            // 连锁间隔
            if (hasMatches) {
                await this.delay(ENGINE_CONFIG.CHAIN_DELAY);
            }
        }
        
        // 重置连锁状态
        this.gameState.isProcessingChain = false;
        this.gameState.chainCount = 0;
        
        // 如果没有更多可能的移动，游戏结束
        if (!this.hasPossibleMoves()) {
            this.gameOver('no_moves');
        }
        
        console.log(`连锁反应结束，共${chainLevel}级`);
    }

    /**
     * 检查是否有可能的移动
     */
    hasPossibleMoves() {
        const grid = this.gameGrid.getGrid();
        const size = this.gameGrid.size;
        
        // 检查所有相邻位置的交换可能性
        for (let row = 0; row < size; row++) {
            for (let col = 0; col < size; col++) {
                const adjacentPositions = this.gameGrid.getAdjacentPositions(row, col);
                
                for (const adjPos of adjacentPositions) {
                    if (this.gameGrid.isValidSwap({ row, col }, adjPos)) {
                        return true;
                    }
                }
            }
        }
        
        return false;
    }

    /**
     * 延迟函数
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * 切换音效
     */
    toggleSound() {
        if (!this.audioSystem) {
            return false;
        }
        
        const isMuted = this.audioSystem.toggleMute();
        
        // 更新按钮显示
        const soundButton = this.gameContainer.querySelector('#sound-btn');
        if (soundButton) {
            soundButton.textContent = isMuted ? '🔇' : '🔊';
            soundButton.title = isMuted ? '开启音效' : '关闭音效';
        }
        
        // 播放测试音效（如果开启）
        if (!isMuted) {
            setTimeout(() => {
                this.audioSystem.playVolumeTestSound();
            }, 100);
        }
        
        this.emit('soundToggled', isMuted);
        return !isMuted;
    }

    /**
     * 重置游戏状态
     */
    resetGameState() {
        this.gameState = createInitialGameState();
        
        // 重置分数系统
        if (this.scoreSystem) {
            this.scoreSystem.resetCurrentScore();
            
            // 同步gameState中的分数
            this.gameState.score = this.scoreSystem.getCurrentScore();
            this.gameState.highScore = this.scoreSystem.getHighScore();
        }
        
        // 清除输入选择
        if (this.inputHandler) {
            this.inputHandler.clearAll();
        }
        
        console.log('游戏状态已重置');
    }

    /**
     * 更新UI按钮状态
     */
    updateUIButtons() {
        // 开始按钮
        const startButton = this.gameContainer.querySelector('#start-btn');
        if (startButton) {
            const shouldShowStart = this.state === ENGINE_STATES.READY || this.state === ENGINE_STATES.GAME_OVER;
            startButton.style.display = shouldShowStart ? 'block' : 'none';
            startButton.disabled = !shouldShowStart;
        }
        
        // 暂停按钮
        const pauseButton = this.gameContainer.querySelector('#pause-btn');
        if (pauseButton) {
            const canPause = this.state === ENGINE_STATES.PLAYING || this.state === ENGINE_STATES.PAUSED;
            pauseButton.style.display = canPause ? 'block' : 'none';
            pauseButton.disabled = !canPause;
            pauseButton.textContent = this.state === ENGINE_STATES.PAUSED ? '▶️ 继续' : '⏸️ 暂停';
            pauseButton.title = this.state === ENGINE_STATES.PAUSED ? '继续游戏' : '暂停游戏';
        }
        
        // 重新开始按钮
        const restartButton = this.gameContainer.querySelector('#restart-btn');
        if (restartButton) {
            const canRestart = this.state === ENGINE_STATES.PLAYING || 
                              this.state === ENGINE_STATES.PAUSED || 
                              this.state === ENGINE_STATES.GAME_OVER;
            restartButton.style.display = canRestart ? 'block' : 'none';
            restartButton.disabled = !canRestart;
        }
        
        // 音效按钮
        const soundButton = this.gameContainer.querySelector('#sound-btn');
        if (soundButton && this.audioSystem) {
            const isMuted = this.audioSystem.getMuteStatus();
            soundButton.textContent = isMuted ? '🔇 音效' : '🔊 音效';
            soundButton.title = isMuted ? '开启音效' : '关闭音效';
        }
    }   
 /**
     * 检查游戏结束条件
     */
    checkGameOverConditions() {
        // 这里可以添加其他游戏结束条件
        // 目前主要在连锁反应处理后检查
    }

    /**
     * 更新游戏统计
     */
    updateGameStats() {
        // 更新游戏时间等统计信息
        if (this.gameState.isPlaying && !this.gameState.isPaused) {
            // 可以在这里更新游戏时间等统计
        }
    }

    /**
     * 保存游戏状态
     */
    saveGameState() {
        if (!this.storageManager) {
            return false;
        }
        
        try {
            // 保存最高分
            this.storageManager.saveHighScore(this.scoreSystem.getHighScore());
            
            // 保存游戏状态（如果需要）
            if (this.gameState.isPlaying) {
                this.storageManager.saveGameState(this.gameState);
            }
            
            console.log('游戏状态保存成功');
            return true;
        } catch (error) {
            console.error('保存游戏状态失败:', error);
            return false;
        }
    }

    /**
     * 启用自动保存
     */
    enableAutoSave() {
        if (this.autoSaveTimer) {
            clearInterval(this.autoSaveTimer);
        }
        
        this.autoSaveTimer = setInterval(() => {
            this.saveGameState();
        }, ENGINE_CONFIG.AUTO_SAVE_INTERVAL);
        
        console.log('自动保存已启用');
    }

    /**
     * 禁用自动保存
     */
    disableAutoSave() {
        if (this.autoSaveTimer) {
            clearInterval(this.autoSaveTimer);
            this.autoSaveTimer = null;
        }
        
        console.log('自动保存已禁用');
    }

    // ========== 事件系统 ==========

    /**
     * 添加事件监听器
     */
    on(eventName, callback) {
        if (!this.eventListeners.has(eventName)) {
            this.eventListeners.set(eventName, []);
        }
        
        this.eventListeners.get(eventName).push(callback);
    }

    /**
     * 移除事件监听器
     */
    off(eventName, callback) {
        if (!this.eventListeners.has(eventName)) {
            return;
        }
        
        const listeners = this.eventListeners.get(eventName);
        const index = listeners.indexOf(callback);
        
        if (index > -1) {
            listeners.splice(index, 1);
        }
    }

    /**
     * 触发事件
     */
    emit(eventName, data = null) {
        if (!this.eventListeners.has(eventName)) {
            return;
        }
        
        const listeners = this.eventListeners.get(eventName);
        
        for (const callback of listeners) {
            try {
                callback(data);
            } catch (error) {
                console.error(`事件处理器错误 (${eventName}):`, error);
            }
        }
    }

    /**
     * 添加事件到队列
     */
    queueEvent(eventName, data = null) {
        this.eventQueue.push({ eventName, data, timestamp: Date.now() });
    }

    /**
     * 处理事件队列
     */
    processEventQueue() {
        while (this.eventQueue.length > 0) {
            const event = this.eventQueue.shift();
            this.emit(event.eventName, event.data);
        }
    }  
  // ========== 性能监控 ==========

    /**
     * 启动性能监控
     */
    startPerformanceMonitoring() {
        this.performanceHistory = [];
        this.frameCount = 0;
        
        // 定期检查内存使用
        setInterval(() => {
            this.checkMemoryUsage();
        }, ENGINE_CONFIG.MEMORY_CHECK_INTERVAL);
        
        console.log('性能监控已启动');
    }

    /**
     * 更新性能指标
     */
    updatePerformanceMetrics(deltaTime) {
        this.frameCount++;
        
        // 计算FPS
        this.performanceMetrics.frameTime = deltaTime;
        this.performanceMetrics.fps = 1000 / deltaTime;
        
        // 保存性能历史
        this.performanceHistory.push({
            timestamp: Date.now(),
            fps: this.performanceMetrics.fps,
            frameTime: deltaTime,
            updateTime: this.performanceMetrics.updateTime,
            renderTime: this.performanceMetrics.renderTime
        });
        
        // 限制历史记录数量
        if (this.performanceHistory.length > ENGINE_CONFIG.PERFORMANCE_SAMPLE_SIZE) {
            this.performanceHistory.shift();
        }
        
        // 性能警告
        if (this.performanceMetrics.fps < 30) {
            console.warn('性能警告: FPS过低', this.performanceMetrics.fps);
        }
    }

    /**
     * 检查内存使用
     */
    checkMemoryUsage() {
        if (performance.memory) {
            const memoryInfo = {
                used: performance.memory.usedJSHeapSize,
                total: performance.memory.totalJSHeapSize,
                limit: performance.memory.jsHeapSizeLimit
            };
            
            const usagePercent = (memoryInfo.used / memoryInfo.limit) * 100;
            
            if (usagePercent > 80) {
                console.warn('内存使用率过高:', usagePercent.toFixed(2) + '%');
                this.optimizeMemoryUsage();
            }
        }
    }

    /**
     * 优化内存使用
     */
    optimizeMemoryUsage() {
        // 清理性能历史
        if (this.performanceHistory.length > ENGINE_CONFIG.PERFORMANCE_SAMPLE_SIZE / 2) {
            this.performanceHistory = this.performanceHistory.slice(-ENGINE_CONFIG.PERFORMANCE_SAMPLE_SIZE / 2);
        }
        
        // 清理事件队列
        this.eventQueue = [];
        
        // 优化子系统内存使用
        if (this.renderer && typeof this.renderer.optimizeMemoryUsage === 'function') {
            this.renderer.optimizeMemoryUsage();
        }
        
        if (this.inputHandler && typeof this.inputHandler.optimizeMemoryUsage === 'function') {
            this.inputHandler.optimizeMemoryUsage();
        }
        
        console.log('内存优化完成');
    }

    /**
     * 获取性能统计
     */
    getPerformanceStats() {
        const recent = this.performanceHistory.slice(-30); // 最近30帧
        
        if (recent.length === 0) {
            return this.performanceMetrics;
        }
        
        const avgFps = recent.reduce((sum, frame) => sum + frame.fps, 0) / recent.length;
        const avgFrameTime = recent.reduce((sum, frame) => sum + frame.frameTime, 0) / recent.length;
        const avgUpdateTime = recent.reduce((sum, frame) => sum + frame.updateTime, 0) / recent.length;
        const avgRenderTime = recent.reduce((sum, frame) => sum + frame.renderTime, 0) / recent.length;
        
        return {
            current: this.performanceMetrics,
            average: {
                fps: avgFps,
                frameTime: avgFrameTime,
                updateTime: avgUpdateTime,
                renderTime: avgRenderTime
            },
            frameCount: this.frameCount,
            historySize: this.performanceHistory.length
        };
    }

    // ========== 公共接口和工具方法 ==========

    /**
     * 获取游戏引擎状态
     */
    getStatus() {
        return {
            state: this.state,
            isInitialized: this.isInitialized,
            isPlaying: this.gameState?.isPlaying || false,
            isPaused: this.gameState?.isPaused || false,
            isProcessing: this.isProcessing,
            score: this.scoreSystem?.getCurrentScore() || 0,
            highScore: this.scoreSystem?.getHighScore() || 0,
            moveCount: this.gameState?.moveCount || 0,
            chainLevel: this.gameState?.chainCount || 0,
            performance: this.getPerformanceStats()
        };
    }

    /**
     * 获取游戏统计信息
     */
    getGameStats() {
        return {
            gameState: { ...this.gameState },
            scoreStats: this.scoreSystem?.getScoreStats() || {},
            performanceStats: this.getPerformanceStats(),
            storageUsage: this.storageManager?.getStorageUsage() || {}
        };
    }

    /**
     * 销毁游戏引擎
     */
    destroy() {
        console.log('销毁GameEngine...');
        
        // 停止游戏循环
        this.stopGameLoop();
        
        // 禁用自动保存
        this.disableAutoSave();
        
        // 保存最终状态
        this.saveGameState();
        
        // 销毁子系统
        if (this.inputHandler) {
            this.inputHandler.destroy();
        }
        
        if (this.audioSystem) {
            this.audioSystem.disable();
        }
        
        if (this.renderer) {
            this.renderer.optimizeMemoryUsage();
        }
        
        if (this.storageManager) {
            this.storageManager.destroy();
        }
        
        // 清理事件监听器
        this.eventListeners.clear();
        this.eventQueue = [];
        
        // 重置状态
        this.state = ENGINE_STATES.READY;
        this.isInitialized = false;
        
        console.log('GameEngine销毁完成');
    }
}

// 创建游戏引擎实例的工厂函数
function createGameEngine(gameContainer) {
    if (!gameContainer) {
        throw new Error('游戏容器元素是必需的');
    }
    
    const gameEngine = new GameEngine(gameContainer);
    
    console.log('GameEngine创建完成');
    
    return gameEngine;
}

// 导出GameEngine类和相关功能
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        GameEngine,
        createGameEngine,
        ENGINE_STATES,
        ENGINE_CONFIG
    };
} else {
    // 浏览器环境下，将所有导出暴露到全局作用域
    window.GameEngine = GameEngine;
    window.createGameEngine = createGameEngine;
    window.ENGINE_STATES = ENGINE_STATES;
    window.ENGINE_CONFIG = ENGINE_CONFIG;
}

console.log('GameEngine模块加载完成');