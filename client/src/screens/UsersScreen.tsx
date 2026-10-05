// RecruitFlow — מסך ניהול משתמשים (קבוצה ג')
import { Fragment, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Heading, Text, Field, Input, Select, Button, Card, Badge, Table } from '../design-system/components';
import type { LoggedInUser } from './LoginScreen';
import { apiFetch, ApiError } from '../api';
import { PermissionsEditor, formatPermissions } from '../PermissionsEditor';
import type { Permission } from '../PermissionsEditor';

type UserRow = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  department: string | null;
  startDate: string | null;
  authorization: string | null;
  permissions: Permission[];
  isActive: boolean;
};

// כולל permissions - כדי שנוכל למלא מראש את עורך ההרשאות כשבוחרים פרופיל
type AuthorizationOption = { id: string; name: string; permissions: Permission[] };

type UserForm = {
  firstName: string;
  lastName: string;
  email: string;
  authorizationName: string;
  phone: string;
  department: string;
  startDate: string;
  isActive: boolean;
  permissions: Permission[];
};

// תואם לטווח שהשרת בודק (routes/users.ts) - 50 שנה אחורה עד שנה קדימה
function dateInputBound(yearsOffset: number): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() + yearsOffset);
  return d.toISOString().slice(0, 10);
}
const START_DATE_MIN = dateInputBound(-50);
const START_DATE_MAX = dateInputBound(1);

const EMPTY_FORM: UserForm = {
  firstName: '',
  lastName: '',
  email: '',
  authorizationName: '',
  phone: '',
  department: '',
  startDate: '',
  isActive: true,
  permissions: [],
};

export default function UsersScreen({
  me,
  onLogout,
  onNavigateToAuthorizations,
}: {
  me: LoggedInUser;
  onLogout: () => void;
  onNavigateToAuthorizations: () => void;
}) {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [authorizations, setAuthorizations] = useState<AuthorizationOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // מצב טופס היצירה
  const [newForm, setNewForm] = useState<UserForm>(EMPTY_FORM);
  const [newPassword, setNewPassword] = useState('');
  const [creating, setCreating] = useState(false);

  // מצב עריכה - איזו שורה נערכת כרגע ומה הערכים שלה בטופס
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<UserForm | null>(null);
  const [saving, setSaving] = useState(false);

  // מצב מחיקה - איזה משתמש נמחק כרגע (למניעת לחיצה כפולה)
  const [deletingId, setDeletingId] = useState<string | null>(null);

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
      setNewForm((f) => (f.authorizationName ? f : { ...f, authorizationName: authorizationsData[0]?.name ?? '' }));
    } catch (err) {
      // 401 = הטוקן לא תקין/פג תוקף - מחזירים למסך התחברות.
      // 403 = ההתחברות תקינה, אבל אין למשתמש הזה הרשאה לצפות במסך הזה - זה *לא* אומר שהטוקן שגוי,
      // אז לא מוציאים אותה מהמערכת, רק מציגים הודעה ברורה (בעבר טעות הייתה מתנהגת אותו הדבר ב-2 המקרים)
      if (err instanceof ApiError && err.status === 401) {
        onLogout();
        return;
      }
      if (err instanceof ApiError && err.status === 403) {
        setError('אין לך הרשאה לצפות במסך ניהול המשתמשים - פני למנהל המערכת כדי לקבל הרשאת User:READ');
        return;
      }
      setError(err instanceof Error ? err.message : 'טעינת הנתונים נכשלה');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // כשבוחרים פרופיל הרשאה בטופס היצירה - ממלאים מראש את עורך ההרשאות עם ההרשאות של הפרופיל,
  // בתור נקודת התחלה בלבד. אפשר עדיין לסמן/לבטל סימון לפני שיוצרים את המשתמש בפועל (ראי PermissionsEditor).
  function handleNewAuthorizationChange(name: string) {
    const profile = authorizations.find((a) => a.name === name);
    setNewForm({ ...newForm, authorizationName: name, permissions: profile ? profile.permissions.map((p) => ({ ...p, actions: [...p.actions] })) : [] });
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setCreating(true);
    try {
      await apiFetch('/api/users', {
        method: 'POST',
        body: JSON.stringify({ ...newForm, password: newPassword }),
      });
      setNewForm((f) => ({ ...EMPTY_FORM, authorizationName: f.authorizationName }));
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
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      authorizationName: user.authorization ?? authorizations[0]?.name ?? '',
      phone: user.phone ?? '',
      department: user.department ?? '',
      startDate: user.startDate ? user.startDate.slice(0, 10) : '',
      isActive: user.isActive,
      permissions: user.permissions.map((p) => ({ ...p, actions: [...p.actions] })),
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

  async function handleDelete(user: UserRow) {
    if (!window.confirm(`למחוק את ${user.firstName} ${user.lastName}? לא ניתן לבטל פעולה זו.`)) return;
    setDeletingId(user.id);
    setError(null);
    try {
      await apiFetch(`/api/users/${user.id}`, { method: 'DELETE' });
      await loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'מחיקת המשתמש נכשלה');
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div style={{ maxWidth: 1100, margin: '40px auto', display: 'flex', flexDirection: 'column', gap: 24 }} dir="rtl">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Heading level={1}>ניהול משתמשים</Heading>
          <Button variant="secondary" onClick={onNavigateToAuthorizations}>ניהול הרשאות</Button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Text>{me.firstName} {me.lastName}</Text>
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
        <form onSubmit={handleCreate} style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
            <Field label="שם פרטי">
              <Input value={newForm.firstName} onChange={(e) => setNewForm({ ...newForm, firstName: e.target.value })} required />
            </Field>
            <Field label="שם משפחה">
              <Input value={newForm.lastName} onChange={(e) => setNewForm({ ...newForm, lastName: e.target.value })} required />
            </Field>
            <Field label="דוא&quot;ל">
              <Input type="email" value={newForm.email} onChange={(e) => setNewForm({ ...newForm, email: e.target.value })} required />
            </Field>
            <Field label="סיסמה">
              <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required />
            </Field>
            <Field label="פרופיל הרשאה" hint="ממלא מראש את ההרשאות למטה - עדיין ניתן לשינוי">
              <Select value={newForm.authorizationName} onChange={(e) => handleNewAuthorizationChange(e.target.value)} required>
                {authorizations.map((a) => (
                  <option key={a.id} value={a.name}>{a.name}</option>
                ))}
              </Select>
            </Field>
            <Field label="טלפון" hint="לדוגמה: 050-1234567">
              <Input value={newForm.phone} onChange={(e) => setNewForm({ ...newForm, phone: e.target.value })} placeholder="050-1234567" />
            </Field>
            <Field label="יחידה ארגונית">
              <Input value={newForm.department} onChange={(e) => setNewForm({ ...newForm, department: e.target.value })} />
            </Field>
            <Field label="תאריך תחילת תפקיד">
              <Input type="date" min={START_DATE_MIN} max={START_DATE_MAX} value={newForm.startDate} onChange={(e) => setNewForm({ ...newForm, startDate: e.target.value })} />
            </Field>
          </div>

          <Field label="הרשאות אישיות" hint="ניתן להתאים אישית לפני היצירה - למשל שני מראיינים עם עריכה שונה">
            <PermissionsEditor permissions={newForm.permissions} onChange={(permissions) => setNewForm({ ...newForm, permissions })} />
          </Field>

          <div>
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
                  <th>טלפון</th>
                  <th>יחידה</th>
                  <th>פרופיל הרשאה</th>
                  <th>הרשאות אישיות</th>
                  <th>סטטוס</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) =>
                  editingId === user.id && editForm ? (
                    <Fragment key={user.id}>
                      <tr>
                        <td style={{ display: 'flex', gap: 6 }}>
                          <Input value={editForm.firstName} onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })} placeholder="שם פרטי" />
                          <Input value={editForm.lastName} onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })} placeholder="שם משפחה" />
                        </td>
                        <td><Input value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} /></td>
                        <td><Input value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} /></td>
                        <td><Input value={editForm.department} onChange={(e) => setEditForm({ ...editForm, department: e.target.value })} /></td>
                        <td>
                          <Select value={editForm.authorizationName} onChange={(e) => setEditForm({ ...editForm, authorizationName: e.target.value })}>
                            {authorizations.map((a) => (
                              <option key={a.id} value={a.name}>{a.name}</option>
                            ))}
                          </Select>
                        </td>
                        <td colSpan={2}>
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
                      <tr>
                        <td colSpan={8}>
                          <Text>הרשאות אישיות:</Text>
                          <div style={{ marginTop: 8 }}>
                            <PermissionsEditor permissions={editForm.permissions} onChange={(permissions) => setEditForm({ ...editForm, permissions })} />
                          </div>
                        </td>
                      </tr>
                    </Fragment>
                  ) : (
                    <tr key={user.id}>
                      <td>{user.firstName} {user.lastName}</td>
                      <td>{user.email}</td>
                      <td>{user.phone ?? '—'}</td>
                      <td>{user.department ?? '—'}</td>
                      <td>{user.authorization ?? '—'}</td>
                      <td>{formatPermissions(user.permissions)}</td>
                      <td>
                        <Badge tone={user.isActive ? 'success' : 'draft'}>{user.isActive ? 'פעיל' : 'מושבת'}</Badge>
                      </td>
                      <td style={{ display: 'flex', gap: 8 }}>
                        <Button variant="secondary" onClick={() => startEdit(user)}>עריכה</Button>
                        <Button variant="danger" disabled={deletingId === user.id} onClick={() => handleDelete(user)}>
                          {deletingId === user.id ? 'מוחקת...' : 'מחיקה'}
                        </Button>
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
