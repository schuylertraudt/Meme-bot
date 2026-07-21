# Meme Bot

A simple Discord bot that posts a specific GIF whenever a trigger word is typed in chat (e.g. typing `DSA` anywhere in a message posts your chosen DSA gif).

## How it works

- `config/triggers.json` maps trigger words to one or more GIF URLs.
- The bot scans every message (case-insensitive, whole-word match) for trigger words and replies with the matching GIF.
- If a word has multiple GIFs, one is picked at random.
- `config/triggers.json` is hot-reloaded — edit it and save, no restart needed.

## 1. Create the Discord bot

1. Go to the [Discord Developer Portal](https://discord.com/developers/applications) and click **New Application**.
2. Under **Bot**, click **Add Bot**.
3. Under **Privileged Gateway Intents**, enable **Message Content Intent** (required to read message text).
4. Copy the bot **Token** (Bot page → Reset Token / Copy) — you'll need it below.
5. Under **OAuth2 → URL Generator**, select scope `bot`, and permissions `Send Messages` + `Read Message History`. Open the generated URL to invite the bot to your server.

## 2. Configure trigger words

Edit `config/triggers.json`:

```json
{
  "dsa": ["https://media.giphy.com/media/XXXXXXXX/giphy.gif"],
  "another_word": ["https://example.com/one.gif", "https://example.com/two.gif"]
}
```

- Keys are matched case-insensitively as whole words (e.g. `dsa` matches "dsa", "DSA", but not "dsaster").
- Any direct image/gif URL works (Giphy, Tenor direct link, Discord CDN link, etc.) — Discord will auto-embed it.

## 3. Deploy on your Ubuntu server

### Install Node.js (if not already installed)

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### Get the code and install dependencies

```bash
git clone <your-repo-url> ~/Meme-bot
cd ~/Meme-bot
npm install
cp .env.example .env
nano .env   # paste your bot token as DISCORD_TOKEN=...
```

### Run it manually (quick test)

```bash
npm start
```

You should see `Logged in as YourBot#1234` in the console. Type your trigger word in a server the bot is in to test it.

### Run it permanently with systemd (recommended)

1. Edit `deploy/meme-bot.service` and replace `ubuntu` with your actual Linux username / home path if different.
2. Install and start the service:

```bash
sudo cp deploy/meme-bot.service /etc/systemd/system/meme-bot.service
sudo systemctl daemon-reload
sudo systemctl enable meme-bot
sudo systemctl start meme-bot
```

3. Check status / logs:

```bash
sudo systemctl status meme-bot
journalctl -u meme-bot -f
```

The bot will now auto-start on boot and restart if it crashes. To pick up new trigger words, just edit `config/triggers.json` on the server — no restart required. To pick up code changes, `git pull` then `sudo systemctl restart meme-bot`.
