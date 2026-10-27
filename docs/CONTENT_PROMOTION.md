# Content promotion setup

## YouTube — Guardians Guild

- Channel URL: https://www.youtube.com/@GuardiansGuildX
- Set `YOUTUBE_CHANNEL_ID` via `npm run resolve-youtube`
- Bot posts to `#youtube-updates` on **new** uploads only (first run seeds state; no flood of old videos)
- Members discuss in `#new-videos`

### Announcement style

- Title of the video
- Short line of context
- Direct watch link
- React CTA (bot adds reactions)

Disable with `ENABLE_YOUTUBE=false` if Pingcord / Meridian / another bot already announces.

## Facebook & Instagram

- Facebook: https://www.facebook.com/GuardiansGuildX
- Instagram: https://www.instagram.com/guardiansguildx/

Channels `#facebook-updates` and `#instagram-updates` are created by the blueprint when missing.

```
FACEBOOK_URL=https://www.facebook.com/GuardiansGuildX
INSTAGRAM_URL=https://www.instagram.com/guardiansguildx/
```

Auto-posting for FB/IG is **not** implemented until you approve a specific integration. Pin the profile links in those channels for now.

## Manual post template

```
**New upload** — {title}

{one-sentence hook}

Watch: {url}

React and discuss in #new-videos
```
