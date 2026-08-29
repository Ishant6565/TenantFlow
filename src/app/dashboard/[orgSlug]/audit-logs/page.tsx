'use client';

import React, { useState, useEffect, use } from 'react';
import {
  History,
  Shield,
  Clock,
  Terminal,
  Activity,
  AlertCircle,
  FileCode,
  User,
  Globe,
} from 'lucide-react';

export default function AuditLogsPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = use(params);

  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadLogs() {
      try {
        const res = await fetch(`/api/orgs/${orgSlug}/audit-logs`);
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Failed to fetch audit logs');
        }
        const data = await res.json();
        setLogs(data.auditLogs || []);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    loadLogs();
  }, [orgSlug]);

  const getActionBadgeColor = (action: string) => {
    if (action.includes('CREATED') || action.includes('UPGRADED') || action.includes('ACCEPTED')) {
      return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    }
    if (action.includes('INVITED') || action.includes('UPDATED')) {
      return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20';
    }
    if (action.includes('DELETED') || action.includes('REMOVED') || action.includes('DOWNGRADED')) {
      return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
    }
    if (action.includes('QUOTA_EXCEEDED')) {
      return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
    }
    return 'bg-slate-800 text-slate-300 border-slate-700';
  };

  if (loading) {
    return <div className="py-12 text-center text-xs text-slate-400">Streaming security audit logs...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Security Audit Trail</h1>
        <p className="text-xs text-slate-400 mt-1">
          Immutable compliance record tracking all organization mutations, role updates, and billing actions.
        </p>
      </div>

      {error ? (
        <div className="p-6 rounded-2xl glass-panel border border-slate-800 text-center">
          <AlertCircle className="w-8 h-8 text-rose-400 mx-auto mb-2" />
          <h3 className="text-sm font-semibold text-white mb-1">Access Restricted</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">{error}</p>
        </div>
      ) : (
        <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden">
          <div className="p-4 sm:px-6 border-b border-slate-800/80 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-indigo-400" />
              <h2 className="text-sm font-semibold text-white">Event Stream ({logs.length} logged)</h2>
            </div>
            <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
              Live Audit Active
            </span>
          </div>

          {logs.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs">
              No audit logs recorded for this organization yet.
            </div>
          ) : (
            <div className="divide-y divide-slate-800/80">
              {logs.map((log) => (
                <div key={log.id} className="p-4 sm:px-6 text-xs hover:bg-slate-900/40 transition-colors space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2.5 py-0.5 rounded-full border text-[10px] font-mono font-semibold ${getActionBadgeColor(
                          log.action
                        )}`}
                      >
                        {log.action}
                      </span>
                      <span className="text-slate-300 font-medium">{log.resourceType}</span>
                    </div>

                    <div className="flex items-center gap-3 text-[11px] text-slate-400">
                      <span className="flex items-center gap-1 font-mono">
                        <Globe className="w-3 h-3 text-slate-400" /> {log.ipAddress}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400" />{' '}
                        {new Date(log.createdAt).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <div className="flex items-center gap-1.5">
                      <User className="w-3 h-3 text-slate-400" />
                      <span>Actor: <strong className="text-slate-300">{log.actor?.name || log.actor?.email || 'System'}</strong></span>
                    </div>
                  </div>

                  {log.metadata && (
                    <div className="p-2 rounded-lg bg-slate-950/80 border border-slate-800/80 font-mono text-[11px] text-slate-300 overflow-x-auto">
                      <code>{JSON.stringify(log.metadata, null, 2)}</code>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
