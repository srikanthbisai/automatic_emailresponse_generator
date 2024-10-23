import { Queue, Worker } from 'bullmq';
import { EmailService } from './emailServices';
import { analyzeEmail, generateReply } from './openAiServices'; // Fixed import path
import Redis from 'ioredis';

export class EmailProcessor {
  private emailQueue: Queue;
  private redisConnection: Redis;
  private emailService: EmailService;
  private processedEmails: Set<string>;

  constructor() {
    this.redisConnection = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      maxRetriesPerRequest: null
    });

    this.emailQueue = new Queue('emailQueue', {
      connection: this.redisConnection
    });

    this.processedEmails = new Set();
    this.emailService = new EmailService(
      process.env.GMAIL_ACCESS_TOKEN!,
      process.env.OUTLOOK_ACCESS_TOKEN!
    );
  }

  public scheduleEmailTasks(): void {
    this.emailQueue.add('processEmails', {}, {
      repeat: {
        pattern: '*/5 * * * *'
      }
    });
  }

  public async cleanup(): Promise<void> {
    await this.emailQueue.close();
    await this.redisConnection.quit();
  }
}