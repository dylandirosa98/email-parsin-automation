import { ParsedLead } from '../types';
import logger from '../utils/logger';

class WebhookCRMService {
  private webhookUrl: string;

  constructor() {
    // Twenty CRM might accept webhook data
    this.webhookUrl = process.env.TWENTY_WEBHOOK_URL || `${process.env.TWENTY_API_URL}/webhooks/leads`;
  }

  public async createLeadViaWebhook(parsedLead: ParsedLead): Promise<string | null> {
    try {
      logger.info(`Sending lead via webhook: ${parsedLead.name}`);

      const webhookPayload = {
        event: 'lead.created',
        source: 'email_parser',
        timestamp: new Date().toISOString(),
        data: {
          name: parsedLead.name,
          email: parsedLead.email,
          phone: parsedLead.phone,
          message: parsedLead.message,
          address: parsedLead.address,
          city: parsedLead.city,
          zipCode: parsedLead.zipCode,
          utmSource: parsedLead.utmSource,
          utmMedium: parsedLead.utmMedium,
          utmCampaign: parsedLead.utmCampaign,
          formSubmissionTime: parsedLead.formSubmissionTime,
          formType: parsedLead.formType
        }
      };

      const response = await fetch(this.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': process.env.TWENTY_API_TOKEN || '',
          'User-Agent': 'EmailParser/1.0'
        },
        body: JSON.stringify(webhookPayload)
      });

      if (response.ok) {
        const result = await response.json();
        logger.info(`Webhook lead creation successful: ${result.id || 'unknown'}`);
        return result.id || 'webhook-success';
      } else {
        const errorText = await response.text();
        logger.error(`Webhook failed: ${response.status} ${response.statusText} - ${errorText}`);
        throw new Error(`Webhook failed: ${response.status} ${response.statusText}`);
      }

    } catch (error) {
      logger.error('Failed to create lead via webhook:', error);
      throw error;
    }
  }
}

export const webhookCRMService = new WebhookCRMService();
export default webhookCRMService;
