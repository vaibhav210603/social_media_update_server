import type { VercelRequest, VercelResponse } from "@vercel/node";
import { fetchCalendar, eventsOnDate } from "../lib/sheet";
import { loadEmailConfig, sendReminder } from "../lib/email";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Vercel automatically sets the Authorization header `Bearer <CRON_SECRET>`
  // for scheduled invocations when CRON_SECRET is configured. For all other
  // (manual) invocations we require ?token=<CRON_SECRET>.
  const expected = process.env.CRON_SECRET;
  if (expected) {
    const authHeader = req.headers.authorization || "";
    const queryToken = typeof req.query.token === "string" ? req.query.token : "";
    const ok = authHeader === `Bearer ${expected}` || queryToken === expected;
    if (!ok) {
      return res.status(401).json({ error: "Unauthorized" });
    }
  }

  try {
    // Allow ?date=YYYY-MM-DD for ad-hoc testing; otherwise look ahead one day.
    const target = parseTargetDate(req.query.date);

    const sheetId = process.env.SHEET_ID || undefined;
    const events = await fetchCalendar(sheetId);
    const tomorrow = eventsOnDate(events, target);

    // Skip the email when there's nothing to post and the operator hasn't asked for empty digests.
    const sendEmpty = process.env.SEND_EMPTY === "1" || req.query.empty === "1";
    if (tomorrow.length === 0 && !sendEmpty) {
      return res.status(200).json({
        ok: true,
        targetDate: target.toISOString().slice(0, 10),
        events: 0,
        skipped: "no events for target date; set SEND_EMPTY=1 to email anyway",
      });
    }

    const cfg = loadEmailConfig();
    const result = await sendReminder(cfg, target, tomorrow);

    return res.status(200).json({
      ok: true,
      targetDate: target.toISOString().slice(0, 10),
      events: tomorrow.length,
      occasions: tomorrow.map(e => e.occasion),
      messageId: result.messageId,
    });
  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ ok: false, error: err?.message || String(err) });
  }
}

function parseTargetDate(q: VercelRequest["query"]["date"]): Date {
  if (typeof q === "string" && /^\d{4}-\d{2}-\d{2}$/.test(q)) {
    const [y, m, d] = q.split("-").map(Number);
    return new Date(Date.UTC(y, m - 1, d));
  }
  // Default: 1 day ahead of the current UTC date.
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
}
