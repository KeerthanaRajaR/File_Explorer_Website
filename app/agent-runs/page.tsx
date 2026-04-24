"use client";

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Activity } from 'lucide-react';
import { fetchAgentRuns } from '@/lib/agentControl/api';
import type { AgentRunListItem } from '@/types/agentControl';
import { AgentRunsTable } from '@/components/features/AgentRunsTable';

const CHAT_RUN_IDS_STORAGE_KEY = 'file-explorer-ai-chat-run-ids-v1';

export default function AgentRunsPage() {
  const [runs, setRuns] = useState<AgentRunListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'running' | 'success' | 'failed'>('all');
  const [scopeFilter, setScopeFilter] = useState<'current' | 'all'>('current');
  const [sessionRunIds, setSessionRunIds] = useState<string[]>([]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(CHAT_RUN_IDS_STORAGE_KEY);
      const parsed = raw ? (JSON.parse(raw) as unknown) : [];
      const ids = Array.isArray(parsed)
        ? parsed.filter((item): item is string => typeof item === 'string')
        : [];
      setSessionRunIds(ids);
      if (ids.length === 0) {
        setScopeFilter('all');
      }
    } catch {
      setScopeFilter('all');
    }

    let mounted = true;

    const load = async () => {
      try {
        setLoading(true);
        const data = await fetchAgentRuns();
        if (mounted) setRuns(data);
      } catch (err) {
        if (mounted) setError(err instanceof Error ? err.message : 'Failed to load runs');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();

    return () => {
      mounted = false;
    };
  }, []);

  const filteredRuns = useMemo(() => {
    const byScope = scopeFilter === 'current'
      ? runs.filter((run) => sessionRunIds.includes(run.id))
      : runs;

    if (statusFilter === 'all') return byScope;
    return byScope.filter((run) => run.status === statusFilter);
  }, [runs, statusFilter, scopeFilter, sessionRunIds]);

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-950 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <Activity className="text-indigo-500" size={22} /> Agent Runs
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Monitor execution status and step counts.</p>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={scopeFilter}
              onChange={(e) => setScopeFilter(e.target.value as typeof scopeFilter)}
              className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
            >
              <option value="current">Current Chat Runs</option>
              <option value="all">All Runs</option>
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
              className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
            >
              <option value="all">All Status</option>
              <option value="running">Running</option>
              <option value="success">Success</option>
              <option value="failed">Failed</option>
            </select>
            <Link href="/" className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800">
              Back to Explorer
            </Link>
          </div>
        </div>

        {loading ? (
          <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-8 text-sm text-gray-500 dark:text-gray-400">Loading runs...</div>
        ) : error ? (
          <div className="rounded-xl border border-rose-200 dark:border-rose-900/40 bg-rose-50 dark:bg-rose-900/20 p-4 text-sm text-rose-700 dark:text-rose-300">{error}</div>
        ) : (
          <AgentRunsTable runs={filteredRuns} />
        )}
      </div>
    </main>
  );
}
