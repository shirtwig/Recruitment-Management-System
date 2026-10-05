// RecruitFlow — מסך ניהול פרופילי הרשאה (קבוצה ג')
import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Heading, Text, Field, Input, Button, Card, Table } from '../design-system/components';
import { apiFetch, ApiError } from '../api';
import { PermissionsEditor, formatPermissions } from '../PermissionsEditor';
import type { Permission } from '../PermissionsEditor';

type AuthorizationRow = { id: string; name: string; permissions: Permission[] };

export default function AuthorizationsScreen({ onBack, onLogout }: { onBack: () => void; onLogout: () => void }) {
  const [authorizations, setAuthorizations] = useState<AuthorizationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [newName, setNewName] = useState('');
  const [newPermissions, setNewPermissions] = useState<Permission[]>([]);
  const [creating, setCreating] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editPermissions, setEditPermissions] = useState<Permission[]>([]);
  const [saving, setSaving] = useState(false);

  async function loadAuthorizations() {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch('/api/authorizations');
      setAuthorizations(data);
    } catch (err) {
      // 401 = טוקן לא תקין - מחזירים להתחברות. 403 = מחוברת בסדר, רק בלי הרשאה למסך הזה - לא מוציאים.
      if (err instanceof ApiError && err.status === 401) {
        onLogout();
        return;
      }
      if (err instanceof ApiError && err.status === 403) {
        setError('אין לך הרשאה לצפות במסך ניהול ההרשאות - פני למנהל המערכת כדי לקבל הרשאת Authorization:READ');
        return;
      }
      setError(err instanceof Error ? err.message : 'טעינת הנתונים נכשלה');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAuthorizations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setCreating(true);
    try {
      await apiFetch('/api/authorizations', {
        method: 'POST',
        body: JSON.stringify({ name: newName, permissions: newPermissions }),
      });
      setNewName('');
      setNewPermissions([]);
      await loadAuthorizations();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'יצירת הפרופיל נכשלה');
    } finally {
      setCreating(false);
    }
  }

  function startEdit(a: AuthorizationRow) {
    setEditingId(a.id);
    setEditName(a.name);
    setEditPermissions(a.permissions);
  }

  async function handleSaveEdit(id: string) {
    setSaving(true);
    setError(null);
    try {
      await apiFetch(`/api/authorizations/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ name: editName, permissions: editPermissions }),
      });
      setEditingId(null);
      await loadAuthorizations();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שמירת השינויים נכשלה');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ maxWidth: 1000, margin: '40px auto', display: 'flex', flexDirection: 'column', gap: 24 }} dir="rtl">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Heading level={1}>ניהול הרשאות</Heading>
          <Button variant="secondary" onClick={onBack}>חזרה למשתמשים</Button>
        </div>
        <Button variant="secondary" onClick={onLogout}>יציאה</Button>
      </div>

      {error && (
        <Card>
          <Text><span style={{ color: '#B5453A' }}>{error}</span></Text>
        </Card>
      )}

      <Card>
        <Heading level={3}>הוספת פרופיל הרשאה</Heading>
        <form onSubmit={handleCreate} style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Field label="שם הפרופיל" hint="לדוגמה: רפרנט, מראיין">
            <Input value={newName} onChange={(e) => setNewName(e.target.value)} required style={{ maxWidth: 260 }} />
          </Field>
          <PermissionsEditor permissions={newPermissions} onChange={setNewPermissions} />
          <div>
            <Button type="submit" variant="primary" disabled={creating}>
              {creating ? 'מוסיפה...' : 'הוספת פרופיל'}
            </Button>
          </div>
        </form>
      </Card>

      <Card>
        <Heading level={3}>פרופילי הרשאה קיימים</Heading>
        {loading ? (
          <Text>טוענת...</Text>
        ) : (
          <div style={{ marginTop: 12 }}>
            <Table>
              <thead>
                <tr>
                  <th>שם</th>
                  <th>הרשאות</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {authorizations.map((a) =>
                  editingId === a.id ? (
                    <tr key={a.id}>
                      <td><Input value={editName} onChange={(e) => setEditName(e.target.value)} /></td>
                      <td><PermissionsEditor permissions={editPermissions} onChange={setEditPermissions} /></td>
                      <td style={{ display: 'flex', gap: 8 }}>
                        <Button variant="primary" disabled={saving} onClick={() => handleSaveEdit(a.id)}>
                          {saving ? 'שומרת...' : 'שמירה'}
                        </Button>
                        <Button variant="secondary" onClick={() => setEditingId(null)}>ביטול</Button>
                      </td>
                    </tr>
                  ) : (
                    <tr key={a.id}>
                      <td>{a.name}</td>
                      <td>{formatPermissions(a.permissions)}</td>
                      <td>
                        <Button variant="secondary" onClick={() => startEdit(a)}>עריכה</Button>
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </Table>
          </div>
        )}
      </Card>
    </div>
  );
}
