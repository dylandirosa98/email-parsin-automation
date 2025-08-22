import fs from 'fs';
import path from 'path';
import { ProcessedEmail } from '../types';
import logger from './logger';

class DeduplicationService {
  private storageFile: string;
  private processedEmails: Map<string, ProcessedEmail>;

  constructor() {
    this.storageFile = path.join(process.cwd(), 'processed_emails.json');
    this.processedEmails = new Map();
    this.loadProcessedEmails();
  }

  private loadProcessedEmails(): void {
    try {
      if (fs.existsSync(this.storageFile)) {
        const data = fs.readFileSync(this.storageFile, 'utf8');
        const emails: ProcessedEmail[] = JSON.parse(data);
        
        emails.forEach(email => {
          this.processedEmails.set(email.messageId, {
            ...email,
            processedAt: new Date(email.processedAt)
          });
        });
        
        logger.info(`Loaded ${emails.length} processed emails from storage`);
      }
    } catch (error) {
      logger.error('Failed to load processed emails:', error);
    }
  }

  private saveProcessedEmails(): void {
    try {
      const emails = Array.from(this.processedEmails.values());
      fs.writeFileSync(this.storageFile, JSON.stringify(emails, null, 2));
    } catch (error) {
      logger.error('Failed to save processed emails:', error);
    }
  }

  public isProcessed(messageId: string): boolean {
    return this.processedEmails.has(messageId);
  }

  public markAsProcessed(
    messageId: string, 
    status: 'success' | 'failed' | 'duplicate',
    leadId?: string,
    error?: string
  ): void {
    const processedEmail: ProcessedEmail = {
      messageId,
      processedAt: new Date(),
      status,
      leadId,
      error
    };

    this.processedEmails.set(messageId, processedEmail);
    this.saveProcessedEmails();
    
    logger.info(`Marked email ${messageId} as ${status}`, { leadId, error });
  }

  public getProcessedEmail(messageId: string): ProcessedEmail | undefined {
    return this.processedEmails.get(messageId);
  }

  public getStats(): {
    total: number;
    success: number;
    failed: number;
    duplicate: number;
  } {
    const emails = Array.from(this.processedEmails.values());
    return {
      total: emails.length,
      success: emails.filter(e => e.status === 'success').length,
      failed: emails.filter(e => e.status === 'failed').length,
      duplicate: emails.filter(e => e.status === 'duplicate').length
    };
  }

  public cleanup(daysOld: number = 30): void {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);
    
    let removedCount = 0;
    for (const [messageId, email] of this.processedEmails.entries()) {
      if (email.processedAt < cutoffDate) {
        this.processedEmails.delete(messageId);
        removedCount++;
      }
    }
    
    if (removedCount > 0) {
      this.saveProcessedEmails();
      logger.info(`Cleaned up ${removedCount} old processed emails`);
    }
  }
}

export const deduplicationService = new DeduplicationService();
export default deduplicationService;
