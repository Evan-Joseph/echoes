'use server';
/**
 * @fileOverview An AI flow to generate a user's monthly growth report by calling an OpenAI-compatible API.
 */
import { z } from 'zod';
import { getAiConfig } from '@/lib/ai-config';

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


export async function generateMonthlyReport(input: GenerateMonthlyReportInput): Promise<GenerateMonthlyReportOutput> {
  if (input.checkInContents.length < 3) {
      throw new Error("Not enough data for a meaningful report.");
  }

  // Get AI configuration
  const aiConfig = await getAiConfig();
  const { apiKey, baseUrl } = aiConfig.apiConfig;
  const { model, systemPrompt } = aiConfig.monthlyReport;

  if (!apiKey) {
    throw new Error("AI API Key is not configured.");
  }

  // Construct the user prompt
  let userPrompt = "User's check-in entries for the month:\n";
  input.checkInContents.forEach(content => {
      userPrompt += `- "${content}"\n`;
  });

  if (input.previousReportSummary) {
      userPrompt += `\n**Continuity Context**: For reference, here is the summary from the user's previous monthly report. Use this to understand their ongoing journey and avoid making repetitive suggestions.\nPrevious Summary: "${input.previousReportSummary}"`;
  }

  const messages = [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
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
  return GenerateMonthlyReportOutputSchema.parse(parsedOutput);
}
