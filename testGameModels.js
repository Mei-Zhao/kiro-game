// 简单测试游戏数据模型功能

// 由于使用了 await，需要包装在 async 函数中
async function runTests() {

// 导入游戏模型 - 使用动态导入
const gameModels = await import('./gameModels.js');
const {
  GHOST_TYPES,
  GAME_CONFIG,
  GameGrid,
  MatchDetector,
  ChainReactionSystem,
  createInitialGameState,
  initializeGameGrid,
  createPosition,
  createMatchResult,
  createChainReactionResult,
  createChainStepResult,
  isValidPosition,
  arePositionsAdjacent
} = gameModels;

// 测试常量定义
console.log('测试 GHOST_TYPES 常量:');
console.log('GHOST_TYPES:', GHOST_TYPES);
console.log('包含6种小鬼类型:', Object.keys(GHOST_TYPES).length === 6);

console.log('\n测试 GAME_CONFIG 常量:');
console.log('GAME_CONFIG:', GAME_CONFIG);
console.log('网格大小为8:', GAME_CONFIG.GRID_SIZE === 8);

// 测试游戏状态初始化
console.log('\n测试游戏状态初始化:');
const gameState = createInitialGameState();
console.log('初始游戏状态:', gameState);
console.log('网格是8x8:', gameState.grid.length === 8 && gameState.grid[0].length === 8);
console.log('初始分数为0:', gameState.score === 0);
console.log('游戏未开始:', gameState.isPlaying === false);

// 测试网格初始化
console.log('\n测试网格初始化:');
const grid = initializeGameGrid();
console.log('初始化的网格:');
for (let row = 0; row < GAME_CONFIG.GRID_SIZE; row++) {
  let rowStr = '';
  for (let col = 0; col < GAME_CONFIG.GRID_SIZE; col++) {
    rowStr += GHOST_TYPES[grid[row][col]] + ' ';
  }
  console.log(rowStr);
}

// 验证网格中没有初始三消组合
console.log('\n验证网格中没有初始三消组合:');
let hasInitialMatches = false;

// 检查水平三消
for (let row = 0; row < GAME_CONFIG.GRID_SIZE; row++) {
  for (let col = 0; col < GAME_CONFIG.GRID_SIZE - 2; col++) {
    if (grid[row][col] === grid[row][col + 1] && 
        grid[row][col] === grid[row][col + 2]) {
      hasInitialMatches = true;
      console.log(`发现水平三消在位置 (${row}, ${col})`);
    }
  }
}

// 检查垂直三消
for (let row = 0; row < GAME_CONFIG.GRID_SIZE - 2; row++) {
  for (let col = 0; col < GAME_CONFIG.GRID_SIZE; col++) {
    if (grid[row][col] === grid[row + 1][col] && 
        grid[row][col] === grid[row + 2][col]) {
      hasInitialMatches = true;
      console.log(`发现垂直三消在位置 (${row}, ${col})`);
    }
  }
}

console.log('网格中没有初始三消组合:', !hasInitialMatches);

// 测试辅助函数
console.log('\n测试辅助函数:');
const pos1 = createPosition(0, 0);
const pos2 = createPosition(0, 1);
const pos3 = createPosition(1, 1);

console.log('位置 (0,0) 和 (0,1) 相邻:', arePositionsAdjacent(pos1, pos2));
console.log('位置 (0,0) 和 (1,1) 不相邻:', !arePositionsAdjacent(pos1, pos3));
console.log('位置 (0,0) 有效:', isValidPosition(0, 0));
console.log('位置 (-1,0) 无效:', !isValidPosition(-1, 0));
console.log('位置 (8,8) 无效:', !isValidPosition(8, 8));

// 测试匹配结果创建
const matchResult = createMatchResult([pos1, pos2, createPosition(0, 2)], 'horizontal', 3);
console.log('匹配结果:', matchResult);
console.log('匹配分数正确:', matchResult.score === 30);

// 测试 GameGrid 类
console.log('\n测试 GameGrid 类:');

// 创建 GameGrid 实例
const gameGrid = new GameGrid();
console.log('GameGrid 实例创建成功');
console.log('网格大小正确:', gameGrid.size === 8);
console.log('网格已初始化:', gameGrid.grid !== null);

// 测试基础操作
console.log('\n测试基础操作:');
const testValue = 'HAPPY';
gameGrid.setCell(0, 0, testValue);
console.log('设置单元格成功:', gameGrid.getCell(0, 0) === testValue);

// 测试边界检查
console.log('\n测试边界检查:');
console.log('有效位置检查 (0,0):', gameGrid.isValidPosition(0, 0));
console.log('无效位置检查 (-1,0):', !gameGrid.isValidPosition(-1, 0));
console.log('无效位置检查 (8,8):', !gameGrid.isValidPosition(8, 8));

// 测试相邻位置
console.log('\n测试相邻位置:');
const adjacentPositions = gameGrid.getAdjacentPositions(1, 1);
console.log('位置 (1,1) 的相邻位置数量:', adjacentPositions.length === 4);

const cornerAdjacent = gameGrid.getAdjacentPositions(0, 0);
console.log('角落位置 (0,0) 的相邻位置数量:', cornerAdjacent.length === 2);

// 测试交换功能
console.log('\n测试交换功能:');
gameGrid.setCell(0, 0, 'HAPPY');
gameGrid.setCell(0, 1, 'SCARY');

const swapResult = gameGrid.swapCells({row: 0, col: 0}, {row: 0, col: 1});
console.log('交换操作成功:', swapResult.success);
console.log('交换后值正确:', gameGrid.getCell(0, 0) === 'SCARY' && gameGrid.getCell(0, 1) === 'HAPPY');

// 测试撤销交换
const undoResult = gameGrid.undoSwap(swapResult);
console.log('撤销交换成功:', undoResult.success);
console.log('撤销后值恢复:', gameGrid.getCell(0, 0) === 'HAPPY' && gameGrid.getCell(0, 1) === 'SCARY');

// 测试重力效果
console.log('\n测试重力效果:');
// 创建一个有空位的测试场景
gameGrid.setCell(6, 0, null);
gameGrid.setCell(7, 0, 'COOL');

const movements = gameGrid.applyGravity();
console.log('重力效果产生移动:', movements.length > 0);

// 测试填充空位
console.log('\n测试填充空位:');
gameGrid.setCell(0, 0, null);
gameGrid.setCell(1, 0, null);

const newElements = gameGrid.fillEmptySpaces();
console.log('填充了空位:', newElements.length >= 2);
console.log('网格已满:', gameGrid.isFull());

// 测试完整的重力和填充流程
console.log('\n测试完整的重力和填充流程:');
gameGrid.removeElements([{row: 3, col: 3}, {row: 4, col: 3}, {row: 5, col: 3}]);
const gravityResult = gameGrid.processGravityAndFill();
console.log('重力和填充流程完成:', gravityResult.totalSteps === 2);

console.log('\n✅ GameGrid 类测试完成！');

// 测试 MatchDetector 类
console.log('\n测试 MatchDetector 类:');

// 创建 MatchDetector 实例
const matchDetector = new MatchDetector();
console.log('MatchDetector 实例创建成功');
console.log('最小匹配长度正确:', matchDetector.minMatchLength === 3);

// 创建测试网格
console.log('\n创建测试网格:');
const testGrid = Array(8).fill().map(() => Array(8).fill(null));

// 设置水平三消测试
testGrid[0][0] = 'HAPPY';
testGrid[0][1] = 'HAPPY';
testGrid[0][2] = 'HAPPY';
testGrid[0][3] = 'SCARY';

// 设置垂直三消测试
testGrid[1][0] = 'COOL';
testGrid[2][0] = 'COOL';
testGrid[3][0] = 'COOL';
testGrid[4][0] = 'ANGRY';

// 设置四消测试
testGrid[5][0] = 'WINK';
testGrid[5][1] = 'WINK';
testGrid[5][2] = 'WINK';
testGrid[5][3] = 'WINK';

// 填充其他位置避免意外匹配
for (let row = 0; row < 8; row++) {
  for (let col = 0; col < 8; col++) {
    if (testGrid[row][col] === null) {
      testGrid[row][col] = 'SURPRISED';
    }
  }
}

// 避免意外的垂直匹配
testGrid[1][1] = 'ANGRY';
testGrid[2][1] = 'HAPPY';

console.log('测试网格:');
for (let row = 0; row < 8; row++) {
  let rowStr = '';
  for (let col = 0; col < 8; col++) {
    rowStr += GHOST_TYPES[testGrid[row][col]] + ' ';
  }
  console.log(rowStr);
}

// 测试水平匹配检测
console.log('\n测试水平匹配检测:');
const horizontalMatches = matchDetector.findHorizontalMatches(testGrid);
console.log('找到水平匹配数量:', horizontalMatches.length);
console.log('第一个水平匹配:', horizontalMatches[0]);
console.log('水平匹配位置正确:', 
  horizontalMatches[0] && 
  horizontalMatches[0].positions.length === 3 &&
  horizontalMatches[0].type === 'horizontal'
);

// 测试垂直匹配检测
console.log('\n测试垂直匹配检测:');
const verticalMatches = matchDetector.findVerticalMatches(testGrid);
console.log('找到垂直匹配数量:', verticalMatches.length);
console.log('第一个垂直匹配:', verticalMatches[0]);
console.log('垂直匹配位置正确:', 
  verticalMatches[0] && 
  verticalMatches[0].positions.length === 3 &&
  verticalMatches[0].type === 'vertical'
);

// 测试所有匹配检测
console.log('\n测试所有匹配检测:');
const allMatches = matchDetector.findAllMatches(testGrid);
console.log('所有匹配结果:', allMatches);
console.log('总匹配数量正确:', allMatches.totalCount >= 3); // 至少有水平三消、垂直三消、水平四消
console.log('有匹配存在:', allMatches.hasMatches);

// 测试匹配验证
console.log('\n测试匹配验证:');
if (horizontalMatches.length > 0) {
  const isValid = matchDetector.isValidMatch(horizontalMatches[0]);
  console.log('水平匹配验证通过:', isValid);
}

if (verticalMatches.length > 0) {
  const isValid = matchDetector.isValidMatch(verticalMatches[0]);
  console.log('垂直匹配验证通过:', isValid);
}

// 测试无效匹配
const invalidMatch = { positions: [{row: 0, col: 0}], type: 'horizontal', length: 1 };
console.log('无效匹配被正确识别:', !matchDetector.isValidMatch(invalidMatch));

// 测试指定位置的匹配
console.log('\n测试指定位置的匹配:');
const matchesAt00 = matchDetector.getMatchesAt(testGrid, 0, 0);
console.log('位置 (0,0) 的匹配数量:', matchesAt00.length);
console.log('位置 (0,0) 有匹配:', matchDetector.hasMatchAt(testGrid, 0, 0));

const matchesAt44 = matchDetector.getMatchesAt(testGrid, 4, 4);
console.log('位置 (4,4) 的匹配数量:', matchesAt44.length);
console.log('位置 (4,4) 无匹配:', !matchDetector.hasMatchAt(testGrid, 4, 4));

// 测试匹配统计
console.log('\n测试匹配统计:');
const stats = matchDetector.getMatchStatistics(allMatches.all);
console.log('匹配统计:', stats);
console.log('总分数大于0:', stats.totalScore > 0);
console.log('按类型分组正确:', stats.byType.horizontal.length > 0 && stats.byType.vertical.length > 0);

// 测试空网格
console.log('\n测试空网格:');
const emptyGrid = Array(8).fill().map(() => Array(8).fill(null));
const emptyMatches = matchDetector.findAllMatches(emptyGrid);
console.log('空网格无匹配:', !emptyMatches.hasMatches);

// 测试单一类型网格（应该有很多匹配）
console.log('\n测试单一类型网格:');
const singleTypeGrid = Array(8).fill().map(() => Array(8).fill('HAPPY'));
const singleTypeMatches = matchDetector.findAllMatches(singleTypeGrid);
console.log('单一类型网格有大量匹配:', singleTypeMatches.totalCount > 10);

console.log('\n✅ MatchDetector 基础功能测试完成！');

// 测试高级匹配检测
console.log('\n测试高级匹配检测:');

// 创建包含L型和T型匹配的测试网格
const advancedTestGrid = Array(8).fill().map(() => Array(8).fill('SURPRISED'));

// 设置L型匹配 (右下L)
advancedTestGrid[1][1] = 'HAPPY';
advancedTestGrid[1][2] = 'HAPPY';
advancedTestGrid[1][3] = 'HAPPY';
advancedTestGrid[2][1] = 'HAPPY';
advancedTestGrid[3][1] = 'HAPPY';

// 设置T型匹配 (正T)
advancedTestGrid[5][3] = 'COOL';
advancedTestGrid[5][4] = 'COOL';
advancedTestGrid[5][5] = 'COOL';
advancedTestGrid[4][4] = 'COOL';
advancedTestGrid[3][4] = 'COOL';

console.log('高级测试网格:');
for (let row = 0; row < 8; row++) {
  let rowStr = '';
  for (let col = 0; col < 8; col++) {
    rowStr += GHOST_TYPES[advancedTestGrid[row][col]] + ' ';
  }
  console.log(rowStr);
}

// 测试L型匹配检测
console.log('\n测试L型匹配检测:');
const lShapeMatches = matchDetector.findLShapeMatches(advancedTestGrid);
console.log('找到L型匹配数量:', lShapeMatches.length);
if (lShapeMatches.length > 0) {
  console.log('第一个L型匹配:', lShapeMatches[0]);
  console.log('L型匹配类型正确:', lShapeMatches[0].type === 'L-shape');
  console.log('L型匹配长度正确:', lShapeMatches[0].length === 5);
}

// 测试T型匹配检测
console.log('\n测试T型匹配检测:');
const tShapeMatches = matchDetector.findTShapeMatches(advancedTestGrid);
console.log('找到T型匹配数量:', tShapeMatches.length);
if (tShapeMatches.length > 0) {
  console.log('第一个T型匹配:', tShapeMatches[0]);
  console.log('T型匹配类型正确:', tShapeMatches[0].type === 'T-shape');
  console.log('T型匹配长度正确:', tShapeMatches[0].length === 5);
}

// 测试所有高级匹配
console.log('\n测试所有高级匹配:');
const advancedMatches = matchDetector.findAdvancedMatches(advancedTestGrid);
console.log('高级匹配结果:', advancedMatches);
console.log('有高级匹配:', advancedMatches.hasAdvancedMatches);
console.log('高级匹配总数正确:', advancedMatches.totalCount >= 2);

// 测试完整的高级匹配检测
console.log('\n测试完整的高级匹配检测:');
const allAdvancedMatches = matchDetector.findAllMatchesAdvanced(advancedTestGrid);
console.log('完整匹配结果总数:', allAdvancedMatches.totalCount);
console.log('包含基础和高级匹配:', allAdvancedMatches.hasMatches);

// 测试匹配优先级
console.log('\n测试匹配优先级:');
if (lShapeMatches.length > 0 && tShapeMatches.length > 0) {
  const lPriority = matchDetector.getMatchPriority(lShapeMatches[0]);
  const tPriority = matchDetector.getMatchPriority(tShapeMatches[0]);
  console.log('L型匹配优先级:', lPriority);
  console.log('T型匹配优先级:', tPriority);
  console.log('T型优先级高于L型:', tPriority > lPriority);
}

// 测试高级分数计算
console.log('\n测试高级分数计算:');
if (lShapeMatches.length > 0) {
  const originalScore = lShapeMatches[0].score;
  const advancedScore = matchDetector.calculateAdvancedScore(lShapeMatches[0], 1);
  const comboScore = matchDetector.calculateAdvancedScore(lShapeMatches[0], 2);
  
  console.log('原始分数:', originalScore);
  console.log('高级分数:', advancedScore);
  console.log('连锁分数 (x2):', comboScore);
  console.log('高级分数高于原始分数:', advancedScore > originalScore);
  console.log('连锁分数正确:', comboScore === advancedScore * 2);
}

// 测试最优匹配组合
console.log('\n测试最优匹配组合:');
const optimalMatches = matchDetector.getOptimalMatches(advancedTestGrid, 1.5);
console.log('最优匹配数量:', optimalMatches.totalCount);
console.log('最优匹配总分:', optimalMatches.totalScore);
console.log('有最优匹配:', optimalMatches.hasMatches);

// 测试高级统计信息
console.log('\n测试高级统计信息:');
const advancedStats = matchDetector.getAdvancedMatchStatistics(optimalMatches.matches);
console.log('高级统计信息:', advancedStats);
console.log('包含L型和T型统计:', 
  advancedStats.byType.lShape.length >= 0 && 
  advancedStats.byType.tShape.length >= 0
);

// 测试四消、五消检测
console.log('\n测试长匹配检测:');
const longMatchGrid = Array(8).fill().map(() => Array(8).fill('SURPRISED'));

// 设置四消
longMatchGrid[0][0] = 'HAPPY';
longMatchGrid[0][1] = 'HAPPY';
longMatchGrid[0][2] = 'HAPPY';
longMatchGrid[0][3] = 'HAPPY';

// 设置五消
longMatchGrid[2][0] = 'COOL';
longMatchGrid[2][1] = 'COOL';
longMatchGrid[2][2] = 'COOL';
longMatchGrid[2][3] = 'COOL';
longMatchGrid[2][4] = 'COOL';

const longMatches = matchDetector.findHorizontalMatches(longMatchGrid);
console.log('长匹配数量:', longMatches.length);

const fourMatch = longMatches.find(m => m.length === 4);
const fiveMatch = longMatches.find(m => m.length === 5);

if (fourMatch) {
  console.log('四消检测成功:', fourMatch.length === 4);
  const fourScore = matchDetector.calculateAdvancedScore(fourMatch);
  console.log('四消分数 (有奖励):', fourScore > fourMatch.score);
}

if (fiveMatch) {
  console.log('五消检测成功:', fiveMatch.length === 5);
  const fiveScore = matchDetector.calculateAdvancedScore(fiveMatch);
  console.log('五消分数 (有奖励):', fiveScore > fiveMatch.score);
}

console.log('\n✅ MatchDetector 高级功能测试完成！');
console.log('\n✅ 所有测试完成！');

// 测试 ChainReactionSystem 类
console.log('\n测试 ChainReactionSystem 类:');

// 创建测试实例
const testGameGrid = new GameGrid();
const testMatchDetector = new MatchDetector();
const chainSystem = new ChainReactionSystem(testGameGrid, testMatchDetector);

console.log('ChainReactionSystem 实例创建成功');
console.log('初始连锁计数为0:', chainSystem.chainCount === 0);
console.log('初始倍数为1:', chainSystem.chainMultiplier === 1);
console.log('初始未处理状态:', !chainSystem.isProcessing);

// 测试连锁状态
console.log('\n测试连锁状态:');
const initialStatus = chainSystem.getChainStatus();
console.log('初始状态:', initialStatus);
console.log('状态正确:', 
  initialStatus.chainCount === 0 && 
  initialStatus.chainMultiplier === 1 && 
  !initialStatus.isProcessing
);

// 测试连锁倍数计算
console.log('\n测试连锁倍数计算:');
chainSystem.chainCount = 1;
chainSystem.updateChainMultiplier();
console.log('第1次连锁倍数:', chainSystem.chainMultiplier);

chainSystem.chainCount = 2;
chainSystem.updateChainMultiplier();
console.log('第2次连锁倍数:', chainSystem.chainMultiplier);

chainSystem.chainCount = 3;
chainSystem.updateChainMultiplier();
console.log('第3次连锁倍数:', chainSystem.chainMultiplier);

console.log('倍数递增正确:', chainSystem.chainMultiplier > 1);

// 测试下一个连锁倍数预测
console.log('\n测试下一个连锁倍数预测:');
chainSystem.chainCount = 0;
const nextMultiplier1 = chainSystem.getNextChainMultiplier();
chainSystem.chainCount = 1;
const nextMultiplier2 = chainSystem.getNextChainMultiplier();
chainSystem.chainCount = 2;
const nextMultiplier3 = chainSystem.getNextChainMultiplier();

console.log('第1次连锁预测倍数:', nextMultiplier1);
console.log('第2次连锁预测倍数:', nextMultiplier2);
console.log('第3次连锁预测倍数:', nextMultiplier3);
console.log('预测倍数递增:', nextMultiplier3 > nextMultiplier2 && nextMultiplier2 > nextMultiplier1);

// 测试重置功能
console.log('\n测试重置功能:');
chainSystem.chainCount = 5;
chainSystem.chainMultiplier = 3.0;
chainSystem.totalChainScore = 1000;
chainSystem.reset();

console.log('重置后连锁计数为0:', chainSystem.chainCount === 0);
console.log('重置后倍数为1:', chainSystem.chainMultiplier === 1);
console.log('重置后总分为0:', chainSystem.totalChainScore === 0);
console.log('重置后历史清空:', chainSystem.chainHistory.length === 0);

// 创建有连锁反应的测试网格
console.log('\n创建连锁反应测试网格:');
const chainTestGrid = new GameGrid();

// 手动设置一个会产生连锁反应的网格
// 第一层匹配
chainTestGrid.setCell(7, 0, 'HAPPY');
chainTestGrid.setCell(7, 1, 'HAPPY');
chainTestGrid.setCell(7, 2, 'HAPPY');

// 第二层（下落后会形成匹配）
chainTestGrid.setCell(6, 1, 'COOL');
chainTestGrid.setCell(5, 1, 'COOL');
chainTestGrid.setCell(4, 1, 'COOL');

// 填充其他位置
for (let row = 0; row < 8; row++) {
  for (let col = 0; col < 8; col++) {
    if (chainTestGrid.getCell(row, col) === null) {
      chainTestGrid.setCell(row, col, 'SURPRISED');
    }
  }
}

console.log('连锁测试网格:');
chainTestGrid.printGrid();

// 测试连锁反应预测
console.log('\n测试连锁反应预测:');
const chainTestSystem = new ChainReactionSystem(chainTestGrid, testMatchDetector);
const prediction = chainTestSystem.predictChainReaction();
console.log('连锁预测结果:', prediction);
console.log('预测有连锁:', prediction.estimatedChains > 0);
console.log('预测分数大于0:', prediction.estimatedScore > 0);
console.log('置信度有效:', ['low', 'medium', 'high'].includes(prediction.confidence));

// 测试单步连锁处理
console.log('\n测试单步连锁处理:');
const stepResult = await chainTestSystem.processChainStep();
console.log('单步处理结果:', stepResult);
console.log('处理成功:', stepResult.success);

if (stepResult.matchesFound > 0) {
  console.log('找到匹配:', stepResult.matchesFound > 0);
  console.log('计算了分数:', stepResult.score > 0);
  console.log('移除了元素:', stepResult.removedElements.length > 0);
}

// 测试匹配检测
console.log('\n测试匹配检测:');
chainTestSystem.isProcessing = true;
const hasMatches = chainTestSystem.hasMatches();
console.log('检测到匹配:', hasMatches);
chainTestSystem.isProcessing = false;

// 测试连锁反应完整流程（模拟）
console.log('\n测试连锁反应完整流程（模拟）:');

// 创建简单的连锁测试场景
const simpleChainGrid = new GameGrid();
// 设置底部三消
simpleChainGrid.setCell(7, 3, 'HAPPY');
simpleChainGrid.setCell(7, 4, 'HAPPY');
simpleChainGrid.setCell(7, 5, 'HAPPY');

// 设置会下落形成连锁的元素
simpleChainGrid.setCell(5, 4, 'COOL');
simpleChainGrid.setCell(4, 4, 'COOL');
simpleChainGrid.setCell(3, 4, 'COOL');

// 填充其他位置
for (let row = 0; row < 8; row++) {
  for (let col = 0; col < 8; col++) {
    if (simpleChainGrid.getCell(row, col) === null) {
      // 使用不同的类型避免意外匹配
      const types = ['SURPRISED', 'WINK', 'ANGRY'];
      const randomType = types[Math.floor(Math.random() * types.length)];
      simpleChainGrid.setCell(row, col, randomType);
    }
  }
}

console.log('简单连锁测试网格:');
simpleChainGrid.printGrid();

const simpleChainSystem = new ChainReactionSystem(simpleChainGrid, testMatchDetector);

// 模拟连锁反应开始
console.log('\n模拟连锁反应开始:');
simpleChainSystem.isProcessing = true;
simpleChainSystem.chainCount = 1;
simpleChainSystem.updateChainMultiplier();

// 添加模拟历史记录
simpleChainSystem.chainHistory.push({
  step: 1,
  matches: [{ positions: [{row: 7, col: 3}, {row: 7, col: 4}, {row: 7, col: 5}], type: 'horizontal', length: 3 }],
  score: 36, // 30 * 1.2
  multiplier: 1.2,
  timestamp: Date.now()
});

simpleChainSystem.totalChainScore = 36;

const chainStatus = simpleChainSystem.getChainStatus();
console.log('连锁状态:', chainStatus);
console.log('连锁计数正确:', chainStatus.chainCount === 1);
console.log('倍数正确:', chainStatus.chainMultiplier > 1);
console.log('总分正确:', chainStatus.totalScore === 36);

// 测试连锁统计
console.log('\n测试连锁统计:');
const chainStats = simpleChainSystem.getChainStatistics();
console.log('连锁统计:', chainStats);
console.log('统计正确:', 
  chainStats.totalChains === 1 && 
  chainStats.totalScore === 36 && 
  chainStats.maxMultiplier === 1.2
);

// 测试连锁历史
console.log('\n测试连锁历史:');
const chainHistory = simpleChainSystem.getChainHistory();
console.log('连锁历史长度:', chainHistory.length);
console.log('历史记录正确:', chainHistory.length === 1 && chainHistory[0].step === 1);

// 测试连锁验证
console.log('\n测试连锁验证:');
const validation = simpleChainSystem.validateChainReaction();
console.log('验证结果:', validation);
console.log('验证通过:', validation.isValid);
console.log('无错误:', validation.errors.length === 0);

// 测试连锁完成检测
console.log('\n测试连锁完成检测:');
simpleChainSystem.isProcessing = false;
const isComplete = simpleChainSystem.isChainReactionComplete();
console.log('连锁反应完成:', isComplete);

// 测试强制结束连锁
console.log('\n测试强制结束连锁:');
simpleChainSystem.isProcessing = true;
const forceEndResult = simpleChainSystem.forceEndChainReaction();
console.log('强制结束结果:', forceEndResult);
console.log('强制结束成功:', forceEndResult.forced);
console.log('处理状态已停止:', !simpleChainSystem.isProcessing);

// 测试详细报告
console.log('\n测试详细报告:');
const detailedReport = simpleChainSystem.getDetailedReport();
console.log('详细报告包含所有部分:', 
  detailedReport.status && 
  detailedReport.statistics && 
  detailedReport.history && 
  detailedReport.validation && 
  detailedReport.configuration
);

// 测试连锁反应结果创建函数
console.log('\n测试连锁反应结果创建函数:');
const chainResult = createChainReactionResult(3, 150, 1.44, []);
console.log('连锁结果:', chainResult);
console.log('结果格式正确:', 
  chainResult.chainCount === 3 && 
  chainResult.totalScore === 150 && 
  chainResult.success === true
);

// 测试连锁步骤结果创建函数
console.log('\n测试连锁步骤结果创建函数:');
const stepResultTest = createChainStepResult(1, [], 30, 1.2);
console.log('步骤结果:', stepResultTest);
console.log('步骤结果格式正确:', 
  stepResultTest.step === 1 && 
  stepResultTest.score === 30 && 
  stepResultTest.multiplier === 1.2
);

// 测试边界情况
console.log('\n测试边界情况:');

// 测试最大倍数限制
const maxChainSystem = new ChainReactionSystem(simpleChainGrid, testMatchDetector);
maxChainSystem.chainCount = 100; // 很大的连锁数
maxChainSystem.updateChainMultiplier();
console.log('最大倍数限制:', maxChainSystem.chainMultiplier <= GAME_CONFIG.MAX_CHAIN_MULTIPLIER);

// 测试空网格的连锁反应
const emptyChainGrid = new GameGrid();
for (let row = 0; row < 8; row++) {
  for (let col = 0; col < 8; col++) {
    emptyChainGrid.setCell(row, col, null);
  }
}

const emptyChainSystem = new ChainReactionSystem(emptyChainGrid, testMatchDetector);
emptyChainSystem.isProcessing = true;
const emptyHasMatches = emptyChainSystem.hasMatches();
console.log('空网格无匹配:', !emptyHasMatches);

// 测试无效连锁验证
console.log('\n测试无效连锁验证:');
const invalidChainSystem = new ChainReactionSystem(simpleChainGrid, testMatchDetector);
invalidChainSystem.chainCount = -1; // 无效值
invalidChainSystem.chainMultiplier = 0.5; // 无效值

const invalidValidation = invalidChainSystem.validateChainReaction();
console.log('无效连锁被检测:', !invalidValidation.isValid);
console.log('有错误信息:', invalidValidation.errors.length > 0);

console.log('\n✅ ChainReactionSystem 测试完成！');

// 测试连锁反应与其他系统的集成
console.log('\n测试连锁反应系统集成:');

// 创建集成测试场景
const integrationGrid = new GameGrid();
const integrationDetector = new MatchDetector();
const integrationChainSystem = new ChainReactionSystem(integrationGrid, integrationDetector);

// 设置一个复杂的连锁场景
integrationGrid.setCell(7, 2, 'HAPPY');
integrationGrid.setCell(7, 3, 'HAPPY');
integrationGrid.setCell(7, 4, 'HAPPY');

integrationGrid.setCell(6, 3, 'COOL');
integrationGrid.setCell(5, 3, 'COOL');
integrationGrid.setCell(4, 3, 'COOL');

integrationGrid.setCell(6, 2, 'WINK');
integrationGrid.setCell(5, 2, 'WINK');
integrationGrid.setCell(4, 2, 'WINK');

// 填充其他位置
for (let row = 0; row < 8; row++) {
  for (let col = 0; col < 8; col++) {
    if (integrationGrid.getCell(row, col) === null) {
      integrationGrid.setCell(row, col, 'SURPRISED');
    }
  }
}

console.log('集成测试网格:');
integrationGrid.printGrid();

// 测试完整的匹配-移除-重力-填充-连锁循环
console.log('\n测试完整的游戏循环:');

// 1. 检测初始匹配
const initialMatches = integrationDetector.findAllMatches(integrationGrid.getGrid());
console.log('初始匹配数量:', initialMatches.totalCount);

if (initialMatches.hasMatches) {
  // 2. 移除匹配元素
  const matchPositions = integrationDetector.getAllMatchPositions(initialMatches.all);
  const removedElements = integrationGrid.removeElements(matchPositions);
  console.log('移除元素数量:', removedElements.length);

  // 3. 应用重力
  const gravityMovements = integrationGrid.applyGravity();
  console.log('重力移动数量:', gravityMovements.length);

  // 4. 填充空位
  const newElements = integrationGrid.fillEmptySpacesIntelligently();
  console.log('新元素数量:', newElements.length);

  // 5. 检查是否有新的匹配（连锁）
  const newMatches = integrationDetector.findAllMatches(integrationGrid.getGrid());
  console.log('新匹配数量:', newMatches.totalCount);
  console.log('产生连锁反应:', newMatches.hasMatches);
}

// 测试分数计算集成
console.log('\n测试分数计算集成:');
if (initialMatches.hasMatches) {
  const baseScore = integrationDetector.calculateMatchScore(initialMatches.all);
  const chainMultiplier = integrationChainSystem.getNextChainMultiplier();
  const finalScore = Math.floor(baseScore * chainMultiplier);
  
  console.log('基础分数:', baseScore);
  console.log('连锁倍数:', chainMultiplier);
  console.log('最终分数:', finalScore);
  console.log('分数计算正确:', finalScore >= baseScore);
}

console.log('\n✅ 连锁反应系统集成测试完成！');
console.log('\n✅ 所有连锁反应测试完成！');

}

// 运行测试
runTests().catch(console.error);