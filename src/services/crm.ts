import { GraphQLClient } from 'graphql-request';
import { ParsedLead, TwentyCRMLead, TwentyCRMResponse, UTMSource, CRMSource } from '../types';
import logger from '../utils/logger';

class TwentyCRMService {
  private client: GraphQLClient;
  private apiUrl: string;
  private sourceMapping: Record<UTMSource, CRMSource>;

  constructor() {
    this.apiUrl = process.env.TWENTY_API_URL || '';
    const apiToken = process.env.TWENTY_API_TOKEN || '';
    
    this.client = new GraphQLClient(`${this.apiUrl}/graphql`, {
      headers: {
        'X-API-Key': apiToken,
        'content-type': 'application/json'
      }
    });

    // Source mapping from UTM source to CRM enum
    this.sourceMapping = {
      'direct': 'WEBSITE_DIRECT',
      'google_organic': 'WEBSITE_DIRECT',
      'google_business': 'GOOGLE_BUSINESS_PROFILE',
      'google_ads': 'GOOGLE_ADS',
      'google_lsas': 'GOOGLE_ADS', // Google Local Services Ads
      'facebook': 'FACEBOOK_ADS',
      'facebook_ads': 'FACEBOOK_ADS',
      'instagram': 'FACEBOOK_ADS',
      'linkedin': 'LINKEDIN',
      'twitter': 'TWITTER',
      'tiktok': 'TIKTOK',
      'youtube': 'YOUTUBE',
      'bing': 'BING_ADS',
      'referral': 'REFERRAL'
    };
  }

  public async createLead(parsedLead: ParsedLead): Promise<string | null> {
    logger.info(`Creating lead in Twenty CRM: ${parsedLead.name}`);

    // Try multiple GraphQL approaches for self-hosted Twenty
    const approaches = [
      async () => {
        logger.info('Trying GraphQL approach: Dynamic Object Creation');
        const mutation = `
          mutation CreatePerson($data: JSON!) {
            createOneObject(objectName: "person", data: $data) {
              id
              name
              email
              phone
            }
          }
        `;
        const variables = {
          data: {
            name: parsedLead.name,
            email: parsedLead.email,
            phone: parsedLead.phone,
            address: parsedLead.address,
            city: parsedLead.city,
            zipCode: parsedLead.zipCode,
            source: this.sourceMapping[parsedLead.utmSource as UTMSource] || 'WEBSITE_DIRECT',
            utmMedium: parsedLead.utmMedium,
            utmCampaign: parsedLead.utmCampaign,
            utmTerm: parsedLead.utmTerm,
            utmContent: parsedLead.utmContent,
            googleClickId: parsedLead.googleClickId,
            microsoftClickId: parsedLead.microsoftClickId,
            facebookClickId: parsedLead.facebookClickId,
            formSubmissionTime: parsedLead.formSubmissionTime,
            formType: parsedLead.formType
          }
        };
        
        logger.debug('Mutation:', mutation);
        logger.debug('Variables:', variables);
        
        const response: any = await this.client.request(mutation, variables);
        return response.createOneObject?.id;
      },
      
      async () => {
        logger.info('Trying GraphQL approach: Generic Object Creation');
        const mutation = `
          mutation CreateRecord($objectName: String!, $data: JSON!) {
            createOneObject(objectName: $objectName, data: $data) {
              id
            }
          }
        `;
        const variables = {
          objectName: "person",
          data: {
            name: parsedLead.name,
            email: parsedLead.email,
            phone: parsedLead.phone
          }
        };
        
        const response: any = await this.client.request(mutation, variables);
        return response.createOneObject?.id;
      },
      
      async () => {
        logger.info('Trying GraphQL approach: Simple Person Creation');
        const mutation = `
          mutation CreateSimplePerson($name: String!, $email: String, $phone: String) {
            createOneObject(objectName: "person", data: {
              name: $name,
              email: $email,
              phone: $phone
            }) {
              id
            }
          }
        `;
        const variables = {
          name: parsedLead.name,
          email: parsedLead.email,
          phone: parsedLead.phone
        };
        
        const response: any = await this.client.request(mutation, variables);
        return response.createOneObject?.id;
      }
    ];

    for (let i = 0; i < approaches.length; i++) {
      try {
        const leadId = await approaches[i]();
        
        if (leadId) {
          logger.info(`✅ Successfully created person using approach ${i + 1} with ID: ${leadId}`);
          return leadId;
        } else {
          logger.warn(`⚠️ Approach ${i + 1} succeeded but no ID returned`);
        }

      } catch (error) {
        logger.warn(`❌ Approach ${i + 1} failed:`, error instanceof Error ? error.message : String(error));
        
        // Log detailed error for the first approach only to avoid spam
        if (i === 0 && error instanceof Error) {
          logger.debug('Detailed error for first approach:', {
            message: error.message,
            response: (error as any).response,
            leadData: parsedLead
          });
        }
        
        continue; // Try next approach
      }
    }

    throw new Error('All GraphQL approaches failed for Twenty CRM');
  }

  private transformToCRMFormat(parsedLead: ParsedLead): TwentyCRMLead {
    const crmLead: TwentyCRMLead = {
      name: parsedLead.name,
      source: this.mapSourceToCRM(parsedLead.utmSource),
      status: 'NEW'
    };

    // Add conditional fields
    if (parsedLead.email) {
      crmLead.email = { primaryEmail: parsedLead.email };
    }

    if (parsedLead.phone) {
      crmLead.phone = { primaryPhoneNumber: parsedLead.phone };
    }

    // Add notes from message
    if (parsedLead.message) {
      crmLead.notes = parsedLead.message;
    } else {
      crmLead.notes = 'Lead imported from email automation';
    }

    // Add UTM fields (only if not 'none' or empty)
    if (parsedLead.utmMedium && parsedLead.utmMedium.toLowerCase() !== 'none') {
      crmLead.utmMedium = parsedLead.utmMedium;
    }
    if (parsedLead.utmCampaign && parsedLead.utmCampaign.toLowerCase() !== 'none') {
      crmLead.utmCampaign = parsedLead.utmCampaign;
    }
    if (parsedLead.utmTerm && parsedLead.utmTerm.toLowerCase() !== 'none') {
      crmLead.utmTerm = parsedLead.utmTerm;
    }
    if (parsedLead.utmContent && parsedLead.utmContent.toLowerCase() !== 'none') {
      crmLead.utmContent = parsedLead.utmContent;
    }

    // Add Click IDs (only if not 'none' or empty)
    if (parsedLead.googleClickId && parsedLead.googleClickId.toLowerCase() !== 'none') {
      crmLead.gclid = parsedLead.googleClickId;
    }
    if (parsedLead.microsoftClickId && parsedLead.microsoftClickId.toLowerCase() !== 'none') {
      crmLead.wbraid = parsedLead.microsoftClickId;
    }
    if (parsedLead.facebookClickId && parsedLead.facebookClickId.toLowerCase() !== 'none') {
      crmLead.fbclid = parsedLead.facebookClickId;
    }

    // Add location fields (only if provided)
    if (parsedLead.address) {
      crmLead.adress = parsedLead.address; // Note: CRM uses 'adress' not 'address'
    }
    if (parsedLead.city) {
      crmLead.city = parsedLead.city;
    }
    if (parsedLead.zipCode) {
      crmLead.zipCode = parsedLead.zipCode;
    }

    return crmLead;
  }

  private mapSourceToCRM(utmSource?: string): CRMSource {
    if (!utmSource) {
      return 'WEBSITE_DIRECT';
    }

    const normalizedSource = utmSource.toLowerCase() as UTMSource;
    return this.sourceMapping[normalizedSource] || 'WEBSITE_DIRECT';
  }

  private validateCRMLead(crmLead: TwentyCRMLead): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Required field validation
    if (!crmLead.name || crmLead.name.trim() === '') {
      errors.push('Name is required');
    }

    if (!crmLead.source) {
      errors.push('Source is required');
    }

    if (!crmLead.status) {
      errors.push('Status is required');
    }

    // Email validation
    if (crmLead.email && !this.isValidEmail(crmLead.email.primaryEmail)) {
      errors.push('Invalid email format');
    }

    // Phone validation
    if (crmLead.phone && crmLead.phone.primaryPhoneNumber.length < 10) {
      errors.push('Invalid phone number format');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  public async testConnection(): Promise<boolean> {
    try {
      // Test with a simple lead creation that we'll immediately clean up
      const testMutation = `
        mutation CreateTestLead($input: LeadCreateInput!) {
          createLead(data: $input) {
            id
            name
          }
        }
      `;
      
      const testLead = {
        name: "Connection Test Lead",
        source: "WEBSITE_DIRECT",
        status: "NEW",
        notes: "Test connection - will be deleted"
      };

      const response: any = await this.client.request(testMutation, { input: testLead });
      
      if (response.createLead?.id) {
        logger.info('Twenty CRM connection successful - test lead created');
        // Note: In production, you might want to delete the test lead
        return true;
      }
      
      return false;

    } catch (error) {
      logger.error('Twenty CRM connection test failed:', error);
      return false;
    }
  }

  public async getLeadById(leadId: string): Promise<any> {
    try {
      const query = `
        query GetLead($id: ID!) {
          lead(filter: { id: { eq: $id } }) {
            id
            name
            email {
              primaryEmail
            }
            phone {
              primaryPhoneNumber
            }
            source
            status
            createdAt
            updatedAt
          }
        }
      `;

      const variables = { id: leadId };
      const response: any = await this.client.request(query, variables);
      
      return response.lead;

    } catch (error) {
      logger.error(`Failed to get lead ${leadId}:`, error);
      throw error;
    }
  }

  public async searchLeadByEmail(email: string): Promise<any[]> {
    try {
      const query = `
        query SearchLeadByEmail($email: String!) {
          leads(filter: { email: { primaryEmail: { eq: $email } } }) {
            edges {
              node {
                id
                name
                email {
                  primaryEmail
                }
                phone {
                  primaryPhoneNumber
                }
                source
                status
                createdAt
              }
            }
          }
        }
      `;

      const variables = { email };
      const response: any = await this.client.request(query, variables);
      
      return response.leads.edges.map((edge: any) => edge.node);

    } catch (error) {
      logger.error(`Failed to search leads by email ${email}:`, error);
      throw error;
    }
  }
}

export const twentyCRMService = new TwentyCRMService();
export default twentyCRMService;
