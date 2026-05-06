# Advanced Load Balancer API

A production-ready load balancer implementation using **Consistent Hashing** with support for weighted routing, health checks, metrics, and rate limiting.

## 📋 Overview

This project implements an advanced load balancer with the following features:

- **Consistent Hashing**: Same IP address always routes to the same node, even when nodes are added/removed
- **Weighted Routing**: Prioritize certain nodes by assigning them higher weights
- **Health Checks**: Monitor node health and fallback to healthy nodes
- **Metrics Dashboard**: Track request distribution and performance metrics
- **Rate Limiting**: Prevent abuse with configurable per-IP rate limiting
- **Dynamic Node Management**: Add/remove nodes without downtime
- **Comprehensive Logging**: Track every request with timestamps and hashes

## 🏗️ Project Structure

```
infollion-load_balancer/
├── src/
│   ├── app.js                 # Express server and initialization
│   ├── loadBalancer.js        # Core consistent hashing algorithm
│   ├── test.js                # Test suite
│   ├── utils/
│   │   └── ipGenerator.js     # IP utilities
│   └── routes/
│       └── lb.js              # API routes
├── package.json               # Project dependencies
├── README.md                  # This file
├── POSTMAN_COLLECTION.json    # Postman collection for testing
└── .gitignore                 # Git ignore rules
```

## 🚀 Quick Start

### Prerequisites

- **Node.js** (v14 or higher)
- **npm** (comes with Node.js)

### Installation

1. **Clone the repository** (or download and extract):
```bash
cd infollion-load_balancer
```

2. **Install dependencies**:
```bash
npm install
```

### Running the Server

**Development mode** (with auto-reload):
```bash
npm run dev
```

**Production mode**:
```bash
npm start
```

The server will start on `http://localhost:3000`

### Running Tests

Test the load balancer implementation:
```bash
npm test
```

This will run the complete test suite including:
- Consistency checks
- Distribution validation
- Dynamic node management
- Health checks
- Weighted routing
- Metrics collection
- Rate limiting

## 📊 Algorithm Explanation

### Consistent Hashing

The load balancer uses **Consistent Hashing** to ensure the same IP address always routes to the same node.

**How it works:**
1. Each node is hashed and placed on a virtual ring with 150 virtual points per weight unit
2. When a request arrives, the IP is hashed to a position on the ring
3. The next node in clockwise direction is selected
4. If nodes are added/removed, only ~1/N requests need rerouting (where N is node count)

**Benefits:**
- Minimizes cache invalidation when nodes change
- Deterministic routing for the same IP
- Better load distribution than simple round-robin

## 🔌 API Endpoints

### 1. **Route a Request** (Primary Feature)
```
POST /api/lb/route
```
Route a request based on IP address to a node.

**Request Body:**
```json
{
  "ip": "192.168.1.100"
}
```
*Optional: If no IP provided, a random one is generated*

**Response:**
```json
{
  "success": true,
  "node": "Node-A",
  "ip": "192.168.1.100",
  "hash": 12345678,
  "timestamp": "2026-05-06T10:30:45.123Z",
  "requestCount": 5
}
```

### 2. **Simulate Traffic**
```
GET /api/lb/simulate?count=10
```
Simulate multiple requests to test distribution.

### 3. **Get Metrics**
```
GET /api/lb/metrics
```
Get comprehensive metrics about the load balancer.

**Response:**
```json
{
  "message": "Load Balancer Metrics",
  "data": {
    "totalRequests": 100,
    "failedRequests": 0,
    "successRate": "100%",
    "requestsByNode": {
      "Node-A": 50,
      "Node-B": 30,
      "Node-C": 20
    },
    "uniqueIPs": 50,
    "activeNodes": 3,
    "healthyNodes": 3,
    "nodeHealth": { ... }
  }
}
```

### 4. **View Request Logs**
```
GET /api/lb/logs?limit=20
```
Get recent request history.

### 5. **Check Node Health**
```
GET /api/lb/health/:node
```
Example: `GET /api/lb/health/Node-A`

### 6. **Toggle Node Health** (Testing)
```
POST /api/lb/health/:node/toggle
```
Simulate node health status changes.

### 7. **Add a Node**
```
POST /api/lb/nodes
Content-Type: application/json

{
  "node": "Node-D",
  "weight": 2
}
```

### 8. **Remove a Node**
```
DELETE /api/lb/nodes/:node
```
Example: `DELETE /api/lb/nodes/Node-D`

### 9. **Update Node Weight**
```
PUT /api/lb/nodes/:node/weight
Content-Type: application/json

{
  "weight": 3
}
```

### 10. **Reset Metrics**
```
POST /api/lb/reset
```
Clear all metrics and logs.

## 🧪 Testing with Postman

1. **Import the Postman Collection**:
   - Open Postman
   - Click `Import` → `Upload File`
   - Select `POSTMAN_COLLECTION.json`

2. **Or manually test**:

```bash
# Route a request
curl -X POST http://localhost:3000/api/lb/route \
  -H "Content-Type: application/json" \
  -d '{"ip":"192.168.1.100"}'

# Simulate 10 requests
curl http://localhost:3000/api/lb/simulate?count=10

# Get metrics
curl http://localhost:3000/api/lb/metrics

# Add a node
curl -X POST http://localhost:3000/api/lb/nodes \
  -H "Content-Type: application/json" \
  -d '{"node":"Node-D","weight":1}'

# Route same IP again (should go to same node)
curl -X POST http://localhost:3000/api/lb/route \
  -H "Content-Type: application/json" \
  -d '{"ip":"192.168.1.100"}'
```

## 📊 Example Workflow

### Scenario 1: Consistent Hashing Test

```bash
# Request 1: Route IP 10.0.0.5
curl -X POST http://localhost:3000/api/lb/route \
  -H "Content-Type: application/json" \
  -d '{"ip":"10.0.0.5"}'
# Response: Node-B

# Request 2: Route same IP again
curl -X POST http://localhost:3000/api/lb/route \
  -H "Content-Type: application/json" \
  -d '{"ip":"10.0.0.5"}'
# Response: Node-B (SAME!)

# Add a new node
curl -X POST http://localhost:3000/api/lb/nodes \
  -H "Content-Type: application/json" \
  -d '{"node":"Node-D","weight":1}'

# Request 3: Route same IP after adding node
curl -X POST http://localhost:3000/api/lb/route \
  -H "Content-Type: application/json" \
  -d '{"ip":"10.0.0.5"}'
# Response: Might change, but deterministic due to consistent hashing
```

### Scenario 2: Weighted Routing Test

```bash
# Update Node-A weight to 3 (gets 3x more traffic)
curl -X PUT http://localhost:3000/api/lb/nodes/Node-A/weight \
  -H "Content-Type: application/json" \
  -d '{"weight":3}'

# Simulate 100 requests
curl http://localhost:3000/api/lb/simulate?count=100

# Check metrics - Node-A should have ~50% of requests
curl http://localhost:3000/api/lb/metrics
```

### Scenario 3: Health Check Fallback

```bash
# Mark Node-B as unhealthy
curl -X POST http://localhost:3000/api/lb/health/Node-B/toggle

# Route requests - should fallback to healthy nodes
curl http://localhost:3000/api/lb/simulate?count=5

# Check metrics
curl http://localhost:3000/api/lb/metrics
```

## 🔑 Key Features Explained

### 1. Consistent Hashing Algorithm

**How IP routing works:**
- Each node gets 150 × weight virtual positions on a hash ring
- IP address is hashed to a position
- The next node clockwise is selected
- Same IP always hashes to same position → same node

**Virtual nodes benefit:**
- Better distribution than single point per node
- Weights naturally affect traffic distribution
- Minimal rerouting when topology changes

### 2. Weighted Routing

Configure how much traffic each node receives:

```
Node-A: weight = 2  → 40% of traffic
Node-B: weight = 1  → 30% of traffic  
Node-C: weight = 1  → 30% of traffic
```

Implementation: More virtual nodes on ring = more traffic

### 3. Health Checking

Monitor node status:
- Each node tracks health state and failure count
- Unhealthy nodes are excluded from routing
- Fallback to healthy nodes while maintaining consistency
- Toggle health for testing

### 4. Rate Limiting

Prevent abuse:
- Per-IP rate limiting (100 requests/minute by default)
- Sliding window implementation
- Configurable limits in code

### 5. Metrics Collection

Track performance:
- Total requests and success rate
- Per-node request distribution
- Unique IP count
- Node health status
- Failure count

## 🛠️ Configuration

Edit `src/app.js` to modify default settings:

```javascript
// Change initial nodes
const nodes = ['Node-A', 'Node-B', 'Node-C', 'Node-D'];

// Set node weights
const weights = {
  'Node-A': 2,  // 2x weight
  'Node-B': 1,  // Normal weight
  'Node-C': 1,  // Normal weight
  'Node-D': 1
};
```

Edit `src/loadBalancer.js` for advanced config:

```javascript
this.rateLimitWindow = 60000;      // 1 minute window
this.rateLimitRequests = 100;      // 100 requests per window
const virtualNodeCount = 150;      // Points per weight unit
```

## 📈 Performance Characteristics

| Operation | Time Complexity | Notes |
|-----------|-----------------|-------|
| Route Request | O(log N) | Binary search on ring |
| Add Node | O(M) | M = virtual nodes per weight |
| Remove Node | O(M) | Rebuild ring |
| Get Metrics | O(N) | N = unique IPs |
| Health Check | O(1) | Direct lookup |

N = number of nodes
M = virtual nodes per weight (typically 150 × weight)

## 🐛 Debugging

Enable detailed logging by modifying `src/loadBalancer.js`:

```javascript
console.log(`[DEBUG] IP: ${ip}, Hash: ${hash}, Node: ${node}`);
```

## 🤝 Contributing

To extend the load balancer:

1. **Add new algorithm**: Extend or replace `_findNode()` method
2. **Add new features**: Extend the `ConsistentHashLoadBalancer` class
3. **Add new endpoints**: Add routes in `src/routes/lb.js`

## 📝 License

MIT License - feel free to use in your projects!

## 📞 Support

For issues or questions:
1. Check the test suite: `npm test`
2. Review the API documentation in this README
3. Check Postman collection examples

---

**Happy Load Balancing! 🚀**
