/**
 * Resolve a YouTube channel ID from YOUTUBE_CHANNEL_URL / @handle via public RSS/page hints.
 * Does not invent IDs — prints what it finds or asks you to paste the ID from YouTube.
 */
import "dotenv/config";

const url =
  process.env.YOUTUBE_CHANNEL_URL?.trim() || "https://www.youtube.com/@GuardiansGuildX";

async function main(): Promise<void> {
  console.log(`Fetching ${url} …`);
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; discord-forge/1.0; +https://github.com/tariqkhan051/discord-forge)",
    },
  });
  if (!res.ok) {
    console.error(`HTTP ${res.status}. Open the channel → About → share channel ID, or use:`);
    console.error("https://commentpicker.com/youtube-channel-id.php");
    process.exit(1);
  }

  const html = await res.text();
  const patterns = [
    /"channelId":"(UC[\w-]+)"/,
    /"externalId":"(UC[\w-]+)"/,
    /channel_id=(UC[\w-]+)/,
    /\/channel\/(UC[\w-]+)/,
  ];

  for (const re of patterns) {
    const m = html.match(re);
    if (m?.[1]) {
      console.log(`Found channel ID: ${m[1]}`);
      console.log(`Add to .env:\nYOUTUBE_CHANNEL_ID=${m[1]}`);
      console.log(`RSS: https://www.youtube.com/feeds/videos.xml?channel_id=${m[1]}`);
      return;
    }
  }

  console.error("Could not extract channel ID from the page HTML.");
  console.error("Manual steps:");
  console.error("1. Open https://www.youtube.com/@GuardiansGuildX");
  console.error("2. View page source and search for channelId, or use a channel-ID lookup tool");
  console.error("3. Set YOUTUBE_CHANNEL_ID=UCxxxxxxxx in .env");
  process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
