'use server';
/**
 * @fileOverview Generates word cloud data from text using a frequency counting library.
 */
import { z } from 'zod';
// Correctly import the function from the library
import { allFrequencyCount } from 'word-frequency-counter';

// Define Zod schemas for input and output
const WordCloudInputSchema = z.object({
  texts: z.array(z.string()).describe('An array of texts to analyze.'),
});
export type WordCloudInput = z.infer<typeof WordCloudInputSchema>;

const WordCloudOutputSchema = z.object({
  words: z.array(z.object({
    text: z.string(),
    value: z.number(),
  })).describe('An array of objects, each with a word and its frequency or weight.'),
});
export type WordCloudOutput = z.infer<typeof WordCloudOutputSchema>;

// A simple list of common Chinese and English stop words to filter out.
const stopWords = new Set([
    '的', '了', '是', '我', '你', '他', '她', '它', '我们', '你们', '他们',
    '这', '那', '一个', '也', '在', '有', '就', '不', '都', '还', '说', '很', '但',
    'the', 'a', 'an', 'and', 'is', 'it', 'in', 'i', 'to', 'of', 'for', 'on', 'with', 'that', 'this'
]);


/**
 * Generates word cloud data by counting word frequencies in the provided texts.
 * @param input - An object containing an array of texts.
 * @returns A promise that resolves to an object containing the word cloud data.
 */
export async function generateWordCloud(input: WordCloudInput): Promise<WordCloudOutput> {
  if (!input.texts || input.texts.length === 0) {
    return { words: [] };
  }

  const combinedText = input.texts.join(' ');

  // Use the library to get word frequencies. The result is a Map.
  const frequencies: Map<string, number> = allFrequencyCount(combinedText);

  // Convert the Map to an array, filter out stop words, and format the data.
  const words = Array.from(frequencies.entries())
    .filter(([text, value]) => !stopWords.has(text.toLowerCase()) && text.length > 1 && value > 1)
    .map(([text, value]) => ({ text, value: value * 10 })) // Multiply value for better visualization
    .sort((a, b) => b.value - a.value)
    .slice(0, 50);

  return { words };
}
