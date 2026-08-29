'use client';

import React, { useState, useEffect, use } from 'react';
import {
  FolderGit2,
  Plus,
  Trash2,
  AlertCircle,
  CheckCircle2,
  ShieldAlert,
  Zap,
  Lock,
} from 'lucide-react';

export default function ProjectsPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = use(params);

  const [projects, setProjects] = useState<any[]>([]);
  const [quota, setQuota] = useState<any>(null);
  const [userRole, setUserRole] = useState<string>('MEMBER');
  const [loading, setLoading] = useState(true);

  // New Project Form State
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadProjects = async () => {
    try {
      const res = await fetch(`/api/orgs/${orgSlug}/projects`);
      if (res.ok) {
        const data = await res.json();
        setProjects(data.projects || []);
        setQuota(data.quota);
        setUserRole(data.currentUserRole || 'MEMBER');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProjects();
  }, [orgSlug]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/orgs/${orgSlug}/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create project');
      }

      setName('');
      setDescription('');
      setShowModal(false);
      await loadProjects();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (projectId: string) => {
    if (!confirm('Are you sure you want to delete this project?')) return;

    try {
      const res = await fetch(`/api/orgs/${orgSlug}/projects/${projectId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Failed to delete project');
        return;
      }
      await loadProjects();
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return <div className="py-12 text-center text-xs text-slate-400">Loading isolated projects...</div>;
  }

  const isQuotaFull = quota && !quota.allowed && quota.current >= quota.max;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Isolated Workspace Projects</h1>
          <p className="text-xs text-slate-400 mt-1">
            Row-level security ensures projects are strictly quarantined to <strong>{orgSlug}</strong>.
          </p>
        </div>

        <button
          onClick={() => {
            setError(null);
            setShowModal(true);
          }}
          className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl text-xs font-medium transition-all shadow-md shadow-indigo-600/30 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> Create Project
        </button>
      </div>

      {/* Quota Alert if reached */}
      {isQuotaFull && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              You have used all {quota.max} project slots for the <strong>{quota.plan}</strong> plan.
            </span>
          </div>
          <a
            href={`/dashboard/${orgSlug}/billing`}
            className="text-xs text-white bg-amber-600 hover:bg-amber-500 px-3 py-1.5 rounded-lg font-medium transition-colors"
          >
            Upgrade Plan
          </a>
        </div>
      )}

      {/* Projects Grid */}
      {projects.length === 0 ? (
        <div className="p-12 text-center rounded-2xl glass-panel border border-slate-800">
          <FolderGit2 className="w-10 h-10 text-slate-500 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-white mb-1">No Projects Found</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto mb-4">
            Create your first tenant-scoped project to start collaborating with your team.
          </p>
          <button
            onClick={() => setShowModal(true)}
            className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl text-xs font-medium transition-all"
          >
            Create Project
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {projects.map((proj) => (
            <div
              key={proj.id}
              className="p-5 rounded-2xl glass-panel border border-slate-800 flex flex-col justify-between glass-panel-hover"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                      <FolderGit2 className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-white">{proj.name}</h3>
                      <span className="text-[10px] font-mono text-slate-400">ID: {proj.id.substring(0, 10)}...</span>
                    </div>
                  </div>

                  <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-medium">
                    {proj.status}
                  </span>
                </div>

                <p className="text-xs text-slate-400 leading-relaxed mt-2 mb-4">
                  {proj.description || 'No description provided.'}
                </p>
              </div>

              <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                <span>Created by {proj.createdBy?.name || proj.createdBy?.email}</span>

                {(userRole === 'OWNER' || userRole === 'ADMIN') && (
                  <button
                    onClick={() => handleDelete(proj.id)}
                    className="text-slate-500 hover:text-rose-400 p-1 rounded transition-colors"
                    title="Delete Project (Admin/Owner only)"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="glass-panel p-6 rounded-2xl border border-slate-800 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-white">Create Tenant Project</h2>
              <span className="text-[10px] text-slate-400 font-mono">
                {quota?.current || 0} / {quota?.max || 0} used
              </span>
            </div>

            {error && (
              <div className="mb-4 p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
                {error}
              </div>
            )}

            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Project Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="E.g. API Gateway Service"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Description (Optional)</label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What does this project do?"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-3.5 py-2 rounded-xl text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-4 py-2 rounded-xl text-xs shadow-md shadow-indigo-600/30 transition-all disabled:opacity-50"
                >
                  {submitting ? 'Creating...' : 'Create Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
