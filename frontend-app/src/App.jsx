import React, { useState } from 'react';
import LoginForm from './components/LoginForm';
import MainMenu from './components/MainMenu';

function App() {
  const [user, setUser] = useState(null);

  const handleLogin = (userData) => {
    setUser(userData);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      {!user ? (
        <LoginForm onLogin={handleLogin} />
      ) : (
        <div className="space-y-6 text-center">
          <h1 className="text-2xl font-bold">Benvingut, {user.username}!</h1>
          <p className="text-gray-600">Rol: <strong>{user.role}</strong></p>
          <MainMenu user={user} />
        </div>
      )}
    </div>
  );
}

export default App;
