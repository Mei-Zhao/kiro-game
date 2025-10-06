// 存储管理器 - 处理本地存储功能

// 存储配置常量
const STORAGE_CONFIG = {
    // 存储键名
    KEYS: {
        HIGH_SCORE: 'ghost_match_high_score',
        GAME_STATE: 'ghost_match_game_state',
        AUDIO_SETTINGS: 'ghost_match_audio_settings',
        PLAYER_STATS: 'ghost_match_player_stats',
        GAME_SETTINGS: 'ghost_match_game_settings'
    },
    
    // 存储版本（用于数据迁移）
    VERSION: '1.0.0',
    VERSION_KEY: 'ghost_match_storage_version',
    
    // 数据压缩阈值（字节）
    COMPRESSION_THRESHOLD: 1024,
    
    // 自动保存间隔（毫秒）
    AUTO_SAVE_INTERVAL: 30000, // 30秒
    
    // 最大存储大小检查阈值
    MAX_STORAGE_SIZE: 5 * 1024 * 1024, // 5MB
    
    // 数据备份数量
    BACKUP_COUNT: 3
};

// 存储管理器类
class StorageManager {
    constructor() {
        this.isAvailable = this.checkStorageAvailability();
        this.autoSaveTimer = null;
        this.compressionEnabled = true;
        this.encryptionEnabled = false; // 简单的混淆，不是真正的加密
        
        // 初始化存储版本检查
        this.checkStorageVersion();
        
        console.log('存储管理器初始化完成，LocalStorage可用:', this.isAvailable);
    }

    // 检查LocalStorage可用性
    checkStorageAvailability() {
        try {
            const testKey = '__storage_test__';
            const testValue = 'test';
            
            localStorage.setItem(testKey, testValue);
            const retrieved = localStorage.getItem(testKey);
            localStorage.removeItem(testKey);
            
            return retrieved === testValue;
        } catch (error) {
            console.warn('LocalStorage不可用:', error.message);
            return false;
        }
    }

    // 检查存储版本并进行数据迁移
    checkStorageVersion() {
        if (!this.isAvailable) return;

        try {
            const currentVersion = localStorage.getItem(STORAGE_CONFIG.VERSION_KEY);
            
            if (!currentVersion) {
                // 首次使用，设置版本
                localStorage.setItem(STORAGE_CONFIG.VERSION_KEY, STORAGE_CONFIG.VERSION);
                console.log('首次使用，设置存储版本:', STORAGE_CONFIG.VERSION);
            } else if (currentVersion !== STORAGE_CONFIG.VERSION) {
                // 版本不匹配，进行数据迁移
                this.migrateStorageData(currentVersion, STORAGE_CONFIG.VERSION);
                localStorage.setItem(STORAGE_CONFIG.VERSION_KEY, STORAGE_CONFIG.VERSION);
            }
        } catch (error) {
            console.error('存储版本检查失败:', error);
        }
    }

    // 数据迁移（简单实现）
    migrateStorageData(fromVersion, toVersion) {
        console.log(`数据迁移: ${fromVersion} -> ${toVersion}`);
        
        try {
            // 这里可以实现具体的数据迁移逻辑
            // 目前只是简单的版本更新
            console.log('数据迁移完成');
        } catch (error) {
            console.error('数据迁移失败:', error);
        }
    }

    // 保存最高分数
    saveHighScore(score) {
        if (!this.isAvailable) {
            console.warn('LocalStorage不可用，无法保存最高分数');
            return false;
        }

        try {
            // 验证分数有效性
            if (typeof score !== 'number' || score < 0 || !isFinite(score)) {
                throw new Error('无效的分数值');
            }

            // 获取当前最高分
            const currentHighScore = this.getHighScore();
            
            // 只有新分数更高时才保存
            if (score > currentHighScore) {
                const scoreData = {
                    score: score,
                    timestamp: Date.now(),
                    version: STORAGE_CONFIG.VERSION
                };

                const serializedData = this.serializeData(scoreData);
                localStorage.setItem(STORAGE_CONFIG.KEYS.HIGH_SCORE, serializedData);
                
                console.log('最高分数保存成功:', score);
                return true;
            } else {
                console.log('分数未超过当前最高分，不保存');
                return false;
            }
        } catch (error) {
            console.error('保存最高分数失败:', error);
            return false;
        }
    }

    // 获取最高分数
    getHighScore() {
        if (!this.isAvailable) {
            return 0;
        }

        try {
            const serializedData = localStorage.getItem(STORAGE_CONFIG.KEYS.HIGH_SCORE);
            
            if (!serializedData) {
                return 0;
            }

            const scoreData = this.deserializeData(serializedData);
            
            // 验证数据完整性
            if (scoreData && typeof scoreData.score === 'number' && scoreData.score >= 0) {
                return scoreData.score;
            } else {
                console.warn('最高分数据损坏，返回默认值');
                return 0;
            }
        } catch (error) {
            console.error('获取最高分数失败:', error);
            return 0;
        }
    }

    // 保存游戏状态
    saveGameState(gameState) {
        if (!this.isAvailable) {
            console.warn('LocalStorage不可用，无法保存游戏状态');
            return false;
        }

        try {
            // 验证游戏状态对象
            if (!gameState || typeof gameState !== 'object') {
                throw new Error('无效的游戏状态对象');
            }

            // 创建保存数据
            const stateData = {
                gameState: gameState,
                timestamp: Date.now(),
                version: STORAGE_CONFIG.VERSION
            };

            const serializedData = this.serializeData(stateData);
            
            // 检查数据大小
            if (serializedData.length > STORAGE_CONFIG.MAX_STORAGE_SIZE) {
                console.warn('游戏状态数据过大，跳过保存');
                return false;
            }

            localStorage.setItem(STORAGE_CONFIG.KEYS.GAME_STATE, serializedData);
            
            console.log('游戏状态保存成功');
            return true;
        } catch (error) {
            console.error('保存游戏状态失败:', error);
            return false;
        }
    }

    // 加载游戏状态
    loadGameState() {
        if (!this.isAvailable) {
            return null;
        }

        try {
            const serializedData = localStorage.getItem(STORAGE_CONFIG.KEYS.GAME_STATE);
            
            if (!serializedData) {
                return null;
            }

            const stateData = this.deserializeData(serializedData);
            
            // 验证数据完整性
            if (stateData && stateData.gameState && typeof stateData.gameState === 'object') {
                console.log('游戏状态加载成功');
                return stateData.gameState;
            } else {
                console.warn('游戏状态数据损坏');
                return null;
            }
        } catch (error) {
            console.error('加载游戏状态失败:', error);
            return null;
        }
    }

    // 保存音频设置
    saveAudioSettings(audioSettings) {
        if (!this.isAvailable) {
            console.warn('LocalStorage不可用，无法保存音频设置');
            return false;
        }

        try {
            const settingsData = {
                audioSettings: audioSettings,
                timestamp: Date.now(),
                version: STORAGE_CONFIG.VERSION
            };

            const serializedData = this.serializeData(settingsData);
            localStorage.setItem(STORAGE_CONFIG.KEYS.AUDIO_SETTINGS, serializedData);
            
            console.log('音频设置保存成功');
            return true;
        } catch (error) {
            console.error('保存音频设置失败:', error);
            return false;
        }
    }

    // 加载音频设置
    loadAudioSettings() {
        if (!this.isAvailable) {
            return null;
        }

        try {
            const serializedData = localStorage.getItem(STORAGE_CONFIG.KEYS.AUDIO_SETTINGS);
            
            if (!serializedData) {
                return null;
            }

            const settingsData = this.deserializeData(serializedData);
            
            if (settingsData && settingsData.audioSettings) {
                console.log('音频设置加载成功');
                return settingsData.audioSettings;
            } else {
                console.warn('音频设置数据损坏');
                return null;
            }
        } catch (error) {
            console.error('加载音频设置失败:', error);
            return null;
        }
    }

    // 保存玩家统计数据
    savePlayerStats(playerStats) {
        if (!this.isAvailable) {
            console.warn('LocalStorage不可用，无法保存玩家统计');
            return false;
        }

        try {
            const statsData = {
                playerStats: playerStats,
                timestamp: Date.now(),
                version: STORAGE_CONFIG.VERSION
            };

            const serializedData = this.serializeData(statsData);
            localStorage.setItem(STORAGE_CONFIG.KEYS.PLAYER_STATS, serializedData);
            
            console.log('玩家统计保存成功');
            return true;
        } catch (error) {
            console.error('保存玩家统计失败:', error);
            return false;
        }
    }

    // 加载玩家统计数据
    loadPlayerStats() {
        if (!this.isAvailable) {
            return null;
        }

        try {
            const serializedData = localStorage.getItem(STORAGE_CONFIG.KEYS.PLAYER_STATS);
            
            if (!serializedData) {
                return null;
            }

            const statsData = this.deserializeData(serializedData);
            
            if (statsData && statsData.playerStats) {
                console.log('玩家统计加载成功');
                return statsData.playerStats;
            } else {
                console.warn('玩家统计数据损坏');
                return null;
            }
        } catch (error) {
            console.error('加载玩家统计失败:', error);
            return null;
        }
    }

    // 清除指定类型的数据
    clearData(dataType) {
        if (!this.isAvailable) {
            console.warn('LocalStorage不可用，无法清除数据');
            return false;
        }

        try {
            const key = STORAGE_CONFIG.KEYS[dataType];
            if (key) {
                localStorage.removeItem(key);
                console.log(`${dataType} 数据清除成功`);
                return true;
            } else {
                console.warn('未知的数据类型:', dataType);
                return false;
            }
        } catch (error) {
            console.error('清除数据失败:', error);
            return false;
        }
    }

    // 清除所有游戏数据
    clearAllData() {
        if (!this.isAvailable) {
            console.warn('LocalStorage不可用，无法清除数据');
            return false;
        }

        try {
            const keys = Object.values(STORAGE_CONFIG.KEYS);
            let clearedCount = 0;

            for (const key of keys) {
                try {
                    localStorage.removeItem(key);
                    clearedCount++;
                } catch (error) {
                    console.warn(`清除 ${key} 失败:`, error);
                }
            }

            // 也清除版本信息
            localStorage.removeItem(STORAGE_CONFIG.VERSION_KEY);

            console.log(`所有游戏数据清除完成，共清除 ${clearedCount} 项`);
            return true;
        } catch (error) {
            console.error('清除所有数据失败:', error);
            return false;
        }
    }

    // 获取存储使用情况
    getStorageUsage() {
        if (!this.isAvailable) {
            return {
                available: false,
                totalSize: 0,
                usedSize: 0,
                freeSize: 0,
                items: []
            };
        }

        try {
            const items = [];
            let totalUsed = 0;

            // 计算每个键的大小
            for (const [keyName, key] of Object.entries(STORAGE_CONFIG.KEYS)) {
                try {
                    const value = localStorage.getItem(key);
                    const size = value ? new Blob([value]).size : 0;
                    
                    items.push({
                        name: keyName,
                        key: key,
                        size: size,
                        exists: value !== null
                    });
                    
                    totalUsed += size;
                } catch (error) {
                    console.warn(`获取 ${key} 大小失败:`, error);
                }
            }

            // 估算总可用空间（大多数浏览器为5-10MB）
            const estimatedTotal = 5 * 1024 * 1024; // 5MB

            return {
                available: true,
                totalSize: estimatedTotal,
                usedSize: totalUsed,
                freeSize: estimatedTotal - totalUsed,
                items: items,
                usagePercent: (totalUsed / estimatedTotal) * 100
            };
        } catch (error) {
            console.error('获取存储使用情况失败:', error);
            return {
                available: false,
                error: error.message
            };
        }
    }

    // 数据序列化（支持压缩和简单混淆）
    serializeData(data) {
        try {
            let serialized = JSON.stringify(data);

            // 简单的数据混淆（不是真正的加密）
            if (this.encryptionEnabled) {
                serialized = this.obfuscateData(serialized);
            }

            // 简单的压缩（对于大数据）
            if (this.compressionEnabled && serialized.length > STORAGE_CONFIG.COMPRESSION_THRESHOLD) {
                serialized = this.compressData(serialized);
            }

            return serialized;
        } catch (error) {
            console.error('数据序列化失败:', error);
            throw error;
        }
    }

    // 数据反序列化
    deserializeData(serializedData) {
        try {
            let data = serializedData;

            // 检查是否是压缩数据
            if (data.startsWith('COMPRESSED:')) {
                data = this.decompressData(data);
            }

            // 检查是否是混淆数据
            if (data.startsWith('OBFUSCATED:')) {
                data = this.deobfuscateData(data);
            }

            return JSON.parse(data);
        } catch (error) {
            console.error('数据反序列化失败:', error);
            throw error;
        }
    }

    // 简单的数据混淆
    obfuscateData(data) {
        // 简单的Base64编码作为混淆
        try {
            const encoded = btoa(unescape(encodeURIComponent(data)));
            return 'OBFUSCATED:' + encoded;
        } catch (error) {
            console.warn('数据混淆失败，使用原始数据');
            return data;
        }
    }

    // 简单的数据去混淆
    deobfuscateData(obfuscatedData) {
        try {
            const encoded = obfuscatedData.substring('OBFUSCATED:'.length);
            return decodeURIComponent(escape(atob(encoded)));
        } catch (error) {
            console.error('数据去混淆失败:', error);
            throw error;
        }
    }

    // 简单的数据压缩（使用LZ字符串压缩算法的简化版本）
    compressData(data) {
        try {
            // 这里实现一个简单的重复字符压缩
            let compressed = data.replace(/(.)\1{2,}/g, (match, char) => {
                return `${char}*${match.length}`;
            });
            
            return 'COMPRESSED:' + compressed;
        } catch (error) {
            console.warn('数据压缩失败，使用原始数据');
            return data;
        }
    }

    // 简单的数据解压缩
    decompressData(compressedData) {
        try {
            const compressed = compressedData.substring('COMPRESSED:'.length);
            
            // 解压缩重复字符
            const decompressed = compressed.replace(/(.)\*(\d+)/g, (match, char, count) => {
                return char.repeat(parseInt(count));
            });
            
            return decompressed;
        } catch (error) {
            console.error('数据解压缩失败:', error);
            throw error;
        }
    }

    // 启用自动保存
    enableAutoSave(saveCallback) {
        if (this.autoSaveTimer) {
            clearInterval(this.autoSaveTimer);
        }

        this.autoSaveTimer = setInterval(() => {
            try {
                if (typeof saveCallback === 'function') {
                    saveCallback();
                    console.log('自动保存执行完成');
                }
            } catch (error) {
                console.error('自动保存失败:', error);
            }
        }, STORAGE_CONFIG.AUTO_SAVE_INTERVAL);

        console.log('自动保存已启用，间隔:', STORAGE_CONFIG.AUTO_SAVE_INTERVAL / 1000, '秒');
    }

    // 禁用自动保存
    disableAutoSave() {
        if (this.autoSaveTimer) {
            clearInterval(this.autoSaveTimer);
            this.autoSaveTimer = null;
            console.log('自动保存已禁用');
        }
    }

    // 创建数据备份
    createBackup() {
        if (!this.isAvailable) {
            console.warn('LocalStorage不可用，无法创建备份');
            return false;
        }

        try {
            const backupData = {};
            
            // 收集所有游戏数据
            for (const [keyName, key] of Object.entries(STORAGE_CONFIG.KEYS)) {
                const value = localStorage.getItem(key);
                if (value) {
                    backupData[keyName] = value;
                }
            }

            // 添加备份元数据
            const backup = {
                data: backupData,
                timestamp: Date.now(),
                version: STORAGE_CONFIG.VERSION
            };

            // 保存备份
            const backupKey = `ghost_match_backup_${Date.now()}`;
            const serializedBackup = this.serializeData(backup);
            localStorage.setItem(backupKey, serializedBackup);

            // 清理旧备份
            this.cleanupOldBackups();

            console.log('数据备份创建成功:', backupKey);
            return backupKey;
        } catch (error) {
            console.error('创建数据备份失败:', error);
            return false;
        }
    }

    // 清理旧备份
    cleanupOldBackups() {
        try {
            const backupKeys = [];
            
            // 查找所有备份键
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith('ghost_match_backup_')) {
                    backupKeys.push(key);
                }
            }

            // 按时间戳排序（最新的在前）
            backupKeys.sort((a, b) => {
                const timestampA = parseInt(a.split('_').pop());
                const timestampB = parseInt(b.split('_').pop());
                return timestampB - timestampA;
            });

            // 删除超出数量限制的备份
            if (backupKeys.length > STORAGE_CONFIG.BACKUP_COUNT) {
                const toDelete = backupKeys.slice(STORAGE_CONFIG.BACKUP_COUNT);
                for (const key of toDelete) {
                    localStorage.removeItem(key);
                    console.log('删除旧备份:', key);
                }
            }
        } catch (error) {
            console.error('清理旧备份失败:', error);
        }
    }

    // 获取存储管理器状态
    getStatus() {
        return {
            available: this.isAvailable,
            version: STORAGE_CONFIG.VERSION,
            autoSaveEnabled: this.autoSaveTimer !== null,
            compressionEnabled: this.compressionEnabled,
            encryptionEnabled: this.encryptionEnabled,
            usage: this.getStorageUsage()
        };
    }

    // 销毁存储管理器
    destroy() {
        this.disableAutoSave();
        console.log('存储管理器已销毁');
    }
}

// 创建存储管理器实例的工厂函数
function createStorageManager() {
    const storageManager = new StorageManager();
    
    console.log('存储管理器创建完成');
    
    return storageManager;
}

// 存储错误处理和降级机制
class StorageFallback {
    constructor() {
        this.memoryStorage = new Map();
        console.log('存储降级机制启用，使用内存存储');
    }

    saveHighScore(score) {
        this.memoryStorage.set('highScore', score);
        console.log('内存存储：最高分数已保存');
        return true;
    }

    getHighScore() {
        return this.memoryStorage.get('highScore') || 0;
    }

    saveGameState(gameState) {
        this.memoryStorage.set('gameState', gameState);
        console.log('内存存储：游戏状态已保存');
        return true;
    }

    loadGameState() {
        return this.memoryStorage.get('gameState') || null;
    }

    clearAllData() {
        this.memoryStorage.clear();
        console.log('内存存储：所有数据已清除');
        return true;
    }

    getStatus() {
        return {
            available: true,
            fallback: true,
            itemCount: this.memoryStorage.size
        };
    }
}

// 创建存储管理器（带降级处理）
function createStorageManagerWithFallback() {
    const storageManager = new StorageManager();
    
    if (!storageManager.isAvailable) {
        console.warn('LocalStorage不可用，使用内存存储降级');
        return new StorageFallback();
    }
    
    return storageManager;
}

// 导出存储管理器相关功能
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        StorageManager,
        StorageFallback,
        createStorageManager,
        createStorageManagerWithFallback,
        STORAGE_CONFIG
    };
} else {
    // 浏览器环境 - 将所有导出暴露到全局作用域
    window.StorageManager = StorageManager;
    window.StorageFallback = StorageFallback;
    window.createStorageManager = createStorageManager;
    window.createStorageManagerWithFallback = createStorageManagerWithFallback;
    window.STORAGE_CONFIG = STORAGE_CONFIG;
}