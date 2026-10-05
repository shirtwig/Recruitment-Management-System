// RecruitFlow — עורך permissions משותף (בשימוש גם במסך משתמשים וגם במסך הרשאות)
import { Select, Button, Text } from './design-system/components';

export type Action = 'CREATE' | 'READ' | 'UPDATE' | 'DELETE';
export const ALL_ACTIONS: Action[] = ['CREATE', 'READ', 'UPDATE', 'DELETE'];
export const ACTION_LABELS: Record<Action, string> = {
  CREATE: 'יצירה',
  READ: 'קריאה',
  UPDATE: 'עדכון',
  DELETE: 'מחיקה',
};

export type Permission = { resource: string; actions: Action[] };

// שמות ה-resource כפי שהם נבדקים בפועל בקוד (requireAuthorization('Position', ...) וכו') -
// המילה האנגלית היא הערך שנשמר ונבדק; התווית העברית היא רק מה שמוצג במסך.
// כשקבוצה אחרת (B/A) מגדירה משאב חדש משלה (Candidate, Scoring...) - מוסיפים אותו כאן.
export const RESOURCE_OPTIONS: { value: string; label: string }[] = [
  { value: 'Position', label: 'משרות' },
  { value: 'Application', label: 'הגשות מועמדים' },
  { value: 'EvaluationScore', label: 'ציוני הערכה' },
  { value: 'TenderSummary', label: 'סיכום מכרז' },
  { value: 'Document', label: 'מסמכים' },
  { value: 'User', label: 'משתמשים' },
  { value: 'Authorization', label: 'פרופילי הרשאה' },
];

function resourceLabel(value: string): string {
  return RESOURCE_OPTIONS.find((r) => r.value === value)?.label ?? value;
}

export function formatPermissions(permissions: Permission[]): string {
  if (permissions.length === 0) return '—';
  return permissions.map((p) => `${resourceLabel(p.resource)}: ${p.actions.map((a) => ACTION_LABELS[a]).join('/')}`).join(', ');
}

export function PermissionsEditor({ permissions, onChange }: { permissions: Permission[]; onChange: (p: Permission[]) => void }) {
  function updateRow(index: number, patch: Partial<Permission>) {
    onChange(permissions.map((p, i) => (i === index ? { ...p, ...patch } : p)));
  }

  function toggleAction(index: number, action: Action) {
    const row = permissions[index];
    const actions = row.actions.includes(action)
      ? row.actions.filter((a) => a !== action)
      : [...row.actions, action];
    updateRow(index, { actions });
  }

  function removeRow(index: number) {
    onChange(permissions.filter((_, i) => i !== index));
  }

  function addRow() {
    onChange([...permissions, { resource: RESOURCE_OPTIONS[0].value, actions: [] }]);
  }

  if (permissions.length === 0) {
    return (
      <div>
        <Text>אין עדיין הרשאות מוגדרות.</Text>
        <div style={{ marginTop: 8 }}>
          <Button type="button" variant="secondary" onClick={addRow}>הוספת הרשאה על משאב</Button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0, border: '1px solid var(--rf-line)', borderRadius: 4 }}>
      {permissions.map((p, i) => (
        <div
          key={i}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            flexWrap: 'wrap',
            padding: '10px 12px',
            borderBottom: i < permissions.length - 1 ? '1px solid var(--rf-line)' : 'none',
          }}
        >
          <Select value={p.resource} onChange={(e) => updateRow(i, { resource: e.target.value })} style={{ maxWidth: 180 }}>
            {RESOURCE_OPTIONS.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </Select>
          <div style={{ display: 'flex', gap: 14 }}>
            {ALL_ACTIONS.map((action) => (
              <label key={action} className="rf-text" style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 14 }}>
                <input
                  type="checkbox"
                  checked={p.actions.includes(action)}
                  onChange={() => toggleAction(i, action)}
                />
                {ACTION_LABELS[action]}
              </label>
            ))}
          </div>
          <Button type="button" variant="danger" onClick={() => removeRow(i)} style={{ marginInlineStart: 'auto' }}>הסרה</Button>
        </div>
      ))}
      <div style={{ padding: '10px 12px' }}>
        <Button type="button" variant="secondary" onClick={addRow}>הוספת הרשאה על משאב נוסף</Button>
      </div>
    </div>
  );
}
