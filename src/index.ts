import {
  Client,
  GatewayIntentBits,
  Partials,
  type BitFieldResolvable,
  type GatewayIntentsString,
} from "discord.js";
import { config, requireDiscordCredentials } from "./lib/config.js";
import { registerWelcome } from "./features/welcome.js";
import { registerModLog } from "./features/moderation-log.js";
import { registerYoutube } from "./features/youtube.js";
import { registerCommands } from "./features/commands/index.js";
import { registerVerification } from "./features/verification.js";
import { registerSetupPanels } from "./features/setup-panels.js";
import { registerAutomod } from "./features/automod.js";

function buildIntents(): BitFieldResolvable<GatewayIntentsString, number> {
  const intents: GatewayIntentBits[] = [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildModeration,
    GatewayIntentBits.GuildMessageReactions,
  ];
  // Privileged — enable in Developer Portal first, then set env flags to true
  if (config.enableMembersIntent) intents.push(GatewayIntentBits.GuildMembers);
  if (config.enableMessageContentIntent) intents.push(GatewayIntentBits.MessageContent);
  return intents;
}

async function main(): Promise<void> {
  requireDiscordCredentials();

  if ((config.enableWelcome || config.enableAutoRole) && !config.enableMembersIntent) {
    console.warn(
      "Welcome/auto-role need Server Members Intent. Set ENABLE_MEMBERS_INTENT=true after enabling it in the Developer Portal.",
    );
  }

  const client = new Client({
    intents: buildIntents(),
    partials: [Partials.Message, Partials.Channel],
  });

  registerWelcome(client);
  registerModLog(client);
  registerYoutube(client);
  registerCommands(client);
  registerVerification(client);
  registerSetupPanels(client);
  registerAutomod(client);

  client.once("clientReady", (c) => {
    console.log(`Logged in as ${c.user.tag}`);
    console.log(`Guild target: ${config.guildId}`);
    console.log(
      `Features — welcome:${config.enableWelcome} youtube:${config.enableYoutube} modLog:${config.enableModLog} autoRole:${config.enableAutoRole}`,
    );
  });

  await client.login(config.token);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
