#!/usr/bin/env node

const { version } = require('../package.json');

const args = process.argv.slice(2);

if (args.includes('--version') || args.includes('-v')) {
  console.log(`chathai version ${version}`);
  process.exit(0);
}

// logic อื่น ๆ ของ CLI...
console.log('🎉 Welcome to Chathai CLI!');
