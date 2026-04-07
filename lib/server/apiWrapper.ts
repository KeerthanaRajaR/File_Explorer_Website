import { NextResponse } from 'next/server';
import { ApiResponse } from '@/types/api';

export function createErrorResponse(error: string, status: number = 400) {
  const body: ApiResponse = { success: false, data: null, error };
  return NextResponse.json(body, { status });
}

export function createSuccessResponse<T>(data: T, status: number = 200) {
  const body: ApiResponse<T> = { success: true, data, error: null };
  return NextResponse.json(body, { status });
}
