import { ParsedLead } from '../types';
import logger from '../utils/logger';

class BrowserCRMService {
  private crmUrl: string;
  private credentials: { username?: string; password?: string };

  constructor() {
    this.crmUrl = process.env.TWENTY_API_URL || 'https://crm.thespartanexteriors.com';
    this.credentials = {
      username: process.env.TWENTY_USERNAME || '',
      password: process.env.TWENTY_PASSWORD || ''
    };
  }

  public async createLeadViaBrowser(parsedLead: ParsedLead): Promise<string | null> {
    try {
      logger.info(`Creating lead via browser automation: ${parsedLead.name}`);

      // Dynamic import to avoid dependency issues if puppeteer is not installed
      const puppeteer = await import('puppeteer');
      
      const browser = await puppeteer.default.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--single-process',
          '--disable-gpu'
        ]
      });

      const page = await browser.newPage();
      
      try {
        // Utilities to interact with elements by visible text (no CSS :contains)
        const clickFirstButtonByText = async (texts: string[]): Promise<boolean> => {
          const selectors = ['button', 'a[role="button"]', '[role="button"]'];
          for (const text of texts) {
            const lower = text.toLowerCase();
            for (const sel of selectors) {
              try {
                const handles = await page.$$(sel);
                for (const h of handles) {
                  const btnText = (await page.evaluate(el => (el as HTMLElement).innerText || el.textContent || '', h)).trim().toLowerCase();
                  if (!btnText) continue;
                  if (btnText === lower || btnText.includes(lower)) {
                    await h.click();
                    return true;
                  }
                }
              } catch (e) {
                // continue
              }
            }
          }
          return false;
        };

        const findClickableBySelectors = async (selectors: string[]) => {
          for (const s of selectors) {
            try {
              const h = await page.$(s);
              if (h) return h;
            } catch (e) {
              // continue
            }
          }
          return null;
        };
        // Set user agent
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
        
        // Navigate to CRM
        await page.goto(this.crmUrl, { waitUntil: 'networkidle2', timeout: 30000 });
        
        // Check if we need to login
        const needsLogin = await page.$('input[type="email"], input[type="password"], input[name="username"], input[name="email"]');
        
        if (needsLogin && this.credentials.username && this.credentials.password) {
          logger.info('Logging into Twenty CRM...');
          
          // Try to find and fill login form
          const emailInput = await page.$('input[type="email"], input[name="username"], input[name="email"]');
          const passwordInput = await page.$('input[type="password"], input[name="password"]');
          
          if (emailInput && passwordInput) {
            await emailInput.type(this.credentials.username);
            await passwordInput.type(this.credentials.password);
            
            // Robust submit: Enter key, then typical submit selectors, then text buttons
            try {
              await passwordInput.press('Enter');
              await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 });
            } catch (e) {}

            const submitHandle = await findClickableBySelectors(['button[type="submit"]', 'input[type="submit"]']);
            if (submitHandle) {
              await submitHandle.click();
              await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }).catch(() => {});
            } else {
              await clickFirstButtonByText(['Sign in', 'Log in', 'Login', 'Continue', 'Submit']);
              await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }).catch(() => {});
            }
          }
        }
        
        // Attempt to land on a page with people/contacts actions
        try { await page.goto(`${this.crmUrl.replace(/\/$/, '')}/people`, { waitUntil: 'networkidle2', timeout: 15000 }); } catch (e) {}
        try { await page.goto(`${this.crmUrl.replace(/\/$/, '')}/contacts`, { waitUntil: 'networkidle2', timeout: 15000 }); } catch (e) {}

        // Look for "Add Person" or similar (without :contains)
        const createButton = await findClickableBySelectors([
          '[data-testid="add-person"]',
          '[data-testid="create-person"]',
          '.create-person-button',
          '.add-person-button'
        ]);

        if (createButton) {
          await createButton.click();
        } else {
          const clicked = await clickFirstButtonByText(['Add Person', 'Create Person', 'Add Lead', 'Create Lead', 'New Person', 'New Lead', 'Add contact', 'New contact']);
          if (!clicked) {
            throw new Error('Could not find create person button');
          }
        }
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Fill in the form fields
        const nameParts = parsedLead.name.split(' ');
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || '';
        
        const fieldMappings = [
          { selectors: ['input[name="firstName"]', '[data-field="firstName"]', '#firstName'], value: firstName },
          { selectors: ['input[name="lastName"]', '[data-field="lastName"]', '#lastName'], value: lastName },
          { selectors: ['input[name="name"]', '[data-field="name"]', '#name'], value: parsedLead.name },
          { selectors: ['input[name="email"]', '[data-field="email"]', '#email', 'input[type="email"]'], value: parsedLead.email || '' },
          { selectors: ['input[name="phone"]', '[data-field="phone"]', '#phone', 'input[type="tel"]'], value: parsedLead.phone || '' },
          { selectors: ['textarea[name="notes"]', '[data-field="notes"]', '#notes', 'textarea'], value: parsedLead.message || '' },
          // UTM fields and source/status if present
          { selectors: ['input[name="utmSource"]', '[data-field="utmSource"]', '#utmSource', 'select[name="utmSource"]'], value: parsedLead.utmSource || '' },
          { selectors: ['input[name="utmMedium"]', '[data-field="utmMedium"]', '#utmMedium'], value: parsedLead.utmMedium || '' },
          { selectors: ['input[name="utmCampaign"]', '[data-field="utmCampaign"]', '#utmCampaign'], value: parsedLead.utmCampaign || '' },
          { selectors: ['input[name="utmTerm"]', '[data-field="utmTerm"]', '#utmTerm'], value: parsedLead.utmTerm || '' },
          { selectors: ['input[name="utmContent"]', '[data-field="utmContent"]', '#utmContent'], value: parsedLead.utmContent || '' },
          { selectors: ['input[name="gclid"]', '[data-field="gclid"]', '#gclid'], value: parsedLead.googleClickId || '' },
          { selectors: ['input[name="fbclid"]', '[data-field="fbclid"]', '#fbclid'], value: parsedLead.facebookClickId || '' },
          { selectors: ['input[name="msclkid"]', '[data-field="msclkid"]', '#msclkid'], value: parsedLead.microsoftClickId || '' },
          { selectors: ['select[name="status"]', '[data-field="status"]', '#status'], value: 'New' },
          { selectors: ['select[name="source"]', '[data-field="source"]', '#source'], value: (parsedLead.utmSource || '').toString() }
        ];

        for (const field of fieldMappings) {
          if (!field.value) continue;
          
          for (const selector of field.selectors) {
            try {
              const input = await page.$(selector);
              if (input) {
                await input.evaluate((el: any) => el.value = '');
                await input.type(field.value);
                break;
              }
            } catch (error) {
              continue;
            }
          }
        }
        
        // Submit the form
        const saveHandle = await findClickableBySelectors([
          'button[type="submit"]',
          '[data-testid="save-person"]',
          '.save-button'
        ]);
        if (saveHandle) {
          await saveHandle.click();
          await new Promise(resolve => setTimeout(resolve, 3000));
        } else {
          await clickFirstButtonByText(['Save', 'Create', 'Submit', 'Add']);
          await new Promise(resolve => setTimeout(resolve, 3000));
        }
        
        // Try to extract the created person ID from the URL or page
        const currentUrl = page.url();
        const personIdMatch = currentUrl.match(/person[s]?\/([a-f0-9-]+)/i) || currentUrl.match(/id=([a-f0-9-]+)/i);
        const personId = personIdMatch ? personIdMatch[1] : `browser-${Date.now()}`;
        
        logger.info(`Successfully created person via browser automation: ${personId}`);
        return personId;
        
      } finally {
        await browser.close();
      }

    } catch (error) {
      logger.error('Failed to create lead via browser automation:', error);
      throw error;
    }
  }

  public async testConnection(): Promise<boolean> {
    try {
      const puppeteer = await import('puppeteer');
      const browser = await puppeteer.default.launch({ headless: true, args: ['--no-sandbox'] });
      const page = await browser.newPage();
      
      await page.goto(this.crmUrl, { timeout: 15000 });
      const title = await page.title();
      
      await browser.close();
      
      return title.length > 0;
    } catch (error) {
      logger.error('Browser automation connection test failed:', error);
      return false;
    }
  }
}

export const browserCRMService = new BrowserCRMService();
export default browserCRMService;
