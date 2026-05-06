# Load Balancer - Interactive Demo Guide

## 🎬 Live Demonstration Workflow

This guide walks you through testing all features of the load balancer in ~5 minutes.

### Prerequisites
- Server running: `npm start` (in terminal)
- Postman or curl available
- Another terminal for API calls

---

## 📍 STEP 1: Verify Server is Running (30 seconds)

### Check server health
```bash
curl http://localhost:3000
```

**Expected Output:**
```json
{
  "message": "Load Balancer API is running!",
  "endpoints": { ... }
}
```

✓ **Result**: Server is responsive

---

## 📍 STEP 2: Consistent Hashing Test (1 minute)

### Concept
Same IP address should ALWAYS route to the SAME node.

### Test: Route Same IP Multiple Times

**Request 1:**
```bash
curl -X POST http://localhost:3000/api/lb/route \
  -H "Content-Type: application/json" \
  -d '{"ip":"10.0.0.100"}'
```

**Response:**
```json
{
  "success": true,
  "node": "Node-A",
  "ip": "10.0.0.100",
  "hash": 1234567890,
  "timestamp": "2026-05-06T10:30:45.123Z",
  "requestCount": 1
}
```

📌 **Note the node**: Node-A

---

**Request 2: Same IP again**
```bash
curl -X POST http://localhost:3000/api/lb/route \
  -H "Content-Type: application/json" \
  -d '{"ip":"10.0.0.100"}'
```

**Response:**
```json
{
  "success": true,
  "node": "Node-A",  ← SAME NODE!
  "ip": "10.0.0.100",
  "hash": 1234567890,
  "timestamp": "2026-05-06T10:30:46.456Z",
  "requestCount": 2
}
```

---

**Request 3: Different IP**
```bash
curl -X POST http://localhost:3000/api/lb/route \
  -H "Content-Type: application/json" \
  -d '{"ip":"10.0.0.200"}'
```

**Response:**
```json
{
  "success": true,
  "node": "Node-B",  ← Different IP → Different Node
  "ip": "10.0.0.200",
  "hash": 9876543210,
  "timestamp": "2026-05-06T10:30:47.789Z",
  "requestCount": 1
}
```

✓ **Result**: 
- Same IP (10.0.0.100) → Always Node-A
- Different IP (10.0.0.200) → Node-B

---

## 📍 STEP 3: Distribution Test (1 minute)

### Concept
Multiple different IPs should distribute evenly across nodes.

### Test: Simulate 50 Requests

```bash
curl "http://localhost:3000/api/lb/simulate?count=50"
```

**Response:**
```json
{
  "message": "Traffic simulation completed",
  "summary": {
    "totalSimulated": 50,
    "successful": 50,
    "failed": 0,
    "distribution": {
      "Node-A": 19,  ← 38%
      "Node-B": 15,  ← 30%
      "Node-C": 16   ← 32%
    }
  },
  "recentRequests": [ ... ]
}
```

✓ **Result**: Traffic distributed roughly evenly across nodes

---

## 📍 STEP 4: View Metrics (30 seconds)

### Test: Get Overall Statistics

```bash
curl "http://localhost:3000/api/lb/metrics"
```

**Response:**
```json
{
  "message": "Load Balancer Metrics",
  "data": {
    "totalRequests": 52,
    "failedRequests": 0,
    "successRate": "100%",
    "requestsByNode": {
      "Node-A": 20,
      "Node-B": 16,
      "Node-C": 16
    },
    "uniqueIPs": 52,
    "activeNodes": 3,
    "healthyNodes": 3,
    "nodeHealth": {
      "Node-A": {
        "healthy": true,
        "requests": 20,
        "failureCount": 0
      },
      "Node-B": { ... },
      "Node-C": { ... }
    }
  }
}
```

✓ **Result**: Metrics show balanced distribution

---

## 📍 STEP 5: Weighted Routing Test (1 minute)

### Concept
Nodes with higher weight receive more traffic.

### Test A: Add Node with High Weight

```bash
curl -X POST "http://localhost:3000/api/lb/nodes" \
  -H "Content-Type: application/json" \
  -d '{"node":"Node-Premium","weight":3}'
```

**Response:**
```json
{
  "message": "Node Node-Premium added successfully",
  "node": "Node-Premium",
  "weight": 3,
  "totalNodes": 4
}
```

### Test B: Simulate 100 Requests

```bash
curl "http://localhost:3000/api/lb/simulate?count=100"
```

**Response:**
```json
{
  "summary": {
    "totalSimulated": 100,
    "successful": 100,
    "failed": 0,
    "distribution": {
      "Node-A": 18,        ← ~18%
      "Node-B": 15,        ← ~15%
      "Node-C": 17,        ← ~17%
      "Node-Premium": 50   ← ~50% (weight 3!)
    }
  }
}
```

### Test C: Verify in Metrics

```bash
curl "http://localhost:3000/api/lb/metrics"
```

✓ **Result**: Node-Premium has ~50% of traffic (3x weight)

---

## 📍 STEP 6: Health Check Test (1 minute)

### Concept
When a node is unhealthy, requests are routed to healthy nodes.

### Test A: Check Node Health

```bash
curl "http://localhost:3000/api/lb/health/Node-B"
```

**Response:**
```json
{
  "node": "Node-B",
  "health": {
    "healthy": true,
    "requests": 30,
    "failureCount": 0
  }
}
```

### Test B: Simulate Node Failure

```bash
curl -X POST "http://localhost:3000/api/lb/health/Node-B/toggle"
```

**Response:**
```json
{
  "message": "Node Node-B health toggled",
  "node": "Node-B",
  "newHealth": false
}
```

### Test C: Verify Node is Down

```bash
curl "http://localhost:3000/api/lb/health/Node-B"
```

**Response:**
```json
{
  "node": "Node-B",
  "health": {
    "healthy": false,     ← DOWN!
    "requests": 30,
    "failureCount": 1
  }
}
```

### Test D: Simulate Traffic (Node-B Down)

```bash
curl "http://localhost:3000/api/lb/simulate?count=20"
```

**Response:**
```json
{
  "distribution": {
    "Node-A": 7,        ← Gets traffic
    "Node-B": 0,        ← SKIPPED (down)
    "Node-C": 7,        ← Gets traffic
    "Node-Premium": 6   ← Gets traffic
  }
}
```

✓ **Result**: Node-B receives NO traffic while down

### Test E: Restore Node Health

```bash
curl -X POST "http://localhost:3000/api/lb/health/Node-B/toggle"
```

```bash
curl "http://localhost:3000/api/lb/simulate?count=20"
```

✓ **Result**: Node-B receives traffic again

---

## 📍 STEP 7: Dynamic Node Management (1 minute)

### Test A: View Current Nodes

```bash
curl "http://localhost:3000/api/lb/metrics"
```

Check `activeNodes` count.

### Test B: Remove Node

```bash
curl -X DELETE "http://localhost:3000/api/lb/nodes/Node-Premium"
```

**Response:**
```json
{
  "message": "Node Node-Premium removed successfully",
  "node": "Node-Premium",
  "totalNodes": 3
}
```

### Test C: Verify Removed

```bash
curl "http://localhost:3000/api/lb/simulate?count=30"
```

**Response:**
```json
{
  "distribution": {
    "Node-A": 10,
    "Node-B": 10,
    "Node-C": 10
    // Node-Premium is gone!
  }
}
```

✓ **Result**: Node-Premium no longer receives traffic

---

## 📍 STEP 8: Request Logs (30 seconds)

### Test: View Recent Requests

```bash
curl "http://localhost:3000/api/lb/logs?limit=10"
```

**Response:**
```json
{
  "message": "Request History",
  "count": 10,
  "logs": [
    {
      "timestamp": "2026-05-06T10:35:22.111Z",
      "ip": "192.168.1.50",
      "selectedNode": "Node-A",
      "hash": 123456789
    },
    {
      "timestamp": "2026-05-06T10:35:23.222Z",
      "ip": "10.0.0.100",
      "selectedNode": "Node-C",
      "hash": 987654321
    },
    ...
  ]
}
```

✓ **Result**: Detailed log of all requests

---

## 📍 STEP 9: Rate Limiting Test (Optional, 1 minute)

### Concept
Prevent abuse by limiting requests per IP.

### Test: Rapid Fire Requests (Default: 100/minute)

```bash
for i in {1..10}; do
  curl -X POST "http://localhost:3000/api/lb/route" \
    -H "Content-Type: application/json" \
    -d '{"ip":"192.168.0.1"}' &
done
wait
```

All 10 requests should succeed (under limit).

### To Test Limit:
Modify `src/loadBalancer.js`:
```javascript
this.rateLimitRequests = 5;  // Set to 5 instead of 100
```

Restart server and try 10 requests again. Last 5 will be rate-limited.

---

## 📍 STEP 10: Reset Everything (30 seconds)

### Test: Clear All Metrics

```bash
curl -X POST "http://localhost:3000/api/lb/reset"
```

**Response:**
```json
{
  "message": "Load Balancer Reset successfully",
  "timestamp": "2026-05-06T10:37:00.000Z"
}
```

### Verify Reset

```bash
curl "http://localhost:3000/api/lb/metrics"
```

**Response:**
```json
{
  "totalRequests": 0,    ← Reset
  "failedRequests": 0,
  "requestsByNode": {
    "Node-A": 0,
    "Node-B": 0,
    "Node-C": 0
  },
  "uniqueIPs": 0
}
```

✓ **Result**: All metrics cleared

---

## 🎬 Demo Flow Summary

| Step | Feature | Duration | Result |
|------|---------|----------|--------|
| 1 | Server Health | 30s | ✓ Running |
| 2 | Consistent Hashing | 1m | ✓ Same IP→Same Node |
| 3 | Distribution | 1m | ✓ Even spread |
| 4 | Metrics | 30s | ✓ Balanced |
| 5 | Weighted Routing | 1m | ✓ Premium: 50% traffic |
| 6 | Health Checks | 1m | ✓ Failover working |
| 7 | Dynamic Nodes | 1m | ✓ Add/Remove nodes |
| 8 | Request Logs | 30s | ✓ Detailed history |
| 9 | Rate Limiting | 1m | ✓ Limit enforced |
| 10 | Reset | 30s | ✓ Clean slate |

**Total Duration**: ~8 minutes

---

## 📌 Key Observations

### Observation 1: Consistency
```
IP 10.0.0.100 → Route 1: Node-A
IP 10.0.0.100 → Route 2: Node-A
IP 10.0.0.100 → Route 3: Node-A
✓ Same node every time!
```

### Observation 2: Load Distribution
```
With 3 nodes and random IPs:
Node-A: 33.3% traffic
Node-B: 33.3% traffic
Node-C: 33.3% traffic
✓ Evenly distributed!
```

### Observation 3: Weighted Distribution
```
With Node-Premium (weight: 3):
Node-A: 20% traffic
Node-B: 20% traffic
Node-C: 20% traffic
Node-Premium: 40% traffic
✓ 2x traffic due to 3x weight!
```

### Observation 4: Failover
```
With Node-B down:
Node-A: Receives traffic ✓
Node-B: NO traffic ✗
Node-C: Receives traffic ✓
✓ Automatic failover!
```

---

## 📊 Sample API Responses

### Successful Route
```json
{
  "success": true,
  "node": "Node-A",
  "ip": "192.168.1.100",
  "hash": 12345678901234,
  "timestamp": "2026-05-06T10:30:45.123Z",
  "requestCount": 5
}
```

### Rate Limited
```json
{
  "success": false,
  "node": null,
  "ip": "192.168.1.1",
  "reason": "Rate limit exceeded",
  "timestamp": "2026-05-06T10:30:50.456Z"
}
```

### Metrics
```json
{
  "totalRequests": 250,
  "failedRequests": 3,
  "successRate": "98.8%",
  "requestsByNode": {
    "Node-A": 85,
    "Node-B": 82,
    "Node-C": 83
  },
  "uniqueIPs": 150,
  "activeNodes": 3,
  "healthyNodes": 3
}
```

---

## ✅ Demo Completion Checklist

- [ ] Step 1: Server running
- [ ] Step 2: Consistent hashing confirmed
- [ ] Step 3: Distribution verified
- [ ] Step 4: Metrics accessible
- [ ] Step 5: Weighted routing working
- [ ] Step 6: Health checks and failover working
- [ ] Step 7: Can add/remove nodes
- [ ] Step 8: Request logs visible
- [ ] Step 9: Rate limiting works
- [ ] Step 10: Reset clears metrics

---

## 🎤 Demo Talking Points

1. **Consistent Hashing**
   - "Same IP always routes to same node, minimizing cache misses"
   - Demo: Route same IP 3 times, same node each time

2. **Virtual Nodes**
   - "Each node has 150 virtual points per weight unit for even distribution"
   - Demo: Add Node-Premium with weight 3, gets 50% traffic

3. **Health Checks**
   - "Automatically detects failed nodes and routes to healthy ones"
   - Demo: Toggle node health, show traffic rerouting

4. **Metrics**
   - "Real-time visibility into traffic distribution"
   - Demo: Show metrics dashboard

5. **Rate Limiting**
   - "Prevents abuse by limiting per-IP requests"
   - Demo: Explain limits (show code)

6. **Dynamic Management**
   - "Add/remove nodes without downtime"
   - Demo: Add and remove nodes, show metrics updating

---

## 🎓 Takeaways

This demo shows:
✓ How consistent hashing solves cache invalidation
✓ How weighted routing distributes load
✓ How health checks enable failover
✓ How rate limiting prevents abuse
✓ How real-time metrics guide operations
✓ How the system handles topology changes

---

**Ready to Demo! Start with: `npm start`**
