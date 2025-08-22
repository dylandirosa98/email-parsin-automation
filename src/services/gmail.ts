import { google, gmail_v1 } from 'googleapis';
import { ParsedEmail } from '../types';
import logger from '../utils/logger';

class GmailService {
  private gmail!: gmail_v1.Gmail;
  private auth: any;
  private targetEmail: string;

  constructor() {
    this.targetEmail = process.env.TARGET_EMAIL || '';
    this.setupAuth();
  }

  private setupAuth(): void {
    this.auth = new google.auth.OAuth2(
      process.env.GMAIL_CLIENT_ID,
      process.env.GMAIL_CLIENT_SECRET,
      'urn:ietf:wg:oauth:2.0:oob'
    );

    this.auth.setCredentials({
      refresh_token: process.env.GMAIL_REFRESH_TOKEN
    });

    this.gmail = google.gmail({ version: 'v1', auth: this.auth });
  }

  public async getNewLeadEmails(lastCheckTime?: Date): Promise<ParsedEmail[]> {
    try {
      logger.info('Checking for new lead emails...');

      // Build search query
      let query = `from:info@pythonwebsolutions.com to:${this.targetEmail} subject:"🔥 NEW LEAD:"`;
      
      if (lastCheckTime) {
        const timestamp = Math.floor(lastCheckTime.getTime() / 1000);
        query += ` after:${timestamp}`;
      }

      logger.debug(`Gmail search query: ${query}`);

      // Search for messages
      const searchResponse = await this.gmail.users.messages.list({
        userId: 'me',
        q: query,
        maxResults: 50
      });

      const messages = searchResponse.data.messages || [];
      logger.info(`Found ${messages.length} potential lead emails`);

      if (messages.length === 0) {
        return [];
      }

      // Fetch full message details
      const parsedEmails: ParsedEmail[] = [];
      
      for (const message of messages) {
        if (!message.id) continue;

        try {
          const fullMessage = await this.gmail.users.messages.get({
            userId: 'me',
            id: message.id,
            format: 'full'
          });

          const parsedEmail = this.parseMessage(fullMessage.data);
          if (parsedEmail) {
            parsedEmails.push(parsedEmail);
          }
        } catch (error) {
          logger.error(`Failed to fetch message ${message.id}:`, error);
        }
      }

      logger.info(`Successfully parsed ${parsedEmails.length} lead emails`);
      return parsedEmails;

    } catch (error) {
      logger.error('Failed to fetch emails from Gmail:', error);
      throw error;
    }
  }

  private parseMessage(message: gmail_v1.Schema$Message): ParsedEmail | null {
    try {
      if (!message.id || !message.payload) {
        return null;
      }

      const headers = message.payload.headers || [];
      const getHeader = (name: string) => 
        headers.find(h => h.name?.toLowerCase() === name.toLowerCase())?.value || '';

      const subject = getHeader('Subject');
      const from = getHeader('From');
      const to = getHeader('To');
      const dateStr = getHeader('Date');

      // Extract email content
      const content = this.extractEmailContent(message.payload);

      return {
        messageId: message.id,
        subject,
        from,
        to,
        date: dateStr ? new Date(dateStr) : new Date(),
        content
      };

    } catch (error) {
      logger.error('Failed to parse message:', error);
      return null;
    }
  }

  private extractEmailContent(payload: gmail_v1.Schema$MessagePart): string {
    let content = '';

    // If the payload has a body with data
    if (payload.body?.data) {
      const decodedContent = Buffer.from(payload.body.data, 'base64').toString('utf8');
      content += decodedContent;
    }

    // If the payload has parts (multipart message)
    if (payload.parts) {
      for (const part of payload.parts) {
        if (part.mimeType === 'text/plain' || part.mimeType === 'text/html') {
          if (part.body?.data) {
            const decodedContent = Buffer.from(part.body.data, 'base64').toString('utf8');
            content += decodedContent;
          }
        }
        
        // Recursively check nested parts
        if (part.parts) {
          content += this.extractEmailContent(part);
        }
      }
    }

    return content;
  }

  public async testConnection(): Promise<boolean> {
    try {
      const profile = await this.gmail.users.getProfile({
        userId: 'me'
      });
      
      logger.info(`Gmail connection successful. Email: ${profile.data.emailAddress}`);
      return true;
    } catch (error) {
      logger.error('Gmail connection failed:', error);
      return false;
    }
  }

  public async getRecentEmails(count: number = 5): Promise<ParsedEmail[]> {
    try {
      const response = await this.gmail.users.messages.list({
        userId: 'me',
        maxResults: count,
        q: `from:info@pythonwebsolutions.com to:${this.targetEmail}`
      });

      const messages = response.data.messages || [];
      const parsedEmails: ParsedEmail[] = [];

      for (const message of messages) {
        if (!message.id) continue;

        const fullMessage = await this.gmail.users.messages.get({
          userId: 'me',
          id: message.id,
          format: 'full'
        });

        const parsedEmail = this.parseMessage(fullMessage.data);
        if (parsedEmail) {
          parsedEmails.push(parsedEmail);
        }
      }

      return parsedEmails;
    } catch (error) {
      logger.error('Failed to get recent emails:', error);
      throw error;
    }
  }
}

export const gmailService = new GmailService();
export default gmailService;
