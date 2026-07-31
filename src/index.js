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

const RELAY_TARGETS_PATH = path.join(__dirname, '..', 'config', 'relay-targets.json');

function loadRelayTargets() {
  try {
    const raw = fs.readFileSync(RELAY_TARGETS_PATH, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    return {};
  }
}

let relayTargets = loadRelayTargets();

fs.watchFile(RELAY_TARGETS_PATH, { interval: 2000 }, () => {
  relayTargets = loadRelayTargets();
  console.log('Reloaded relay-targets.json');
});

const ALLOWED_USERS_PATH = path.join(__dirname, '..', 'config', 'allowed-users.json');

function loadAllowedUsers() {
  try {
    const raw = fs.readFileSync(ALLOWED_USERS_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch (err) {
    return [];
  }
}

let allowedUsers = loadAllowedUsers();

fs.watchFile(ALLOWED_USERS_PATH, { interval: 2000 }, () => {
  allowedUsers = loadAllowedUsers();
  console.log('Reloaded allowed-users.json');
});

const SAY_PREFIX = '!say';

async function handleSayCommand(message, client) {
  if (!allowedUsers.includes(message.author.id)) {
    await message.reply("You don't have permission to use this command.").catch(() => {});
    return;
  }

  const rest = message.content.slice(SAY_PREFIX.length).trim();
  const spaceIdx = rest.indexOf(' ');
  if (!rest || spaceIdx === -1) {
    await message.reply('Usage: `!say <target> <message>` (target = name from relay-targets.json or a raw channel ID)').catch(() => {});
    return;
  }

  const targetToken = rest.slice(0, spaceIdx);
  const text = rest.slice(spaceIdx + 1).trim();
  const channelId = relayTargets[targetToken] || (/^\d+$/.test(targetToken) ? targetToken : null);

  if (!channelId) {
    await message.reply(`Unknown target "${targetToken}". Add it to config/relay-targets.json or pass a raw channel ID.`).catch(() => {});
    return;
  }

  try {
    const targetChannel = await client.channels.fetch(channelId);
    if (!targetChannel || !targetChannel.isTextBased()) {
      await message.reply('That target is not a valid text channel, or the bot is not in that server.').catch(() => {});
      return;
    }
    await targetChannel.send(text);
    await message.react('✅').catch(() => {});
  } catch (err) {
    console.error('Failed to relay message:', err.message);
    await message.reply(`Failed to send: ${err.message}`).catch(() => {});
  }
}

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

  if (message.content.startsWith(SAY_PREFIX)) {
    await handleSayCommand(message, client);
    return;
  }

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
