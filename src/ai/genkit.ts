/**
 * @fileOverview Centralized Genkit configuration.
 *
 * This file initializes the Genkit AI instance with necessary plugins
 * and exports the configured `ai` object for use throughout the application.
 * This approach ensures a single source of truth for Genkit configuration.
 */
import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';

export const ai = genkit({
  plugins: [googleAI()],
});
