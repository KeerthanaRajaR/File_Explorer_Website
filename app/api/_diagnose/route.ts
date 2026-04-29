import { NextRequest } from 'next/server';
import { createSuccessResponse, createErrorResponse } from '@/lib/server/apiWrapper';
import { getBaseRoot } from '@/lib/server/pathUtils';
import fs from 'fs';

const maskKey = (v?: string) => {
  if (!v) return 'undefined';
  if (v.length <= 8) return '****';
  return `${v.slice(0, 4)}...${v.slice(-4)}`;
};

export async function GET(request: NextRequest) {
  try {
    const groqPresent = !!process.env.GROQ_API_KEY;
    const groqSample = groqPresent ? maskKey(process.env.GROQ_API_KEY) : 'undefined';
    const fileExplorerRootEnv = process.env.FILE_EXPLORER_ROOT || 'undefined';

    let baseRoot = '';
    try {
      baseRoot = getBaseRoot();
    } catch (e: any) {
      baseRoot = `ERROR: ${String(e)}`;
    }

    let baseRootExists = false;
    let listing: string[] = [];
    try {
      baseRootExists = fs.existsSync(baseRoot as string);
      if (baseRootExists) {
        listing = fs.readdirSync(baseRoot as string).slice(0, 50);
      }
    } catch (e: any) {
      listing = [`ERROR: ${String(e)}`];
    }

    return createSuccessResponse({
      groqPresent,
      groqSample,
      fileExplorerRootEnv,
      baseRoot,
      baseRootExists,
      baseRootEntries: listing,
    });
  } catch (err: any) {
    console.error('API /api/_diagnose Error:', err);
    return createErrorResponse('DIAGNOSE_FAILED', 500);
  }
}
