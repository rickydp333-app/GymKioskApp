#!/usr/bin/env node

// Debug script to check friend challenges in the system
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

async function debugChallenges() {
  console.log('\n========================================');
  console.log('FRIEND CHALLENGE DEBUG');
  console.log('========================================\n');

  try {
    // Get all challenges
    console.log('1️⃣ Getting all challenges in system...');
    const allRes = await makeRequest('GET', '/api/friend-challenges');
    
    if (allRes.status !== 200) {
      throw new Error(`Failed to get challenges: ${allRes.status}`);
    }
    
    const challenges = allRes.data.challenges || [];
    console.log(`   Found ${challenges.length} total challenges\n`);
    
    if (challenges.length > 0) {
      console.log('   Challenges:');
      challenges.forEach((c, i) => {
        const date = new Date(c.created).toLocaleString();
        console.log(`   ${i + 1}. ${c.challenger} → ${c.challenged_user}`);
        console.log(`      Created: ${date}`);
        console.log(`      Daily Challenge: ${c.dailyChallenge}\n`);
      });
    }

    // Check pending for RICK
    console.log('\n2️⃣ Checking pending challenges for RICK...');
    const rickRes = await makeRequest('GET', '/api/friend-challenges/pending/RICK');
    const rickPending = rickRes.data.pendingChallenges || [];
    console.log(`   Pending for RICK: ${rickPending.length}`);

    // Check pending for Mel
    console.log('\n3️⃣ Checking pending challenges for Mel...');
    const melRes = await makeRequest('GET', '/api/friend-challenges/pending/Mel');
    const melPending = melRes.data.pendingChallenges || [];
    console.log(`   Pending for Mel: ${melPending.length}`);

    // Check pending for Kean
    console.log('\n4️⃣ Checking pending challenges for Kean...');
    const keanRes = await makeRequest('GET', '/api/friend-challenges/pending/Kean');
    const keanPending = keanRes.data.pendingChallenges || [];
    console.log(`   Pending for Kean: ${keanPending.length}`);

    // Check pending for KEAN (uppercase)
    console.log('\n5️⃣ Checking pending challenges for KEAN (uppercase)...');
    const keanUpperRes = await makeRequest('GET', '/api/friend-challenges/pending/KEAN');
    const keanUpperPending = keanUpperRes.data.pendingChallenges || [];
    console.log(`   Pending for KEAN: ${keanUpperPending.length}`);

    // Create a test challenge
    console.log('\n6️⃣ Creating test challenge (RICK → KEAN)...');
    const testRes = await makeRequest('POST', '/api/friend-challenges', {
      challenge: {
        challenger: 'RICK',
        challenged_user: 'KEAN',
        dailyChallenge: true
      }
    });
    
    if (testRes.status === 200) {
      console.log('   ✅ Challenge created');
      console.log('   ID:', testRes.data.challenge.id);
    }

    // Check pending for KEAN again
    console.log('\n7️⃣ Rechecking pending challenges for KEAN...');
    const keanRes2 = await makeRequest('GET', '/api/friend-challenges/pending/KEAN');
    const keanPending2 = keanRes2.data.pendingChallenges || [];
    console.log(`   Pending for KEAN: ${keanPending2.length}`);
    if (keanPending2.length > 0) {
      console.log('   ✅ Found pending challenge!');
      console.log('   From:', keanPending2[0].challenger);
    }

    console.log('\n========================================\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

debugChallenges();
