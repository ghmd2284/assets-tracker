export interface Env {
  ENVIRONMENT: string;
  MINI_APP_URL: string;
  TELEGRAM_BOT_TOKEN: string;
  TELEGRAM_BOT_SECRET_TOKEN?: string;
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  // Multi-Chain Provider API Keys
  ALCHEMY_API_KEY?: string;
  HELIUS_API_KEY?: string;
  TONAPI_KEY?: string;
  // Multi-Chain Webhook Secrets
  ALCHEMY_WEBHOOK_SIGNING_KEY?: string;
  HELIUS_WEBHOOK_SECRET?: string;
  TONAPI_SECRET?: string;
  ADMIN_TELEGRAM_IDS?: string;
  PRICE_CACHE?: KVNamespace;
}

export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
}

export interface TelegramAuthContext {
  user: TelegramUser;
  authDate: number;
}
