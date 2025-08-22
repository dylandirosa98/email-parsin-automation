# 🚀 Deployment Guide

## Railway Deployment Steps

### 1. Prerequisites
- Railway account: https://railway.app
- Gmail API credentials configured
- Twenty CRM API token ready

### 2. Gmail API Setup

1. **Google Cloud Console Setup**
   ```
   1. Go to https://console.cloud.google.com/
   2. Create new project or select existing
   3. Enable Gmail API
   4. Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client ID"
   5. Application type: "Desktop application"
   6. Download credentials JSON
   ```

2. **Generate Refresh Token**
   ```bash
   # Use Google OAuth Playground or run this Node.js script:
   npm install googleapis
   node -e "
   const {google} = require('googleapis');
   const oauth2Client = new google.auth.OAuth2(
     'YOUR_CLIENT_ID',
     'YOUR_CLIENT_SECRET',
     'urn:ietf:wg:oauth:2.0:oob'
   );
   const authUrl = oauth2Client.generateAuthUrl({
     access_type: 'offline',
     scope: ['https://www.googleapis.com/auth/gmail.readonly']
   });
   console.log('Visit:', authUrl);
   "
   # Visit the URL, get the code, then:
   # oauth2Client.getToken(code, callback);
   ```

### 3. Railway Deployment

1. **Install Railway CLI**
   ```bash
   npm install -g @railway/cli
   railway login
   ```

2. **Create Railway Project**
   ```bash
   railway init
   # Follow prompts to create new project
   ```

3. **Set Environment Variables**
   ```bash
   # Twenty CRM
   railway variables set TWENTY_API_URL=https://crm.thespartanexteriors.com
   railway variables set TWENTY_API_TOKEN=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ3b3Jrc3BhY2VJZCI6IjkzNjk4MzI4LWEzOGMtNGQ5MS1hNTQyLWQxYWU0OTE4Yjk4YSIsInVzZXJJZCI6IjkzNjk4MzI4LWEzOGMtNGQ5MS1hNTQyLWQxYWU0OTE4Yjk4YSIsImFwcElkIjoiOTM2OTgzMjgtYTM4Yy00ZDkxLWE1NDItZDFhZTQ5MThiOThhIiwidHlwZSI6IkFQSSIsImlhdCI6MTczNjk2NzE4OCwiZXhwIjoxNzY4NTAzMTg4fQ.YFfTqGmQzRkCqgMWl2Qw8qI7d0nCrCCDxGzSP_jEcnE

   # Gmail API
   railway variables set GMAIL_CLIENT_ID=your_client_id_here
   railway variables set GMAIL_CLIENT_SECRET=your_client_secret_here
   railway variables set GMAIL_REFRESH_TOKEN=your_refresh_token_here
   railway variables set TARGET_EMAIL=dylan@thespartanexteriors.com

   # App Configuration
   railway variables set NODE_ENV=production
   railway variables set PORT=3000
   railway variables set POLL_INTERVAL_MS=30000
   railway variables set LOG_LEVEL=info
   ```

4. **Deploy**
   ```bash
   railway up
   ```

### 4. Post-Deployment Verification

1. **Check Health**
   ```bash
   curl https://your-app.railway.app/health
   ```

2. **Test Connections**
   ```bash
   curl https://your-app.railway.app/test
   ```

3. **View Logs**
   ```bash
   railway logs
   ```

4. **Manual Trigger Test**
   ```bash
   curl -X POST https://your-app.railway.app/trigger
   ```

### 5. Monitoring Setup

1. **Railway Dashboard**
   - Monitor CPU/Memory usage
   - View deployment logs
   - Check health metrics

2. **Health Check Endpoint**
   - Configure external monitoring (UptimeRobot, Pingdom)
   - Monitor `/health` endpoint
   - Set up alerts for failures

3. **Log Monitoring**
   - Review error logs regularly
   - Monitor processing statistics
   - Check for API rate limits

## Environment Variables Reference

### Required Variables
```env
TWENTY_API_URL=https://crm.thespartanexteriors.com
TWENTY_API_TOKEN=your_twenty_api_token
GMAIL_CLIENT_ID=your_gmail_client_id
GMAIL_CLIENT_SECRET=your_gmail_client_secret
GMAIL_REFRESH_TOKEN=your_gmail_refresh_token
TARGET_EMAIL=dylan@thespartanexteriors.com
```

### Optional Variables
```env
NODE_ENV=production
PORT=3000
POLL_INTERVAL_MS=30000
LOG_LEVEL=info
```

## Troubleshooting

### Common Issues

1. **Build Failures**
   - Check TypeScript compilation errors
   - Verify all dependencies in package.json
   - Review build logs in Railway

2. **Runtime Errors**
   - Check environment variables are set
   - Verify API credentials are valid
   - Review application logs

3. **Connection Issues**
   - Test Gmail API credentials locally
   - Verify Twenty CRM API token
   - Check network connectivity

4. **No Emails Processing**
   - Verify Gmail search criteria
   - Check email format matches expected structure
   - Review parsing logic and logs

### Debug Commands

```bash
# View recent logs
railway logs --tail

# Check environment variables
railway variables

# Restart service
railway service restart

# Connect to shell (if needed)
railway shell
```

## Scaling Considerations

1. **Polling Frequency**
   - Default: 30 seconds
   - Adjust based on email volume
   - Consider API rate limits

2. **Resource Usage**
   - Monitor memory usage
   - Check CPU utilization
   - Scale Railway plan if needed

3. **Error Handling**
   - Automatic retries implemented
   - Graceful degradation
   - Persistent error logging

## Security Best Practices

1. **Environment Variables**
   - Never commit credentials to git
   - Use Railway's secure variable storage
   - Rotate tokens regularly

2. **API Access**
   - Use least-privilege API tokens
   - Monitor API usage
   - Implement rate limiting

3. **Logging**
   - Don't log sensitive data
   - Use structured logging
   - Implement log rotation

## Maintenance

1. **Regular Tasks**
   - Monitor processing statistics
   - Review error logs
   - Update dependencies

2. **Token Refresh**
   - Gmail refresh tokens may expire
   - Monitor authentication errors
   - Have backup access method

3. **CRM Updates**
   - Monitor Twenty CRM API changes
   - Update field mappings if needed
   - Test after CRM updates
