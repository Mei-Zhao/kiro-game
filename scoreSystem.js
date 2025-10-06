// 分数系统 - 处理分数计算和显示

// 分数配置常量
const SCORE_CONFIG = {
    // 基础分数
    BASE_SCORE_PER_ELEMENT: 10,
    
    // 匹配长度奖励
    LENGTH_MULTIPLIERS: {
        3: 1.0,    // 三消基础倍数
        4: 1.5,    // 四消奖励
        5: 2.0,    // 五消奖励
        6: 2.5,    // 六消奖励
        7: 3.0,    // 七消奖励
        8: 4.0     // 八消奖励
    },
    
    // 连锁反应倍数
    CHAIN_MULTIPLIERS: {
        1: 1.0,    // 第一次匹配
        2: 1.2,    // 第二次连锁
        3: 1.5,    // 第三次连锁
        4: 2.0,    // 第四次连锁
        5: 2.5,    // 第五次连锁
        6: 3.0,    // 第六次连锁
        7: 4.0,    // 第七次连锁
        8: 5.0     // 第八次及以上连锁
    },
    
    // 特殊匹配奖励
    SPECIAL_MATCH_BONUSES: {
        'L-shape': 50,
        'T-shape': 75,
        'cross': 100
    },
    
    // 连击奖励（短时间内多次匹配）
    COMBO_TIME_WINDOW: 3000, // 3秒内的连击窗口
    COMBO_MULTIPLIER: 1.1,   // 每次连击的额外倍数
    
    // 分数显示动画配置
    SCORE_ANIMATION_DURATION: 800,
    FLOATING_SCORE_DURATION: 1200
};

// 分数系统类
class ScoreSystem {
    constructor() {
        this.currentScore = 0;
        this.highScore = 0;
        this.chainLevel = 0;
        this.comboCount = 0;
        this.lastMatchTime = 0;
        this.scoreHistory = [];
        this.sessionStats = {
            totalMatches: 0,
            totalChains: 0,
            maxChainLevel: 0,
            maxCombo: 0,
            totalElementsCleared: 0
        };
    }

    // 初始化分数系统
    initialize() {
        this.currentScore = 0;
        this.chainLevel = 0;
        this.comboCount = 0;
        this.lastMatchTime = 0;
        this.scoreHistory = [];
        this.resetSessionStats();
        
        console.log('分数系统初始化完成');
    }

    // 重置会话统计
    resetSessionStats() {
        this.sessionStats = {
            totalMatches: 0,
            totalChains: 0,
            maxChainLevel: 0,
            maxCombo: 0,
            totalElementsCleared: 0
        };
    }

    // 计算基础匹配分数
    calculateMatchScore(matches) {
        if (!matches || matches.length === 0) {
            return 0;
        }

        let totalScore = 0;
        let totalElements = 0;

        for (const match of matches) {
            const elementCount = match.positions ? match.positions.length : match.length;
            const matchLength = elementCount;
            
            // 基础分数
            let matchScore = elementCount * SCORE_CONFIG.BASE_SCORE_PER_ELEMENT;
            
            // 长度奖励倍数
            const lengthMultiplier = SCORE_CONFIG.LENGTH_MULTIPLIERS[matchLength] || 
                                   SCORE_CONFIG.LENGTH_MULTIPLIERS[8]; // 超过8个使用最高倍数
            matchScore *= lengthMultiplier;
            
            // 特殊匹配奖励
            if (match.type && SCORE_CONFIG.SPECIAL_MATCH_BONUSES[match.type]) {
                matchScore += SCORE_CONFIG.SPECIAL_MATCH_BONUSES[match.type];
            }
            
            totalScore += matchScore;
            totalElements += elementCount;
        }

        return {
            baseScore: totalScore,
            elementCount: totalElements,
            matchCount: matches.length
        };
    }

    // 计算连锁反应分数
    calculateChainScore(baseScore, chainLevel) {
        if (chainLevel <= 1) {
            return baseScore;
        }

        const chainMultiplier = SCORE_CONFIG.CHAIN_MULTIPLIERS[chainLevel] || 
                               SCORE_CONFIG.CHAIN_MULTIPLIERS[8]; // 超过8级使用最高倍数
        
        return Math.floor(baseScore * chainMultiplier);
    }

    // 计算连击奖励
    calculateComboBonus(baseScore, comboCount) {
        if (comboCount <= 1) {
            return 0;
        }

        const comboBonus = baseScore * (comboCount - 1) * SCORE_CONFIG.COMBO_MULTIPLIER;
        return Math.floor(comboBonus);
    }

    // 处理匹配得分
    processMatchScore(matches, isChainReaction = false) {
        const currentTime = Date.now();
        
        // 计算基础分数
        const matchResult = this.calculateMatchScore(matches);
        let finalScore = matchResult.baseScore;
        
        // 处理连锁反应
        if (isChainReaction) {
            this.chainLevel++;
            finalScore = this.calculateChainScore(matchResult.baseScore, this.chainLevel);
            this.sessionStats.totalChains++;
            this.sessionStats.maxChainLevel = Math.max(this.sessionStats.maxChainLevel, this.chainLevel);
        } else {
            // 重置连锁等级（新的匹配序列开始）
            this.chainLevel = 1;
        }
        
        // 处理连击奖励
        if (currentTime - this.lastMatchTime <= SCORE_CONFIG.COMBO_TIME_WINDOW) {
            this.comboCount++;
        } else {
            this.comboCount = 1;
        }
        
        const comboBonus = this.calculateComboBonus(matchResult.baseScore, this.comboCount);
        finalScore += comboBonus;
        
        // 更新分数
        this.addScore(finalScore);
        
        // 更新统计信息
        this.sessionStats.totalMatches++;
        this.sessionStats.totalElementsCleared += matchResult.elementCount;
        this.sessionStats.maxCombo = Math.max(this.sessionStats.maxCombo, this.comboCount);
        this.lastMatchTime = currentTime;
        
        // 记录分数历史
        const scoreEntry = {
            timestamp: currentTime,
            baseScore: matchResult.baseScore,
            chainLevel: this.chainLevel,
            comboCount: this.comboCount,
            comboBonus: comboBonus,
            finalScore: finalScore,
            matchCount: matchResult.matchCount,
            elementCount: matchResult.elementCount,
            isChainReaction: isChainReaction
        };
        
        this.scoreHistory.push(scoreEntry);
        
        console.log('分数计算完成:', scoreEntry);
        
        return scoreEntry;
    }

    // 添加分数
    addScore(points) {
        if (points <= 0) return;
        
        this.currentScore += points;
        
        // 检查是否创造新的最高分
        if (this.currentScore > this.highScore) {
            this.highScore = this.currentScore;
        }
    }

    // 获取当前分数
    getCurrentScore() {
        return this.currentScore;
    }

    // 获取最高分数
    getHighScore() {
        return this.highScore;
    }

    // 设置最高分数（从存储加载时使用）
    setHighScore(score) {
        if (typeof score === 'number' && score >= 0) {
            this.highScore = Math.max(this.highScore, score);
        }
    }

    // 重置当前分数
    resetCurrentScore() {
        this.currentScore = 0;
        this.chainLevel = 0;
        this.comboCount = 0;
        this.lastMatchTime = 0;
        this.scoreHistory = [];
        this.resetSessionStats();
    }

    // 获取连锁等级
    getChainLevel() {
        return this.chainLevel;
    }

    // 获取连击数
    getComboCount() {
        return this.comboCount;
    }

    // 重置连锁等级（连锁结束时调用）
    resetChainLevel() {
        this.chainLevel = 0;
    }

    // 获取分数统计信息
    getScoreStats() {
        return {
            currentScore: this.currentScore,
            highScore: this.highScore,
            chainLevel: this.chainLevel,
            comboCount: this.comboCount,
            sessionStats: { ...this.sessionStats },
            averageScorePerMatch: this.sessionStats.totalMatches > 0 ? 
                Math.floor(this.currentScore / this.sessionStats.totalMatches) : 0
        };
    }

    // 获取最近的分数历史
    getRecentScoreHistory(count = 10) {
        return this.scoreHistory.slice(-count);
    }

    // 计算分数增长率
    getScoreGrowthRate() {
        if (this.scoreHistory.length < 2) {
            return 0;
        }

        const recent = this.scoreHistory.slice(-5); // 最近5次匹配
        if (recent.length < 2) {
            return 0;
        }

        const totalScore = recent.reduce((sum, entry) => sum + entry.finalScore, 0);
        return Math.floor(totalScore / recent.length);
    }

    // 格式化分数显示
    formatScore(score) {
        if (score >= 1000000) {
            return (score / 1000000).toFixed(1) + 'M';
        } else if (score >= 1000) {
            return (score / 1000).toFixed(1) + 'K';
        }
        return score.toString();
    }

    // 获取分数等级
    getScoreRank() {
        const score = this.currentScore;
        
        if (score >= 100000) return { rank: 'S', name: '传奇大师' };
        if (score >= 50000) return { rank: 'A+', name: '超级高手' };
        if (score >= 25000) return { rank: 'A', name: '消除高手' };
        if (score >= 10000) return { rank: 'B+', name: '熟练玩家' };
        if (score >= 5000) return { rank: 'B', name: '进阶玩家' };
        if (score >= 2000) return { rank: 'C+', name: '有经验者' };
        if (score >= 1000) return { rank: 'C', name: '初级玩家' };
        if (score >= 500) return { rank: 'D', name: '新手玩家' };
        
        return { rank: 'E', name: '初学者' };
    }

    // 检查是否达成分数里程碑
    checkScoreMilestones(previousScore) {
        const milestones = [500, 1000, 2000, 5000, 10000, 25000, 50000, 100000];
        const achievedMilestones = [];
        
        for (const milestone of milestones) {
            if (previousScore < milestone && this.currentScore >= milestone) {
                achievedMilestones.push(milestone);
            }
        }
        
        return achievedMilestones;
    }

    // 获取下一个里程碑
    getNextMilestone() {
        const milestones = [500, 1000, 2000, 5000, 10000, 25000, 50000, 100000];
        
        for (const milestone of milestones) {
            if (this.currentScore < milestone) {
                return {
                    target: milestone,
                    remaining: milestone - this.currentScore,
                    progress: this.currentScore / milestone
                };
            }
        }
        
        return null; // 已达到最高里程碑
    }

    // 导出分数数据（用于调试和分析）
    exportScoreData() {
        return {
            currentScore: this.currentScore,
            highScore: this.highScore,
            chainLevel: this.chainLevel,
            comboCount: this.comboCount,
            sessionStats: { ...this.sessionStats },
            scoreHistory: [...this.scoreHistory],
            scoreRank: this.getScoreRank(),
            nextMilestone: this.getNextMilestone()
        };
    }

    // 从导出的数据恢复分数系统状态
    importScoreData(data) {
        if (!data || typeof data !== 'object') {
            console.warn('无效的分数数据');
            return false;
        }

        try {
            this.currentScore = data.currentScore || 0;
            this.highScore = data.highScore || 0;
            this.chainLevel = data.chainLevel || 0;
            this.comboCount = data.comboCount || 0;
            this.sessionStats = data.sessionStats || this.sessionStats;
            this.scoreHistory = data.scoreHistory || [];
            
            console.log('分数数据恢复成功');
            return true;
        } catch (error) {
            console.error('分数数据恢复失败:', error);
            return false;
        }
    }
}

// 创建分数系统实例的工厂函数
function createScoreSystem() {
    const scoreSystem = new ScoreSystem();
    
    console.log('分数系统创建完成');
    
    return scoreSystem;
}

// 分数显示更新函数
function updateScoreDisplay(scoreSystem, renderer) {
    if (!scoreSystem || !renderer) {
        console.warn('分数显示更新失败: 缺少必要组件');
        return;
    }

    try {
        const stats = scoreSystem.getScoreStats();
        const rank = scoreSystem.getScoreRank();
        const nextMilestone = scoreSystem.getNextMilestone();
        
        // 更新分数显示
        const currentScoreElement = document.getElementById('current-score');
        if (currentScoreElement) {
            currentScoreElement.textContent = scoreSystem.formatScore(stats.currentScore);
        }
        
        const highScoreElement = document.getElementById('high-score');
        if (highScoreElement) {
            highScoreElement.textContent = scoreSystem.formatScore(stats.highScore);
        }
        
        // 更新连锁和连击显示
        const chainElement = document.getElementById('chain-level');
        if (chainElement) {
            chainElement.textContent = stats.chainLevel > 1 ? `${stats.chainLevel}x 连锁` : '';
        }
        
        const comboElement = document.getElementById('combo-count');
        if (comboElement) {
            comboElement.textContent = stats.comboCount > 1 ? `${stats.comboCount}x 连击` : '';
        }
        
        // 更新等级显示
        const rankElement = document.getElementById('score-rank');
        if (rankElement) {
            rankElement.textContent = `${rank.rank} - ${rank.name}`;
        }
        
        // 更新里程碑进度
        const milestoneElement = document.getElementById('milestone-progress');
        if (milestoneElement && nextMilestone) {
            const progressPercent = Math.floor(nextMilestone.progress * 100);
            milestoneElement.textContent = `下一目标: ${scoreSystem.formatScore(nextMilestone.target)} (${progressPercent}%)`;
        }
        
    } catch (error) {
        console.error('分数显示更新失败:', error);
    }
}

// 播放分数动画
function playScoreAnimation(scoreEntry, renderer, audioSystem) {
    if (!scoreEntry || !renderer) {
        return;
    }

    try {
        // 播放分数增加动画
        const scoreElement = document.getElementById('current-score');
        if (scoreElement && renderer.playScoreAnimation) {
            renderer.playScoreAnimation(scoreEntry.finalScore, scoreElement);
        }
        
        // 播放连锁反应特效
        if (scoreEntry.chainLevel > 1 && renderer.playChainAnimation) {
            renderer.playChainAnimation(scoreEntry.chainLevel);
        }
        
        // 播放连击特效
        if (scoreEntry.comboCount > 1 && renderer.playComboAnimation) {
            renderer.playComboAnimation(scoreEntry.comboCount);
        }
        
        // 播放相应的音效
        if (audioSystem) {
            if (scoreEntry.chainLevel > 1) {
                audioSystem.playChainReactionSound(scoreEntry.chainLevel);
            } else if (scoreEntry.comboCount > 1) {
                audioSystem.playComboSound(scoreEntry.comboCount);
            } else {
                audioSystem.playMatchSound();
            }
        }
        
    } catch (error) {
        console.error('分数动画播放失败:', error);
    }
}

// 导出分数系统相关功能
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        ScoreSystem,
        createScoreSystem,
        updateScoreDisplay,
        playScoreAnimation,
        SCORE_CONFIG
    };
} else {
    // 浏览器环境 - 将所有导出暴露到全局作用域
    window.ScoreSystem = ScoreSystem;
    window.createScoreSystem = createScoreSystem;
    window.updateScoreDisplay = updateScoreDisplay;
    window.playScoreAnimation = playScoreAnimation;
    window.SCORE_CONFIG = SCORE_CONFIG;
}