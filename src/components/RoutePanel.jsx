import { useState } from 'react';
import { QUEST_COLOURS } from '../constants/questColours';

const QUEST_KEYS = Object.keys(QUEST_COLOURS).filter(k => k !== 'BBH');

const inputBase = {
  width: '100%', boxSizing: 'border-box',
  background: 'rgba(245,210,193,0.08)',
  border: '1px solid rgba(245,210,193,0.2)',
  borderRadius: 4, padding: '7px 10px',
  color: '#f5d2c1', fontSize: 13, outline: 'none',
  fontFamily: 'system-ui, sans-serif',
};

const labelStyle = {
  display: 'block', marginBottom: 5,
  fontSize: 11, fontWeight: 600, letterSpacing: '0.06em',
  textTransform: 'uppercase', color: 'rgba(245,210,193,0.55)',
};

export default function RoutePanel({ route, onSave, onDelete, selectedWaypointIndex, onDeleteWaypoint }) {
  const [name,     setName]     = useState(route.name);
  const [questKey, setQuestKey] = useState(route.questCode || '');
  const [customHex, setCustomHex] = useState(route.colour || '');

  const questHasColour = questKey && !!QUEST_COLOURS[questKey]?.display;
  const canSave = name.trim().length > 0;

  const handleSave = () => {
    if (!canSave) return;
    const colour = questHasColour
      ? QUEST_COLOURS[questKey].display
      : (customHex || route.colour);
    onSave({ ...route, name: name.trim(), questCode: questKey, colour });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{
        padding: '14px 20px',
        borderBottom: '1px solid rgba(245,210,193,0.15)',
        flexShrink: 0,
      }}>
        <h2 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: '#f5d2c1' }}>
          Route
        </h2>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 20px 24px' }}>

        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Route name</label>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && canSave) handleSave(); }}
            style={inputBase}
          />
        </div>

        <div style={{ marginBottom: questKey && !questHasColour ? 14 : 0 }}>
          <label style={labelStyle}>Quest</label>
          <select
            value={questKey}
            onChange={e => setQuestKey(e.target.value)}
            style={{ ...inputBase, cursor: 'pointer', appearance: 'none', WebkitAppearance: 'none' }}
          >
            <option value="" style={{ background: '#2a0118' }}>— none —</option>
            {QUEST_KEYS.map(k => (
              <option key={k} value={k} style={{ background: '#2a0118' }}>{k}</option>
            ))}
          </select>
        </div>

        {questKey && !questHasColour && (
          <div style={{ marginBottom: 0 }}>
            <label style={labelStyle}>Hex colour</label>
            <input
              value={customHex}
              onChange={e => setCustomHex(e.target.value)}
              placeholder="#000000"
              style={inputBase}
            />
          </div>
        )}

        <button
          onClick={handleSave}
          style={{
            width: '100%', padding: '9px 0', marginTop: 20,
            background: canSave ? '#f5d2c1' : 'rgba(245,210,193,0.15)',
            border: 'none', borderRadius: 4,
            color: canSave ? '#420424' : 'rgba(245,210,193,0.4)',
            fontSize: 13, fontWeight: 600,
            cursor: canSave ? 'pointer' : 'default',
            fontFamily: 'system-ui, sans-serif',
          }}
        >
          Save Changes
        </button>

        {selectedWaypointIndex !== null && (
          <button
            onClick={onDeleteWaypoint}
            style={{
              width: '100%', padding: '9px 0', marginTop: 8,
              background: 'transparent', border: 'none', borderRadius: 4,
              color: '#ff6b6b', fontSize: 13, cursor: 'pointer',
              fontFamily: 'system-ui, sans-serif',
            }}
          >
            Delete Waypoint
          </button>
        )}

        <button
          onClick={() => {
            if (window.confirm('Delete this route? This cannot be undone.')) {
              onDelete(route.routeId);
            }
          }}
          style={{
            width: '100%', padding: '9px 0', marginTop: 8,
            background: 'transparent', border: 'none', borderRadius: 4,
            color: '#ff6b6b', fontSize: 13, cursor: 'pointer',
            fontFamily: 'system-ui, sans-serif',
          }}
        >
          Delete Route
        </button>

      </div>
    </div>
  );
}
