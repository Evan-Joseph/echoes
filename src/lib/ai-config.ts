import { promises as fs } from 'fs';
import path from 'path';
import { z } from 'zod';

// Define the schema for our AI configuration to ensure type safety.
const ApiConfigSchema = z.object({
  baseUrl: z.string().optional(),
  apiKey: z.string().optional(),
});

const AiModelConfigSchema = z.object({
  model: z.string(),
  systemPrompt: z.string(),
});

export const AiConfigSchema = z.object({
  apiConfig: ApiConfigSchema,
  chatRouter: AiModelConfigSchema,
  monthlyReport: AiModelConfigSchema,
  aiComment: AiModelConfigSchema,
  aiSuggestions: AiModelConfigSchema,
});

export type AiConfig = z.infer<typeof AiConfigSchema>;

const configPath = path.join(process.cwd(), 'ai-config.json');

/**
 * Reads the AI configuration from ai-config.json.
 * It merges the values from process.env as fallbacks for apiKey and baseUrl.
 * @returns A promise that resolves to the full AI configuration object.
 */
export async function getAiConfig(): Promise<AiConfig> {
  try {
    const fileContent = await fs.readFile(configPath, 'utf-8');
    const configFromFile = JSON.parse(fileContent);

    // Validate the structure of the JSON file
    const validatedConfig = AiConfigSchema.parse(configFromFile);

    // Merge with environment variables as fallbacks
    validatedConfig.apiConfig.baseUrl = validatedConfig.apiConfig.baseUrl || process.env.OPENAI_API_BASE || 'https://api.openai.com/v1';
    validatedConfig.apiConfig.apiKey = validatedConfig.apiConfig.apiKey || process.env.OPENAI_API_KEY;

    if (!validatedConfig.apiConfig.apiKey) {
      console.error("AI API Key is not configured in ai-config.json or OPENAI_API_KEY environment variable.");
      // Depending on strictness, you might want to throw an error here.
      // For now, we'll allow it to proceed, but API calls will fail.
    }

    return validatedConfig;
  } catch (error) {
    console.error("Error reading or parsing ai-config.json:", error);
    throw new Error("Could not load AI configuration. Please ensure ai-config.json is present and correctly formatted.");
  }
}

/**
 * Writes the AI configuration to ai-config.json.
 * @param {AiConfig} newConfig - The new configuration object to save.
 */
export async function updateAiConfig(newConfig: AiConfig): Promise<void> {
    try {
        // Validate the structure before writing to prevent saving a corrupted config.
        const validatedConfig = AiConfigSchema.parse(newConfig);
        await fs.writeFile(configPath, JSON.stringify(validatedConfig, null, 2), 'utf-8');
    } catch (error) {
        console.error("Error writing ai-config.json:", error);
        throw new Error("Could not save AI configuration.");
    }
}
