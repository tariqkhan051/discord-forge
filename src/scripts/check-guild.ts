import "dotenv/config";
import { Client, GatewayIntentBits } from "discord.js";

const token = process.env.DISCORD_TOKEN?.trim();
const want = process.env.GUILD_ID?.trim();
const clientId = process.env.CLIENT_ID?.trim();

if (!token) {
  console.error("DISCORD_TOKEN missing");
  process.exit(1);
}

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once("ready", () => {
  const guilds = [...client.guilds.cache.values()].map((g) => ({ id: g.id, name: g.name }));
  console.log(`BOT_USER=${client.user?.tag}`);
  console.log(`CONFIGURED_GUILD_ID=${want ?? "(missing)"}`);
  console.log(`GUILD_COUNT=${guilds.length}`);
  for (const g of guilds) {
    console.log(`GUILD=${g.id} | ${g.name}`);
  }
  console.log(
    guilds.some((g) => g.id === want)
      ? "MATCH=yes"
      : "MATCH=no (invite the bot to your server, or fix GUILD_ID)",
  );
  if (clientId) {
    console.log(
      `INVITE_URL=https://discord.com/api/oauth2/authorize?client_id=${clientId}&permissions=268823638&scope=bot%20applications.commands`,
    );
  }
  client.destroy();
});

client.login(token).catch((err) => {
  console.error(err);
  process.exit(1);
});
