import { ParsedLead } from '../types';
import logger from '../utils/logger';
import twentyCRMService from './crm';
import webhookCRMService from './webhook-crm';
import emailCRMService from './email-crm';
import csvCRMService from './csv-crm';
import databaseCRMService from './database-crm';
import restCRMService from './rest-crm';
import browserCRMService from './browser-crm';

interface CRMMethod {
  name: string;
  service: any;
  method: string;
  enabled: boolean;
}

class MultiCRMService {
  private methods: CRMMethod[];

  constructor() {
    this.methods = [
      {
        name: 'Twenty CRM GraphQL',
        service: twentyCRMService,
        method: 'createLead',
        enabled: true
      },
      {
        name: 'Twenty CRM Database',
        service: databaseCRMService,
        method: 'createLeadViaDatabase',
        enabled: !!process.env.TWENTY_DB_PASSWORD
      },
      {
        name: 'Twenty CRM REST API',
        service: restCRMService,
        method: 'createLeadViaRest',
        enabled: true // Always try REST endpoints
      },
      {
        name: 'Twenty CRM Browser',
        service: browserCRMService,
        method: 'createLeadViaBrowser',
        enabled: !!(process.env.TWENTY_USERNAME && process.env.TWENTY_PASSWORD)
      },
      {
        name: 'Twenty CRM Webhook',
        service: webhookCRMService,
        method: 'createLeadViaWebhook',
        enabled: !!process.env.TWENTY_WEBHOOK_URL
      },
      {
        name: 'Email Integration',
        service: emailCRMService,
        method: 'createLeadViaEmail',
        enabled: !!process.env.GMAIL_APP_PASSWORD
      },
      {
        name: 'CSV Export',
        service: csvCRMService,
        method: 'createLeadViaCSV',
        enabled: true // Always available as fallback
      }
    ];
  }

  public async createLead(parsedLead: ParsedLead): Promise<string | null> {
    logger.info(`Attempting to create lead: ${parsedLead.name} using multiple methods`);

    const results: { method: string; success: boolean; result?: string; error?: string }[] = [];

    for (const method of this.methods) {
      if (!method.enabled) {
        logger.info(`Skipping ${method.name} - not enabled`);
        continue;
      }

      try {
        logger.info(`Trying ${method.name}...`);
        const result = await method.service[method.method](parsedLead);
        
        results.push({
          method: method.name,
          success: true,
          result: result
        });

        logger.info(`✅ ${method.name} succeeded: ${result}`);
        
        // If this is not the CSV method, we consider it a primary success
        if (method.name !== 'CSV Export') {
          logger.info(`Lead successfully created using ${method.name}`);
          return result;
        }

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        results.push({
          method: method.name,
          success: false,
          error: errorMessage
        });

        logger.error(`❌ ${method.name} failed: ${errorMessage}`);
        
        // Continue to next method
        continue;
      }
    }

    // Log summary of all attempts
    logger.info('Lead creation attempt summary:');
    results.forEach(result => {
      if (result.success) {
        logger.info(`  ✅ ${result.method}: ${result.result}`);
      } else {
        logger.error(`  ❌ ${result.method}: ${result.error}`);
      }
    });

    // Check if any method succeeded
    const successfulResults = results.filter(r => r.success);
    if (successfulResults.length > 0) {
      logger.info(`Lead saved using ${successfulResults.length} method(s)`);
      return successfulResults[0].result || 'multi-success';
    }

    // All methods failed
    const allErrors = results.map(r => `${r.method}: ${r.error}`).join('; ');
    throw new Error(`All CRM methods failed: ${allErrors}`);
  }

  public async testConnections(): Promise<{ [key: string]: boolean }> {
    const connectionResults: { [key: string]: boolean } = {};

    for (const method of this.methods) {
      if (!method.enabled) {
        connectionResults[method.name] = false;
        continue;
      }

      try {
        if (method.service.testConnection) {
          const isConnected = await method.service.testConnection();
          connectionResults[method.name] = isConnected;
        } else {
          // For services without test methods, assume they work if enabled
          connectionResults[method.name] = true;
        }
      } catch (error) {
        connectionResults[method.name] = false;
      }
    }

    return connectionResults;
  }

  public getEnabledMethods(): string[] {
    return this.methods.filter(m => m.enabled).map(m => m.name);
  }
}

export const multiCRMService = new MultiCRMService();
export default multiCRMService;
