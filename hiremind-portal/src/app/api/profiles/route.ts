
import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

// When running Next.js dev server, process.cwd() is the project root (hiremind-portal directory)
const PROFILE_DB_DIR = path.resolve(process.cwd(), '../Student_Profile_Database');

export async function GET() {
  console.log('[List Profiles API] Starting request');
  console.log('[List Profiles API] PROFILE_DB_DIR:', PROFILE_DB_DIR);
  try {
    const files = await fs.readdir(PROFILE_DB_DIR);
    console.log('[List Profiles API] Files found:', files);
    
    const profiles = [];
    for (const file of files) {
      if (file.endsWith('.json')) {
        const filePath = path.join(PROFILE_DB_DIR, file);
        console.log('[List Profiles API] Reading file:', filePath);
        const data = await fs.readFile(filePath, 'utf-8');
        const profile = JSON.parse(data);
        const recommendedRoles = profile.pipeline_results?.agent3?.data?.recommended_roles || [];
        const primaryRole = recommendedRoles.length > 0 ? recommendedRoles[0].role : "Candidate Profile";
        profiles.push({
          filename: file,
          full_name: profile.profile?.name || profile.profile?.user_submitted_data?.name,
          target_role: primaryRole,
          all_recommended_roles: recommendedRoles,
          timestamp: profile.timestamp
        });
      }
    }
    console.log('[List Profiles API] Returning profiles:', profiles);
    return NextResponse.json(profiles);
  } catch (error) {
    console.error('[List Profiles API] Error reading profiles:', error);
    return NextResponse.json({ error: 'Failed to read profiles' }, { status: 500 });
  }
}
