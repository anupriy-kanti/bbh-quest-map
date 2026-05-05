import { useState, useEffect } from 'react';

const ITEM_TYPES = [
  'Tree', 'Plant', 'Flower', 'Rock', 'Fungi',
  'Animal', 'Monument', 'Open Space', 'Water Body', 'Structure', 'Other',
];

const RECURRENCE_OPTIONS = [
  { value: '',               label: '— select —' },
  { value: 'Unique (1)',     label: 'Unique (1)' },
  { value: 'Rare (2–3)',    label: 'Rare (2–3)' },
  { value: 'Common (3–5)',  label: 'Common (3–5)' },
  { value: 'Abundant (5+)', label: 'Abundant (5+)' },
];

const STORY_LEVELS = ['', 'L1', 'L2', 'L3', 'L4', 'L5'];

const QUEST_OPTIONS = [
  'VePQ', 'RmyQ', 'MbhQ', 'WatQ', 'EarQ',
  'FirQ', 'GrMQ', 'BibQ', 'DiWQ', 'PlPQ', 'WinQ',
];

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' });
}

// ── Style tokens ──────────────────────────────────────────────────────────────

const inputBase = {
  width: '100%',
  padding: '7px 10px',
  backgroundColor: 'rgba(245,210,193,0.08)',
  border: '1px solid rgba(245,210,193,0.2)',
  borderRadius: 4,
  color: '#f5d2c1',
  fontSize: 13,
  outline: 'none',
  boxSizing: 'border-box',
};

// ── Sub-components ────────────────────────────────────────────────────────────

function Divider() {
  return <div style={{ height: 1, backgroundColor: 'rgba(245,210,193,0.12)', margin: '4px 0 16px' }} />;
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{
        display: 'block', fontSize: 11, fontWeight: 600,
        letterSpacing: '0.06em', textTransform: 'uppercase',
        color: 'rgba(245,210,193,0.55)', marginBottom: 5,
      }}>
        {label}
      </label>
      {children}
    </div>
  );
}

function ReadField({ label, children }) {
  return (
    <div style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'flex-start' }}>
      <span style={{
        fontSize: 11, fontWeight: 600, letterSpacing: '0.04em',
        textTransform: 'uppercase', color: 'rgba(245,210,193,0.45)',
        minWidth: 90, flexShrink: 0, paddingTop: 1,
      }}>
        {label}
      </span>
      <span style={{ fontSize: 12, color: 'rgba(245,210,193,0.8)', wordBreak: 'break-all' }}>
        {children}
      </span>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
// Renders as a flex column filling its parent (RightPanel).
// No position:fixed, no slide animation — the parent controls visibility.

export default function MetadataPanel({
  spot,
  onClose,
  onSave,
  onDelete,
  draft,
  onDraftChange,
  onMoveStart,
}) {
  const [form, setForm] = useState(null);

  // Re-initialise when the selected spot changes OR when its coordinates change
  // (after a Move Spot operation the spotId stays the same but lat/lng update).
  // `draft` is intentionally excluded from deps — it is used as the initial value
  // on spot change, not as a live reactive source.
  useEffect(() => {
    if (spot) setForm(draft || { ...spot });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spot?.spotId, spot?.lat, spot?.lng]);

  if (!form) return null;

  const update = (field, value) => {
    const next = { ...form, [field]: value };
    setForm(next);
    onDraftChange?.(next.spotId, next);
  };

  const toggleQuest = (q) => {
    const current = form.relatedQuests || [];
    const next = {
      ...form,
      relatedQuests: current.includes(q)
        ? current.filter(x => x !== q)
        : [...current, q],
    };
    setForm(next);
    onDraftChange?.(next.spotId, next);
  };

  const handleSave   = () => onSave(form);
  const handleDelete = () => {
    if (window.confirm('Delete this spot? This cannot be undone.')) {
      onDelete(form.spotId);
    }
  };
  const handleMoveStart = () => onMoveStart?.(form.spotId);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

      {/* Sticky header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 16px 14px 20px',
        borderBottom: '1px solid rgba(245,210,193,0.15)',
        flexShrink: 0,
      }}>
        <h2 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: '#f5d2c1' }}>
          {form.itemName?.trim() || 'New Spot'}
        </h2>
        <button
          onClick={onClose}
          style={{
            background: 'none', border: 'none',
            color: '#f5d2c1', fontSize: 22, lineHeight: 1,
            cursor: 'pointer', padding: '2px 6px', opacity: 0.7,
          }}
          aria-label="Close panel"
        >
          ×
        </button>
      </div>

      {/* Scrollable fields */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px 8px' }}>

        <section style={{ marginBottom: 16 }}>
          <ReadField label="Spot ID">
            <span style={{ fontFamily: 'monospace', fontSize: 11 }}>{form.spotId}</span>
          </ReadField>
          <ReadField label="Created">{formatDate(form.createdAt)}</ReadField>
          <ReadField label="Last updated">{formatDate(form.updatedAt)}</ReadField>
          <ReadField label="Position">
            {form.lat.toFixed(6)}, {form.lng.toFixed(6)}
          </ReadField>
        </section>

        <Divider />

        <section style={{ marginBottom: 4 }}>
          <Field label="Item name">
            <input value={form.itemName} onChange={e => update('itemName', e.target.value)} placeholder="e.g. Coconut Palm" style={inputBase} />
          </Field>
          <Field label="Type">
            <select value={form.itemType} onChange={e => update('itemType', e.target.value)} style={inputBase}>
              <option value="">— select —</option>
              {ITEM_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </Field>
        </section>

        <Divider />

        <section style={{ marginBottom: 4 }}>
          <Field label="Short label">
            <input value={form.shortLabel} onChange={e => update('shortLabel', e.target.value)} placeholder="e.g. Main Gate Palm" style={inputBase} />
          </Field>
          <Field label="Landmark">
            <input value={form.landMark || ''} onChange={e => update('landMark', e.target.value)} placeholder="e.g. near Main Gate" style={inputBase} />
          </Field>
          <Field label="Emoticon">
            <input value={form.emoticon} onChange={e => update('emoticon', e.target.value)} placeholder="Paste or type one emoji" style={inputBase} />
          </Field>
          <Field label="Botanical name">
            <input value={form.botanicalName} onChange={e => update('botanicalName', e.target.value)} placeholder="Scientific name" style={inputBase} />
          </Field>
        </section>

        <Divider />

        <section style={{ marginBottom: 4 }}>
          <Field label="Recurrence">
            <select value={form.itemRecurrence} onChange={e => update('itemRecurrence', e.target.value)} style={inputBase}>
              {RECURRENCE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </Field>
          <Field label="Story level">
            <select value={form.storyLevel} onChange={e => update('storyLevel', e.target.value)} style={inputBase}>
              {STORY_LEVELS.map(l => <option key={l} value={l}>{l || '— select —'}</option>)}
            </select>
          </Field>
          <Field label="Related Quests">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 14px', paddingTop: 2 }}>
              {QUEST_OPTIONS.map(q => (
                <label key={q} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, cursor: 'pointer', color: '#f5d2c1' }}>
                  <input
                    type="checkbox"
                    checked={(form.relatedQuests || []).includes(q)}
                    onChange={() => toggleQuest(q)}
                    style={{ accentColor: '#f5d2c1', cursor: 'pointer' }}
                  />
                  {q}
                </label>
              ))}
            </div>
          </Field>
        </section>

        <Divider />

        <section style={{ marginBottom: 4 }}>
          <Field label="MYT ID">
            <input value={form.mytId} onChange={e => update('mytId', e.target.value)} placeholder="LBI.MYT-xx.y" style={inputBase} />
          </Field>
          <Field label="PRI ID">
            <input value={form.priId} onChange={e => update('priId', e.target.value)} placeholder="LBI.PRI-xx.y" style={inputBase} />
          </Field>
          <Field label="Notion URL">
            <input value={form.notionUrl} onChange={e => update('notionUrl', e.target.value)} placeholder="https://notion.so/..." style={inputBase} />
          </Field>
        </section>

        <Divider />

        <section style={{ marginBottom: 4 }}>
          <Field label="Primary narrative">
            <textarea value={form.primaryNarrative} onChange={e => update('primaryNarrative', e.target.value)} rows={4} style={{ ...inputBase, resize: 'vertical' }} />
          </Field>
          <Field label="Secondary narrative">
            <textarea value={form.secondaryNarrative} onChange={e => update('secondaryNarrative', e.target.value)} rows={4} style={{ ...inputBase, resize: 'vertical' }} />
          </Field>
          <Field label="Tertiary narrative">
            <textarea value={form.tertiaryNarrative} onChange={e => update('tertiaryNarrative', e.target.value)} rows={4} style={{ ...inputBase, resize: 'vertical' }} />
          </Field>
        </section>

      </div>

      {/* Sticky footer */}
      <div style={{
        flexShrink: 0,
        borderTop: '1px solid rgba(245,210,193,0.15)',
        padding: '12px 20px 16px',
        display: 'flex', flexDirection: 'column', gap: 8,
        backgroundColor: '#420424',
      }}>
        <button onClick={handleSave} style={{
          width: '100%', padding: '10px 0',
          backgroundColor: '#f5d2c1', color: '#420424',
          border: 'none', borderRadius: 4,
          fontSize: 14, fontWeight: 700, cursor: 'pointer',
          letterSpacing: '0.02em',
        }}>
          Save Spot
        </button>
        <button onClick={handleMoveStart} style={{
          width: '100%', padding: '9px 0',
          backgroundColor: 'transparent', color: '#f5d2c1',
          border: '1px solid rgba(245,210,193,0.3)', borderRadius: 4,
          fontSize: 13, cursor: 'pointer',
        }}>
          Move Spot
        </button>
        <button onClick={handleDelete} style={{
          width: '100%', padding: '9px 0',
          backgroundColor: 'transparent', color: '#ff6b6b',
          border: 'none', borderRadius: 4,
          fontSize: 13, cursor: 'pointer',
        }}>
          Delete Spot
        </button>
      </div>
    </div>
  );
}
