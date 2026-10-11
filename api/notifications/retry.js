import { depsFromEnv } from '../../lib/enquiry-handler.js';
import { createRetryHandler } from '../../lib/notification-retry-handler.js';

let cached;
const getDeps = () => (cached ??= depsFromEnv());

export default createRetryHandler(getDeps);
