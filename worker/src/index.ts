import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { Env } from './types';
import { authRoutes } from './routes/auth';
import { walletRoutes } from './routes/wallets';
import { botRoutes } from './routes/bot';

const app = new Hono<{ Bindings: Env }>();

// Enable CORS for Telegram Mini App
app.use(
  '*',
  cors({
    origin: '*',
    allowHeaders: ['Content-Type', 'X-Telegram-Init-Data', 'Authorization'],
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

// Export for Cloudflare Worker & Cron Trigger
export default {
  fetch: app.fetch,
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    console.log(`[Cron Trigger] Executing scheduled daily task at ${new Date().toISOString()}`);
    // Phase 5: Snapshot portfolio balances
  },
};
