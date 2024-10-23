// src/services/emailProcessor.ts
import { Queue, Worker } from 'bullmq';
import { EmailService } from './emailServices';
import { analyzeEmail, generateReply }  from "./openAiServices";
import Redis from 'ioredis';

export class EmailProcessor {
  private emailQueue: Queue;
  private redisConnection: Redis;
  private emailService: EmailService;
  private processedEmails: Set<string>;
  private worker: Worker;

  constructor() {
    this.redisConnection = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      maxRetriesPerRequest: null
    });

    this.emailQueue = new Queue('emailQueue', {
      connection: this.redisConnection
    });

    this.processedEmails = new Set<string>();
    this.emailService = new EmailService(
      process.env.GMAIL_ACCESS_TOKEN!,
      process.env.OUTLOOK_ACCESS_TOKEN!
    );

    this.worker = new Worker('emailQueue', async (job) => {
      await this.processEmails();
    }, {
      connection: this.redisConnection
    });
  }

  private async processEmails(): Promise<void> {
    try {
      const gmailEmails = await this.emailService.fetchGmailEmails();
      const outlookEmails = await this.emailService.fetchOutlookEmails();

      for (const email of [...gmailEmails, ...outlookEmails]) {
        if (!this.processedEmails.has(email.id)) {
          const analysis = await analyzeEmail(email.body);
          const reply = await generateReply(email.body, analysis);
          
          if (email.threadId) {
            await this.emailService.sendGmailReply(
              email.id,
              email.threadId,
              reply,
              email.sender
            );
          } else {
            await this.emailService.sendOutlookReply(email.id, reply);
          }

          this.processedEmails.add(email.id);
        }
      }
    } catch (error) {
      console.error('Error processing emails:', error);
    }
  }

  public scheduleEmailTasks(): void {
    this.emailQueue.add('processEmails', {}, {
      repeat: {
        pattern: '*/5 * * * *'
      }
    });
  }

  public async cleanup(): Promise<void> {
    await this.worker.close();
    await this.emailQueue.close();
    await this.redisConnection.quit();
  }
}