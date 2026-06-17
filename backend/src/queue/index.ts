import { expireMessageWorker } from './workers/expireMessage.worker';
import { scheduleMessageWorker } from './workers/scheduleMessage.worker';
import { aiSummaryWorker } from './workers/aiSummary.worker';
import { aiSmartReplyWorker } from './workers/aiSmartReply.worker';
import { pollExpireWorker } from './workers/pollExpire.worker';
import { locationExpireWorker } from './workers/locationExpire.worker';
import { logger } from '../utils/logger';

/**
 * Initializes and registers all background job workers
 */
export function initQueueWorkers() {
  logger.info('⚡ Bootstrapping BullMQ Background Workers...');

  expireMessageWorker.on('ready', () => logger.info('⚙️ Worker: expireMessage ready'));
  scheduleMessageWorker.on('ready', () => logger.info('⚙️ Worker: scheduleMessage ready'));
  aiSummaryWorker.on('ready', () => logger.info('⚙️ Worker: aiSummary ready'));
  aiSmartReplyWorker.on('ready', () => logger.info('⚙️ Worker: aiSmartReply ready'));
  pollExpireWorker.on('ready', () => logger.info('⚙️ Worker: pollExpire ready'));
  locationExpireWorker.on('ready', () => logger.info('⚙️ Worker: locationExpire ready'));
}
