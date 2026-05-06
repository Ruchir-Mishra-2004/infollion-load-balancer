/**
 * Express Server with Load Balancer API
 */

const express = require('express');
const ConsistentHashLoadBalancer = require('./loadBalancer');
const { generateRandomIP, isValidIP, getClientIP } = require('./utils/ipGenerator');
const lbRoutes = require('./routes/lb');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// Initialize Load Balancer with nodes
const nodes = ['Node-A', 'Node-B', 'Node-C'];
const weights = {
  'Node-A': 2,  // Node-A gets 2x more traffic
  'Node-B': 1,  // Node-B gets normal traffic
  'Node-C': 1   // Node-C gets normal traffic
};
const loadBalancer = new ConsistentHashLoadBalancer(nodes, weights);

// Middleware to attach load balancer instance
app.use((req, res, next) => {
  req.loadBalancer = loadBalancer;
  next();
});

// Routes
app.use('/api/lb', lbRoutes);

// Root endpoint - simulate traffic
app.get('/', (req, res) => {
  res.json({
    message: 'Load Balancer API is running!',
    endpoints: {
      simulate: 'GET /api/lb/simulate?count=10',
      route: 'POST /api/lb/route (body: { ip: "192.168.1.1" })',
      metrics: 'GET /api/lb/metrics',
      logs: 'GET /api/lb/logs',
      health: 'GET /api/lb/health/:node',
      addNode: 'POST /api/lb/nodes (body: { node: "Node-D", weight: 1 })',
      removeNode: 'DELETE /api/lb/nodes/:node',
      updateWeight: 'PUT /api/lb/nodes/:node/weight (body: { weight: 2 })',
      reset: 'POST /api/lb/reset'
    }
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: 'Endpoint not found'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║   Advanced Load Balancer Server Started                    ║
║   Port: ${PORT}                                                  ║
║   Algorithm: Consistent Hashing with Virtual Nodes         ║
╚════════════════════════════════════════════════════════════╝
  `);
  console.log('Available nodes:', nodes.join(', '));
  console.log('Node weights:', weights);
  console.log('\nVisit http://localhost:' + PORT + ' for API documentation');
});

module.exports = app;
