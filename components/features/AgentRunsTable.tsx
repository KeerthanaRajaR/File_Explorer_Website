"use client";

import Link from 'next/link';
import type { AgentRunListItem } from '@/types/agentControl';

interface AgentRunsTableProps {
  runs: AgentRunListItem[];
}

const statusClass: Record<string, string> = {
  running: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  success: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  failed: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
};

export function AgentRunsTable({ runs }: AgentRunsTableProps) {
  if (runs.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 dark:border-gray-700 p-8 text-sm text-gray-500 dark:text-gray-400">
        No agent runs found yet.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-900/80 text-gray-500 dark:text-gray-400">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Query</th>
              <th className="px-4 py-3 text-left font-medium">Status</th>
              <th className="px-4 py-3 text-left font-medium">Steps</th>
              <th className="px-4 py-3 text-left font-medium">Created</th>
            </tr>
          </thead>
          <tbody>
            {runs.map((run) => (
              <tr key={run.id} className="border-t border-gray-100 dark:border-gray-800 hover:bg-indigo-50/60 dark:hover:bg-indigo-900/10 transition-colors">
                <td className="px-4 py-3">
                  <Link className="font-medium text-gray-800 dark:text-gray-100 hover:text-indigo-600 dark:hover:text-indigo-300" href={`/agent-runs/${run.id}`}>
                    {run.user_query.length > 72 ? `${run.user_query.slice(0, 72)}…` : run.user_query}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${statusClass[run.status] || statusClass.running}`}>
                    {run.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{run.step_count}</td>
                <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{new Date(run.created_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
