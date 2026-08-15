
import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

// When running Next.js dev server, process.cwd() is the project root (hiremind-portal directory)
const PROFILE_DB_DIR = path.resolve(process.cwd(), '../Student_Profile_Database');

export async function GET(
  request: Request,
  { params }: { params: Promise<{ filename: string }> }
) {
  console.log('[Single Profile API] Starting request');
  console.log('[Single Profile API] PROFILE_DB_DIR:', PROFILE_DB_DIR);
  try {
    const resolvedParams = await params;
    console.log('[Single Profile API] Resolved params:', resolvedParams);
    const filename = decodeURIComponent(resolvedParams.filename);
    console.log('[Single Profile API] Decoded filename:', filename);
    
    const filePath = path.join(PROFILE_DB_DIR, filename);
    console.log('[Single Profile API] File path:', filePath);
    
    // Check if file exists
    try {
      await fs.access(filePath);
      console.log('[Single Profile API] File exists');
    } catch (accessErr) {
      console.error('[Single Profile API] File does not exist:', accessErr);
      throw new Error('Profile file not found');
    }
    
    const data = await fs.readFile(filePath, 'utf-8');
    console.log('[Single Profile API] File read successfully');
    
    const profile = JSON.parse(data);
    console.log('[Single Profile API] JSON parsed successfully');
    
    return NextResponse.json(profile);
  } catch (error) {
    console.error('[Single Profile API] Error reading profile:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to read profile' },
      { status: 500 }
    );
  }
}
