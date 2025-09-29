#!/usr/bin/env node
/**
 * ARKA Runner (Node.js)
 *
 * Usage examples:
 *   node bin/runner.mjs US_CREATE '{"featureId":"FEAT-12","epicId":"EPIC-FEAT-12-03","usId":"US-EPIC-12-03-07","title":"export CSV","kebab_title":"export-csv"}'
 *   node bin/runner.mjs TICKET_CREATE '{"featureId":"FEAT-12","epicId":"EPIC-FEAT-12-03","usId":"US-EPIC-12-03-07","ticketId":"TCK-US-12-03-07-01","title":"Implémenter export CSV","kebab_title":"export-csv"}'
 *   node bin/runner.mjs ORDER_CREATE  '{"featureId":"FEAT-12","epicId":"EPIC-FEAT-12-03","usId":"US-EPIC-12-03-07","orderId":"TCK-US-12-03-07-01","title":"Implémenter export CSV","kebab_title":"export-csv"}'
 *   node bin/runner.mjs TICKET_CLOSE  '{"featureId":"FEAT-12","epicId":"EPIC-FEAT-12-03","usId":"US-EPIC-12-03-07","ticketId":"TCK-US-12-03-07-01"}'
 *   node bin/runner.mjs DELIVERY_SUBMIT '{"featureId":"FEAT-12","epicId":"EPIC-FEAT-12-03","usId":"US-EPIC-12-03-07","ticketId":"TCK-US-12-03-07-01","summary":"Livraison S2"}'
 *
 * Flags: --assembly build/assembly.yaml --profile default
 */

import fs from "node:fs";
import path from "node:path";
import url from "node:url";
import { spawnSync, execFileSync } from "node:child_process";

const C = {
  DEFAULT_ASSEMBLY: "build/assembly.yaml",
  DEFAULT_PROFILE: process.env.ARKA_PROFILE || "default",
  AGENT: process.env.ARKA_AGENT || "runner",
};

// ------------------------------ Utils ------------------------------
function die(msg, code = 1) { console.error("[ARKA-RUNNER] ERROR:", msg); process.exit(code); }
function hasYq() { try { execFileSync("yq", ["--version"], { stdio: "ignore" }); return true; } catch { return false; } }
function readAssembly(assemblyPath) {
  if (!hasYq()) die("yq is required. Install mikefarah/yq and retry.");
  if (!fs.existsSync(assemblyPath)) die(`Assembly file not found: ${assemblyPath}`);
  const json = execFileSync("yq", ["-o=json", ".", assemblyPath], { encoding: "utf8" });
  try { return JSON.parse(json); } catch (e) { die("Invalid assembly JSON from yq: " + e.message); }
}
function get(obj, pathStr) { return pathStr.split(".").reduce((o, k) => (o == null ? undefined : o[k]), obj); }
function resolveRef(asm, ref) {
  if (typeof ref !== "string" || !ref.includes(":")) die(`Invalid ref: ${ref}`);
  const [brick, p] = ref.split(":", 2);
  const bucket = asm[brick]; if (!bucket) die(`Brick not enabled or missing in assembly: ${brick}`);
  const val = get(bucket, p); if (val === undefined) die(`Path not found in ${brick}: ${p}`); return val;
}
function getActionDef(asm, key) {
  const actions = asm["ARKORE12-ACTION-KEYS"]?.action_keys;
  if (!actions) die("ARKORE12-ACTION-KEYS.action_keys missing");
  if (actions[key]) return actions[key];
  for (const group of Object.values(actions)) {
    if (group && typeof group === "object" && key in group) return group[key];
  }
  die(`action_key not found: ${key}`);
}
function ensureDir(p) { fs.mkdirSync(p, { recursive: true }); }
function writeText(file, content) { ensureDir(path.dirname(file)); fs.writeFileSync(file, content, "utf8"); }
function appendJSONL(file, obj) { ensureDir(path.dirname(file)); fs.appendFileSync(file, JSON.stringify(obj) + "\n", "utf8"); }
function readJSON(file, def = {}) { try { return JSON.parse(fs.readFileSync(file, "utf8")); } catch { return def; } }
function writeJSON(file, obj) { ensureDir(path.dirname(file)); fs.writeFileSync(file, JSON.stringify(obj, null, 2)); }
function tpl(str, dict) { return str.replace(/\$\{([^}]+)}/g, (_, k) => (dict[k] ?? "")); }
function readTemplateValue(val) {
  if (!val) return null;
  if (typeof val === "string" && val.startsWith("file://")) { const p = url.fileURLToPath(val); return fs.readFileSync(p, "utf8"); }
  return val; // inline string template
}
function interpolateArg(str, payload) {
  return str.replace(/\$\{([^}]+)}/g, (_, p) => { const [pathExp, fallback] = p.split(":-"); const v = get(payload, pathExp.trim()); return v == null ? (fallback ?? "") : String(v); });
}

// -------------------------- Event Dispatch -------------------------
async function dispatchEvent(asm, name, payload) {
  const bus = asm["ARKORE16-EVENT-BUS"] || {};
  // alias mapping to canonical topics
  const aliasMap = bus.alias_topics || {};
  const canonical = aliasMap[name] || name;
  const stdoutEnabled = bus?.dispatch?.stdout?.enabled !== false; // default true
  const out = { event: canonical, ...(payload || {}) };
  if (stdoutEnabled) console.log(JSON.stringify(out));
  const subs = Array.isArray(bus?.subscriptions) ? bus.subscriptions : [];
  const localCfg = bus?.dispatch?.local || { base_dir: "scripts/" };
  for (const s of subs) {
    if (s.on !== canonical) continue;
    if (s.using === "local") {
      const scriptPath = path.join(localCfg.base_dir || "scripts/", s.run);
      const args = (s.args || []).map(a => interpolateArg(a, out));
      const res = spawnSync(scriptPath, args, { input: JSON.stringify(out), encoding: "utf8", stdio: ["pipe", "inherit", "inherit"] });
      if (res.error) console.error(`[event local] ${canonical} -> ${scriptPath} failed:`, res.error.message);
    } else if (s.using === "webhook") {
      const endpoint = process.env.ARKA_EVENT_WEBHOOK || s.run;
      if (endpoint) { try { await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(out) }); } catch (e) { console.error(`[event webhook] ${canonical} -> ${endpoint} failed:`, e.message); } }
    } // stdout already printed
  }
}

// -------------------------- Memory Operations ----------------------
function memoryFilesFor(agent) { const d = new Date(); const yyyy = d.getUTCFullYear(); const mm = String(d.getUTCMonth()+1).padStart(2,"0"); const dd = String(d.getUTCDate()).padStart(2,"0"); return { daily: `.mem/${agent}/log/${yyyy}-${mm}-${dd}.jsonl`, index: `.mem/${agent}/index.json` }; }
function memoryUpdate({ action_key, scope, inputs, outputs, refs_resolved, validations, status, actor = C.AGENT }) {
  const rec = { ts: new Date().toISOString(), actor, action_key, scope, inputs, outputs, refs_resolved, validations, status };
  const { daily, index } = memoryFilesFor(actor);
  appendJSONL(daily, rec);
  const idx = readJSON(index, {}); const key = JSON.stringify(scope || {}); idx[key] = { last: rec.ts, action_key, status }; writeJSON(index, idx); return rec;
}

// --------------------------- Normalization -------------------------
function normalizeActionKey(key) { return key; }
function normalizeInputs(key, input) { return { ...input }; }

// --------------------------- Helpers -------------------------------
function buildVars(input) {
  return {
    featureId: input.featureId,
    kebab_feature: `${input.featureId}-${input.kebab_title}`,
    epicId: input.epicId,
    kebab_epic: input.kebab_title,
    usId: input.usId,
    kebab_us: input.kebab_title,
    ticketId: input.ticketId,
  };
}
function usDirFromAsm(asm, vars) { const tpl = resolveRef(asm, "ARKORE08-PATHS-GOVERNANCE:path_templates.us_dir"); return tpl && tpl( tpl, vars ), tpl ? tpl.replace(/\$\{([^}]+)}/g, (_,k)=>vars[k]??"") : ""; }
function ticketDirFromAsm(asm, vars) { const tpl = resolveRef(asm, "ARKORE08-PATHS-GOVERNANCE:path_templates.ticket_dir"); return tpl.replace(/\$\{([^}]+)}/g, (_,k)=>vars[k]??""); }

const TYPE_ID_FIELDS = {
  feature: "featureId",
  epic: "epicId",
  us: "usId",
  ticket: "ticketId",
  document: "documentId",
  report: "reportId",
  analysis: "analysisId",
  plan: "planId",
  contract: "contractId",
  order: "orderId",
  decision: "decisionId",
};

const TYPE_SCOPE_KEYS = {
  feature: ["featureId"],
  epic: ["featureId", "epicId"],
  us: ["featureId", "epicId", "usId"],
  ticket: ["featureId", "epicId", "usId", "ticketId"],
  document: ["documentId"],
  report: ["reportId"],
  analysis: ["analysisId"],
  plan: ["planId"],
  contract: ["contractId"],
  order: ["orderId"],
  decision: ["decisionId"],
};

function typeFromActionKey(actionKey) {
  if (!actionKey) return null;
  const parts = String(actionKey).split("_");
  return parts.length ? parts[0].toLowerCase() : null;
}

function applyPathPlaceholders(template, input) {
  if (typeof template !== "string") return null;
  let out = template.replace(/\{([^}]+)}/g, (_, key) => {
    const raw = key.trim();
    const candidates = [raw, `${raw}Id`, raw.replace(/([A-Z])/g, m => `_${m.toLowerCase()}`)];
    for (const k of candidates) {
      if (input[k] != null) return String(input[k]);
    }
    return "";
  });
  out = out.replace(/\$\{([^}]+)}/g, (_, expr) => {
    const pathExp = expr.trim();
    const v = get(input, pathExp);
    return v == null ? "" : String(v);
  });
  return out;
}

function resolveResourcePath(asm, actionDef, type, input) {
  if (!actionDef?.path_ref) return { basePath: null, resolvedPath: null };
  const raw = resolveRef(asm, actionDef.path_ref);
  const basePath = applyPathPlaceholders(raw, input) || raw;
  const idField = TYPE_ID_FIELDS[type];
  const idValue = idField ? input[idField] : undefined;
  if (!basePath) return { basePath: null, resolvedPath: null };
  let resolvedPath = basePath;
  if (idValue) {
    if (["feature", "epic", "us", "ticket"].includes(type)) {
      resolvedPath = path.join(basePath, `${idValue}/`);
    } else {
      const fileType = actionDef.file_type || (type === "order" ? "json" : "md");
      const ext = fileType === "json" ? ".json" : fileType.startsWith(".") ? fileType : ".md";
      resolvedPath = path.join(basePath, `${idValue}${ext}`);
    }
  }
  return { basePath, resolvedPath };
}

function buildScope(type, input) {
  const keys = TYPE_SCOPE_KEYS[type] || [];
  const scope = {};
  for (const key of keys) {
    if (input[key] != null) scope[key] = input[key];
  }
  return scope;
}

function collectRefsFromAction(actionDef) {
  const refs = new Set();
  const visit = value => {
    if (!value) return;
    if (typeof value === "string") {
      if (value.includes(":") && !value.startsWith("file://")) refs.add(value);
    } else if (Array.isArray(value)) {
      value.forEach(visit);
    } else if (typeof value === "object") {
      for (const [k, v] of Object.entries(value)) {
        if (k.endsWith("_ref") && typeof v === "string") refs.add(v);
        visit(v);
      }
    }
  };
  visit(actionDef);
  return Array.from(refs);
}

function shouldTriggerMemory(post) {
  return (post || []).some(p => typeof p === "string" && p.startsWith("ARKORE14-MEMORY-OPS:operations.MEMORY_UPDATE"));
}

function parseEventInstruction(entry, type) {
  if (typeof entry !== "string") return null;
  const prefix = "ARKORE16-EVENT-BUS:emit.";
  if (!entry.startsWith(prefix)) return null;
  const tail = entry.slice(prefix.length);
  return tail.replace("{TYPE}", type.toUpperCase());
}

function applyInlineTemplate(str, input) {
  if (typeof str !== "string") return str;
  return str.replace(/\$\{([^}]+)}/g, (_, expr) => {
    const value = get(input, expr.trim());
    return value == null ? "" : String(value);
  });
}

async function finalizeGenericAction(ctx, outputs, validations, status = "success") {
  const { asm, actionKey, actionDef, type, input } = ctx;
  const post = Array.isArray(actionDef?.post) ? actionDef.post : [];
  const refs = collectRefsFromAction(actionDef);
  const scope = buildScope(type, input);
  const events = new Set();
  let memRecord = null;
  if (shouldTriggerMemory(post)) {
    memRecord = memoryUpdate({
      action_key: actionKey,
      scope,
      inputs: input,
      outputs,
      refs_resolved: refs,
      validations,
      status,
    });
    await dispatchEvent(asm, "MEMORY_UPDATED", {
      event: "MEMORY_UPDATED",
      ts: memRecord.ts,
      source_brick: "ARKORE14-MEMORY-OPS",
      profile: C.DEFAULT_PROFILE,
      scope,
      details: { status },
    });
    events.add("MEMORY_UPDATED");
  }
  for (const entry of post) {
    const eventName = parseEventInstruction(entry, type);
    if (!eventName) continue;
    await dispatchEvent(asm, eventName, {
      ts: new Date().toISOString(),
      source_brick: "ARKORE12-ACTION-KEYS",
      profile: C.DEFAULT_PROFILE,
      scope,
      details: { action: actionKey, outputs },
    });
    events.add(eventName);
  }
  return { ok: true, outputs, validations, events: Array.from(events) };
}

// --------------------------- Action Handlers ------------------------
async function genericCreate(ctx) {
  const { asm, actionDef, type, input, actionKey } = ctx;
  const idField = TYPE_ID_FIELDS[type];
  const idValue = idField ? input[idField] : undefined;
  const { basePath, resolvedPath } = resolveResourcePath(asm, actionDef, type, input);
  if (basePath) ensureDir(basePath);
  if (resolvedPath && idValue) {
    if (["feature", "epic", "us", "ticket"].includes(type)) {
      ensureDir(resolvedPath);
    } else {
      const fileType = actionDef.file_type || (type === "order" ? "json" : "md");
      if (fileType === "json") {
        writeJSON(resolvedPath, { ...input, created_at: new Date().toISOString(), action_key: actionKey });
      } else {
        if (!fs.existsSync(resolvedPath)) {
          const title = input.title || input.name || idValue;
          writeText(resolvedPath, input.content || `# ${title}\n`);
        }
      }
    }
  }
  const outputs = { created: { id: idValue, path: resolvedPath || basePath } };
  const validations = Array.isArray(actionDef.validations) ? [...actionDef.validations] : [];
  return finalizeGenericAction(ctx, outputs, validations);
}

async function genericRead(ctx) {
  const { asm, actionDef, type, input } = ctx;
  const { resolvedPath } = resolveResourcePath(asm, actionDef, type, input);
  let content = null;
  if (resolvedPath && fs.existsSync(resolvedPath)) {
    const stat = fs.statSync(resolvedPath);
    if (stat.isDirectory()) content = fs.readdirSync(resolvedPath);
    else if (actionDef.file_type === "json") content = readJSON(resolvedPath, {});
    else content = fs.readFileSync(resolvedPath, "utf8");
  }
  const idField = TYPE_ID_FIELDS[type];
  const outputs = {
    path: resolvedPath,
    content,
    metadata: { type, id: idField ? input[idField] : undefined },
  };
  const validations = Array.isArray(actionDef.validations) ? [...actionDef.validations] : [];
  return finalizeGenericAction(ctx, outputs, validations);
}

async function genericUpdate(ctx) {
  const { asm, actionDef, type, input } = ctx;
  const updates = input.updates || {};
  const { resolvedPath } = resolveResourcePath(asm, actionDef, type, input);
  let previous = null;
  if (resolvedPath && fs.existsSync(resolvedPath)) {
    if (actionDef.file_type === "json") {
      previous = readJSON(resolvedPath, {});
      writeJSON(resolvedPath, { ...previous, ...updates, updated_at: new Date().toISOString() });
    } else if (typeof updates.content === "string") {
      previous = fs.readFileSync(resolvedPath, "utf8");
      writeText(resolvedPath, updates.content);
    }
  }
  const outputs = { updated: updates, previous };
  if (Array.isArray(actionDef.notifications)) {
    outputs.notifications = actionDef.notifications.map(n => applyInlineTemplate(n, input));
  }
  const validations = Array.isArray(actionDef.validations) ? [...actionDef.validations] : [];
  return finalizeGenericAction(ctx, outputs, validations);
}

async function genericDelete(ctx) {
  const { asm, actionDef, type, input } = ctx;
  const { resolvedPath } = resolveResourcePath(asm, actionDef, type, input);
  const idField = TYPE_ID_FIELDS[type];
  const deletedId = idField ? input[idField] : undefined;
  if (resolvedPath && fs.existsSync(resolvedPath)) {
    const trashPath = `${resolvedPath}.deleted`; fs.renameSync(resolvedPath, trashPath);
  }
  const outputs = { deleted: deletedId, archived_to: null };
  const validations = Array.isArray(actionDef.validations) ? [...actionDef.validations] : [];
  return finalizeGenericAction(ctx, outputs, validations);
}

async function genericMove(ctx) {
  const { asm, actionDef, type, input } = ctx;
  const { resolvedPath } = resolveResourcePath(asm, actionDef, type, input);
  const destination = input.destination || input.newUsId || input.newFeatureId || input.newEpicId;
  const outputs = { moved_from: resolvedPath, moved_to: destination };
  const validations = Array.isArray(actionDef.validations) ? [...actionDef.validations] : [];
  return finalizeGenericAction(ctx, outputs, validations);
}

async function genericRename(ctx) {
  const { asm, actionDef, type, input } = ctx;
  const { resolvedPath } = resolveResourcePath(asm, actionDef, type, input);
  const idField = TYPE_ID_FIELDS[type];
  const oldId = idField ? input[idField] : undefined;
  const newId = input.newId || input.new_id;
  const outputs = { old_id: oldId, new_id: newId };
  if (resolvedPath && newId) {
    const dir = path.dirname(resolvedPath);
    const ext = path.extname(resolvedPath);
    const newPath = path.join(dir, `${newId}${ext}`);
    if (fs.existsSync(resolvedPath)) fs.renameSync(resolvedPath, newPath);
    outputs.path = newPath;
  }
  const validations = Array.isArray(actionDef.validations) ? [...actionDef.validations] : [];
  return finalizeGenericAction(ctx, outputs, validations);
}

async function genericArchive(ctx) {
  const { asm, actionDef, type, input } = ctx;
  const { resolvedPath } = resolveResourcePath(asm, actionDef, type, input);
  const idField = TYPE_ID_FIELDS[type];
  const archiveId = `${input[idField] || type}-archive`;
  const outputs = { archived_path: resolvedPath, archive_id: archiveId };
  const validations = Array.isArray(actionDef.validations) ? [...actionDef.validations] : [];
  return finalizeGenericAction(ctx, outputs, validations);
}

async function genericStatus(ctx) {
  const { actionDef, type, input } = ctx;
  const outputs = {
    old_status: input.oldStatus || null,
    new_status: input.status || input.validation || input.cancellation_reason || null,
  };
  if (actionDef.outputs?.validated_by && input.validation?.validated_by) {
    outputs.validated_by = input.validation.validated_by;
  }
  if (actionDef.outputs?.timestamp) outputs.timestamp = new Date().toISOString();
  const validations = Array.isArray(actionDef.validations) ? [...actionDef.validations] : [];
  return finalizeGenericAction(ctx, outputs, validations);
}

async function genericPublish(ctx) {
  const { actionDef, type, input } = ctx;
  const outputs = {
    published_url: input.published_url || null,
    version: input.version || input.channels || input.format || input.approvers || input.signatories || null,
  };
  const validations = Array.isArray(actionDef.validations) ? [...actionDef.validations] : [];
  return finalizeGenericAction(ctx, outputs, validations);
}

const GENERIC_ACTION_HANDLERS = {
  CREATE: genericCreate,
  READ: genericRead,
  UPDATE: genericUpdate,
  DELETE: genericDelete,
  MOVE: genericMove,
  RENAME: genericRename,
  ARCHIVE: genericArchive,
  STATUS: genericStatus,
  PUBLISH: genericPublish,
};

const CUSTOM_ACTION_HANDLERS = {
  US_CREATE: action_US_CREATE,
  TICKET_CREATE: action_TICKET_CREATE,
  TICKET_CLOSE: action_TICKET_CLOSE,
  DOCUMENT_CREATE: action_DOCUMENT_CREATE,
  ORDER_CREATE: action_ORDER_CREATE,
  DELIVERY_SUBMIT: action_DELIVERY_SUBMIT,
  MISSION_INGEST: action_MISSION_INGEST,
  VALIDATE_NAMING: action_VALIDATE_NAMING,
  ARCHIVE_CAPTURE: action_ARCHIVE_CAPTURE,
  WORKFLOW_PLAN: action_WORKFLOW_PLAN,
  REVIEW_DELIVERABLE: action_REVIEW_DELIVERABLE,
  GATE_NOTIFY: action_GATE_NOTIFY,
  GATE_BROADCAST: action_GATE_BROADCAST,
};

function validateRegex(asm, regexRef, value, label) { const rxStr = resolveRef(asm, regexRef); const rx = new RegExp(rxStr); if (!rx.test(value)) die(`${label} invalid by ${regexRef}: ${value}`); return `${label}:pass`; }
function ensureUSStructure(usDir) { ensureDir(usDir); ensureDir(path.join(usDir, "evidence")); ensureDir(path.join(usDir, "tickets")); }

function renderUsReadme(asm, ak, input) {
  const tplRef = ak.templates?.readme_ref || "ARKORE13-TEMPLATES:us.readme";
  const raw = resolveRef(asm, tplRef); let tplStr = readTemplateValue(raw); let applied = true;
  if (!tplStr) { applied = false; tplStr = `# ${input.usId} — ${input.title}

> Template manquant (${tplRef}).
- Critères d'acceptation: voir ARKORE05.
`; }
  const accRef = ak.link_specs?.acceptance_criteria_ref || "ARKORE05-EXECUTION-SPECS:acceptance"; const acc = resolveRef(asm, accRef);
  const out = tplStr
    .replace("${usId}", input.usId)
    .replace("${title}", input.title)
    .replace("${acceptance.doc_complete}", String(acc.doc_complete))
    .replace("${acceptance.functional_ok}", String(acc.functional_ok))
    .replace("${acceptance.security_baseline_ok}", String(acc.security_baseline_ok))
    .replace("${acceptance.performance_ok}", String(acc.performance_ok));
  return { content: out, tplRef, applied };
}

async function action_US_CREATE(asm, input) {
  const ak = getActionDef(asm, "US_CREATE"); const dirTpl = resolveRef(asm, ak.paths.dir_ref);
  const usDir = tpl(dirTpl, buildVars(input));
  const validations = []; validations.push(validateRegex(asm, ak.naming.regex_ref, input.usId, "regex.user_story"));
  ensureUSStructure(usDir); const { content, tplRef, applied } = renderUsReadme(asm, ak, input); const readmePath = path.join(usDir, "README.md"); writeText(readmePath, content);
  const scope = { featureId: input.featureId, epicId: input.epicId, usId: input.usId }; const outputs = { created: { dir: usDir, files: [readmePath] } };
  const refs = [ak.paths.dir_ref, ak.naming.regex_ref, ak.templates?.readme_ref || "ARKORE13-TEMPLATES:us.readme", ak.link_specs?.acceptance_criteria_ref || "ARKORE05-EXECUTION-SPECS:acceptance"];
  if (!applied) await dispatchEvent(asm, "TEMPLATE_MISSING", { ts: new Date().toISOString(), source_brick: "ARKORE13-TEMPLATES", profile: C.DEFAULT_PROFILE, scope, details: { ref: tplRef } });
  else await dispatchEvent(asm, "TEMPLATE_APPLIED", { ts: new Date().toISOString(), source_brick: "ARKORE13-TEMPLATES", profile: C.DEFAULT_PROFILE, scope, details: { ref: tplRef, path: readmePath } });
  const mem = memoryUpdate({ action_key: "US_CREATE", scope, inputs: input, outputs, refs_resolved: refs, validations, status: "success" });
  await dispatchEvent(asm, "MEMORY_UPDATED", { event: "MEMORY_UPDATED", ts: mem.ts, source_brick: "ARKORE14-MEMORY-OPS", profile: C.DEFAULT_PROFILE, scope, details: { status: "success" } });
  await dispatchEvent(asm, "US_CREATED", { ts: new Date().toISOString(), source_brick: "ARKORE12-ACTION-KEYS", profile: C.DEFAULT_PROFILE, scope, details: { title: input.title } });
  return { ok: true, created: outputs.created, validations, events: ["US_CREATED", "MEMORY_UPDATED"] };
}

async function action_TICKET_CREATE(asm, input) {
  const ak = getActionDef(asm, "TICKET_CREATE");
  const dirTpl = resolveRef(asm, ak.paths.dir_ref); const ticketDir = tpl(dirTpl, buildVars(input));
  const validations = []; validations.push(validateRegex(asm, ak.naming.regex_ref, input.ticketId, "regex.ticket"));
  ensureDir(ticketDir);
  const files = [path.join(ticketDir, "WORK.md"), path.join(ticketDir, ".todo.md")];
  for (const f of files) if (!fs.existsSync(f)) writeText(f, `# ${input.ticketId} — ${input.title || "Ticket"}`);
  const scope = { featureId: input.featureId, epicId: input.epicId, usId: input.usId, ticketId: input.ticketId };
  const outputs = { created: { dir: ticketDir, files } };
  const refs = [ak.paths.dir_ref, ak.naming.regex_ref];
  const mem = memoryUpdate({ action_key: "TICKET_CREATE", scope, inputs: input, outputs, refs_resolved: refs, validations, status: "success" });
  await dispatchEvent(asm, "MEMORY_UPDATED", { event: "MEMORY_UPDATED", ts: mem.ts, source_brick: "ARKORE14-MEMORY-OPS", profile: C.DEFAULT_PROFILE, scope, details: { status: "success" } });
  await dispatchEvent(asm, "TICKET_CREATED", { ts: new Date().toISOString(), source_brick: "ARKORE12-ACTION-KEYS", profile: C.DEFAULT_PROFILE, scope, details: { title: input.title } });
  return { ok: true, created: outputs.created, validations, events: ["TICKET_CREATED","MEMORY_UPDATED"] };
}

async function action_TICKET_CLOSE(asm, input) {
  const ak = getActionDef(asm, "TICKET_CLOSE");
  const usTpl = resolveRef(asm, "ARKORE08-PATHS-GOVERNANCE:path_templates.us_dir");
  const tTpl  = resolveRef(asm, "ARKORE08-PATHS-GOVERNANCE:path_templates.ticket_dir");
  const vars  = buildVars(input);
  const usDir = tpl(usTpl, vars); const ticketDir = tpl(tTpl, vars);
  const dst   = path.join(usDir, "evidence/"); ensureDir(dst);
  const keep  = ak.move?.keep || ["*_SUMMARY.md","*_TESTS.md","*_PERF.md","approvals.json"];
  // Copy kept files to evidence (non-destructive move)
  const copied = [];
  for (const pattern of keep) {
    const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const wildcard = escaped.replace(/\\\*/g, ".*");
    const re = new RegExp(`^${wildcard}$`);
    if (fs.existsSync(ticketDir)) {
      for (const f of fs.readdirSync(ticketDir)) {
        if (re.test(f)) {
          const src = path.join(ticketDir, f); const dstFile = path.join(dst, f);
          fs.copyFileSync(src, dstFile); copied.push(dstFile);
        }
      }
    }
  }
  const scope = { featureId: input.featureId, epicId: input.epicId, usId: input.usId, ticketId: input.ticketId };
  const outputs = { moved_to_evidence: copied };
  const refs = ["ARKORE08-PATHS-GOVERNANCE:path_templates.us_dir","ARKORE08-PATHS-GOVERNANCE:path_templates.ticket_dir"];
  const validations = ["ticket_close:pass"];
  const mem = memoryUpdate({ action_key: "TICKET_CLOSE", scope, inputs: input, outputs, refs_resolved: refs, validations, status: "success" });
  await dispatchEvent(asm, "MEMORY_UPDATED", { event: "MEMORY_UPDATED", ts: mem.ts, source_brick: "ARKORE14-MEMORY-OPS", profile: C.DEFAULT_PROFILE, scope, details: { status: "success" } });
  await dispatchEvent(asm, "TICKET_CLOSED", { ts: new Date().toISOString(), source_brick: "ARKORE12-ACTION-KEYS", profile: C.DEFAULT_PROFILE, scope });
  return { ok: true, moved: copied, events: ["TICKET_CLOSED","MEMORY_UPDATED"] };
}

async function action_DOCUMENT_CREATE(asm, input) {
  const actionDef = getActionDef(asm, "DOCUMENT_CREATE");
  return genericCreate({ asm, actionDef, type: "document", input, actionKey: "DOCUMENT_CREATE" });
}

async function action_ORDER_CREATE(asm, input) {
  const actionDef = getActionDef(asm, "ORDER_CREATE");
  return genericCreate({ asm, actionDef, type: "order", input, actionKey: "ORDER_CREATE" });
}

async function action_DELIVERY_SUBMIT(asm, input) {
  const ak = getActionDef(asm, "DELIVERY_SUBMIT"); const routes = ak.routes;
  const scope = { featureId: input.featureId, epicId: input.epicId, usId: input.usId, ticketId: input.ticketId };
  await dispatchEvent(asm, "DELIVERY_RECEIVED", { ts: new Date().toISOString(), source_brick: "ARKORE15-AGP-REACTIVE-CONTROL", profile: C.DEFAULT_PROFILE, scope, details: { summary: input.summary } });
  await dispatchEvent(asm, "AGP_ACK_SENT", { ts: new Date().toISOString(), source_brick: "ARKORE15-AGP-REACTIVE-CONTROL", profile: C.DEFAULT_PROFILE, scope });
  resolveRef(asm, routes.control_ref);
  await dispatchEvent(asm, "CONTROL_EVALUATED", { ts: new Date().toISOString(), source_brick: "ARKORE15-AGP-REACTIVE-CONTROL", profile: C.DEFAULT_PROFILE, scope, details: { verdict: "ok" } });
  await dispatchEvent(asm, "MISSION_RETURN_ISSUED", { ts: new Date().toISOString(), source_brick: "ARKORE15-AGP-REACTIVE-CONTROL", profile: C.DEFAULT_PROFILE, scope, details: { next_steps: [] } });
  await dispatchEvent(asm, "OWNER_CONFIRMATION_REQUESTED", { ts: new Date().toISOString(), source_brick: "ARKORE15-AGP-REACTIVE-CONTROL", profile: C.DEFAULT_PROFILE, scope, details: { reason: "demo" } });
  const outputs = { status: "processed" }; const refs = [routes.notify_ref, routes.control_ref, routes.return_ref, routes.owner_confirm_ref]; const validations = ["agp_flow:pass"];
  const mem = memoryUpdate({ action_key: "DELIVERY_SUBMIT", scope, inputs: input, outputs, refs_resolved: refs, validations, status: "success" });
  await dispatchEvent(asm, "MEMORY_UPDATED", { event: "MEMORY_UPDATED", ts: mem.ts, source_brick: "ARKORE14-MEMORY-OPS", profile: C.DEFAULT_PROFILE, scope, details: { status: "success" } });
  return { ok: true, status: "processed", events: ["DELIVERY_RECEIVED","AGP_ACK_SENT","CONTROL_EVALUATED","MISSION_RETURN_ISSUED","OWNER_CONFIRMATION_REQUESTED","MEMORY_UPDATED"] };
}

async function action_MISSION_INGEST(asm, input) {
  const actionDef = getActionDef(asm, "MISSION_INGEST");
  const outputs = { ingested: true, record: input.mission_record };
  const validations = ["mission_ingest:pass"];
  return finalizeGenericAction({ asm, actionKey: "MISSION_INGEST", actionDef, type: "mission", input }, outputs, validations);
}

async function action_VALIDATE_NAMING(asm, input) {
  const actionDef = getActionDef(asm, "VALIDATE_NAMING");
  const validations = [];
  const checks = actionDef.checks || {};
  if (input.featureId && checks.feature) validations.push(validateRegex(asm, checks.feature, input.featureId, "regex.feature"));
  if (input.epicId && checks.epic) validations.push(validateRegex(asm, checks.epic, input.epicId, "regex.epic"));
  if (input.usId && checks.us) validations.push(validateRegex(asm, checks.us, input.usId, "regex.user_story"));
  if (input.ticketId && checks.ticket) validations.push(validateRegex(asm, checks.ticket, input.ticketId, "regex.ticket"));
  const outputs = { checked: Object.keys(checks), valid: true };
  return finalizeGenericAction({ asm, actionKey: "VALIDATE_NAMING", actionDef, type: "validate", input }, outputs, validations);
}

async function action_ARCHIVE_CAPTURE(asm, input) {
  const actionDef = getActionDef(asm, "ARCHIVE_CAPTURE");
  const outputs = { handoff: actionDef.handoff_ref, scope: { featureId: input.featureId, epicId: input.epicId, usId: input.usId } };
  const validations = Array.isArray(actionDef.validations) ? [...actionDef.validations] : [];
  return finalizeGenericAction({ asm, actionKey: "ARCHIVE_CAPTURE", actionDef, type: "archive", input }, outputs, validations);
}

async function action_WORKFLOW_PLAN(asm, input) {
  const actionDef = getActionDef(asm, "WORKFLOW_PLAN");
  const plan = {
    name: input.workflowName,
    scope: input.scope || {},
    steps: [
      { id: "discover", role: "pmo", description: "Collecter le contexte" },
      { id: "design", role: "agp", description: "Valider la stratégie" },
      { id: "execute", role: "lead-dev", description: "Implémenter et tester" },
    ],
  };
  const outputs = { plan };
  const validations = ["workflow_plan:pass"];
  return finalizeGenericAction({ asm, actionKey: "WORKFLOW_PLAN", actionDef, type: "workflow", input }, outputs, validations);
}

async function action_REVIEW_DELIVERABLE(asm, input) {
  const actionDef = getActionDef(asm, "REVIEW_DELIVERABLE");
  const outputs = {
    critique: `Analyse du livrable ${input.deliverablePath} par ${input.reviewer}`,
    suggestions: ["Clarifier les sections clés", "Ajouter une checklist de validation"],
  };
  const validations = ["review_performed:pass"];
  return finalizeGenericAction({ asm, actionKey: "REVIEW_DELIVERABLE", actionDef, type: "review", input }, outputs, validations);
}

async function action_GATE_NOTIFY(asm, input) {
  const actionDef = getActionDef(asm, "GATE_NOTIFY");
  const outputs = {
    gate: input.gate,
    recipients: input.recipients,
    status: input.status,
  };
  const validations = Array.isArray(actionDef.validations) ? [...actionDef.validations] : [];
  return finalizeGenericAction({ asm, actionKey: "GATE_NOTIFY", actionDef, type: "gate", input }, outputs, validations);
}

async function action_GATE_BROADCAST(asm, input) {
  const actionDef = getActionDef(asm, "GATE_BROADCAST");
  const outputs = {
    gate: input.gate,
    decision: input.decision,
    message: input.message,
    audience: actionDef.broadcast_to || [],
  };
  const validations = ["gate_broadcast:pass"];
  return finalizeGenericAction({ asm, actionKey: "GATE_BROADCAST", actionDef, type: "gate", input }, outputs, validations);
}

// ------------------------------ Main -------------------------------
async function main() {
  const [,, rawKey, inputArg, ...rest] = process.argv;
  if (!rawKey) { console.error("Usage: node bin/runner.mjs <ACTION_KEY> '<JSON_INPUT>' [--assembly build/assembly.yaml] [--profile default]"); process.exit(1); }
  let assemblyPath = C.DEFAULT_ASSEMBLY; let profile = C.DEFAULT_PROFILE;
  for (let i = 0; i < rest.length; i++) { if (rest[i] === "--assembly") assemblyPath = rest[++i]; else if (rest[i] === "--profile") profile = rest[++i]; }
  const asm = readAssembly(assemblyPath); if (!asm) die("Assembly not loaded");
  const key = normalizeActionKey(rawKey);
  let input = {}; if (inputArg) { try { input = JSON.parse(inputArg); } catch (e) { die("Invalid JSON input: " + e.message); } }
  input = normalizeInputs(key, input);

  const actionDef = getActionDef(asm, key);
  const type = typeFromActionKey(key) || "generic";
  let res;
  const customHandler = CUSTOM_ACTION_HANDLERS[key];
  if (typeof customHandler === "function") {
    res = await customHandler(asm, input);
  } else {
    const operation = actionDef?.operation || key.split("_").slice(1).join("_");
    const handler = GENERIC_ACTION_HANDLERS[operation];
    if (!handler) die(`Unsupported action_key: ${key}`);
    res = await handler({ asm, actionKey: key, actionDef, type, input });
  }

  // Final compact result to stderr (stdout is event stream)
  console.error(JSON.stringify(res));
}

main().catch(e => die(e.stack || e.message));
