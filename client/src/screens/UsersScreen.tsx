// RecruitFlow — מסך ניהול משתמשים (קבוצה ג')
import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Heading, Text, Field, Input, Select, Button, Card, Badge, Table } from '../design-system/components';
import type { LoggedInUser } from './LoginScreen';

const API_BASE = 'http://localhost:4000';

type UserRow = {
  id: string;
  name: string;
  email: string;
  authorization: string | null;
  isActive: boolean;
};

type AuthorizationOption = { id: string; name: string };

type EditForm = { name: string; email: string; authorizationName: string; isActive: boolean };

// כל הבקשות למשתמשים עוברות דרך הפונקציה הזו - מוסיפה את הטוקן, וזורקת אם התשובה לא תקינה
async function apiFetch(path: string, options: RequestInit = {}) {
  const token = localStorage.getItem('rf_token');
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error ?? 'משהו השתבש');
  }
  return data;
}

export default function UsersScreen({ me, onLogout }: { me: LoggedInUser; onLogout: () => void }) {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [authorizations, setAuthorizations] = useState<AuthorizationOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // מצב טופס היצירה
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newAuthorizationName, setNewAuthorizationName] = useState('');
  const [creating, setCreating] = useState(false);

  // מצב עריכה - איזו שורה נערכת כרגע ומה הערכים שלה בטופס
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditForm | null>(null);
  const [saving, setSaving] = useState(false);

  async function loadUsers() {
    setLoading(true);
    setError(null);
    try {
      const [usersData, authorizationsData] = await Promise.all([
        apiFetch('/api/users'),
        apiFetch('/api/authorizations'),
      ]);
      setUsers(usersData);
      setAuthorizations(authorizationsData);
      if (!newAuthorizationName && authorizationsData[0]) {
        setNewAuthorizationName(authorizationsData[0].name);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'טעינת הנתונים נכשלה';
      // 401/403 - הטוקן לא תקין או פג תוקף, מחזירים למסך ההתחברות
      if (message.includes('טוקן') || message.includes('מחוברת')) {
        onLogout();
        return;
      }
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setCreating(true);
    try {
      await apiFetch('/api/users', {
        method: 'POST',
        body: JSON.stringify({
          name: newName,
          email: newEmail,
          password: newPassword,
          authorizationName: newAuthorizationName,
        }),
      });
      setNewName('');
      setNewEmail('');
      setNewPassword('');
      await loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'יצירת המשתמש נכשלה');
    } finally {
      setCreating(false);
    }
  }

  function startEdit(user: UserRow) {
    setEditingId(user.id);
    setEditForm({
      name: user.name,
      email: user.email,
      authorizationName: user.authorization ?? authorizations[0]?.name ?? '',
      isActive: user.isActive,
    });
  }

  async function handleSaveEdit(id: string) {
    if (!editForm) return;
    setSaving(true);
    setError(null);
    try {
      await apiFetch(`/api/users/${id}`, {
        method: 'PUT',
        body: JSON.stringify(editForm),
      });
      setEditingId(null);
      setEditForm(null);
      await loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שמירת השינויים נכשלה');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ maxWidth: 900, margin: '40px auto', display: 'flex', flexDirection: 'column', gap: 24 }} dir="rtl">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Heading level={1}>ניהול משתמשים</Heading>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Text>{me.name}</Text>
          <Button variant="secondary" onClick={onLogout}>יציאה</Button>
        </div>
      </div>

      {error && (
        <Card>
          <Text><span style={{ color: '#B5453A' }}>{error}</span></Text>
        </Card>
      )}

      <Card>
        <Heading level={3}>הוספת משתמש</Heading>
        <form onSubmit={handleCreate} style={{ marginTop: 16, display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
          <Field label="שם">
            <Input value={newName} onChange={(e) => setNewName(e.target.value)} required />
          </Field>
          <Field label="דוא&quot;ל">
            <Input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} required />
          </Field>
          <Field label="סיסמה">
            <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required />
          </Field>
          <Field label="פרופיל הרשאה">
            <Select value={newAuthorizationName} onChange={(e) => setNewAuthorizationName(e.target.value)} required>
              {authorizations.map((a) => (
                <option key={a.id} value={a.name}>{a.name}</option>
              ))}
            </Select>
          </Field>
          <div style={{ alignSelf: 'end' }}>
            <Button type="submit" variant="primary" disabled={creating}>
              {creating ? 'מוסיפה...' : 'הוספה'}
            </Button>
          </div>
        </form>
      </Card>

      <Card>
        <Heading level={3}>רשימת משתמשים</Heading>
        {loading ? (
          <Text>טוענת...</Text>
        ) : (
          <div style={{ marginTop: 12 }}>
            <Table>
              <thead>
                <tr>
                  <th>שם</th>
                  <th>דוא&quot;ל</th>
                  <th>פרופיל הרשאה</th>
                  <th>סטטוס</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) =>
                  editingId === user.id && editForm ? (
                    <tr key={user.id}>
                      <td><Input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} /></td>
                      <td><Input value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} /></td>
                      <td>
                        <Select value={editForm.authorizationName} onChange={(e) => setEditForm({ ...editForm, authorizationName: e.target.value })}>
                          {authorizations.map((a) => (
                            <option key={a.id} value={a.name}>{a.name}</option>
                          ))}
                        </Select>
                      </td>
                      <td>
                        <Select
                          value={editForm.isActive ? 'active' : 'inactive'}
                          onChange={(e) => setEditForm({ ...editForm, isActive: e.target.value === 'active' })}
                        >
                          <option value="active">פעיל</option>
                          <option value="inactive">מושבת</option>
                        </Select>
                      </td>
                      <td style={{ display: 'flex', gap: 8 }}>
                        <Button variant="primary" disabled={saving} onClick={() => handleSaveEdit(user.id)}>
                          {saving ? 'שומרת...' : 'שמירה'}
                        </Button>
                        <Button variant="secondary" onClick={() => { setEditingId(null); setEditForm(null); }}>
                          ביטול
                        </Button>
                      </td>
                    </tr>
                  ) : (
                    <tr key={user.id}>
                      <td>{user.name}</td>
                      <td>{user.email}</td>
                      <td>{user.authorization ?? '—'}</td>
                      <td>
                        <Badge tone={user.isActive ? 'success' : 'draft'}>{user.isActive ? 'פעיל' : 'מושבת'}</Badge>
                      </td>
                      <td>
                        <Button variant="secondary" onClick={() => startEdit(user)}>עריכה</Button>
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
