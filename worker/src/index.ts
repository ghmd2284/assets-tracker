import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { Env } from './types';
import { authRoutes } from './routes/auth';
import { walletRoutes } from './routes/wallets';
import { botRoutes } from './routes/bot';
import { webhookRoutes } from './routes/webhooks';
import { recordDailyPortfolioSnapshots } from './lib/cronSnapshot';

const app = new Hono<{ Bindings: Env }>();

// Enable CORS for Telegram Mini App
app.use(
  '*',
  cors({
    origin: '*',
    allowHeaders: ['Content-Type', 'X-Telegram-Init-Data', 'Authorization', 'x-alchemy-signature', 'X-Tonapi-Secret'],
    allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  })
);

// Health check endpoint
app.get('/health', (c) => {
  return c.json({
    status: 'ok',
    environment: c.env.ENVIRONMENT || 'development',
    timestamp: new Date().toISOString(),
  });
});

// Mount Routes
app.route('/api', authRoutes);
app.route('/api/wallets', walletRoutes);
app.route('/bot', botRoutes);
app.route('/webhooks', webhookRoutes);

// Export for Cloudflare Worker & Cron Trigger
export default {
  fetch: app.fetch,
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    console.log(`[Cron Trigger] Executing scheduled daily task at ${new Date().toISOString()}`);
    ctx.waitUntil(recordDailyPortfolioSnapshots(env));
  },
};
