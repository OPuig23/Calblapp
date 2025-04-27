import React, { useState } from 'react';

export default function LoginForm({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {'/api/login', {http://localhost:3001/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.message || 'Error de connexió');
        return;
      }

      const data = await res.json();
      onLogin(data);
    } catch {
      setError('Error del servidor');
    }
  };

  return (
    <form onSubmit={handleSubmit}
          className="max-w-sm mx-auto p-4 space-y-4 bg-white shadow rounded-xl">
      <h2 className="text-2xl font-bold text-center">Login</h2>

      <div>
        <label className="block mb-1">Usuari</label>
        <input
          type="text"
          value={username}
          onChange={e => setUsername(e.target.value)}
          className="w-full border p-2 rounded"
        />
      </div>

      <div>
        <label className="block mb-1">Contrasenya</label>
        <input
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          className="w-full border p-2 rounded"
        />
      </div>

      {error && <p className="text-red-600">{error}</p>}

      <button type="submit"
              className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700">
        Entrar
      </button>
    </form>
  );
}
