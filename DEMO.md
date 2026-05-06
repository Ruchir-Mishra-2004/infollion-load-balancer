#!/usr/bin/env node

/**
 * Load Balancer API - Quick Demo Script
 * This script demonstrates key features of the load balancer
 */

const fetch = require('node-fetch') || (() => {
  throw new Error('Using native fetch');
})();

// Since node-fetch is not installed, we'll use a simple curl-based approach
// Or demonstrate using built-in Node fetch (v18+)

const BASE_URL = 'http://localhost:3000';

async function demo() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║        Load Balancer API - Live Demonstration             ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  const demoSteps = [
    {
      description: '1️⃣  Route a specific IP (should always go to same node)',
      endpoint: '/api/lb/route',
      method: 'POST',
      body: '{"ip":"10.20.30.40"}'
    },
    {
      description: '2️⃣  Route same IP again (should get same node)',
      endpoint: '/api/lb/route',
      method: 'POST',
      body: '{"ip":"10.20.30.40"}'
    },
    {
      description: '3️⃣  Simulate 50 requests with different IPs',
      endpoint: '/api/lb/simulate?count=50',
      method: 'GET'
    },
    {
      description: '4️⃣  Check load distribution (metrics)',
      endpoint: '/api/lb/metrics',
      method: 'GET'
    },
    {
      description: '5️⃣  View recent request logs',
      endpoint: '/api/lb/logs?limit=5',
      method: 'GET'
    },
    {
      description: '6️⃣  Add a new node with higher weight',
      endpoint: '/api/lb/nodes',
      method: 'POST',
      body: '{"node":"Node-Premium","weight":3}'
    },
    {
      description: '7️⃣  Simulate 20 more requests',
      endpoint: '/api/lb/simulate?count=20',
      method: 'GET'
    },
    {
      description: '8️⃣  Check metrics again (see weight effect)',
      endpoint: '/api/lb/metrics',
      method: 'GET'
    }
  ];

  console.log('Available Demo Steps:\n');
  demoSteps.forEach((step, i) => {
    console.log(`${step.description}`);
    console.log(`   Endpoint: ${step.method} ${step.endpoint}`);
    if (step.body) {
      console.log(`   Body: ${step.body}`);
    }
    console.log();
  });

  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  To run demo, use curl commands below or import           ║');
  console.log('║  POSTMAN_COLLECTION.json into Postman                     ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  console.log('CURL Examples:\n');

  console.log('# Route a specific IP');
  console.log('curl -X POST http://localhost:3000/api/lb/route \\');
  console.log('  -H "Content-Type: application/json" \\');
  console.log('  -d \'{"ip":"10.20.30.40"}\'');
  console.log();

  console.log('# Simulate traffic');
  console.log('curl http://localhost:3000/api/lb/simulate?count=50');
  console.log();

  console.log('# Get metrics');
  console.log('curl http://localhost:3000/api/lb/metrics');
  console.log();

  console.log('# Add new node with higher weight');
  console.log('curl -X POST http://localhost:3000/api/lb/nodes \\');
  console.log('  -H "Content-Type: application/json" \\');
  console.log('  -d \'{"node":"Node-Premium","weight":3}\'');
  console.log();
}

demo().catch(console.error);
