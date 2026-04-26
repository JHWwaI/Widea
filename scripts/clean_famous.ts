import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// 누구나 아는 유명 기업 목록
const FAMOUS = new Set([
  "Stripe", "Wise", "Square", "Revolut", "N26", "Robinhood", "Plaid", "Ripple",
  "PayPal", "Block Inc", "Klarna", "Affirm", "Shopify", "Coursera", "Udemy",
  "Duolingo", "OpenAI", "Anthropic", "Datadog", "Figma", "DoorDash", "Uber",
  "Lyft", "Grubhub", "Zillow", "Airbnb", "Booking.com", "Expedia", "Slack",
  "Notion", "Asana", "Monday.com", "Zapier", "Atlassian", "Adobe", "Salesforce",
  "Google", "Apple", "Amazon", "Microsoft", "Meta", "Facebook", "Instagram",
  "TikTok", "Snapchat", "Pinterest", "Reddit", "Twitter", "LinkedIn",
  "Netflix", "Spotify", "Tesla", "SpaceX", "GitHub", "Docker", "Twilio",
  "HubSpot", "Zendesk", "Intercom", "Dropbox", "Zoom", "Canva",
  "Robinhood", "Coinbase", "Binance", "Chime", "SoFi", "Nubank",
  "Grab", "Paytm", "Gojek", "Meituan", "Didi", "WeWork",
  "Peloton", "Calm", "Headspace", "Oscar Health", "Teladoc",
  "Instacart", "HelloFresh", "Blue Apron",
  "Etsy", "eBay", "Shopee", "Lazada", "Coupang",
  "AWS", "Google Cloud", "Azure", "Heroku", "Vercel", "Netlify",
  "Stripe Billing", "GitHub Copilot", "VS Code", "JetBrains",
  "Firebase", "Auth0", "Okta", "CrowdStrike", "Cloudflare",
  "Twilio Segment", "SendGrid", "Mailchimp",
  "Uber Eats", "Amazon Fresh", "Amazon Pharmacy",
  "Walmart+", "Target+", "CVS Health", "Walgreens",
  "Vim", "Emacs", "VSCodium", "Arduino", "Raspberry Pi",
  "Sublime Text", "Stack Overflow", "Quora", "Medium",
  "Substack", "Ghost", "Substack Pro", "Ghost Pro",
  "SEMrush", "Moz", "Airtable", "Retool", "Supabase", "Calendly",
  "PipeDrive", "HubSpot CRM", "ServiceTitan", "Rippling",
]);

async function main() {
  const all = await prisma.globalCaseMeta.findMany();
  console.log(`전체: ${all.length}건`);

  const toDelete = all.filter(c => FAMOUS.has(c.companyName));
  console.log(`유명 기업: ${toDelete.length}건 삭제 대상`);

  if (toDelete.length > 0) {
    await prisma.globalCaseMeta.deleteMany({
      where: { id: { in: toDelete.map(c => c.id) } },
    });
  }

  const remaining = await prisma.globalCaseMeta.count();
  console.log(`남은 사례: ${remaining}건`);

  await prisma.$disconnect();
}

main().catch((err) => { console.error(err); process.exit(1); });
