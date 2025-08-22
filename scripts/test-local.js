#!/usr/bin/env node

/**
 * Local testing script for the email parser CRM service
 */

const http = require('http');
const fs = require('fs');

const BASE_URL = process.env.TEST_URL || 'http://localhost:3000';

console.log('🧪 Testing Email Parser CRM Service');
console.log(`Base URL: ${BASE_URL}\n`);

async function makeRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'EmailParserTest/1.0'
      }
    };

    const req = http.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = data ? JSON.parse(data) : {};
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });

    req.on('error', reject);
    
    if (body) {
      req.write(JSON.stringify(body));
    }
    
    req.end();
  });
}

async function runTests() {
  const tests = [
    {
      name: 'Health Check',
      method: 'GET',
      path: '/health',
      expectedStatus: 200
    },
    {
      name: 'Connection Test',
      method: 'GET',
      path: '/test',
      expectedStatus: 200
    },
    {
      name: 'Statistics',
      method: 'GET',
      path: '/stats',
      expectedStatus: 200
    },
    {
      name: 'Recent Emails (Debug)',
      method: 'GET',
      path: '/recent-emails?count=3',
      expectedStatus: 200
    }
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    process.stdout.write(`${test.name}... `);
    
    try {
      const result = await makeRequest(test.method, test.path, test.body);
      
      if (result.status === test.expectedStatus) {
        console.log('✅ PASS');
        if (test.name === 'Health Check') {
          console.log(`   Status: ${result.data.status}`);
          console.log(`   Uptime: ${Math.round(result.data.uptime)}s`);
        } else if (test.name === 'Connection Test') {
          console.log(`   Gmail: ${result.data.gmail ? '✅' : '❌'}`);
          console.log(`   CRM: ${result.data.crm ? '✅' : '❌'}`);
        } else if (test.name === 'Statistics') {
          console.log(`   Total: ${result.data.total}`);
          console.log(`   Success: ${result.data.success}`);
          console.log(`   Failed: ${result.data.failed}`);
        }
        passed++;
      } else {
        console.log(`❌ FAIL (${result.status})`);
        if (result.data.error) {
          console.log(`   Error: ${result.data.error}`);
        }
        failed++;
      }
    } catch (error) {
      console.log('❌ ERROR');
      console.log(`   ${error.message}`);
      failed++;
    }
    
    console.log();
  }

  console.log(`📊 Results: ${passed} passed, ${failed} failed\n`);

  if (failed === 0) {
    console.log('🎉 All tests passed! Service is running correctly.');
  } else {
    console.log('❌ Some tests failed. Check the service logs for more details.');
    
    if (failed === tests.length) {
      console.log('\n💡 Tips:');
      console.log('- Make sure the service is running (npm run dev)');
      console.log('- Check environment variables are set');
      console.log('- Verify API credentials are valid');
    }
  }

  // Optional: Test manual trigger (commented out to avoid accidental triggers)
  /*
  console.log('\n🔄 Manual Trigger Test (optional):');
  console.log('Uncomment the code below to test manual email processing');
  
  try {
    const triggerResult = await makeRequest('POST', '/trigger');
    console.log('Trigger result:', triggerResult.data);
  } catch (error) {
    console.log('Trigger error:', error.message);
  }
  */
}

// Check if service is likely running
async function checkService() {
  try {
    await makeRequest('GET', '/health');
    return true;
  } catch (error) {
    return false;
  }
}

async function main() {
  const isRunning = await checkService();
  
  if (!isRunning) {
    console.log('❌ Service appears to be down or not accessible');
    console.log(`   URL: ${BASE_URL}`);
    console.log('\n💡 To start the service:');
    console.log('   npm run dev (for development)');
    console.log('   npm start (for production)');
    console.log('\n   Or set TEST_URL environment variable to test remote service');
    process.exit(1);
  }

  await runTests();
}

main().catch(console.error);
