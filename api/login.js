// api/login.js
import { readFileSync } from 'fs';
import { parse } from 'csv-parse/sync';

export default function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end('Method Not Allowed');
  }

  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ message: 'Falta usuari o contrasenya' });
  }

  // Llegeix el CSV d’usuaris
  const csv = readFileSync(new URL('./users.csv', import.meta.url), 'utf-8');
  const users = parse(csv, { columns: true, skip_empty_lines: true });

  // Cerca l’usuari
  const user = users.find(
    u => u.username === username && u.password === password
  );

  if (!user) {
    return res.status(401).json({ message: 'Usuari o contrasenya incorrectes' });
  }

  // Retorna només el que necessitem al frontend
  return res.status(200).json({ username: user.username, role: user.role });
}
