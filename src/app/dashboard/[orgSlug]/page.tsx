'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import {
  FolderGit2,
  Users,
  CreditCard,
  ShieldCheck,
  Zap,
  ArrowRight,
  TrendingUp,
  Activity,
  Layers,
  Database,
  Lock,
} from 'lucide-react';

export default function OverviewPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = use(params);

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{
    projects: any[];
    quota: any;
    currentUserRole: string;
  } | null>(null);
  const [usageData, setUsageData] = useState<any>(null);
  const [simulatingApi, setSimulatingApi] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const [projRes, usageRes] = await Promise.all([
          fetch(`/api/orgs/${orgSlug}/projects`),
          fetch(`/api/orgs/${orgSlug}/usage/meter`),
        ]);

        if (projRes.ok) {
          const projData = await projRes.json();
          setData(projData);
        }
        if (usageRes.ok) {
          const uData = await usageRes.json();
          setUsageData(uData);
        }
      } catch (err) {
        console.error('Failed to load overview data', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [orgSlug]);

  const handleSimulateApiCall = async () => {
    setSimulatingApi(true);
    try {
      const res = await fetch(`/api/orgs/${orgSlug}/usage/meter`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ units: 25 }),
      });
      const resData = await res.json();
      if (res.ok) {
        // Refresh usage
        const usageRes = await fetch(`/api/orgs/${orgSlug}/usage/meter`);
        if (usageRes.ok) {
          setUsageData(await usageRes.json());
        }
      } else {
        alert(resData.error || 'API quota reached');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSimulatingApi(false);
    }
  };

  if (loading) {
    return (
      <div className="py-12 text-center text-xs text-slate-400">
        Loading organization metrics...
      </div>
    );
  }

  const projectCount = data?.projects?.length || 0;
  const projectMax = usageData?.quotas?.projects?.max || 3;
  const projectPct = Math.min(100, Math.round((projectCount / projectMax) * 100));

  const memberCount = usageData?.quotas?.members?.current || 1;
  const memberMax = usageData?.quotas?.members?.max || 2;
  const memberPct = Math.min(100, Math.round((memberCount / memberMax) * 100));

  const apiCount = usageData?.quotas?.apiRequests?.current || 0;
  const apiMax = usageData?.quotas?.apiRequests?.max || 1000;
  const apiPct = Math.min(100, Math.round((apiCount / apiMax) * 100));

  const planName = usageData?.plan?.name || 'Starter (Free)';

  return (
    <div className="space-y-8">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Organization Overview</h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time multi-tenant telemetry, resource limits, and role access.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleSimulateApiCall}
            disabled={simulatingApi}
            className="glass-panel px-3.5 py-2 rounded-xl text-xs text-indigo-300 hover:text-white border border-indigo-500/30 hover:border-indigo-500/60 transition-all flex items-center gap-2 shadow-md shadow-indigo-500/10"
          >
            <Zap className="w-3.5 h-3.5 text-indigo-400" />
            {simulatingApi ? 'Triggering...' : 'Simulate API Call (+25 reqs)'}
          </button>
          <Link
            href={`/dashboard/${orgSlug}/billing`}
            className="bg-indigo-600 hover:bg-indigo-500 text-white px-3.5 py-2 rounded-xl text-xs font-medium transition-all shadow-md shadow-indigo-600/30 flex items-center gap-1.5"
          >
            Plan: {planName} <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Card 1: Projects */}
        <div className="p-5 rounded-2xl glass-panel border border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-slate-400">Isolated Projects</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <FolderGit2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white mb-1">
            {projectCount}{' '}
            <span className="text-xs font-normal text-slate-400">/ {projectMax} max</span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-1.5 mb-2 mt-3">
            <div
              className={`h-1.5 rounded-full ${projectPct >= 100 ? 'bg-rose-500' : 'bg-indigo-500'}`}
              style={{ width: `${projectPct}%` }}
            />
          </div>
          <div className="text-[10px] text-slate-400 flex justify-between">
            <span>{projectPct}% quota used</span>
            <Link href={`/dashboard/${orgSlug}/projects`} className="text-indigo-400 hover:underline">
              Manage projects →
            </Link>
          </div>
        </div>

        {/* Card 2: Team Members */}
        <div className="p-5 rounded-2xl glass-panel border border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-slate-400">Team Size</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white mb-1">
            {memberCount}{' '}
            <span className="text-xs font-normal text-slate-400">/ {memberMax} seats</span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-1.5 mb-2 mt-3">
            <div
              className={`h-1.5 rounded-full ${memberPct >= 100 ? 'bg-rose-500' : 'bg-emerald-500'}`}
              style={{ width: `${memberPct}%` }}
            />
          </div>
          <div className="text-[10px] text-slate-400 flex justify-between">
            <span>Your role: <strong>{data?.currentUserRole}</strong></span>
            <Link href={`/dashboard/${orgSlug}/team`} className="text-emerald-400 hover:underline">
              Invite team →
            </Link>
          </div>
        </div>

        {/* Card 3: API Usage Meter */}
        <div className="p-5 rounded-2xl glass-panel border border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-slate-400">Metered API Requests</span>
            <div className="w-8 h-8 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white mb-1">
            {apiCount.toLocaleString()}{' '}
            <span className="text-xs font-normal text-slate-400">/ {apiMax.toLocaleString()} reqs</span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-1.5 mb-2 mt-3">
            <div
              className={`h-1.5 rounded-full ${apiPct >= 100 ? 'bg-rose-500' : 'bg-violet-500'}`}
              style={{ width: `${apiPct}%` }}
            />
          </div>
          <div className="text-[10px] text-slate-400 flex justify-between">
            <span>Resets monthly</span>
            <span className="text-violet-300">{apiMax - apiCount} remaining</span>
          </div>
        </div>
      </div>

      {/* Tenant Isolation Proof Banner */}
      <div className="p-6 rounded-2xl glass-panel border border-slate-800 relative overflow-hidden">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white mb-1">
              Active Security Guard: Row-Scoped Tenant Boundary
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed max-w-3xl mb-4">
              All queries executed on this dashboard are automatically filtered through the <code>withTenantScope({orgSlug})</code> boundary. If another user in a separate organization queries their database, they can never view or modify your data.
            </p>
            <div className="flex flex-wrap gap-2 text-[11px] font-mono">
              <span className="px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-slate-300">
                🔒 Isolation: Scoped by org_id
              </span>
              <span className="px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-slate-300">
                🔑 Session: JWT 7-Day Expiring
              </span>
              <span className="px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-slate-300">
                ⚡ Webhook: Idempotent Key Protected
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Projects Preview */}
      <div className="glass-panel rounded-2xl border border-slate-800 p-6">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <FolderGit2 className="w-4 h-4 text-indigo-400" />
            <h2 className="text-sm font-semibold text-white">Active Projects in Workspace</h2>
          </div>
          <Link
            href={`/dashboard/${orgSlug}/projects`}
            className="text-xs text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1"
          >
            View all projects <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {projectCount === 0 ? (
          <div className="text-center py-8 text-slate-400 text-xs">
            No projects created in this workspace yet.
          </div>
        ) : (
          <div className="divide-y divide-slate-800/80">
            {data?.projects?.map((proj) => (
              <div key={proj.id} className="py-3 flex items-center justify-between text-xs">
                <div>
                  <div className="font-medium text-slate-200">{proj.name}</div>
                  <div className="text-[11px] text-slate-400">{proj.description || 'No description'}</div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] text-slate-400">By {proj.createdBy?.name || proj.createdBy?.email}</span>
                  <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-medium">
                    {proj.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
