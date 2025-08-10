'use server';

import { z } from 'genkit';
import { ai } from '@/ai/genkit';
import { NextRequest, NextResponse } from 'next/server';
import { Message } from '@/lib/types';

// Define the structured output schema for our AI responses.
// This is the "communication protocol" between the AI and our frontend.
const MainChatOutputSchema = z.object({
  responseType: z
    .enum(['text', 'tool_use', 'fallback'])
    .describe(
      'The type of response. Use "text" for conversation, "tool_use" for functions, and "fallback" if unsure.'
    ),
  text: z
    .string()
    .optional()
    .describe(
      'The conversational text response from the AI. Required if responseType is "text".'
    ),
  tool: z
    .object({
      name: z
        .enum([
          'check_in',
          'query_activity',
          'query_community',
          'query_profile',
        ])
        .describe('The name of the tool to be used.'),
    })
    .optional()
    .describe('The tool to be used. Only use if responseType is "tool_use".'),
});
export type MainChatOutput = z.infer<typeof MainChatOutputSchema>;

// Define the main system prompt for the AI Router.
// This prompt strictly commands the AI to act as a JSON-based router.
const routerSystemPrompt = `You are "回响 (Echoes)", an AI assistant. Your primary job is to act as a function router based on the user's prompt.

You MUST respond in a valid JSON format that adheres to the provided schema.

- If the user's intent matches one of the available tools, set 'responseType' to 'tool_use' and specify the 'tool.name'.
- If the user's intent is conversational (e.g., a greeting, a question, a general statement), set 'responseType' to 'text' and provide a conversational reply in the 'text' field.
- If you are absolutely unsure, set 'responseType' to 'fallback'.
- NEVER generate a text reply if you are calling a tool.

Available Tools:
- 'check_in': User wants to "打卡" (check in), "记录" (record), or "写点东西" (write something).
- 'query_activity': User wants to find "活动" (activities) or asks "有什么可以做的" (what is there to do).
- 'query_community': User wants to visit the "社群广场" (community square) or see what others are talking about.
- 'query_profile': User wants to see their "个人中心" (profile), "成长档案" (growth file), or "我的记录" (my records).

Your response must be in Chinese.
`;

// Standard Next.js API Route handler
export async function POST(req: NextRequest) {
  try {
    const { prompt, history } = await req.json();

    // Reconstruct messages for the AI model, including history.
    const messages: any[] = history.map((msg: Message) => ({
      role: msg.role === 'ai' ? 'model' : msg.role,
      content: [
        {
          text:
            typeof msg.content === 'string' ? msg.content : `[UI Component]`,
        },
      ],
    }));
    messages.push({ role: 'user', content: [{ text: prompt }] });

    const response = await ai.generate({
      model: 'googleai/gemini-2.0-flash',
      system: routerSystemPrompt,
      messages: messages, // Send the full conversation history
      output: {
        schema: MainChatOutputSchema,
      },
    });

    const output = response.output;

    if (!output) {
      throw new Error('AI did not return a valid structured response.');
    }

    return NextResponse.json(output);
  } catch (err: any) {
    console.error('[API Route Error]', err);
    return NextResponse.json(
      {
        error: {
          message: err.message || 'An unknown error occurred.',
          stack: err.stack,
          cause: err.cause,
        },
      },
      {
        status: 500,
      }
    );
  }
}
