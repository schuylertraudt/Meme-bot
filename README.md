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

## 2b. Cross-server relay command (`!say`)

Lets you type `!say <target> <message>` in one server and have the bot post that exact message into a channel in a different server. Restricted to specific Discord user IDs so randoms can't use your bot to broadcast into servers you moderate.

**Setup:**

1. The bot must be a member of both servers — invite it to server B the same way you invited it to server A (OAuth2 → URL Generator link, pick server B this time).
2. Get your own Discord user ID: in Discord, **User Settings → Advanced → Developer Mode** (toggle on), then right-click your own name/avatar → **Copy User ID**.
3. Get the target channel ID in server B: right-click the channel → **Copy Channel ID**.
4. In `.env`, set `ALLOWED_USER_IDS` to your user ID (comma-separate multiple IDs if more than one person should be allowed).
5. In `config/relay-targets.json`, give that channel ID a friendly name:
   ```json
   { "serverb": "123456789012345678" }
   ```
   (You can add as many named targets as you want — one per server/channel.)

**Usage:** in any server the bot can see you in, type:
```
!say serverb hey this is a test
```
and it posts "hey this is a test" into the channel named `serverb`. You can also skip the config file and pass a raw channel ID directly: `!say 123456789012345678 hello`. The bot reacts ✅ on success, or replies with an error if something's wrong (unauthorized user, unknown target, missing permissions in the target channel, etc).

Both `.env` and `config/relay-targets.json` changes are picked up live — `.env` needs a restart (`sudo systemctl restart meme-bot`), but `relay-targets.json` hot-reloads like `triggers.json`.

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

`deploy/install.sh` automates this: it installs npm dependencies, generates a systemd unit for the current user/path, and starts + enables the service.

```bash
sudo bash deploy/install.sh
```

Check status / logs:

```bash
sudo systemctl status meme-bot
journalctl -u meme-bot -f
```

The bot will now auto-start on boot and restart if it crashes. To pick up new trigger words, just edit `config/triggers.json` on the server — no restart required. To pick up code changes: `git pull && sudo systemctl restart meme-bot`.

A static example unit is also kept at `deploy/meme-bot.service` for reference if you'd rather set it up by hand.
