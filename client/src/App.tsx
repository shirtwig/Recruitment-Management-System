import { useState } from 'react';
import LoginScreen from './screens/LoginScreen';
import UsersScreen from './screens/UsersScreen';
import AuthorizationsScreen from './screens/AuthorizationsScreen';
import ResetPasswordScreen from './screens/ResetPasswordScreen';
import type { LoggedInUser } from './screens/LoginScreen';

type Screen = 'users' | 'authorizations';

// קוראים את הטוקן מהקישור שנשלח במייל (?resetToken=...) - ראי screens/LoginScreen.tsx + server/src/routes/auth.ts
function getResetTokenFromUrl(): string | null {
  return new URLSearchParams(window.location.search).get('resetToken');
}

function App() {
  const [me, setMe] = useState<LoggedInUser | null>(null);
  const [screen, setScreen] = useState<Screen>('users');
  const [resetToken, setResetToken] = useState<string | null>(getResetTokenFromUrl);

  function handleLogout() {
    localStorage.removeItem('rf_token');
    setMe(null);
    setScreen('users');
  }

  function clearResetToken() {
    setResetToken(null);
    // מנקים את ה-query string כדי שרענון הדף לא יחזיר למסך איפוס הסיסמה
    window.history.replaceState(null, '', window.location.pathname);
  }

  if (resetToken) {
    return <ResetPasswordScreen token={resetToken} onDone={clearResetToken} />;
  }

  if (!me) {
    return <LoginScreen onLoginSuccess={setMe} />;
  }

  if (screen === 'authorizations') {
    return <AuthorizationsScreen onBack={() => setScreen('users')} onLogout={handleLogout} />;
  }

  return <UsersScreen me={me} onLogout={handleLogout} onNavigateToAuthorizations={() => setScreen('authorizations')} />;
}

export default App;
