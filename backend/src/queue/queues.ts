import { Queue } from 'bullmq';
import { queueConnection } from '../config/bull';

// BullMQ Queue registrations
export const expireMessageQueue = new Queue('expire_message', { connection: queueConnection });
export const scheduleMessageQueue = new Queue('send_scheduled', { connection: queueConnection });
export const aiSummaryQueue = new Queue('ai_summary', { connection: queueConnection });
export const aiSmartReplyQueue = new Queue('ai_smart_reply', { connection: queueConnection });
export const pollExpireQueue = new Queue('poll_expire', { connection: queueConnection });
export const locationExpireQueue = new Queue('location_expire', { connection: queueConnection });
