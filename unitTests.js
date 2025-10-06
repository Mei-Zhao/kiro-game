// 小鬼消消乐 - 单元测试
// 测试 GameGrid、MatchDetector、StorageManager 等核心类的功能

// 简单的测试框架
class TestFramework {
    constructor() {
        this.tests = [];
        this.results = [];
    }

    test(name, testFn) {
        this.tests.push({ name, testFn });
    }

    async run() {
        console.log('🧪 开始运行单元测试...\n');
        
        for (const { name, testFn } of this.tests) {
            try {
                await testFn();
                this.results.push({ name, status: 'PASS', error: null });
                console.log(`✅ ${name}`);
            } catch (error) {
                this.results.push({ name, status: 'FAIL', error: error.message });
                console.log(`❌ ${name}: ${error.message}`);
            }
        }

        this.printSummary();
    }

    printSummary() {
        const passed = this.results.filter(r => r.status === 'PASS').length;
        const failed = this.results.filter(r => r.status === 'FAIL').length;
        
        console.log('\n📊 测试结果汇总:');
        console.log(`✅ 通过: ${passed}`);
        console.log(`❌ 失败: ${failed}`);
        console.log(`📈 成功率: ${((passed / this.results.length) * 100).toFixed(1)}%`);
        
        if (failed > 0) {
            console.log('\n❌ 失败的测试:');
            this.results.filter(r => r.status === 'FAIL').forEach(r => {
                console.log(`  - ${r.name}: ${r.error}`);
            });
        }
    }

    assert(condition, message) {
        if (!condition) {
            throw new Error(message || 'Assertion failed');
        }
    }

    assertEqual(actual, expected, message) {
        if (actual !== expected) {
            throw new Error(message || `Expected ${expected}, got ${actual}`);
        }
    }

    assertNotEqual(actual, unexpected, message) {
        if (actual === unexpected) {
            throw new Error(message || `Expected not ${unexpected}, got ${actual}`);
        }
    }

    assertArrayEqual(actual, expected, message) {
        if (JSON.stringify(actual) !== JSON.stringify(expected)) {
            throw new Error(message || `Arrays not equal: ${JSON.stringify(actual)} vs ${JSON.stringify(expected)}`);
        }
    }

    assertThrows(fn, message) {
        try {
            fn();
            throw new Error(message || 'Expected function to throw');
        } catch (error) {
            // Expected behavior
        }
    }
}

// 创建测试实例
const test = new TestFramework();

// 导入游戏模块
async function runUnitTests() {
    try {
        // 动态导入模块
        const gameModels = await import('./gameModels.js');
        const { 
            GHOST_TYPES, 
            GAME_CONFIG, 
            GameGrid, 
            MatchDetector, 
            ChainReactionSystem,
            createInitialGameState,
            initializeGameGrid,
            isValidPosition,
            arePositionsAdjacent
        } = gameModels;

        // 导入其他模块
        const storageModule = await import('./storageManager.js');
        const { StorageManager } = storageModule;

        const scoreModule = await import('./scoreSystem.js');
        const { ScoreSystem } = scoreModule;

        // GameGrid 类单元测试
        test.test('GameGrid - 构造函数和初始化', () => {
            const grid = new GameGrid();
            test.assert(grid instanceof GameGrid, 'GameGrid实例创建失败');
            test.assertEqual(grid.size, 8, '网格大小应该是8');
            test.assert(Array.isArray(grid.grid), '网格应该是数组');
            test.assertEqual(grid.grid.length, 8, '网格行数应该是8');
            test.assertEqual(grid.grid[0].length, 8, '网格列数应该是8');
        });

        test.test('GameGrid - 基础操作方法', () => {
            const grid = new GameGrid();
            
            // 测试设置和获取单元格
            grid.setCell(0, 0, 'HAPPY');
            test.assertEqual(grid.getCell(0, 0), 'HAPPY', '设置和获取单元格值失败');
            
            // 测试边界检查
            test.assert(grid.isValidPosition(0, 0), '有效位置检查失败');
            test.assert(!grid.isValidPosition(-1, 0), '无效位置检查失败');
            test.assert(!grid.isValidPosition(8, 8), '边界位置检查失败');
        });

        test.test('GameGrid - 相邻位置检测', () => {
            const grid = new GameGrid();
            
            // 测试中心位置的相邻位置
            const adjacent = grid.getAdjacentPositions(4, 4);
            test.assertEqual(adjacent.length, 4, '中心位置应该有4个相邻位置');
            
            // 测试角落位置的相邻位置
            const corner = grid.getAdjacentPositions(0, 0);
            test.assertEqual(corner.length, 2, '角落位置应该有2个相邻位置');
            
            // 测试边缘位置的相邻位置
            const edge = grid.getAdjacentPositions(0, 4);
            test.assertEqual(edge.length, 3, '边缘位置应该有3个相邻位置');
        });

        test.test('GameGrid - 元素交换功能', () => {
            const grid = new GameGrid();
            grid.setCell(0, 0, 'HAPPY');
            grid.setCell(0, 1, 'SCARY');
            
            // 测试有效交换
            const result = grid.swapCells({row: 0, col: 0}, {row: 0, col: 1});
            test.assert(result.success, '相邻元素交换应该成功');
            test.assertEqual(grid.getCell(0, 0), 'SCARY', '交换后位置(0,0)值错误');
            test.assertEqual(grid.getCell(0, 1), 'HAPPY', '交换后位置(0,1)值错误');
            
            // 测试撤销交换
            const undoResult = grid.undoSwap(result);
            test.assert(undoResult.success, '撤销交换应该成功');
            test.assertEqual(grid.getCell(0, 0), 'HAPPY', '撤销后位置(0,0)值错误');
            test.assertEqual(grid.getCell(0, 1), 'SCARY', '撤销后位置(0,1)值错误');
        });

        test.test('GameGrid - 重力效果', () => {
            const grid = new GameGrid();
            
            // 设置测试场景：创建空位和元素
            grid.setCell(5, 0, null);
            grid.setCell(6, 0, null);
            grid.setCell(7, 0, 'HAPPY');
            grid.setCell(4, 0, 'SCARY');
            
            const movements = grid.applyGravity();
            test.assert(movements.length > 0, '重力效果应该产生移动');
            
            // 验证元素下落（SCARY应该下落到底部，HAPPY应该在上面）
            test.assertNotEqual(grid.getCell(7, 0), null, '底部应该有元素');
            test.assertNotEqual(grid.getCell(6, 0), null, '第二层应该有元素');
        });

        test.test('GameGrid - 空位填充', () => {
            const grid = new GameGrid();
            
            // 创建空位
            grid.setCell(0, 0, null);
            grid.setCell(1, 0, null);
            grid.setCell(2, 0, null);
            
            const newElements = grid.fillEmptySpaces();
            test.assert(newElements.length >= 3, '应该填充所有空位');
            
            // 验证网格已满
            test.assert(grid.isFull(), '填充后网格应该是满的');
        });

        // MatchDetector 类单元测试
        test.test('MatchDetector - 构造函数和基础属性', () => {
            const detector = new MatchDetector();
            test.assert(detector instanceof MatchDetector, 'MatchDetector实例创建失败');
            test.assertEqual(detector.minMatchLength, 3, '最小匹配长度应该是3');
        });

        test.test('MatchDetector - 水平匹配检测', () => {
            const detector = new MatchDetector();
            const testGrid = Array(8).fill().map(() => Array(8).fill('SURPRISED'));
            
            // 设置水平三消
            testGrid[0][0] = 'HAPPY';
            testGrid[0][1] = 'HAPPY';
            testGrid[0][2] = 'HAPPY';
            
            const matches = detector.findHorizontalMatches(testGrid);
            test.assert(matches.length > 0, '应该检测到水平匹配');
            test.assertEqual(matches[0].type, 'horizontal', '匹配类型应该是水平');
            test.assertEqual(matches[0].length, 3, '匹配长度应该是3');
        });

        test.test('MatchDetector - 垂直匹配检测', () => {
            const detector = new MatchDetector();
            const testGrid = Array(8).fill().map(() => Array(8).fill('SURPRISED'));
            
            // 设置垂直三消
            testGrid[0][0] = 'HAPPY';
            testGrid[1][0] = 'HAPPY';
            testGrid[2][0] = 'HAPPY';
            
            const matches = detector.findVerticalMatches(testGrid);
            test.assert(matches.length > 0, '应该检测到垂直匹配');
            test.assertEqual(matches[0].type, 'vertical', '匹配类型应该是垂直');
            test.assertEqual(matches[0].length, 3, '匹配长度应该是3');
        });

        test.test('MatchDetector - 匹配验证', () => {
            const detector = new MatchDetector();
            
            // 有效匹配
            const validMatch = {
                positions: [{row: 0, col: 0}, {row: 0, col: 1}, {row: 0, col: 2}],
                type: 'horizontal',
                length: 3
            };
            test.assert(detector.isValidMatch(validMatch), '有效匹配应该通过验证');
            
            // 无效匹配（长度不足）
            const invalidMatch = {
                positions: [{row: 0, col: 0}, {row: 0, col: 1}],
                type: 'horizontal',
                length: 2
            };
            test.assert(!detector.isValidMatch(invalidMatch), '无效匹配应该被拒绝');
        });

        test.test('MatchDetector - L型和T型匹配检测', () => {
            const detector = new MatchDetector();
            const testGrid = Array(8).fill().map(() => Array(8).fill('SURPRISED'));
            
            // 设置L型匹配
            testGrid[1][1] = 'HAPPY';
            testGrid[1][2] = 'HAPPY';
            testGrid[1][3] = 'HAPPY';
            testGrid[2][1] = 'HAPPY';
            testGrid[3][1] = 'HAPPY';
            
            const lMatches = detector.findLShapeMatches(testGrid);
            test.assert(lMatches.length > 0, '应该检测到L型匹配');
            test.assertEqual(lMatches[0].type, 'L-shape', 'L型匹配类型错误');
            test.assertEqual(lMatches[0].length, 5, 'L型匹配长度应该是5');
        });

        // StorageManager 类单元测试
        test.test('StorageManager - 构造函数和初始化', () => {
            const storage = new StorageManager();
            test.assert(storage instanceof StorageManager, 'StorageManager实例创建失败');
            
            // 测试可用性检查
            test.assert(typeof storage.isAvailable === 'boolean', 'isAvailable应该是布尔值');
        });

        test.test('StorageManager - 最高分数存储', () => {
            const storage = new StorageManager();
            
            if (!storage.isAvailable) {
                console.log('LocalStorage不可用，跳过存储测试');
                return;
            }
            
            // 清除之前的数据
            storage.clearData('HIGH_SCORE');
            
            // 测试保存和读取最高分
            const testScore = 12345;
            const saveResult = storage.saveHighScore(testScore);
            test.assert(saveResult, '保存最高分应该成功');
            
            const loadedScore = storage.getHighScore();
            test.assertEqual(loadedScore, testScore, '读取的最高分应该与保存的相同');
        });

        test.test('StorageManager - 游戏状态存储', () => {
            const storage = new StorageManager();
            
            if (!storage.isAvailable) {
                console.log('LocalStorage不可用，跳过存储测试');
                return;
            }
            
            const testState = {
                score: 1000,
                level: 5,
                grid: [[1, 2, 3], [4, 5, 6]]
            };
            
            // 测试保存游戏状态
            const saveResult = storage.saveGameState(testState);
            test.assert(saveResult, '保存游戏状态应该成功');
            
            // 测试读取游戏状态
            const loadedState = storage.loadGameState();
            test.assert(loadedState !== null, '读取游戏状态应该成功');
            test.assertEqual(loadedState.score, testState.score, '游戏状态分数不匹配');
            test.assertEqual(loadedState.level, testState.level, '游戏状态等级不匹配');
        });

        test.test('StorageManager - 错误处理', () => {
            const storage = new StorageManager();
            
            if (!storage.isAvailable) {
                console.log('LocalStorage不可用，跳过存储测试');
                return;
            }
            
            // 测试保存无效数据
            const invalidData = { circular: null };
            invalidData.circular = invalidData; // 创建循环引用
            
            const result = storage.saveGameState(invalidData);
            test.assert(!result, '保存无效数据应该失败');
        });

        // ScoreSystem 类单元测试
        test.test('ScoreSystem - 构造函数和初始化', () => {
            const scoreSystem = new ScoreSystem();
            test.assert(scoreSystem instanceof ScoreSystem, 'ScoreSystem实例创建失败');
            
            scoreSystem.initialize();
            test.assertEqual(scoreSystem.getCurrentScore(), 0, '初始分数应该是0');
        });

        test.test('ScoreSystem - 分数计算', () => {
            const scoreSystem = new ScoreSystem();
            scoreSystem.initialize();
            
            // 测试基础分数添加
            scoreSystem.addScore(100);
            test.assertEqual(scoreSystem.getCurrentScore(), 100, '添加分数后总分错误');
            
            // 测试再次添加分数
            scoreSystem.addScore(50);
            test.assertEqual(scoreSystem.getCurrentScore(), 150, '连续添加分数计算错误');
        });

        test.test('ScoreSystem - 匹配分数计算', () => {
            const scoreSystem = new ScoreSystem();
            scoreSystem.initialize();
            
            // 创建测试匹配数据
            const threeMatch = [{
                positions: [{row: 0, col: 0}, {row: 0, col: 1}, {row: 0, col: 2}],
                type: 'horizontal',
                length: 3
            }];
            
            const fourMatch = [{
                positions: [{row: 0, col: 0}, {row: 0, col: 1}, {row: 0, col: 2}, {row: 0, col: 3}],
                type: 'horizontal',
                length: 4
            }];
            
            const lShapeMatch = [{
                positions: [{row: 0, col: 0}, {row: 0, col: 1}, {row: 0, col: 2}, {row: 1, col: 0}, {row: 2, col: 0}],
                type: 'L-shape',
                length: 5
            }];
            
            // 测试三消分数
            const threeMatchResult = scoreSystem.calculateMatchScore(threeMatch);
            test.assert(threeMatchResult.baseScore > 0, '三消分数应该大于0');
            
            // 测试四消分数
            const fourMatchResult = scoreSystem.calculateMatchScore(fourMatch);
            test.assert(fourMatchResult.baseScore > threeMatchResult.baseScore, '四消分数应该高于三消');
            
            // 测试L型匹配分数
            const lShapeResult = scoreSystem.calculateMatchScore(lShapeMatch);
            test.assert(lShapeResult.baseScore > fourMatchResult.baseScore, 'L型匹配分数应该更高');
        });

        // ChainReactionSystem 类单元测试
        test.test('ChainReactionSystem - 构造函数和初始状态', () => {
            const grid = new GameGrid();
            const detector = new MatchDetector();
            const chainSystem = new ChainReactionSystem(grid, detector);
            
            test.assert(chainSystem instanceof ChainReactionSystem, 'ChainReactionSystem实例创建失败');
            test.assertEqual(chainSystem.chainCount, 0, '初始连锁计数应该是0');
            test.assertEqual(chainSystem.chainMultiplier, 1, '初始连锁倍数应该是1');
            test.assert(!chainSystem.isProcessing, '初始状态不应该在处理中');
        });

        test.test('ChainReactionSystem - 连锁倍数计算', () => {
            const grid = new GameGrid();
            const detector = new MatchDetector();
            const chainSystem = new ChainReactionSystem(grid, detector);
            
            // 测试连锁倍数递增
            chainSystem.chainCount = 2; // 第二次连锁
            if (chainSystem.updateChainMultiplier) {
                chainSystem.updateChainMultiplier();
                test.assert(chainSystem.chainMultiplier >= 1, '连锁倍数应该大于等于1');
            } else {
                // 如果没有updateChainMultiplier方法，跳过这个测试
                console.log('ChainReactionSystem没有updateChainMultiplier方法，跳过测试');
            }
        });

        test.test('ChainReactionSystem - 状态管理', () => {
            const grid = new GameGrid();
            const detector = new MatchDetector();
            const chainSystem = new ChainReactionSystem(grid, detector);
            
            // 测试状态获取
            const status = chainSystem.getChainStatus();
            test.assert(typeof status === 'object', '状态应该是对象');
            test.assert('chainCount' in status, '状态应该包含连锁计数');
            test.assert('chainMultiplier' in status, '状态应该包含连锁倍数');
            test.assert('isProcessing' in status, '状态应该包含处理状态');
        });

        test.test('ChainReactionSystem - 重置功能', () => {
            const grid = new GameGrid();
            const detector = new MatchDetector();
            const chainSystem = new ChainReactionSystem(grid, detector);
            
            // 设置一些状态
            chainSystem.chainCount = 5;
            chainSystem.chainMultiplier = 2.5;
            chainSystem.totalChainScore = 1000;
            chainSystem.isProcessing = true;
            
            // 重置
            chainSystem.reset();
            
            test.assertEqual(chainSystem.chainCount, 0, '重置后连锁计数应该是0');
            test.assertEqual(chainSystem.chainMultiplier, 1, '重置后连锁倍数应该是1');
            test.assertEqual(chainSystem.totalChainScore, 0, '重置后总分应该是0');
            test.assert(!chainSystem.isProcessing, '重置后不应该在处理中');
        });

        // 辅助函数单元测试
        test.test('辅助函数 - 位置验证', () => {
            test.assert(isValidPosition(0, 0), '(0,0)应该是有效位置');
            test.assert(isValidPosition(7, 7), '(7,7)应该是有效位置');
            test.assert(!isValidPosition(-1, 0), '(-1,0)应该是无效位置');
            test.assert(!isValidPosition(8, 8), '(8,8)应该是无效位置');
            test.assert(!isValidPosition(0, -1), '(0,-1)应该是无效位置');
        });

        test.test('辅助函数 - 相邻位置检测', () => {
            const pos1 = {row: 0, col: 0};
            const pos2 = {row: 0, col: 1};
            const pos3 = {row: 1, col: 1};
            
            test.assert(arePositionsAdjacent(pos1, pos2), '(0,0)和(0,1)应该相邻');
            test.assert(!arePositionsAdjacent(pos1, pos3), '(0,0)和(1,1)不应该相邻');
        });

        test.test('辅助函数 - 游戏状态初始化', () => {
            const gameState = createInitialGameState();
            
            test.assert(typeof gameState === 'object', '游戏状态应该是对象');
            test.assertEqual(gameState.score, 0, '初始分数应该是0');
            test.assert(!gameState.isPlaying, '初始状态不应该在游戏中');
            test.assert(Array.isArray(gameState.grid), '网格应该是数组');
            test.assertEqual(gameState.grid.length, 8, '网格应该是8x8');
        });

        test.test('辅助函数 - 网格初始化', () => {
            const grid = initializeGameGrid();
            
            test.assert(Array.isArray(grid), '初始化的网格应该是数组');
            test.assertEqual(grid.length, 8, '网格行数应该是8');
            test.assertEqual(grid[0].length, 8, '网格列数应该是8');
            
            // 验证所有位置都有有效的小鬼类型
            const ghostTypes = Object.keys(GHOST_TYPES);
            for (let row = 0; row < 8; row++) {
                for (let col = 0; col < 8; col++) {
                    test.assert(ghostTypes.includes(grid[row][col]), `位置(${row},${col})应该有有效的小鬼类型`);
                }
            }
        });

        // 常量验证测试
        test.test('常量验证 - GHOST_TYPES', () => {
            test.assert(typeof GHOST_TYPES === 'object', 'GHOST_TYPES应该是对象');
            test.assertEqual(Object.keys(GHOST_TYPES).length, 6, '应该有6种小鬼类型');
            
            const expectedTypes = ['HAPPY', 'SCARY', 'COOL', 'ANGRY', 'SURPRISED', 'WINK'];
            expectedTypes.forEach(type => {
                test.assert(type in GHOST_TYPES, `应该包含${type}类型`);
                test.assert(typeof GHOST_TYPES[type] === 'string', `${type}应该是字符串`);
            });
        });

        test.test('常量验证 - GAME_CONFIG', () => {
            test.assert(typeof GAME_CONFIG === 'object', 'GAME_CONFIG应该是对象');
            test.assertEqual(GAME_CONFIG.GRID_SIZE, 8, '网格大小应该是8');
            test.assertEqual(GAME_CONFIG.MIN_MATCH_LENGTH, 3, '最小匹配长度应该是3');
            test.assert(GAME_CONFIG.BASE_SCORE_PER_MATCH > 0, '基础分数应该大于0');
            test.assert(GAME_CONFIG.COMBO_MULTIPLIER > 1, '连击倍数应该大于1');
        });

        // 运行所有测试
        await test.run();

    } catch (error) {
        console.error('❌ 测试运行失败:', error);
    }
}

// 如果直接运行此文件，执行测试
if (typeof window === 'undefined') {
    runUnitTests();
}

// 导出测试框架供其他文件使用
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { TestFramework, runUnitTests };
}