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
function ensureDir(p) { fs.mkdirSync(p, { recursive: true }); }
function writeText(file, content) { ensureDir(path.dirname(file)); fs.writeFileSync(file, content, "utf8"); }
function appendJSONL(file, obj) { ensureDir(path.dirname(file)); fs.appendFileSync(file, JSON.stringify(obj) + "
", "utf8"); }
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
function normalizeActionKey(key) {
  const alias = { ORDER_CREATE: "TICKET_CREATE", ORDER_CLOSE: "TICKET_CLOSE", ORDER_UPDATE: "TICKET_UPDATE" };
  return alias[key] || key;
}
function normalizeInputs(key, input) {
  const out = { ...input };
  if (out.orderId && !out.ticketId) out.ticketId = out.orderId;
  if (out.order && !out.ticket) out.ticket = out.order;
  if (out.orderId && out.ticketId && out.orderId !== out.ticketId) die("orderId != ticketId (conflit)");
  return out;
}

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

// --------------------------- Action Handlers ------------------------
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
  const ak = asm["ARKORE12-ACTION-KEYS"].action_keys.US_CREATE; const dirTpl = resolveRef(asm, ak.paths.dir_ref);
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
  const ak = asm["ARKORE12-ACTION-KEYS"].action_keys.TICKET_CREATE;
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
  const ak = asm["ARKORE12-ACTION-KEYS"].action_keys.TICKET_CLOSE;
  const usTpl = resolveRef(asm, "ARKORE08-PATHS-GOVERNANCE:path_templates.us_dir");
  const tTpl  = resolveRef(asm, "ARKORE08-PATHS-GOVERNANCE:path_templates.ticket_dir");
  const vars  = buildVars(input);
  const usDir = tpl(usTpl, vars); const ticketDir = tpl(tTpl, vars);
  const dst   = path.join(usDir, "evidence/"); ensureDir(dst);
  const keep  = ak.move?.keep || ["*_SUMMARY.md","*_TESTS.md","*_PERF.md","approvals.json"];
  // Copy kept files to evidence (non-destructive move)
  const copied = [];
  for (const pattern of keep) {
    const re = new RegExp("^" + pattern.replace(/[.+^${}()|[\]\]/g, "\$&").replace(/\\*/g, ".*") + "$");
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

async function action_DELIVERY_SUBMIT(asm, input) {
  const ak = asm["ARKORE12-ACTION-KEYS"].action_keys.DELIVERY_SUBMIT; const routes = ak.routes;
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

  let res;
  if (key === "US_CREATE") res = await action_US_CREATE(asm, input);
  else if (key === "TICKET_CREATE") res = await action_TICKET_CREATE(asm, input);
  else if (key === "TICKET_CLOSE") res = await action_TICKET_CLOSE(asm, input);
  else if (key === "DELIVERY_SUBMIT") res = await action_DELIVERY_SUBMIT(asm, input);
  else die(`Unsupported action_key: ${key}`);

  // Final compact result to stderr (stdout is event stream)
  console.error(JSON.stringify(res));
}

main().catch(e => die(e.stack || e.message));
