const STORAGE_KEY = 'bbhqmap_data';

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

export function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...TEMPLATE };
    return { ...TEMPLATE, ...JSON.parse(raw) };
  } catch {
    return { ...TEMPLATE };
  }
}

export function saveSpots(spots) {
  try {
    const existing = loadData();
    const now = new Date().toISOString();
    const record = {
      ...existing,
      createdAt: existing.createdAt || now,
      updatedAt: now,
      spots,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
  } catch (err) {
    console.error('bbhqmap: localStorage write failed', err);
  }
}

export function saveRoutes(routes) {
  try {
    const existing = loadData();
    const now = new Date().toISOString();
    const record = {
      ...existing,
      createdAt: existing.createdAt || now,
      updatedAt: now,
      routes,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
  } catch (err) {
    console.error('bbhqmap: localStorage write failed', err);
  }
}
