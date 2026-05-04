import { createBrowserClient } from '@supabase/ssr';

/** Next.js loads `.env` then `.env.local`; duplicate keys use `.env.local` (see https://nextjs.org/docs/app/building-your-application/configuring/environment-variables). */

function isValidUrl(url: string | undefined) {
  return url && (url.startsWith('http://') || url.startsWith('https://'));
}

export function createClient() {
  const url = isValidUrl(process.env.NEXT_PUBLIC_SUPABASE_URL)
    ? process.env.NEXT_PUBLIC_SUPABASE_URL!
    : 'https://placeholder.supabase.co';
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.startsWith('your_')
    ? 'placeholder-anon-key-for-build'
    : (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key-for-build');
  return createBrowserClient(url, key);
}
