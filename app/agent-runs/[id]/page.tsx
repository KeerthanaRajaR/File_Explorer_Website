"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { fetchAgentRunById, replayAgentRun } from '@/lib/agentControl/api';
import type { AgentRunDetail } from '@/types/agentControl';
import { RunTimeline } from '@/components/features/RunTimeline';

export default function AgentRunDetailsPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const runId = params.id;

  const [run, setRun] = useState<AgentRunDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [replaying, setReplaying] = useState(false);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        setLoading(true);
        const data = await fetchAgentRunById(runId);
        if (mounted) setRun(data);
      } catch (err) {
        if (mounted) setError(err instanceof Error ? err.message : 'Failed to load run details');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    if (runId) load();

    return () => {
      mounted = false;
    };
  }, [runId]);

  const handleReplay = async () => {
    try {
      setReplaying(true);
      const replay = await replayAgentRun(runId);
      router.push(`/agent-runs/${replay.new_run_id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Replay failed');
    } finally {
      setReplaying(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-950 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-4">
        <div className="flex items-center gap-2">
          <Link href="/agent-runs" className="inline-flex items-center gap-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800">
            <ArrowLeft size={16} /> Back to Runs
          </Link>
        </div>

        {loading ? (
          <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-8 text-sm text-gray-500 dark:text-gray-400">Loading run details...</div>
        ) : error ? (
          <div className="rounded-xl border border-rose-200 dark:border-rose-900/40 bg-rose-50 dark:bg-rose-900/20 p-4 text-sm text-rose-700 dark:text-rose-300">{error}</div>
        ) : run ? (
          <RunTimeline run={run} onReplay={handleReplay} replaying={replaying} />
        ) : (
          <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-8 text-sm text-gray-500 dark:text-gray-400">Run not found.</div>
        )}
      </div>
    </main>
  );
}
