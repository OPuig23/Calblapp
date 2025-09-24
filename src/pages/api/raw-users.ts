// src/pages/api/raw-users.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import path from 'path'
import { promises as fs } from 'fs'

export default async function handler(_req: NextApiRequest, res: NextApiResponse) {
  const csvPath = path.join(process.cwd(), 'src', 'data', 'users.csv')
  const txt = await fs.readFile(csvPath, 'utf8')
  res.setHeader('Content-Type', 'text/csv')
  res.status(200).send(txt)
}
