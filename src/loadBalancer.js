/**
 * Advanced Load Balancer with Consistent Hashing
 * Ensures that the same IP always routes to the same node
 * Supports weighted routing, health checks, and metrics
 */

const crypto = require('crypto');

class ConsistentHashLoadBalancer {
  constructor(nodes = [], weights = {}) {
    this.nodes = nodes;
    this.weights = weights;
    this.ring = new Map();
    this.nodeHealth = new Map();
    this.metrics = {
      totalRequests: 0,
      requestsByNode: {},
      requestsByIP: {},
      failedRequests: 0
    };
    this.requestLog = [];
    this.rateLimitMap = new Map();
    this.rateLimitWindow = 60000; // 1 minute
    this.rateLimitRequests = 100; // requests per window
    
    // Initialize nodes
    this.nodes.forEach(node => {
      this.nodeHealth.set(node, { healthy: true, failureCount: 0 });
      this.metrics.requestsByNode[node] = 0;
    });
    
    this._buildRing();
  }

  /**
   * Build the consistent hash ring with virtual nodes
   * Virtual nodes = weight * 150 (default weight is 1)
   */
  _buildRing() {
    this.ring.clear();
    const virtualNodeCount = 150; // Points per real node for better distribution

    this.nodes.forEach(node => {
      const weight = this.weights[node] || 1;
      const points = Math.ceil(virtualNodeCount * weight);

      for (let i = 0; i < points; i++) {
        const virtualNodeKey = `${node}:${i}`;
        const hash = this._hash(virtualNodeKey);
        this.ring.set(hash, node);
      }
    });

    // Sort ring keys for binary search
    this.sortedRingKeys = Array.from(this.ring.keys()).sort((a, b) => a - b);
  }

  /**
   * Hash function using SHA-1
   * Ensures consistent hashing across runs
   */
  _hash(key) {
    return parseInt(
      crypto.createHash('sha1').update(String(key)).digest('hex'),
      16
    );
  }

  /**
   * Find the node for a given key using consistent hashing
   */
  _findNode(key) {
    if (this.ring.size === 0) return null;

    const hash = this._hash(key);
    
    // Binary search for the next node in the ring
    const index = this.sortedRingKeys.findIndex(k => k >= hash);
    const selectedHash = index === -1 ? this.sortedRingKeys[0] : this.sortedRingKeys[index];
    
    return this.ring.get(selectedHash);
  }

  /**
   * Check rate limiting for an IP
   */
  _checkRateLimit(ip) {
    const now = Date.now();
    
    if (!this.rateLimitMap.has(ip)) {
      this.rateLimitMap.set(ip, { count: 1, resetTime: now + this.rateLimitWindow });
      return true;
    }

    const ipLimit = this.rateLimitMap.get(ip);
    
    if (now > ipLimit.resetTime) {
      // Reset window
      this.rateLimitMap.set(ip, { count: 1, resetTime: now + this.rateLimitWindow });
      return true;
    }

    if (ipLimit.count >= this.rateLimitRequests) {
      return false;
    }

    ipLimit.count++;
    return true;
  }

  /**
   * Main load balancing function
   * Routes request to the same node for the same IP
   */
  routeRequest(ip) {
    // Rate limiting check
    if (!this._checkRateLimit(ip)) {
      this.metrics.failedRequests++;
      return {
        success: false,
        node: null,
        ip,
        reason: 'Rate limit exceeded',
        timestamp: new Date().toISOString()
      };
    }

    let selectedNode = this._findNode(ip);

    // Find a healthy node (fallback strategy)
    if (selectedNode && !this.nodeHealth.get(selectedNode).healthy) {
      const healthyNodes = this.nodes.filter(n => this.nodeHealth.get(n).healthy);
      
      if (healthyNodes.length > 0) {
        // Route to a healthy node, but prefer consistent hash if available
        selectedNode = this._findHealthyFallback(ip, healthyNodes);
      }
    }

    if (!selectedNode) {
      this.metrics.failedRequests++;
      return {
        success: false,
        node: null,
        ip,
        reason: 'No available nodes',
        timestamp: new Date().toISOString()
      };
    }

    // Update metrics
    this.metrics.totalRequests++;
    this.metrics.requestsByNode[selectedNode]++;
    
    if (!this.metrics.requestsByIP[ip]) {
      this.metrics.requestsByIP[ip] = 0;
    }
    this.metrics.requestsByIP[ip]++;

    // Log the request
    const logEntry = {
      timestamp: new Date().toISOString(),
      ip,
      selectedNode,
      hash: this._hash(ip)
    };
    this.requestLog.push(logEntry);

    return {
      success: true,
      node: selectedNode,
      ip,
      hash: this._hash(ip),
      timestamp: logEntry.timestamp,
      requestCount: this.metrics.requestsByIP[ip]
    };
  }

  /**
   * Find a healthy node for fallback
   */
  _findHealthyFallback(ip, healthyNodes) {
    // Try to find a healthy node closest in the ring
    for (const node of healthyNodes) {
      return node; // Simple approach: return first healthy node
    }
    return null;
  }

  /**
   * Update node health status
   */
  updateNodeHealth(node, isHealthy) {
    if (this.nodeHealth.has(node)) {
      this.nodeHealth.get(node).healthy = isHealthy;
      if (!isHealthy) {
        this.nodeHealth.get(node).failureCount++;
      } else {
        this.nodeHealth.get(node).failureCount = 0;
      }
      
      console.log(`[HEALTH] Node ${node}: ${isHealthy ? 'HEALTHY ✓' : 'UNHEALTHY ✗'}`);
    }
  }

  /**
   * Add a new node dynamically
   */
  addNode(node, weight = 1) {
    if (!this.nodes.includes(node)) {
      this.nodes.push(node);
      this.weights[node] = weight;
      this.nodeHealth.set(node, { healthy: true, failureCount: 0 });
      this.metrics.requestsByNode[node] = 0;
      this._buildRing();
      console.log(`[NODE] Added node: ${node} with weight ${weight}`);
    }
  }

  /**
   * Remove a node from the load balancer
   */
  removeNode(node) {
    const index = this.nodes.indexOf(node);
    if (index > -1) {
      this.nodes.splice(index, 1);
      delete this.weights[node];
      this.nodeHealth.delete(node);
      delete this.metrics.requestsByNode[node];
      this._buildRing();
      console.log(`[NODE] Removed node: ${node}`);
    }
  }

  /**
   * Update node weight for weighted routing
   */
  updateNodeWeight(node, weight) {
    if (this.nodes.includes(node)) {
      this.weights[node] = weight;
      this._buildRing();
      console.log(`[WEIGHT] Updated node ${node} weight to ${weight}`);
    }
  }

  /**
   * Get detailed metrics
   */
  getMetrics() {
    return {
      totalRequests: this.metrics.totalRequests,
      failedRequests: this.metrics.failedRequests,
      successRate: this.metrics.totalRequests > 0 
        ? (((this.metrics.totalRequests - this.metrics.failedRequests) / this.metrics.totalRequests) * 100).toFixed(2) + '%'
        : '0%',
      requestsByNode: this.metrics.requestsByNode,
      uniqueIPs: Object.keys(this.metrics.requestsByIP).length,
      activeNodes: this.nodes.length,
      healthyNodes: Array.from(this.nodeHealth.values()).filter(h => h.healthy).length,
      nodeHealth: Object.fromEntries(
        this.nodes.map(node => [
          node,
          {
            healthy: this.nodeHealth.get(node).healthy,
            requests: this.metrics.requestsByNode[node],
            failureCount: this.nodeHealth.get(node).failureCount
          }
        ])
      )
    };
  }

  /**
   * Get request history (last N requests)
   */
  getRequestLog(limit = 20) {
    return this.requestLog.slice(-limit);
  }

  /**
   * Reset metrics and logs
   */
  reset() {
    this.metrics = {
      totalRequests: 0,
      requestsByNode: {},
      requestsByIP: {},
      failedRequests: 0
    };
    this.requestLog = [];
    this.rateLimitMap.clear();
    
    this.nodes.forEach(node => {
      this.metrics.requestsByNode[node] = 0;
    });
  }
}

module.exports = ConsistentHashLoadBalancer;
