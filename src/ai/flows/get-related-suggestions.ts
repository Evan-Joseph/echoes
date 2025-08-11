'use server';
/**
 * @fileOverview An AI flow to generate comments and suggestions.
 */
import { z } from 'zod';
import { getAiConfig } from '@/lib/ai-config';

// --- AI Comment Generation ---

const AiCommentInputSchema = z.object({
  checkInContent: z.string(),
});
type AiCommentInput = z.infer<typeof AiCommentInputSchema>;

const AiCommentOutputSchema = z.object({
    commentText: z.string(),
});
type AiCommentOutput = z.infer<typeof AiCommentOutputSchema>;


export async function generateAiComment(input: AiCommentInput): Promise<AiCommentOutput> {
    const aiConfig = await getAiConfig();
    const { apiKey, baseUrl } = aiConfig.apiConfig;
    const { model, systemPrompt } = aiConfig.aiComment;

    if (!apiKey) {
        throw new Error("AI API Key is not configured.");
    }

    const messages = [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Here is the user's journal entry: "${input.checkInContent}"` },
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
    return AiCommentOutputSchema.parse(parsedOutput);
}


// --- Related Suggestions (Currently Mocked) ---

const RelatedSuggestionsInputSchema = z.object({
  topic: z.string().describe('The topic to find related suggestions for.'),
});
export type RelatedSuggestionsInput = z.infer<typeof RelatedSuggestionsInputSchema>;

const RelatedSuggestionsOutputSchema = z.object({
  suggestions: z.array(z.string()).describe('A list of related suggestions.'),
});
export type RelatedSuggestionsOutput = z.infer<typeof RelatedSuggestionsOutputSchema>;

/**
 * NOTE: This function is currently mocked as it does not appear to be used in the application.
 * It can be implemented with a real API call if needed in the future.
 */
export async function getRelatedSuggestions(input: RelatedSuggestionsInput): Promise<RelatedSuggestionsOutput> {
  console.log("LOCAL MOCK: Generating static related suggestions for topic:", input.topic);

  return {
    suggestions: [
      `关于 “${input.topic}” 的第一条模拟建议。`,
      `关于 “${input.topic}” 的第二条模拟建议。`,
      "这是一个通用的相关建议。",
    ],
  };
}
