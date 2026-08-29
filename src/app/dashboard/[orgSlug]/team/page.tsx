'use client';

import React, { useState, useEffect, use } from 'react';
import {
  Users,
  UserPlus,
  Shield,
  Trash2,
  Copy,
  Check,
  Clock,
  AlertCircle,
  ShieldAlert,
} from 'lucide-react';

export default function TeamPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = use(params);

  const [members, setMembers] = useState<any[]>([]);
  const [invites, setInvites] = useState<any[]>([]);
  const [currentUserRole, setCurrentUserRole] = useState<string>('MEMBER');
  const [loading, setLoading] = useState(true);

  // Invite Form State
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('MEMBER');
  const [submittingInvite, setSubmittingInvite] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [generatedInviteUrl, setGeneratedInviteUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const loadTeamData = async () => {
    try {
      const [membersRes, invitesRes] = await Promise.all([
        fetch(`/api/orgs/${orgSlug}/members`),
        fetch(`/api/orgs/${orgSlug}/invites`),
      ]);

      if (membersRes.ok) {
        const data = await membersRes.json();
        setMembers(data.members || []);
        setCurrentUserRole(data.currentUserRole || 'MEMBER');
      }

      if (invitesRes.ok) {
        const data = await invitesRes.json();
        setInvites(data.invites || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTeamData();
  }, [orgSlug]);

  const handleRoleChange = async (membershipId: string, newRole: string) => {
    try {
      const res = await fetch(`/api/orgs/${orgSlug}/members`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ membershipId, role: newRole }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Failed to update role');
        return;
      }
      await loadTeamData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleRemoveMember = async (membershipId: string) => {
    if (!confirm('Are you sure you want to remove this member from the organization?')) return;

    try {
      const res = await fetch(`/api/orgs/${orgSlug}/members?membershipId=${membershipId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Failed to remove member');
        return;
      }
      await loadTeamData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingInvite(true);
    setInviteError(null);
    setGeneratedInviteUrl(null);

    try {
      const res = await fetch(`/api/orgs/${orgSlug}/invites`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to send invite');
      }

      setGeneratedInviteUrl(data.inviteUrl);
      setInviteEmail('');
      await loadTeamData();
    } catch (err: any) {
      setInviteError(err.message);
    } finally {
      setSubmittingInvite(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return <div className="py-12 text-center text-xs text-slate-400">Loading team members & RBAC...</div>;
  }

  const canManageTeam = currentUserRole === 'OWNER' || currentUserRole === 'ADMIN';

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Team & RBAC Permissions</h1>
          <p className="text-xs text-slate-400 mt-1">
            Centralized role-based access control with cryptographic signed invite tokens.
          </p>
        </div>

        {canManageTeam && (
          <button
            onClick={() => {
              setInviteError(null);
              setGeneratedInviteUrl(null);
              setShowInviteModal(true);
            }}
            className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl text-xs font-medium transition-all shadow-md shadow-indigo-600/30 flex items-center gap-2"
          >
            <UserPlus className="w-4 h-4" /> Invite Team Member
          </button>
        )}
      </div>

      {/* Role Matrix Explanation Banner */}
      <div className="p-4 rounded-xl glass-panel border border-slate-800 text-xs text-slate-400 grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800">
          <div className="font-semibold text-rose-300 mb-1">OWNER</div>
          <div className="text-[11px]">Full access, billing management, organization settings, role changes.</div>
        </div>
        <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800">
          <div className="font-semibold text-indigo-300 mb-1">ADMIN</div>
          <div className="text-[11px]">Invite members, manage projects, view audit logs, create API keys.</div>
        </div>
        <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800">
          <div className="font-semibold text-emerald-300 mb-1">MEMBER</div>
          <div className="text-[11px]">Create and view projects within the workspace.</div>
        </div>
        <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800">
          <div className="font-semibold text-slate-300 mb-1">VIEWER</div>
          <div className="text-[11px]">Read-only access to projects and overview metrics.</div>
        </div>
      </div>

      {/* Members Table */}
      <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden">
        <div className="p-5 border-b border-slate-800/80 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <Users className="w-4 h-4 text-indigo-400" /> Active Members ({members.length})
          </h2>
          <span className="text-xs text-slate-400">Your role: <strong className="text-indigo-400">{currentUserRole}</strong></span>
        </div>

        <div className="divide-y divide-slate-800/80">
          {members.map((member) => (
            <div key={member.id} className="p-4 sm:px-6 flex items-center justify-between gap-4 text-xs">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-slate-300 text-xs">
                  {member.user?.name?.[0] || member.user?.email?.[0] || 'U'}
                </div>
                <div>
                  <div className="font-medium text-white">{member.user?.name || 'Unnamed User'}</div>
                  <div className="text-slate-400 text-[11px]">{member.user?.email}</div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {canManageTeam ? (
                  <select
                    value={member.role}
                    onChange={(e) => handleRoleChange(member.id, e.target.value)}
                    className="bg-slate-900 border border-slate-700 text-xs text-white rounded-lg px-2.5 py-1 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="OWNER">OWNER</option>
                    <option value="ADMIN">ADMIN</option>
                    <option value="MEMBER">MEMBER</option>
                    <option value="VIEWER">VIEWER</option>
                  </select>
                ) : (
                  <span className="px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 text-[11px] font-mono">
                    {member.role}
                  </span>
                )}

                {canManageTeam && member.role !== 'OWNER' && (
                  <button
                    onClick={() => handleRemoveMember(member.id)}
                    className="text-slate-500 hover:text-rose-400 p-1.5 rounded transition-colors"
                    title="Remove member"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Pending Invites List */}
      {invites.length > 0 && (
        <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden">
          <div className="p-5 border-b border-slate-800/80">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-400" /> Pending Signed Invitations ({invites.length})
            </h2>
          </div>

          <div className="divide-y divide-slate-800/80">
            {invites.map((inv) => (
              <div key={inv.id} className="p-4 sm:px-6 flex items-center justify-between text-xs">
                <div>
                  <div className="font-medium text-slate-200">{inv.email}</div>
                  <div className="text-[11px] text-slate-400">
                    Role: <span className="text-indigo-300 font-mono">{inv.role}</span> • Invited by{' '}
                    {inv.inviter?.name || inv.inviter?.email}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() =>
                      copyToClipboard(
                        `${window.location.origin}/invite/${inv.token}`
                      )
                    }
                    className="text-xs text-indigo-400 hover:text-indigo-300 px-2.5 py-1 rounded bg-slate-900 border border-slate-700 flex items-center gap-1.5 transition-colors"
                  >
                    <Copy className="w-3 h-3" /> Copy Link
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="glass-panel p-6 rounded-2xl border border-slate-800 w-full max-w-md shadow-2xl">
            <h2 className="text-base font-semibold text-white mb-1">Invite Team Member</h2>
            <p className="text-xs text-slate-400 mb-4">
              Generates a cryptographically signed token with a 48-hour expiration date.
            </p>

            {inviteError && (
              <div className="mb-4 p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
                {inviteError}
              </div>
            )}

            {generatedInviteUrl ? (
              <div className="space-y-4">
                <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs">
                  Invitation created! Share this link with your teammate:
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={generatedInviteUrl}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-300 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => copyToClipboard(generatedInviteUrl)}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white px-3.5 py-2 rounded-xl text-xs flex items-center gap-1.5 shrink-0"
                  >
                    {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
                <div className="text-right">
                  <button
                    type="button"
                    onClick={() => {
                      setShowInviteModal(false);
                      setGeneratedInviteUrl(null);
                    }}
                    className="bg-slate-800 hover:bg-slate-700 text-white text-xs px-4 py-2 rounded-xl font-medium"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSendInvite} className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Email Address</label>
                  <input
                    type="email"
                    required
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="colleague@company.com"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Assigned Role</label>
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="ADMIN">ADMIN (Can manage projects & invites)</option>
                    <option value="MEMBER">MEMBER (Can create & manage projects)</option>
                    <option value="VIEWER">VIEWER (Read-only access)</option>
                  </select>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowInviteModal(false)}
                    className="px-3.5 py-2 rounded-xl text-xs text-slate-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingInvite}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-4 py-2 rounded-xl text-xs shadow-md shadow-indigo-600/30 transition-all disabled:opacity-50"
                  >
                    {submittingInvite ? 'Generating...' : 'Generate Signed Invite'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
