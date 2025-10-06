// 游戏数据模型和常量定义

// 小鬼emoji类型常量
const GHOST_TYPES = {
    HAPPY: '😊',
    SCARY: '👻',
    COOL: '😎',
    ANGRY: '😠',
    SURPRISED: '😲',
    WINK: '😉'
};

// 游戏配置参数
const GAME_CONFIG = {
    GRID_SIZE: 8,
    MIN_MATCH_LENGTH: 3,
    INITIAL_SCORE: 0,
    BASE_SCORE_PER_MATCH: 10,
    COMBO_MULTIPLIER: 1.5,
    ANIMATION_DURATION: 300,
    CHAIN_MULTIPLIER: 1.2,
    MAX_CHAIN_MULTIPLIER: 5.0
};

// 游戏状态对象结构和初始值
const createInitialGameState = () => {
    return {
        grid: Array(GAME_CONFIG.GRID_SIZE).fill().map(() => Array(GAME_CONFIG.GRID_SIZE).fill(0)),
        score: GAME_CONFIG.INITIAL_SCORE,
        highScore: 0,
        isPlaying: false,
        isPaused: false,
        isGameOver: false,
        selectedCell: null,
        animationQueue: [],
        comboMultiplier: 1,
        moveCount: 0,
        lastMoveTime: null,
        chainCount: 0,
        chainMultiplier: 1,
        isProcessingChain: false,
        startTime: null,
        pauseStartTime: null,
        totalPauseTime: 0,
        gameEndReason: null
    };
};

// 游戏网格数据结构初始化函数
const initializeGameGrid = () => {
    const grid = Array(GAME_CONFIG.GRID_SIZE).fill().map(() =>
        Array(GAME_CONFIG.GRID_SIZE).fill(0)
    );

    const ghostTypeKeys = Object.keys(GHOST_TYPES);

    // 随机填充网格，确保初始状态没有三消组合
    for (let row = 0; row < GAME_CONFIG.GRID_SIZE; row++) {
        for (let col = 0; col < GAME_CONFIG.GRID_SIZE; col++) {
            let availableTypes = [...ghostTypeKeys];

            // 检查水平方向，避免形成三消
            if (col >= 2 &&
                grid[row][col - 1] === grid[row][col - 2]) {
                const typeToAvoid = grid[row][col - 1];
                availableTypes = availableTypes.filter(type => type !== typeToAvoid);
            }

            // 检查垂直方向，避免形成三消
            if (row >= 2 &&
                grid[row - 1][col] === grid[row - 2][col]) {
                const typeToAvoid = grid[row - 1][col];
                availableTypes = availableTypes.filter(type => type !== typeToAvoid);
            }

            // 从可用类型中随机选择
            const randomIndex = Math.floor(Math.random() * availableTypes.length);
            grid[row][col] = availableTypes[randomIndex];
        }
    }

    return grid;
};

// 位置对象创建函数
const createPosition = (row, col) => {
    return { row, col };
};

// 匹配结果对象创建函数
const createMatchResult = (positions, type, length) => {
    return {
        positions,
        type,
        length,
        score: length * GAME_CONFIG.BASE_SCORE_PER_MATCH
    };
};

// 验证位置是否在网格范围内
const isValidPosition = (row, col) => {
    return row >= 0 && row < GAME_CONFIG.GRID_SIZE &&
        col >= 0 && col < GAME_CONFIG.GRID_SIZE;
};

// 检查两个位置是否相邻
const arePositionsAdjacent = (pos1, pos2) => {
    const rowDiff = Math.abs(pos1.row - pos2.row);
    const colDiff = Math.abs(pos1.col - pos2.col);

    return (rowDiff === 1 && colDiff === 0) || (rowDiff === 0 && colDiff === 1);
};

// GameGrid类 - 游戏网格核心功能
class GameGrid {
    constructor(size = GAME_CONFIG.GRID_SIZE) {
        this.size = size;
        this.grid = null;
        this.initialize();
    }

    // 初始化网格
    initialize() {
        this.grid = Array(this.size).fill().map(() => Array(this.size).fill(null));
        this.fillRandomly();
    }

    // 获取指定位置的单元格值
    getCell(row, col) {
        if (!this.isValidPosition(row, col)) {
            throw new Error(`Invalid position: (${row}, ${col})`);
        }
        return this.grid[row][col];
    }

    // 设置指定位置的单元格值
    setCell(row, col, value) {
        if (!this.isValidPosition(row, col)) {
            throw new Error(`Invalid position: (${row}, ${col})`);
        }
        this.grid[row][col] = value;
    }

    // 检查位置是否在网格边界内
    isValidPosition(row, col) {
        return row >= 0 && row < this.size && col >= 0 && col < this.size;
    }

    // 随机填充网格，确保初始状态没有三消组合
    fillRandomly() {
        const ghostTypeKeys = Object.keys(GHOST_TYPES);

        for (let row = 0; row < this.size; row++) {
            for (let col = 0; col < this.size; col++) {
                let availableTypes = [...ghostTypeKeys];

                // 检查水平方向，避免形成三消
                if (col >= 2 &&
                    this.grid[row][col - 1] === this.grid[row][col - 2]) {
                    const typeToAvoid = this.grid[row][col - 1];
                    availableTypes = availableTypes.filter(type => type !== typeToAvoid);
                }

                // 检查垂直方向，避免形成三消
                if (row >= 2 &&
                    this.grid[row - 1][col] === this.grid[row - 2][col]) {
                    const typeToAvoid = this.grid[row - 1][col];
                    availableTypes = availableTypes.filter(type => type !== typeToAvoid);
                }

                // 确保至少有一个可用类型
                if (availableTypes.length === 0) {
                    availableTypes = [...ghostTypeKeys];
                }

                // 从可用类型中随机选择
                const randomIndex = Math.floor(Math.random() * availableTypes.length);
                this.grid[row][col] = availableTypes[randomIndex];
            }
        }
    }

    // 获取整个网格的副本
    getGrid() {
        return this.grid.map(row => [...row]);
    }

    // 重置网格
    reset() {
        this.initialize();
    }

    // 检查网格是否已满
    isFull() {
        for (let row = 0; row < this.size; row++) {
            for (let col = 0; col < this.size; col++) {
                if (this.grid[row][col] === null) {
                    return false;
                }
            }
        }
        return true;
    }

    // 检查网格是否为空
    isEmpty() {
        for (let row = 0; row < this.size; row++) {
            for (let col = 0; col < this.size; col++) {
                if (this.grid[row][col] !== null) {
                    return false;
                }
            }
        }
        return true;
    }

    // 获取指定位置的相邻位置
    getAdjacentPositions(row, col) {
        const adjacent = [];
        const directions = [
            [-1, 0], // 上
            [1, 0],  // 下
            [0, -1], // 左
            [0, 1]   // 右
        ];

        for (const [dRow, dCol] of directions) {
            const newRow = row + dRow;
            const newCol = col + dCol;

            if (this.isValidPosition(newRow, newCol)) {
                adjacent.push({ row: newRow, col: newCol });
            }
        }

        return adjacent;
    }

    // 检查两个位置是否相邻
    arePositionsAdjacent(pos1, pos2) {
        const rowDiff = Math.abs(pos1.row - pos2.row);
        const colDiff = Math.abs(pos1.col - pos2.col);

        return (rowDiff === 1 && colDiff === 0) || (rowDiff === 0 && colDiff === 1);
    }

    // 交换两个位置的元素
    swapCells(pos1, pos2) {
        // 验证位置有效性
        if (!this.isValidPosition(pos1.row, pos1.col)) {
            throw new Error(`Invalid position 1: (${pos1.row}, ${pos1.col})`);
        }
        if (!this.isValidPosition(pos2.row, pos2.col)) {
            throw new Error(`Invalid position 2: (${pos2.row}, ${pos2.col})`);
        }

        // 验证位置相邻性
        if (!this.arePositionsAdjacent(pos1, pos2)) {
            throw new Error(`Positions are not adjacent: (${pos1.row}, ${pos1.col}) and (${pos2.row}, ${pos2.col})`);
        }

        // 执行交换
        const temp = this.grid[pos1.row][pos1.col];
        this.grid[pos1.row][pos1.col] = this.grid[pos2.row][pos2.col];
        this.grid[pos2.row][pos2.col] = temp;

        return {
            success: true,
            pos1: pos1,
            pos2: pos2,
            value1: this.grid[pos1.row][pos1.col],
            value2: this.grid[pos2.row][pos2.col]
        };
    }

    // 验证交换是否有效（会产生匹配）
    isValidSwap(pos1, pos2) {
        // 检查位置有效性和相邻性
        if (!this.isValidPosition(pos1.row, pos1.col) ||
            !this.isValidPosition(pos2.row, pos2.col)) {
            return false;
        }

        if (!this.arePositionsAdjacent(pos1, pos2)) {
            return false;
        }

        // 临时交换元素
        const temp = this.grid[pos1.row][pos1.col];
        this.grid[pos1.row][pos1.col] = this.grid[pos2.row][pos2.col];
        this.grid[pos2.row][pos2.col] = temp;

        // 检查是否产生匹配（这里先简单检查，后续会在MatchDetector中实现完整逻辑）
        const hasMatch = this.hasMatchAt(pos1.row, pos1.col) || this.hasMatchAt(pos2.row, pos2.col);

        // 恢复原状态
        this.grid[pos2.row][pos2.col] = this.grid[pos1.row][pos1.col];
        this.grid[pos1.row][pos1.col] = temp;

        return hasMatch;
    }

    // 检查指定位置是否有匹配（简单版本）
    hasMatchAt(row, col) {
        const value = this.grid[row][col];
        if (!value) return false;

        // 检查水平匹配
        let horizontalCount = 1;

        // 向左检查
        for (let c = col - 1; c >= 0 && this.grid[row][c] === value; c--) {
            horizontalCount++;
        }

        // 向右检查
        for (let c = col + 1; c < this.size && this.grid[row][c] === value; c++) {
            horizontalCount++;
        }

        if (horizontalCount >= GAME_CONFIG.MIN_MATCH_LENGTH) {
            return true;
        }

        // 检查垂直匹配
        let verticalCount = 1;

        // 向上检查
        for (let r = row - 1; r >= 0 && this.grid[r][col] === value; r--) {
            verticalCount++;
        }

        // 向下检查
        for (let r = row + 1; r < this.size && this.grid[r][col] === value; r++) {
            verticalCount++;
        }

        return verticalCount >= GAME_CONFIG.MIN_MATCH_LENGTH;
    }

    // 撤销交换操作
    undoSwap(swapResult) {
        if (!swapResult || !swapResult.success) {
            throw new Error('Invalid swap result for undo operation');
        }

        // 重新交换回原来的位置
        const temp = this.grid[swapResult.pos1.row][swapResult.pos1.col];
        this.grid[swapResult.pos1.row][swapResult.pos1.col] = this.grid[swapResult.pos2.row][swapResult.pos2.col];
        this.grid[swapResult.pos2.row][swapResult.pos2.col] = temp;

        return {
            success: true,
            undone: true,
            originalSwap: swapResult
        };
    }

    // 尝试交换（如果无效则自动撤销）
    trySwap(pos1, pos2) {
        try {
            // 先检查是否是有效交换
            if (!this.isValidSwap(pos1, pos2)) {
                return {
                    success: false,
                    reason: 'Swap would not create any matches'
                };
            }

            // 执行交换
            const swapResult = this.swapCells(pos1, pos2);
            return {
                success: true,
                swapResult: swapResult
            };
        } catch (error) {
            return {
                success: false,
                reason: error.message
            };
        }
    }

    // 应用重力效果，让元素下落
    applyGravity() {
        const movements = [];

        for (let col = 0; col < this.size; col++) {
            // 从底部开始，找到空位并让上方元素下落
            let writePos = this.size - 1;

            for (let readPos = this.size - 1; readPos >= 0; readPos--) {
                if (this.grid[readPos][col] !== null) {
                    if (readPos !== writePos) {
                        // 记录移动信息用于动画
                        movements.push({
                            from: { row: readPos, col: col },
                            to: { row: writePos, col: col },
                            value: this.grid[readPos][col]
                        });

                        // 执行移动
                        this.grid[writePos][col] = this.grid[readPos][col];
                        this.grid[readPos][col] = null;
                    }
                    writePos--;
                }
            }
        }

        return movements;
    }

    // 填充空位（从顶部生成新元素）
    fillEmptySpaces() {
        const newElements = [];
        const ghostTypeKeys = Object.keys(GHOST_TYPES);

        for (let col = 0; col < this.size; col++) {
            for (let row = 0; row < this.size; row++) {
                if (this.grid[row][col] === null) {
                    // 随机选择一个小鬼类型
                    const randomIndex = Math.floor(Math.random() * ghostTypeKeys.length);
                    const newType = ghostTypeKeys[randomIndex];

                    this.grid[row][col] = newType;

                    // 记录新生成的元素信息用于动画
                    newElements.push({
                        position: { row: row, col: col },
                        value: newType,
                        isNew: true
                    });
                }
            }
        }

        return newElements;
    }

    // 智能填充空位（避免立即形成三消）
    fillEmptySpacesIntelligently() {
        const newElements = [];
        const ghostTypeKeys = Object.keys(GHOST_TYPES);

        for (let col = 0; col < this.size; col++) {
            for (let row = 0; row < this.size; row++) {
                if (this.grid[row][col] === null) {
                    let availableTypes = [...ghostTypeKeys];

                    // 检查水平方向，避免形成三消
                    if (col >= 2 &&
                        this.grid[row][col - 1] !== null &&
                        this.grid[row][col - 1] === this.grid[row][col - 2]) {
                        const typeToAvoid = this.grid[row][col - 1];
                        availableTypes = availableTypes.filter(type => type !== typeToAvoid);
                    }

                    // 检查垂直方向，避免形成三消
                    if (row >= 2 &&
                        this.grid[row - 1][col] !== null &&
                        this.grid[row - 1][col] === this.grid[row - 2][col]) {
                        const typeToAvoid = this.grid[row - 1][col];
                        availableTypes = availableTypes.filter(type => type !== typeToAvoid);
                    }

                    // 确保至少有一个可用类型
                    if (availableTypes.length === 0) {
                        availableTypes = [...ghostTypeKeys];
                    }

                    // 从可用类型中随机选择
                    const randomIndex = Math.floor(Math.random() * availableTypes.length);
                    const newType = availableTypes[randomIndex];

                    this.grid[row][col] = newType;

                    // 记录新生成的元素信息用于动画
                    newElements.push({
                        position: { row: row, col: col },
                        value: newType,
                        isNew: true
                    });
                }
            }
        }

        return newElements;
    }

    // 移除指定位置的元素
    removeElements(positions) {
        const removedElements = [];

        for (const pos of positions) {
            if (this.isValidPosition(pos.row, pos.col)) {
                const value = this.grid[pos.row][pos.col];
                this.grid[pos.row][pos.col] = null;

                removedElements.push({
                    position: pos,
                    value: value
                });
            }
        }

        return removedElements;
    }

    // 完整的重力和填充循环
    processGravityAndFill() {
        const result = {
            movements: [],
            newElements: [],
            totalSteps: 0
        };

        // 应用重力
        const movements = this.applyGravity();
        result.movements = movements;
        result.totalSteps++;

        // 填充空位
        const newElements = this.fillEmptySpacesIntelligently();
        result.newElements = newElements;
        result.totalSteps++;

        return result;
    }

    // 获取所有空位置
    getEmptyPositions() {
        const emptyPositions = [];

        for (let row = 0; row < this.size; row++) {
            for (let col = 0; col < this.size; col++) {
                if (this.grid[row][col] === null) {
                    emptyPositions.push({ row, col });
                }
            }
        }

        return emptyPositions;
    }

    // 检查列是否需要重力效果
    columnNeedsGravity(col) {
        for (let row = this.size - 1; row >= 0; row--) {
            if (this.grid[row][col] === null) {
                // 检查上方是否有非空元素
                for (let upperRow = row - 1; upperRow >= 0; upperRow--) {
                    if (this.grid[upperRow][col] !== null) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    // 检查网格是否需要重力效果
    needsGravity() {
        for (let col = 0; col < this.size; col++) {
            if (this.columnNeedsGravity(col)) {
                return true;
            }
        }
        return false;
    }

    // 打印网格（用于调试）
    printGrid() {
        console.log('Current Grid:');
        for (let row = 0; row < this.size; row++) {
            let rowStr = '';
            for (let col = 0; col < this.size; col++) {
                const cell = this.grid[row][col];
                rowStr += (cell ? GHOST_TYPES[cell] : '⬜') + ' ';
            }
            console.log(rowStr);
        }
    }
}

// MatchDetector类 - 匹配检测器
class MatchDetector {
    constructor(minMatchLength = GAME_CONFIG.MIN_MATCH_LENGTH) {
        this.minMatchLength = minMatchLength;
    }

    // 检测水平方向的匹配
    findHorizontalMatches(grid) {
        const matches = [];
        const gridSize = grid.length;

        for (let row = 0; row < gridSize; row++) {
            let currentMatch = [];
            let currentType = null;

            for (let col = 0; col < gridSize; col++) {
                const cellValue = grid[row][col];

                if (cellValue && cellValue === currentType) {
                    // 继续当前匹配
                    currentMatch.push(createPosition(row, col));
                } else {
                    // 检查之前的匹配是否满足最小长度
                    if (currentMatch.length >= this.minMatchLength) {
                        matches.push(createMatchResult(
                            [...currentMatch],
                            'horizontal',
                            currentMatch.length
                        ));
                    }

                    // 开始新的匹配
                    if (cellValue) {
                        currentMatch = [createPosition(row, col)];
                        currentType = cellValue;
                    } else {
                        currentMatch = [];
                        currentType = null;
                    }
                }
            }

            // 检查行末的匹配
            if (currentMatch.length >= this.minMatchLength) {
                matches.push(createMatchResult(
                    [...currentMatch],
                    'horizontal',
                    currentMatch.length
                ));
            }
        }

        return matches;
    }

    // 检测垂直方向的匹配
    findVerticalMatches(grid) {
        const matches = [];
        const gridSize = grid.length;

        for (let col = 0; col < gridSize; col++) {
            let currentMatch = [];
            let currentType = null;

            for (let row = 0; row < gridSize; row++) {
                const cellValue = grid[row][col];

                if (cellValue && cellValue === currentType) {
                    // 继续当前匹配
                    currentMatch.push(createPosition(row, col));
                } else {
                    // 检查之前的匹配是否满足最小长度
                    if (currentMatch.length >= this.minMatchLength) {
                        matches.push(createMatchResult(
                            [...currentMatch],
                            'vertical',
                            currentMatch.length
                        ));
                    }

                    // 开始新的匹配
                    if (cellValue) {
                        currentMatch = [createPosition(row, col)];
                        currentType = cellValue;
                    } else {
                        currentMatch = [];
                        currentType = null;
                    }
                }
            }

            // 检查列末的匹配
            if (currentMatch.length >= this.minMatchLength) {
                matches.push(createMatchResult(
                    [...currentMatch],
                    'vertical',
                    currentMatch.length
                ));
            }
        }

        return matches;
    }

    // 检测所有基础匹配（水平和垂直）
    findAllMatches(grid) {
        const horizontalMatches = this.findHorizontalMatches(grid);
        const verticalMatches = this.findVerticalMatches(grid);

        return {
            horizontal: horizontalMatches,
            vertical: verticalMatches,
            all: [...horizontalMatches, ...verticalMatches],
            totalCount: horizontalMatches.length + verticalMatches.length,
            hasMatches: horizontalMatches.length > 0 || verticalMatches.length > 0
        };
    }

    // 验证匹配是否有效
    isValidMatch(match) {
        if (!match || !match.positions || !Array.isArray(match.positions)) {
            return false;
        }

        // 检查匹配长度
        if (match.positions.length < this.minMatchLength) {
            return false;
        }

        // 检查位置的连续性
        if (match.type === 'horizontal') {
            return this.isValidHorizontalMatch(match.positions);
        } else if (match.type === 'vertical') {
            return this.isValidVerticalMatch(match.positions);
        }

        return false;
    }

    // 验证水平匹配的连续性
    isValidHorizontalMatch(positions) {
        if (positions.length < 2) return false;

        // 按列排序
        const sortedPositions = [...positions].sort((a, b) => a.col - b.col);

        // 检查是否在同一行且连续
        const row = sortedPositions[0].row;
        for (let i = 0; i < sortedPositions.length; i++) {
            if (sortedPositions[i].row !== row) {
                return false;
            }
            if (i > 0 && sortedPositions[i].col !== sortedPositions[i - 1].col + 1) {
                return false;
            }
        }

        return true;
    }

    // 验证垂直匹配的连续性
    isValidVerticalMatch(positions) {
        if (positions.length < 2) return false;

        // 按行排序
        const sortedPositions = [...positions].sort((a, b) => a.row - b.row);

        // 检查是否在同一列且连续
        const col = sortedPositions[0].col;
        for (let i = 0; i < sortedPositions.length; i++) {
            if (sortedPositions[i].col !== col) {
                return false;
            }
            if (i > 0 && sortedPositions[i].row !== sortedPositions[i - 1].row + 1) {
                return false;
            }
        }

        return true;
    }

    // 获取指定位置的所有匹配
    getMatchesAt(grid, row, col) {
        const allMatches = this.findAllMatches(grid);
        const matchesAtPosition = [];

        for (const match of allMatches.all) {
            const hasPosition = match.positions.some(pos =>
                pos.row === row && pos.col === col
            );
            if (hasPosition) {
                matchesAtPosition.push(match);
            }
        }

        return matchesAtPosition;
    }

    // 检查指定位置是否有匹配
    hasMatchAt(grid, row, col) {
        const matches = this.getMatchesAt(grid, row, col);
        return matches.length > 0;
    }

    // 获取所有匹配位置的唯一集合
    getAllMatchPositions(matches) {
        const positionSet = new Set();
        const positions = [];

        for (const match of matches) {
            for (const pos of match.positions) {
                const key = `${pos.row},${pos.col}`;
                if (!positionSet.has(key)) {
                    positionSet.add(key);
                    positions.push(pos);
                }
            }
        }

        return positions;
    }

    // 计算匹配的总分数
    calculateMatchScore(matches) {
        let totalScore = 0;

        for (const match of matches) {
            totalScore += match.score;
        }

        return totalScore;
    }

    // 按匹配长度对匹配进行排序（长的优先）
    sortMatchesByLength(matches) {
        return [...matches].sort((a, b) => b.length - a.length);
    }

    // 按匹配类型分组
    groupMatchesByType(matches) {
        const grouped = {
            horizontal: [],
            vertical: []
        };

        for (const match of matches) {
            if (match.type === 'horizontal') {
                grouped.horizontal.push(match);
            } else if (match.type === 'vertical') {
                grouped.vertical.push(match);
            }
        }

        return grouped;
    }

    // 检测网格中是否存在任何匹配
    hasAnyMatches(grid) {
        const result = this.findAllMatches(grid);
        return result.hasMatches;
    }

    // 获取匹配统计信息
    getMatchStatistics(matches) {
        const stats = {
            totalMatches: matches.length,
            totalScore: this.calculateMatchScore(matches),
            byType: this.groupMatchesByType(matches),
            byLength: {}
        };

        // 按长度统计
        for (const match of matches) {
            const length = match.length;
            if (!stats.byLength[length]) {
                stats.byLength[length] = 0;
            }
            stats.byLength[length]++;
        }

        return stats;
    }

    // 检测L型匹配
    findLShapeMatches(grid) {
        const matches = [];
        const gridSize = grid.length;

        for (let row = 0; row < gridSize; row++) {
            for (let col = 0; col < gridSize; col++) {
                const cellValue = grid[row][col];
                if (!cellValue) continue;

                // 检测所有可能的L型组合
                const lShapes = this.getLShapePatternsAt(grid, row, col, cellValue);
                matches.push(...lShapes);
            }
        }

        return matches;
    }

    // 获取指定位置的所有L型模式
    getLShapePatternsAt(grid, row, col, value) {
        const patterns = [];
        const gridSize = grid.length;

        // L型有8种可能的方向
        const lPatterns = [
            // 右下L (┐)
            { horizontal: [[0, 1], [0, 2]], vertical: [[1, 0], [2, 0]] },
            // 左下L (┌)
            { horizontal: [[0, -1], [0, -2]], vertical: [[1, 0], [2, 0]] },
            // 右上L (┘)
            { horizontal: [[0, 1], [0, 2]], vertical: [[-1, 0], [-2, 0]] },
            // 左上L (└)
            { horizontal: [[0, -1], [0, -2]], vertical: [[-1, 0], [-2, 0]] },
            // 下右L (└)
            { horizontal: [[1, 0], [2, 0]], vertical: [[0, 1], [0, 2]] },
            // 下左L (┘)
            { horizontal: [[1, 0], [2, 0]], vertical: [[0, -1], [0, -2]] },
            // 上右L (┌)
            { horizontal: [[-1, 0], [-2, 0]], vertical: [[0, 1], [0, 2]] },
            // 上左L (┐)
            { horizontal: [[-1, 0], [-2, 0]], vertical: [[0, -1], [0, -2]] }
        ];

        for (let i = 0; i < lPatterns.length; i++) {
            const pattern = lPatterns[i];
            const positions = [{ row, col }]; // 中心点
            let isValidPattern = true;

            // 检查水平部分
            for (const [dRow, dCol] of pattern.horizontal) {
                const newRow = row + dRow;
                const newCol = col + dCol;

                if (newRow < 0 || newRow >= gridSize ||
                    newCol < 0 || newCol >= gridSize ||
                    grid[newRow][newCol] !== value) {
                    isValidPattern = false;
                    break;
                }
                positions.push({ row: newRow, col: newCol });
            }

            if (!isValidPattern) continue;

            // 检查垂直部分
            for (const [dRow, dCol] of pattern.vertical) {
                const newRow = row + dRow;
                const newCol = col + dCol;

                if (newRow < 0 || newRow >= gridSize ||
                    newCol < 0 || newCol >= gridSize ||
                    grid[newRow][newCol] !== value) {
                    isValidPattern = false;
                    break;
                }
                positions.push({ row: newRow, col: newCol });
            }

            if (isValidPattern) {
                patterns.push(createMatchResult(
                    positions,
                    'L-shape',
                    positions.length
                ));
            }
        }

        return patterns;
    }

    // 检测T型匹配
    findTShapeMatches(grid) {
        const matches = [];
        const gridSize = grid.length;

        for (let row = 0; row < gridSize; row++) {
            for (let col = 0; col < gridSize; col++) {
                const cellValue = grid[row][col];
                if (!cellValue) continue;

                // 检测所有可能的T型组合
                const tShapes = this.getTShapePatternsAt(grid, row, col, cellValue);
                matches.push(...tShapes);
            }
        }

        return matches;
    }

    // 获取指定位置的所有T型模式
    getTShapePatternsAt(grid, row, col, value) {
        const patterns = [];
        const gridSize = grid.length;

        // T型有4种可能的方向
        const tPatterns = [
            // 正T (┬)
            {
                main: [[-1, 0], [-2, 0]], // 向上的主干
                cross: [[0, -1], [0, 1]]  // 水平的横杠
            },
            // 倒T (┴)
            {
                main: [[1, 0], [2, 0]],   // 向下的主干
                cross: [[0, -1], [0, 1]]  // 水平的横杠
            },
            // 左T (├)
            {
                main: [[0, -1], [0, -2]], // 向左的主干
                cross: [[-1, 0], [1, 0]]  // 垂直的横杠
            },
            // 右T (┤)
            {
                main: [[0, 1], [0, 2]],   // 向右的主干
                cross: [[-1, 0], [1, 0]]  // 垂直的横杠
            }
        ];

        for (let i = 0; i < tPatterns.length; i++) {
            const pattern = tPatterns[i];
            const positions = [{ row, col }]; // 中心点
            let isValidPattern = true;

            // 检查主干部分
            for (const [dRow, dCol] of pattern.main) {
                const newRow = row + dRow;
                const newCol = col + dCol;

                if (newRow < 0 || newRow >= gridSize ||
                    newCol < 0 || newCol >= gridSize ||
                    grid[newRow][newCol] !== value) {
                    isValidPattern = false;
                    break;
                }
                positions.push({ row: newRow, col: newCol });
            }

            if (!isValidPattern) continue;

            // 检查横杠部分
            for (const [dRow, dCol] of pattern.cross) {
                const newRow = row + dRow;
                const newCol = col + dCol;

                if (newRow < 0 || newRow >= gridSize ||
                    newCol < 0 || newCol >= gridSize ||
                    grid[newRow][newCol] !== value) {
                    isValidPattern = false;
                    break;
                }
                positions.push({ row: newRow, col: newCol });
            }

            if (isValidPattern) {
                patterns.push(createMatchResult(
                    positions,
                    'T-shape',
                    positions.length
                ));
            }
        }

        return patterns;
    }

    // 检测所有高级匹配（包括L型和T型）
    findAdvancedMatches(grid) {
        const lShapeMatches = this.findLShapeMatches(grid);
        const tShapeMatches = this.findTShapeMatches(grid);

        return {
            lShape: lShapeMatches,
            tShape: tShapeMatches,
            all: [...lShapeMatches, ...tShapeMatches],
            totalCount: lShapeMatches.length + tShapeMatches.length,
            hasAdvancedMatches: lShapeMatches.length > 0 || tShapeMatches.length > 0
        };
    }

    // 检测所有匹配（基础 + 高级）
    findAllMatchesAdvanced(grid) {
        const basicMatches = this.findAllMatches(grid);
        const advancedMatches = this.findAdvancedMatches(grid);

        return {
            basic: basicMatches,
            advanced: advancedMatches,
            all: [...basicMatches.all, ...advancedMatches.all],
            totalCount: basicMatches.totalCount + advancedMatches.totalCount,
            hasMatches: basicMatches.hasMatches || advancedMatches.hasAdvancedMatches
        };
    }

    // 创建匹配优先级系统
    getMatchPriority(match) {
        // 优先级规则：
        // 1. 特殊形状 (T型、L型) 优先级最高
        // 2. 长度越长优先级越高
        // 3. 同长度时，垂直匹配优先于水平匹配

        let priority = 0;

        // 形状优先级
        if (match.type === 'T-shape') {
            priority += 1000;
        } else if (match.type === 'L-shape') {
            priority += 800;
        } else if (match.type === 'vertical') {
            priority += 100;
        } else if (match.type === 'horizontal') {
            priority += 50;
        }

        // 长度优先级
        priority += match.length * 10;

        return priority;
    }

    // 按优先级排序匹配
    sortMatchesByPriority(matches) {
        return [...matches].sort((a, b) => {
            const priorityA = this.getMatchPriority(a);
            const priorityB = this.getMatchPriority(b);
            return priorityB - priorityA; // 降序排列
        });
    }

    // 计算高级分数（包含长度和形状奖励）
    calculateAdvancedScore(match, comboMultiplier = 1) {
        let baseScore = match.length * GAME_CONFIG.BASE_SCORE_PER_MATCH;

        // 长度奖励
        if (match.length >= 4) {
            baseScore *= 1.5; // 四消奖励
        }
        if (match.length >= 5) {
            baseScore *= 2; // 五消奖励
        }
        if (match.length >= 6) {
            baseScore *= 3; // 六消及以上奖励
        }

        // 形状奖励
        if (match.type === 'T-shape') {
            baseScore *= 2.5; // T型奖励
        } else if (match.type === 'L-shape') {
            baseScore *= 2; // L型奖励
        }

        // 连锁奖励
        baseScore *= comboMultiplier;

        return Math.floor(baseScore);
    }

    // 更新匹配结果的分数
    updateMatchScores(matches, comboMultiplier = 1) {
        return matches.map(match => ({
            ...match,
            score: this.calculateAdvancedScore(match, comboMultiplier),
            originalScore: match.score,
            comboMultiplier: comboMultiplier
        }));
    }

    // 检测重叠匹配并解决冲突
    resolveOverlappingMatches(matches) {
        if (matches.length <= 1) return matches;

        // 按优先级排序
        const sortedMatches = this.sortMatchesByPriority(matches);
        const resolvedMatches = [];
        const usedPositions = new Set();

        for (const match of sortedMatches) {
            let hasOverlap = false;

            // 检查是否与已选择的匹配重叠
            for (const pos of match.positions) {
                const key = `${pos.row},${pos.col}`;
                if (usedPositions.has(key)) {
                    hasOverlap = true;
                    break;
                }
            }

            // 如果没有重叠，添加到结果中
            if (!hasOverlap) {
                resolvedMatches.push(match);

                // 标记使用的位置
                for (const pos of match.positions) {
                    const key = `${pos.row},${pos.col}`;
                    usedPositions.add(key);
                }
            }
        }

        return resolvedMatches;
    }

    // 获取最优匹配组合
    getOptimalMatches(grid, comboMultiplier = 1) {
        // 获取所有匹配
        const allMatches = this.findAllMatchesAdvanced(grid);

        // 更新分数
        const scoredMatches = this.updateMatchScores(allMatches.all, comboMultiplier);

        // 解决重叠冲突
        const optimalMatches = this.resolveOverlappingMatches(scoredMatches);

        return {
            matches: optimalMatches,
            totalScore: optimalMatches.reduce((sum, match) => sum + match.score, 0),
            totalCount: optimalMatches.length,
            hasMatches: optimalMatches.length > 0
        };
    }

    // 按匹配类型分组（包含高级类型）
    groupMatchesByTypeAdvanced(matches) {
        const grouped = {
            horizontal: [],
            vertical: [],
            lShape: [],
            tShape: []
        };

        for (const match of matches) {
            if (match.type === 'horizontal') {
                grouped.horizontal.push(match);
            } else if (match.type === 'vertical') {
                grouped.vertical.push(match);
            } else if (match.type === 'L-shape') {
                grouped.lShape.push(match);
            } else if (match.type === 'T-shape') {
                grouped.tShape.push(match);
            }
        }

        return grouped;
    }

    // 获取高级匹配统计信息
    getAdvancedMatchStatistics(matches) {
        const stats = {
            totalMatches: matches.length,
            totalScore: matches.reduce((sum, match) => sum + match.score, 0),
            byType: this.groupMatchesByTypeAdvanced(matches),
            byLength: {},
            byPriority: {}
        };

        // 按长度和优先级统计
        for (const match of matches) {
            const length = match.length;
            const priority = this.getMatchPriority(match);

            if (!stats.byLength[length]) {
                stats.byLength[length] = 0;
            }
            stats.byLength[length]++;

            const priorityRange = Math.floor(priority / 100) * 100;
            if (!stats.byPriority[priorityRange]) {
                stats.byPriority[priorityRange] = 0;
            }
            stats.byPriority[priorityRange]++;
        }

        return stats;
    }
}


// ChainReactionSystem类 - 连锁反应系统
class ChainReactionSystem {
    constructor(gameGrid, matchDetector) {
        this.gameGrid = gameGrid;
        this.matchDetector = matchDetector;
        this.chainCount = 0;
        this.chainMultiplier = 1;
        this.isProcessing = false;
        this.chainHistory = [];
        this.totalChainScore = 0;
    }

    // 重置连锁反应状态
    reset() {
        this.chainCount = 0;
        this.chainMultiplier = 1;
        this.isProcessing = false;
        this.chainHistory = [];
        this.totalChainScore = 0;
    }

    // 开始连锁反应处理
    async startChainReaction() {
        this.reset();
        this.isProcessing = true;

        const chainResult = {
            totalChains: 0,
            totalScore: 0,
            chainDetails: [],
            finalMultiplier: 1,
            success: true
        };

        try {
            // 持续处理连锁反应直到没有更多匹配
            while (this.hasMatches()) {
                const chainStep = await this.processChainStep();

                if (chainStep.success && chainStep.matchesFound > 0) {
                    this.chainCount++;
                    this.updateChainMultiplier();

                    chainResult.totalChains = this.chainCount;
                    chainResult.totalScore += chainStep.score;
                    chainResult.chainDetails.push(chainStep);
                    chainResult.finalMultiplier = this.chainMultiplier;

                    // 记录连锁历史
                    this.chainHistory.push({
                        step: this.chainCount,
                        matches: chainStep.matches,
                        score: chainStep.score,
                        multiplier: this.chainMultiplier,
                        timestamp: Date.now()
                    });
                } else {
                    // 如果没有找到匹配或处理失败，结束连锁
                    break;
                }

                // 添加延迟以便动画播放
                await this.delay(GAME_CONFIG.ANIMATION_DURATION);
            }

            this.totalChainScore = chainResult.totalScore;

        } catch (error) {
            console.error('Chain reaction processing error:', error);
            chainResult.success = false;
            chainResult.error = error.message;
        } finally {
            this.isProcessing = false;
        }

        return chainResult;
    }

    // 处理单个连锁步骤
    async processChainStep() {
        const stepResult = {
            step: this.chainCount + 1,
            matches: [],
            matchesFound: 0,
            score: 0,
            removedElements: [],
            gravityMovements: [],
            newElements: [],
            success: false
        };

        try {
            // 1. 检测当前匹配
            const matchResult = this.matchDetector.findAllMatches(this.gameGrid.getGrid());

            if (!matchResult.hasMatches) {
                stepResult.success = true; // 成功但没有匹配，结束连锁
                return stepResult;
            }

            stepResult.matches = matchResult.all;
            stepResult.matchesFound = matchResult.totalCount;

            // 2. 计算分数（包含连锁倍数）
            const baseScore = this.matchDetector.calculateMatchScore(matchResult.all);
            stepResult.score = Math.floor(baseScore * this.getNextChainMultiplier());

            // 3. 移除匹配的元素
            const allMatchPositions = this.matchDetector.getAllMatchPositions(matchResult.all);
            stepResult.removedElements = this.gameGrid.removeElements(allMatchPositions);

            // 4. 应用重力效果
            stepResult.gravityMovements = this.gameGrid.applyGravity();

            // 5. 填充空位
            stepResult.newElements = this.gameGrid.fillEmptySpacesIntelligently();

            stepResult.success = true;

        } catch (error) {
            console.error('Chain step processing error:', error);
            stepResult.success = false;
            stepResult.error = error.message;
        }

        return stepResult;
    }

    // 检查是否还有匹配
    hasMatches() {
        if (this.isProcessing) {
            return this.matchDetector.hasAnyMatches(this.gameGrid.getGrid());
        }
        return false;
    }

    // 更新连锁倍数
    updateChainMultiplier() {
        // 连锁倍数随着连锁次数增加
        this.chainMultiplier = Math.min(
            1 + (this.chainCount - 1) * (GAME_CONFIG.CHAIN_MULTIPLIER - 1),
            GAME_CONFIG.MAX_CHAIN_MULTIPLIER
        );
    }

    // 获取下一个连锁的倍数
    getNextChainMultiplier() {
        const nextChainCount = this.chainCount + 1;
        return Math.min(
            1 + (nextChainCount - 1) * (GAME_CONFIG.CHAIN_MULTIPLIER - 1),
            GAME_CONFIG.MAX_CHAIN_MULTIPLIER
        );
    }

    // 获取当前连锁状态
    getChainStatus() {
        return {
            chainCount: this.chainCount,
            chainMultiplier: this.chainMultiplier,
            isProcessing: this.isProcessing,
            totalScore: this.totalChainScore,
            hasHistory: this.chainHistory.length > 0
        };
    }

    // 获取连锁历史
    getChainHistory() {
        return [...this.chainHistory];
    }

    // 获取连锁统计信息
    getChainStatistics() {
        if (this.chainHistory.length === 0) {
            return {
                totalChains: 0,
                totalScore: 0,
                averageScore: 0,
                maxMultiplier: 1,
                totalMatches: 0
            };
        }

        const stats = {
            totalChains: this.chainHistory.length,
            totalScore: this.totalChainScore,
            averageScore: 0,
            maxMultiplier: 1,
            totalMatches: 0
        };

        let totalMatches = 0;
        let maxMultiplier = 1;

        for (const chain of this.chainHistory) {
            totalMatches += chain.matches.length;
            maxMultiplier = Math.max(maxMultiplier, chain.multiplier);
        }

        stats.averageScore = stats.totalScore / stats.totalChains;
        stats.maxMultiplier = maxMultiplier;
        stats.totalMatches = totalMatches;

        return stats;
    }

    // 检查连锁反应是否结束
    isChainReactionComplete() {
        return !this.isProcessing && !this.hasMatches();
    }

    // 强制结束连锁反应
    forceEndChainReaction() {
        this.isProcessing = false;
        return {
            forced: true,
            finalChainCount: this.chainCount,
            finalScore: this.totalChainScore,
            finalMultiplier: this.chainMultiplier
        };
    }

    // 预测可能的连锁反应
    predictChainReaction() {
        // 创建网格副本进行预测
        const gridCopy = this.gameGrid.getGrid();
        const tempGrid = new GameGrid(this.gameGrid.size);
        tempGrid.grid = gridCopy.map(row => [...row]);

        const prediction = {
            estimatedChains: 0,
            estimatedScore: 0,
            confidence: 'low' // low, medium, high
        };

        let chainCount = 0;
        let totalScore = 0;

        // 模拟连锁反应（最多预测5步）
        for (let i = 0; i < 5; i++) {
            const matches = this.matchDetector.findAllMatches(tempGrid.getGrid());

            if (!matches.hasMatches) {
                break;
            }

            chainCount++;
            const baseScore = this.matchDetector.calculateMatchScore(matches.all);
            const multiplier = Math.min(
                1 + (chainCount - 1) * (GAME_CONFIG.CHAIN_MULTIPLIER - 1),
                GAME_CONFIG.MAX_CHAIN_MULTIPLIER
            );
            totalScore += Math.floor(baseScore * multiplier);

            // 模拟移除和重力
            const allPositions = this.matchDetector.getAllMatchPositions(matches.all);
            tempGrid.removeElements(allPositions);
            tempGrid.applyGravity();
            tempGrid.fillEmptySpacesIntelligently();
        }

        prediction.estimatedChains = chainCount;
        prediction.estimatedScore = totalScore;

        // 设置置信度
        if (chainCount === 0) {
            prediction.confidence = 'high';
        } else if (chainCount <= 2) {
            prediction.confidence = 'medium';
        } else {
            prediction.confidence = 'low';
        }

        return prediction;
    }

    // 延迟函数（用于动画）
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // 验证连锁反应的完整性
    validateChainReaction() {
        const validation = {
            isValid: true,
            errors: [],
            warnings: []
        };

        // 检查连锁计数
        if (this.chainCount < 0) {
            validation.isValid = false;
            validation.errors.push('Chain count cannot be negative');
        }

        // 检查倍数
        if (this.chainMultiplier < 1) {
            validation.isValid = false;
            validation.errors.push('Chain multiplier cannot be less than 1');
        }

        if (this.chainMultiplier > GAME_CONFIG.MAX_CHAIN_MULTIPLIER) {
            validation.warnings.push('Chain multiplier exceeds maximum allowed value');
        }

        // 检查历史记录一致性
        if (this.chainHistory.length !== this.chainCount) {
            validation.warnings.push('Chain history length does not match chain count');
        }

        // 检查分数计算
        let calculatedScore = 0;
        for (const chain of this.chainHistory) {
            calculatedScore += chain.score;
        }

        if (Math.abs(calculatedScore - this.totalChainScore) > 0.01) {
            validation.isValid = false;
            validation.errors.push('Total chain score calculation mismatch');
        }

        return validation;
    }

    // 获取连锁反应的详细报告
    getDetailedReport() {
        const stats = this.getChainStatistics();
        const validation = this.validateChainReaction();

        return {
            status: this.getChainStatus(),
            statistics: stats,
            history: this.getChainHistory(),
            validation: validation,
            configuration: {
                chainMultiplier: GAME_CONFIG.CHAIN_MULTIPLIER,
                maxChainMultiplier: GAME_CONFIG.MAX_CHAIN_MULTIPLIER,
                animationDuration: GAME_CONFIG.ANIMATION_DURATION
            }
        };
    }
}

// 连锁反应结果创建函数
const createChainReactionResult = (chainCount, totalScore, multiplier, details = []) => {
    return {
        chainCount,
        totalScore,
        finalMultiplier: multiplier,
        chainDetails: details,
        timestamp: Date.now(),
        success: true
    };
};

// 连锁步骤结果创建函数
const createChainStepResult = (step, matches, score, multiplier) => {
    return {
        step,
        matches,
        matchCount: matches.length,
        score,
        multiplier,
        timestamp: Date.now()
    };
};

// 导出所有模块
if (typeof module !== 'undefined' && module.exports) {
    // Node.js 环境
    module.exports = {
        GHOST_TYPES,
        GAME_CONFIG,
        createInitialGameState,
        initializeGameGrid,
        createPosition,
        createMatchResult,
        createChainReactionResult,
        createChainStepResult,
        isValidPosition,
        arePositionsAdjacent,
        GameGrid,
        MatchDetector,
        ChainReactionSystem
    };
} else {
    // 浏览器环境 - 将所有导出暴露到全局作用域
    window.GHOST_TYPES = GHOST_TYPES;
    window.GAME_CONFIG = GAME_CONFIG;
    window.createInitialGameState = createInitialGameState;
    window.initializeGameGrid = initializeGameGrid;
    window.createPosition = createPosition;
    window.createMatchResult = createMatchResult;
    window.createChainReactionResult = createChainReactionResult;
    window.createChainStepResult = createChainStepResult;
    window.isValidPosition = isValidPosition;
    window.arePositionsAdjacent = arePositionsAdjacent;
    window.GameGrid = GameGrid;
    window.MatchDetector = MatchDetector;
    window.ChainReactionSystem = ChainReactionSystem;
}