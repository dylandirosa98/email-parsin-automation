import { ParsedEmail, ParsedLead } from '../types';
import logger from '../utils/logger';

class EmailParserService {
  public parseLead(email: ParsedEmail): ParsedLead | null {
    try {
      logger.debug(`Parsing lead from email: ${email.messageId}`);
      
      // Clean the email content
      const content = this.cleanEmailContent(email.content);
      
      // Extract structured data
      const lead: ParsedLead = {
        name: this.extractField(content, 'Name') || '',
        email: this.extractField(content, 'Email'),
        phone: this.extractField(content, 'Phone'),
        message: this.extractField(content, 'Message'),
        
        // Location Information
        address: this.extractField(content, 'Address'),
        city: this.extractField(content, 'City'),
        zipCode: this.extractField(content, 'Zip Code'),
        
        // UTM Tracking Data
        utmSource: this.extractField(content, 'Source'),
        utmMedium: this.extractField(content, 'Medium'),
        utmCampaign: this.extractField(content, 'Campaign'),
        utmTerm: this.extractField(content, 'Term'),
        utmContent: this.extractField(content, 'Content'),
        
        // Click IDs
        googleClickId: this.extractField(content, 'Google Click ID'),
        microsoftClickId: this.extractField(content, 'Microsoft Click ID'),
        facebookClickId: this.extractField(content, 'Facebook Click ID'),
        
        // Metadata
        formSubmissionTime: this.extractField(content, 'FORM SUBMISSION TIME'),
        formType: this.extractField(content, 'FORM TYPE')
      };

      // Validate required fields
      if (!lead.name || lead.name.trim() === '') {
        logger.warn(`Email ${email.messageId} missing required name field`);
        return null;
      }

      // Clean and validate phone number
      if (lead.phone) {
        lead.phone = this.cleanPhoneNumber(lead.phone);
      }

      // Validate email format
      if (lead.email && !this.isValidEmail(lead.email)) {
        logger.warn(`Invalid email format in lead: ${lead.email}`);
        lead.email = undefined;
      }

      // Clean fields - remove 'none' values
      this.cleanLeadData(lead);

      logger.info(`Successfully parsed lead: ${lead.name}`, { 
        email: lead.email, 
        phone: lead.phone,
        source: lead.utmSource 
      });

      return lead;

    } catch (error) {
      logger.error(`Failed to parse lead from email ${email.messageId}:`, error);
      return null;
    }
  }

  private cleanEmailContent(content: string): string {
    // Remove HTML tags if present
    let cleaned = content.replace(/<[^>]*>/g, '');
    
    // Decode HTML entities
    cleaned = cleaned
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&nbsp;/g, ' ')
      .replace(/&quot;/g, '"');
    
    // Normalize line breaks
    cleaned = cleaned.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    
    return cleaned;
  }

  private extractField(content: string, fieldName: string): string | undefined {
    // Try different patterns for field extraction
    const patterns = [
      new RegExp(`${fieldName}:\\s*(.+?)(?=\\n|$)`, 'i'),
      new RegExp(`${fieldName}:\\s*(.+?)(?=\\n\\n|\\n[A-Z]|$)`, 'i'),
      new RegExp(`${fieldName}\\s*:\\s*(.+?)(?=\\n|$)`, 'i')
    ];

    for (const pattern of patterns) {
      const match = content.match(pattern);
      if (match && match[1]) {
        const value = match[1].trim();
        if (value && value.toLowerCase() !== 'none' && value !== '') {
          return value;
        }
      }
    }

    return undefined;
  }

  private cleanPhoneNumber(phone: string): string {
    // Extract only digits from phone number
    const cleaned = phone.replace(/\D/g, '');
    
    // Validate phone number length (US format)
    if (cleaned.length === 10) {
      return `+1${cleaned}`;  // Add US country code for international format
    } else if (cleaned.length === 11 && cleaned.startsWith('1')) {
      return `+${cleaned}`;   // Already has country code
    } else if (cleaned.length >= 10) {
      return `+1${cleaned.slice(-10)}`;  // Take last 10 digits and add US code
    }
    
    return `+1${cleaned}`;  // Default to US format
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private cleanLeadData(lead: ParsedLead): void {
    // Remove fields with 'none' values or empty strings
    Object.keys(lead).forEach(key => {
      const value = (lead as any)[key];
      if (typeof value === 'string' && (value.toLowerCase() === 'none' || value.trim() === '')) {
        (lead as any)[key] = undefined;
      }
    });
  }

  public extractUTMSourceFromSubject(subject: string): string | undefined {
    // Extract UTM source from subject line: "🔥 NEW LEAD: [Name] - [utm_source]"
    const match = subject.match(/🔥 NEW LEAD:.+?-\s*(.+?)(?:\s|$)/);
    if (match && match[1]) {
      return match[1].trim();
    }
    return undefined;
  }

  public validateParsedLead(lead: ParsedLead): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Required fields validation
    if (!lead.name || lead.name.trim() === '') {
      errors.push('Name is required');
    }

    // Email validation
    if (lead.email && !this.isValidEmail(lead.email)) {
      errors.push('Invalid email format');
    }

    // Phone validation
    if (lead.phone && lead.phone.length < 10) {
      errors.push('Invalid phone number format');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  public getLeadSummary(lead: ParsedLead): string {
    const parts = [lead.name];
    
    if (lead.email) parts.push(lead.email);
    if (lead.phone) parts.push(lead.phone);
    if (lead.city) parts.push(lead.city);
    if (lead.utmSource) parts.push(`Source: ${lead.utmSource}`);
    
    return parts.join(' | ');
  }
}

export const emailParserService = new EmailParserService();
export default emailParserService;
