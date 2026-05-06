import { useRef, useState, useCallback, useEffect, useLayoutEffect, useMemo } from 'react';
import baseMap from '../assets/lalbagh_base.png';
import { MAP_CONFIG } from '../constants/mapConfig';

function pointToSegmentDist(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay;
  if (dx === 0 && dy === 0) return Math.hypot(px - ax, py - ay);
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

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
  onRouteClick,
  onRouteDeselect,
  selectedSpotId,
  selectedRouteId,
  selectedWaypointIndex,
  onWaypointSelect,
  showLabels,
  movingSpotId,
  onMoveConfirm,
  onMoveCancelAndSelect,
  onWaypointDragEnd,
  onInsertWaypoint,
  onSegmentDragEnd,
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

  // ── Segment selection & drag ───────────────────────────────────────────────
  const [selectedSegment, setSelectedSegmentState] = useState(null); // { routeId, segmentIndex }
  const selectedSegmentRef = useRef(null);

  const pendingClickRef = useRef(null); // { timer, routeId, segmentIndex, x, y, time }

  const segmentDragRef    = useRef({ active: false });
  const liveSegmentDragRef = useRef(null);
  const [liveSegmentDrag, setLiveSegmentDrag] = useState(null); // { routeId, segmentIndex, dx, dy }

  const routesRef          = useRef(routes);
  const spotsByIdRef       = useRef({});
  const selectedRouteIdRef = useRef(selectedRouteId);
  useEffect(() => { routesRef.current = routes; }, [routes]);
  useEffect(() => { selectedRouteIdRef.current = selectedRouteId; }, [selectedRouteId]);

  // Clear segment selection whenever the selected route changes
  useEffect(() => {
    selectedSegmentRef.current = null;
    setSelectedSegmentState(null);
    if (pendingClickRef.current) {
      clearTimeout(pendingClickRef.current.timer);
      pendingClickRef.current = null;
    }
  }, [selectedRouteId]);

  // Cleanup pending click timer on unmount
  useEffect(() => {
    return () => {
      if (pendingClickRef.current) clearTimeout(pendingClickRef.current.timer);
    };
  }, []);

  // ── Fit-to-viewport on mount ───────────────────────────────────────────────

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const { width, height } = container.getBoundingClientRect();
    containerSizeRef.current = { width, height };
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

    // If a segment is selected, check if this press is on that segment → start segment drag
    if (selectedSegmentRef.current) {
      const { routeId, segmentIndex } = selectedSegmentRef.current;
      const container = containerRef.current;
      if (container) {
        const rect = container.getBoundingClientRect();
        const t = transformRef.current;
        const naturalX = (e.clientX - rect.left - t.x) / t.scale;
        const naturalY = (e.clientY - rect.top  - t.y) / t.scale;
        const route = routesRef.current.find(r => r.routeId === routeId);
        if (route) {
          const nodeA = route.path[segmentIndex];
          const nodeB = route.path[segmentIndex + 1];
          const a = getNodeCoords(nodeA, spotsByIdRef.current);
          const b = getNodeCoords(nodeB, spotsByIdRef.current);
          if (a && b) {
            const toleranceNatural = 8 / t.scale;
            const d = pointToSegmentDist(naturalX, naturalY, a.cx, a.cy, b.cx, b.cy);
            if (d <= toleranceNatural) {
              segmentDragRef.current = {
                active: true,
                routeId,
                segmentIndex,
                startX: naturalX,
                startY: naturalY,
                node0: nodeA,
                node1: nodeB,
                node0Index: segmentIndex,
                node1Index: segmentIndex + 1,
              };
              e.preventDefault();
              return;
            }
          }
        }
      }
      // Pressed outside the selected segment — deselect it and fall through to pan
      selectedSegmentRef.current = null;
      setSelectedSegmentState(null);
    }

    dragging.current     = true;
    hasMoved.current     = false;
    lastPos.current      = { x: e.clientX, y: e.clientY };
    dragStartPos.current = { x: e.clientX, y: e.clientY };
    e.preventDefault();
  }, []);

  const onMouseMove = useCallback((e) => {
    // Segment drag
    if (segmentDragRef.current.active) {
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const t = transformRef.current;
      const naturalX = (e.clientX - rect.left - t.x) / t.scale;
      const naturalY = (e.clientY - rect.top  - t.y) / t.scale;
      const dx = (naturalX - segmentDragRef.current.startX) / MAP_CONFIG.naturalWidth;
      const dy = (naturalY - segmentDragRef.current.startY) / MAP_CONFIG.naturalHeight;
      const pos = {
        routeId: segmentDragRef.current.routeId,
        segmentIndex: segmentDragRef.current.segmentIndex,
        dx,
        dy,
      };
      liveSegmentDragRef.current = pos;
      setLiveSegmentDrag(pos);
      return;
    }

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
    // Segment drag end
    if (segmentDragRef.current.active) {
      const { routeId, node0, node1, node0Index, node1Index } = segmentDragRef.current;
      segmentDragRef.current = { active: false };
      const finalDrag = liveSegmentDragRef.current;
      liveSegmentDragRef.current = null;
      setLiveSegmentDrag(null);
      if (finalDrag && (Math.abs(finalDrag.dx) > 0.0001 || Math.abs(finalDrag.dy) > 0.0001)) {
        const movedNodes = [];
        if (node0.nodeType === 'waypoint') {
          movedNodes.push({
            nodeIndex: node0Index,
            x: Math.max(0, Math.min(1, node0.x + finalDrag.dx)),
            y: Math.max(0, Math.min(1, node0.y + finalDrag.dy)),
          });
        }
        if (node1.nodeType === 'waypoint') {
          movedNodes.push({
            nodeIndex: node1Index,
            x: Math.max(0, Math.min(1, node1.x + finalDrag.dx)),
            y: Math.max(0, Math.min(1, node1.y + finalDrag.dy)),
          });
        }
        if (movedNodes.length > 0) onSegmentDragEnd?.(routeId, movedNodes);
      }
      return;
    }

    if (waypointDragRef.current.active) {
      const { routeId, nodeIndex, startX, startY } = waypointDragRef.current;
      waypointDragRef.current = { active: false, routeId: null, nodeIndex: null };
      const finalPos = liveWaypointPosRef.current;
      liveWaypointPosRef.current = null;
      setLiveWaypointPos(null);
      const movedEnough = finalPos && (
        Math.abs(e.clientX - (startX ?? e.clientX)) > 4 ||
        Math.abs(e.clientY - (startY ?? e.clientY)) > 4
      );
      if (movedEnough) {
        onWaypointDragEnd?.(routeId, nodeIndex, finalPos.x, finalPos.y);
      } else {
        onWaypointSelect?.(routeId, nodeIndex);
      }
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

    // Pin click — works in draw mode too
    if (pinEl) {
      onPinClick?.(pinEl.dataset.spotId);
      return;
    }

    if (!inBounds) return;

    // Draw mode — add waypoint
    if (drawMode) {
      onMapClick?.(lng, lat);
      return;
    }

    // ── Segment click detection (only when a route is selected) ───────────
    const selRouteId = selectedRouteIdRef.current;
    if (selRouteId) {
      const selRoute = routesRef.current.find(r => r.routeId === selRouteId);
      if (selRoute) {
        const toleranceNatural = 8 / t.scale;
        let hitSegIdx = -1;
        const coords = selRoute.path.map(n => getNodeCoords(n, spotsByIdRef.current));
        for (let i = 0; i < coords.length - 1; i++) {
          const a = coords[i], b = coords[i + 1];
          if (!a || !b) continue;
          const d = pointToSegmentDist(naturalX, naturalY, a.cx, a.cy, b.cx, b.cy);
          if (d <= toleranceNatural) { hitSegIdx = i; break; }
        }

        if (hitSegIdx >= 0) {
          const now = Date.now();
          const pending = pendingClickRef.current;
          if (
            pending &&
            pending.routeId === selRouteId &&
            pending.segmentIndex === hitSegIdx &&
            now - pending.time < 200
          ) {
            // Double-click → enter segment-selected state
            clearTimeout(pending.timer);
            pendingClickRef.current = null;
            selectedSegmentRef.current = { routeId: selRouteId, segmentIndex: hitSegIdx };
            setSelectedSegmentState({ routeId: selRouteId, segmentIndex: hitSegIdx });
          } else {
            // First click — schedule waypoint insertion after 200ms
            if (pending) {
              clearTimeout(pending.timer);
              pendingClickRef.current = null;
            }
            const capturedRouteId  = selRouteId;
            const capturedSegIdx   = hitSegIdx;
            const capturedLng      = lng;
            const capturedLat      = lat;
            const timer = setTimeout(() => {
              pendingClickRef.current = null;
              onInsertWaypoint?.(capturedRouteId, capturedSegIdx, capturedLng, capturedLat);
            }, 200);
            pendingClickRef.current = { timer, routeId: capturedRouteId, segmentIndex: capturedSegIdx, x: capturedLng, y: capturedLat, time: now };
          }
          return;
        }

        // Clicked outside the selected route's segments — deselect segment & route
        if (selectedSegmentRef.current) {
          selectedSegmentRef.current = null;
          setSelectedSegmentState(null);
        }
        onRouteDeselect?.();
        return;
      }
    }

    // Normal mode — hit-test route polylines (for initial selection)
    const toleranceNatural = 8 / t.scale;
    let hitRouteId = null;
    for (const route of routesRef.current) {
      const coords = route.path
        .map(n => getNodeCoords(n, spotsByIdRef.current))
        .filter(Boolean);
      for (let i = 0; i < coords.length - 1; i++) {
        const d = pointToSegmentDist(
          naturalX, naturalY,
          coords[i].cx, coords[i].cy,
          coords[i + 1].cx, coords[i + 1].cy,
        );
        if (d <= toleranceNatural) { hitRouteId = route.routeId; break; }
      }
      if (hitRouteId) break;
    }

    if (hitRouteId) {
      onRouteClick?.(hitRouteId);
    } else {
      onRouteDeselect?.();
      if (!selectedRouteIdRef.current) {
        onMapClick?.(lng, lat);
      }
    }
  }, [onMapClick, onPinClick, onRouteClick, onRouteDeselect, movingSpotId, onMoveConfirm, onMoveCancelAndSelect, onWaypointDragEnd, onWaypointSelect, onInsertWaypoint, onSegmentDragEnd, drawMode]);

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
      const next = clampTransform(
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

  const spotsById = useMemo(() => {
    const map = Object.fromEntries(spots.map(s => [s.spotId, s]));
    spotsByIdRef.current = map;
    return map;
  }, [spots]);

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
            const isRouteSelected = route.routeId === selectedRouteId;
            const strokeW = (isRouteSelected ? 8 : 6) / scale;
            const dotR    = (isRouteSelected ? 12 : 6) / scale;

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
              } else if (
                node.nodeType === 'waypoint' &&
                liveSegmentDrag?.routeId === route.routeId &&
                (i === liveSegmentDrag.segmentIndex || i === liveSegmentDrag.segmentIndex + 1)
              ) {
                // Apply segment drag offset to waypoint endpoints
                c = {
                  cx: (node.x + liveSegmentDrag.dx) * MAP_CONFIG.naturalWidth,
                  cy: (node.y + liveSegmentDrag.dy) * MAP_CONFIG.naturalHeight,
                };
              } else {
                c = getNodeCoords(node, spotsById);
              }
              return { c, i, nodeType: node.nodeType };
            });
            const validCoords = coordsWithIdx.filter(({ c }) => c !== null);
            if (validCoords.length < 2) return null;
            const pointsStr = validCoords.map(({ c }) => `${c.cx},${c.cy}`).join(' ');

            // Determine if a segment of this route is selected
            const activeSeg =
              isRouteSelected &&
              selectedSegment?.routeId === route.routeId
                ? selectedSegment.segmentIndex
                : -1;

            return (
              <g key={route.routeId}>
                <polyline
                  points={pointsStr}
                  stroke={route.colour}
                  strokeWidth={strokeW}
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {/* Selected segment highlight */}
                {activeSeg >= 0 && (() => {
                  const aEntry = coordsWithIdx[activeSeg];
                  const bEntry = coordsWithIdx[activeSeg + 1];
                  if (!aEntry?.c || !bEntry?.c) return null;
                  return (
                    <line
                      x1={aEntry.c.cx} y1={aEntry.c.cy}
                      x2={bEntry.c.cx} y2={bEntry.c.cy}
                      stroke="rgba(245,210,193,0.6)"
                      strokeWidth={strokeW * 1.4}
                      strokeLinecap="round"
                    />
                  );
                })()}

                {coordsWithIdx.map(({ c, i, nodeType }) => {
                  if (nodeType !== 'waypoint' || !c) return null;
                  const isSelectedWp = isRouteSelected && selectedWaypointIndex === i;
                  return (
                    <g key={i}>
                      {isSelectedWp && (
                        <circle
                          cx={c.cx} cy={c.cy}
                          r={dotR + 5 / scale}
                          fill="none"
                          stroke="#f5d2c1"
                          strokeWidth={2 / scale}
                          style={{ pointerEvents: 'none' }}
                        />
                      )}
                      <circle
                        cx={c.cx} cy={c.cy}
                        r={dotR}
                        fill={route.colour}
                        stroke="#f5d2c1"
                        strokeWidth={1.5 / scale}
                        style={{ pointerEvents: 'auto', cursor: 'move' }}
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          waypointDragRef.current = { active: true, routeId: route.routeId, nodeIndex: i, startX: e.clientX, startY: e.clientY };
                        }}
                      />
                    </g>
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
                    stroke="#420424"
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
                    fill="#420424"
                    opacity={0.8}
                  />
                ))}
              </g>
            );
          })()}

          {spots.map(spot => {
            const cx = spot.lng * MAP_CONFIG.naturalWidth;
            const cy = spot.lat * MAP_CONFIG.naturalHeight;
            const isSelected     = spot.spotId === selectedSpotId;
            const isMoving       = spot.spotId === movingSpotId;
            const shortLabelText = spot.shortLabel || '';
            const landmark       = spot.landMark  || '';

            return (
              <g
                key={spot.spotId}
                data-spot-id={spot.spotId}
                style={{ pointerEvents: 'auto', cursor: 'pointer' }}
              >
                {isSelected && !isMoving && (
                  <circle
                    cx={cx} cy={cy}
                    r={pinR + 4 / scale}
                    fill="none"
                    stroke="#f5d2c1"
                    strokeWidth={2 / scale}
                  />
                )}

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

                {spot.emoticon ? (
                  <>
                    {/* transparent hit-area keeps click behaviour consistent */}
                    <circle cx={cx} cy={cy} r={pinR} fill="transparent" stroke="none" />
                    <text
                      x={cx} y={cy}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fontSize={22 / scale}
                      style={{ pointerEvents: 'none', userSelect: 'none' }}
                    >
                      {spot.emoticon}
                    </text>
                  </>
                ) : (
                  <circle
                    cx={cx} cy={cy}
                    r={pinR}
                    fill={isMoving ? '#ff9301' : '#420424'}
                    stroke="#f5d2c1"
                    strokeWidth={pinSW}
                  />
                )}

                {showLabels && shortLabelText && (
                  <text
                    x={cx}
                    y={cy + pinR + labelGap}
                    textAnchor="middle"
                    dominantBaseline="hanging"
                    fontSize={pinFS}
                    fontWeight={700}
                    fill="#000000"
                    style={{ pointerEvents: 'none', userSelect: 'none' }}
                  >
                    {shortLabelText}
                  </text>
                )}
                {showLabels && shortLabelText && landmark && (
                  <text
                    x={cx}
                    y={cy + pinR + labelGap + pinFS + 2 / scale}
                    textAnchor="middle"
                    dominantBaseline="hanging"
                    fontSize={10 / scale}
                    fontWeight={700}
                    fill="#000000"
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
