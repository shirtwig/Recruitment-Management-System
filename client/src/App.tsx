import { useState } from 'react';
import LoginScreen from './screens/LoginScreen';
import UsersScreen from './screens/UsersScreen';
import type { LoggedInUser } from './screens/LoginScreen';

function App() {
  const [me, setMe] = useState<LoggedInUser | null>(null);

  function handleLogout() {
    localStorage.removeItem('rf_token');
    setMe(null);
  }

  if (!me) {
    return <LoginScreen onLoginSuccess={setMe} />;
  }

  return <UsersScreen me={me} onLogout={handleLogout} />;
}

export default App;
