#!/usr/bin/env node

require('dotenv').config();

const { browserCRMService } = require('../dist/services/browser-crm');

async function main() {
  const required = ['TWENTY_API_URL', 'TWENTY_USERNAME', 'TWENTY_PASSWORD'];
  const missing = required.filter(k => !process.env[k] || String(process.env[k]).trim() === '');
  if (missing.length) {
    console.error('Missing required env vars for browser test:', missing.join(', '));
    process.exit(1);
  }

  const parsedLead = {
    name: 'Automation Test Lead',
    email: 'test+automation@example.com',
    phone: '+15555550123',
    message: 'Automated test lead via browser',
    utmSource: 'google_ads',
    utmMedium: 'cpc',
    utmCampaign: 'browser-test',
    utmTerm: 'roofing',
    utmContent: 'ad1'
  };

  try {
    const id = await browserCRMService.createLeadViaBrowser(parsedLead);
    console.log('✅ Created via browser:', id);
    process.exit(0);
  } catch (e) {
    console.error('❌ Browser creation failed:', e && e.message || e);
    process.exit(1);
  }
}

main();


