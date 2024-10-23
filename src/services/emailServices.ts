// src/services/emailService.ts
import { google } from 'googleapis';
import axios from 'axios';
import { getGmailOAuthClient, getOutlookOAuthClient } from '../config/oauth';
import { EmailMessage } from '../types/email';

export class EmailService {
  private gmailAccessToken: string;
  private outlookAccessToken: string;
  private outlookClient: ReturnType<typeof getOutlookOAuthClient>;

  constructor(gmailToken: string, outlookToken: string) {
    this.gmailAccessToken = gmailToken;
    this.outlookAccessToken = outlookToken;
    this.outlookClient = getOutlookOAuthClient();
  }

  async fetchGmailEmails(): Promise<EmailMessage[]> {
    try {
      const oauth2Client = getGmailOAuthClient();
      oauth2Client.setCredentials({ access_token: this.gmailAccessToken });

      const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
      
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const query = `is:unread after:${yesterday.getTime() / 1000}`;
      
      const response = await gmail.users.messages.list({
        userId: 'me',
        q: query,
        maxResults: 10
      });

      if (!response.data.messages) return [];

      const emails: EmailMessage[] = [];
      
      for (const message of response.data.messages) {
        const fullMessage = await gmail.users.messages.get({
          userId: 'me',
          id: message.id!,
          format: 'full'
        });

        const headers = fullMessage.data.payload?.headers;
        const subject = headers?.find(h => h.name === 'Subject')?.value || 'No Subject';
        const sender = headers?.find(h => h.name === 'From')?.value || 'Unknown';
        
        const body = this.extractGmailBody(fullMessage.data);

        emails.push({
          id: message.id!,
          threadId: message.threadId!,
          subject,
          body,
          sender,
          timestamp: new Date(parseInt(fullMessage.data.internalDate!))
        });
      }

      return emails;
    } catch (error) {
      console.error('Error fetching Gmail emails:', error);
      throw new Error('Failed to fetch Gmail emails');
    }
  }

  private extractGmailBody(message: any): string {
    let body = '';
    
    if (message.payload?.body?.data) {
      body = Buffer.from(message.payload.body.data, 'base64').toString('utf-8');
    } else if (message.payload?.parts) {
      const textPart = message.payload.parts.find((part: any) => 
        part.mimeType === 'text/plain' || part.mimeType === 'text/html'
      );
      if (textPart?.body?.data) {
        body = Buffer.from(textPart.body.data, 'base64').toString('utf-8');
      }
    }
    
    return body;
  }

  async fetchOutlookEmails(): Promise<EmailMessage[]> {
    try {
      const url = 'https://graph.microsoft.com/v1.0/me/messages';
      const params = {
        $filter: "isRead eq false",
        $top: 10,
        $select: "id,subject,bodyPreview,sender,receivedDateTime,body"
      };

      const response = await axios.get(url, {
        headers: { 
          Authorization: `Bearer ${this.outlookAccessToken}`,
          'Content-Type': 'application/json'
        },
        params
      });

      return response.data.value.map((msg: any) => ({
        id: msg.id,
        subject: msg.subject,
        body: msg.body.content,
        sender: msg.sender.emailAddress.address,
        timestamp: new Date(msg.receivedDateTime)
      }));
    } catch (error) {
      console.error('Error fetching Outlook emails:', error);
      throw new Error('Failed to fetch Outlook emails');
    }
  }

  async sendGmailReply(emailId: string, threadId: string, replyContent: string, recipientEmail: string): Promise<void> {
    try {
      const oauth2Client = getGmailOAuthClient();
      oauth2Client.setCredentials({ access_token: this.gmailAccessToken });

      const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
      
      const originalMessage = await gmail.users.messages.get({
        userId: 'me',
        id: emailId
      });

      const headers = originalMessage.data.payload?.headers;
      const subject = headers?.find(h => h.name === 'Subject')?.value || 'Re: No Subject';
      
      const message = [
        `To: ${recipientEmail}`,
        `Subject: ${subject.startsWith('Re:') ? subject : 'Re: ' + subject}`,
        'Content-Type: text/html; charset=utf-8',
        'MIME-Version: 1.0',
        '',
        replyContent
      ].join('\r\n');

      await gmail.users.messages.send({
        userId: 'me',
        requestBody: {
          raw: Buffer.from(message).toString('base64url'),
          threadId
        }
      });
    } catch (error) {
      console.error('Error sending Gmail reply:', error);
      throw new Error('Failed to send Gmail reply');
    }
  }

  async sendOutlookReply(messageId: string, replyContent: string): Promise<void> {
    try {
      const url = `https://graph.microsoft.com/v1.0/me/messages/${messageId}/reply`;
      await axios.post(url, 
        {
          comment: replyContent,
          message: {
            toRecipients: []
          }
        },
        {
          headers: { 
            Authorization: `Bearer ${this.outlookAccessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
    } catch (error) {
      console.error('Error sending Outlook reply:', error);
      throw new Error('Failed to send Outlook reply');
    }
  }
}