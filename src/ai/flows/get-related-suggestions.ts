
'use server';
/**
 * @fileOverview A Genkit flow to generate a comment from the AI based on a community post.
 *
 * - generateAiComment: A function that takes a post's content and returns a thoughtful comment.
 * - GenerateAiCommentInput - The input type for the flow.
 * - GenerateAiCommentOutput - The return type for the flow.
 */
import { ai } from '@/ai/genkit';
import { z } from 'zod';

// Define Zod schemas for input and output
const GenerateAiCommentInputSchema = z.object({
  checkInContent: z.string().describe("The full text content of the user's check-in or post."),
});
export type GenerateAiCommentInput = z.infer<typeof GenerateAiCommentInputSchema>;

const GenerateAiCommentOutputSchema = z.object({
  commentText: z.string().describe("A friendly, engaging, and thought-provoking comment from the AI, ready to be posted."),
});
export type GenerateAiCommentOutput = z.infer<typeof GenerateAiCommentOutputSchema>;

// Define the exported wrapper function
export async function generateAiComment(input: GenerateAiCommentInput): Promise<GenerateAiCommentOutput> {
  return generateAiCommentFlow(input);
}

// Define the Genkit prompt
const commentPrompt = ai.definePrompt({
  name: 'generateAiCommentPrompt',
  model: 'googleai/gemini-2.0-flash',
  input: { schema: GenerateAiCommentInputSchema },
  output: { schema: GenerateAiCommentOutputSchema },
  prompt: `
    You are "回响 (Echoes)", a thoughtful and empathetic community member AI.
    Your goal is to spark meaningful conversation by posting a comment on a user's public post.

    Analyze the user's post content below:
    "{{checkInContent}}"

    Based on this content, please write a single, warm, and insightful comment. Your comment should:
    1.  Acknowledge the user's sharing.
    2.  Offer a related thought, a gentle question, or a word of encouragement.
    3.  Feel like a genuine peer, not a robot.
    4.  The entire response should be just the text of the comment itself, formatted for the output schema.

    Your entire response must be in Chinese.
  `,
});

// Define the Genkit flow
const generateAiCommentFlow = ai.defineFlow(
  {
    name: 'generateAiCommentFlow',
    inputSchema: GenerateAiCommentInputSchema,
    outputSchema: GenerateAiCommentOutputSchema,
  },
  async (input) => {
    const { output } = await commentPrompt(input);
    return output!;
  }
);
