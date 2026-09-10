// RecruitFlow — מסך התחברות (קבוצה ג')
import { useState } from 'react';
import type { FormEvent } from 'react';
import { Heading, Text, Field, Input, Button, Card, Badge } from '../design-system/components';

const API_BASE = 'http://localhost:4000';

type LoggedInUser = {
  id: number;
  fullName: string;
  email: string;
  role: string;
};

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<LoggedInUser | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? 'ההתחברות נכשלה');
        return;
      }

      // שומרים את הטוקן כדי שנוכל להשתמש בו בבקשות הבאות (למשל /api/users)
      localStorage.setItem('rf_token', data.token);
      setUser(data.user);
    } catch {
      setError('לא ניתן להתחבר לשרת - ודאי שהוא רץ על פורט 4000');
    } finally {
      setLoading(false);
    }
  }

  if (user) {
    return (
      <div style={{ maxWidth: 420, margin: '80px auto' }} dir="rtl">
        <Card>
          <Heading level={2}>התחברת בהצלחה</Heading>
          <Text>{user.fullName} ({user.email})</Text>
          <div style={{ marginTop: 12 }}>
            <Badge tone="success">{user.role}</Badge>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 420, margin: '80px auto' }} dir="rtl">
      <Card>
        <Heading level={1}>NEXTGen</Heading>
        <Text>התחברות למערכת</Text>

        <form onSubmit={handleSubmit} style={{ marginTop: 20 }}>
          <Field label="דוא&quot;ל">
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@recruitflow.local"
              required
            />
          </Field>

          <Field label="סיסמה">
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </Field>

          {error && (
            <Text>
              <span style={{ color: '#B5453A' }}>{error}</span>
            </Text>
          )}

          <div style={{ marginTop: 16 }}>
            <Button type="submit" variant="primary" disabled={loading}>
              {loading ? 'מתחברת...' : 'כניסה מאובטחת'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
