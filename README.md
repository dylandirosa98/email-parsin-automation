# Email Parser CRM Automation

A Node.js/TypeScript service that monitors Gmail for structured lead emails and automatically creates leads in Twenty CRM. Designed for Railway deployment with comprehensive error handling, deduplication, and monitoring.

## 🎯 Overview

This service automatically:
- Monitors Gmail inbox for new lead emails from `info@pythonwebsolutions.com`
- Parses structured lead data from email content
- Creates leads in Twenty CRM via GraphQL API
- Prevents duplicate processing with persistent storage
- Provides health monitoring and manual triggers
- Logs all operations with comprehensive error handling

## 📧 Email Format

The service parses emails with this structure:

```
Subject: 🔥 NEW LEAD: [Name] - [utm_source]
From: info@pythonwebsolutions.com
To: dylan@thespartanexteriors.com

NEW LEAD SUBMISSION - SPARTAN EXTERIORS
=====================================

CONTACT INFORMATION:
Name: John Doe
Email: john@example.com
Phone: 555-123-4567
Message: I need a roof estimate

LOCATION INFORMATION:
Address: 123 Main St
City: Camden
Zip Code: 08104

UTM TRACKING DATA:
Source: google_business
Medium: organic
Campaign: local_search
Term: roofing contractors
Content: ad_variant_1

CLICK IDs:
Google Click ID: Cj0KCQjw...
Microsoft Click ID: none
Facebook Click ID: none

FORM SUBMISSION TIME: 2024-01-15T10:30:00Z
FORM TYPE: Contact Form
=====================================
```

## 🚀 Quick Start

### Prerequisites

1. **Gmail API Credentials**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select existing
   - Enable Gmail API
   - Create OAuth 2.0 credentials
   - Generate refresh token

2. **Twenty CRM Access**
   - Access to Twenty CRM instance at `https://crm.thespartanexteriors.com`
   - Valid API token with lead creation permissions

### Local Development

1. **Clone and Install**
   ```bash
   git clone <repository-url>
   cd email-parser-crm
   npm install
   ```

2. **Environment Setup**
   ```bash
   cp env.example .env
   # Edit .env with your credentials
   ```

3. **Required Environment Variables**
   ```env
   # Twenty CRM Configuration
   TWENTY_API_URL=https://crm.thespartanexteriors.com
   TWENTY_API_TOKEN=your_api_token_here
   
   # Gmail API Configuration
   GMAIL_CLIENT_ID=your_gmail_client_id
   GMAIL_CLIENT_SECRET=your_gmail_client_secret
   GMAIL_REFRESH_TOKEN=your_refresh_token
   TARGET_EMAIL=dylan@thespartanexteriors.com
   
   # Application Configuration
   PORT=3000
   NODE_ENV=development
   POLL_INTERVAL_MS=30000
   LOG_LEVEL=info
   ```

4. **Run Development Server**
   ```bash
   npm run dev
   ```

### Production Deployment (Railway)

1. **Deploy to Railway**
   ```bash
   # Connect to Railway
   railway login
   railway link
   
   # Set environment variables
   railway variables set TWENTY_API_URL=https://crm.thespartanexteriors.com
   railway variables set TWENTY_API_TOKEN=your_token
   railway variables set GMAIL_CLIENT_ID=your_client_id
   railway variables set GMAIL_CLIENT_SECRET=your_secret
   railway variables set GMAIL_REFRESH_TOKEN=your_refresh_token
   railway variables set TARGET_EMAIL=dylan@thespartanexteriors.com
   railway variables set NODE_ENV=production
   railway variables set POLL_INTERVAL_MS=30000
   
   # Deploy
   railway up
   ```

2. **Environment Variables in Railway Dashboard**
   - Go to your Railway project dashboard
   - Navigate to Variables tab
   - Add all required environment variables
   - Redeploy the service

## 🔧 API Endpoints

### Health Check
```
GET /health
```
Returns service status, uptime, and processing statistics.

### Manual Trigger
```
POST /trigger
```
Manually trigger email processing cycle.

### Statistics
```
GET /stats
```
Get detailed processing statistics and configuration.

### Test Connections
```
GET /test
```
Test Gmail and Twenty CRM connections.

### Recent Emails (Debug)
```
GET /recent-emails?count=5
```
Get recent emails for debugging purposes.

## 📊 Monitoring

### Health Monitoring
- `/health` endpoint for Railway health checks
- Automatic restart on failures
- Comprehensive error logging

### Processing Statistics
- Total emails processed
- Successful lead creations
- Duplicate detections
- Error counts and details

### Logs
- Structured JSON logging with Winston
- Different log levels (error, warn, info, debug)
- File logging in production
- Request/response logging

## 🔄 Data Flow

1. **Email Monitoring**
   - Service polls Gmail every 30 seconds (configurable)
   - Searches for emails matching specific criteria
   - Fetches full email content for parsing

2. **Email Parsing**
   - Extracts structured data from email content
   - Validates required fields (name, email format, phone)
   - Normalizes data formats (phone numbers, UTM sources)

3. **Deduplication**
   - Checks processed emails storage
   - Prevents duplicate lead creation
   - Tracks processing status and errors

4. **CRM Integration**
   - Maps parsed data to Twenty CRM format
   - Validates CRM payload
   - Creates lead via GraphQL mutation
   - Handles API errors and retries

## 🛠️ Configuration

### Polling Interval
- Default: 30 seconds (`POLL_INTERVAL_MS=30000`)
- Minimum recommended: 15 seconds
- Adjust based on email volume and API limits

### Source Mapping
The service maps UTM sources to Twenty CRM enum values:

```typescript
{
  'direct': 'WEBSITE_DIRECT',
  'google_organic': 'WEBSITE_DIRECT', 
  'google_business': 'GOOGLE_BUSINESS_PROFILE',
  'google_ads': 'GOOGLE_ADS',
  'facebook': 'FACEBOOK_ADS',
  'facebook_ads': 'FACEBOOK_ADS',
  'instagram': 'FACEBOOK_ADS',
  'linkedin': 'LINKEDIN',
  'twitter': 'TWITTER', 
  'tiktok': 'TIKTOK',
  'youtube': 'YOUTUBE',
  'bing': 'BING_ADS',
  'referral': 'REFERRAL'
}
```

### Field Mapping
Email data is mapped to Twenty CRM fields:

```typescript
{
  name: string, // Required
  email: { primaryEmail: string }, // Optional
  phone: { primaryPhoneNumber: string }, // Optional (digits only)
  source: CRMSource, // Mapped from UTM source
  status: "NEW", // Always NEW for parsed leads
  notes: string, // From message or default text
  
  // UTM fields (only if not 'none')
  utmMedium?: string,
  utmCampaign?: string,
  utmTerm?: string,
  utmContent?: string,
  
  // Click IDs (only if not 'none')
  gclid?: string,
  wbraid?: string,
  fbclid?: string,
  
  // Location fields
  adress?: string, // Note: CRM uses 'adress'
  city?: string,
  zipCode?: string
}
```

## 🔍 Troubleshooting

### Common Issues

1. **Gmail Connection Failed**
   - Check OAuth 2.0 credentials
   - Verify refresh token is valid
   - Ensure Gmail API is enabled

2. **Twenty CRM Connection Failed**
   - Verify API token is valid and not expired
   - Check CRM URL is accessible
   - Confirm API permissions for lead creation

3. **No Emails Found**
   - Check email filters (sender, subject, recipient)
   - Verify target email address
   - Check Gmail search query syntax

4. **Lead Creation Failed**
   - Review CRM field validation errors
   - Check required field mapping
   - Verify source enum values

### Debug Mode
Set `LOG_LEVEL=debug` for verbose logging:
```bash
railway variables set LOG_LEVEL=debug
```

### Manual Testing
Use the API endpoints to test components:
```bash
# Test connections
curl https://your-app.railway.app/test

# Get recent emails
curl https://your-app.railway.app/recent-emails

# Manual trigger
curl -X POST https://your-app.railway.app/trigger
```

## 📁 Project Structure

```
email-parser-crm/
├── src/
│   ├── index.ts                 # Main application entry point
│   ├── types/
│   │   └── index.ts            # TypeScript type definitions
│   ├── services/
│   │   ├── gmail.ts            # Gmail API service
│   │   ├── parser.ts           # Email parsing service
│   │   └── crm.ts              # Twenty CRM integration
│   └── utils/
│       ├── logger.ts           # Winston logging configuration
│       └── deduplication.ts    # Deduplication service
├── dist/                       # Compiled JavaScript (generated)
├── package.json               # Dependencies and scripts
├── tsconfig.json             # TypeScript configuration
├── railway.json              # Railway deployment config
├── Procfile                  # Process definition
├── .gitignore               # Git ignore patterns
├── env.example              # Environment variables template
└── README.md                # This file
```

## 🔐 Security

- API tokens stored as environment variables
- No sensitive data logged
- OAuth 2.0 for Gmail access
- HTTPS for all external API calls
- Input validation and sanitization

## 📈 Performance

- Efficient Gmail API usage with search filters
- Persistent deduplication storage
- Configurable polling intervals
- Graceful error handling and retries
- Memory-efficient email processing

## 🚀 Deployment Checklist

- [ ] Gmail API credentials configured
- [ ] Twenty CRM API token valid
- [ ] All environment variables set
- [ ] Health check endpoint responding
- [ ] Test connections successful
- [ ] Processing statistics available
- [ ] Error logging functional
- [ ] Deduplication working
- [ ] Manual trigger tested

## 📞 Support

For issues or questions:
1. Check the logs via Railway dashboard
2. Use `/health` and `/test` endpoints for diagnostics
3. Review environment variable configuration
4. Test individual components with API endpoints

## 📄 License

MIT License - see LICENSE file for details.
