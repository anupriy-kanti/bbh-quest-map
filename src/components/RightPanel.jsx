import MetadataPanel from './MetadataPanel';
import RoutePanel from './RoutePanel';

// ── Stats view ────────────────────────────────────────────────────────────────

const STORY_LEVEL_ORDER = ['L1', 'L2', 'L3', 'L4', 'L5'];

function StatRow({ label, value }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
      padding: '5px 0',
      borderBottom: '1px solid rgba(245,210,193,0.07)',
    }}>
      <span style={{ fontSize: 13, color: 'rgba(245,210,193,0.75)' }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 600, color: '#f5d2c1' }}>{value}</span>
    </div>
  );
}

function StatSection({ title, children }) {
  return (
    <section style={{ marginBottom: 20 }}>
      <h3 style={{
        margin: '0 0 8px',
        fontSize: 11, fontWeight: 600,
        letterSpacing: '0.08em', textTransform: 'uppercase',
        color: 'rgba(245,210,193,0.45)',
      }}>
        {title}
      </h3>
      {children}
    </section>
  );
}

function StatsView({ spots }) {
  // ── Overview header ──────────────────────────────────────────────────────
  const header = (
    <div style={{
      padding: '14px 20px',
      borderBottom: '1px solid rgba(245,210,193,0.15)',
      flexShrink: 0,
    }}>
      <h2 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: '#f5d2c1' }}>
        Overview
      </h2>
    </div>
  );

  if (spots.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        {header}
        <div style={{ padding: '24px 20px', color: 'rgba(245,210,193,0.55)', fontSize: 13, lineHeight: 1.7 }}>
          No spots marked yet. Click anywhere on the map to place your first pin.
        </div>
      </div>
    );
  }

  // ── Derive counts ────────────────────────────────────────────────────────
  const questCounts      = {};
  const typeCounts       = {};
  const recurrenceCounts = {};
  const levelCounts      = {};

  spots.forEach(spot => {
    (spot.relatedQuests || []).forEach(q => {
      questCounts[q] = (questCounts[q] || 0) + 1;
    });
    if (spot.itemType)       typeCounts[spot.itemType]             = (typeCounts[spot.itemType] || 0) + 1;
    if (spot.itemRecurrence) recurrenceCounts[spot.itemRecurrence] = (recurrenceCounts[spot.itemRecurrence] || 0) + 1;
    if (spot.storyLevel)     levelCounts[spot.storyLevel]          = (levelCounts[spot.storyLevel] || 0) + 1;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {header}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 20px 24px' }}>

        <StatSection title="Total">
          <StatRow label="Spots marked" value={spots.length} />
        </StatSection>

        {Object.keys(questCounts).length > 0 && (
          <StatSection title="By Quest">
            {Object.entries(questCounts)
              .sort((a, b) => b[1] - a[1])
              .map(([q, n]) => <StatRow key={q} label={q} value={n} />)}
          </StatSection>
        )}

        {Object.keys(typeCounts).length > 0 && (
          <StatSection title="By Item Type">
            {Object.entries(typeCounts)
              .sort((a, b) => b[1] - a[1])
              .map(([t, n]) => <StatRow key={t} label={t} value={n} />)}
          </StatSection>
        )}

        {Object.keys(recurrenceCounts).length > 0 && (
          <StatSection title="By Recurrence">
            {Object.entries(recurrenceCounts)
              .sort((a, b) => b[1] - a[1])
              .map(([r, n]) => <StatRow key={r} label={r} value={n} />)}
          </StatSection>
        )}

        {Object.keys(levelCounts).length > 0 && (
          <StatSection title="By Story Level">
            {STORY_LEVEL_ORDER
              .filter(l => levelCounts[l])
              .map(l => <StatRow key={l} label={l} value={levelCounts[l]} />)}
          </StatSection>
        )}

      </div>
    </div>
  );
}

// ── RightPanel ────────────────────────────────────────────────────────────────
// Always visible. Shows StatsView when no spot is selected, MetadataPanel otherwise.

export default function RightPanel({
  spots,
  selectedSpot,
  onClose,
  onSave,
  onDelete,
  draft,
  onDraftChange,
  onMoveStart,
  selectedRoute,
  onRouteSave,
  onRouteDelete,
}) {
  return (
    <div
      style={{
        width: 360,
        minWidth: 360,
        height: '100%',
        backgroundColor: '#420424',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        borderLeft: '1px solid rgba(245,210,193,0.1)',
      }}
    >
      {selectedSpot ? (
        <MetadataPanel
          spot={selectedSpot}
          onClose={onClose}
          onSave={onSave}
          onDelete={onDelete}
          draft={draft}
          onDraftChange={onDraftChange}
          onMoveStart={onMoveStart}
        />
      ) : selectedRoute ? (
        <RoutePanel
          route={selectedRoute}
          onSave={onRouteSave}
          onDelete={onRouteDelete}
        />
      ) : (
        <StatsView spots={spots} />
      )}
    </div>
  );
}
