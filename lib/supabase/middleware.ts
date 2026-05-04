import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

function isInvalidSupabaseEnv(url: string | undefined, key: string | undefined) {
  if (!url?.trim() || !key?.trim()) return true;
  if (url.startsWith('your_') || key.startsWith('your_')) return true;
  return false;
}

export async function updateSession(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const pathname = request.nextUrl.pathname;
  const isAuthPage = pathname.startsWith('/login') || pathname.startsWith('/signup');

  // Never expose the app shell without Supabase configured — send users to login with a hint.
  if (isInvalidSupabaseEnv(supabaseUrl, supabaseAnonKey)) {
    if (!isAuthPage) {
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      url.searchParams.set('reason', 'config');
      return NextResponse.redirect(url);
    }
    return NextResponse.next({ request });
  }

  const clientUrl = supabaseUrl as string;
  const clientKey = supabaseAnonKey as string;

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(clientUrl, clientKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  const { data: { user } } = await supabase.auth.getUser();

  if (!user && !isAuthPage) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  if (user && isAuthPage) {
    const url = request.nextUrl.clone();
    url.pathname = '/';
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
