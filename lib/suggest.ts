import { CalendarEvent } from "./sheet";

export interface PostSuggestion {
  caption: string;
  hashtags: string[];
  visualIdea: string;
  cta: string;
}

const BASE_HASHTAGS = ["#TemiTea", "#SikkimTea", "#TeaFromTheHills"];

// Generates a suggested social-media post for a calendar event.
// Uses the Content Angle as the primary creative seed and pairs it with
// occasion-specific hooks. No external LLM required — fully deterministic so
// the cron job has no extra dependencies or costs.
export function suggestPost(event: CalendarEvent): PostSuggestion {
  const occasion = event.occasion || "this moment";
  const angle = event.contentAngle || "Tea for every season";
  const lowerOcc = occasion.toLowerCase();
  const lowerAngle = angle.toLowerCase();

  const hashtags = new Set(BASE_HASHTAGS);
  const themed = themeHashtags(lowerOcc, lowerAngle);
  themed.forEach(h => hashtags.add(h));

  const caption = buildCaption(occasion, angle, event.type);
  const visualIdea = buildVisual(occasion, angle);
  const cta = buildCta(lowerOcc, lowerAngle);

  return {
    caption,
    hashtags: Array.from(hashtags),
    visualIdea,
    cta,
  };
}

function buildCaption(occasion: string, angle: string, type: string): string {
  const region = type && /sikkim/i.test(type) ? "from the Sikkim hills" : "from our estate";
  const hook = pickHook(occasion);
  return [
    `${hook} — this ${occasion}, brew a moment that matters.`,
    "",
    `${capitalize(angle)}. A cup poured ${region}, carrying the calm of high-altitude leaves and the craft of generations.`,
    "",
    "Whether you sip it slow at sunrise or share it across a crowded table, let today's cup be the pause everything else builds around.",
  ].join("\n");
}

function pickHook(occasion: string): string {
  const o = occasion.toLowerCase();
  if (o.includes("new year")) return "A fresh year, a fresh leaf";
  if (o.includes("republic") || o.includes("independence")) return "Rooted in India, raised in the hills";
  if (o.includes("valentine")) return "Some love stories begin over tea";
  if (o.includes("women")) return "To the hands that pluck every leaf";
  if (o.includes("holi")) return "Colour in the air, warmth in the cup";
  if (o.includes("environment")) return "What's in your cup begins with the soil";
  if (o.includes("yoga")) return "Breathe in. Sip slow. Begin again";
  if (o.includes("tea day") || o.includes("first flush")) return "This one's for the leaf";
  if (o.includes("christmas") || o.includes("diwali") || o.includes("gifting")) return "Wrap warmth, gift a ritual";
  if (o.includes("teacher")) return "Some lessons are best served warm";
  if (o.includes("monsoon")) return "Rain on the estate. Steam off the cup";
  if (o.includes("buddha") || o.includes("guru")) return "A quiet cup, a quieter mind";
  if (o.includes("science")) return "Behind every sip, a quiet science";
  if (o.includes("labour")) return "Every leaf knows a pair of hands";
  if (o.includes("tourism")) return "Come for the view, stay for the brew";
  if (o.includes("makar") || o.includes("pongal") || o.includes("baisakhi") || o.includes("sankranti")) return "Harvest in the air, warmth in the cup";
  if (o.includes("raksha bandhan") || o.includes("bhai dooj")) return "Tied by tradition, brewed together";
  return `Today calls for tea`;
}

function themeHashtags(lowerOcc: string, lowerAngle: string): string[] {
  const tags: string[] = [];
  if (lowerOcc.includes("new year")) tags.push("#NewYear2026", "#NewBeginnings");
  if (lowerOcc.includes("valentine")) tags.push("#ValentinesDay", "#LoveBrewed");
  if (lowerOcc.includes("women")) tags.push("#WomensDay", "#WomenInTea");
  if (lowerOcc.includes("holi")) tags.push("#Holi", "#FestivalOfColours");
  if (lowerOcc.includes("environment")) tags.push("#EnvironmentDay", "#OrganicTea");
  if (lowerOcc.includes("yoga")) tags.push("#YogaDay", "#WellnessRitual");
  if (lowerOcc.includes("tea day")) tags.push("#InternationalTeaDay", "#TeaLovers");
  if (lowerOcc.includes("independence")) tags.push("#IndependenceDay", "#ProudlyIndian");
  if (lowerOcc.includes("republic")) tags.push("#RepublicDay", "#ProudlyIndian");
  if (lowerOcc.includes("diwali")) tags.push("#Diwali", "#FestiveGifting");
  if (lowerOcc.includes("christmas")) tags.push("#Christmas", "#PremiumGifting");
  if (lowerOcc.includes("teacher")) tags.push("#TeachersDay");
  if (lowerOcc.includes("first flush")) tags.push("#FirstFlush", "#PremiumTea");
  if (lowerOcc.includes("monsoon")) tags.push("#Monsoon", "#RainyDayTea");
  if (lowerAngle.includes("green tea")) tags.push("#GreenTea");
  if (lowerAngle.includes("gifting")) tags.push("#GiftingSeason");
  if (lowerAngle.includes("wellness") || lowerAngle.includes("antioxidant")) tags.push("#Wellness");
  if (lowerAngle.includes("estate") || lowerAngle.includes("origin")) tags.push("#EstateGrown");
  return tags;
}

function buildVisual(occasion: string, angle: string): string {
  const o = occasion.toLowerCase();
  if (o.includes("monsoon") || angle.toLowerCase().includes("rain"))
    return "Close-up of steam rising from a cup against blurred rain-soaked estate foliage.";
  if (o.includes("first flush"))
    return "Hands holding freshly plucked tender shoots, soft morning light, shallow depth-of-field.";
  if (o.includes("women"))
    return "Portrait reel of women pluckers walking the rows at sunrise, on-camera audio of birds + footsteps.";
  if (o.includes("diwali") || o.includes("christmas") || angle.toLowerCase().includes("gifting"))
    return "Top-down flatlay of the gift caddy, dried leaves, brass cup, warm fairy-light bokeh.";
  if (o.includes("yoga"))
    return "Slow reel: mat, mountains, warm cup placed beside the practitioner — single continuous shot.";
  if (o.includes("independence") || o.includes("republic"))
    return "Wide shot of the estate at golden hour with a simple tricolour cue (ribbon, cup band) — understated.";
  return "Hero shot of a brewed cup with the Temi estate ridgeline softly out of focus behind it.";
}

function buildCta(occasion: string, angle: string): string {
  if (angle.includes("gifting") || occasion.includes("diwali") || occasion.includes("christmas") || occasion.includes("raksha"))
    return "Link in bio — order the festive caddy before the rush.";
  if (occasion.includes("tea day") || occasion.includes("first flush"))
    return "Tap the link in bio to taste the season's first pluck.";
  if (occasion.includes("women") || occasion.includes("labour"))
    return "Read the full story of our pluckers — link in bio.";
  return "Order your tin from the link in bio.";
}

function capitalize(s: string): string {
  return s.length ? s[0].toUpperCase() + s.slice(1) : s;
}
