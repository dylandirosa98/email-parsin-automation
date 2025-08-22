import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import cron from 'node-cron';

// Load environment variables first
dotenv.config();

import logger from './utils/logger';
import deduplicationService from './utils/deduplication';
import gmailService from './services/gmail';
import emailParserService from './services/parser';
import twentyCRMService from './services/crm';
import { AppConfig } from './types';



class EmailParserApp {
  private app: express.Application;
  private config: AppConfig;
  private isProcessing: boolean = false;
  private lastCheckTime?: Date;

  constructor() {
    this.app = express();
    this.config = this.loadConfig();
    this.setupMiddleware();
    this.setupRoutes();
  }

  private loadConfig(): AppConfig {
    const requiredEnvVars = [
      'TWENTY_API_URL',
      'TWENTY_API_TOKEN',
      'GMAIL_CLIENT_ID',
      'GMAIL_CLIENT_SECRET',
      'GMAIL_REFRESH_TOKEN',
      'TARGET_EMAIL'
    ];

    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    if (missingVars.length > 0) {
      throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
    }

    return {
      port: parseInt(process.env.PORT || '3000'),
      nodeEnv: process.env.NODE_ENV || 'development',
      pollIntervalMs: parseInt(process.env.POLL_INTERVAL_MS || '30000'),
      logLevel: process.env.LOG_LEVEL || 'info',
      
      twentyApiUrl: process.env.TWENTY_API_URL!,
      twentyApiToken: process.env.TWENTY_API_TOKEN!,
      
      gmailClientId: process.env.GMAIL_CLIENT_ID!,
      gmailClientSecret: process.env.GMAIL_CLIENT_SECRET!,
      gmailRefreshToken: process.env.GMAIL_REFRESH_TOKEN!,
      targetEmail: process.env.TARGET_EMAIL!
    };
  }

  private setupMiddleware(): void {
    this.app.use(cors());
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));

    // Request logging
    this.app.use((req, res, next) => {
      logger.info(`${req.method} ${req.path}`, {
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
      next();
    });
  }

  private setupRoutes(): void {
    // Health check endpoint
    this.app.get('/health', (req, res) => {
      const stats = deduplicationService.getStats();
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: this.config.nodeEnv,
        lastCheckTime: this.lastCheckTime,
        isProcessing: this.isProcessing,
        stats
      });
    });

    // Manual trigger endpoint
    this.app.post('/trigger', async (req, res) => {
      if (this.isProcessing) {
        return res.status(429).json({
          error: 'Email processing already in progress'
        });
      }

      try {
        logger.info('Manual trigger initiated');
        const result = await this.processEmails();
        return res.json({
          success: true,
          result,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        logger.error('Manual trigger failed:', error);
        return res.status(500).json({
          error: 'Failed to process emails',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    // Stats endpoint
    this.app.get('/stats', (req, res) => {
      const stats = deduplicationService.getStats();
      res.json({
        ...stats,
        lastCheckTime: this.lastCheckTime,
        isProcessing: this.isProcessing,
        config: {
          pollIntervalMs: this.config.pollIntervalMs,
          targetEmail: this.config.targetEmail
        }
      });
    });

    // Test connections endpoint
    this.app.get('/test', async (req, res) => {
      try {
        const [gmailTest, crmTest] = await Promise.all([
          gmailService.testConnection(),
          twentyCRMService.testConnection()
        ]);

        res.json({
          gmail: gmailTest,
          crm: crmTest,
          overall: gmailTest && crmTest
        });
      } catch (error) {
        logger.error('Connection test failed:', error);
        res.status(500).json({
          error: 'Connection test failed',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    // Recent emails endpoint (for debugging)
    this.app.get('/recent-emails', async (req, res) => {
      try {
        const count = parseInt(req.query.count as string) || 5;
        const emails = await gmailService.getRecentEmails(count);
        res.json(emails);
      } catch (error) {
        logger.error('Failed to get recent emails:', error);
        res.status(500).json({
          error: 'Failed to get recent emails',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    // 404 handler
    this.app.use('*', (req, res) => {
      res.status(404).json({
        error: 'Not found',
        path: req.originalUrl
      });
    });

    // Error handler
    this.app.use((error: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
      logger.error('Unhandled error:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: this.config.nodeEnv === 'development' ? error.message : 'Something went wrong'
      });
    });
  }

  private async processEmails(): Promise<any> {
    if (this.isProcessing) {
      logger.warn('Email processing already in progress, skipping...');
      return { skipped: true };
    }

    this.isProcessing = true;
    const startTime = Date.now();
    
    try {
      logger.info('Starting email processing cycle');

      // Get new emails since last check
      const emails = await gmailService.getNewLeadEmails(this.lastCheckTime);
      this.lastCheckTime = new Date();

      if (emails.length === 0) {
        logger.debug('No new emails found');
        return { processed: 0, created: 0, duplicates: 0, errors: 0 };
      }

      let processed = 0;
      let created = 0;
      let duplicates = 0;
      let errors = 0;

      // Process each email
      for (const email of emails) {
        try {
          processed++;

          // Check for duplicates
          if (deduplicationService.isProcessed(email.messageId)) {
            logger.info(`Email ${email.messageId} already processed, skipping`);
            deduplicationService.markAsProcessed(email.messageId, 'duplicate');
            duplicates++;
            continue;
          }

          // Parse the email
          const parsedLead = emailParserService.parseLead(email);
          if (!parsedLead) {
            logger.warn(`Failed to parse lead from email ${email.messageId}`);
            deduplicationService.markAsProcessed(email.messageId, 'failed', undefined, 'Failed to parse lead');
            errors++;
            continue;
          }

          // Validate parsed lead
          const validation = emailParserService.validateParsedLead(parsedLead);
          if (!validation.isValid) {
            logger.warn(`Lead validation failed for email ${email.messageId}:`, validation.errors);
            deduplicationService.markAsProcessed(email.messageId, 'failed', undefined, validation.errors.join(', '));
            errors++;
            continue;
          }

          // Create lead in CRM
          const leadId = await twentyCRMService.createLead(parsedLead);
          if (leadId) {
            logger.info(`Successfully created lead ${leadId} from email ${email.messageId}`);
            deduplicationService.markAsProcessed(email.messageId, 'success', leadId);
            created++;
          } else {
            logger.error(`Failed to create lead from email ${email.messageId}`);
            deduplicationService.markAsProcessed(email.messageId, 'failed', undefined, 'CRM creation failed');
            errors++;
          }

        } catch (error) {
          logger.error(`Error processing email ${email.messageId}:`, error);
          deduplicationService.markAsProcessed(
            email.messageId, 
            'failed', 
            undefined, 
            error instanceof Error ? error.message : 'Unknown error'
          );
          errors++;
        }
      }

      const duration = Date.now() - startTime;
      const result = { processed, created, duplicates, errors, duration };
      
      logger.info('Email processing cycle completed', result);
      return result;

    } catch (error) {
      logger.error('Email processing cycle failed:', error);
      throw error;
    } finally {
      this.isProcessing = false;
    }
  }

  private setupScheduler(): void {
    // Convert milliseconds to cron expression
    const intervalSeconds = Math.floor(this.config.pollIntervalMs / 1000);
    
    if (intervalSeconds < 60) {
      // For intervals less than 1 minute, use a simple interval
      setInterval(() => {
        this.processEmails().catch(error => {
          logger.error('Scheduled email processing failed:', error);
        });
      }, this.config.pollIntervalMs);
      
      logger.info(`Email polling scheduled every ${intervalSeconds} seconds`);
    } else {
      // For longer intervals, use cron
      const cronExpression = `*/${Math.floor(intervalSeconds / 60)} * * * *`;
      
      cron.schedule(cronExpression, () => {
        this.processEmails().catch(error => {
          logger.error('Scheduled email processing failed:', error);
        });
      });
      
      logger.info(`Email polling scheduled with cron: ${cronExpression}`);
    }

    // Daily cleanup of old processed emails
    cron.schedule('0 2 * * *', () => {
      logger.info('Running daily cleanup of old processed emails');
      deduplicationService.cleanup(30);
    });
  }

  public async start(): Promise<void> {
    try {
      // Test connections on startup
      logger.info('Testing service connections...');
      
      // Test Gmail connection (required)
      const gmailTest = await gmailService.testConnection();
      if (!gmailTest) {
        throw new Error('Gmail connection test failed');
      }
      
      // Test CRM connection (warn if fails, don't stop service)
      try {
        const crmTest = await twentyCRMService.testConnection();
        if (crmTest) {
          logger.info('Twenty CRM connection successful');
        } else {
          logger.warn('Twenty CRM connection failed - will attempt to create leads anyway');
        }
      } catch (error) {
        logger.warn('Twenty CRM connection test failed - will attempt to create leads anyway', error);
      }

      logger.info('Gmail connection successful - service ready to monitor emails');

      // Start the Express server
      this.app.listen(this.config.port, () => {
        logger.info(`Email Parser CRM service started on port ${this.config.port}`);
        logger.info(`Environment: ${this.config.nodeEnv}`);
        logger.info(`Target Email: ${this.config.targetEmail}`);
        logger.info(`Poll Interval: ${this.config.pollIntervalMs}ms`);
      });

      // Setup email polling scheduler
      this.setupScheduler();

      // Run initial email check
      logger.info('Running initial email check...');
      await this.processEmails();

    } catch (error) {
      logger.error('Failed to start application:', error);
      process.exit(1);
    }
  }
}

// Handle uncaught exceptions and unhandled rejections
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

// Start the application
const app = new EmailParserApp();
app.start().catch(error => {
  logger.error('Failed to start application:', error);
  process.exit(1);
});
