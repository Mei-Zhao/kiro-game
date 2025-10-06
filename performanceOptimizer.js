// 性能优化工具类 - 提供通用的性能优化功能

class PerformanceOptimizer {
    constructor() {
        this.observers = new Map();
        this.metrics = {
            frameRate: 0,
            memoryUsage: 0,
            domOperations: 0,
            eventProcessingTime: 0
        };
        
        this.isMonitoring = false;
        this.frameCount = 0;
        this.lastFrameTime = 0;
        this.frameRateHistory = [];
        
        // 性能阈值
        this.thresholds = {
            frameRate: 30, // 最低帧率
            memoryUsage: 100 * 1024 * 1024, // 100MB
            eventProcessingTime: 16, // 16ms (一帧的时间)
            domOperations: 100 // 每帧最大DOM操作数
        };
    }

    // 开始性能监控
    startMonitoring() {
        if (this.isMonitoring) return;
        
        this.isMonitoring = true;
        this.startFrameRateMonitoring();
        this.startMemoryMonitoring();
        this.startDOMOperationMonitoring();
        
        console.log('性能监控已启动');
    }

    // 停止性能监控
    stopMonitoring() {
        if (!this.isMonitoring) return;
        
        this.isMonitoring = false;
        this.stopFrameRateMonitoring();
        this.stopMemoryMonitoring();
        this.stopDOMOperationMonitoring();
        
        console.log('性能监控已停止');
    }

    // 帧率监控
    startFrameRateMonitoring() {
        const measureFrameRate = (timestamp) => {
            if (!this.isMonitoring) return;
            
            if (this.lastFrameTime) {
                const delta = timestamp - this.lastFrameTime;
                const fps = 1000 / delta;
                
                this.frameRateHistory.push(fps);
                if (this.frameRateHistory.length > 60) {
                    this.frameRateHistory.shift();
                }
                
                this.metrics.frameRate = this.frameRateHistory.reduce((a, b) => a + b, 0) / this.frameRateHistory.length;
                
                // 检查帧率是否过低
                if (this.metrics.frameRate < this.thresholds.frameRate) {
                    this.notifyPerformanceIssue('low_framerate', {
                        current: this.metrics.frameRate,
                        threshold: this.thresholds.frameRate
                    });
                }
            }
            
            this.lastFrameTime = timestamp;
            this.frameCount++;
            
            requestAnimationFrame(measureFrameRate);
        };
        
        requestAnimationFrame(measureFrameRate);
    }

    // 停止帧率监控
    stopFrameRateMonitoring() {
        this.lastFrameTime = 0;
        this.frameCount = 0;
        this.frameRateHistory = [];
    }

    // 内存使用监控
    startMemoryMonitoring() {
        if (!performance.memory) {
            console.warn('浏览器不支持内存监控');
            return;
        }

        this.memoryMonitorInterval = setInterval(() => {
            if (!this.isMonitoring) return;
            
            const memory = performance.memory;
            this.metrics.memoryUsage = memory.usedJSHeapSize;
            
            // 检查内存使用是否过高
            if (this.metrics.memoryUsage > this.thresholds.memoryUsage) {
                this.notifyPerformanceIssue('high_memory_usage', {
                    current: this.metrics.memoryUsage,
                    threshold: this.thresholds.memoryUsage,
                    total: memory.totalJSHeapSize,
                    limit: memory.jsHeapSizeLimit
                });
            }
        }, 1000);
    }

    // 停止内存监控
    stopMemoryMonitoring() {
        if (this.memoryMonitorInterval) {
            clearInterval(this.memoryMonitorInterval);
            this.memoryMonitorInterval = null;
        }
    }

    // DOM操作监控
    startDOMOperationMonitoring() {
        this.domOperationCount = 0;
        this.domOperationStartTime = performance.now();
        
        // 监控DOM变化
        if (typeof MutationObserver !== 'undefined') {
            this.mutationObserver = new MutationObserver((mutations) => {
                this.domOperationCount += mutations.length;
                
                const currentTime = performance.now();
                if (currentTime - this.domOperationStartTime >= 1000) {
                    this.metrics.domOperations = this.domOperationCount;
                    
                    // 检查DOM操作是否过于频繁
                    if (this.metrics.domOperations > this.thresholds.domOperations) {
                        this.notifyPerformanceIssue('excessive_dom_operations', {
                            current: this.metrics.domOperations,
                            threshold: this.thresholds.domOperations
                        });
                    }
                    
                    this.domOperationCount = 0;
                    this.domOperationStartTime = currentTime;
                }
            });
            
            this.mutationObserver.observe(document.body, {
                childList: true,
                subtree: true,
                attributes: true,
                attributeOldValue: false,
                characterData: true,
                characterDataOldValue: false
            });
        }
    }

    // 停止DOM操作监控
    stopDOMOperationMonitoring() {
        if (this.mutationObserver) {
            this.mutationObserver.disconnect();
            this.mutationObserver = null;
        }
    }

    // 性能问题通知
    notifyPerformanceIssue(type, data) {
        const issue = {
            type,
            timestamp: Date.now(),
            data,
            suggestions: this.getOptimizationSuggestions(type, data)
        };
        
        console.warn('性能问题检测:', issue);
        
        // 触发性能问题事件
        this.observers.forEach((callback, observerType) => {
            if (observerType === 'performance_issue' || observerType === type) {
                try {
                    callback(issue);
                } catch (error) {
                    console.error('性能问题回调执行失败:', error);
                }
            }
        });
    }

    // 获取优化建议
    getOptimizationSuggestions(type, data) {
        const suggestions = [];
        
        switch (type) {
            case 'low_framerate':
                suggestions.push('减少动画复杂度');
                suggestions.push('使用CSS transform代替改变布局属性');
                suggestions.push('启用硬件加速');
                suggestions.push('减少同时进行的动画数量');
                break;
                
            case 'high_memory_usage':
                suggestions.push('清理未使用的对象引用');
                suggestions.push('减少DOM元素数量');
                suggestions.push('优化图片和资源大小');
                suggestions.push('使用对象池重用对象');
                break;
                
            case 'excessive_dom_operations':
                suggestions.push('批量处理DOM操作');
                suggestions.push('使用DocumentFragment');
                suggestions.push('减少DOM查询频率');
                suggestions.push('使用虚拟滚动');
                break;
        }
        
        return suggestions;
    }

    // 添加性能观察者
    addObserver(type, callback) {
        this.observers.set(type, callback);
    }

    // 移除性能观察者
    removeObserver(type) {
        this.observers.delete(type);
    }

    // 获取当前性能指标
    getMetrics() {
        return {
            ...this.metrics,
            frameCount: this.frameCount,
            isMonitoring: this.isMonitoring,
            timestamp: Date.now()
        };
    }

    // 性能优化建议
    getOptimizationRecommendations() {
        const recommendations = [];
        
        if (this.metrics.frameRate < this.thresholds.frameRate) {
            recommendations.push({
                type: 'framerate',
                priority: 'high',
                message: '帧率过低，建议优化动画和渲染',
                actions: [
                    '使用CSS transform代替position变化',
                    '减少同时进行的动画',
                    '启用will-change属性',
                    '使用requestAnimationFrame'
                ]
            });
        }
        
        if (this.metrics.memoryUsage > this.thresholds.memoryUsage) {
            recommendations.push({
                type: 'memory',
                priority: 'medium',
                message: '内存使用过高，建议优化内存管理',
                actions: [
                    '清理未使用的事件监听器',
                    '移除DOM引用',
                    '使用WeakMap和WeakSet',
                    '定期执行垃圾回收'
                ]
            });
        }
        
        if (this.metrics.domOperations > this.thresholds.domOperations) {
            recommendations.push({
                type: 'dom',
                priority: 'medium',
                message: 'DOM操作过于频繁，建议批量处理',
                actions: [
                    '使用DocumentFragment批量操作',
                    '减少DOM查询次数',
                    '缓存DOM元素引用',
                    '使用事件委托'
                ]
            });
        }
        
        return recommendations;
    }

    // 自动优化
    autoOptimize() {
        const recommendations = this.getOptimizationRecommendations();
        
        for (const rec of recommendations) {
            switch (rec.type) {
                case 'framerate':
                    this.optimizeFrameRate();
                    break;
                case 'memory':
                    this.optimizeMemoryUsage();
                    break;
                case 'dom':
                    this.optimizeDOMOperations();
                    break;
            }
        }
    }

    // 优化帧率
    optimizeFrameRate() {
        // 降低动画质量
        const style = document.createElement('style');
        style.textContent = `
            * {
                animation-duration: 0.1s !important;
                transition-duration: 0.1s !important;
            }
        `;
        document.head.appendChild(style);
        
        console.log('已应用帧率优化');
    }

    // 优化内存使用
    optimizeMemoryUsage() {
        // 强制垃圾回收
        if (window.gc && typeof window.gc === 'function') {
            window.gc();
        }
        
        // 清理缓存
        if (window.caches) {
            caches.keys().then(names => {
                names.forEach(name => {
                    caches.delete(name);
                });
            });
        }
        
        console.log('已应用内存优化');
    }

    // 优化DOM操作
    optimizeDOMOperations() {
        // 启用批量DOM更新
        if (window.requestIdleCallback) {
            window.requestIdleCallback(() => {
                // 在空闲时间执行DOM优化
                this.batchDOMUpdates();
            });
        }
        
        console.log('已应用DOM操作优化');
    }

    // 批量DOM更新
    batchDOMUpdates() {
        // 这里可以实现具体的DOM批量更新逻辑
        // 例如合并多个样式更改、使用DocumentFragment等
    }

    // 重置性能指标
    resetMetrics() {
        this.metrics = {
            frameRate: 0,
            memoryUsage: 0,
            domOperations: 0,
            eventProcessingTime: 0
        };
        
        this.frameCount = 0;
        this.frameRateHistory = [];
    }

    // 导出性能报告
    exportPerformanceReport() {
        const report = {
            timestamp: new Date().toISOString(),
            metrics: this.getMetrics(),
            recommendations: this.getOptimizationRecommendations(),
            thresholds: this.thresholds,
            browserInfo: {
                userAgent: navigator.userAgent,
                memory: performance.memory ? {
                    used: performance.memory.usedJSHeapSize,
                    total: performance.memory.totalJSHeapSize,
                    limit: performance.memory.jsHeapSizeLimit
                } : null,
                connection: navigator.connection ? {
                    effectiveType: navigator.connection.effectiveType,
                    downlink: navigator.connection.downlink,
                    rtt: navigator.connection.rtt
                } : null
            }
        };
        
        return report;
    }
}

// 创建全局性能优化器实例
const performanceOptimizer = new PerformanceOptimizer();

// 导出类和实例
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { PerformanceOptimizer, performanceOptimizer };
} else {
    // 浏览器环境 - 将所有导出暴露到全局作用域
    window.PerformanceOptimizer = PerformanceOptimizer;
    window.performanceOptimizer = performanceOptimizer;
}