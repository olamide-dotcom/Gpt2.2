import 'dotenv/config';
import { Telegraf } from 'telegraf';

const token = process.env.TELEGRAM_BOT_TOKEN;
const appUrl = process.env.APP_URL; // e.g. https://your-app.vercel.app

if (!token || !appUrl) {
  console.error('TELEGRAM_BOT_TOKEN and APP_URL must be set in env');
  process.exit(1);
}

const bot = new Telegraf(token);

bot.start((ctx) => {
  return ctx.reply('Welcome — open the app below:', {
    reply_markup: {
      inline_keyboard: [[{ text: 'Open App', web_app: { url: appUrl } }]],
    },
  });
});

bot.command('open', (ctx) => {
  ctx.reply('Open the web app:', {
    reply_markup: {
      inline_keyboard: [[{ text: 'Open App', web_app: { url: appUrl } }]],
    },
  });
});

bot.launch().then(() => console.log('Telegram bot started'));

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
