// RecruitFlow — מסך בחירת סיסמה חדשה, נפתח מהקישור שנשלח במייל "שכחתי סיסמה"
import { useState } from 'react';
import type { FormEvent } from 'react';
import { Heading, Text, Field, Input, Button, Card } from '../design-system/components';

const API_BASE = 'http://localhost:4000';
const MIN_PASSWORD_LENGTH = 6;

export default function ResetPasswordScreen({ token, onDone }: { token: string; onDone: () => void }) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`הסיסמה חייבת להיות לפחות ${MIN_PASSWORD_LENGTH} תווים`);
      return;
    }

    if (password !== confirmPassword) {
      setError('הסיסמאות לא תואמות');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? 'איפוס הסיסמה נכשל');
        return;
      }

      setSuccess(true);
    } catch {
      setError('לא ניתן להתחבר לשרת - ודאי שהוא רץ על פורט 4000');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 420, margin: '80px auto' }} dir="rtl">
      <Card>
        <Heading level={1}>NEXTGen</Heading>
        <Text>בחירת סיסמה חדשה</Text>

        {success ? (
          <>
            <Text>
              <span style={{ color: '#2E7D4F' }}>הסיסמה אופסה בהצלחה. אפשר להתחבר עכשיו עם הסיסמה החדשה.</span>
            </Text>
            <div style={{ marginTop: 16 }}>
              <Button type="button" variant="primary" onClick={onDone}>
                חזרה להתחברות
              </Button>
            </div>
          </>
        ) : (
          <form onSubmit={handleSubmit} style={{ marginTop: 20 }}>
            <Field label="סיסמה חדשה">
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </Field>

            <Field label="אימות סיסמה">
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
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
                {loading ? 'שומרת...' : 'שמירת סיסמה חדשה'}
              </Button>
              <button
                type="button"
                onClick={onDone}
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
