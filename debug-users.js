// Quick debug script to check users in storage
const fs = require('fs');
const path = require('path');

// Check localStorage by reading data/users.json
const usersPath = path.join(__dirname, 'data', 'users.json');
const dataDir = path.join(__dirname, 'data');

console.log('\n=== DEBUGGING USER DATA ===\n');

// Check if data directory exists
if (fs.existsSync(dataDir)) {
  console.log('✅ data/ directory exists');
  console.log('Files:', fs.readdirSync(dataDir));
} else {
  console.log('❌ data/ directory does NOT exist');
}

// Check if users.json exists
if (fs.existsSync(usersPath)) {
  console.log('\n✅ users.json exists');
  const content = JSON.parse(fs.readFileSync(usersPath, 'utf8'));
  console.log('Users found:', content.length);
  content.forEach(u => {
    console.log(`  - ${u.username} (PIN: ${u.pin ? '****' : 'none'})`);
  });
} else {
  console.log('\n❌ users.json does NOT exist');
  console.log('Users should be created from seedDefaultUser() in ui.js');
}

console.log('\n=== NOTE ===');
console.log('The Electron app uses localStorage in the browser.');
console.log('Data is NOT persisted in data/users.json unless explicitly saved.');
console.log('To check users, you need to inspect localStorage from DevTools in Electron.');
console.log('\nPress F12 or Ctrl+Shift+I in Electron to open DevTools.');
console.log('Then run: JSON.parse(localStorage.getItem("users"))');
