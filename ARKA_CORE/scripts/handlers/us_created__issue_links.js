#!/usr/bin/env node
// Node 18+ requis (fetch natif). Crée un ticket GitHub à l'événement US_CREATED.
import fs from 'node:fs';
import { argv, env, exit } from 'node:process';

const EVENT = JSON.parse(fs.readFileSync(0, 'utf8'));
const provider = argv.includes('--provider') ? argv[argv.indexOf('--provider') + 1] : 'github';

if (provider !== 'github') {
  console.error('[us_created__issue_links] provider non supporté:', provider);
  exit(2);
}

const repo = env.GITHUB_REPO; // format: owner/repo
const token = env.GITHUB_TOKEN; // PAT avec scope repo
if (!repo || !token) {
  console.error('Missing GITHUB_REPO or GITHUB_TOKEN in env');
  exit(3);
}

const [owner, repoName] = repo.split('/');
const url = `https://api.github.com/repos/${owner}/${repoName}/issues`;

const title = `${EVENT?.scope?.usId ?? 'US'} — ${EVENT?.details?.title ?? 'New User Story'}`;
const body = [
  'Auto-created from ARKA event **US_CREATED**',
  `Scope: ${JSON.stringify(EVENT.scope ?? {}, null, 2)}`,
  EVENT.details?.summary ? `
Summary:
${EVENT.details.summary}` : ''
].join('

');

const res = await fetch(url, {
  method: 'POST',
  headers: {
    'Authorization': `token ${token}`,
    'Accept': 'application/vnd.github+json',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ title, body, labels: ['US'] })
});

if (!res.ok) {
  const txt = await res.text();
  console.error('GitHub API error:', res.status, txt);
  exit(4);
}
const json = await res.json();
console.log('Created issue:', json.html_url);