import 'dotenv/config';

const token = process.env.TELEGRAM_BOT_TOKEN;
const vercelUrl = process.env.VERCEL_URL || process.env.APP_URL || process.env.DEPLOY_URL;

if (!token) {
  console.error('TELEGRAM_BOT_TOKEN is not set in your environment');
  process.exit(1);
}

if (!vercelUrl) {
  console.error('VERCEL_URL or APP_URL is not set in your environment');
  process.exit(1);
}

const webhook = `${vercelUrl.replace(/\/$/, '')}/api/telegram-webhook`;

console.log(`Registering webhook ${webhook} for bot`);

const res = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
  method: 'POST',
  body: new URLSearchParams({ url: webhook }),
});

const data = await res.json();
console.log('Telegram response:', data);
if (!data.ok) process.exit(1);
