import { Hono } from "hono";
import { performanceTracker, getModelRecommendations } from "../../lib/performance-tracker.js";
import { optionalAuth } from "../../lib/auth-middleware.js";

const performanceRoute = new Hono();

// Apply optional authentication
performanceRoute.use("*", optionalAuth());

/**
 * Get all performance metrics
 */
performanceRoute.get("/", async (c) => {
  try {
    const metrics = performanceTracker.getAllMetrics();
    const summary = performanceTracker.getSummary();
    
    return c.json({
      summary,
      models: metrics,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return c.json({
      error: "Failed to retrieve performance metrics",
      details: error instanceof Error ? error.message : "Unknown error"
    }, 500);
  }
});

/**
 * Get performance metrics for a specific model
 */
performanceRoute.get("/model/:modelName", async (c) => {
  try {
    const modelName = c.req.param("modelName");
    const metrics = performanceTracker.getModelMetrics(modelName);
    
    if (!metrics) {
      return c.json({
        error: "Model not found or no performance data available",
        model: modelName
      }, 404);
    }

    const trend = performanceTracker.getModelTrend(modelName);

    return c.json({
      model: modelName,
      metrics,
      trend,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return c.json({
      error: "Failed to retrieve model performance metrics",
      details: error instanceof Error ? error.message : "Unknown error"
    }, 500);
  }
});

/**
 * Get fastest models (sorted by response time)
 */
performanceRoute.get("/fastest", async (c) => {
  try {
    const fastest = performanceTracker.getFastestModels();
    
    return c.json({
      models: fastest,
      count: fastest.length,
      timestamp: new Date().toISOString(),
      note: "Models sorted by average response time (fastest first)"
    });
  } catch (error) {
    return c.json({
      error: "Failed to retrieve fastest models",
      details: error instanceof Error ? error.message : "Unknown error"
    }, 500);
  }
});

/**
 * Get most reliable models (sorted by success rate)
 */
performanceRoute.get("/reliable", async (c) => {
  try {
    const reliable = performanceTracker.getMostReliableModels();
    
    return c.json({
      models: reliable,
      count: reliable.length,
      timestamp: new Date().toISOString(),
      note: "Models sorted by success rate (most reliable first)"
    });
  } catch (error) {
    return c.json({
      error: "Failed to retrieve most reliable models",
      details: error instanceof Error ? error.message : "Unknown error"
    }, 500);
  }
});

/**
 * Get model recommendations for different use cases
 */
performanceRoute.get("/recommendations", async (c) => {
  try {
    const recommendations = getModelRecommendations();
    const summary = performanceTracker.getSummary();
    
    return c.json({
      recommendations: {
        fastestForSimpleTasks: {
          models: recommendations.fastestForSimpleTasks,
          description: "Best for simple tasks requiring quick responses (< 5s, 95%+ success rate)"
        },
        mostReliable: {
          models: recommendations.mostReliable,
          description: "Most reliable models (98%+ success rate)"
        },
        balanced: {
          models: recommendations.balanced,
          description: "Good balance of speed and reliability (< 10s, 90%+ success rate)"
        }
      },
      summary: {
        totalModels: summary.totalModels,
        totalRequests: summary.totalRequests,
        overallSuccessRate: Math.round(summary.overallSuccessRate * 100) / 100
      },
      usage: {
        endpoint: "/performance/recommendations",
        tip: "Use 'fastestForSimpleTasks' models for quick queries, 'balanced' for general use"
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return c.json({
      error: "Failed to generate model recommendations",
      details: error instanceof Error ? error.message : "Unknown error"
    }, 500);
  }
});

/**
 * Get performance summary
 */
performanceRoute.get("/summary", async (c) => {
  try {
    const summary = performanceTracker.getSummary();
    
    return c.json({
      ...summary,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return c.json({
      error: "Failed to retrieve performance summary",
      details: error instanceof Error ? error.message : "Unknown error"
    }, 500);
  }
});

/**
 * Get performance trends for all models
 */
performanceRoute.get("/trends", async (c) => {
  try {
    const metrics = performanceTracker.getAllMetrics();
    const trends = Object.keys(metrics).map(model => 
      performanceTracker.getModelTrend(model)
    ).filter(trend => trend !== null);

    return c.json({
      trends,
      count: trends.length,
      timestamp: new Date().toISOString(),
      legend: {
        improving: "Recent responses are faster than average",
        stable: "Response times are consistent",
        degrading: "Recent responses are slower than average",
        insufficient_data: "Not enough recent data for trend analysis"
      }
    });
  } catch (error) {
    return c.json({
      error: "Failed to retrieve performance trends",
      details: error instanceof Error ? error.message : "Unknown error"
    }, 500);
  }
});

/**
 * Clear all performance metrics (admin only)
 */
performanceRoute.delete("/", async (c) => {
  try {
    const success = performanceTracker.clearMetrics();
    
    if (success) {
      return c.json({
        message: "Performance metrics cleared successfully",
        timestamp: new Date().toISOString()
      });
    } else {
      return c.json({
        error: "Failed to clear performance metrics"
      }, 500);
    }
  } catch (error) {
    return c.json({
      error: "Failed to clear performance metrics",
      details: error instanceof Error ? error.message : "Unknown error"
    }, 500);
  }
});

/**
 * Get performance dashboard HTML
 */
performanceRoute.get("/dashboard", async (c) => {
  try {
    const summary = performanceTracker.getSummary();
    const fastest = performanceTracker.getFastestModels().slice(0, 10);
    const recommendations = getModelRecommendations();

    const html = `
<!DOCTYPE html>
<html>
<head>
    <title>Model Performance Dashboard</title>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 20px;
            background: #f5f5f5;
        }
        .container { max-width: 1200px; margin: 0 auto; }
        .card {
            background: white;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin: 20px 0;
        }
        .stat-card {
            text-align: center;
            padding: 20px;
            background: #f8f9fa;
            border-radius: 8px;
        }
        .stat-value {
            font-size: 2em;
            font-weight: bold;
            color: #007acc;
        }
        .stat-label {
            color: #666;
            margin-top: 5px;
        }
        .model-list {
            display: grid;
            gap: 10px;
        }
        .model-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 10px;
            background: #f8f9fa;
            border-radius: 5px;
            border-left: 4px solid #007acc;
        }
        .model-name {
            font-weight: bold;
        }
        .model-stats {
            font-size: 0.9em;
            color: #666;
        }
        .recommendation-section {
            margin: 30px 0;
        }
        .recommendation-list {
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
        }
        .model-tag {
            background: #007acc;
            color: white;
            padding: 5px 10px;
            border-radius: 15px;
            font-size: 0.9em;
        }
        .refresh-btn {
            background: #007acc;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 5px;
            cursor: pointer;
            float: right;
        }
        .refresh-btn:hover {
            background: #005c99;
        }
        h1, h2 { color: #333; }
        .api-links {
            background: #e8f4f8;
            padding: 15px;
            border-radius: 5px;
            margin: 20px 0;
        }
        .api-links a {
            color: #007acc;
            text-decoration: none;
            margin-right: 15px;
        }
        .api-links a:hover {
            text-decoration: underline;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🚀 Model Performance Dashboard</h1>
        <button class="refresh-btn" onclick="location.reload()">🔄 Refresh</button>
        
        <div class="api-links">
            <strong>API Endpoints:</strong>
            <a href="/performance">All Metrics</a>
            <a href="/performance/fastest">Fastest Models</a>
            <a href="/performance/reliable">Most Reliable</a>
            <a href="/performance/recommendations">Recommendations</a>
            <a href="/performance/trends">Trends</a>
        </div>

        <div class="stats">
            <div class="stat-card">
                <div class="stat-value">${summary.totalModels}</div>
                <div class="stat-label">Models Tracked</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${summary.totalRequests}</div>
                <div class="stat-label">Total Requests</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${Math.round(summary.overallSuccessRate)}%</div>
                <div class="stat-label">Success Rate</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${summary.fastestModel || 'N/A'}</div>
                <div class="stat-label">Fastest Model</div>
            </div>
        </div>

        <div class="card">
            <h2>📈 Top 10 Fastest Models</h2>
            <div class="model-list">
                ${fastest.map(model => `
                    <div class="model-item">
                        <div>
                            <div class="model-name">${model.model}</div>
                            <div class="model-stats">
                                ${model.requestCount} requests • ${Math.round(model.successRate)}% success
                            </div>
                        </div>
                        <div>
                            <strong>${Math.round(model.averageResponseTime)}ms</strong>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>

        <div class="card recommendation-section">
            <h2>💡 Model Recommendations</h2>
            
            <h3>⚡ Best for Simple Tasks</h3>
            <div class="recommendation-list">
                ${recommendations.fastestForSimpleTasks.map(model => 
                    `<span class="model-tag">${model}</span>`
                ).join('')}
            </div>

            <h3>🛡️ Most Reliable</h3>
            <div class="recommendation-list">
                ${recommendations.mostReliable.map(model => 
                    `<span class="model-tag">${model}</span>`
                ).join('')}
            </div>

            <h3>⚖️ Balanced (Speed + Reliability)</h3>
            <div class="recommendation-list">
                ${recommendations.balanced.map(model => 
                    `<span class="model-tag">${model}</span>`
                ).join('')}
            </div>
        </div>

        <div class="card">
            <p><strong>Last Updated:</strong> ${new Date().toLocaleString()}</p>
            <p><em>Performance data is automatically collected from API requests. Use the fastest models for simple tasks to optimize response times.</em></p>
        </div>
    </div>

    <script>
        // Auto-refresh every 30 seconds
        setTimeout(() => location.reload(), 30000);
    </script>
</body>
</html>`;

    return c.html(html);
  } catch (error) {
    return c.html(`
      <html>
        <body style="font-family: Arial; padding: 20px;">
          <h1>Performance Dashboard Error</h1>
          <p>Failed to load performance dashboard: ${error instanceof Error ? error.message : 'Unknown error'}</p>
          <a href="/performance">View Raw JSON Data</a>
        </body>
      </html>
    `);
  }
});

export { performanceRoute };