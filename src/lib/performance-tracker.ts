import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { homedir } from 'os';

export interface PerformanceMetric {
  model: string;
  requestCount: number;
  totalResponseTime: number;
  averageResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  successCount: number;
  errorCount: number;
  successRate: number;
  lastUpdated: string;
  recentResponses: number[]; // Last 10 response times for trend analysis
}

export interface ModelPerformanceData {
  [modelName: string]: PerformanceMetric;
}

/**
 * Performance tracking system for AI models
 */
export class PerformanceTracker {
  private readonly metricsPath: string;
  private readonly defaultMetricsDir: string;
  private cache: ModelPerformanceData | null = null;
  private readonly cacheTimeout = 30 * 1000; // 30 seconds
  private lastCacheTime = 0;

  constructor(customPath?: string) {
    this.defaultMetricsDir = join(homedir(), '.copilot-api');
    this.metricsPath = customPath || join(this.defaultMetricsDir, 'performance-metrics.json');
  }

  /**
   * Initialize metrics storage directory
   */
  private ensureMetricsDirectory(): void {
    const dir = dirname(this.metricsPath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true, mode: 0o700 });
    }
  }

  /**
   * Load performance metrics from file
   */
  private loadMetrics(): ModelPerformanceData {
    const now = Date.now();
    
    // Return cached data if still valid
    if (this.cache && (now - this.lastCacheTime) < this.cacheTimeout) {
      return this.cache;
    }

    try {
      if (!existsSync(this.metricsPath)) {
        return {};
      }

      const metricsData = readFileSync(this.metricsPath, 'utf8');
      const metrics: ModelPerformanceData = JSON.parse(metricsData);
      
      // Update cache
      this.cache = metrics;
      this.lastCacheTime = now;
      
      return metrics;
    } catch (error) {
      console.error('Failed to load performance metrics:', error);
      return {};
    }
  }

  /**
   * Save performance metrics to file
   */
  private saveMetrics(metrics: ModelPerformanceData): boolean {
    try {
      this.ensureMetricsDirectory();

      writeFileSync(this.metricsPath, JSON.stringify(metrics, null, 2), {
        mode: 0o600 // Read/write for owner only
      });

      // Update cache
      this.cache = metrics;
      this.lastCacheTime = Date.now();

      return true;
    } catch (error) {
      console.error('Failed to save performance metrics:', error);
      return false;
    }
  }

  /**
   * Record a successful API response
   */
  recordResponse(model: string, responseTimeMs: number): void {
    const metrics = this.loadMetrics();
    const now = new Date().toISOString();

    if (!metrics[model]) {
      metrics[model] = {
        model,
        requestCount: 0,
        totalResponseTime: 0,
        averageResponseTime: 0,
        minResponseTime: Infinity,
        maxResponseTime: 0,
        successCount: 0,
        errorCount: 0,
        successRate: 0,
        lastUpdated: now,
        recentResponses: []
      };
    }

    const metric = metrics[model];
    
    // Update counts
    metric.requestCount++;
    metric.successCount++;
    metric.totalResponseTime += responseTimeMs;
    
    // Update min/max
    metric.minResponseTime = Math.min(metric.minResponseTime, responseTimeMs);
    metric.maxResponseTime = Math.max(metric.maxResponseTime, responseTimeMs);
    
    // Calculate average
    metric.averageResponseTime = metric.totalResponseTime / metric.requestCount;
    
    // Update success rate
    metric.successRate = (metric.successCount / metric.requestCount) * 100;
    
    // Update recent responses (keep last 10)
    metric.recentResponses.push(responseTimeMs);
    if (metric.recentResponses.length > 10) {
      metric.recentResponses.shift();
    }
    
    metric.lastUpdated = now;

    this.saveMetrics(metrics);
  }

  /**
   * Record a failed API response
   */
  recordError(model: string): void {
    const metrics = this.loadMetrics();
    const now = new Date().toISOString();

    if (!metrics[model]) {
      metrics[model] = {
        model,
        requestCount: 0,
        totalResponseTime: 0,
        averageResponseTime: 0,
        minResponseTime: Infinity,
        maxResponseTime: 0,
        successCount: 0,
        errorCount: 0,
        successRate: 0,
        lastUpdated: now,
        recentResponses: []
      };
    }

    const metric = metrics[model];
    
    // Update counts
    metric.requestCount++;
    metric.errorCount++;
    
    // Update success rate
    metric.successRate = (metric.successCount / metric.requestCount) * 100;
    
    metric.lastUpdated = now;

    this.saveMetrics(metrics);
  }

  /**
   * Get performance metrics for all models
   */
  getAllMetrics(): ModelPerformanceData {
    return this.loadMetrics();
  }

  /**
   * Get performance metrics for a specific model
   */
  getModelMetrics(model: string): PerformanceMetric | null {
    const metrics = this.loadMetrics();
    return metrics[model] || null;
  }

  /**
   * Get models sorted by average response time (fastest first)
   */
  getFastestModels(): PerformanceMetric[] {
    const metrics = this.loadMetrics();
    return Object.values(metrics)
      .filter(metric => metric.successCount > 0)
      .sort((a, b) => a.averageResponseTime - b.averageResponseTime);
  }

  /**
   * Get models sorted by success rate (most reliable first)
   */
  getMostReliableModels(): PerformanceMetric[] {
    const metrics = this.loadMetrics();
    return Object.values(metrics)
      .filter(metric => metric.requestCount > 0)
      .sort((a, b) => b.successRate - a.successRate);
  }

  /**
   * Get performance summary
   */
  getSummary(): {
    totalModels: number;
    totalRequests: number;
    totalSuccessful: number;
    totalErrors: number;
    overallSuccessRate: number;
    fastestModel?: string;
    slowestModel?: string;
    mostReliableModel?: string;
  } {
    const metrics = this.loadMetrics();
    const allMetrics = Object.values(metrics);

    if (allMetrics.length === 0) {
      return {
        totalModels: 0,
        totalRequests: 0,
        totalSuccessful: 0,
        totalErrors: 0,
        overallSuccessRate: 0
      };
    }

    const totalRequests = allMetrics.reduce((sum, m) => sum + m.requestCount, 0);
    const totalSuccessful = allMetrics.reduce((sum, m) => sum + m.successCount, 0);
    const totalErrors = allMetrics.reduce((sum, m) => sum + m.errorCount, 0);

    const modelsWithResponses = allMetrics.filter(m => m.successCount > 0);
    const fastestModel = modelsWithResponses.length > 0 
      ? modelsWithResponses.sort((a, b) => a.averageResponseTime - b.averageResponseTime)[0]?.model
      : undefined;
    
    const slowestModel = modelsWithResponses.length > 0
      ? modelsWithResponses.sort((a, b) => b.averageResponseTime - a.averageResponseTime)[0]?.model
      : undefined;

    const mostReliableModel = allMetrics.length > 0
      ? allMetrics.sort((a, b) => b.successRate - a.successRate)[0]?.model
      : undefined;

    return {
      totalModels: allMetrics.length,
      totalRequests,
      totalSuccessful,
      totalErrors,
      overallSuccessRate: totalRequests > 0 ? (totalSuccessful / totalRequests) * 100 : 0,
      fastestModel,
      slowestModel,
      mostReliableModel
    };
  }

  /**
   * Get recent performance trend for a model
   */
  getModelTrend(model: string): {
    model: string;
    recentAverage: number;
    trend: 'improving' | 'stable' | 'degrading' | 'insufficient_data';
  } | null {
    const metric = this.getModelMetrics(model);
    if (!metric || metric.recentResponses.length < 3) {
      return {
        model,
        recentAverage: metric?.averageResponseTime || 0,
        trend: 'insufficient_data'
      };
    }

    const recent = metric.recentResponses;
    const recentAverage = recent.reduce((sum, time) => sum + time, 0) / recent.length;
    
    // Compare recent average to overall average
    const overallAverage = metric.averageResponseTime;
    const difference = recentAverage - overallAverage;
    const threshold = overallAverage * 0.1; // 10% threshold

    let trend: 'improving' | 'stable' | 'degrading';
    if (difference < -threshold) {
      trend = 'improving'; // Recent responses are faster
    } else if (difference > threshold) {
      trend = 'degrading'; // Recent responses are slower
    } else {
      trend = 'stable';
    }

    return {
      model,
      recentAverage,
      trend
    };
  }

  /**
   * Clear all performance metrics
   */
  clearMetrics(): boolean {
    try {
      if (existsSync(this.metricsPath)) {
        writeFileSync(this.metricsPath, JSON.stringify({}, null, 2));
      }
      
      // Clear cache
      this.cache = null;
      this.lastCacheTime = 0;
      
      return true;
    } catch (error) {
      console.error('Failed to clear performance metrics:', error);
      return false;
    }
  }

  /**
   * Get metrics file path
   */
  getMetricsPath(): string {
    return this.metricsPath;
  }
}

// Global performance tracker instance
export const performanceTracker = new PerformanceTracker();

/**
 * Middleware to track response times
 */
export function trackPerformance(model: string, startTime: number, success: boolean = true): void {
  const responseTime = Date.now() - startTime;
  
  if (success) {
    performanceTracker.recordResponse(model, responseTime);
  } else {
    performanceTracker.recordError(model);
  }
}

/**
 * Get performance recommendations for different use cases
 */
export function getModelRecommendations(): {
  fastestForSimpleTasks: string[];
  mostReliable: string[];
  balanced: string[];
} {
  const fastest = performanceTracker.getFastestModels();
  const reliable = performanceTracker.getMostReliableModels();

  // Filter for simple tasks (fast + reliable)
  const fastestForSimpleTasks = fastest
    .filter(m => m.successRate >= 95 && m.averageResponseTime < 5000) // < 5 seconds, 95%+ success
    .slice(0, 5)
    .map(m => m.model);

  const mostReliable = reliable
    .filter(m => m.successRate >= 98)
    .slice(0, 5)
    .map(m => m.model);

  // Balanced: good speed + reliability
  const balanced = fastest
    .filter(m => m.successRate >= 90 && m.averageResponseTime < 10000) // < 10 seconds, 90%+ success
    .slice(0, 5)
    .map(m => m.model);

  return {
    fastestForSimpleTasks,
    mostReliable,
    balanced
  };
}