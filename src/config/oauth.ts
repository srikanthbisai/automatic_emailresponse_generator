import { google } from 'googleapis';
import * as msal from '@azure/msal-node';

export const getGmailOAuthClient = () => {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.REDIRECT_URI
  );
  return oauth2Client;
};

export const getOutlookOAuthClient = () => {
  const msalConfig = {
    auth: {
      clientId: process.env.OUTLOOK_CLIENT_ID!,
      authority: `https://login.microsoftonline.com/${process.env.OUTLOOK_TENANT_ID}`,
      clientSecret: process.env.OUTLOOK_CLIENT_SECRET!,
    },
  };

  return new msal.ConfidentialClientApplication(msalConfig);
};