"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailProcessor = void 0;
const bullmq_1 = require("bullmq");
const emailServices_1 = require("./emailServices");
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
    }
    scheduleEmailTasks() {
        this.emailQueue.add('processEmails', {}, {
            repeat: {
                pattern: '*/5 * * * *'
            }
        });
    }
    async cleanup() {
        await this.emailQueue.close();
        await this.redisConnection.quit();
    }
}
exports.EmailProcessor = EmailProcessor;
