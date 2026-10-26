#!/usr/bin/env node

// Simple test script to run OpenAPI generation and capture errors
const { execSync } = require('child_process');

try {
  console.log('Building api-server...');
  execSync('yarn workspace @apps/api-server build', {
    stdio: 'inherit',
    cwd: '/home/phathdt/Data/Dev/vyrak'
  });

  console.log('\nRunning OpenAPI generation...');
  execSync('node dist/apps/api-server/generate-openapi.js', {
    stdio: 'inherit',
    cwd: '/home/phathdt/Data/Dev/vyrak'
  });

  console.log('\n✅ OpenAPI generated successfully!');
  process.exit(0);
} catch (error) {
  console.error('\n❌ Error during OpenAPI generation:');
  console.error(error.message);
  if (error.stdout) {
    console.error('STDOUT:', error.stdout.toString());
  }
  if (error.stderr) {
    console.error('STDERR:', error.stderr.toString());
  }
  process.exit(1);
}
