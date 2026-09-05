import { NextResponse } from 'next/server';

const API_BASE_URL =
  (process.env.NEXT_PUBLIC_RESUME_PARSER_URL ||
    process.env.NEXT_PUBLIC_RESUME_API_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    process.env.VITE_API_URL ||
    'http://localhost:5000').replace(/\/$/, '');

interface ProfileSummary {
  filename: string;
  full_name: string;
  target_role: string;
  all_recommended_roles: any[];
  timestamp: string;
  source: 'student' | 'generated' | 'local';
}

function summarizeProfile(filename: string, profileData: any, source: ProfileSummary['source']): ProfileSummary {
  const fullName =
    profileData?.header?.full_name ||
    profileData?.full_name ||
    profileData?.profile?.name ||
    profileData?.profile?.user_submitted_data?.name ||
    'Applicant Candidate';

  const recommendedRoles =
    profileData?.top_recommended_roles ||
    profileData?.pipeline_results?.agent4?.data?.top_recommended_roles ||
    profileData?.pipeline_results?.agent3?.data?.recommended_roles ||
    [];

  const targetRole =
    profileData?.header?.target_role ||
    (recommendedRoles.length > 0
      ? typeof recommendedRoles[0] === 'string'
        ? recommendedRoles[0]
        : recommendedRoles[0]?.role
      : 'Software Engineer');

  return {
    filename,
    full_name: fullName,
    target_role: targetRole,
    all_recommended_roles: recommendedRoles,
    timestamp: profileData?.timestamp || new Date().toISOString(),
    source,
  };
}

async function fetchFromApi(path: string, source: ProfileSummary['source']): Promise<ProfileSummary[]> {
  try {
    const res = await fetch(`${API_BASE_URL}${path}`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    });
    if (!res.ok) {
      throw new Error(`API ${path} returned ${res.status}`);
    }
    const payload = await res.json();
    const items: any[] = Array.isArray(payload) ? payload : payload.files || [];
    const results: ProfileSummary[] = [];
    for (const item of items) {
      let data: any;
      let filename: string;
      if (typeof item === 'string') {
        filename = item.split('/').pop() || item;
        try {
          const dataRes = await fetch(`${API_BASE_URL}/read-profile?path=${encodeURIComponent(item)}`, { cache: 'no-store' });
          if (dataRes.ok) data = await dataRes.json();
        } catch {
          // noop
        }
      } else {
        filename = item.filename || item.name || item.path?.split('/').pop() || 'unknown.json';
        data = item.data || item;
      }
      if (data) {
        results.push(summarizeProfile(filename, data, source));
      } else {
        results.push({
          filename,
          full_name: filename.replace(/\.json$/i, '').replace(/[_-]/g, ' '),
          target_role: 'Software Engineer',
          all_recommended_roles: [],
          timestamp: item.timestamp || new Date().toISOString(),
          source,
        });
      }
    }
    return results;
  } catch (err) {
    console.warn(`[List Profiles API] Remote ${source} fetch failed: ${(err as Error).message}`);
    return [];
  }
}

const LOCAL_STUDENT_DIR =
  process.env.PROFILE_DB_DIR ||
  (process.cwd() ? require('node:path').resolve(process.cwd(), '../Student_Profile_Database') : null);

const LOCAL_GEN_DIR =
  process.env.PROFILE_GEN_DIR ||
  (process.cwd() ? require('node:path').resolve(process.cwd(), '../Profile_generator/Profile_Database') : null);

async function localFallback(dir: string | null, source: ProfileSummary['source']): Promise<ProfileSummary[]> {
  if (!dir) return [];
  try {
    const fs = await import('node:fs/promises');
    const path = await import('node:path');
    const files = await fs.readdir(dir).catch(() => [] as string[]);
    const results: ProfileSummary[] = [];
    const seen = new Set<string>();
    for (const file of files) {
      if (!file.endsWith('.json') || seen.has(file)) continue;
      seen.add(file);
      try {
        const raw = await fs.readFile(path.join(dir, file), 'utf-8');
        const parsed = JSON.parse(raw);
        results.push(summarizeProfile(file, parsed, source));
      } catch {
        // skip corrupt files
      }
    }
    return results;
  } catch {
    return [];
  }
}

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const [students, generated] = await Promise.all([
      fetchFromApi('/student-profiles', 'student').then(async (r) =>
        r.length > 0 ? r : localFallback(LOCAL_STUDENT_DIR, 'student'),
      ),
      fetchFromApi('/generated-profiles', 'generated').then(async (r) =>
        r.length > 0 ? r : localFallback(LOCAL_GEN_DIR, 'generated'),
      ),
    ]);

    const seenFiles = new Map<string, ProfileSummary>();
    for (const p of [...students, ...generated]) {
      if (!seenFiles.has(p.filename)) seenFiles.set(p.filename, p);
    }

    const merged = Array.from(seenFiles.values()).sort((a, b) => {
      const ta = new Date(a.timestamp || 0).getTime();
      const tb = new Date(b.timestamp || 0).getTime();
      return tb - ta;
    });

    return NextResponse.json(merged);
  } catch (error) {
    console.error('[List Profiles API] Fatal error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to read profiles' },
      { status: 500 },
    );
  }
}
