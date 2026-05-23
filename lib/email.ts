import nodemailer from "nodemailer";
import { CalendarEvent } from "./sheet";
import { PostSuggestion, suggestPost } from "./suggest";

export interface EmailConfig {
  host: string;
  port: number;
  user: string;
  pass: string;
  to: string;
  cc: string[];
}

export function loadEmailConfig(): EmailConfig {
  const required = ["SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASS", "MAIL_TO"];
  for (const k of required) {
    if (!process.env[k]) throw new Error(`Missing env var: ${k}`);
  }
  return {
    host: process.env.SMTP_HOST!,
    port: parseInt(process.env.SMTP_PORT!, 10),
    user: process.env.SMTP_USER!,
    pass: process.env.SMTP_PASS!,
    to: process.env.MAIL_TO!,
    cc: (process.env.MAIL_CC || "")
      .split(",")
      .map(s => s.trim())
      .filter(Boolean),
  };
}

export async function sendReminder(
  cfg: EmailConfig,
  targetDate: Date,
  events: CalendarEvent[]
): Promise<{ messageId: string }> {
  const transporter = nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.port === 465,
    auth: { user: cfg.user, pass: cfg.pass },
  });

  const suggestions = events.map(e => ({ event: e, post: suggestPost(e) }));
  const subject = buildSubject(targetDate, events);
  const html = renderHtml(targetDate, suggestions);
  const text = renderText(targetDate, suggestions);

  const info = await transporter.sendMail({
    from: `"Social Media Calendar Bot" <${cfg.user}>`,
    to: cfg.to,
    cc: cfg.cc.length ? cfg.cc : undefined,
    subject,
    text,
    html,
  });
  return { messageId: info.messageId };
}

function buildSubject(date: Date, events: CalendarEvent[]): string {
  const datePretty = formatDate(date);
  if (events.length === 0) return `[Social Calendar] No scheduled posts for ${datePretty}`;
  const names = events.map(e => e.occasion).join(", ");
  return `[Social Calendar] Tomorrow (${datePretty}): ${names}`;
}

function renderText(
  date: Date,
  items: { event: CalendarEvent; post: PostSuggestion }[]
): string {
  const lines: string[] = [];
  lines.push(`Social media reminder for ${formatDate(date)} (tomorrow).`);
  lines.push("");
  if (items.length === 0) {
    lines.push("No occasions scheduled for tomorrow.");
    return lines.join("\n");
  }
  for (const { event, post } of items) {
    lines.push("=".repeat(60));
    lines.push(`OCCASION: ${event.occasion}`);
    lines.push(`Type: ${event.type}`);
    lines.push(`Content Angle: ${event.contentAngle}`);
    lines.push("");
    lines.push("--- SUGGESTED CAPTION ---");
    lines.push(post.caption);
    lines.push("");
    lines.push(`CTA: ${post.cta}`);
    lines.push(`Visual idea: ${post.visualIdea}`);
    lines.push(`Hashtags: ${post.hashtags.join(" ")}`);
    lines.push("");
  }
  return lines.join("\n");
}

function renderHtml(
  date: Date,
  items: { event: CalendarEvent; post: PostSuggestion }[]
): string {
  const cards = items
    .map(({ event, post }) => {
      const caption = escapeHtml(post.caption).replace(/\n/g, "<br/>");
      const hashtags = post.hashtags.map(h => escapeHtml(h)).join(" ");
      return `
        <div style="border:1px solid #e6e1d5;border-radius:10px;padding:20px;margin-bottom:18px;background:#fdfcf7;">
          <div style="font-size:12px;letter-spacing:1px;color:#7a6d4f;text-transform:uppercase;">${escapeHtml(event.type || "Post")}</div>
          <h2 style="margin:6px 0 4px 0;color:#2f3a26;font-family:Georgia,serif;">${escapeHtml(event.occasion)}</h2>
          <div style="font-size:13px;color:#6f6a5a;margin-bottom:14px;"><strong>Content angle:</strong> ${escapeHtml(event.contentAngle)}</div>

          <div style="background:#ffffff;border-left:3px solid #5b7a3a;padding:14px 16px;border-radius:4px;">
            <div style="font-size:11px;letter-spacing:1px;color:#5b7a3a;text-transform:uppercase;margin-bottom:8px;">Suggested caption</div>
            <div style="font-size:15px;color:#2c2c2c;line-height:1.5;">${caption}</div>
          </div>

          <div style="margin-top:14px;font-size:13px;color:#3c3c3c;">
            <div style="margin-bottom:6px;"><strong>CTA:</strong> ${escapeHtml(post.cta)}</div>
            <div style="margin-bottom:6px;"><strong>Visual idea:</strong> ${escapeHtml(post.visualIdea)}</div>
            <div style="color:#5b7a3a;"><strong>Hashtags:</strong> ${hashtags}</div>
          </div>
        </div>`;
    })
    .join("");

  const empty = `
    <p style="font-size:15px;color:#3c3c3c;">No scheduled occasions for tomorrow. A great day for a Monday / Wednesday / Friday / Sunday weekly-planner post.</p>`;

  return `<!doctype html>
<html><body style="margin:0;padding:24px;background:#f4f0e6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#2c2c2c;">
  <div style="max-width:640px;margin:0 auto;">
    <div style="text-align:center;padding:8px 0 24px 0;">
      <div style="font-size:11px;letter-spacing:2px;color:#7a6d4f;text-transform:uppercase;">Social Media Calendar</div>
      <div style="font-size:22px;color:#2f3a26;font-family:Georgia,serif;margin-top:4px;">Posts for ${escapeHtml(formatDate(date))}</div>
      <div style="font-size:13px;color:#6f6a5a;margin-top:2px;">Reminder sent one day in advance.</div>
    </div>
    ${items.length === 0 ? empty : cards}
    <div style="text-align:center;font-size:11px;color:#9b8e6f;margin-top:24px;">
      Automated reminder · do not reply
    </div>
  </div>
</body></html>`;
}

function formatDate(d: Date): string {
  return d.toLocaleDateString("en-IN", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
