import { useState } from 'react';
import bbhLogo from '../assets/bbh_logo.png';

function ToolbarBtn({ onClick, active, disabled, title, children }) {
  const [hovered, setHovered] = useState(false);
  let bg, color;
  if (active) {
    bg = 'rgba(245,210,193,0.25)'; color = '#ffffff';
  } else if (disabled) {
    bg = 'rgba(255,255,255,0.05)'; color = 'rgba(255,255,255,0.3)';
  } else if (hovered) {
    bg = 'rgba(255,255,255,0.18)'; color = 'rgba(255,255,255,0.9)';
  } else {
    bg = 'rgba(255,255,255,0.12)'; color = 'rgba(255,255,255,0.7)';
  }
  return (
    <button
      onClick={disabled ? undefined : onClick}
      title={title}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 5,
        background: bg, border: active ? '1px solid rgba(245,210,193,0.4)' : '1px solid transparent',
        borderRadius: 10, padding: '4px 12px',
        color, fontSize: '0.8rem', fontWeight: 600,
        cursor: disabled ? 'default' : 'pointer', outline: 'none',
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {children}
    </button>
  );
}

const VENUES = [
  { value: 'lalbagh', label: 'Lalbagh Botanical Garden' },
];


function VenueSelect() {
  const [hovered, setHovered] = useState(false);
  return (
    <select
      defaultValue="lalbagh"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        appearance: 'none',
        WebkitAppearance: 'none',
        background: hovered ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.12)',
        border: 'none',
        borderRadius: 10,
        padding: '4px 28px 4px 12px',
        color: 'rgba(255,255,255,0.85)',
        fontSize: '0.8rem',
        fontWeight: 500,
        cursor: 'pointer',
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%23ffffff' stroke-opacity='0.55' stroke-width='1.5' fill='none' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'right 8px center',
        outline: 'none',
      }}
    >
      {VENUES.map(v => (
        <option key={v.value} value={v.value} style={{ background: '#2a0118', color: '#ffffff' }}>{v.label}</option>
      ))}
    </select>
  );
}

function LabelsToggle({ showLabels, onToggleLabels }) {
  const [hovered, setHovered] = useState(false);
  const active = showLabels;

  let bg, color;
  if (active) {
    bg = 'rgba(255,255,255,0.2)';
    color = '#ffffff';
  } else if (hovered) {
    bg = 'rgba(255,255,255,0.18)';
    color = 'rgba(255,255,255,0.85)';
  } else {
    bg = 'rgba(255,255,255,0.12)';
    color = 'rgba(255,255,255,0.6)';
  }

  return (
    <button
      onClick={onToggleLabels}
      title={showLabels ? 'Hide pin labels' : 'Show pin labels'}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        background: bg,
        border: 'none',
        borderRadius: 10,
        padding: '4px 12px',
        color,
        fontSize: '0.8rem',
        fontWeight: 600,
        cursor: 'pointer',
        outline: 'none',
      }}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        {showLabels ? (
          <>
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
            <circle cx="12" cy="12" r="3"/>
          </>
        ) : (
          <>
            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
            <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
            <line x1="1" y1="1" x2="23" y2="23"/>
          </>
        )}
      </svg>
      Labels
    </button>
  );
}

export default function Toolbar({
  showLabels = true,
  onToggleLabels,
  drawMode = false,
  draftNodeCount = 0,
  onToggleDrawMode,
  onFinishRoute,
  onCancelDraw,
}) {
  return (
    <header
      style={{
        height: 60,
        minHeight: 60,
        backgroundColor: '#420424',
        display: 'flex',
        alignItems: 'center',
        padding: '0 16px',
        gap: 12,
        boxSizing: 'border-box',
        borderBottom: '1px solid rgba(245,210,193,0.1)',
        flexShrink: 0,
      }}
    >
      {/* Left — logo + title */}
      <img
        src={bbhLogo}
        alt="BBH logo"
        style={{
          width: 36,
          height: 36,
          borderRadius: 6,
          background: '#ffffff',
          padding: 2,
          objectFit: 'cover',
          flexShrink: 0,
        }}
      />
      <span style={{
        fontSize: 20,
        fontWeight: 600,
        color: '#ffffff',
        letterSpacing: '0.04em',
        lineHeight: 1.2,
      }}>
        BBH Quest Map
      </span>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Right — draw mode controls + venue + labels */}
      {drawMode ? (
        <>
          <ToolbarBtn active onClick={onToggleDrawMode} title="Drawing route — click to exit">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
            </svg>
            Drawing Route
          </ToolbarBtn>
          <ToolbarBtn
            onClick={onFinishRoute}
            disabled={draftNodeCount < 2}
            title={draftNodeCount < 2 ? 'Add at least 2 nodes to finish' : 'Save this route'}
          >
            Save Route
          </ToolbarBtn>
          <ToolbarBtn onClick={onCancelDraw} title="Discard route and exit draw mode">
            Cancel
          </ToolbarBtn>
        </>
      ) : (
        <ToolbarBtn onClick={onToggleDrawMode} title="Draw a new route">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
          </svg>
          Draw Route
        </ToolbarBtn>
      )}
      <VenueSelect />
      <LabelsToggle showLabels={showLabels} onToggleLabels={onToggleLabels} />
    </header>
  );
}
