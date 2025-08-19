"use server"



console.log('🔑 Loaded ENV vars:');
console.log({
  CLIENT_ID: process.env.CLIENT_ID,
  CLIENT_SECRET: process.env.CLIENT_SECRET,
  REFRESH_TOKEN: process.env.REFRESH_TOKEN 
});

const { google } = require('googleapis');

// Basic sanity check
if (!process.env.CLIENT_ID || !process.env.CLIENT_SECRET || !process.env.REFRESH_TOKEN) {
  console.error('❌ Missing Gmail API credentials in .env!');
  process.exit(1);
}

const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REFRESH_TOKEN = process.env.REFRESH_TOKEN;

console.log('⚡ Setting up Gmail API auth...');
const oAuth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  'http://localhost'
);

oAuth2Client.setCredentials({ refresh_token: REFRESH_TOKEN });
const gmail = google.gmail({ version: 'v1', auth: oAuth2Client });

async function fetchUnreadEmails() {
  console.log('📥 Polling for unread emails...');
  const res = await gmail.users.messages.list({
    userId: 'me',
    q: 'is:unread',
    maxResults: 10,
  });

  const messages = res.data.messages;
  const total = messages ? messages.length : 0;
  console.log(`🔎 Found ${total} unread email(s).`);
  if (!messages || total === 0) {
    console.log('No unread emails found.');
    return;
  }

  for (const msg of messages) {
    const full = await gmail.users.messages.get({ userId: 'me', id: msg.id });
    const headers = full.data.payload?.headers || [];
    const from = headers.find(h => h.name === "From")?.value || "";
    const subject = headers.find(h => h.name === "Subject")?.value || "";

    console.log(`----------------------------------------`);
    console.log(`📧 From:    ${from}`);
    console.log(`✉️  Subject: ${subject}`);
    console.log(`🆔 Message ID: ${msg.id}`);
  }

  console.log('✅ Done polling.');
}

fetchUnreadEmails().catch((err) => {
  console.error('❌ Error polling Gmail:', err.message);
  process.exit(1);
});
