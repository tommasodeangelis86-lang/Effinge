export default function leggiSupabase() {
  const url = (process.env.EFFINGE_SUPABASE_URL || '').trim().replace(/\/$/, '');
  const chiave = (process.env.EFFINGE_SUPABASE_PUBLISHABLE_KEY || '').trim();
  if (!url && !chiave) return null;
  if (!/^https:\/\/[a-z0-9]{20}\.supabase\.co$/.test(url) || !/^sb_publishable_[\w-]{10,}$/.test(chiave)) {
    throw new Error('Indica il Project URL di Supabase e una chiave sb_publishable_ valida.');
  }
  return { url, chiave };
}
