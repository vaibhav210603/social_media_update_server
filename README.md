# Social Media Calendar Reminder

A TypeScript Vercel cron job that reads the **MRC Agro / Temi Tea social media calendar**
([sheet](https://docs.google.com/spreadsheets/d/1AkQ-vfBzFHeGWorLeM0rwBXwwmmlqbMNTdtmUyLGjVY/edit?usp=sharing))
and emails the team one day before every scheduled occasion, with suggested
caption, hashtags, CTA, and visual idea for the post.

## How it works

1. A Vercel Cron Job hits `GET /api/cron` once per day (configured at `30 3 * * *` UTC = **9:00 AM IST**).
2. The handler downloads the sheet as CSV (`?format=csv` on the public link — no Google API keys needed).
3. It filters rows whose `Date` column resolves to **tomorrow** (UTC). Rows like `Feb (varies)` or `Entire Month` are ignored automatically.
4. For each matching event it generates a suggested post (caption + CTA + visual + hashtags) deterministically from the `Content Angle` column.
5. It sends a single email via SMTP (nodemailer).
6. If nothing matches tomorrow, it skips the email (set `SEND_EMPTY=1` to receive it anyway).

## Project layout

```
api/
  cron.ts            # Vercel serverless function — the cron entry point
lib/
  sheet.ts           # CSV fetch + date parser
  suggest.ts         # Post copy generator
  email.ts           # nodemailer transport + HTML/plaintext templates
scripts/
  run-locally.ts     # Trigger the pipeline from your laptop (uses .env)
vercel.json          # Cron schedule
```

## Local setup

```powershell
npm install
copy .env.example .env
# edit .env and fill in SMTP_PASS
```

Test it for a known date (e.g. New Year):

```powershell
npx ts-node scripts/run-locally.ts 2026-01-01
```

Or for tomorrow:

```powershell
npx ts-node scripts/run-locally.ts
```

## Deploy to Vercel

```powershell
npm i -g vercel
vercel link
vercel env add SMTP_HOST           # smtp.gmail.com
vercel env add SMTP_PORT           # 587
vercel env add SMTP_USER           # vaibhav210603@gmail.com
vercel env add SMTP_PASS           # the 16-char Gmail App Password
vercel env add MAIL_TO             # mrcagrotech@gmail.com
vercel env add MAIL_CC             # ashoks@mrcagro.com,vaibhav@mrcagro.com,jpadworks.artwork@gmail.com
vercel env add CRON_SECRET         # any long random string
vercel deploy --prod
```

Vercel will automatically register the cron defined in `vercel.json`.
On the Hobby plan, cron jobs run on the production deployment once per day — which is exactly what we need.

### Manual trigger after deploy

```
https://<your-app>.vercel.app/api/cron?token=<CRON_SECRET>
https://<your-app>.vercel.app/api/cron?token=<CRON_SECRET>&date=2026-05-21    # test a specific occasion
```

## SMTP notes

The provided credentials use Gmail with an App Password (not the Gmail account password).
If Gmail blocks the send, regenerate the App Password at
<https://myaccount.google.com/apppasswords> and update the `SMTP_PASS` env var.

## Customising

- **Change the time of day** — edit the cron expression in [vercel.json](vercel.json). It's in UTC.
- **Change the lookahead** — `parseTargetDate()` in [api/cron.ts](api/cron.ts) controls "tomorrow". You can pass `?date=YYYY-MM-DD` to back-test any day.
- **Improve copy** — tune the templates in [lib/suggest.ts](lib/suggest.ts). The generator is intentionally template-based so there's no LLM API cost and the cron is reliable; swap in an LLM call there if you want richer copy.
- **Different sheet** — set `SHEET_ID` in env. The sheet must be link-shared (Anyone with the link → Viewer).
