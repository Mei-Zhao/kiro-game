# 设计文档

## 概述

小鬼消消乐是一个单页面网页应用，采用纯前端技术栈实现。游戏使用模块化的JavaScript架构，通过Canvas或DOM元素渲染游戏界面，实现流畅的三消游戏体验。设计重点关注性能优化、响应式布局和用户体验。

## 架构

### 整体架构
```
┌─────────────────┐
│   HTML5 页面    │
├─────────────────┤
│   CSS 样式层    │
├─────────────────┤
│  JavaScript层   │
│  ┌───────────┐  │
│  │游戏引擎   │  │
│  ├───────────┤  │
│  │渲染系统   │  │
│  ├───────────┤  │
│  │音频系统   │  │
│  ├───────────┤  │
│  │存储系统   │  │
│  └───────────┘  │
└─────────────────┘
```

### 技术栈
- **HTML5**: 页面结构和Canvas渲染
- **CSS3**: 样式、动画和响应式布局
- **Vanilla JavaScript**: 游戏逻辑和交互
- **LocalStorage**: 本地数据持久化
- **Web Audio API**: 音效生成

## 组件和接口

### 1. 游戏引擎 (GameEngine)
```javascript
class GameEngine {
  constructor(config)
  init()
  start()
  pause()
  reset()
  update()
  handleInput(event)
}
```

**职责:**
- 管理游戏状态和生命周期
- 协调各个子系统
- 处理游戏循环

### 2. 游戏网格 (GameGrid)
```javascript
class GameGrid {
  constructor(rows, cols)
  initializeGrid()
  getCell(row, col)
  setCell(row, col, value)
  swapCells(pos1, pos2)
  findMatches()
  removeMatches(matches)
  applyGravity()
  fillEmptySpaces()
}
```

**职责:**
- 管理8x8游戏网格
- 处理元素交换逻辑
- 检测三消匹配
- 实现重力效果

### 3. 匹配检测器 (MatchDetector)
```javascript
class MatchDetector {
  findHorizontalMatches(grid)
  findVerticalMatches(grid)
  findAllMatches(grid)
  isValidMatch(match)
}
```

**职责:**
- 检测水平和垂直的三消组合
- 支持L型和T型匹配
- 返回匹配结果数据

### 4. 渲染系统 (Renderer)
```javascript
class Renderer {
  constructor(canvas)
  render(gameState)
  renderGrid(grid)
  renderUI(score, highScore)
  playAnimation(type, position)
}
```

**职责:**
- 渲染游戏网格和UI元素
- 处理动画效果
- 响应式布局适配

### 5. 输入处理器 (InputHandler)
```javascript
class InputHandler {
  constructor(element)
  onMouseDown(event)
  onMouseMove(event)
  onMouseUp(event)
  onTouchStart(event)
  onTouchMove(event)
  onTouchEnd(event)
}
```

**职责:**
- 统一处理鼠标和触摸输入
- 实现拖拽交换逻辑
- 防止误操作

### 6. 音频系统 (AudioSystem)
```javascript
class AudioSystem {
  constructor()
  generateTone(frequency, duration, type)
  playMatchSound()
  playComboSound()
  playMoveSound()
  toggleMute()
}
```

**职责:**
- 使用Web Audio API生成音效
- 管理音频状态
- 提供音效开关功能

### 7. 存储管理器 (StorageManager)
```javascript
class StorageManager {
  saveHighScore(score)
  getHighScore()
  saveGameState(state)
  loadGameState()
}
```

**职责:**
- 管理LocalStorage数据
- 持久化游戏状态和分数

## 数据模型

### 游戏状态 (GameState)
```javascript
const gameState = {
  grid: Array(8).fill().map(() => Array(8).fill(0)),
  score: 0,
  highScore: 0,
  isPlaying: false,
  isPaused: false,
  selectedCell: null,
  animationQueue: [],
  comboMultiplier: 1
}
```

### 游戏元素类型
```javascript
const GHOST_TYPES = {
  HAPPY: '😊',
  SCARY: '👻',
  COOL: '😎',
  ANGRY: '😠',
  SURPRISED: '😲',
  WINK: '😉'
}
```

### 匹配结果
```javascript
const matchResult = {
  positions: [{row: 0, col: 0}, {row: 0, col: 1}, {row: 0, col: 2}],
  type: 'horizontal',
  length: 3,
  score: 30
}
```

## 错误处理

### 1. 输入验证
- 验证网格边界
- 检查有效的交换操作
- 防止在动画期间的操作

### 2. 状态管理
- 确保游戏状态一致性
- 处理异步操作冲突
- 恢复机制

### 3. 存储错误
- LocalStorage可用性检查
- 数据格式验证
- 降级处理

### 4. 渲染错误
- Canvas支持检测
- 动画性能监控
- 降级到DOM渲染

## 测试策略

### 1. 单元测试
- **GameGrid**: 网格操作、匹配检测、重力效果
- **MatchDetector**: 各种匹配模式的检测
- **StorageManager**: 数据持久化功能

### 2. 集成测试
- 完整的游戏流程测试
- 连锁反应逻辑验证
- 跨设备兼容性测试

### 3. 性能测试
- 动画帧率监控
- 内存使用优化
- 大量连锁反应的性能

### 4. 用户体验测试
- 响应式布局验证
- 触摸操作准确性
- 音效同步测试

## 关键设计决策

### 1. 渲染方案
**决策**: 使用DOM + CSS动画而非Canvas
**理由**: 
- 更好的响应式支持
- CSS动画性能优异
- 更容易实现复杂的UI效果
- 更好的可访问性

### 2. 状态管理
**决策**: 使用简单的状态对象而非复杂的状态管理库
**理由**:
- 游戏状态相对简单
- 避免过度工程化
- 更好的性能表现

### 3. 音频实现
**决策**: 使用Web Audio API生成音效而非预录制音频
**理由**:
- 减少资源加载时间
- 更小的文件体积
- 可以动态调整音效参数

### 4. 动画策略
**决策**: CSS Transitions + JavaScript控制
**理由**:
- 硬件加速支持
- 流畅的动画效果
- 易于维护和调试

### 5. 网格大小
**决策**: 固定8x8网格
**理由**:
- 平衡游戏难度和可玩性
- 适合各种屏幕尺寸
- 经典三消游戏标准