// Trigger the reminder pipeline from your laptop without deploying.
// Usage:
//   npx ts-node scripts/run-locally.ts            # sends for tomorrow (UTC)
//   npx ts-node scripts/run-locally.ts 2026-01-13 # sends for the given target
// Requires .env in the project root.
import * as fs from "fs";
import * as path from "path";
import { fetchCalendar, eventsOnDate } from "../lib/sheet";
import { loadEmailConfig, sendReminder } from "../lib/email";

loadEnvFile();

async function main() {
  const arg = process.argv[2];
  const target = arg && /^\d{4}-\d{2}-\d{2}$/.test(arg)
    ? toUtcDate(arg)
    : oneDayAhead();

  console.log(`Target date: ${target.toISOString().slice(0, 10)}`);
  const events = await fetchCalendar(process.env.SHEET_ID || undefined);
  console.log(`Fetched ${events.length} calendar rows.`);
  const tomorrow = eventsOnDate(events, target);
  console.log(`Matching events: ${tomorrow.length}`);
  if (tomorrow.length === 0 && process.env.SEND_EMPTY !== "1") {
    console.log("No matching events. Set SEND_EMPTY=1 to send an empty digest anyway.");
    return;
  }
  const cfg = loadEmailConfig();
  const result = await sendReminder(cfg, target, tomorrow);
  console.log(`Email sent. messageId=${result.messageId}`);
}

function oneDayAhead(): Date {
  const n = new Date();
  return new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate() + 1));
}

function toUtcDate(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

// Tiny .env loader so we don't add dotenv as a dependency.
function loadEnvFile() {
  const p = path.join(process.cwd(), ".env");
  if (!fs.existsSync(p)) return;
  const lines = fs.readFileSync(p, "utf8").split(/\r?\n/);
  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = val;
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
