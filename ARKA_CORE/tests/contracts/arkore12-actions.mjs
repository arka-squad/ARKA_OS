#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const filePath = path.resolve("ARKA_OS/ARKA_CORE/bricks/ARKORE12-ACTION-KEYS.yaml");
const content = fs.readFileSync(filePath, "utf8");
const lines = content.split(/\r?\n/);
const actions = new Map();
let currentAction = null;
let inActions = false;

for (const line of lines) {
  if (/^\s*action_keys:/.test(line)) { inActions = true; continue; }
  if (/^\s*prompt_macros:/.test(line)) { inActions = false; currentAction = null; continue; }
  if (!inActions) continue;
  const leading = line.match(/^\s*/)[0].length;
  if (line.trim().length && leading < 6) currentAction = null;
  const actionMatch = line.match(/^\s{6}([A-Z0-9_]+):\s*$/);
  if (actionMatch) {
    currentAction = actionMatch[1];
    actions.set(currentAction, { inputs: false, outputs: false, validations: false, post: false });
    continue;
  }
  if (!currentAction) continue;
  if (/^\s{8}inputs:/i.test(line)) actions.get(currentAction).inputs = true;
  if (/^\s{8}outputs:/i.test(line)) actions.get(currentAction).outputs = true;
  if (/^\s{8}validations:/i.test(line)) actions.get(currentAction).validations = true;
  if (/^\s{8}post:/i.test(line)) actions.get(currentAction).post = true;
}

const expectedCount = 96;
if (actions.size !== expectedCount) {
  throw new Error(`Expected ${expectedCount} actions, found ${actions.size}`);
}
const missing = [];
for (const [name, flags] of actions.entries()) {
  for (const [k, v] of Object.entries(flags)) {
    if (!v) missing.push(`${name} missing ${k}`);
  }
}
const suites = {
  feature: ["FEATURE_CREATE","FEATURE_READ","FEATURE_UPDATE","FEATURE_DELETE","FEATURE_MOVE","FEATURE_RENAME","FEATURE_ARCHIVE","FEATURE_STATUS"],
  epic:    ["EPIC_CREATE","EPIC_READ","EPIC_UPDATE","EPIC_DELETE","EPIC_MOVE","EPIC_RENAME","EPIC_ARCHIVE","EPIC_STATUS"],
  us:      ["US_CREATE","US_READ","US_UPDATE","US_DELETE","US_MOVE","US_RENAME","US_ARCHIVE","US_STATUS"],
  ticket:  ["TICKET_CREATE","TICKET_READ","TICKET_UPDATE","TICKET_DELETE","TICKET_MOVE","TICKET_RENAME","TICKET_ARCHIVE","TICKET_STATUS","TICKET_CLOSE"],
  document: ["DOCUMENT_CREATE","DOCUMENT_READ","DOCUMENT_UPDATE","DOCUMENT_DELETE","DOCUMENT_MOVE","DOCUMENT_RENAME","DOCUMENT_ARCHIVE","DOCUMENT_STATUS","DOCUMENT_PUBLISH"],
  report:   ["REPORT_CREATE","REPORT_READ","REPORT_UPDATE","REPORT_DELETE","REPORT_MOVE","REPORT_RENAME","REPORT_ARCHIVE","REPORT_STATUS","REPORT_PUBLISH"],
  analysis: ["ANALYSIS_CREATE","ANALYSIS_READ","ANALYSIS_UPDATE","ANALYSIS_DELETE","ANALYSIS_MOVE","ANALYSIS_RENAME","ANALYSIS_ARCHIVE","ANALYSIS_STATUS","ANALYSIS_PUBLISH"],
  plan:     ["PLAN_CREATE","PLAN_READ","PLAN_UPDATE","PLAN_DELETE","PLAN_MOVE","PLAN_RENAME","PLAN_ARCHIVE","PLAN_STATUS","PLAN_PUBLISH"],
  contract: ["CONTRACT_CREATE","CONTRACT_READ","CONTRACT_UPDATE","CONTRACT_DELETE","CONTRACT_MOVE","CONTRACT_RENAME","CONTRACT_ARCHIVE","CONTRACT_STATUS","CONTRACT_PUBLISH"],
  order:    ["ORDER_CREATE","ORDER_READ","ORDER_UPDATE","ORDER_DELETE","ORDER_ASSIGN","ORDER_VALIDATE","ORDER_CANCEL","ORDER_ESCALATE"],
  governance: ["GATE_NOTIFY","GATE_BROADCAST","DECISION_PUBLISH","DECISION_ARCHIVE"],
  support: ["DELIVERY_SUBMIT","MISSION_INGEST","VALIDATE_NAMING","ARCHIVE_CAPTURE","WORKFLOW_PLAN","REVIEW_DELIVERABLE"],
};
for (const [label, keys] of Object.entries(suites)) {
  for (const key of keys) {
    if (!actions.has(key)) missing.push(`${label} missing ${key}`);
  }
}
if (missing.length) {
  throw new Error(`Invalid action definitions:\n - ${missing.join("\n - ")}`);
}
console.log(`All ${actions.size} actions expose inputs/outputs/validations/post.`);
