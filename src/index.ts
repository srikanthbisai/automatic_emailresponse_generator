// src/index.ts
import 'dotenv/config';
import { EmailProcessor } from './services/emailProcessor';

const processor = new EmailProcessor();
processor.scheduleEmailTasks();

console.log('Email scheduler is running...');

process.on('SIGTERM', async () => {
  await processor.cleanup();
  process.exit(0);
});