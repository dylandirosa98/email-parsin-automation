import { ParsedLead } from '../types';
import logger from '../utils/logger';
import fs from 'fs';
import path from 'path';

class CSVCRMService {
  private csvFilePath: string;
  private csvHeaders: string[];

  constructor() {
    this.csvFilePath = path.join(process.cwd(), 'leads-export.csv');
    this.csvHeaders = [
      'Name',
      'Email',
      'Phone',
      'Message',
      'Address',
      'City',
      'ZIP Code',
      'UTM Source',
      'UTM Medium',
      'UTM Campaign',
      'UTM Term',
      'UTM Content',
      'Google Click ID',
      'Microsoft Click ID',
      'Facebook Click ID',
      'Form Type',
      'Submission Time',
      'Created At'
    ];
    
    this.initializeCSV();
  }

  private initializeCSV(): void {
    if (!fs.existsSync(this.csvFilePath)) {
      const headerRow = this.csvHeaders.join(',') + '\n';
      fs.writeFileSync(this.csvFilePath, headerRow);
      logger.info(`CSV file initialized: ${this.csvFilePath}`);
    }
  }

  private escapeCSVField(field: string | undefined): string {
    if (!field) return '';
    
    // Escape quotes and wrap in quotes if contains comma, quote, or newline
    const escaped = field.replace(/"/g, '""');
    if (escaped.includes(',') || escaped.includes('"') || escaped.includes('\n')) {
      return `"${escaped}"`;
    }
    return escaped;
  }

  public async createLeadViaCSV(parsedLead: ParsedLead): Promise<string | null> {
    try {
      logger.info(`Adding lead to CSV: ${parsedLead.name}`);

      const csvRow = [
        this.escapeCSVField(parsedLead.name),
        this.escapeCSVField(parsedLead.email),
        this.escapeCSVField(parsedLead.phone),
        this.escapeCSVField(parsedLead.message),
        this.escapeCSVField(parsedLead.address),
        this.escapeCSVField(parsedLead.city),
        this.escapeCSVField(parsedLead.zipCode),
        this.escapeCSVField(parsedLead.utmSource),
        this.escapeCSVField(parsedLead.utmMedium),
        this.escapeCSVField(parsedLead.utmCampaign),
        this.escapeCSVField(parsedLead.utmTerm),
        this.escapeCSVField(parsedLead.utmContent),
        this.escapeCSVField(parsedLead.googleClickId),
        this.escapeCSVField(parsedLead.microsoftClickId),
        this.escapeCSVField(parsedLead.facebookClickId),
        this.escapeCSVField(parsedLead.formType),
        this.escapeCSVField(parsedLead.formSubmissionTime),
        this.escapeCSVField(new Date().toISOString())
      ];

      const csvLine = csvRow.join(',') + '\n';
      fs.appendFileSync(this.csvFilePath, csvLine);
      
      logger.info(`Lead added to CSV successfully`);
      
      // Return a unique identifier based on timestamp
      return `csv-${Date.now()}`;

    } catch (error) {
      logger.error('Failed to add lead to CSV:', error);
      throw error;
    }
  }

  public getCSVFilePath(): string {
    return this.csvFilePath;
  }

  public getLeadCount(): number {
    try {
      const content = fs.readFileSync(this.csvFilePath, 'utf8');
      const lines = content.trim().split('\n');
      return Math.max(0, lines.length - 1); // Subtract header row
    } catch (error) {
      return 0;
    }
  }
}

export const csvCRMService = new CSVCRMService();
export default csvCRMService;
