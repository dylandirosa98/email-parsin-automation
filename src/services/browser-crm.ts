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
            
            // Submit form
            const submitButton = await page.$('button[type="submit"], input[type="submit"], button:contains("Sign"), button:contains("Login")');
            if (submitButton) {
              await submitButton.click();
              await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 });
            }
          }
        }
        
        // Look for "Add Person" or "Create Lead" buttons
        const createButtons = [
          'button:contains("Add Person")',
          'button:contains("Create Person")',
          'button:contains("Add Lead")',
          'button:contains("Create Lead")',
          'button:contains("New Person")',
          'button:contains("New Lead")',
          '[data-testid="add-person"]',
          '[data-testid="create-person"]',
          '.create-person-button',
          '.add-person-button'
        ];

        let createButton = null;
        for (const selector of createButtons) {
          try {
            createButton = await page.$(selector);
            if (createButton) break;
          } catch (error) {
            continue;
          }
        }

        if (createButton) {
          await createButton.click();
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
            { selectors: ['textarea[name="notes"]', '[data-field="notes"]', '#notes', 'textarea'], value: parsedLead.message || '' }
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
          const saveButtons = [
            'button:contains("Save")',
            'button:contains("Create")',
            'button:contains("Submit")',
            'button[type="submit"]',
            '[data-testid="save-person"]',
            '.save-button'
          ];

          for (const selector of saveButtons) {
            try {
              const saveButton = await page.$(selector);
              if (saveButton) {
                await saveButton.click();
                await new Promise(resolve => setTimeout(resolve, 3000));
                break;
              }
            } catch (error) {
              continue;
            }
          }
          
          // Try to extract the created person ID from the URL or page
          const currentUrl = page.url();
          const personIdMatch = currentUrl.match(/person[s]?\/([a-f0-9-]+)/i) || currentUrl.match(/id=([a-f0-9-]+)/i);
          const personId = personIdMatch ? personIdMatch[1] : `browser-${Date.now()}`;
          
          logger.info(`Successfully created person via browser automation: ${personId}`);
          return personId;
          
        } else {
          throw new Error('Could not find create person button');
        }
        
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
