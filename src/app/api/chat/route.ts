'use server';

import { NextRequest, NextResponse } from "next/server";
import { z } from 'zod';
import type { Message } from "@/lib/types";
import { getAiConfig } from "@/lib/ai-config";

// Define the structured output schema to maintain compatibility with the frontend.
const MainChatOutputSchema = z.object({
  responseType: z.enum(['text', 'tool_use', 'fallback'])
    .describe('The type of response. Use "text" for conversation, "tool_use" for functions, and "fallback" if unsure.'),
  text: z.string().optional().describe('The conversational text response from the AI. Required if responseType is "text".'),
  tool: z.object({
    name: z.enum(['check_in', 'query_activity', 'query_community', 'query_profile'])
      .describe('The name of the tool to be used.'),
  }).optional().describe('The tool to be used. Only use if responseType is "tool_use".'),
});
export type MainChatOutput = z.infer<typeof MainChatOutputSchema>;


/**
 * An API route that calls an OpenAI-compatible API to act as a chat router.
 * It now uses the centralized AI config service.
 */
export async function POST(req: NextRequest) {
  try {
    const { prompt, history } = await req.json();

    // Get AI configuration
    const aiConfig = await getAiConfig();
    const { apiKey, baseUrl } = aiConfig.apiConfig;
    const { model, systemPrompt } = aiConfig.chatRouter;

    if (!apiKey) {
      throw new Error("AI API Key is not configured.");
    }

    // Construct the messages array for the OpenAI API
    const messages = [
        { role: "system", content: systemPrompt },
        ...(history || []).map((msg: Message) => ({
            role: msg.role === 'ai' ? 'assistant' : 'user',
            content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content)
        })),
        { role: "user", content: prompt }
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
    const validatedOutput = MainChatOutputSchema.parse(parsedOutput);

    return NextResponse.json(validatedOutput);

  } catch (err: any) {
    console.error("[API Route Error]", err);
    return NextResponse.json(
      { error: { message: err.message || "An unknown error occurred." } },
      { status: 500 }
    );
  }
}
