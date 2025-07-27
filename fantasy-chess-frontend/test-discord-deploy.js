#!/usr/bin/env node

/**
 * Discord Function Deployment Test
 * Checks if the function is properly deployed and accessible
 */

import https from 'https';

// Test 1: Check if function exists
async function checkFunctionExists() {
  console.log('🔍 Checking if discord-bot function exists...');
  
  const options = {
    hostname: 'wdbwzvnkfbyzazodfhsw.supabase.co',
    port: 443,
    path: '/functions/v1/discord-bot',
    method: 'GET'
  };
  
  return new Promise((resolve) => {
    const req = https.request(options, (res) => {
      console.log(`Status: ${res.statusCode}`);
      console.log(`Headers:`, res.headers);
      
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        console.log(`Response: ${data}`);
        resolve({ statusCode: res.statusCode, data });
      });
    });
    
    req.on('error', (error) => {
      console.log('❌ Error:', error.message);
      resolve({ statusCode: 0, error: error.message });
    });
    
    req.end();
  });
}

// Test 2: Check function with different content types
async function testContentTypes() {
  console.log('🧪 Testing different content types...');
  
  const tests = [
    {
      name: 'application/json',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'create_league_channel', leagueName: 'test', leagueId: 'test' })
    },
    {
      name: 'text/plain',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ action: 'create_league_channel', leagueName: 'test', leagueId: 'test' })
    },
    {
      name: 'no content type',
      headers: {},
      body: JSON.stringify({ action: 'create_league_channel', leagueName: 'test', leagueId: 'test' })
    }
  ];
  
  for (const test of tests) {
    console.log(`  Testing ${test.name}...`);
    
    const options = {
      hostname: 'wdbwzvnkfbyzazodfhsw.supabase.co',
      port: 443,
      path: '/functions/v1/discord-bot',
      method: 'POST',
      headers: {
        'Content-Length': Buffer.byteLength(test.body),
        ...test.headers
      }
    };
    
    try {
      const response = await new Promise((resolve, reject) => {
        const req = https.request(options, (res) => {
          let data = '';
          res.on('data', (chunk) => { data += chunk; });
          res.on('end', () => {
            resolve({ statusCode: res.statusCode, data });
          });
        });
        
        req.on('error', reject);
        req.write(test.body);
        req.end();
      });
      
      console.log(`    Status: ${response.statusCode}`);
      console.log(`    Response: ${response.data}`);
    } catch (error) {
      console.log(`    Error: ${error.message}`);
    }
  }
}

// Test 3: Check if function is deployed
async function checkDeployment() {
  console.log('🚀 Checking function deployment status...');
  
  // Try to access the function with a simple request
  const options = {
    hostname: 'wdbwzvnkfbyzazodfhsw.supabase.co',
    port: 443,
    path: '/functions/v1/discord-bot',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': '2'
    }
  };
  
  return new Promise((resolve) => {
    const req = https.request(options, (res) => {
      console.log(`Deployment check status: ${res.statusCode}`);
      
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        console.log(`Deployment check response: ${data}`);
        
        if (res.statusCode === 404) {
          console.log('❌ Function not deployed or not found');
        } else if (res.statusCode === 500) {
          console.log('⚠️ Function deployed but has internal errors');
        } else if (res.statusCode === 400) {
          console.log('✅ Function is deployed and responding');
        } else {
          console.log(`⚠️ Unexpected status: ${res.statusCode}`);
        }
        
        resolve({ statusCode: res.statusCode, data });
      });
    });
    
    req.on('error', (error) => {
      console.log('❌ Deployment check error:', error.message);
      resolve({ statusCode: 0, error: error.message });
    });
    
    req.write('{}');
    req.end();
  });
}

// Main test runner
async function runDeploymentTests() {
  console.log('🔧 Discord Function Deployment Tests');
  console.log('=' .repeat(50));
  console.log('');
  
  await checkFunctionExists();
  console.log('');
  
  await testContentTypes();
  console.log('');
  
  await checkDeployment();
  console.log('');
  
  console.log('=' .repeat(50));
  console.log('💡 Next Steps:');
  console.log('1. If function returns 404: Deploy the function in Supabase Dashboard');
  console.log('2. If function returns 500: Check function logs for errors');
  console.log('3. If function returns 400: Function is working, check JSON parsing');
  console.log('4. Check Supabase Dashboard → Edge Functions → discord-bot → Logs');
}

runDeploymentTests().catch(console.error); 