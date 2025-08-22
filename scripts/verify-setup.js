#!/usr/bin/env node

/**
 * Verification script to check if the email parser CRM service is properly set up
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Verifying Email Parser CRM Setup...\n');

const checks = [
  {
    name: 'Package.json exists',
    check: () => fs.existsSync('package.json'),
    fix: 'Run: npm init'
  },
  {
    name: 'TypeScript config exists',
    check: () => fs.existsSync('tsconfig.json'),
    fix: 'Create tsconfig.json file'
  },
  {
    name: 'Source directory structure',
    check: () => {
      const dirs = ['src', 'src/services', 'src/utils', 'src/types'];
      return dirs.every(dir => fs.existsSync(dir));
    },
    fix: 'Create missing source directories'
  },
  {
    name: 'Core service files exist',
    check: () => {
      const files = [
        'src/index.ts',
        'src/services/gmail.ts',
        'src/services/parser.ts',
        'src/services/crm.ts',
        'src/utils/logger.ts',
        'src/utils/deduplication.ts',
        'src/types/index.ts'
      ];
      return files.every(file => fs.existsSync(file));
    },
    fix: 'Create missing service files'
  },
  {
    name: 'Railway configuration',
    check: () => fs.existsSync('railway.json') && fs.existsSync('Procfile'),
    fix: 'Create railway.json and Procfile'
  },
  {
    name: 'Environment template',
    check: () => fs.existsSync('env.example'),
    fix: 'Create env.example file'
  },
  {
    name: 'Git ignore file',
    check: () => fs.existsSync('.gitignore'),
    fix: 'Create .gitignore file'
  },
  {
    name: 'README documentation',
    check: () => fs.existsSync('README.md'),
    fix: 'Create README.md file'
  },
  {
    name: 'Required dependencies in package.json',
    check: () => {
      if (!fs.existsSync('package.json')) return false;
      const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
      const required = [
        'express', 'googleapis', 'graphql-request', 'node-cron', 
        'winston', 'dotenv', 'cors'
      ];
      return required.every(dep => pkg.dependencies && pkg.dependencies[dep]);
    },
    fix: 'Install missing dependencies'
  }
];

let passed = 0;
let failed = 0;

checks.forEach((check, index) => {
  process.stdout.write(`${index + 1}. ${check.name}... `);
  
  try {
    if (check.check()) {
      console.log('✅ PASS');
      passed++;
    } else {
      console.log('❌ FAIL');
      console.log(`   Fix: ${check.fix}`);
      failed++;
    }
  } catch (error) {
    console.log('❌ ERROR');
    console.log(`   Error: ${error.message}`);
    failed++;
  }
});

console.log(`\n📊 Results: ${passed} passed, ${failed} failed\n`);

if (failed === 0) {
  console.log('🎉 All checks passed! Your email parser CRM service is ready for deployment.');
  console.log('\nNext steps:');
  console.log('1. Copy env.example to .env and fill in your credentials');
  console.log('2. Run: npm install');
  console.log('3. Run: npm run build');
  console.log('4. Test locally: npm run dev');
  console.log('5. Deploy to Railway: railway up');
} else {
  console.log('❌ Some checks failed. Please fix the issues above before deploying.');
  process.exit(1);
}
