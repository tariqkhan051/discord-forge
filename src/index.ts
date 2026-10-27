import {
  Client,
  GatewayIntentBits,
  Partials,
} from "discord.js";
import { config, requireDiscordCredentials } from "./lib/config.js";
import { registerWelcome } from "./features/welcome.js";
import { registerModLog } from "./features/moderation-log.js";
import { registerYoutube } from "./features/youtube.js";
import { registerCommands } from "./features/commands/index.js";

async function main(): Promise<void> {
  requireDiscordCredentials();

  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMembers,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.GuildModeration,
      GatewayIntentBits.MessageContent,
    ],
    partials: [Partials.Message, Partials.Channel],
  });

  registerWelcome(client);
  registerModLog(client);
  registerYoutube(client);
  registerCommands(client);

  client.once("ready", (c) => {
    console.log(`Logged in as ${c.user.tag}`);
    console.log(`Guild target: ${config.guildId}`);
    console.log(
      `Features — welcome:${config.enableWelcome} youtube:${config.enableYoutube} modLog:${config.enableModLog}`,
    );
  });

  await client.login(config.token);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
