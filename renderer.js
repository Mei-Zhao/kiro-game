// 渲染系统 - 负责游戏的DOM渲染和UI更新

class Renderer {
    constructor(gameBoardElement, scoreElements, statusElement) {
        this.gameBoard = gameBoardElement;
        this.scoreElements = scoreElements;
        this.statusElement = statusElement;
        this.gridSize = GAME_CONFIG.GRID_SIZE;
        this.cells = [];
        this.isInitialized = false;
        
        // 性能优化相关
        this.animationFrameId = null;
        this.pendingUpdates = new Set();
        this.batchUpdateTimer = null;
        this.lastRenderTime = 0;
        this.renderThrottleDelay = 16; // ~60fps
        
        // 防抖和节流函数
        this.debouncedRender = null; // 将在initialize后设置
        this.throttledHighlight = this.throttle(this.highlightCell.bind(this), 50);
        
        // DOM操作批处理
        this.domUpdateQueue = [];
        this.isProcessingDOMUpdates = false;
    }

    // 初始化渲染器
    initialize() {
        this.createGameGrid();
        
        // 设置防抖渲染函数
        this.debouncedRender = this.debounce(this.renderGame.bind(this), 16);
        
        this.isInitialized = true;
    }

    // 渲染游戏（通用渲染方法）
    renderGame(gameGrid = null, gameState = null) {
        if (gameGrid) {
            this.renderGrid(gameGrid);
        }
        if (gameState) {
            this.renderUI(gameState);
        }
    }

    // 创建游戏网格DOM结构
    createGameGrid() {
        // 清空现有内容
        this.gameBoard.innerHTML = '';
        this.cells = [];

        // 创建8x8网格
        for (let row = 0; row < this.gridSize; row++) {
            const rowCells = [];
            for (let col = 0; col < this.gridSize; col++) {
                const cell = this.createGameCell(row, col);
                this.gameBoard.appendChild(cell);
                rowCells.push(cell);
            }
            this.cells.push(rowCells);
        }
    }

    // 创建单个游戏单元格
    createGameCell(row, col) {
        const cell = document.createElement('div');
        cell.className = 'game-cell';
        cell.dataset.row = row;
        cell.dataset.col = col;
        
        // 添加可访问性属性
        cell.setAttribute('role', 'button');
        cell.setAttribute('tabindex', '0');
        cell.setAttribute('aria-label', `游戏单元格 ${row + 1}, ${col + 1}`);
        
        return cell;
    }

    // 渲染游戏网格
    renderGrid(gameGrid) {
        if (!this.isInitialized) {
            this.initialize();
        }

        const grid = gameGrid.getGrid();
        
        for (let row = 0; row < this.gridSize; row++) {
            for (let col = 0; col < this.gridSize; col++) {
                const cell = this.cells[row][col];
                const value = grid[row][col];
                
                if (value && GHOST_TYPES[value]) {
                    cell.textContent = GHOST_TYPES[value];
                    cell.setAttribute('aria-label', 
                        `游戏单元格 ${row + 1}, ${col + 1}: ${this.getGhostTypeName(value)}`);
                } else {
                    cell.textContent = '';
                    cell.setAttribute('aria-label', 
                        `游戏单元格 ${row + 1}, ${col + 1}: 空`);
                }
                
                // 清除所有状态类
                cell.classList.remove('selected', 'highlighted', 'removing', 'falling', 'appearing');
            }
        }
    }

    // 获取小鬼类型的中文名称
    getGhostTypeName(ghostType) {
        const names = {
            'HAPPY': '开心小鬼',
            'SCARY': '恐怖小鬼',
            'COOL': '酷炫小鬼',
            'ANGRY': '愤怒小鬼',
            'SURPRISED': '惊讶小鬼',
            'WINK': '眨眼小鬼'
        };
        return names[ghostType] || '未知小鬼';
    }

    // 渲染分数和UI信息
    renderUI(gameState) {
        // 更新当前分数
        if (this.scoreElements.currentScore) {
            this.scoreElements.currentScore.textContent = gameState.score.toLocaleString();
        }

        // 更新最高分数
        if (this.scoreElements.highScore) {
            this.scoreElements.highScore.textContent = gameState.highScore.toLocaleString();
        }

        // 更新游戏状态提示
        this.updateGameStatus(gameState);
    }

    // 更新游戏状态提示
    updateGameStatus(gameState) {
        if (!this.statusElement) return;

        let statusText = '';
        
        if (!gameState.isPlaying) {
            statusText = '点击"开始游戏"开始你的小鬼消消乐之旅！';
        } else if (gameState.isPaused) {
            statusText = '游戏已暂停，点击"继续"恢复游戏';
        } else if (gameState.isProcessingChain) {
            statusText = `连锁反应中... 连击数: ${gameState.chainCount}`;
        } else {
            statusText = `当前分数: ${gameState.score} | 移动次数: ${gameState.moveCount}`;
        }

        this.statusElement.textContent = statusText;
    }

    // 高亮显示单元格
    highlightCell(row, col, type = 'selected') {
        if (this.isValidPosition(row, col)) {
            const cell = this.cells[row][col];
            cell.classList.remove('selected', 'highlighted');
            cell.classList.add(type);
        }
    }

    // 清除单元格高亮
    clearHighlight(row, col) {
        if (this.isValidPosition(row, col)) {
            const cell = this.cells[row][col];
            cell.classList.remove('selected', 'highlighted');
        }
    }

    // 清除所有高亮
    clearAllHighlights() {
        for (let row = 0; row < this.gridSize; row++) {
            for (let col = 0; col < this.gridSize; col++) {
                this.clearHighlight(row, col);
            }
        }
    }

    // 高亮匹配的元素
    highlightMatches(matches) {
        // 先清除所有高亮
        this.clearAllHighlights();

        // 高亮匹配的位置
        for (const match of matches) {
            for (const pos of match.positions) {
                this.highlightCell(pos.row, pos.col, 'highlighted');
            }
        }
    }

    // 显示可能的移动提示
    showHint(pos1, pos2) {
        this.clearAllHighlights();
        this.highlightCell(pos1.row, pos1.col, 'highlighted');
        this.highlightCell(pos2.row, pos2.col, 'highlighted');
        
        // 3秒后清除提示
        setTimeout(() => {
            this.clearAllHighlights();
        }, 3000);
    }

    // 获取单元格元素
    getCell(row, col) {
        if (this.isValidPosition(row, col)) {
            return this.cells[row][col];
        }
        return null;
    }

    // 验证位置是否有效
    isValidPosition(row, col) {
        return row >= 0 && row < this.gridSize && 
               col >= 0 && col < this.gridSize;
    }

    // 获取单元格的位置信息
    getCellPosition(cellElement) {
        const row = parseInt(cellElement.dataset.row);
        const col = parseInt(cellElement.dataset.col);
        return { row, col };
    }

    // 更新单元格内容
    updateCell(row, col, value) {
        if (this.isValidPosition(row, col)) {
            const cell = this.cells[row][col];
            if (value && GHOST_TYPES[value]) {
                cell.textContent = GHOST_TYPES[value];
                cell.setAttribute('aria-label', 
                    `游戏单元格 ${row + 1}, ${col + 1}: ${this.getGhostTypeName(value)}`);
            } else {
                cell.textContent = '';
                cell.setAttribute('aria-label', 
                    `游戏单元格 ${row + 1}, ${col + 1}: 空`);
            }
        }
    }

    // 批量更新多个单元格
    updateCells(updates) {
        for (const update of updates) {
            this.updateCell(update.row, update.col, update.value);
        }
    }

    // 显示游戏结束界面
    showGameOver(finalScore, isNewHighScore) {
        let message = `游戏结束！\n最终分数: ${finalScore.toLocaleString()}`;
        
        if (isNewHighScore) {
            message += '\n🎉 恭喜！新的最高分记录！';
        }
        
        this.statusElement.innerHTML = message.replace(/\n/g, '<br>');
        
        // 添加游戏结束的视觉效果
        this.gameBoard.classList.add('game-over');
        
        setTimeout(() => {
            this.gameBoard.classList.remove('game-over');
        }, 3000);
    }

    // 显示连锁反应信息
    showChainInfo(chainCount, multiplier, score) {
        const chainText = `连击 x${chainCount}! 倍数: ${multiplier.toFixed(1)}x (+${score})`;
        this.statusElement.textContent = chainText;
    }

    // 显示加载状态
    showLoading(message = '加载中...') {
        this.statusElement.textContent = message;
    }

    // 显示错误信息
    showError(message) {
        this.statusElement.innerHTML = `<span style="color: #e53e3e;">❌ ${message}</span>`;
        
        // 3秒后清除错误信息
        setTimeout(() => {
            this.statusElement.textContent = '';
        }, 3000);
    }

    // 显示成功信息
    showSuccess(message) {
        this.statusElement.innerHTML = `<span style="color: #38a169;">✅ ${message}</span>`;
        
        // 2秒后清除成功信息
        setTimeout(() => {
            this.statusElement.textContent = '';
        }, 2000);
    }

    // 重置渲染器状态
    reset() {
        this.clearAllHighlights();
        this.gameBoard.classList.remove('game-over');
        
        // 清空所有单元格
        for (let row = 0; row < this.gridSize; row++) {
            for (let col = 0; col < this.gridSize; col++) {
                const cell = this.cells[row][col];
                cell.textContent = '';
                cell.className = 'game-cell';
            }
        }
    }

    // 获取所有单元格元素（用于事件绑定）
    getAllCells() {
        const allCells = [];
        for (let row = 0; row < this.gridSize; row++) {
            for (let col = 0; col < this.gridSize; col++) {
                allCells.push(this.cells[row][col]);
            }
        }
        return allCells;
    }

    // 检查渲染器是否已初始化
    isReady() {
        return this.isInitialized && this.cells.length === this.gridSize;
    }

    // 获取渲染统计信息（用于调试）
    getRenderStats() {
        return {
            isInitialized: this.isInitialized,
            gridSize: this.gridSize,
            cellCount: this.cells.length * (this.cells[0]?.length || 0),
            hasGameBoard: !!this.gameBoard,
            hasScoreElements: !!this.scoreElements,
            hasStatusElement: !!this.statusElement,
            pendingUpdates: this.pendingUpdates.size,
            domUpdateQueueLength: this.domUpdateQueue.length,
            lastRenderTime: this.lastRenderTime
        };
    }

    // ========== 性能优化工具函数 ==========

    // 防抖函数 - 防止频繁操作
    debounce(func, delay) {
        let timeoutId;
        return function(...args) {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => func.apply(this, args), delay);
        };
    }

    // 节流函数 - 限制执行频率
    throttle(func, delay) {
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

    // 批量DOM更新 - 减少重排和重绘
    batchDOMUpdate(updateFunction) {
        this.domUpdateQueue.push(updateFunction);
        
        if (!this.isProcessingDOMUpdates) {
            this.processDOMUpdateQueue();
        }
    }

    // 处理DOM更新队列
    processDOMUpdateQueue() {
        if (this.domUpdateQueue.length === 0) {
            this.isProcessingDOMUpdates = false;
            return;
        }

        this.isProcessingDOMUpdates = true;

        // 使用requestAnimationFrame确保在下一帧执行
        requestAnimationFrame(() => {
            // 批量执行所有DOM更新
            const updates = [...this.domUpdateQueue];
            this.domUpdateQueue.length = 0;

            // 使用文档片段减少重排
            const fragment = document.createDocumentFragment();
            let needsReflow = false;

            for (const updateFn of updates) {
                try {
                    const result = updateFn(fragment);
                    if (result === 'reflow') {
                        needsReflow = true;
                    }
                } catch (error) {
                    console.error('DOM更新失败:', error);
                }
            }

            // 如果有需要重排的操作，一次性执行
            if (needsReflow && fragment.children.length > 0) {
                this.gameBoard.appendChild(fragment);
            }

            // 继续处理剩余的更新
            if (this.domUpdateQueue.length > 0) {
                this.processDOMUpdateQueue();
            } else {
                this.isProcessingDOMUpdates = false;
            }
        });
    }

    // 优化的渲染函数 - 使用节流
    optimizedRender() {
        const currentTime = performance.now();
        
        if (currentTime - this.lastRenderTime < this.renderThrottleDelay) {
            // 如果距离上次渲染时间太短，延迟执行
            if (this.animationFrameId) {
                cancelAnimationFrame(this.animationFrameId);
            }
            
            this.animationFrameId = requestAnimationFrame(() => {
                this.renderGame();
                this.lastRenderTime = performance.now();
            });
        } else {
            this.renderGame();
            this.lastRenderTime = currentTime;
        }
    }

    // 批量更新单元格 - 优化版本
    batchUpdateCells(updates) {
        if (!updates || updates.length === 0) return;

        this.batchDOMUpdate(() => {
            // 使用DocumentFragment减少重排
            const cellsToUpdate = [];
            
            for (const update of updates) {
                if (this.isValidPosition(update.row, update.col)) {
                    const cell = this.cells[update.row][update.col];
                    cellsToUpdate.push({
                        cell,
                        value: update.value,
                        row: update.row,
                        col: update.col
                    });
                }
            }

            // 批量更新所有单元格
            for (const { cell, value, row, col } of cellsToUpdate) {
                if (value && GHOST_TYPES[value]) {
                    cell.textContent = GHOST_TYPES[value];
                    cell.setAttribute('aria-label', 
                        `游戏单元格 ${row + 1}, ${col + 1}: ${this.getGhostTypeName(value)}`);
                } else {
                    cell.textContent = '';
                    cell.setAttribute('aria-label', 
                        `游戏单元格 ${row + 1}, ${col + 1}: 空`);
                }
            }
        });
    }

    // 优化的高亮函数
    optimizedHighlight(row, col, type = 'selected') {
        if (!this.isValidPosition(row, col)) return;

        this.batchDOMUpdate(() => {
            const cell = this.cells[row][col];
            
            // 使用classList.toggle减少DOM操作
            cell.classList.remove('selected', 'highlighted');
            if (type) {
                cell.classList.add(type);
            }
        });
    }

    // 批量清除高亮 - 优化版本
    batchClearHighlights(positions = null) {
        this.batchDOMUpdate(() => {
            if (positions) {
                // 只清除指定位置的高亮
                for (const pos of positions) {
                    if (this.isValidPosition(pos.row, pos.col)) {
                        const cell = this.cells[pos.row][pos.col];
                        cell.classList.remove('selected', 'highlighted', 'swap-preview');
                    }
                }
            } else {
                // 清除所有高亮
                for (let row = 0; row < this.gridSize; row++) {
                    for (let col = 0; col < this.gridSize; col++) {
                        const cell = this.cells[row][col];
                        cell.classList.remove('selected', 'highlighted', 'swap-preview');
                    }
                }
            }
        });
    }

    // 性能监控
    startPerformanceMonitoring() {
        this.performanceMetrics = {
            renderCount: 0,
            totalRenderTime: 0,
            averageRenderTime: 0,
            maxRenderTime: 0,
            domUpdateCount: 0,
            animationCount: 0
        };

        // 监控渲染性能
        const originalRender = this.renderGrid.bind(this);
        this.renderGrid = (gameGrid) => {
            const startTime = performance.now();
            const result = originalRender(gameGrid);
            const endTime = performance.now();
            
            const renderTime = endTime - startTime;
            this.performanceMetrics.renderCount++;
            this.performanceMetrics.totalRenderTime += renderTime;
            this.performanceMetrics.averageRenderTime = 
                this.performanceMetrics.totalRenderTime / this.performanceMetrics.renderCount;
            this.performanceMetrics.maxRenderTime = 
                Math.max(this.performanceMetrics.maxRenderTime, renderTime);
            
            // 如果渲染时间过长，发出警告
            if (renderTime > 16) { // 超过一帧的时间
                console.warn(`渲染时间过长: ${renderTime.toFixed(2)}ms`);
            }
            
            return result;
        };
    }

    // 获取性能指标
    getPerformanceMetrics() {
        return {
            ...this.performanceMetrics,
            pendingUpdates: this.pendingUpdates.size,
            domUpdateQueueLength: this.domUpdateQueue.length,
            isProcessingDOMUpdates: this.isProcessingDOMUpdates
        };
    }

    // 优化内存使用
    optimizeMemoryUsage() {
        // 清理未使用的动画帧
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }

        // 清理定时器
        if (this.batchUpdateTimer) {
            clearTimeout(this.batchUpdateTimer);
            this.batchUpdateTimer = null;
        }

        // 清理待处理的更新
        this.pendingUpdates.clear();
        this.domUpdateQueue.length = 0;

        // 强制垃圾回收（如果支持）
        if (window.gc && typeof window.gc === 'function') {
            window.gc();
        }
    }

    // ========== 用户体验增强功能 ==========

    // 显示加载状态
    showLoadingOverlay(message = '加载中...', showProgress = false) {
        // 创建加载遮罩层
        let overlay = document.getElementById('loading-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'loading-overlay';
            overlay.className = 'loading-overlay';
            
            const spinner = document.createElement('div');
            spinner.className = 'loading-spinner';
            
            const text = document.createElement('div');
            text.className = 'loading-text';
            text.textContent = message;
            
            overlay.appendChild(spinner);
            overlay.appendChild(text);
            
            if (showProgress) {
                const progress = document.createElement('div');
                progress.className = 'loading-progress';
                const progressBar = document.createElement('div');
                progressBar.className = 'loading-progress-bar';
                progress.appendChild(progressBar);
                overlay.appendChild(progress);
            }
            
            document.body.appendChild(overlay);
        } else {
            const text = overlay.querySelector('.loading-text');
            if (text) text.textContent = message;
        }
        
        // 显示遮罩层
        setTimeout(() => overlay.classList.add('show'), 10);
        
        return overlay;
    }

    // 隐藏加载状态
    hideLoadingOverlay() {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) {
            overlay.classList.remove('show');
            setTimeout(() => {
                if (overlay.parentNode) {
                    overlay.parentNode.removeChild(overlay);
                }
            }, 300);
        }
    }

    // 更新加载进度
    updateLoadingProgress(percentage) {
        const progressBar = document.querySelector('.loading-progress-bar');
        if (progressBar) {
            progressBar.style.width = `${Math.min(100, Math.max(0, percentage))}%`;
        }
    }

    // 显示操作反馈提示
    showFeedbackToast(message, type = 'info', duration = 3000) {
        // 创建提示元素
        const toast = document.createElement('div');
        toast.className = `feedback-toast ${type}`;
        toast.textContent = message;
        
        // 添加到页面
        document.body.appendChild(toast);
        
        // 显示动画
        setTimeout(() => toast.classList.add('show'), 10);
        
        // 自动隐藏
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }, duration);
        
        return toast;
    }

    // 显示游戏状态指示器
    showGameStateIndicator(state) {
        let indicator = document.querySelector('.game-state-indicator');
        if (!indicator) {
            indicator = document.createElement('div');
            indicator.className = 'game-state-indicator';
            this.gameBoard.style.position = 'relative';
            this.gameBoard.appendChild(indicator);
        }
        
        // 清除所有状态类
        indicator.classList.remove('playing', 'paused', 'game-over', 'loading');
        
        // 添加新状态类和文本
        switch (state) {
            case 'playing':
                indicator.classList.add('playing');
                indicator.textContent = '游戏中';
                break;
            case 'paused':
                indicator.classList.add('paused');
                indicator.textContent = '已暂停';
                break;
            case 'game-over':
                indicator.classList.add('game-over');
                indicator.textContent = '游戏结束';
                break;
            case 'loading':
                indicator.classList.add('loading');
                indicator.textContent = '加载中';
                break;
            default:
                indicator.textContent = '';
        }
    }

    // 隐藏游戏状态指示器
    hideGameStateIndicator() {
        const indicator = document.querySelector('.game-state-indicator');
        if (indicator && indicator.parentNode) {
            indicator.parentNode.removeChild(indicator);
        }
    }

    // 添加过渡动画类
    addTransitionClass(element, className, duration = 500) {
        if (!element) return;
        
        element.classList.add(className);
        
        setTimeout(() => {
            element.classList.remove(className);
        }, duration);
    }

    // 平滑滚动到元素
    smoothScrollToElement(element, offset = 0) {
        if (!element) return;
        
        const elementTop = element.offsetTop - offset;
        
        window.scrollTo({
            top: elementTop,
            behavior: 'smooth'
        });
    }

    // 创建触摸轨迹效果
    createTouchTrail(x, y) {
        const trail = document.createElement('div');
        trail.className = 'touch-trail';
        trail.style.left = (x - 10) + 'px';
        trail.style.top = (y - 10) + 'px';
        
        document.body.appendChild(trail);
        
        // 自动清理
        setTimeout(() => {
            if (trail.parentNode) {
                trail.parentNode.removeChild(trail);
            }
        }, 500);
    }

    // 显示手势提示
    showGestureHint(message, duration = 2000) {
        let hint = document.querySelector('.gesture-hint');
        if (!hint) {
            hint = document.createElement('div');
            hint.className = 'gesture-hint';
            document.body.appendChild(hint);
        }
        
        hint.textContent = message;
        hint.classList.add('show');
        
        setTimeout(() => {
            hint.classList.remove('show');
        }, duration);
    }

    // 显示触摸辅助线
    showTouchGuideLine(direction, position) {
        const line = document.createElement('div');
        line.className = `touch-guide-line ${direction}`;
        
        if (direction === 'horizontal') {
            line.style.top = position.y + 'px';
        } else {
            line.style.left = position.x + 'px';
        }
        
        this.gameBoard.appendChild(line);
        
        setTimeout(() => line.classList.add('show'), 10);
        
        // 自动清理
        setTimeout(() => {
            line.classList.remove('show');
            setTimeout(() => {
                if (line.parentNode) {
                    line.parentNode.removeChild(line);
                }
            }, 200);
        }, 1000);
    }

    // 增强的错误显示
    showEnhancedError(message, details = null, actions = []) {
        const errorContainer = document.createElement('div');
        errorContainer.className = 'enhanced-error-container';
        errorContainer.innerHTML = `
            <div class="error-icon">❌</div>
            <div class="error-message">${message}</div>
            ${details ? `<div class="error-details">${details}</div>` : ''}
            ${actions.length > 0 ? `
                <div class="error-actions">
                    ${actions.map(action => `
                        <button class="error-action-btn" data-action="${action.id}">
                            ${action.text}
                        </button>
                    `).join('')}
                </div>
            ` : ''}
        `;
        
        // 添加样式
        errorContainer.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: white;
            border-radius: 12px;
            padding: 24px;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
            z-index: 10000;
            max-width: 400px;
            width: 90%;
            text-align: center;
        `;
        
        document.body.appendChild(errorContainer);
        
        // 绑定操作按钮事件
        actions.forEach(action => {
            const btn = errorContainer.querySelector(`[data-action="${action.id}"]`);
            if (btn) {
                btn.addEventListener('click', () => {
                    action.handler();
                    if (errorContainer.parentNode) {
                        errorContainer.parentNode.removeChild(errorContainer);
                    }
                });
            }
        });
        
        // 自动关闭
        setTimeout(() => {
            if (errorContainer.parentNode) {
                errorContainer.parentNode.removeChild(errorContainer);
            }
        }, 10000);
        
        return errorContainer;
    }

    // 显示成功动画
    showSuccessAnimation(element, message = '成功！') {
        if (!element) return;
        
        // 创建成功图标
        const successIcon = document.createElement('div');
        successIcon.innerHTML = '✅';
        successIcon.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            font-size: 2rem;
            z-index: 1000;
            animation: successPop 0.6s ease-out;
        `;
        
        // 添加动画样式
        if (!document.getElementById('success-animation-styles')) {
            const style = document.createElement('style');
            style.id = 'success-animation-styles';
            style.textContent = `
                @keyframes successPop {
                    0% { opacity: 0; transform: translate(-50%, -50%) scale(0.5); }
                    50% { opacity: 1; transform: translate(-50%, -50%) scale(1.2); }
                    100% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
                }
            `;
            document.head.appendChild(style);
        }
        
        element.style.position = 'relative';
        element.appendChild(successIcon);
        
        // 显示消息
        this.showFeedbackToast(message, 'success', 2000);
        
        // 清理
        setTimeout(() => {
            if (successIcon.parentNode) {
                successIcon.parentNode.removeChild(successIcon);
            }
        }, 600);
    }

    // ========== 动画效果系统 ==========

    // 播放元素消除动画
    playRemoveAnimation(positions, callback) {
        if (!positions || positions.length === 0) {
            if (callback) callback();
            return Promise.resolve();
        }

        const animationPromises = [];

        for (const pos of positions) {
            if (this.isValidPosition(pos.row, pos.col)) {
                const cell = this.cells[pos.row][pos.col];
                const promise = this.animateRemove(cell);
                animationPromises.push(promise);
            }
        }

        return Promise.all(animationPromises).then(() => {
            if (callback) callback();
        });
    }

    // 单个元素消除动画
    animateRemove(cellElement) {
        return new Promise((resolve) => {
            cellElement.classList.add('removing');
            
            // 添加粒子效果
            this.createParticleEffect(cellElement);
            
            setTimeout(() => {
                cellElement.classList.remove('removing');
                cellElement.textContent = '';
                resolve();
            }, GAME_CONFIG.ANIMATION_DURATION);
        });
    }

    // 创建粒子效果
    createParticleEffect(cellElement) {
        const rect = cellElement.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        // 创建多个粒子
        for (let i = 0; i < 6; i++) {
            const particle = document.createElement('div');
            particle.className = 'particle';
            particle.textContent = '✨';
            
            // 设置粒子样式
            particle.style.position = 'fixed';
            particle.style.left = centerX + 'px';
            particle.style.top = centerY + 'px';
            particle.style.fontSize = '12px';
            particle.style.pointerEvents = 'none';
            particle.style.zIndex = '1000';
            particle.style.animation = `particleFloat${i} 0.6s ease-out forwards`;
            
            document.body.appendChild(particle);
            
            // 清理粒子
            setTimeout(() => {
                if (particle.parentNode) {
                    particle.parentNode.removeChild(particle);
                }
            }, 600);
        }
    }

    // 播放元素下落动画
    playFallAnimation(movements, callback) {
        if (!movements || movements.length === 0) {
            if (callback) callback();
            return Promise.resolve();
        }

        const animationPromises = [];

        for (const movement of movements) {
            const promise = this.animateFall(movement);
            animationPromises.push(promise);
        }

        return Promise.all(animationPromises).then(() => {
            if (callback) callback();
        });
    }

    // 单个元素下落动画
    animateFall(movement) {
        return new Promise((resolve) => {
            const fromCell = this.cells[movement.from.row][movement.from.col];
            const toCell = this.cells[movement.to.row][movement.to.col];
            
            // 设置目标位置的内容
            toCell.textContent = GHOST_TYPES[movement.value] || '';
            toCell.classList.add('falling');
            
            // 清空原位置
            fromCell.textContent = '';
            
            setTimeout(() => {
                toCell.classList.remove('falling');
                resolve();
            }, GAME_CONFIG.ANIMATION_DURATION + 100);
        });
    }

    // 播放新元素出现动画
    playAppearAnimation(newElements, callback) {
        if (!newElements || newElements.length === 0) {
            if (callback) callback();
            return Promise.resolve();
        }

        const animationPromises = [];

        for (const element of newElements) {
            const promise = this.animateAppear(element);
            animationPromises.push(promise);
        }

        return Promise.all(animationPromises).then(() => {
            if (callback) callback();
        });
    }

    // 单个元素出现动画
    animateAppear(element) {
        return new Promise((resolve) => {
            const cell = this.cells[element.position.row][element.position.col];
            
            // 设置内容
            cell.textContent = GHOST_TYPES[element.value] || '';
            cell.classList.add('appearing');
            
            setTimeout(() => {
                cell.classList.remove('appearing');
                resolve();
            }, GAME_CONFIG.ANIMATION_DURATION);
        });
    }

    // 播放连锁反应特殊动画
    playChainAnimation(chainCount, callback) {
        return new Promise((resolve) => {
            // 创建连锁反应文字效果
            const chainText = document.createElement('div');
            chainText.className = 'chain-effect';
            chainText.textContent = `连击 x${chainCount}!`;
            
            // 设置样式
            chainText.style.position = 'absolute';
            chainText.style.top = '50%';
            chainText.style.left = '50%';
            chainText.style.transform = 'translate(-50%, -50%)';
            chainText.style.fontSize = '2rem';
            chainText.style.fontWeight = 'bold';
            chainText.style.color = '#ff6b6b';
            chainText.style.textShadow = '2px 2px 4px rgba(0,0,0,0.3)';
            chainText.style.animation = 'chainPulse 1s ease-out forwards';
            chainText.style.pointerEvents = 'none';
            chainText.style.zIndex = '1000';
            
            // 添加到游戏板容器
            this.gameBoard.style.position = 'relative';
            this.gameBoard.appendChild(chainText);
            
            // 播放屏幕震动效果
            this.playScreenShake();
            
            setTimeout(() => {
                if (chainText.parentNode) {
                    chainText.parentNode.removeChild(chainText);
                }
                if (callback) callback();
                resolve();
            }, 1000);
        });
    }

    // 播放屏幕震动效果
    playScreenShake() {
        this.gameBoard.classList.add('screen-shake');
        
        setTimeout(() => {
            this.gameBoard.classList.remove('screen-shake');
        }, 500);
    }

    // 播放游戏开始入场动画
    playGameStartAnimation(callback) {
        return new Promise((resolve) => {
            // 隐藏所有单元格
            for (let row = 0; row < this.gridSize; row++) {
                for (let col = 0; col < this.gridSize; col++) {
                    const cell = this.cells[row][col];
                    cell.style.opacity = '0';
                    cell.style.transform = 'scale(0.5)';
                }
            }

            // 逐个显示单元格
            let delay = 0;
            const promises = [];

            for (let row = 0; row < this.gridSize; row++) {
                for (let col = 0; col < this.gridSize; col++) {
                    const cell = this.cells[row][col];
                    const promise = new Promise((cellResolve) => {
                        setTimeout(() => {
                            cell.style.transition = 'all 0.3s ease-out';
                            cell.style.opacity = '1';
                            cell.style.transform = 'scale(1)';
                            
                            setTimeout(() => {
                                cell.style.transition = '';
                                cellResolve();
                            }, 300);
                        }, delay);
                    });
                    
                    promises.push(promise);
                    delay += 20; // 每个单元格延迟20ms
                }
            }

            Promise.all(promises).then(() => {
                if (callback) callback();
                resolve();
            });
        });
    }

    // 播放分数增加动画
    playScoreAnimation(scoreIncrease, targetElement) {
        if (!targetElement || !scoreIncrease) return;

        // 创建分数增加文字
        const scoreText = document.createElement('div');
        scoreText.className = 'score-increase';
        scoreText.textContent = `+${scoreIncrease}`;
        
        // 设置样式
        scoreText.style.position = 'absolute';
        scoreText.style.color = '#48bb78';
        scoreText.style.fontSize = '1.2rem';
        scoreText.style.fontWeight = 'bold';
        scoreText.style.pointerEvents = 'none';
        scoreText.style.animation = 'scoreFloat 1s ease-out forwards';
        scoreText.style.zIndex = '999';
        
        // 获取目标元素位置
        const rect = targetElement.getBoundingClientRect();
        scoreText.style.left = rect.right + 10 + 'px';
        scoreText.style.top = rect.top + 'px';
        
        document.body.appendChild(scoreText);
        
        // 清理元素
        setTimeout(() => {
            if (scoreText.parentNode) {
                scoreText.parentNode.removeChild(scoreText);
            }
        }, 1000);
    }

    // 播放交换动画
    playSwapAnimation(pos1, pos2, callback) {
        return new Promise((resolve) => {
            const cell1 = this.cells[pos1.row][pos1.col];
            const cell2 = this.cells[pos2.row][pos2.col];
            
            // 添加交换动画类
            cell1.classList.add('swapping');
            cell2.classList.add('swapping');
            
            // 交换内容
            const temp = cell1.textContent;
            cell1.textContent = cell2.textContent;
            cell2.textContent = temp;
            
            setTimeout(() => {
                cell1.classList.remove('swapping');
                cell2.classList.remove('swapping');
                if (callback) callback();
                resolve();
            }, GAME_CONFIG.ANIMATION_DURATION);
        });
    }

    // 播放无效移动动画
    playInvalidMoveAnimation(pos1, pos2) {
        const cell1 = this.cells[pos1.row][pos1.col];
        const cell2 = this.cells[pos2.row][pos2.col];
        
        // 添加摇摆动画
        cell1.classList.add('invalid-move');
        cell2.classList.add('invalid-move');
        
        setTimeout(() => {
            cell1.classList.remove('invalid-move');
            cell2.classList.remove('invalid-move');
        }, 600);
    }

    // 播放提示动画
    playHintAnimation(positions) {
        for (const pos of positions) {
            if (this.isValidPosition(pos.row, pos.col)) {
                const cell = this.cells[pos.row][pos.col];
                cell.classList.add('hint-pulse');
                
                setTimeout(() => {
                    cell.classList.remove('hint-pulse');
                }, 2000);
            }
        }
    }

    // 停止所有动画
    stopAllAnimations() {
        for (let row = 0; row < this.gridSize; row++) {
            for (let col = 0; col < this.gridSize; col++) {
                const cell = this.cells[row][col];
                cell.classList.remove(
                    'removing', 'falling', 'appearing', 'swapping', 
                    'invalid-move', 'hint-pulse'
                );
                cell.style.transition = '';
                cell.style.opacity = '';
                cell.style.transform = '';
            }
        }
        
        // 清除游戏板动画
        this.gameBoard.classList.remove('screen-shake');
        
        // 清除所有粒子和特效元素
        const particles = document.querySelectorAll('.particle, .chain-effect, .score-increase');
        particles.forEach(particle => {
            if (particle.parentNode) {
                particle.parentNode.removeChild(particle);
            }
        });
    }
}

// 渲染器工厂函数
function createRenderer() {
    // 获取DOM元素
    const gameBoardElement = document.getElementById('game-board');
    const scoreElements = {
        currentScore: document.getElementById('current-score'),
        highScore: document.getElementById('high-score')
    };
    const statusElement = document.getElementById('game-status');

    // 验证必要的DOM元素是否存在
    if (!gameBoardElement) {
        throw new Error('Game board element not found');
    }

    if (!statusElement) {
        throw new Error('Game status element not found');
    }

    // 创建并返回渲染器实例
    return new Renderer(gameBoardElement, scoreElements, statusElement);
}

// 导出渲染器类和工厂函数
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Renderer, createRenderer };
} else {
    // 浏览器环境 - 将所有导出暴露到全局作用域
    window.Renderer = Renderer;
    window.createRenderer = createRenderer;
}