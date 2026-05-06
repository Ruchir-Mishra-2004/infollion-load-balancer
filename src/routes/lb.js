/**
 * Load Balancer API Routes
 * Handles all load balancing operations
 */

const express = require('express');
const router = express.Router();
const { generateRandomIP, isValidIP } = require('../utils/ipGenerator');

/**
 * POST /api/lb/route
 * Route a request to a node based on IP
 * Body: { ip: "192.168.1.1" } (optional, generates random if not provided)
 */
router.post('/route', (req, res) => {
  try {
    let ip = req.body.ip || generateRandomIP();

    // Validate IP
    if (!isValidIP(ip)) {
      return res.status(400).json({
        error: 'Invalid IP address',
        ip
      });
    }

    const result = req.loadBalancer.routeRequest(ip);
    
    res.status(result.success ? 200 : 503).json(result);
  } catch (error) {
    res.status(500).json({
      error: 'Routing failed',
      message: error.message
    });
  }
});

/**
 * GET /api/lb/simulate
 * Simulate multiple requests
 * Query: count=10 (number of requests to simulate)
 */
router.get('/simulate', (req, res) => {
  try {
    const count = Math.min(parseInt(req.query.count) || 5, 1000); // Max 1000 to prevent abuse
    const results = [];

    for (let i = 0; i < count; i++) {
      const ip = generateRandomIP();
      const result = req.loadBalancer.routeRequest(ip);
      results.push(result);
    }

    // Summary
    const summary = {
      totalSimulated: count,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      distribution: {}
    };

    results.forEach(r => {
      if (r.node) {
        summary.distribution[r.node] = (summary.distribution[r.node] || 0) + 1;
      }
    });

    res.json({
      message: 'Traffic simulation completed',
      summary,
      recentRequests: results.slice(-5)
    });
  } catch (error) {
    res.status(500).json({
      error: 'Simulation failed',
      message: error.message
    });
  }
});

/**
 * GET /api/lb/metrics
 * Get detailed load balancer metrics
 */
router.get('/metrics', (req, res) => {
  try {
    const metrics = req.loadBalancer.getMetrics();
    
    res.json({
      message: 'Load Balancer Metrics',
      data: metrics,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to retrieve metrics',
      message: error.message
    });
  }
});

/**
 * GET /api/lb/logs
 * Get request history
 * Query: limit=20
 */
router.get('/logs', (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 20, 1000);
    const logs = req.loadBalancer.getRequestLog(limit);

    res.json({
      message: 'Request History',
      count: logs.length,
      logs,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to retrieve logs',
      message: error.message
    });
  }
});

/**
 * GET /api/lb/health/:node
 * Get health status of a specific node
 */
router.get('/health/:node', (req, res) => {
  try {
    const node = req.params.node;
    const metrics = req.loadBalancer.getMetrics();
    const nodeHealth = metrics.nodeHealth[node];

    if (!nodeHealth) {
      return res.status(404).json({
        error: 'Node not found',
        node
      });
    }

    res.json({
      node,
      health: nodeHealth,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: 'Health check failed',
      message: error.message
    });
  }
});

/**
 * POST /api/lb/health/:node/toggle
 * Simulate health status toggle (for testing)
 */
router.post('/health/:node/toggle', (req, res) => {
  try {
    const node = req.params.node;
    const metrics = req.loadBalancer.getMetrics();
    
    if (!metrics.nodeHealth[node]) {
      return res.status(404).json({
        error: 'Node not found',
        node
      });
    }

    const currentHealth = metrics.nodeHealth[node].healthy;
    req.loadBalancer.updateNodeHealth(node, !currentHealth);

    res.json({
      message: `Node ${node} health toggled`,
      node,
      newHealth: !currentHealth,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: 'Health toggle failed',
      message: error.message
    });
  }
});

/**
 * POST /api/lb/nodes
 * Add a new node
 * Body: { node: "Node-D", weight: 1 }
 */
router.post('/nodes', (req, res) => {
  try {
    const { node, weight = 1 } = req.body;

    if (!node) {
      return res.status(400).json({
        error: 'Node name is required'
      });
    }

    req.loadBalancer.addNode(node, weight);

    res.json({
      message: `Node ${node} added successfully`,
      node,
      weight,
      totalNodes: req.loadBalancer.nodes.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to add node',
      message: error.message
    });
  }
});

/**
 * DELETE /api/lb/nodes/:node
 * Remove a node
 */
router.delete('/nodes/:node', (req, res) => {
  try {
    const node = req.params.node;
    req.loadBalancer.removeNode(node);

    res.json({
      message: `Node ${node} removed successfully`,
      node,
      totalNodes: req.loadBalancer.nodes.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to remove node',
      message: error.message
    });
  }
});

/**
 * PUT /api/lb/nodes/:node/weight
 * Update node weight
 * Body: { weight: 2 }
 */
router.put('/nodes/:node/weight', (req, res) => {
  try {
    const node = req.params.node;
    const { weight } = req.body;

    if (typeof weight !== 'number' || weight <= 0) {
      return res.status(400).json({
        error: 'Weight must be a positive number'
      });
    }

    req.loadBalancer.updateNodeWeight(node, weight);

    res.json({
      message: `Node ${node} weight updated`,
      node,
      weight,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to update weight',
      message: error.message
    });
  }
});

/**
 * POST /api/lb/reset
 * Reset all metrics and logs
 */
router.post('/reset', (req, res) => {
  try {
    req.loadBalancer.reset();

    res.json({
      message: 'Load Balancer reset successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: 'Reset failed',
      message: error.message
    });
  }
});

module.exports = router;
