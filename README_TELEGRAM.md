Telegram integration — quick setup

1) Deploy your app to Vercel and note the public HTTPS URL (example: https://my-app.vercel.app).

2) In Vercel project settings -> Environment Variables add:
- TELEGRAM_BOT_TOKEN = <token from BotFather>
- APP_URL = https://my-app.vercel.app

3) Redeploy the project so the new env vars are available to the serverless function.

4) Register the webhook (locally or in CI):

Install dependencies if you haven't:

```bash
npm install
```

Run the webhook registration (replace VERCEL_URL if needed):

```bash
VERCEL_URL=https://my-app.vercel.app TELEGRAM_BOT_TOKEN=<token> npm run set-webhook
```

5) Test in Telegram: open the bot and send `/start` — the bot should reply with an "Open App" button. Tap it on mobile Telegram to open your site inside Telegram's Web App.

Notes:
- If you previously ran a polling bot locally, stop it to avoid conflicts with webhooks.
- Check Vercel function logs under Functions → your deployment → Logs if messages don't arrive.
