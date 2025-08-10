
'use server';
/**
 * @fileOverview A Genkit flow to generate a user's monthly growth report.
 *
 * - generateMonthlyReport: A function that analyzes check-ins and creates a report.
 * - GenerateMonthlyReportInput - The input type for the flow.
 * - GenerateMonthlyReportOutput - The return type for the flow.
 */
import { ai } from '@/ai/genkit';
import { z } from 'zod';

// Define Zod schemas for input and output
const GenerateMonthlyReportInputSchema = z.object({
  checkInContents: z.array(z.string()).describe('An array of user check-in texts from the past month.'),
  previousReportSummary: z.string().optional().describe('The summary from the previous month\'s report, if available. Use this for context and to show continuity.'),
});
export type GenerateMonthlyReportInput = z.infer<typeof GenerateMonthlyReportInputSchema>;

const GenerateMonthlyReportOutputSchema = z.object({
    summary: z.string().describe("A warm, one-paragraph summary of the user's overall journey this month, identifying key themes or emotional tones."),
    highlights: z.array(z.string()).length(3).describe("An array of exactly 3 direct quotes from the user's most positive or significant check-ins. These should be verbatim copies of the original content."),
    suggestions: z.array(z.string()).length(2).describe("An array of exactly 2 actionable, gentle, and encouraging suggestions for the user's growth next month, based on their check-ins."),
});
export type GenerateMonthlyReportOutput = z.infer<typeof GenerateMonthlyReportOutputSchema>;

// Define the exported wrapper function
export async function generateMonthlyReport(input: GenerateMonthlyReportInput): Promise<GenerateMonthlyReportOutput> {
  return generateMonthlyReportFlow(input);
}

// Define the Genkit prompt
const monthlyReportPrompt = ai.definePrompt({
  name: 'generateMonthlyReportPrompt',
  model: 'googleai/gemini-2.0-flash',
  input: { schema: GenerateMonthlyReportInputSchema },
  output: { schema: GenerateMonthlyReportOutputSchema },
  prompt: `
    You are "回响 (Echoes)", a deeply insightful and empathetic AI growth partner.
    Your task is to analyze the user's check-in journal entries from the past month and generate a personalized, encouraging, and actionable growth report.
    The response must be in Chinese.

    Instructions:
    1.  **Summary**: Read all the check-in entries. Write a warm, cohesive one-paragraph summary. Identify recurring themes (e.g., mindfulness, learning a new skill, managing stress) and the general emotional tone. Avoid simply listing topics; weave them into a narrative about their month.
    2.  **Highlights**: Carefully select exactly 3 of the most positive, insightful, or significant check-in entries. These should be moments of achievement, gratitude, or self-awareness. Return these as direct, verbatim quotes in the 'highlights' array. Do not alter the user's original words.
    3.  **Suggestions**: Based on the user's entries, provide exactly 2 gentle, actionable, and forward-looking suggestions. Frame them as supportive ideas, not commands. For example, if they mention creative blocks, suggest trying a new medium. If they mention enjoying nature, suggest scheduling a weekly walk.
    
    {{#if previousReportSummary}}
    **Continuity Context**: For reference, here is the summary from the user's previous monthly report. Use this to understand their ongoing journey and avoid making repetitive suggestions.
    Previous Summary: "{{previousReportSummary}}"
    {{/if}}

    User's check-in entries for the month:
    {{#each checkInContents}}
    - "{{{this}}}"
    {{/each}}
  `,
});

// Define the Genkit flow
const generateMonthlyReportFlow = ai.defineFlow(
  {
    name: 'generateMonthlyReportFlow',
    inputSchema: GenerateMonthlyReportInputSchema,
    outputSchema: GenerateMonthlyReportOutputSchema,
  },
  async (input) => {
    // If there are not enough contents, return a default or empty state to avoid low-quality AI output.
    if (input.checkInContents.length < 3) {
        throw new Error("Not enough data for a meaningful report.");
    }
    
    const { output } = await monthlyReportPrompt(input);
    return output!;
  }
);
