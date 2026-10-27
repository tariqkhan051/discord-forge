#!/usr/bin/env node
import { requireDiscordCredentials } from "./lib/config.js";
import { applyGuild, dryRunGuild, inspectGuild } from "./lib/discord-client.js";
import { formatDiffMarkdown } from "./lib/diff.js";
import { writeJsonReport, writeReport } from "./lib/reports.js";

async function main(): Promise<void> {
  const command = process.argv[2];
  if (!command || !["inspect", "dry-run", "apply"].includes(command)) {
    console.error("Usage: tsx src/cli.ts <inspect|dry-run|apply>");
    process.exit(1);
  }

  requireDiscordCredentials();

  if (command === "inspect") {
    console.log("Inspecting live guild…");
    const { live, blueprint } = await inspectGuild();
    const path = writeJsonReport("live-structure.json", {
      inspectedAt: new Date().toISOString(),
      blueprintVersion: blueprint.version,
      live,
    });
    console.log(`Guild: ${live.guildName} (${live.guildId})`);
    console.log(
      `Roles: ${live.roles.length} | Categories: ${live.categories.length} | Channels: ${live.channels.length}`,
    );
    console.log(`Wrote ${path}`);
    console.log("\nExisting channels:");
    for (const ch of live.channels.sort((a, b) => a.name.localeCompare(b.name))) {
      console.log(`  - ${ch.name}`);
    }
    console.log("\nExisting roles:");
    for (const r of live.roles.sort((a, b) => a.name.localeCompare(b.name))) {
      console.log(`  - ${r.name}`);
    }
    return;
  }

  if (command === "dry-run") {
    console.log("Computing dry-run diff (no changes will be made)…");
    const { live, diff } = await dryRunGuild();
    const md = formatDiffMarkdown(diff, live);
    const mdPath = writeReport("dry-run.md", md);
    writeJsonReport("dry-run.json", { generatedAt: new Date().toISOString(), live, diff });
    console.log(md);
    console.log(`\nWrote ${mdPath}`);
    console.log(
      "\n*** STOP *** Review the report above. Do NOT run apply until you explicitly approve.",
    );
    return;
  }

  if (command === "apply") {
    console.log("Applying missing roles/categories/channels (create-only, never deletes)…");
    const { result, diff } = await applyGuild();
    const report = {
      appliedAt: new Date().toISOString(),
      summary: diff.summary,
      createdRoles: result.createdRoles,
      createdCategories: result.createdCategories,
      createdChannels: result.createdChannels,
      skipped: result.skipped,
      errors: result.errors,
    };
    const path = writeJsonReport("apply-result.json", report);
    console.log(`Created roles: ${result.createdRoles.join(", ") || "(none)"}`);
    console.log(`Created categories: ${result.createdCategories.join(", ") || "(none)"}`);
    console.log(`Created channels: ${result.createdChannels.join(", ") || "(none)"}`);
    if (result.errors.length) {
      console.error("Errors:");
      for (const e of result.errors) console.error(`  - ${e}`);
    }
    console.log(`Wrote ${path}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
