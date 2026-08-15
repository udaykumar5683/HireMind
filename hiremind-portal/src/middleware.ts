import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

function copyCookiesToResponse(request: NextRequest, response: NextResponse): NextResponse {
  request.cookies.getAll().forEach((cookie) => {
    response.cookies.set(cookie.name, cookie.value, cookie);
  });
  return response;
}

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value,
            ...options,
          });
          response.cookies.set({
            name,
            value,
            ...options,
          });
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          });
          response.cookies.set({
            name,
            value: '',
            ...options,
          });
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const protectedCandidate = path.startsWith('/candidate');
  const protectedRecruiter = path.startsWith('/recruiter');

  if (protectedCandidate || protectedRecruiter) {
    if (!user) {
      const loginUrl = new URL('/login', request.url);
      if (protectedCandidate) loginUrl.searchParams.set('role', 'Candidate');
      if (protectedRecruiter) loginUrl.searchParams.set('role', 'Recruiter');
      loginUrl.searchParams.set('next', request.nextUrl.pathname);
      const redirectResponse = NextResponse.redirect(loginUrl);
      return copyCookiesToResponse(request, redirectResponse);
    }
  }

  return response;
}

export const config = {
  matcher: ['/candidate/:path*', '/recruiter/:path*'],
};
