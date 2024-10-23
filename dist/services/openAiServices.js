"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateReply = exports.analyzeEmail = void 0;
const openai_1 = require("openai");
const configuration = new openai_1.Configuration({
    apiKey: process.env.OPENAI_API_KEY,
});
const openai = new openai_1.OpenAIApi(configuration);
const analyzeEmail = async (emailContent) => {
    const prompt = `
    Classify this email into one of the following categories: 
    - Interested
    - Not Interested
    - More Information
    Email: ${emailContent}
  `;
    const response = await openai.createCompletion({
        model: 'gpt-4',
        prompt,
        max_tokens: 50,
    });
    if (!response.data.choices[0]?.text) {
        throw new Error('Failed to get response from OpenAI');
    }
    return response.data.choices[0].text.trim();
};
exports.analyzeEmail = analyzeEmail;
const generateReply = async (emailContent, label) => {
    const prompt = `
    Based on the following label "${label}", generate an appropriate email response.
    Email: ${emailContent}
  `;
    const response = await openai.createCompletion({
        model: 'gpt-4',
        prompt,
        max_tokens: 100,
    });
    if (!response.data.choices[0]?.text) {
        throw new Error('Failed to get response from OpenAI');
    }
    return response.data.choices[0].text.trim();
};
exports.generateReply = generateReply;
