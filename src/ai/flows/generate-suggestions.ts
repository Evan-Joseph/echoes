
'use server';
/**
 * @fileOverview A Genkit flow to generate conversation suggestions.
 *
 * - generateSuggestions: A function that returns a list of engaging conversation starters.
 * - GenerateSuggestionsOutput - The return type for the flow.
 */
import { ai } from '@/ai/genkit';
import { z } from 'zod';

// Define Zod schemas for input and output
// No input is needed for this flow.
const GenerateSuggestionsOutputSchema = z.object({
  suggestions: z.array(z.string()).length(4).describe('An array of exactly 4 diverse and engaging conversation starters.'),
});
export type GenerateSuggestionsOutput = z.infer<typeof GenerateSuggestionsOutputSchema>;

// Define the exported wrapper function
export async function generateSuggestions(): Promise<GenerateSuggestionsOutput> {
  return generateSuggestionsFlow();
}

// Define the Genkit prompt
const suggestionPrompt = ai.definePrompt({
  name: 'generateSuggestionsPrompt',
  model: 'googleai/gemini-2.0-flash',
  output: { schema: GenerateSuggestionsOutputSchema },
  prompt: `
    You are "回响 (Echoes)", a creative and empathetic AI growth partner.
    Your task is to generate a list of exactly 4 diverse, short, and engaging conversation starters for a user looking for inspiration.
    
    Instructions:
    1.  The topics should revolve around personal growth, self-reflection, productivity, mindfulness, and creativity.
    2.  Each suggestion must be a question or a "call to action" that is easy for the user to respond to.
    3.  The suggestions should be distinct from each other.
    4.  The response must be in Chinese.
    5.  Format the output according to the schema, providing an array of 4 strings.

    Example desirable outputs:
    - ["最近有什么让你感到特别专注的时刻？", "分享一个你最近学到的小知识。", "如果可以给十年前的自己一句建议，会是什么？", "今天，你想为自己的哪个小目标努力？"]
    - ["描述一个让你感到平静的场景。", "你最欣赏自己身上的哪个品质？", "为了改善心情，你通常会做什么？", "有没有一本书或一部电影最近触动了你？"]
  `,
});

// Define the Genkit flow
const generateSuggestionsFlow = ai.defineFlow(
  {
    name: 'generateSuggestionsFlow',
    outputSchema: GenerateSuggestionsOutputSchema,
  },
  async () => {
    const { output } = await suggestionPrompt();
    return output!;
  }
);
