"use client";

import React, { useEffect, useState } from 'react';
import { Sparkles, X } from 'lucide-react';

interface FileInsightsProps {
  path?: string | null;
  onClose: () => void;
}

type InsightResponse = {
  summary: string;
  keyPoints: string[];
};

export function FileInsights({ path, onClose }: FileInsightsProps) {
  const [loading, setLoading] = useState(false);
  const [insight, setInsight] = useState<InsightResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      if (!path) return;
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/ai/summarize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ path }),
        });
        const data = await res.json();
        if (data.success) {
          setInsight(data.data as InsightResponse);
        } else {
          setError(data.error || 'Failed to summarize file');
        }
      } catch (err: any) {
        setError(err.message || 'Failed to summarize file');
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [path]);

  if (!path) return null;

  return (
    <div className="rounded-xl border border-purple-200 dark:border-purple-800 bg-purple-50/70 dark:bg-purple-900/20 p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3 mb-3">
        <h4 className="flex items-center gap-2 font-semibold text-purple-900 dark:text-purple-200">
          <Sparkles size={16} /> Instant File Insight
        </h4>
        <button onClick={onClose} className="p-1 rounded hover:bg-purple-100 dark:hover:bg-purple-800/40">
          <X size={16} />
        </button>
      </div>

      {loading && <div className="text-sm text-purple-700 dark:text-purple-300">Generating summary…</div>}
      {error && <div className="text-sm text-red-600 dark:text-red-400">{error}</div>}
      {insight && !loading && (
        <div className="space-y-3">
          <p className="text-sm text-gray-800 dark:text-gray-100">{insight.summary}</p>
          {insight.keyPoints.length > 0 && (
            <ul className="space-y-1 text-sm text-gray-700 dark:text-gray-300 list-disc pl-5">
              {insight.keyPoints.map((point, index) => (
                <li key={`${point}-${index}`}>{point}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
