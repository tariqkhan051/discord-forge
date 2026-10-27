import { REST, Routes } from "discord.js";
import { config, requireDiscordCredentials } from "./lib/config.js";
import { commandData } from "./features/commands/index.js";

async function main(): Promise<void> {
  requireDiscordCredentials();
  if (!config.clientId) {
    throw new Error("CLIENT_ID is required to register slash commands.");
  }

  const rest = new REST({ version: "10" }).setToken(config.token);
  console.log(`Registering ${commandData.length} guild slash commands…`);
  await rest.put(Routes.applicationGuildCommands(config.clientId, config.guildId), {
    body: commandData,
  });
  console.log("Slash commands registered for guild", config.guildId);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
