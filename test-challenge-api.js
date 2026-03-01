#!/usr/bin/env node

// Quick test for the new friend challenge API
const http = require('http');

function makeRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function testChallengeAPI() {
  console.log('\n========================================');
  console.log('Testing Friend Challenge API');
  console.log('========================================\n');

  try {
    // Test 1: Create a friend challenge
    console.log('Test 1: Creating friend challenge (Rick challenges Mel)...');
    const challengeRes = await makeRequest('POST', '/api/friend-challenges', {
      challenge: {
        challenger: 'RICK',
        challenged_user: 'Mel',
        dailyChallenge: true
      }
    });
    
    if (challengeRes.status !== 200) {
      throw new Error(`Failed to create challenge: ${challengeRes.status}`);
    }
    
    console.log('✅ Challenge created successfully');
    console.log('   Challenge ID:', challengeRes.data.challenge.id);
    console.log('   Challenger:', challengeRes.data.challenge.challenger);
    console.log('   Challenged User:', challengeRes.data.challenge.challenged_user);

    // Test 2: Get all challenges
    console.log('\nTest 2: Getting all challenges...');
    const allRes = await makeRequest('GET', '/api/friend-challenges');
    
    if (allRes.status !== 200) {
      throw new Error(`Failed to get challenges: ${allRes.status}`);
    }
    
    console.log('✅ Retrieved challenges');
    console.log('   Total challenges:', allRes.data.challenges.length);

    // Test 3: Get pending challenges for Mel
    console.log('\nTest 3: Getting pending challenges for Mel...');
    const pendingRes = await makeRequest('GET', '/api/friend-challenges/pending/Mel');
    
    if (pendingRes.status !== 200) {
      throw new Error(`Failed to get pending challenges: ${pendingRes.status}`);
    }
    
    console.log('✅ Retrieved pending challenges for Mel');
    console.log('   Pending challenges count:', pendingRes.data.pendingChallenges.length);
    
    if (pendingRes.data.pendingChallenges.length > 0) {
      const pending = pendingRes.data.pendingChallenges[0];
      console.log('   First challenge from:', pending.challenger);
      console.log('   Created:', new Date(pending.created).toLocaleString());
    }

    console.log('\n========================================');
    console.log('✅ All tests passed!');
    console.log('========================================\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('\nMake sure the Express server is running:');
    console.error('  npm run server');
    process.exit(1);
  }
}

testChallengeAPI();
