"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// src/index.ts
require("dotenv/config");
const emailProcessor_1 = require("./services/emailProcessor");
const processor = new emailProcessor_1.EmailProcessor();
processor.scheduleEmailTasks();
console.log('Email scheduler is running...');
process.on('SIGTERM', async () => {
    await processor.cleanup();
    process.exit(0);
});
