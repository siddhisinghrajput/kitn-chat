import { anthropic } from '../../config/anthropic';
import { AI_PROMPTS } from './ai.prompts';
import { logger } from '../../utils/logger';

export class ToneCheckService {
  /**
   * Synchronously analyzes text for potential rude/passive-aggressive tones using Claude.
   */
  static async checkTone(content: string) {
    if (!content || !content.trim()) {
      return { flagged: false };
    }

    try {
      const prompt = AI_PROMPTS.toneChecker(content);
      const response = await anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022', // Standard Claude 3.5 Sonnet identifier
        max_tokens: 1000,
        messages: [{ role: 'user', content: prompt }],
      });

      const responseText = response.content[0].type === 'text' ? response.content[0].text : '';
      
      // Strip markdown JSON block wrappers if Claude adds them
      let cleanedText = responseText.trim();
      if (cleanedText.startsWith('```')) {
        cleanedText = cleanedText.replace(/^```json\s*/i, '').replace(/```$/, '').trim();
      }

      try {
        const result = JSON.parse(cleanedText);
        return result;
      } catch (err) {
        logger.error(`❌ Failed to parse tone-check response: ${cleanedText}`);
        return { flagged: false };
      }
    } catch (err: any) {
      logger.error(`❌ Claude tone-check request failed: ${err.message}`);
      return { flagged: false };
    }
  }
}
