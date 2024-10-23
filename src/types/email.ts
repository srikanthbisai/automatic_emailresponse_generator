export interface EmailMessage {
    id: string;
    threadId?: string;
    subject: string;
    body: string;
    sender: string;
    timestamp: Date;
  }