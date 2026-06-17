import axios from 'axios';
import { prisma } from '../../config/db';
import { env } from '../../config/env';
import { logger } from '../../utils/logger';

export class TranslationService {
  /**
   * Translates a message to the target language, checking cached results first
   */
  static async translateMessage(messageId: string, targetLanguage: string): Promise<string> {
    const message = await prisma.message.findUnique({
      where: { id: messageId },
    });

    if (!message) {
      throw new Error('Message not found');
    }

    const targetLangLower = targetLanguage.toLowerCase();
    
    // Check JSONB cache
    const cache = (message.translatedCache as Record<string, string>) || {};
    if (cache[targetLangLower]) {
      logger.info(`🌐 Translation cache hit for message ${messageId} in lang ${targetLanguage}`);
      return cache[targetLangLower];
    }

    logger.info(`🌐 Translation cache miss for message ${messageId} in lang ${targetLanguage}. Translating...`);

    // Perform translation API call
    const translatedText = await this.callTranslationApi(message.content, targetLangLower);

    // Save back to JSONB column cache
    const updatedCache = { ...cache, [targetLangLower]: translatedText };
    await prisma.message.update({
      where: { id: messageId },
      data: {
        translatedCache: updatedCache,
      },
    });

    return translatedText;
  }

  /**
   * Internal wrapper for translation providers
   */
  private static async callTranslationApi(text: string, targetLang: string): Promise<string> {
    // 1. DeepL API
    if (env.DEEPL_API_KEY && env.DEEPL_API_KEY !== 'mock-deepl-key') {
      try {
        const response = await axios.post(
          'https://api-free.deepl.com/v2/translate',
          {
            text: [text],
            target_lang: targetLang.toUpperCase(),
          },
          {
            headers: {
              Authorization: `DeepL-Auth-Key ${env.DEEPL_API_KEY}`,
              'Content-Type': 'application/json',
            },
          }
        );
        return response.data.translations[0].text;
      } catch (err: any) {
        logger.error(`❌ DeepL translation failed: ${err.message}`);
      }
    }

    // 2. LibreTranslate (self-hosted)
    if (env.LIBRETRANSLATE_URL && env.LIBRETRANSLATE_URL !== 'http://localhost:5000') {
      try {
        const response = await axios.post(
          `${env.LIBRETRANSLATE_URL}/translate`,
          {
            q: text,
            target: targetLang,
            source: 'auto',
          },
          {
            headers: { 'Content-Type': 'application/json' },
          }
        );
        return response.data.translatedText;
      } catch (err: any) {
        logger.error(`❌ LibreTranslate failed: ${err.message}`);
      }
    }

    // 3. Fallback mock translation for development
    logger.warn('⚠️ No translation API credentials configured. Using mock fallback translation.');
    return `[Mock Translation to ${targetLang.toUpperCase()}]: ${text}`;
  }
}
