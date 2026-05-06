const STORAGE_KEY = 'bbhqmap_data';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzdW1hZ2tvdWVyaWtlaGFtYnd6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwNTEzMTEsImV4cCI6MjA5MzYyNzMxMX0.-k6N7oKKXGmIldDMLPyFxiIhB9mmYLIcAmCOT95eoRU';
const BASE_URL = 'https://usumagkouerikehambwz.supabase.co/rest/v1/map_data';

const HEADERS = {
  'apikey': ANON_KEY,
  'Authorization': `Bearer ${ANON_KEY}`,
  'Content-Type': 'application/json',
};

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
    const res = await fetch(
      `${BASE_URL}?select=data&id=eq.lalbagh`,
      { headers: HEADERS },
    );
    if (!res.ok) {
      console.error('bbhqmap: cloud load failed', res.status, await res.text());
      return null;
    }
    const rows = await res.json();
    if (!rows.length) return null;
    return { ...TEMPLATE, ...rows[0].data };
  } catch (err) {
    console.error('bbhqmap: cloud load error', err);
    return null;
  }
}

export async function syncToCloud(payload) {
  try {
    const res = await fetch(BASE_URL, {
      method: 'POST',
      headers: { ...HEADERS, 'Prefer': 'resolution=merge-duplicates' },
      body: JSON.stringify({ id: 'lalbagh', data: payload }),
    });
    if (!res.ok) {
      console.error('bbhqmap: cloud sync failed', res.status, await res.text());
      pushStatus('error');
      return;
    }
    pushStatus('ok');
  } catch (err) {
    console.error('bbhqmap: cloud sync error', err);
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
