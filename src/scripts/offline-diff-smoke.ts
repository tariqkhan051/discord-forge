/**
 * Offline smoke test — validates blueprint load + idempotent alias matching
 * without Discord credentials.
 */
import { loadBlueprint } from "../lib/blueprint.js";
import { computeDiff, formatDiffMarkdown, type LiveStructure } from "../lib/diff.js";

const mockLive: LiveStructure = {
  guildId: "0",
  guildName: "Guardians Guild (mock)",
  roles: [
    { id: "1", name: "Admin" },
    { id: "2", name: "@everyone" },
  ],
  categories: [{ id: "10", name: "Text Channels" }],
  channels: [
    { id: "100", name: "💬・general-chat", type: 0, parentId: "10" },
    { id: "101", name: "rules", type: 0, parentId: "10" },
  ],
};

const blueprint = loadBlueprint();
const diff = computeDiff(blueprint, mockLive);

const community = diff.channels.find((c) => c.blueprintId === "community-chat");
const rules = diff.channels.find((c) => c.blueprintId === "rules");

if (!community || community.action === "create") {
  console.error("FAIL: community-chat should alias-match 💬・general-chat, got", community);
  process.exit(1);
}
if (!rules || rules.action === "create") {
  console.error("FAIL: rules should skip existing rules channel, got", rules);
  process.exit(1);
}

const creates = diff.channels.filter((c) => c.action === "create").length;
console.log("Offline smoke OK");
console.log(`community-chat → ${community.action} (${community.matchedLiveName})`);
console.log(`rules → ${rules.action}`);
console.log(`Would create ${creates} missing channels, ${diff.summary.rolesCreate} roles`);
console.log("\n--- sample markdown (truncated) ---\n");
console.log(formatDiffMarkdown(diff, mockLive).split("\n").slice(0, 20).join("\n"));
