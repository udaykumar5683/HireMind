import { NextResponse } from 'next/server';

const API_BASE_URL =
  (process.env.NEXT_PUBLIC_RESUME_PARSER_URL ||
    process.env.NEXT_PUBLIC_RESUME_API_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    process.env.VITE_API_URL ||
    'http://localhost:5000').replace(/\/$/, '');

const LOCAL_STUDENT_DIR =
  process.env.PROFILE_DB_DIR ||
  (process.cwd() ? require('node:path').resolve(process.cwd(), '../Student_Profile_Database') : null);

const LOCAL_GEN_DIR =
  process.env.PROFILE_GEN_DIR ||
  (process.cwd() ? require('node:path').resolve(process.cwd(), '../Profile_generator/Profile_Database') : null);

async function localRead(filename: string): Promise<any | null> {
  if (!LOCAL_STUDENT_DIR || !LOCAL_GEN_DIR) return null;
  try {
    const fs = await import('node:fs/promises');
    const path = await import('node:path');
    const possiblePaths = [path.join(LOCAL_STUDENT_DIR, filename), path.join(LOCAL_GEN_DIR, filename)];
    for (const p of possiblePaths) {
      try {
        await fs.access(p);
        const raw = await fs.readFile(p, 'utf-8');
        return JSON.parse(raw);
      } catch {
        continue;
      }
    }
    return null;
  } catch {
    return null;
  }
}

async function readFromApi(filename: string): Promise<any | null> {
  const storagePaths = [
    `student_profiles/${filename}`,
    `generated_profiles/${filename}`,
    filename,
  ];

  for (const storagePath of storagePaths) {
    try {
      const encoded = encodeURIComponent(storagePath);
      const listRes = await fetch(`${API_BASE_URL}/read-profile?path=${encoded}`, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        cache: 'no-store',
      });
      if (listRes.ok) {
        const payload = await listRes.json();
        if (payload && !payload.error) return payload;
      }
    } catch (err) {
      // try next path
    }
  }

  // Fallback: ask the API to look in known student/generated folder prefixes
  try {
    const query = encodeURIComponent(filename);
    const res = await fetch(`${API_BASE_URL}/student-profiles?lookup=${query}`, { cache: 'no-store' });
    if (res.ok) {
      const payload = await res.json();
      const arr = Array.isArray(payload) ? payload : payload.files || [];
      const match = arr.find((f: any) =>
        (typeof f === 'string' ? f : f.name || f.filename || f.path || '').endsWith(filename),
      );
      if (match) {
        const dataPath = typeof match === 'string' ? match : match.path || match.filename;
        const r2 = await fetch(`${API_BASE_URL}/read-profile?path=${encodeURIComponent(dataPath)}`, { cache: 'no-store' });
        if (r2.ok) return r2.json();
      }
    }
  } catch {
    // noop
  }

  return null;
}

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ filename: string }> },
) {
  try {
    const resolvedParams = await params;
    const filename = decodeURIComponent(resolvedParams.filename);

    const fromApi = await readFromApi(filename);
    if (fromApi) return NextResponse.json(fromApi);

    const fromLocal = await localRead(filename);
    if (fromLocal) return NextResponse.json(fromLocal);

    return NextResponse.json({ error: 'Profile file not found' }, { status: 404 });
  } catch (error) {
    console.error('[Single Profile API] Fatal error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to read profile' },
      { status: 500 },
    );
  }
}
