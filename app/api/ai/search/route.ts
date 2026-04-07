import { NextRequest, NextResponse } from 'next/server';
import { AiSearchService } from '@/services/aiSearch.service';

export async function POST(req: NextRequest) {
  try {
    const { query } = await req.json();

    if (!query) {
      return NextResponse.json({ success: false, data: null, error: 'Query is required' }, { status: 400 });
    }

    if (AiSearchService.isGreeting(query)) {
      return NextResponse.json({
        success: true,
        data: [],
        summary: "Hello! 👋 I'm your AI Assistant. I can help you find files using semantic search. How can I help you today?",
        error: null
      });
    }

    const results = await AiSearchService.search(query);
    const summary = await AiSearchService.genterateSummary(query, results);

    return NextResponse.json({
      success: true,
      data: results,
      summary,
      error: null
    });
  } catch (err: any) {
    console.error('AI Search API Error:', err);
    return NextResponse.json({
      success: false,
      data: null,
      error: err?.message || 'Search failed'
    }, { status: 500 });
  }
}
