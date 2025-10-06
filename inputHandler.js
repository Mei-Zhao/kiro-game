// 输入处理系统 - 统一处理鼠标和触摸输入

class InputHandler {
    constructor(gameBoard, gameEngine) {
        this.gameBoard = gameBoard;
        this.gameEngine = gameEngine;
        this.selectedCell = null;
        this.isDragging = false;
        this.dragStartPosition = null;
        this.dragCurrentPosition = null;
        this.isEnabled = true;
        
        // 触摸相关状态
        this.touchStartTime = 0;
        this.touchMoveThreshold = 10; // 像素
        this.tapTimeout = 300; // 毫秒
        this.doubleTapTimeout = 500; // 双击超时
        this.lastTapTime = 0;
        this.lastTapPosition = null;
        this.preventAccidentalTouch = true;
        this.touchStartPosition = null;
        
        // 性能优化相关
        this.eventThrottleDelay = 16; // ~60fps
        this.lastEventTime = 0;
        this.pendingEvents = new Map();
        this.eventBatchTimer = null;
        
        // 绑定事件处理函数的上下文
        this.handleMouseDown = this.handleMouseDown.bind(this);
        this.handleMouseMove = this.throttleEvent(this.handleMouseMove.bind(this), this.eventThrottleDelay);
        this.handleMouseUp = this.handleMouseUp.bind(this);
        this.handleTouchStart = this.handleTouchStart.bind(this);
        this.handleTouchMove = this.throttleEvent(this.handleTouchMove.bind(this), this.eventThrottleDelay);
        this.handleTouchEnd = this.handleTouchEnd.bind(this);
        this.handleCellClick = this.debounceEvent(this.handleCellClick.bind(this), 100);
        this.handleCellMouseEnter = this.throttleEvent(this.handleCellMouseEnter.bind(this), 50);
        this.handleCellMouseLeave = this.throttleEvent(this.handleCellMouseLeave.bind(this), 50);
        
        this.initialize();
    }

    // 初始化输入处理器
    initialize() {
        this.bindEvents();
        console.log('输入处理器初始化完成');
    }

    // 绑定所有事件监听器
    bindEvents() {
        if (!this.gameBoard) {
            console.error('游戏板元素未找到');
            return;
        }

        // 鼠标事件
        this.gameBoard.addEventListener('mousedown', this.handleMouseDown);
        document.addEventListener('mousemove', this.handleMouseMove);
        document.addEventListener('mouseup', this.handleMouseUp);

        // 触摸事件
        this.gameBoard.addEventListener('touchstart', this.handleTouchStart, { passive: false });
        this.gameBoard.addEventListener('touchmove', this.handleTouchMove, { passive: false });
        this.gameBoard.addEventListener('touchend', this.handleTouchEnd, { passive: false });

        // 单元格特定事件
        this.bindCellEvents();

        // 防止上下文菜单
        this.gameBoard.addEventListener('contextmenu', (e) => e.preventDefault());
    }

    // 绑定单元格事件
    bindCellEvents() {
        const cells = this.gameBoard.querySelectorAll('.game-cell');
        
        cells.forEach(cell => {
            // 点击事件
            cell.addEventListener('click', this.handleCellClick);
            
            // 鼠标悬停事件
            cell.addEventListener('mouseenter', this.handleCellMouseEnter);
            cell.addEventListener('mouseleave', this.handleCellMouseLeave);
            
            // 键盘事件（可访问性）
            cell.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    this.handleCellClick(e);
                }
            });
        });
    }

    // ========== 鼠标事件处理 ==========

    // 鼠标按下事件
    handleMouseDown(event) {
        if (!this.isEnabled || event.button !== 0) return; // 只处理左键

        const cell = event.target.closest('.game-cell');
        if (!cell) return;

        event.preventDefault();
        
        const position = this.getCellPosition(cell);
        if (!position) return;

        this.dragStartPosition = position;
        this.isDragging = true;
        
        // 选择单元格
        this.selectCell(position);
        
        console.log('鼠标拖拽开始:', position);
    }

    // 鼠标移动事件
    handleMouseMove(event) {
        if (!this.isEnabled || !this.isDragging || !this.dragStartPosition) return;

        const elementUnderMouse = document.elementFromPoint(event.clientX, event.clientY);
        const cell = elementUnderMouse?.closest('.game-cell');
        
        if (!cell) return;

        const position = this.getCellPosition(cell);
        if (!position) return;

        // 检查是否移动到了不同的单元格
        if (!this.dragCurrentPosition || 
            this.dragCurrentPosition.row !== position.row || 
            this.dragCurrentPosition.col !== position.col) {
            
            this.dragCurrentPosition = position;
            
            // 检查是否是相邻单元格
            if (this.arePositionsAdjacent(this.dragStartPosition, position)) {
                this.highlightSwapPreview(this.dragStartPosition, position);
            } else {
                this.clearSwapPreview();
            }
        }
    }

    // 鼠标释放事件
    handleMouseUp(event) {
        if (!this.isEnabled || !this.isDragging) return;

        event.preventDefault();

        if (this.dragStartPosition && this.dragCurrentPosition) {
            // 检查是否是有效的交换
            if (this.arePositionsAdjacent(this.dragStartPosition, this.dragCurrentPosition)) {
                this.attemptSwap(this.dragStartPosition, this.dragCurrentPosition);
            }
        }

        this.resetDragState();
        console.log('鼠标拖拽结束');
    }

    // 单元格点击事件
    handleCellClick(event) {
        if (!this.isEnabled) return;

        const cell = event.target.closest('.game-cell');
        if (!cell) return;

        const position = this.getCellPosition(cell);
        if (!position) return;

        // 如果已经有选中的单元格
        if (this.selectedCell) {
            if (this.isSamePosition(this.selectedCell, position)) {
                // 点击同一个单元格，取消选择
                this.deselectCell();
            } else if (this.arePositionsAdjacent(this.selectedCell, position)) {
                // 点击相邻单元格，尝试交换
                this.attemptSwap(this.selectedCell, position);
                this.deselectCell();
            } else {
                // 点击非相邻单元格，选择新单元格
                this.selectCell(position);
            }
        } else {
            // 没有选中的单元格，选择当前单元格
            this.selectCell(position);
        }

        console.log('单元格点击:', position);
    }

    // 鼠标进入单元格
    handleCellMouseEnter(event) {
        if (!this.isEnabled) return;

        const cell = event.target.closest('.game-cell');
        if (!cell) return;

        // 添加悬停效果
        cell.classList.add('hover');
        
        // 如果有选中的单元格，检查是否可以交换
        if (this.selectedCell) {
            const position = this.getCellPosition(cell);
            if (position && this.arePositionsAdjacent(this.selectedCell, position)) {
                cell.classList.add('swap-preview');
            }
        }
    }

    // 鼠标离开单元格
    handleCellMouseLeave(event) {
        const cell = event.target.closest('.game-cell');
        if (!cell) return;

        // 移除悬停效果
        cell.classList.remove('hover', 'swap-preview');
    }

    // ========== 触摸事件处理 ==========

    // 触摸开始事件
    handleTouchStart(event) {
        if (!this.isEnabled) return;

        // 防止默认行为和事件冒泡
        event.preventDefault();
        event.stopPropagation();

        // 检查多点触摸
        if (this.handleMultiTouch(event)) return;

        const touch = event.touches[0];
        if (!touch) return;

        // 记录触摸开始位置（用于防误触）
        this.touchStartPosition = {
            x: touch.clientX,
            y: touch.clientY
        };

        const cell = document.elementFromPoint(touch.clientX, touch.clientY)?.closest('.game-cell');
        if (!cell) return;

        const position = this.getCellPosition(cell);
        if (!position) return;

        this.touchStartTime = Date.now();
        this.dragStartPosition = position;
        this.isDragging = true;
        
        // 检查双击
        if (this.isDoubleTap(position)) {
            this.handleDoubleTap(position);
            return;
        }
        
        // 选择单元格
        this.selectCell(position);
        
        // 触觉反馈
        this.provideTactileFeedback('light');
        
        console.log('触摸拖拽开始:', position);
    }

    // 触摸移动事件
    handleTouchMove(event) {
        if (!this.isEnabled || !this.isDragging || !this.dragStartPosition) return;

        event.preventDefault();
        event.stopPropagation();

        // 检查多点触摸
        if (this.handleMultiTouch(event)) return;

        const touch = event.touches[0];
        if (!touch) return;

        // 防误触检查：检查移动距离是否超过阈值
        if (this.preventAccidentalTouch && this.touchStartPosition) {
            const moveDistance = Math.sqrt(
                Math.pow(touch.clientX - this.touchStartPosition.x, 2) + 
                Math.pow(touch.clientY - this.touchStartPosition.y, 2)
            );
            
            if (moveDistance < this.touchMoveThreshold) return;
        }

        const cell = document.elementFromPoint(touch.clientX, touch.clientY)?.closest('.game-cell');
        if (!cell) {
            // 触摸移出游戏区域，清除预览
            this.clearSwapPreview();
            return;
        }

        const position = this.getCellPosition(cell);
        if (!position) return;

        // 检查是否移动到了不同的单元格
        if (!this.dragCurrentPosition || 
            this.dragCurrentPosition.row !== position.row || 
            this.dragCurrentPosition.col !== position.col) {
            
            this.dragCurrentPosition = position;
            
            // 检查是否是相邻单元格
            if (this.arePositionsAdjacent(this.dragStartPosition, position)) {
                this.highlightSwapPreview(this.dragStartPosition, position);
                
                // 触觉反馈
                this.provideTactileFeedback('medium');
            } else {
                this.clearSwapPreview();
            }
        }
    }

    // 触摸结束事件
    handleTouchEnd(event) {
        if (!this.isEnabled) return;

        event.preventDefault();
        event.stopPropagation();

        const touchDuration = Date.now() - this.touchStartTime;
        const currentTime = Date.now();

        // 防误触检查：检查触摸时间是否太短
        if (this.preventAccidentalTouch && touchDuration < 50) {
            console.log('触摸时间太短，可能是误触');
            this.resetDragState();
            return;
        }

        if (this.dragStartPosition && this.dragCurrentPosition) {
            // 检查是否是有效的交换
            if (this.arePositionsAdjacent(this.dragStartPosition, this.dragCurrentPosition)) {
                this.attemptSwap(this.dragStartPosition, this.dragCurrentPosition);
                this.provideTactileFeedback('heavy');
            } else {
                // 无效交换，提供错误反馈
                this.provideTactileFeedback('error');
            }
        } else if (touchDuration < this.tapTimeout && this.dragStartPosition) {
            // 短触摸，当作点击处理
            this.handleTapGesture(this.dragStartPosition);
            
            // 记录点击信息用于双击检测
            this.lastTapTime = currentTime;
            this.lastTapPosition = this.dragStartPosition;
        }

        this.resetDragState();
        console.log('触摸拖拽结束');
    }

    // 处理点击手势
    handleTapGesture(position) {
        // 如果已经有选中的单元格
        if (this.selectedCell) {
            if (this.isSamePosition(this.selectedCell, position)) {
                // 点击同一个单元格，取消选择
                this.deselectCell();
            } else if (this.arePositionsAdjacent(this.selectedCell, position)) {
                // 点击相邻单元格，尝试交换
                this.attemptSwap(this.selectedCell, position);
                this.deselectCell();
            } else {
                // 点击非相邻单元格，选择新单元格
                this.selectCell(position);
            }
        } else {
            // 没有选中的单元格，选择当前单元格
            this.selectCell(position);
        }
    }

    // ========== 辅助方法 ==========

    // 获取单元格位置
    getCellPosition(cellElement) {
        if (!cellElement || !cellElement.dataset) return null;
        
        const row = parseInt(cellElement.dataset.row);
        const col = parseInt(cellElement.dataset.col);
        
        if (isNaN(row) || isNaN(col)) return null;
        
        return { row, col };
    }

    // 获取单元格元素
    getCellElement(position) {
        return this.gameBoard.querySelector(`[data-row="${position.row}"][data-col="${position.col}"]`);
    }

    // 检查两个位置是否相邻
    arePositionsAdjacent(pos1, pos2) {
        if (!pos1 || !pos2) return false;
        
        const rowDiff = Math.abs(pos1.row - pos2.row);
        const colDiff = Math.abs(pos1.col - pos2.col);
        
        return (rowDiff === 1 && colDiff === 0) || (rowDiff === 0 && colDiff === 1);
    }

    // 检查两个位置是否相同
    isSamePosition(pos1, pos2) {
        if (!pos1 || !pos2) return false;
        return pos1.row === pos2.row && pos1.col === pos2.col;
    }

    // 选择单元格
    selectCell(position) {
        // 清除之前的选择
        this.deselectCell();
        
        this.selectedCell = position;
        const cell = this.getCellElement(position);
        
        if (cell) {
            cell.classList.add('selected');
            cell.setAttribute('aria-selected', 'true');
        }
        
        // 提供视觉反馈
        this.provideVisualFeedback(position, 'select');
        
        console.log('选择单元格:', position);
    }

    // 取消选择单元格
    deselectCell() {
        if (this.selectedCell) {
            const cell = this.getCellElement(this.selectedCell);
            if (cell) {
                cell.classList.remove('selected');
                cell.setAttribute('aria-selected', 'false');
            }
            this.selectedCell = null;
        }
        
        this.clearSwapPreview();
    }

    // 高亮交换预览
    highlightSwapPreview(pos1, pos2) {
        this.clearSwapPreview();
        
        const cell1 = this.getCellElement(pos1);
        const cell2 = this.getCellElement(pos2);
        
        if (cell1) cell1.classList.add('swap-preview');
        if (cell2) cell2.classList.add('swap-preview');
    }

    // 清除交换预览
    clearSwapPreview() {
        const previewCells = this.gameBoard.querySelectorAll('.swap-preview');
        previewCells.forEach(cell => {
            cell.classList.remove('swap-preview');
        });
    }

    // 尝试交换元素
    attemptSwap(pos1, pos2) {
        if (!this.gameEngine) {
            console.error('游戏引擎未初始化');
            return;
        }

        console.log('尝试交换:', pos1, pos2);
        
        // 调用游戏引擎的交换方法
        if (typeof this.gameEngine.handleSwap === 'function') {
            this.gameEngine.handleSwap(pos1, pos2);
        } else {
            console.warn('游戏引擎不支持交换操作');
        }
        
        this.clearSwapPreview();
    }

    // 重置拖拽状态
    resetDragState() {
        this.isDragging = false;
        this.dragStartPosition = null;
        this.dragCurrentPosition = null;
        this.touchStartTime = 0;
        this.touchStartPosition = null;
        this.clearSwapPreview();
    }

    // ========== 触摸特定功能 ==========

    // 检查是否是双击
    isDoubleTap(position) {
        const currentTime = Date.now();
        
        if (this.lastTapTime && this.lastTapPosition &&
            currentTime - this.lastTapTime < this.doubleTapTimeout &&
            this.isSamePosition(this.lastTapPosition, position)) {
            return true;
        }
        
        return false;
    }

    // 处理双击手势
    handleDoubleTap(position) {
        console.log('双击检测:', position);
        
        // 双击可以用于特殊功能，比如提示或快速选择
        // 目前只是取消选择
        this.deselectCell();
        
        // 提供触觉反馈
        this.provideTactileFeedback('heavy');
        
        // 重置双击状态
        this.lastTapTime = 0;
        this.lastTapPosition = null;
    }

    // 提供触觉反馈
    provideTactileFeedback(type = 'light') {
        if (!navigator.vibrate) return;

        switch (type) {
            case 'light':
                navigator.vibrate(20);
                break;
            case 'medium':
                navigator.vibrate(50);
                break;
            case 'heavy':
                navigator.vibrate([100, 50, 100]);
                break;
            case 'error':
                navigator.vibrate([50, 50, 50, 50, 50]);
                break;
            case 'success':
                navigator.vibrate([30, 30, 30]);
                break;
            default:
                navigator.vibrate(20);
        }
    }

    // 设置防误触敏感度
    setTouchSensitivity(sensitivity) {
        switch (sensitivity) {
            case 'low':
                this.touchMoveThreshold = 20;
                this.tapTimeout = 500;
                this.preventAccidentalTouch = true;
                break;
            case 'medium':
                this.touchMoveThreshold = 10;
                this.tapTimeout = 300;
                this.preventAccidentalTouch = true;
                break;
            case 'high':
                this.touchMoveThreshold = 5;
                this.tapTimeout = 200;
                this.preventAccidentalTouch = false;
                break;
            default:
                this.touchMoveThreshold = 10;
                this.tapTimeout = 300;
                this.preventAccidentalTouch = true;
        }
        
        console.log(`触摸敏感度设置为: ${sensitivity}`);
    }

    // 检测触摸设备
    isTouchDevice() {
        return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    }

    // 获取触摸点数量
    getTouchCount(event) {
        return event.touches ? event.touches.length : 0;
    }

    // 处理多点触摸（防止意外操作）
    handleMultiTouch(event) {
        if (this.getTouchCount(event) > 1) {
            // 多点触摸时取消当前操作
            this.resetDragState();
            this.deselectCell();
            console.log('检测到多点触摸，取消当前操作');
            return true;
        }
        return false;
    }

    // ========== 公共接口 ==========

    // 启用输入处理
    enable() {
        this.isEnabled = true;
        console.log('输入处理器已启用');
    }

    // 禁用输入处理
    disable() {
        this.isEnabled = false;
        this.deselectCell();
        this.resetDragState();
        console.log('输入处理器已禁用');
    }

    // 清除所有选择和高亮
    clearAll() {
        this.deselectCell();
        this.resetDragState();
        
        // 清除所有视觉效果
        const cells = this.gameBoard.querySelectorAll('.game-cell');
        cells.forEach(cell => {
            cell.classList.remove('selected', 'hover', 'swap-preview');
            cell.setAttribute('aria-selected', 'false');
        });
    }

    // 获取当前选中的单元格
    getSelectedCell() {
        return this.selectedCell;
    }

    // 程序化选择单元格
    programmaticSelect(position) {
        this.selectCell(position);
    }

    // 销毁输入处理器
    destroy() {
        // 移除所有事件监听器
        if (this.gameBoard) {
            this.gameBoard.removeEventListener('mousedown', this.handleMouseDown);
            this.gameBoard.removeEventListener('touchstart', this.handleTouchStart);
            this.gameBoard.removeEventListener('touchmove', this.handleTouchMove);
            this.gameBoard.removeEventListener('touchend', this.handleTouchEnd);
            this.gameBoard.removeEventListener('contextmenu', (e) => e.preventDefault());
        }
        
        document.removeEventListener('mousemove', this.handleMouseMove);
        document.removeEventListener('mouseup', this.handleMouseUp);
        
        // 清除单元格事件
        const cells = this.gameBoard?.querySelectorAll('.game-cell') || [];
        cells.forEach(cell => {
            cell.removeEventListener('click', this.handleCellClick);
            cell.removeEventListener('mouseenter', this.handleCellMouseEnter);
            cell.removeEventListener('mouseleave', this.handleCellMouseLeave);
        });
        
        this.clearAll();
        console.log('输入处理器已销毁');
    }

    // 提供视觉触摸反馈
    provideVisualFeedback(position, type = 'touch') {
        const cell = this.getCellElement(position);
        if (!cell) return;

        cell.classList.add('touch-feedback');
        
        setTimeout(() => {
            cell.classList.remove('touch-feedback');
        }, 200);
    }

    // 设置触摸配置
    configureTouchSettings(settings = {}) {
        if (settings.moveThreshold !== undefined) {
            this.touchMoveThreshold = settings.moveThreshold;
        }
        
        if (settings.tapTimeout !== undefined) {
            this.tapTimeout = settings.tapTimeout;
        }
        
        if (settings.doubleTapTimeout !== undefined) {
            this.doubleTapTimeout = settings.doubleTapTimeout;
        }
        
        if (settings.preventAccidentalTouch !== undefined) {
            this.preventAccidentalTouch = settings.preventAccidentalTouch;
        }
        
        console.log('触摸设置已更新:', settings);
    }

    // 获取触摸配置
    getTouchSettings() {
        return {
            moveThreshold: this.touchMoveThreshold,
            tapTimeout: this.tapTimeout,
            doubleTapTimeout: this.doubleTapTimeout,
            preventAccidentalTouch: this.preventAccidentalTouch,
            isTouchDevice: this.isTouchDevice()
        };
    }

    // 获取输入处理器状态（用于调试）
    getStatus() {
        return {
            isEnabled: this.isEnabled,
            isDragging: this.isDragging,
            selectedCell: this.selectedCell,
            dragStartPosition: this.dragStartPosition,
            dragCurrentPosition: this.dragCurrentPosition,
            touchMoveThreshold: this.touchMoveThreshold,
            tapTimeout: this.tapTimeout,
            doubleTapTimeout: this.doubleTapTimeout,
            preventAccidentalTouch: this.preventAccidentalTouch,
            isTouchDevice: this.isTouchDevice(),
            lastTapTime: this.lastTapTime,
            lastTapPosition: this.lastTapPosition,
            pendingEvents: this.pendingEvents.size,
            lastEventTime: this.lastEventTime
        };
    }

    // ========== 性能优化方法 ==========

    // 事件节流 - 限制事件处理频率
    throttleEvent(func, delay) {
        let lastExecTime = 0;
        let timeoutId;
        
        return function(event) {
            const currentTime = Date.now();
            
            if (currentTime - lastExecTime > delay) {
                func.call(this, event);
                lastExecTime = currentTime;
            } else {
                clearTimeout(timeoutId);
                timeoutId = setTimeout(() => {
                    func.call(this, event);
                    lastExecTime = Date.now();
                }, delay - (currentTime - lastExecTime));
            }
        };
    }

    // 事件防抖 - 防止频繁触发
    debounceEvent(func, delay) {
        let timeoutId;
        return function(event) {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => func.call(this, event), delay);
        };
    }

    // 批量处理事件
    batchProcessEvents() {
        if (this.pendingEvents.size === 0) return;

        const events = Array.from(this.pendingEvents.values());
        this.pendingEvents.clear();

        // 使用requestAnimationFrame确保在下一帧处理
        requestAnimationFrame(() => {
            for (const eventData of events) {
                try {
                    eventData.handler.call(this, eventData.event);
                } catch (error) {
                    console.error('批量事件处理失败:', error);
                }
            }
        });
    }

    // 优化的事件处理 - 减少DOM查询
    optimizedGetCellFromEvent(event) {
        // 缓存DOM查询结果
        if (!this._cellCache) {
            this._cellCache = new Map();
        }

        let target = event.target;
        
        // 检查缓存
        if (this._cellCache.has(target)) {
            return this._cellCache.get(target);
        }

        // 查找最近的game-cell元素
        while (target && target !== this.gameBoard) {
            if (target.classList && target.classList.contains('game-cell')) {
                this._cellCache.set(event.target, target);
                return target;
            }
            target = target.parentElement;
        }

        return null;
    }

    // 清理缓存
    clearCache() {
        if (this._cellCache) {
            this._cellCache.clear();
        }
    }

    // 优化的位置检查 - 减少重复计算
    optimizedGetCellPosition(cellElement) {
        if (!cellElement || !cellElement.dataset) return null;
        
        // 使用缓存避免重复解析
        const cacheKey = `${cellElement.dataset.row}-${cellElement.dataset.col}`;
        if (!this._positionCache) {
            this._positionCache = new Map();
        }

        if (this._positionCache.has(cacheKey)) {
            return this._positionCache.get(cacheKey);
        }

        const row = parseInt(cellElement.dataset.row);
        const col = parseInt(cellElement.dataset.col);
        
        if (isNaN(row) || isNaN(col)) return null;
        
        const position = { row, col };
        this._positionCache.set(cacheKey, position);
        
        return position;
    }

    // 性能监控
    startPerformanceMonitoring() {
        this.performanceMetrics = {
            eventCount: 0,
            totalEventTime: 0,
            averageEventTime: 0,
            maxEventTime: 0,
            throttledEvents: 0,
            debouncedEvents: 0
        };

        // 包装事件处理函数以监控性能
        const originalHandlers = [
            'handleMouseDown', 'handleMouseMove', 'handleMouseUp',
            'handleTouchStart', 'handleTouchMove', 'handleTouchEnd',
            'handleCellClick'
        ];

        originalHandlers.forEach(handlerName => {
            const originalHandler = this[handlerName];
            if (typeof originalHandler === 'function') {
                this[handlerName] = (event) => {
                    const startTime = performance.now();
                    const result = originalHandler.call(this, event);
                    const endTime = performance.now();
                    
                    const eventTime = endTime - startTime;
                    this.performanceMetrics.eventCount++;
                    this.performanceMetrics.totalEventTime += eventTime;
                    this.performanceMetrics.averageEventTime = 
                        this.performanceMetrics.totalEventTime / this.performanceMetrics.eventCount;
                    this.performanceMetrics.maxEventTime = 
                        Math.max(this.performanceMetrics.maxEventTime, eventTime);
                    
                    // 如果事件处理时间过长，发出警告
                    if (eventTime > 5) {
                        console.warn(`事件处理时间过长 (${handlerName}): ${eventTime.toFixed(2)}ms`);
                    }
                    
                    return result;
                };
            }
        });
    }

    // 获取性能指标
    getPerformanceMetrics() {
        return {
            ...this.performanceMetrics,
            pendingEvents: this.pendingEvents.size,
            cacheSize: this._cellCache ? this._cellCache.size : 0,
            positionCacheSize: this._positionCache ? this._positionCache.size : 0
        };
    }

    // 优化内存使用
    optimizeMemoryUsage() {
        // 清理缓存
        this.clearCache();
        if (this._positionCache) {
            this._positionCache.clear();
        }

        // 清理待处理的事件
        this.pendingEvents.clear();

        // 清理定时器
        if (this.eventBatchTimer) {
            clearTimeout(this.eventBatchTimer);
            this.eventBatchTimer = null;
        }

        // 强制垃圾回收（如果支持）
        if (window.gc && typeof window.gc === 'function') {
            window.gc();
        }
    }

    // ========== 用户体验增强功能 ==========

    // 增强的触摸反馈
    enhancedTouchFeedback(cell, type = 'touch') {
        if (!cell) return;
        
        // 移除之前的反馈类
        cell.classList.remove('touch-feedback', 'touch-active', 'touch-drag');
        
        // 添加新的反馈类
        switch (type) {
            case 'touch':
                cell.classList.add('touch-feedback');
                break;
            case 'active':
                cell.classList.add('touch-active');
                break;
            case 'drag':
                cell.classList.add('touch-drag');
                break;
        }
        
        // 触觉反馈
        this.provideTactileFeedback('light');
        
        // 创建触摸轨迹（如果有渲染器）
        if (this.gameEngine && this.gameEngine.renderer && typeof this.gameEngine.renderer.createTouchTrail === 'function') {
            const rect = cell.getBoundingClientRect();
            const x = rect.left + rect.width / 2;
            const y = rect.top + rect.height / 2;
            this.gameEngine.renderer.createTouchTrail(x, y);
        }
    }

    // 显示拖拽预览
    showDragPreview(startPos, currentPos) {
        if (!startPos || !currentPos) return;
        
        const startCell = this.getCellElement(startPos);
        const currentCell = this.getCellElement(currentPos);
        
        if (startCell) {
            this.enhancedTouchFeedback(startCell, 'active');
        }
        
        if (currentCell && this.arePositionsAdjacent(startPos, currentPos)) {
            this.enhancedTouchFeedback(currentCell, 'drag');
            
            // 显示手势提示
            if (this.gameEngine && this.gameEngine.renderer && typeof this.gameEngine.renderer.showGestureHint === 'function') {
                this.gameEngine.renderer.showGestureHint('松开以交换元素', 1000);
            }
        }
    }

    // 清除拖拽预览
    clearDragPreview() {
        const cells = this.gameBoard.querySelectorAll('.game-cell');
        cells.forEach(cell => {
            cell.classList.remove('touch-feedback', 'touch-active', 'touch-drag');
        });
    }

    // 智能触摸检测
    intelligentTouchDetection(event) {
        const touch = event.touches[0];
        if (!touch) return null;
        
        // 获取触摸点下的元素
        const element = document.elementFromPoint(touch.clientX, touch.clientY);
        const cell = element?.closest('.game-cell');
        
        if (!cell) return null;
        
        // 检查触摸点是否在单元格中心区域
        const rect = cell.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const distanceFromCenter = Math.sqrt(
            Math.pow(touch.clientX - centerX, 2) + 
            Math.pow(touch.clientY - centerY, 2)
        );
        
        // 如果触摸点距离中心太远，可能是误触
        const maxDistance = Math.min(rect.width, rect.height) * 0.4;
        if (distanceFromCenter > maxDistance) {
            return null;
        }
        
        return cell;
    }

    // 手势识别
    recognizeGesture(startPos, endPos, duration) {
        if (!startPos || !endPos) return 'unknown';
        
        const deltaX = endPos.x - startPos.x;
        const deltaY = endPos.y - startPos.y;
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        
        // 短距离移动认为是点击
        if (distance < 20) {
            return duration < 200 ? 'tap' : 'long_press';
        }
        
        // 长距离移动认为是滑动
        if (distance > 50) {
            const angle = Math.atan2(deltaY, deltaX) * 180 / Math.PI;
            
            if (Math.abs(angle) < 45) return 'swipe_right';
            if (Math.abs(angle) > 135) return 'swipe_left';
            if (angle > 45 && angle < 135) return 'swipe_down';
            if (angle < -45 && angle > -135) return 'swipe_up';
        }
        
        return 'drag';
    }

    // 自适应触摸敏感度
    adaptiveTouchSensitivity() {
        // 根据设备类型和屏幕尺寸调整敏感度
        const screenWidth = window.innerWidth;
        const devicePixelRatio = window.devicePixelRatio || 1;
        
        if (screenWidth < 480) {
            // 小屏幕设备，降低敏感度
            this.touchMoveThreshold = 15;
            this.tapTimeout = 400;
        } else if (screenWidth < 768) {
            // 中等屏幕设备
            this.touchMoveThreshold = 12;
            this.tapTimeout = 350;
        } else {
            // 大屏幕设备，提高敏感度
            this.touchMoveThreshold = 8;
            this.tapTimeout = 250;
        }
        
        // 根据像素密度调整
        if (devicePixelRatio > 2) {
            this.touchMoveThreshold *= 1.2;
        }
        
        console.log(`触摸敏感度已调整: 阈值=${this.touchMoveThreshold}, 超时=${this.tapTimeout}`);
    }

    // 触摸性能优化
    optimizeTouchPerformance() {
        // 启用被动事件监听器
        const passiveOptions = { passive: true };
        
        // 重新绑定触摸事件为被动模式（仅用于性能监控）
        this.gameBoard.addEventListener('touchstart', (e) => {
            // 性能监控代码
            this.touchPerformanceMetrics = this.touchPerformanceMetrics || { events: 0, totalTime: 0 };
            this.touchPerformanceMetrics.startTime = performance.now();
        }, passiveOptions);
        
        this.gameBoard.addEventListener('touchend', (e) => {
            // 性能监控代码
            if (this.touchPerformanceMetrics && this.touchPerformanceMetrics.startTime) {
                const duration = performance.now() - this.touchPerformanceMetrics.startTime;
                this.touchPerformanceMetrics.events++;
                this.touchPerformanceMetrics.totalTime += duration;
                
                // 如果触摸处理时间过长，发出警告
                if (duration > 50) {
                    console.warn(`触摸处理时间过长: ${duration.toFixed(2)}ms`);
                }
            }
        }, passiveOptions);
    }

    // 触摸辅助功能
    enableTouchAccessibility() {
        // 为触摸设备添加额外的可访问性支持
        const cells = this.gameBoard.querySelectorAll('.game-cell');
        
        cells.forEach((cell, index) => {
            // 添加触摸描述
            const position = this.getCellPosition(cell);
            if (position) {
                cell.setAttribute('aria-describedby', `touch-help-${position.row}-${position.col}`);
                
                // 创建隐藏的帮助文本
                const helpText = document.createElement('div');
                helpText.id = `touch-help-${position.row}-${position.col}`;
                helpText.className = 'sr-only';
                helpText.textContent = '触摸选择，拖拽到相邻单元格进行交换';
                helpText.style.cssText = `
                    position: absolute;
                    width: 1px;
                    height: 1px;
                    padding: 0;
                    margin: -1px;
                    overflow: hidden;
                    clip: rect(0, 0, 0, 0);
                    white-space: nowrap;
                    border: 0;
                `;
                
                cell.appendChild(helpText);
            }
        });
    }

    // 触摸手势教程
    showTouchTutorial() {
        const tutorial = document.createElement('div');
        tutorial.className = 'touch-tutorial';
        tutorial.innerHTML = `
            <div class="tutorial-content">
                <h3>触摸操作指南</h3>
                <div class="tutorial-step">
                    <div class="step-icon">👆</div>
                    <div class="step-text">点击选择游戏元素</div>
                </div>
                <div class="tutorial-step">
                    <div class="step-icon">👉</div>
                    <div class="step-text">拖拽到相邻位置进行交换</div>
                </div>
                <div class="tutorial-step">
                    <div class="step-icon">✨</div>
                    <div class="step-text">形成三个或更多相同元素消除</div>
                </div>
                <button class="tutorial-close">开始游戏</button>
            </div>
        `;
        
        // 添加样式
        tutorial.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10000;
        `;
        
        document.body.appendChild(tutorial);
        
        // 绑定关闭事件
        const closeBtn = tutorial.querySelector('.tutorial-close');
        closeBtn.addEventListener('click', () => {
            if (tutorial.parentNode) {
                tutorial.parentNode.removeChild(tutorial);
            }
        });
        
        return tutorial;
    }

    // 获取触摸性能指标
    getTouchPerformanceMetrics() {
        if (!this.touchPerformanceMetrics) {
            return { events: 0, averageTime: 0, totalTime: 0 };
        }
        
        return {
            events: this.touchPerformanceMetrics.events,
            totalTime: this.touchPerformanceMetrics.totalTime,
            averageTime: this.touchPerformanceMetrics.events > 0 ? 
                this.touchPerformanceMetrics.totalTime / this.touchPerformanceMetrics.events : 0
        };
    }
}

// 输入处理器工厂函数
function createInputHandler(gameBoard, gameEngine) {
    if (!gameBoard) {
        throw new Error('Game board element is required');
    }
    
    return new InputHandler(gameBoard, gameEngine);
}

// 导出类和工厂函数
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { InputHandler, createInputHandler };
} else {
    // 浏览器环境 - 将所有导出暴露到全局作用域
    window.InputHandler = InputHandler;
    window.createInputHandler = createInputHandler;
}