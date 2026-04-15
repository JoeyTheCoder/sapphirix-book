import { createApp } from './app.js';
import { getEnv } from './config/env.js';

const env = getEnv();
const app = createApp();

app.listen(env.PORT, () => {
  console.log(`Backend running on http://localhost:${env.PORT}`);
});