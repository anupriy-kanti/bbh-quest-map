import { useRef, useState, useCallback, useEffect, useLayoutEffect, useMemo } from 'react';
import baseMap from '../assets/lalbagh_base.png';
import { MAP_CONFIG } from '../constants/mapConfig';

function getNodeCoords(node, spotsById) {
  if (node.nodeType === 'spot') {
    const spot = spotsById[node.spotId];
    if (!spot) return null;
    return { cx: spot.lng * MAP_CONFIG.naturalWidth, cy: spot.lat * MAP_CONFIG.naturalHeight };
  }
  return { cx: node.x * MAP_CONFIG.naturalWidth, cy: node.y * MAP_CONFIG.naturalHeight };
}

// Pin visual constants — screen pixels, divided by scale to cancel viewBox scaling
const PIN_RADIUS    = 10;
const PIN_STROKE    = 1.5;
const PIN_FONT_SIZE = 11;
const PIN_LABEL_GAP = 3;

// ── Pan clamping ───────────────────────────────────────────────────────────────
// Ensures the map image always covers the visible container — no black space.
// If an image dimension is smaller than the container (only possible below fitScale,
// which the zoom floor prevents), we centre it defensively.
function clampTransform({ x, y, scale }, cW, cH) {
  const iW = MAP_CONFIG.naturalWidth  * scale;
  const iH = MAP_CONFIG.naturalHeight * scale;
  const cx = iW <= cW ? (cW - iW) / 2 : Math.min(0, Math.max(cW - iW, x));
  const cy = iH <= cH ? (cH - iH) / 2 : Math.min(0, Math.max(cH - iH, y));
  return { x: cx, y: cy, scale };
}

export default function MapCanvas({
  spots = [],
  routes = [],
  draftPath = [],
  drawMode = false,
  onMapClick,
  onPinClick,
  selectedSpotId,
  showLabels,
  movingSpotId,
  onMoveConfirm,
  onMoveCancelAndSelect,
  onWaypointDragEnd,
}) {
  const containerRef    = useRef(null);
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: MAP_CONFIG.defaultZoom });
  const transformRef    = useRef(transform);
  const fitScaleRef     = useRef(MAP_CONFIG.minZoom);
  const containerSizeRef = useRef({ width: 0, height: 0 });

  const dragging     = useRef(false);
  const lastPos      = useRef({ x: 0, y: 0 });
  const dragStartPos = useRef({ x: 0, y: 0 });
  const hasMoved     = useRef(false);

  const waypointDragRef    = useRef({ active: false, routeId: null, nodeIndex: null });
  const liveWaypointPosRef = useRef(null);
  const [liveWaypointPos, setLiveWaypointPos] = useState(null);

  // ── Fit-to-viewport on mount ───────────────────────────────────────────────

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const { width, height } = container.getBoundingClientRect();
    containerSizeRef.current = { width, height };  // Fix 1
    const fitScale = Math.min(
      width  / MAP_CONFIG.naturalWidth,
      height / MAP_CONFIG.naturalHeight,
    );
    fitScaleRef.current = fitScale;
    const initial = clampTransform(
      {
        x: (width  - MAP_CONFIG.naturalWidth  * fitScale) / 2,
        y: (height - MAP_CONFIG.naturalHeight * fitScale) / 2,
        scale: fitScale,
      },
      width, height,
    );
    setTransform(initial);
    transformRef.current = initial;
  }, []);

  // ── Pan ────────────────────────────────────────────────────────────────────

  const onMouseDown = useCallback((e) => {
    if (e.button !== 0) return;
    dragging.current     = true;
    hasMoved.current     = false;
    lastPos.current      = { x: e.clientX, y: e.clientY };
    dragStartPos.current = { x: e.clientX, y: e.clientY };
    e.preventDefault();
  }, []);

  const onMouseMove = useCallback((e) => {
    if (waypointDragRef.current.active) {
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const t = transformRef.current;
      const naturalX = (e.clientX - rect.left - t.x) / t.scale;
      const naturalY = (e.clientY - rect.top  - t.y) / t.scale;
      const x = Math.max(0, Math.min(1, naturalX / MAP_CONFIG.naturalWidth));
      const y = Math.max(0, Math.min(1, naturalY / MAP_CONFIG.naturalHeight));
      const pos = { routeId: waypointDragRef.current.routeId, nodeIndex: waypointDragRef.current.nodeIndex, x, y };
      liveWaypointPosRef.current = pos;
      setLiveWaypointPos(pos);
      return;
    }

    if (!dragging.current) return;
    const totalDx = e.clientX - dragStartPos.current.x;
    const totalDy = e.clientY - dragStartPos.current.y;
    if (Math.abs(totalDx) > 4 || Math.abs(totalDy) > 4) {
      hasMoved.current = true;
    }
    const dx = e.clientX - lastPos.current.x;
    const dy = e.clientY - lastPos.current.y;
    lastPos.current = { x: e.clientX, y: e.clientY };
    setTransform(prev => {
      const { width, height } = containerSizeRef.current;
      const next = clampTransform(
        { ...prev, x: prev.x + dx, y: prev.y + dy },
        width, height,
      );
      transformRef.current = next;
      return next;
    });
  }, []);

  const onMouseUp = useCallback((e) => {
    if (waypointDragRef.current.active) {
      const { routeId, nodeIndex } = waypointDragRef.current;
      waypointDragRef.current = { active: false, routeId: null, nodeIndex: null };
      const finalPos = liveWaypointPosRef.current;
      liveWaypointPosRef.current = null;
      setLiveWaypointPos(null);
      if (finalPos) onWaypointDragEnd?.(routeId, nodeIndex, finalPos.x, finalPos.y);
      return;
    }

    if (!dragging.current) return;
    const moved = hasMoved.current;
    dragging.current = false;
    hasMoved.current = false;

    if (moved) return;

    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const t    = transformRef.current;
    const clickX   = e.clientX - rect.left;
    const clickY   = e.clientY - rect.top;
    const naturalX = (clickX - t.x) / t.scale;
    const naturalY = (clickY - t.y) / t.scale;
    const lng = naturalX / MAP_CONFIG.naturalWidth;
    const lat = naturalY / MAP_CONFIG.naturalHeight;
    const inBounds = lng >= 0 && lng <= 1 && lat >= 0 && lat <= 1;

    const pinEl = e.target.closest('[data-spot-id]');

    // Move mode
    if (movingSpotId) {
      if (pinEl && pinEl.dataset.spotId !== movingSpotId) {
        onMoveCancelAndSelect?.(pinEl.dataset.spotId);
      } else if (inBounds && !pinEl) {
        onMoveConfirm?.(lng, lat);
      }
      return;
    }

    // Normal mode
    if (pinEl) {
      onPinClick?.(pinEl.dataset.spotId);
    } else if (inBounds) {
      onMapClick?.(lng, lat);
    }
  }, [onMapClick, onPinClick, movingSpotId, onMoveConfirm, onMoveCancelAndSelect, onWaypointDragEnd]);

  // ── Zoom ───────────────────────────────────────────────────────────────────

  const onWheel = useCallback((e) => {
    e.preventDefault();
    const container = containerRef.current;
    if (!container) return;
    const rect   = container.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1;

    setTransform(prev => {
      const { width, height } = containerSizeRef.current;
      const minScale = fitScaleRef.current;
      const newScale = Math.min(MAP_CONFIG.maxZoom, Math.max(minScale, prev.scale * factor));
      const ratio    = newScale / prev.scale;
      const next = clampTransform(             // Fix 1: clamp after zoom too
        {
          x: mouseX - ratio * (mouseX - prev.x),
          y: mouseY - ratio * (mouseY - prev.y),
          scale: newScale,
        },
        width, height,
      );
      transformRef.current = next;
      return next;
    });
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    container.addEventListener('wheel', onWheel, { passive: false });
    return () => container.removeEventListener('wheel', onWheel);
  }, [onWheel]);

  // ── Derived dimensions ─────────────────────────────────────────────────────

  const { scale } = transform;
  const imageWidth  = MAP_CONFIG.naturalWidth  * scale;
  const imageHeight = MAP_CONFIG.naturalHeight * scale;
  const pinR     = PIN_RADIUS    / scale;
  const pinSW    = PIN_STROKE    / scale;
  const pinFS    = PIN_FONT_SIZE / scale;
  const labelGap = PIN_LABEL_GAP / scale;

  const spotsById = useMemo(
    () => Object.fromEntries(spots.map(s => [s.spotId, s])),
    [spots],
  );

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div
      ref={containerRef}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
      style={{
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        cursor: (movingSpotId || drawMode) ? 'crosshair' : 'grab',
        backgroundColor: '#1a0112',
        position: 'relative',
        userSelect: 'none',
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          transform: `translate(${transform.x}px, ${transform.y}px)`,
          width: imageWidth,
          height: imageHeight,
        }}
      >
        <img
          src={baseMap}
          alt="Lalbagh Botanical Garden map"
          style={{ display: 'block', width: imageWidth, height: imageHeight, border: 'none', borderRadius: 0 }}
          draggable={false}
        />

        <svg
          style={{
            position: 'absolute', top: 0, left: 0,
            width: imageWidth, height: imageHeight,
            pointerEvents: 'none', overflow: 'visible',
          }}
          viewBox={`0 0 ${MAP_CONFIG.naturalWidth} ${MAP_CONFIG.naturalHeight}`}
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <style>{`
              @keyframes bbh-pin-pulse {
                0%, 100% { opacity: 1; }
                50%       { opacity: 0.35; }
              }
              .bbh-pin-moving-ring { animation: bbh-pin-pulse 1s ease-in-out infinite; }
            `}</style>
          </defs>

          {/* ── Saved routes ──────────────────────────────────────────── */}
          {routes.map(route => {
            const coordsWithIdx = route.path.map((node, i) => {
              let c;
              if (
                node.nodeType === 'waypoint' &&
                liveWaypointPos?.routeId === route.routeId &&
                liveWaypointPos.nodeIndex === i
              ) {
                c = {
                  cx: liveWaypointPos.x * MAP_CONFIG.naturalWidth,
                  cy: liveWaypointPos.y * MAP_CONFIG.naturalHeight,
                };
              } else {
                c = getNodeCoords(node, spotsById);
              }
              return { c, i, nodeType: node.nodeType };
            });
            const validCoords = coordsWithIdx.filter(({ c }) => c !== null);
            if (validCoords.length < 2) return null;
            const pointsStr = validCoords.map(({ c }) => `${c.cx},${c.cy}`).join(' ');
            return (
              <g key={route.routeId}>
                <polyline
                  points={pointsStr}
                  stroke={route.colour}
                  strokeWidth={4 / scale}
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {coordsWithIdx.map(({ c, i, nodeType }) => {
                  if (nodeType !== 'waypoint' || !c) return null;
                  return (
                    <circle
                      key={i}
                      cx={c.cx} cy={c.cy}
                      r={6 / scale}
                      fill={route.colour}
                      stroke="#f5d2c1"
                      strokeWidth={1.5 / scale}
                      style={{ pointerEvents: 'auto', cursor: 'move' }}
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        waypointDragRef.current = { active: true, routeId: route.routeId, nodeIndex: i };
                      }}
                    />
                  );
                })}
              </g>
            );
          })}

          {/* ── In-progress draft route ────────────────────────────────── */}
          {draftPath.length >= 1 && (() => {
            const coords = draftPath.map(n => getNodeCoords(n, spotsById)).filter(Boolean);
            return (
              <g>
                {coords.length >= 2 && (
                  <polyline
                    points={coords.map(c => `${c.cx},${c.cy}`).join(' ')}
                    stroke="#f5d2c1"
                    strokeWidth={3 / scale}
                    fill="none"
                    opacity={0.65}
                    strokeDasharray={`${14 / scale} ${7 / scale}`}
                    strokeLinecap="round"
                  />
                )}
                {coords.map((c, i) => (
                  <circle
                    key={i}
                    cx={c.cx} cy={c.cy}
                    r={4 / scale}
                    fill="#f5d2c1"
                    opacity={0.8}
                  />
                ))}
              </g>
            );
          })()}

          {spots.map(spot => {
            const cx = spot.lng * MAP_CONFIG.naturalWidth;
            const cy = spot.lat * MAP_CONFIG.naturalHeight;
            const isSelected = spot.spotId === selectedSpotId;
            const isMoving   = spot.spotId === movingSpotId;
            const label    = spot.emoticon || spot.shortLabel || '';
            const landmark = spot.landMark || '';

            return (
              <g
                key={spot.spotId}
                data-spot-id={spot.spotId}
                style={{ pointerEvents: 'auto', cursor: 'pointer' }}
              >
                {/* Fix 4: cream ring only when selected AND not in move mode */}
                {isSelected && !isMoving && (
                  <circle
                    cx={cx} cy={cy}
                    r={pinR + 4 / scale}
                    fill="none"
                    stroke="#f5d2c1"
                    strokeWidth={2 / scale}
                  />
                )}

                {/* Move-mode ring — dashed amber, pulsing */}
                {isMoving && (
                  <circle
                    cx={cx} cy={cy}
                    r={pinR + 5 / scale}
                    fill="none"
                    stroke="#ff9301"
                    strokeWidth={2.5 / scale}
                    strokeDasharray={`${8 / scale} ${4 / scale}`}
                    className="bbh-pin-moving-ring"
                  />
                )}

                {/* Pin body */}
                <circle
                  cx={cx} cy={cy}
                  r={pinR}
                  fill={isMoving ? '#ff9301' : '#420424'}
                  stroke="#f5d2c1"
                  strokeWidth={pinSW}
                />

                {/* Label below pin */}
                {showLabels && label && (
                  <text
                    x={cx}
                    y={cy + pinR + labelGap}
                    textAnchor="middle"
                    dominantBaseline="hanging"
                    fontSize={pinFS}
                    fill="#000000"
                    style={{ pointerEvents: 'none', userSelect: 'none' }}
                  >
                    {label}
                  </text>
                )}
                {/* Landmark secondary label */}
                {showLabels && label && landmark && (
                  <text
                    x={cx}
                    y={cy + pinR + labelGap + pinFS + 2 / scale}
                    textAnchor="middle"
                    dominantBaseline="hanging"
                    fontSize={10 / scale}
                    fill="#000000"
                    opacity={0.75}
                    style={{ pointerEvents: 'none', userSelect: 'none' }}
                  >
                    {landmark}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
