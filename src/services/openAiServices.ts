import { Configuration, OpenAIApi } from 'openai';

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});

const openai = new OpenAIApi(configuration);

export const analyzeEmail = async (emailContent: string): Promise<string> => {
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

export const generateReply = async (emailContent: string, label: string): Promise<string> => {
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