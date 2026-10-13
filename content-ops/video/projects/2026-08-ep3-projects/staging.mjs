#!/usr/bin/env node

// Reproducible staging for Module Tours Ep. 3. It only touches Paco's dedicated
// Valencia demo board and reads authentication from the generated Playwright
// storageState. It never logs the token or credentials.

import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { env } from '../../../scripts/lib/env.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const PROJECT = '2026-08-ep3-projects';
const STAGING = `/home/victor/Projects/_artifacts/video/${PROJECT}`;
const API_ROOT = 'http://127.0.0.1:7200/api/v1';
const AUTH_STATE = env('DASH_STORAGE_STATE');

if (!AUTH_STATE) throw new Error('DASH_STORAGE_STATE is not configured');

async function readAccessToken() {
  const state = JSON.parse(await readFile(resolve(AUTH_STATE), 'utf8'));
  for (const origin of state.origins ?? []) {
    const entry = (origin.localStorage ?? []).find((item) => item.name === 'claw-auth');
    if (!entry) continue;
    const auth = JSON.parse(entry.value);
    const token = auth?.state?.tokens?.accessToken;
    if (token) return token;
  }
  throw new Error('Paco access token is missing from storageState');
}

const token = await readAccessToken();

async function api(path, { method = 'GET', body } = {}) {
  const response = await fetch(`${API_ROOT}${path}`, {
    method,
    headers: {
      authorization: `Bearer ${token}`,
      ...(body === undefined ? {} : { 'content-type': 'application/json' }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`${method} ${path} failed with ${response.status}`);
  const payload = await response.json();
  return payload.data;
}

const boards = await api('/projects/boards?limit=100');
const board = boards.find((item) => item.title === 'Valencia Beach Show')
  ?? boards.find((item) => item.title === 'BoomClaw Operations Q1 2026');

if (!board) throw new Error('The reusable BoomClaw demo board does not exist');

let fullBoard = await api(`/projects/boards/${board.id}`);

// The full-board response carries the current cards inside each column. Use
// that unpaginated live view: the list endpoint also returns archived history,
// and after many rehearsals its first 100 rows no longer represent the board.
// Preserve every previous demo record by archiving it (reversible), never delete.
const activeBefore = (fullBoard.columns ?? [])
  .flatMap((column) => column.cards ?? [])
  .filter((card) => !card.archived);
for (const card of activeBefore) {
  await api(`/projects/boards/${board.id}/cards/${card.id}/archive`, { method: 'POST' });
}

await api(`/projects/boards/${board.id}`, {
  method: 'PATCH',
  body: {
    title: 'Valencia Beach Show',
    description: 'Every task for the BoomClaw beach show, from supplier orders to the final firing sequence.',
    color: '#f2b621',
    icon: '🎆',
    default_view: 'board',
    tags: ['valencia', 'beach-show', 'operations'],
    settings: {
      showCardNumbers: true,
      defaultPriority: 'medium',
      cardAging: { enabled: false, daysToAge: 14 },
      background: {
        type: 'gradient',
        value: 'radial-gradient(circle at 18% 16%, #26364d 0%, #111827 46%, #08080e 100%)',
      },
    },
  },
});

fullBoard = await api(`/projects/boards/${board.id}`);
const existingColumns = [...(fullBoard.columns ?? [])].sort((a, b) => a.position - b.position);
if (existingColumns.length !== 5) {
  throw new Error(`Expected 5 reusable columns, found ${existingColumns.length}`);
}

const columnPlan = [
  { title: 'Backlog', color: '#64748b', semantic: 'needs_action' },
  { title: 'Ready', color: '#0ea5e9', semantic: 'needs_action' },
  { title: 'In Progress', color: '#f59e0b', semantic: 'in_progress' },
  { title: 'Review', color: '#a855f7', semantic: null },
  { title: 'Done', color: '#22c55e', semantic: 'completed' },
];

const columns = {};
for (let index = 0; index < columnPlan.length; index += 1) {
  const current = existingColumns[index];
  const target = columnPlan[index];
  await api(`/projects/boards/${board.id}/columns/${current.id}`, {
    method: 'PATCH',
    body: {
      title: target.title,
      color: target.color,
      wip_limit: target.title === 'In Progress' ? 4 : null,
      status_semantic: target.semantic,
    },
  });
  await api(`/projects/boards/${board.id}/columns/${current.id}/reorder`, {
    method: 'PATCH',
    body: { position: index },
  });
  columns[target.title] = current.id;
}

const check = (id, text, checked) => ({ id, text, checked });
const cardPlan = [
  {
    column: 'Backlog', title: 'Finalize permit pack', priority: 'urgent',
    description: 'Collect the final municipal documents before the beach build starts.',
    start_date: '2026-08-07', due_date: '2026-08-08', tags: ['permit', 'council'], color: '#ef4444',
    checklist: [check('permit-form', 'Signed event form', true), check('insurance-copy', 'Insurance certificate', true), check('coast-copy', 'Coastal authority copy', false)],
  },
  {
    column: 'Backlog', title: 'Book crew transport', priority: 'medium',
    description: 'Two vans from the warehouse to Malvarrosa, plus the return run after teardown.',
    start_date: '2026-08-07', due_date: '2026-08-08', tags: ['crew', 'logistics'], color: '#38bdf8',
    checklist: [check('drivers', 'Confirm drivers', true), check('load-space', 'Reserve load space', false)],
  },
  {
    column: 'Backlog', title: 'Print spectator maps', priority: 'low',
    description: 'Mark entrances, viewing zones, first aid, and the safety perimeter.',
    start_date: '2026-08-08', due_date: '2026-08-09', tags: ['public', 'print'], color: '#94a3b8',
    checklist: [check('map-proof', 'Approve map proof', false), check('map-print', 'Print 250 copies', false)],
  },
  {
    column: 'Ready', title: 'Weather sign-off', priority: 'urgent',
    description: 'Make the final go or no-go call with wind and rain observations in one place.',
    start_date: '2026-08-08', due_date: '2026-08-09', tags: ['weather', 'safety'], color: '#f97316',
    checklist: [check('aemet', 'Check AEMET forecast', true), check('wind', 'Confirm wind window', false), check('rain', 'Review rain contingency', false)],
  },
  {
    column: 'Ready', title: 'Confirm crew call', priority: 'high',
    description: 'Send final call times and access instructions to every crew lead.',
    start_date: '2026-08-08', due_date: '2026-08-08', tags: ['crew', 'briefing'], color: '#0ea5e9',
    checklist: [check('pyro-call', 'Pyro crew confirmed', true), check('security-call', 'Security confirmed', false), check('medical-call', 'Medical team confirmed', false)],
  },
  {
    column: 'Ready', title: 'Lock beach access', priority: 'medium',
    description: 'Confirm loading gate, key holder, and the vehicle access window.',
    start_date: '2026-08-08', due_date: '2026-08-09', tags: ['site', 'logistics'], color: '#14b8a6',
    checklist: [check('gate', 'Gate number confirmed', true), check('key', 'Key holder assigned', false)],
  },
  {
    column: 'In Progress', title: 'Order shells', priority: 'high',
    description: 'Finalize the shell allocation with Professor Flash McBang at Dragon Fireworks.',
    start_date: '2026-08-06', due_date: '2026-08-08', tags: ['supplier', 'fireworks'], color: '#f2b621',
    checklist: [check('calibres', 'Confirm calibres', true), check('quantities', 'Confirm quantities', true), check('dispatch', 'Release final dispatch', false)],
  },
  {
    column: 'In Progress', title: 'Mark firing positions', priority: 'high',
    description: 'Transfer the approved site plan to physical markers on the beach.',
    start_date: '2026-08-07', due_date: '2026-08-08', tags: ['site', 'safety'], color: '#f59e0b',
    checklist: [check('measure', 'Measure separation distances', true), check('stakes', 'Place numbered stakes', false), check('photo', 'Photograph final layout', false)],
  },
  {
    column: 'In Progress', title: 'Council safety pack', priority: 'urgent',
    description: 'Bundle the final risk map, insurance, firing sequence, and emergency contacts.',
    start_date: '2026-08-07', due_date: '2026-08-08', tags: ['council', 'safety'], color: '#dc2626',
    checklist: [check('risk-map', 'Risk map', true), check('insurance', 'Insurance', true), check('sequence', 'Firing sequence', false), check('contacts', 'Emergency contacts', false)],
  },
  {
    column: 'Review', title: 'Firing sequence', priority: 'high',
    description: 'Review the final cue order, pace, shell groups, and closing volley before print.',
    start_date: '2026-08-07', due_date: '2026-08-08', tags: ['show', 'sequence'], color: '#a855f7',
    checklist: [check('opening', 'Opening sequence', true), check('middle', 'Middle sequence', true), check('finale', 'Finale timing', true), check('print', 'Print operator copy', false)],
  },
  {
    column: 'Review', title: 'Safety perimeter plan', priority: 'high',
    description: 'Final review of exclusion zones, audience edges, and emergency access.',
    start_date: '2026-08-07', due_date: '2026-08-08', tags: ['safety', 'site'], color: '#8b5cf6',
    checklist: [check('distance', 'Distances checked', true), check('medical', 'Medical lane clear', true), check('signoff', 'Council sign-off', false)],
  },
  {
    column: 'Done', title: 'Site inspection', priority: 'high',
    description: 'Beach inspection completed with the municipal safety team.',
    start_date: '2026-08-06', due_date: '2026-08-07', tags: ['site', 'complete'], color: '#22c55e', completed: true,
    checklist: [check('walk', 'Walk the firing line', true), check('access', 'Check emergency access', true)],
  },
  {
    column: 'Done', title: 'Final rehearsal booked', priority: 'medium',
    description: 'Warehouse rehearsal is on the calendar and the crew has the call time.',
    start_date: '2026-08-05', due_date: '2026-08-07', tags: ['rehearsal', 'complete'], color: '#16a34a', completed: true,
    checklist: [check('calendar', 'Calendar event created', true), check('crew', 'Crew notified', true)],
  },
  {
    column: 'Done', title: 'Rain contingency approved', priority: 'medium',
    description: 'The make-up date and wet-weather operating limits are agreed.',
    start_date: '2026-08-04', due_date: '2026-08-07', tags: ['weather', 'complete'], color: '#10b981', completed: true,
    checklist: [check('date', 'Make-up date agreed', true), check('limits', 'Weather limits agreed', true)],
  },
];

const cards = {};
for (const item of cardPlan) {
  const created = await api(`/projects/boards/${board.id}/cards`, {
    method: 'POST',
    body: {
      column_id: columns[item.column],
      title: item.title,
      description: item.description,
      priority: item.priority,
      color: item.color,
      start_date: item.start_date,
      due_date: item.due_date,
      tags: item.tags,
      checklist: item.checklist,
    },
  });
  cards[item.title] = created.id;
  if (item.completed) {
    await api(`/projects/boards/${board.id}/cards/${created.id}`, {
      method: 'PATCH',
      body: { completed_at: '2026-08-07T10:00:00+02:00' },
    });
  }
}

await api(`/projects/boards/${board.id}/dependencies`, {
  method: 'POST',
  body: {
    blocking_card_id: cards['Order shells'],
    blocked_card_id: cards['Firing sequence'],
    type: 'blocks',
  },
});
await api(`/projects/boards/${board.id}/dependencies`, {
  method: 'POST',
  body: {
    blocking_card_id: cards['Safety perimeter plan'],
    blocked_card_id: cards['Council safety pack'],
    type: 'blocks',
  },
});

const notes = await api(`/notes?search=${encodeURIComponent('Rain contingency')}&limit=10`);
const contacts = await api(`/contacts?search=${encodeURIComponent('Professor Flash McBang')}&limit=10`);
const rainNote = notes.find((item) => item.title === 'Rain contingency — Valencia beach show');
const supplier = contacts.find((item) => (item.name ?? item.display_name) === 'Professor Flash McBang');
if (!rainNote || !supplier) throw new Error('Required cross-domain demo records are missing');

for (const cardTitle of ['Order shells', 'Firing sequence']) {
  await api(`/projects/boards/${board.id}/cards/${cards[cardTitle]}/links`, {
    method: 'POST',
    body: { target_type: 'note', target_id: rainNote.id, relationship: 'supports' },
  });
}
await api(`/projects/boards/${board.id}/cards/${cards['Order shells']}/links`, {
  method: 'POST',
  body: { target_type: 'contact', target_id: supplier.id, relationship: 'supplier' },
});

const verified = await api(`/projects/boards/${board.id}`);
const visibleCards = (verified.columns ?? [])
  .flatMap((column) => column.cards ?? [])
  .filter((card) => !card.archived);
const manifest = {
  project: PROJECT,
  board_id: board.id,
  board_title: verified.title,
  columns: Object.fromEntries((verified.columns ?? []).map((item) => [item.title, item.id])),
  cards,
  note_id: rainNote.id,
  supplier_id: supplier.id,
  verified_at: new Date().toISOString(),
};

await mkdir(STAGING, { recursive: true });
await writeFile(`${STAGING}/staging.json`, `${JSON.stringify(manifest, null, 2)}\n`);

const columnCounts = Object.fromEntries(
  (verified.columns ?? []).map((column) => [
    column.title,
    visibleCards.filter((card) => card.column_id === column.id).length,
  ]),
);

console.log(JSON.stringify({
  board: verified.title,
  columns: columnCounts,
  total_cards: visibleCards.length,
  archived_before_seed: activeBefore.length,
  dependencies: 2,
  linked_records: ['Rain contingency — Valencia beach show', 'Professor Flash McBang'],
}, null, 2));
