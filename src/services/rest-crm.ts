import { ParsedLead } from '../types';
import logger from '../utils/logger';

class RestCRMService {
  private baseUrl: string;
  private apiToken: string;

  constructor() {
    this.baseUrl = process.env.TWENTY_API_URL || 'https://crm.thespartanexteriors.com';
    this.apiToken = process.env.TWENTY_API_TOKEN || '';
  }

  public async createLeadViaRest(parsedLead: ParsedLead): Promise<string | null> {
    try {
      logger.info(`Creating lead via REST API discovery: ${parsedLead.name}`);

      // Try different REST API patterns that Twenty CRM might use
      const restEndpoints = [
        // Standard REST patterns
        { method: 'POST', url: '/rest/v1/people', dataKey: 'person' },
        { method: 'POST', url: '/api/v1/people', dataKey: 'person' },
        { method: 'POST', url: '/rest/people', dataKey: 'person' },
        { method: 'POST', url: '/api/people', dataKey: 'person' },
        
        // Object-based patterns
        { method: 'POST', url: '/rest/v1/objects/person', dataKey: 'object' },
        { method: 'POST', url: '/api/v1/objects/person', dataKey: 'object' },
        
        // Twenty-specific patterns
        { method: 'POST', url: '/metadata/objects/person/records', dataKey: 'record' },
        { method: 'POST', url: '/objects/person', dataKey: 'data' },
        
        // Webhook-style endpoints
        { method: 'POST', url: '/webhooks/person/create', dataKey: 'payload' },
        { method: 'POST', url: '/integrations/person', dataKey: 'data' }
      ];

      const personData = this.formatPersonData(parsedLead);

      for (const endpoint of restEndpoints) {
        try {
          logger.info(`Trying REST endpoint: ${endpoint.method} ${endpoint.url}`);
          
          const payload = { [endpoint.dataKey]: personData };
          
          const response = await fetch(`${this.baseUrl}${endpoint.url}`, {
            method: endpoint.method,
            headers: {
              'Content-Type': 'application/json',
              'X-API-Key': this.apiToken,
              'Authorization': `Bearer ${this.apiToken}`,
              'Accept': 'application/json',
              'User-Agent': 'EmailParser/1.0'
            },
            body: JSON.stringify(payload)
          });

          if (response.ok) {
            const result = await response.json();
            logger.info(`✅ REST API success via ${endpoint.url}:`, result);
            
            // Extract ID from various possible response formats
            const personId = result.id || result.data?.id || result.person?.id || result.object?.id || 'rest-success';
            return personId;
          } else if (response.status === 404) {
            // Endpoint doesn't exist, try next one
            continue;
          } else {
            // Log the error but continue trying other endpoints
            const errorText = await response.text();
            logger.warn(`REST endpoint ${endpoint.url} failed: ${response.status} ${response.statusText} - ${errorText.substring(0, 200)}`);
          }
          
        } catch (endpointError) {
          logger.warn(`REST endpoint ${endpoint.url} error:`, endpointError instanceof Error ? endpointError.message : String(endpointError));
          continue;
        }
      }

      throw new Error('All REST API endpoints failed');

    } catch (error) {
      logger.error('Failed to create lead via REST API:', error);
      throw error;
    }
  }

  private formatPersonData(parsedLead: ParsedLead): any {
    const nameParts = parsedLead.name.split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    return {
      // Standard person fields
      firstName,
      lastName,
      name: parsedLead.name,
      email: parsedLead.email,
      phone: parsedLead.phone,
      
      // Nested email/phone formats (Twenty CRM style)
      emails: parsedLead.email ? [{ primaryEmail: parsedLead.email, label: 'Work' }] : [],
      phones: parsedLead.phone ? [{ primaryPhoneNumber: parsedLead.phone, label: 'Work' }] : [],
      
      // Location data
      address: parsedLead.address,
      city: parsedLead.city,
      zipCode: parsedLead.zipCode,
      
      // UTM and tracking data
      source: this.mapSourceToCRM(parsedLead.utmSource),
      utmSource: parsedLead.utmSource,
      utmMedium: parsedLead.utmMedium,
      utmCampaign: parsedLead.utmCampaign,
      utmTerm: parsedLead.utmTerm,
      utmContent: parsedLead.utmContent,
      
      // Click IDs
      gclid: parsedLead.googleClickId,
      fbclid: parsedLead.facebookClickId,
      msclkid: parsedLead.microsoftClickId,
      
      // Metadata
      notes: parsedLead.message,
      formType: parsedLead.formType,
      formSubmissionTime: parsedLead.formSubmissionTime,
      createdBy: 'EmailParser',
      tags: [parsedLead.utmSource || 'Direct', 'Email Lead'].filter(Boolean)
    };
  }

  private mapSourceToCRM(utmSource?: string): string {
    const sourceMapping: { [key: string]: string } = {
      'direct': 'WEBSITE_DIRECT',
      'google_organic': 'WEBSITE_DIRECT',
      'google_business': 'GOOGLE_BUSINESS_PROFILE',
      'google_ads': 'GOOGLE_ADS',
      'google_lsas': 'GOOGLE_ADS',
      'facebook': 'FACEBOOK_ADS',
      'facebook_ads': 'FACEBOOK_ADS',
      'instagram': 'FACEBOOK_ADS',
      'linkedin': 'LINKEDIN',
      'twitter': 'TWITTER',
      'bing': 'BING_ADS',
      'referral': 'REFERRAL'
    };

    return sourceMapping[utmSource?.toLowerCase() || ''] || 'WEBSITE_DIRECT';
  }

  public async testConnection(): Promise<boolean> {
    try {
      // Try to access the API root or health endpoint
      const healthEndpoints = [
        '/health',
        '/api/health',
        '/rest/health',
        '/status',
        '/api/status',
        '/',
        '/api'
      ];

      for (const endpoint of healthEndpoints) {
        try {
          const response = await fetch(`${this.baseUrl}${endpoint}`, {
            headers: {
              'X-API-Key': this.apiToken,
              'Accept': 'application/json'
            }
          });

          if (response.ok) {
            logger.info(`REST API health check successful via ${endpoint}`);
            return true;
          }
        } catch (error) {
          continue;
        }
      }

      return false;
    } catch (error) {
      logger.error('REST API connection test failed:', error);
      return false;
    }
  }
}

export const restCRMService = new RestCRMService();
export default restCRMService;
