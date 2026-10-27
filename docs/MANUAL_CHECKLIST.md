# Verification checklist

Use after dry-run / apply / bot start.

## Credentials

- [ ] `.env` exists and is **not** committed
- [ ] Bot invited with `bot` + `applications.commands`
- [ ] Server Members Intent enabled
- [ ] Bot role above self-assignable and New Member roles

## Structure (after approved apply)

- [ ] `💬・general-chat` (or equivalent) still present — no duplicate community chat
- [ ] Categories exist: WELCOME AND INFO, GAMING LOUNGE, MOBILE LEGENDS, CS2, MARVEL RIVALS, CONTENT CREATOR HUB, VOICE, STAFF
- [ ] Staff channels (`staff-chat`, `mod-logs`, `admin`) are **not** visible to @everyone
- [ ] Announcements / rules / youtube-updates are view-only for members
- [ ] Voice limits: Lounge 1/2 = 5, Ranked Squad = 5, Chill and Talk = 10

## Roles

- [ ] Staff: Admin, Moderator, Community Manager
- [ ] Community: Content Creator, VIP, Active Gamer, Member, New Member
- [ ] Self roles: MLBB Player, CS2 Player, Marvel Rivals, Ranked Player, Casual Gamer, Squad Finder, YouTube Subscriber
- [ ] @everyone has no Administrator / Manage Guild / Mention Everyone abuse path beyond Discord defaults you intend

## Bot runtime

- [ ] `npm run register-commands` succeeded
- [ ] `/ping`, `/rules`, `/roles`, `/squad`, `/suggest`, `/server-info` work
- [ ] Join test account → welcome posts (if `ENABLE_WELCOME=true`) and New Member role assigned
- [ ] `/roles` toggles game roles
- [ ] YouTube: `YOUTUBE_CHANNEL_ID` set; after a new upload, `#youtube-updates` gets an embed (or feature disabled if another bot owns it)

## Content promotion

- [ ] YouTube URL correct: https://www.youtube.com/@GuardiansGuildX
- [ ] Facebook / Instagram channels exist; links: facebook.com/GuardiansGuildX and instagram.com/guardiansguildx
- [ ] No spammy auto-posts of old videos on first start

## Safety

- [ ] Dry-run reviewed before first apply
- [ ] No channels/roles were deleted
- [ ] Overlapping third-party bot features disabled via `ENABLE_*`
