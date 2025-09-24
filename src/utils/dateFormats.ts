// src/utils/dateFormats.ts

/** Converteix una ISO date (`YYYY-MM-DD`) a la data local en format curt */
export function formatISODate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString();
  } catch {
    return iso;
  }
}

/** Converteix una hora ISO (`HH:mm`) a format local `HH:mm` (24h) */
export function formatISOTime(isoTime: string): string {
  try {
    // Afegim data dummy perquè Date el parsegi
    const d = new Date(`1970-01-01T${isoTime}`);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return isoTime;
  }
}
