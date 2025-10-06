// 简化的集成测试
console.log('🔧 开始运行简化集成测试...');

async function runSimpleIntegrationTests() {
    try {
        console.log('导入模块...');
        const gameModels = await import('./gameModels.js');
        console.log('gameModels 导入成功');
        
        const { GameGrid, MatchDetector, ChainReactionSystem } = gameModels;
        
        console.log('测试 1: 创建游戏组件');
        const gameGrid = new GameGrid();
        const matchDetector = new MatchDetector();
        const chainSystem = new ChainReactionSystem(gameGrid, matchDetector);
        
        console.log('✅ 游戏组件创建成功');
        
        console.log('测试 2: 基础功能验证');
        console.log('网格是否已满:', gameGrid.isFull());
        console.log('连锁系统初始状态:', chainSystem.getChainStatus());
        
        console.log('✅ 简化集成测试完成');
        
    } catch (error) {
        console.error('❌ 简化集成测试失败:', error);
    }
}

runSimpleIntegrationTests();