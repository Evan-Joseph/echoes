
'use server';
/**
 * @fileOverview A Genkit flow to analyze text and generate word cloud data.
 *
 * - generateWordCloudData: A function that takes an array of strings and returns words with their frequencies.
 * - GenerateWordCloudInput - The input type for the flow.
 * - GenerateWordCloudOutput - The return type for the flow.
 */
import { ai } from '@/ai/genkit';
import { z } from 'zod';

// Define Zod schemas for input and output
const GenerateWordCloudInputSchema = z.object({
  checkInContents: z.array(z.string()).describe('An array of user check-in texts to be analyzed.'),
});
export type GenerateWordCloudDataInput = z.infer<typeof GenerateWordCloudInputSchema>;

const GenerateWordCloudOutputSchema = z.object({
    words: z.array(z.object({
        text: z.string().describe('The identified word or phrase.'),
        value: z.number().describe('The frequency or weight of the word.'),
    })).describe('An array of objects, each representing a word and its frequency for the word cloud.'),
});
export type GenerateWordCloudDataOutput = z.infer<typeof GenerateWordCloudOutputSchema>;

// Define the exported wrapper function
export async function generateWordCloudData(input: GenerateWordCloudDataInput): Promise<GenerateWordCloudDataOutput> {
  return generateWordCloudFlow(input);
}

// Define the Genkit prompt
const wordCloudPrompt = ai.definePrompt({
  name: 'wordCloudPrompt',
  model: 'googleai/gemini-2.0-flash',
  input: { schema: GenerateWordCloudInputSchema },
  output: { schema: GenerateWordCloudOutputSchema },
  prompt: `
    You are an expert in text analysis and data visualization.
    Your task is to analyze the provided array of user check-in texts and generate a list of keywords or phrases along with their frequencies.
    
    Instructions:
    1.  Combine all texts into a single corpus.
    2.  Identify the most meaningful and frequently occurring words or short phrases (2-3 words).
    3.  Ignore common stop words (e.g., "的", "了", "是", "我", "你").
    4.  Calculate the frequency of each identified term.
    5.  Return a list of the top 20-30 terms, formatted according to the output schema.
    6.  The 'value' should be the raw frequency count of the 'text'.
    7.  The language of the texts is primarily Chinese.

    User check-in contents:
    {{#each checkInContents}}
    - {{{this}}}
    {{/each}}
  `,
});

// Define the Genkit flow
const generateWordCloudFlow = ai.defineFlow(
  {
    name: 'generateWordCloudFlow',
    inputSchema: GenerateWordCloudInputSchema,
    outputSchema: GenerateWordCloudOutputSchema,
  },
  async (input) => {
    // If there are no contents, return an empty array to avoid calling the model unnecessarily.
    if (input.checkInContents.length === 0) {
        return { words: [] };
    }
    
    const { output } = await wordCloudPrompt(input);
    return output!;
  }
);
