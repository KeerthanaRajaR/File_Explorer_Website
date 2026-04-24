"use client";

import type { AgentRunDetail } from '@/types/agentControl';

interface RunTimelineProps {
  run: AgentRunDetail;
  onReplay: () => void;
  replaying: boolean;
}

const statusClass: Record<string, string> = {
  started: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  running: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  success: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  failed: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
};

const durationMs = (start: string, end: string): number => {
  return Math.max(0, new Date(end).getTime() - new Date(start).getTime());
};

export function RunTimeline({ run, onReplay, replaying }: RunTimelineProps) {
  const startedAt = new Date(run.created_at);
  const endedAt = new Date(run.updated_at);
  const totalDurationMs = Math.max(0, endedAt.getTime() - startedAt.getTime());

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 flex flex-wrap gap-4 justify-between items-center">
        <div>
          <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Run Details</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">{run.user_query}</p>
        </div>

        <button
          onClick={onReplay}
          disabled={replaying}
          className="rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed text-white px-4 py-2 text-sm font-medium"
        >
          {replaying ? 'Replaying...' : 'Replay Run'}
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-3">
          <div className="text-xs text-gray-500 dark:text-gray-400">Status</div>
          <div className={`mt-1 inline-flex rounded-full px-2 py-1 text-xs font-semibold ${statusClass[run.status] || statusClass.running}`}>
            {run.status}
          </div>
        </div>
        <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-3">
          <div className="text-xs text-gray-500 dark:text-gray-400">Total Time</div>
          <div className="mt-1 text-base font-semibold text-gray-900 dark:text-gray-100">{(totalDurationMs / 1000).toFixed(2)}s</div>
        </div>
      </div>

      <div className="space-y-3">
        {run.steps.map((step, index) => (
          <div key={step.id} className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <h2 className="font-semibold text-gray-900 dark:text-gray-100">
                {index + 1}. {step.step_name}
              </h2>
              <div className="flex items-center gap-2 text-xs">
                {step.tool_name && (
                  <span className="rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-2 py-1">
                    Tool: {step.tool_name}
                  </span>
                )}
                <span className={`rounded-full px-2 py-1 font-semibold ${statusClass[step.status] || statusClass.started}`}>
                  {step.status}
                </span>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-1 lg:grid-cols-2 gap-3">
              <div>
                <div className="text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">Input</div>
                <pre className="text-xs p-3 bg-gray-50 dark:bg-gray-950 rounded-lg border border-gray-200 dark:border-gray-800 overflow-auto max-h-56">
{JSON.stringify(step.input ?? {}, null, 2)}
                </pre>
              </div>
              <div>
                <div className="text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">Output</div>
                <pre className="text-xs p-3 bg-gray-50 dark:bg-gray-950 rounded-lg border border-gray-200 dark:border-gray-800 overflow-auto max-h-56">
{JSON.stringify(step.output ?? {}, null, 2)}
                </pre>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
              <span>Started: {new Date(step.created_at).toLocaleTimeString()}</span>
              <span>Duration: {durationMs(step.created_at, step.updated_at)} ms</span>
            </div>

            {step.error && (
              <div className="mt-3 rounded-lg border border-rose-200 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-900/20 p-3 text-xs text-rose-700 dark:text-rose-300">
                {step.error}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
