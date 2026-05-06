import { supabase } from '../lib/supabase';

const STORAGE_KEY = 'bbhqmap_data';
const ROW_ID = 'lalbagh';

const TEMPLATE = {
  version: '1.0',
  createdAt: null,
  updatedAt: null,
  venue: 'Lalbagh Botanical Garden',
  mapAsset: 'lalbagh_base.png',
  mapDimensions: { widthPx: 4500, heightPx: 3524 },
  spots: [],
  routes: [],
  zones: [],
};

// ── Status callback ────────────────────────────────────────────────────────────
// App registers a listener so storage can push sync status without circular deps.
let _onSyncStatus = null;
export function onSyncStatusChange(cb) {
  _onSyncStatus = cb;
}
function pushStatus(status) {
  if (_onSyncStatus) _onSyncStatus(status);
}

// ── Local storage ──────────────────────────────────────────────────────────────
export function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...TEMPLATE };
    return { ...TEMPLATE, ...JSON.parse(raw) };
  } catch {
    return { ...TEMPLATE };
  }
}

function writeLocal(record) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
}

// ── Cloud ──────────────────────────────────────────────────────────────────────
export async function loadDataFromCloud() {
  try {
    const { data, error } = await supabase
      .from('map_data')
      .select('data')
      .eq('id', ROW_ID)
      .single();
    if (error || !data) return null;
    return { ...TEMPLATE, ...data.data };
  } catch {
    return null;
  }
}

async function syncToCloud(payload) {
  try {
    const { error } = await supabase
      .from('map_data')
      .upsert({ id: ROW_ID, data: payload });
    if (error) throw error;
    pushStatus('ok');
  } catch (err) {
    console.error('bbhqmap: Supabase sync failed', err);
    pushStatus('error');
  }
}

// ── Unified save helpers ───────────────────────────────────────────────────────
function buildRecord(updates) {
  const existing = loadData();
  const now = new Date().toISOString();
  return {
    ...existing,
    createdAt: existing.createdAt || now,
    updatedAt: now,
    ...updates,
  };
}

function persistAndSync(record) {
  writeLocal(record);
  pushStatus('syncing');
  syncToCloud(record);
}

export function saveSpots(spots) {
  try {
    persistAndSync(buildRecord({ spots }));
  } catch (err) {
    console.error('bbhqmap: save failed', err);
  }
}

export function saveRoutes(routes) {
  try {
    persistAndSync(buildRecord({ routes }));
  } catch (err) {
    console.error('bbhqmap: save failed', err);
  }
}
