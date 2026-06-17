import Anthropic from '@anthropic-ai/sdk';
import { env } from './env';

// Instantiates the Anthropic client using the validated API key
export const anthropic = new Anthropic({
  apiKey: env.ANTHROPIC_API_KEY,
});
