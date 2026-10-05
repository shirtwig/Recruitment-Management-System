// RecruitFlow — מסך התחברות (קבוצה ג')
import { useState } from 'react';
import type { FormEvent } from 'react';
import { Heading, Text, Field, Input, Button, Card } from '../design-system/components';

const API_BASE = 'http://localhost:4000';

export type LoggedInUser = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  authorization: string | null;
};

export default function LoginScreen({ onLoginSuccess }: { onLoginSuccess: (user: LoggedInUser) => void }) {
  const [mode, setMode] = useState<'login' | 'forgot'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // הודעת ההצלחה של "שכחתי סיסמה" - נפרדת משגיאת ההתחברות כדי שלא תימחק כשמחליפים מצב
  const [forgotMessage, setForgotMessage] = useState<string | null>(null);

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
      onLoginSuccess(data.user);
    } catch {
      setError('לא ניתן להתחבר לשרת - ודאי שהוא רץ על פורט 4000');
    } finally {
      setLoading(false);
    }
  }

  async function handleForgotSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setForgotMessage(null);
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? 'משהו השתבש');
        return;
      }

      // השרת מחזיר הודעה גנרית בכוונה (גם אם המייל לא קיים) - מטעמי אבטחה
      setForgotMessage(data.message);
    } catch {
      setError('לא ניתן להתחבר לשרת - ודאי שהוא רץ על פורט 4000');
    } finally {
      setLoading(false);
    }
  }

  function switchMode(next: 'login' | 'forgot') {
    setMode(next);
    setError(null);
    setForgotMessage(null);
  }

  return (
    <div style={{ maxWidth: 420, margin: '80px auto' }} dir="rtl">
      <Card>
        <Heading level={1}>NEXTGen</Heading>
        <Text>{mode === 'login' ? 'התחברות למערכת' : 'שחזור סיסמה'}</Text>

        {mode === 'login' ? (
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

            <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 16 }}>
              <Button type="submit" variant="primary" disabled={loading}>
                {loading ? 'מתחברת...' : 'כניסה מאובטחת'}
              </Button>
              <button
                type="button"
                onClick={() => switchMode('forgot')}
                style={{ background: 'none', border: 'none', color: '#2E6F9E', cursor: 'pointer', fontSize: 14, textDecoration: 'underline' }}
              >
                שכחתי סיסמה
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleForgotSubmit} style={{ marginTop: 20 }}>
            <Text>הזיני את כתובת הדוא&quot;ל שלך, ואם קיים חשבון נשלח אליו קישור לאיפוס סיסמה.</Text>

            <Field label="דוא&quot;ל">
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@recruitflow.local"
                required
              />
            </Field>

            {error && (
              <Text>
                <span style={{ color: '#B5453A' }}>{error}</span>
              </Text>
            )}

            {forgotMessage && (
              <Text>
                <span style={{ color: '#2E7D4F' }}>{forgotMessage}</span>
              </Text>
            )}

            <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 16 }}>
              <Button type="submit" variant="primary" disabled={loading}>
                {loading ? 'שולחת...' : 'שליחת קישור לאיפוס'}
              </Button>
              <button
                type="button"
                onClick={() => switchMode('login')}
                style={{ background: 'none', border: 'none', color: '#2E6F9E', cursor: 'pointer', fontSize: 14, textDecoration: 'underline' }}
              >
                חזרה להתחברות
              </button>
            </div>
          </form>
        )}
      </Card>
    </div>
  );
}
