# Load Balancer - Quick Start Guide

## Installation & Setup

### 1. Install Node.js
Download from https://nodejs.org (v14 or higher)

### 2. Navigate to project
```bash
cd infollion-load_balancer
```

### 3. Install dependencies
```bash
npm install
```

### 4. Run tests
```bash
npm test
```

## Starting the Server

```bash
npm start
```

Or with auto-reload during development:
```bash
npm run dev
```

Server starts at: `http://localhost:3000`

## Verify Installation

```bash
# Check if server is running
curl http://localhost:3000

# Should show API documentation
```

## Testing the Load Balancer

### Option 1: Using curl (Command Line)

**Test 1: Consistent Hashing**
```bash
# First request with IP 192.168.1.100
curl -X POST http://localhost:3000/api/lb/route \
  -H "Content-Type: application/json" \
  -d '{"ip":"192.168.1.100"}'

# Response should show Node-A, Node-B, or Node-C
# {
#   "success": true,
#   "node": "Node-A",
#   "ip": "192.168.1.100",
#   ...
# }

# Second request with SAME IP
curl -X POST http://localhost:3000/api/lb/route \
  -H "Content-Type: application/json" \
  -d '{"ip":"192.168.1.100"}'

# ✓ Should route to SAME NODE as first request
```

**Test 2: Simulate Traffic**
```bash
curl http://localhost:3000/api/lb/simulate?count=10
```

**Test 3: View Metrics**
```bash
curl http://localhost:3000/api/lb/metrics
```

**Test 4: Add Node and See Weight Effect**
```bash
# Add Node-D with weight 3
curl -X POST http://localhost:3000/api/lb/nodes \
  -H "Content-Type: application/json" \
  -d '{"node":"Node-D","weight":3}'

# Simulate 100 requests
curl http://localhost:3000/api/lb/simulate?count=100

# Check metrics - Node-D should have most traffic
curl http://localhost:3000/api/lb/metrics
```

### Option 2: Using Postman

1. Open Postman: https://www.postman.com/downloads/
2. Click "Import" → Upload File
3. Select `POSTMAN_COLLECTION.json`
4. Run requests from collection

### Option 3: Using REST Client Extension (VS Code)

1. Install "REST Client" extension in VS Code
2. Create `test.http` file:

```http
### Route a specific IP
POST http://localhost:3000/api/lb/route
Content-Type: application/json

{"ip":"192.168.1.100"}

###
POST http://localhost:3000/api/lb/route
Content-Type: application/json

{"ip":"192.168.1.100"}

### Simulate traffic
GET http://localhost:3000/api/lb/simulate?count=50

### Get metrics
GET http://localhost:3000/api/lb/metrics

### Add new node
POST http://localhost:3000/api/lb/nodes
Content-Type: application/json

{"node":"Node-D","weight":2}
```

3. Click "Send" on each request

## Key Concepts

### Consistent Hashing
- **Problem**: Normal load balancers route randomly, causing cache misses
- **Solution**: Same IP always routes to same node
- **How**: Hash ring with virtual nodes

### Example Workflow

```
1. Request from 10.0.0.5 → Node-B ✓
2. Same IP again 10.0.0.5 → Node-B ✓ (SAME!)
3. Different IP 10.0.0.6 → Node-A
4. Add new node (Node-D)
5. Request 10.0.0.5 again → Still Node-B (mostly consistent)
```

### Weighted Routing
```
Node-A: weight 2  →  40% traffic
Node-B: weight 1  →  30% traffic
Node-C: weight 1  →  30% traffic
```

More weight = more virtual nodes on the ring = more traffic

### Health Checks
```
# Simulate node failure
curl -X POST http://localhost:3000/api/lb/health/Node-B/toggle

# New requests will fall back to healthy nodes
curl http://localhost:3000/api/lb/simulate?count=5
```

## Expected Results

### Test: Consistent Routing
```
Request 1: {"ip":"192.168.1.1"} → {"node":"Node-A"}
Request 2: {"ip":"192.168.1.1"} → {"node":"Node-A"}  ✓ Same node!
```

### Test: Distribution (100 requests)
```
{
  "requestsByNode": {
    "Node-A": 35,
    "Node-B": 32,
    "Node-C": 33
  }
}
✓ Roughly equal distribution
```

### Test: Weighted Distribution
```
With weights {A:2, B:1, C:1}, 100 requests:
{
  "requestsByNode": {
    "Node-A": 50,   ✓ 2x more
    "Node-B": 25,
    "Node-C": 25
  }
}
```

## Troubleshooting

### Port 3000 already in use
```bash
# Use different port
PORT=3001 npm start

# Or on Windows PowerShell
$env:PORT=3001; npm start
```

### Dependencies not installing
```bash
npm clean-install
```

### Server won't start
```bash
# Check Node.js is installed
node --version

# Should show v14.0.0 or higher
```

### CORS issues when testing
Add this to requests:
```bash
-H "Origin: http://localhost:3000"
```

## Architecture Overview

```
Request (IP: 10.0.0.5)
    ↓
Hash Function (SHA-1)
    ↓
Consistent Hash Ring
    ↓
Find Node on Ring
    ↓
Check Node Health
    ↓
Route to Node-A (or fallback)
    ↓
Log Request + Update Metrics
```

## API Reference

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/lb/route` | POST | Route request based on IP |
| `/api/lb/simulate?count=N` | GET | Simulate N requests |
| `/api/lb/metrics` | GET | Get statistics |
| `/api/lb/logs` | GET | Get request history |
| `/api/lb/health/:node` | GET | Check node health |
| `/api/lb/nodes` | POST | Add node |
| `/api/lb/nodes/:node` | DELETE | Remove node |
| `/api/lb/nodes/:node/weight` | PUT | Update weight |
| `/api/lb/reset` | POST | Clear metrics |

## Production Deployment

### Using PM2 (Process Manager)
```bash
npm install -g pm2
pm2 start src/app.js --name "load-balancer"
pm2 logs
```

### Using Docker (Optional)
```bash
# Create Dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY src ./src
EXPOSE 3000
CMD ["node", "src/app.js"]

# Build and run
docker build -t load-balancer .
docker run -p 3000:3000 load-balancer
```

---

**Next Steps**: Read [README.md](README.md) for detailed API documentation
