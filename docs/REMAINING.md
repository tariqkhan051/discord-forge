# Remaining tasks and limitations

## Blocked on your credentials (live dry-run gate)

No `.env` with `DISCORD_TOKEN` / `GUILD_ID` is present in this workspace, so the live server at `discord.gg/WKZ2A3qRS` has **not** been inspected or modified.

When ready:

```bash
cp .env.example .env
# fill DISCORD_TOKEN, GUILD_ID, CLIENT_ID
npm run inspect
npm run dry-run
```

Then share `reports/dry-run.md` (or say **approve apply** in chat). **Do not run `npm run apply` until you explicitly approve.**

Offline alias check already verified: `💬・general-chat` maps to blueprint `community-chat` (`npm run smoke`).

## Not automated yet (by design)

- Facebook / Instagram auto-posting (profile URLs are set; auto-post not implemented)
- Paid / VIP subscription integrations
- Deleting or renaming existing Discord resources
- Detecting third-party bots automatically — use `docs/SETUP.md` duplicate-bot checklist after inspect

## Optional follow-ups

- Resolve `YOUTUBE_CHANNEL_ID` with `npm run resolve-youtube`
- Pin rules/welcome from `docs/RULES.md` and `docs/WELCOME.md`
- Adjust blueprint aliases if inspect shows game channels under unexpected names
- Lower bot permissions after structure apply if you only need runtime features
