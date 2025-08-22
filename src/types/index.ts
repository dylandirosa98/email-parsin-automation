// Email parsing types
export interface ParsedEmail {
  messageId: string;
  subject: string;
  from: string;
  to: string;
  date: Date;
  content: string;
}

export interface ParsedLead {
  // Contact Information
  name: string;
  email?: string;
  phone?: string;
  message?: string;
  
  // Location Information
  address?: string;
  city?: string;
  zipCode?: string;
  
  // UTM Tracking Data
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmTerm?: string;
  utmContent?: string;
  
  // Click IDs
  googleClickId?: string;
  microsoftClickId?: string;
  facebookClickId?: string;
  
  // Metadata
  formSubmissionTime?: string;
  formType?: string;
}

// Twenty CRM types
export interface TwentyCRMLead {
  name: string;
  email?: { primaryEmail: string };
  phone?: { primaryPhoneNumber: string };
  source: string;
  status: string;
  notes?: string;
  
  // UTM fields (only include if not 'none')
  utmMedium?: string;
  utmCampaign?: string;
  utmTerm?: string;
  utmContent?: string;
  
  // Click IDs (only include if not 'none')
  gclid?: string;
  wbraid?: string;
  fbclid?: string;
  
  // Location fields
  adress?: string; // Note: CRM uses 'adress' not 'address'
  city?: string;
  zipCode?: string;
}

export interface TwentyCRMResponse {
  createLead: {
    id: string;
    name: string;
    email?: {
      primaryEmail: string;
    };
    phone?: {
      primaryPhoneNumber: string;
    };
    source: string;
    status: string;
    utmMedium?: string;
    utmCampaign?: string;
    utmTerm?: string;
    utmContent?: string;
    gclid?: string;
    wbraid?: string;
    fbclid?: string;
  };
}

// Source mapping type
export type UTMSource = 
  | 'direct'
  | 'google_organic'
  | 'google_business'
  | 'google_ads'
  | 'facebook'
  | 'facebook_ads'
  | 'instagram'
  | 'linkedin'
  | 'twitter'
  | 'tiktok'
  | 'youtube'
  | 'bing'
  | 'referral';

export type CRMSource =
  | 'WEBSITE_DIRECT'
  | 'GOOGLE_BUSINESS_PROFILE'
  | 'GOOGLE_ADS'
  | 'FACEBOOK_ADS'
  | 'LINKEDIN'
  | 'TWITTER'
  | 'TIKTOK'
  | 'YOUTUBE'
  | 'BING_ADS'
  | 'REFERRAL';

// Application configuration
export interface AppConfig {
  port: number;
  nodeEnv: string;
  pollIntervalMs: number;
  logLevel: string;
  
  // Twenty CRM config
  twentyApiUrl: string;
  twentyApiToken: string;
  
  // Gmail config
  gmailClientId: string;
  gmailClientSecret: string;
  gmailRefreshToken: string;
  targetEmail: string;
}

// Deduplication storage
export interface ProcessedEmail {
  messageId: string;
  processedAt: Date;
  leadId?: string;
  status: 'success' | 'failed' | 'duplicate';
  error?: string;
}
