import React from 'react';

export default function MainMenu({ user }) {
  const { role } = user;

  const renderMenu = () => {
    switch (role) {
      case 'admin':
        return (
          <>
            <li>⚙️ Gestió d'usuaris</li>
            <li>🔍 Cercar esdeveniment</li>
            <li>📊 Informes complets</li>
          </>
        );
      case 'directiu':
        return (
          <>
            <li>🔍 Cercar esdeveniment</li>
            <li>📊 Informes estadístics</li>
            <li>📁 Contractes i pressupostos</li>
          </>
        );
      case 'capdepartament':
        return (
          <>
            <li>🔍 Cercar esdeveniment</li>
            <li>👥 Personal i quadrants</li>
            <li>📋 Incidències</li>
          </>
        );
      case 'treballador':
        return (
          <>
            <li>🔍 Cercar esdeveniment</li>
            <li>📋 Veure horaris</li>
          </>
        );
      default:
        return <li>❌ Rol no reconegut</li>;
    }
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow max-w-md mx-auto">
      <h2 className="text-xl font-bold mb-4">🎮 Menú Principal</h2>
      <ul className="list-disc pl-5 space-y-2 text-left">
        {renderMenu()}
      </ul>
    </div>
  );
}
