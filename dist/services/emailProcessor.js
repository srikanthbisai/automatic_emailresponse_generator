"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailProcessor = void 0;
// src/services/emailProcessor.ts
const bullmq_1 = require("bullmq");
const emailServices_1 = require("./emailServices");
const openAiServices_1 = require("./openAiServices");
const ioredis_1 = __importDefault(require("ioredis"));
class EmailProcessor {
    constructor() {
        this.redisConnection = new ioredis_1.default({
            host: process.env.REDIS_HOST || 'localhost',
            port: parseInt(process.env.REDIS_PORT || '6379'),
            maxRetriesPerRequest: null
        });
        this.emailQueue = new bullmq_1.Queue('emailQueue', {
            connection: this.redisConnection
        });
        this.processedEmails = new Set();
        this.emailService = new emailServices_1.EmailService(process.env.GMAIL_ACCESS_TOKEN, process.env.OUTLOOK_ACCESS_TOKEN);
        this.worker = new bullmq_1.Worker('emailQueue', async (job) => {
            await this.processEmails();
        }, {
            connection: this.redisConnection
        });
    }
    async processEmails() {
        try {
            const gmailEmails = await this.emailService.fetchGmailEmails();
            const outlookEmails = await this.emailService.fetchOutlookEmails();
            for (const email of [...gmailEmails, ...outlookEmails]) {
                if (!this.processedEmails.has(email.id)) {
                    const analysis = await (0, openAiServices_1.analyzeEmail)(email.body);
                    const reply = await (0, openAiServices_1.generateReply)(email.body, analysis);
                    if (email.threadId) {
                        await this.emailService.sendGmailReply(email.id, email.threadId, reply, email.sender);
                    }
                    else {
                        await this.emailService.sendOutlookReply(email.id, reply);
                    }
                    this.processedEmails.add(email.id);
                }
            }
        }
        catch (error) {
            console.error('Error processing emails:', error);
        }
    }
    scheduleEmailTasks() {
        this.emailQueue.add('processEmails', {}, {
            repeat: {
                pattern: '*/5 * * * *'
            }
        });
    }
    async cleanup() {
        await this.worker.close();
        await this.emailQueue.close();
        await this.redisConnection.quit();
    }
}
exports.EmailProcessor = EmailProcessor;
