
import { genkit, z } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

/**
 * Global Genkit instance configured for Google AI models.
 */
export const ai = genkit({
  plugins: [
    googleAI(),
  ],
  model: googleAI.model('gemini-2.5-flash'),
});

export { z };
