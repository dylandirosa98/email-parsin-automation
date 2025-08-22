import { ParsedLead } from '../types';
import logger from '../utils/logger';

class DatabaseCRMService {
  private dbConfig: any;

  constructor() {
    // Twenty CRM uses PostgreSQL - we can connect directly to the database
    this.dbConfig = {
      host: process.env.TWENTY_DB_HOST || 'localhost',
      port: parseInt(process.env.TWENTY_DB_PORT || '5432'),
      database: process.env.TWENTY_DB_NAME || 'twenty',
      user: process.env.TWENTY_DB_USER || 'twenty',
      password: process.env.TWENTY_DB_PASSWORD || '',
    };
  }

  public async createLeadViaDatabase(parsedLead: ParsedLead): Promise<string | null> {
    try {
      logger.info(`Creating lead via direct database connection: ${parsedLead.name}`);

      // Dynamic import to avoid dependency issues if pg is not installed
      const { Client } = await import('pg');
      
      const client = new Client(this.dbConfig);
      await client.connect();

      // Twenty CRM stores people in the "person" table
      // We'll insert directly into the database
      const personId = this.generateUUID();
      const workspaceId = process.env.TWENTY_WORKSPACE_ID || 'e23d2a83-5a02-47f6-8169-e5ee5ab2a024';
      
      const insertPersonQuery = `
        INSERT INTO "person" (
          id,
          "workspaceId",
          "firstName",
          "lastName",
          email,
          phone,
          "createdAt",
          "updatedAt"
        ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
        RETURNING id;
      `;

      const nameParts = parsedLead.name.split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';

      const result = await client.query(insertPersonQuery, [
        personId,
        workspaceId,
        firstName,
        lastName,
        parsedLead.email || null,
        parsedLead.phone || null
      ]);

      // If we have additional data, create a note/activity
      if (parsedLead.message) {
        const noteId = this.generateUUID();
        const insertNoteQuery = `
          INSERT INTO "note" (
            id,
            "workspaceId",
            title,
            body,
            "personId",
            "createdAt",
            "updatedAt"
          ) VALUES ($1, $2, $3, $4, $5, NOW(), NOW());
        `;

        await client.query(insertNoteQuery, [
          noteId,
          workspaceId,
          `Lead from ${parsedLead.utmSource || 'Direct'}`,
          `Message: ${parsedLead.message}\n\nSource: ${parsedLead.utmSource || 'Direct'}\nMedium: ${parsedLead.utmMedium || 'N/A'}\nForm Type: ${parsedLead.formType || 'Contact Form'}\nSubmission Time: ${parsedLead.formSubmissionTime || new Date().toISOString()}`,
          personId
        ]);
      }

      await client.end();
      
      logger.info(`Successfully created person via database: ${personId}`);
      return personId;

    } catch (error) {
      logger.error('Failed to create lead via database:', error);
      throw error;
    }
  }

  private generateUUID(): string {
    // Generate a UUID v4
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  public async testConnection(): Promise<boolean> {
    try {
      const { Client } = await import('pg');
      const client = new Client(this.dbConfig);
      await client.connect();
      
      // Test query
      const result = await client.query('SELECT 1 as test');
      await client.end();
      
      return result.rows.length > 0;
    } catch (error) {
      logger.error('Database connection test failed:', error);
      return false;
    }
  }
}

export const databaseCRMService = new DatabaseCRMService();
export default databaseCRMService;
