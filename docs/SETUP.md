# Setup guide

## 1. Create a Discord application

1. Open [Discord Developer Portal](https://discord.com/developers/applications) → **New Application**.
2. Open **Bot** → **Add Bot** → copy the token → `DISCORD_TOKEN` in `.env`.
3. For the **runtime bot** (`npm start` / `npm run dev`), enable **Privileged Gateway Intents**:
   - Server Members Intent (welcome + auto-role)
   - Message Content Intent (mod-log deleted message content; optional if `ENABLE_MOD_LOG=false`)
   
   `inspect` / `dry-run` / `apply` only need the Guilds intent and work without privileged intents.
4. Copy **Application ID** → `CLIENT_ID`.
5. Copy your server ID (Discord → Settings → Advanced → Developer Mode → right-click server → Copy Server ID) → `GUILD_ID`.

## 2. Invite the bot (least privilege)

Suggested permission integer for setup + runtime:

`permissions=268823638` (Manage Roles, Manage Channels, Kick, Moderate Members, View Audit Log, Send Messages, Manage Messages, Embed Links, Attach Files, Add Reactions, Read Message History, Connect, Speak)

Invite URL template:

```
https://discord.com/api/oauth2/authorize?client_id=CLIENT_ID&permissions=268823638&scope=bot%20applications.commands
```

Replace `CLIENT_ID`. Place the bot role **above** roles it must assign (New Member, self-roles).

During day-to-day runtime you can later remove Manage Channels / Manage Roles from the bot if you only use the CLI occasionally with elevated perms.

## 3. Environment

```bash
cp .env.example .env
```

| Variable | Required | Purpose |
| --- | --- | --- |
| `DISCORD_TOKEN` | yes | Bot token |
| `GUILD_ID` | yes | Target server |
| `CLIENT_ID` | for slash cmds | Application ID |
| `YOUTUBE_CHANNEL_ID` | for YT posts | UC… id |
| `YOUTUBE_CHANNEL_URL` | default set | https://www.youtube.com/@GuardiansGuildX |
| `FACEBOOK_URL` / `INSTAGRAM_URL` | defaults set | Guardians Guild Facebook & Instagram |
| `ENABLE_WELCOME` / `ENABLE_YOUTUBE` / `ENABLE_MOD_LOG` / `ENABLE_AUTO_ROLE` | no | Feature toggles |

## 4. Install and inspect

```bash
npm install
npm run inspect
npm run dry-run
```

Open `reports/dry-run.md`. Confirm:

- Existing channels (especially `💬・general-chat`) show as **skip** / **alias-match**
- Only truly missing items show as **create**
- No deletes are listed (the tool cannot delete)

**Do not run apply until you approve the dry-run.**

## 5. Apply (only after approval)

```bash
npm run apply
```

Re-running apply is safe — existing items are skipped.

## 6. Runtime features

```bash
npm run resolve-youtube
# paste YOUTUBE_CHANNEL_ID into .env

npm run register-commands
npm run dev
```

If another bot already handles welcome or YouTube notifications, set `ENABLE_WELCOME=false` and/or `ENABLE_YOUTUBE=false`.

## 7. Duplicate-bot checklist

Before enabling features, list bots already in the server (from `npm run inspect` role/member list or Discord UI):

| Need | Prefer existing if present | Our toggle |
| --- | --- | --- |
| Welcome | Carl-bot, Dyno, MEE6 | `ENABLE_WELCOME` |
| Auto-role | Carl-bot reaction roles | `ENABLE_AUTO_ROLE` |
| YouTube | Pingcord, Meridian, YAGPDB | `ENABLE_YOUTUBE` |
| Mod logs | Carl-bot / Dyno | `ENABLE_MOD_LOG` |

## Troubleshooting

- **Missing Access / Hierarchy**: move bot role higher; ensure Manage Roles.
- **Slash commands missing**: wait a few minutes; re-run `npm run register-commands`.
- **YouTube silent**: seed requires `YOUTUBE_CHANNEL_ID`; first poll only seeds state (no spam of old video).
