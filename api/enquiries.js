import { createHandler, depsFromEnv } from '../lib/enquiry-handler.js';

let cached;
const getDeps = () => (cached ??= depsFromEnv());

export default createHandler(getDeps);
