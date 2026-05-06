import { useState, useCallback, useEffect } from 'react';
import MapCanvas from './components/MapCanvas';
import RightPanel from './components/RightPanel';
import Toolbar from './components/Toolbar';
import { loadData, loadDataFromCloud, syncToCloud, saveSpots, saveRoutes, onSyncStatusChange } from './utils/storage';
import { QUEST_COLOURS } from './constants/questColours';

const QUEST_CODES = Object.keys(QUEST_COLOURS).filter(k => k !== 'BBH');

function FinishRouteForm({ onSave, onCancel, routes = [] }) {
  const [name, setName] = useState('');
  const [questCode, setQuestCode] = useState('');
  const canSave = name.trim().length > 0 && questCode.length > 0;

  const handleQuestChange = (e) => {
    const code = e.target.value;
    setQuestCode(code);
    if (code) {
      const count = routes.filter(r => r.questCode === code).length;
      setName(`${code} Route ${count + 1}`);
    }
  };

  const inputStyle = {
    width: '100%', boxSizing: 'border-box',
    background: 'rgba(0,0,0,0.35)',
    border: '1px solid rgba(245,210,193,0.2)',
    borderRadius: 8, padding: '7px 10px',
    color: '#f5d2c1', fontSize: 13, outline: 'none',
    fontFamily: 'system-ui, sans-serif',
  };
  const labelStyle = {
    display: 'block', marginBottom: 5,
    fontSize: 11, fontWeight: 600, letterSpacing: '0.07em',
    textTransform: 'uppercase', color: 'rgba(245,210,193,0.55)',
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      backgroundColor: 'rgba(0,0,0,0.6)',
    }}>
      <div style={{
        backgroundColor: '#420424',
        border: '1px solid rgba(245,210,193,0.18)',
        borderRadius: 14, padding: '24px 28px',
        width: 300, fontFamily: 'system-ui, sans-serif',
      }}>
        <h3 style={{ margin: '0 0 20px', fontSize: 15, fontWeight: 600, color: '#f5d2c1' }}>
          Save Route
        </h3>

        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Route name</label>
          <input
            autoFocus
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && canSave) onSave(name.trim(), questCode); }}
            placeholder="e.g. VePQ Route 1"
            style={inputStyle}
          />
        </div>

        <div style={{ marginBottom: 24 }}>
          <label style={labelStyle}>Quest</label>
          <select
            value={questCode}
            onChange={handleQuestChange}
            style={{ ...inputStyle, cursor: 'pointer', appearance: 'none', WebkitAppearance: 'none' }}
          >
            <option value="" style={{ background: '#2a0118' }}>Select a Quest…</option>
            {QUEST_CODES.map(q => (
              <option key={q} value={q} style={{ background: '#2a0118' }}>{q}</option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={() => canSave && onSave(name.trim(), questCode)}
            style={{
              flex: 1, padding: '8px 0',
              background: canSave ? 'rgba(245,210,193,0.2)' : 'rgba(245,210,193,0.07)',
              border: '1px solid rgba(245,210,193,0.25)',
              borderRadius: 8, color: canSave ? '#f5d2c1' : 'rgba(245,210,193,0.35)',
              fontSize: 13, fontWeight: 600, cursor: canSave ? 'pointer' : 'default',
              fontFamily: 'system-ui, sans-serif',
            }}
          >
            Save
          </button>
          <button
            onClick={onCancel}
            style={{
              flex: 1, padding: '8px 0',
              background: 'rgba(255,255,255,0.07)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 8, color: 'rgba(255,255,255,0.6)',
              fontSize: 13, fontWeight: 600, cursor: 'pointer',
              fontFamily: 'system-ui, sans-serif',
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

function makeBlankSpot(lng, lat) {
  const now = new Date().toISOString();
  return {
    spotId:             crypto.randomUUID(),
    shortLabel:         '',
    landMark:           '',
    createdAt:          now,
    updatedAt:          now,
    lat,
    lng,
    emoticon:           '',
    itemName:           '',
    itemType:           '',
    itemRecurrence:     '',
    botanicalName:      '',
    mytId:              '',
    priId:              '',
    relatedQuests:      [],
    storyLevel:         '',
    primaryNarrative:   '',
    secondaryNarrative: '',
    tertiaryNarrative:  '',
    notionUrl:          '',
  };
}

export default function App() {
  const [spots,                  setSpots]                  = useState(() => loadData().spots ?? []);
  const [routes,                 setRoutes]                 = useState(() => loadData().routes ?? []);
  const [syncStatus,             setSyncStatus]             = useState('idle');
  const [selectedSpotId,         setSelectedSpotId]         = useState(null);
  const [selectedRouteId,        setSelectedRouteId]        = useState(null);
  const [selectedWaypointIndex,  setSelectedWaypointIndex]  = useState(null);
  const [drafts,                 setDrafts]                 = useState({});
  const [movingSpotId,           setMovingSpotId]           = useState(null);
  const [showLabels,             setShowLabels]             = useState(true);
  const [drawMode,               setDrawMode]               = useState(false);
  const [draftPath,              setDraftPath]              = useState([]);
  const [showFinishForm,         setShowFinishForm]         = useState(false);

  const selectedSpot  = spots.find(s => s.spotId === selectedSpotId) ?? null;
  const selectedRoute = routes.find(r => r.routeId === selectedRouteId) ?? null;

  // ── Cloud sync init ────────────────────────────────────────────────────────
  useEffect(() => {
    onSyncStatusChange(setSyncStatus);

    const local = loadData();

    loadDataFromCloud().then(cloudData => {
      if (cloudData) {
        setSpots(cloudData.spots ?? []);
        setRoutes(cloudData.routes ?? []);
        localStorage.setItem('bbhqmap_data', JSON.stringify(cloudData));
      } else {
        // Cloud had no row — push existing localStorage data up immediately
        setSyncStatus('syncing');
        syncToCloud(local);
      }
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Map interaction ────────────────────────────────────────────────────────

  const handleMapClick = useCallback((lng, lat) => {
    if (drawMode) {
      setDraftPath(prev => [...prev, { nodeType: 'waypoint', x: lng, y: lat }]);
      return;
    }
    const spot = makeBlankSpot(lng, lat);
    setSpots(prev => [...prev, spot]);
    setSelectedSpotId(spot.spotId);
  }, [drawMode]);

  const handleRouteClick = useCallback((routeId) => {
    setSelectedRouteId(routeId);
    setSelectedSpotId(null);
    setSelectedWaypointIndex(null);
  }, []);

  const handleRouteDeselect = useCallback(() => {
    setSelectedRouteId(null);
    setSelectedWaypointIndex(null);
  }, []);

  const handleSaveRoute = useCallback((updatedRoute) => {
    setRoutes(prev => {
      const next = prev.map(r => r.routeId === updatedRoute.routeId ? updatedRoute : r);
      saveRoutes(next);
      return next;
    });
    setSelectedRouteId(null);
  }, []);

  const handleDeleteRoute = useCallback((routeId) => {
    setRoutes(prev => {
      const next = prev.filter(r => r.routeId !== routeId);
      saveRoutes(next);
      return next;
    });
    setSelectedRouteId(null);
  }, []);

  const handlePinClick = useCallback((spotId) => {
    if (drawMode) {
      setDraftPath(prev => [...prev, { nodeType: 'spot', spotId }]);
      return;
    }
    setSelectedSpotId(spotId);
    setSelectedWaypointIndex(null);
  }, [drawMode]);

  // ── Panel lifecycle ────────────────────────────────────────────────────────

  const handleClosePanel = useCallback(() => {
    setSelectedSpotId(null);
  }, []);

  const handleSaveSpot = useCallback((updatedSpot) => {
    const saved = { ...updatedSpot, updatedAt: new Date().toISOString() };
    setSpots(prev => {
      const next = prev.map(s => s.spotId === saved.spotId ? saved : s);
      saveSpots(next);
      return next;
    });
    setDrafts(prev => {
      const next = { ...prev };
      delete next[saved.spotId];
      return next;
    });
    setSelectedSpotId(null);
  }, []);

  const handleDeleteSpot = useCallback((spotId) => {
    setSpots(prev => {
      const next = prev.filter(s => s.spotId !== spotId);
      saveSpots(next);
      return next;
    });
    setDrafts(prev => {
      const next = { ...prev };
      delete next[spotId];
      return next;
    });
    setSelectedSpotId(null);
  }, []);

  // ── Draft auto-save ────────────────────────────────────────────────────────

  const handleDraftChange = useCallback((spotId, data) => {
    setDrafts(prev => ({ ...prev, [spotId]: data }));
  }, []);

  // ── Move Spot ──────────────────────────────────────────────────────────────

  const handleMoveStart = useCallback((spotId) => {
    setSelectedSpotId(null);
    setMovingSpotId(spotId);
  }, []);

  const handleMoveConfirm = useCallback((lng, lat) => {
    const spotId = movingSpotId;
    if (!spotId) return;
    setSpots(prev => {
      const next = prev.map(s => s.spotId === spotId ? { ...s, lat, lng } : s);
      saveSpots(next);
      return next;
    });
    setDrafts(prev =>
      prev[spotId] ? { ...prev, [spotId]: { ...prev[spotId], lat, lng } } : prev,
    );
    setMovingSpotId(null);
    setSelectedSpotId(spotId);
  }, [movingSpotId]);

  const handleMoveCancelAndSelect = useCallback((spotId) => {
    setMovingSpotId(null);
    setSelectedSpotId(spotId);
  }, []);

  // ── Draw mode ──────────────────────────────────────────────────────────────

  const handleToggleDrawMode = useCallback(() => {
    if (drawMode) {
      setDrawMode(false);
      setDraftPath([]);
      setShowFinishForm(false);
    } else {
      setDrawMode(true);
      setSelectedSpotId(null);
      setSelectedRouteId(null);
      setMovingSpotId(null);
    }
  }, [drawMode]);

  const handleCancelDraw = useCallback(() => {
    setDrawMode(false);
    setDraftPath([]);
    setShowFinishForm(false);
  }, []);

  const handleFinishRouteRequest = useCallback(() => {
    setShowFinishForm(true);
  }, []);

  const handleFinishRouteSave = useCallback((name, questCode) => {
    const routeColour = QUEST_COLOURS[questCode]?.display || '#420424';
    const route = {
      routeId: crypto.randomUUID(),
      name,
      questCode,
      colour: routeColour,
      path: draftPath.map((node, i) => {
        if (i === draftPath.length - 1) return { ...node };
        return { ...node, strokeAfter: { style: 'solid', colour: routeColour, weight: 4 } };
      }),
    };
    setRoutes(prev => {
      const next = [...prev, route];
      saveRoutes(next);
      return next;
    });
    setDraftPath([]);
    setDrawMode(false);
    setShowFinishForm(false);
  }, [draftPath]);

  const handleWaypointDragEnd = useCallback((routeId, nodeIndex, x, y) => {
    setRoutes(prev => {
      const next = prev.map(r => {
        if (r.routeId !== routeId) return r;
        const path = r.path.map((node, i) =>
          i === nodeIndex ? { ...node, x, y } : node
        );
        return { ...r, path };
      });
      saveRoutes(next);
      return next;
    });
  }, []);

  const handleWaypointSelect = useCallback((routeId, nodeIndex) => {
    if (routeId !== selectedRouteId) return;
    setSelectedWaypointIndex(nodeIndex);
  }, [selectedRouteId]);

  const handleDeleteWaypoint = useCallback(() => {
    if (selectedWaypointIndex === null || !selectedRoute) return;
    const node = selectedRoute.path[selectedWaypointIndex];
    if (!node || node.nodeType !== 'waypoint') return;
    if (selectedRoute.path.length <= 2) return;
    setRoutes(prev => {
      const next = prev.map(r => {
        if (r.routeId !== selectedRouteId) return r;
        const path = r.path.filter((_, i) => i !== selectedWaypointIndex);
        return { ...r, path };
      });
      saveRoutes(next);
      return next;
    });
    setSelectedWaypointIndex(null);
  }, [selectedWaypointIndex, selectedRoute, selectedRouteId]);

  useEffect(() => {
    const handler = (e) => {
      if (selectedWaypointIndex === null) return;
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        handleDeleteWaypoint();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [selectedWaypointIndex, handleDeleteWaypoint]);

  const handleInsertWaypoint = useCallback((routeId, segmentIndex, x, y) => {
    setRoutes(prev => {
      const next = prev.map(r => {
        if (r.routeId !== routeId) return r;
        const newNode = { nodeType: 'waypoint', x, y };
        const path = [
          ...r.path.slice(0, segmentIndex + 1),
          newNode,
          ...r.path.slice(segmentIndex + 1),
        ];
        return { ...r, path };
      });
      saveRoutes(next);
      return next;
    });
  }, []);

  const handleSegmentDragEnd = useCallback((routeId, movedNodes) => {
    setRoutes(prev => {
      const next = prev.map(r => {
        if (r.routeId !== routeId) return r;
        const path = r.path.map((node, i) => {
          const moved = movedNodes.find(m => m.nodeIndex === i);
          return moved ? { ...node, x: moved.x, y: moved.y } : node;
        });
        return { ...r, path };
      });
      saveRoutes(next);
      return next;
    });
  }, []);

  // ── Label toggle ───────────────────────────────────────────────────────────

  const handleToggleLabels = useCallback(() => {
    setShowLabels(prev => !prev);
  }, []);

  // ── Layout ─────────────────────────────────────────────────────────────────

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
      }}
    >
      <Toolbar
        showLabels={showLabels}
        onToggleLabels={handleToggleLabels}
        drawMode={drawMode}
        draftNodeCount={draftPath.length}
        onToggleDrawMode={handleToggleDrawMode}
        onFinishRoute={handleFinishRouteRequest}
        onCancelDraw={handleCancelDraw}
        syncStatus={syncStatus}
      />

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <main style={{ flex: 1, overflow: 'hidden', backgroundColor: '#1a0112' }}>
          <MapCanvas
            spots={spots}
            routes={routes}
            draftPath={draftPath}
            drawMode={drawMode}
            onMapClick={handleMapClick}
            onPinClick={handlePinClick}
            onRouteClick={handleRouteClick}
            onRouteDeselect={handleRouteDeselect}
            selectedSpotId={selectedSpotId}
            selectedRouteId={selectedRouteId}
            selectedWaypointIndex={selectedWaypointIndex}
            onWaypointSelect={handleWaypointSelect}
            showLabels={showLabels}
            movingSpotId={movingSpotId}
            onMoveConfirm={handleMoveConfirm}
            onMoveCancelAndSelect={handleMoveCancelAndSelect}
            onWaypointDragEnd={handleWaypointDragEnd}
            onInsertWaypoint={handleInsertWaypoint}
            onSegmentDragEnd={handleSegmentDragEnd}
          />
        </main>

        <RightPanel
          spots={spots}
          selectedSpot={selectedSpot}
          onClose={handleClosePanel}
          onSave={handleSaveSpot}
          onDelete={handleDeleteSpot}
          draft={drafts[selectedSpotId]}
          onDraftChange={handleDraftChange}
          onMoveStart={handleMoveStart}
          selectedRoute={selectedRoute}
          onRouteSave={handleSaveRoute}
          onRouteDelete={handleDeleteRoute}
          selectedWaypointIndex={selectedWaypointIndex}
          onDeleteWaypoint={handleDeleteWaypoint}
        />
      </div>

      {showFinishForm && (
        <FinishRouteForm
          onSave={handleFinishRouteSave}
          onCancel={handleCancelDraw}
          routes={routes}
        />
      )}
    </div>
  );
}
