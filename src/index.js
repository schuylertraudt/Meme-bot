require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Client, GatewayIntentBits, Partials } = require('discord.js');

const TOKEN = process.env.DISCORD_TOKEN;
if (!TOKEN) {
  console.error('Missing DISCORD_TOKEN in environment (.env file).');
  process.exit(1);
}

const TRIGGERS_PATH = path.join(__dirname, '..', 'config', 'triggers.json');

function loadTriggers() {
  const raw = fs.readFileSync(TRIGGERS_PATH, 'utf8');
  const parsed = JSON.parse(raw);
  const map = new Map();
  for (const [word, value] of Object.entries(parsed)) {
    const gifs = Array.isArray(value) ? value : [value];
    map.set(word.toLowerCase(), gifs);
  }
  return map;
}

let triggers = loadTriggers();

// Reload triggers.json without restarting the bot when it changes.
fs.watchFile(TRIGGERS_PATH, { interval: 2000 }, () => {
  try {
    triggers = loadTriggers();
    console.log('Reloaded triggers.json');
  } catch (err) {
    console.error('Failed to reload triggers.json:', err.message);
  }
});

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Channel],
});

client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}`);
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  const words = message.content.toLowerCase().match(/[a-z0-9']+/g);
  if (!words) return;

  const matched = new Set();
  for (const word of words) {
    if (triggers.has(word)) matched.add(word);
  }

  for (const word of matched) {
    const gifs = triggers.get(word);
    const gif = gifs[Math.floor(Math.random() * gifs.length)];
    try {
      await message.channel.send(gif);
    } catch (err) {
      console.error(`Failed to send gif for trigger "${word}":`, err.message);
    }
  }
});

client.login(TOKEN);
