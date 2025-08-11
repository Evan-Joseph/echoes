'use server';
/**
 * @fileOverview An AI flow to generate suggestions by calling an OpenAI-compatible API.
 */
import { z } from 'zod';
import { getAiConfig } from '@/lib/ai-config';

// Define Zod schemas for input and output
const SuggestionInputSchema = z.object({
  context: z.string().describe('The context or user input to generate suggestions for.'),
});
export type SuggestionInput = z.infer<typeof SuggestionInputSchema>;

const SuggestionOutputSchema = z.object({
  suggestions: z.array(z.string()).describe('A list of suggestions.'),
});
export type SuggestionOutput = z.infer<typeof SuggestionOutputSchema>;


export async function generateSuggestions(input: SuggestionInput): Promise<SuggestionOutput> {
  const aiConfig = await getAiConfig();
  const { apiKey, baseUrl } = aiConfig.apiConfig;
  const { model, systemPrompt } = aiConfig.aiSuggestions;

  if (!apiKey) {
    throw new Error("AI API Key is not configured.");
  }

  const messages = [
      { role: "system", content: systemPrompt },
      { role: "user", content: `Context: "${input.context}"` },
  ];

  const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
          model: model,
          messages: messages,
          response_format: { type: "json_object" },
      }),
  });

  if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`API call failed with status ${response.status}: ${errorBody}`);
  }

  const jsonResponse = await response.json();
  const content = jsonResponse.choices[0]?.message?.content;

  if (!content) {
    throw new Error("AI did not return any content.");
  }

  const parsedOutput = JSON.parse(content);
  return SuggestionOutputSchema.parse(parsedOutput);
}
