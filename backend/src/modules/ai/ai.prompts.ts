/**
 * Prompt templates for Claude Sonnet AI Features
 */

export const AI_PROMPTS = {
  /**
   * Room conversation summarization prompt
   */
  summarizer: (messagesText: string): string => {
    return `Summarize this group chat conversation in 3-5 bullet points. Focus on decisions, key info, and action items. Be concise.

Conversation Transcript:
${messagesText}

Summary:`;
  },

  /**
   * Smart reply suggestion prompt
   */
  smartReplies: (contextText: string): string => {
    return `Given these recent messages, suggest exactly 3 short natural reply options that the next speaker might want to send. Return ONLY a valid JSON array of strings, with no additional explanation or wrapping.
Example response: ["Got it!", "On my way", "Can you explain that?"]

Recent messages context:
${contextText}

JSON Array:`;
  },

  /**
   * Message tone detection prompt
   */
  toneChecker: (content: string): string => {
    return `Analyze the tone of the following message. If it could come across as rude, passive-aggressive, harsh, toxic, or inappropriate, respond with JSON:
{
  "flagged": true,
  "severity": "warning" | "alert",
  "explanation": "Brief explanation of why the message was flagged and how it might be perceived."
}

If the tone is perfectly fine, professional, or friendly, respond with JSON:
{
  "flagged": false
}

Return ONLY the JSON object. Do not include markdown code block formatting (like \`\`\`json).

Message Content:
"${content}"

JSON Result:`;
  }
};
