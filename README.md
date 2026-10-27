# discord-forge

Guardians Guild Discord setup + community bot.

Creates a modern gaming community structure (MLBB primary; CS2 and Marvel Rivals secondary), with **inspect → dry-run → apply** safety gates. Apply is **create-only** and **idempotent** — it never deletes existing channels or roles, and it preserves names like `💬・general-chat` via aliases.

## Quick start

```bash
npm install
cp .env.example .env
# Fill DISCORD_TOKEN, GUILD_ID, CLIENT_ID
```

### Safety workflow (required)

```bash
npm run inspect    # dump live structure → reports/live-structure.json
npm run dry-run    # show create/skip plan → reports/dry-run.md
# Review the report. Only then:
npm run apply      # create missing roles/categories/channels only
```

### Runtime bot

```bash
npm run register-commands
npm run resolve-youtube   # fills YOUTUBE_CHANNEL_ID hint
npm start                 # or: npm run dev
```

## Docs

- [Setup guide](docs/SETUP.md)
- [Verification checklist](docs/MANUAL_CHECKLIST.md)
- [Server rules](docs/RULES.md)
- [Welcome copy](docs/WELCOME.md)
- [Content promotion](docs/CONTENT_PROMOTION.md)

## Safety rules

- Never hardcode tokens
- Never delete Discord resources
- Do not run `apply` until you have reviewed dry-run output and explicitly approved
- Disable overlapping features if Carl-bot / Dyno / MEE6 / YouTube bots already cover them (`ENABLE_*` flags)

## License

MIT
