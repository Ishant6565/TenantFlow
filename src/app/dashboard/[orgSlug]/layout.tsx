'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Layers,
  LayoutDashboard,
  FolderGit2,
  Users,
  CreditCard,
  History,
  ShieldCheck,
  ChevronDown,
  LogOut,
  Building2,
  PlusCircle,
  Zap,
  Activity,
} from 'lucide-react';

export default function DashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = use(params);
  const pathname = usePathname();
  const router = useRouter();

  const [user, setUser] = useState<any>(null);
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [currentOrg, setCurrentOrg] = useState<any>(null);
  const [currentRole, setCurrentRole] = useState<string>('MEMBER');
  const [isOrgDropdownOpen, setIsOrgDropdownOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // New Organization Modal State
  const [showNewOrgModal, setShowNewOrgModal] = useState(false);
  const [newOrgName, setNewOrgName] = useState('');
  const [newOrgSlug, setNewOrgSlug] = useState('');
  const [creatingOrg, setCreatingOrg] = useState(false);
  const [createOrgError, setCreateOrgError] = useState<string | null>(null);

  useEffect(() => {
    async function loadAuth() {
      try {
        const res = await fetch('/api/auth/me');
        if (!res.ok) {
          router.push('/login');
          return;
        }
        const data = await res.json();
        setUser(data.user);
        setOrganizations(data.organizations || []);

        const activeOrg = data.organizations?.find((o: any) => o.slug === orgSlug);
        if (activeOrg) {
          setCurrentOrg(activeOrg);
          setCurrentRole(activeOrg.role || 'MEMBER');
        } else if (data.organizations?.length > 0) {
          // Fallback to user's first organization
          router.push(`/dashboard/${data.organizations[0].slug}`);
        }
      } catch (err) {
        console.error('Failed to load user', err);
      } finally {
        setLoading(false);
      }
    }
    loadAuth();
  }, [orgSlug, router]);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  };

  const handleCreateOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingOrg(true);
    setCreateOrgError(null);
    try {
      const res = await fetch('/api/orgs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newOrgName, slug: newOrgSlug }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create organization');
      }

      setShowNewOrgModal(false);
      router.push(`/dashboard/${data.organization.slug}`);
    } catch (err: any) {
      setCreateOrgError(err.message);
    } finally {
      setCreatingOrg(false);
    }
  };

  const navItems = [
    {
      label: 'Overview',
      href: `/dashboard/${orgSlug}`,
      icon: LayoutDashboard,
    },
    {
      label: 'Projects (Tenant Isolation)',
      href: `/dashboard/${orgSlug}/projects`,
      icon: FolderGit2,
    },
    {
      label: 'Team & RBAC',
      href: `/dashboard/${orgSlug}/team`,
      icon: Users,
    },
    {
      label: 'Billing & Webhook Lab',
      href: `/dashboard/${orgSlug}/billing`,
      icon: CreditCard,
    },
    {
      label: 'Audit Trail',
      href: `/dashboard/${orgSlug}/audit-logs`,
      icon: History,
    },
    {
      label: 'Security Center (6 Pillars)',
      href: `/dashboard/${orgSlug}/security`,
      icon: ShieldCheck,
      badge: 'Protected',
    },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-[#090d16] flex items-center justify-center text-slate-400 text-xs">
        <div className="animate-spin w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full mr-2" />
        Resolving tenant security context...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#090d16] flex text-slate-100 selection:bg-indigo-500/30">
      {/* Sidebar */}
      <aside className="w-64 border-r border-slate-800/80 bg-slate-950/60 backdrop-blur-xl flex flex-col justify-between shrink-0 sticky top-0 h-screen z-30">
        <div>
          {/* Logo */}
          <div className="h-16 px-5 flex items-center justify-between border-b border-slate-800/80">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center shadow-md shadow-indigo-500/20">
                <Layers className="w-4 h-4 text-white" />
              </div>
              <span className="text-base font-bold tracking-tight text-white">TenantFlow</span>
            </Link>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
              v1.0
            </span>
          </div>

          {/* Tenant Switcher */}
          <div className="p-3 border-b border-slate-800/80 relative">
            <button
              onClick={() => setIsOrgDropdownOpen(!isOrgDropdownOpen)}
              className="w-full p-2 rounded-xl bg-slate-900/90 hover:bg-slate-800/80 border border-slate-700/60 flex items-center justify-between transition-all text-left group"
            >
              <div className="flex items-center gap-2.5 truncate">
                <div className="w-6 h-6 rounded-md bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-bold text-xs">
                  {currentOrg?.name?.[0] || 'T'}
                </div>
                <div className="truncate">
                  <div className="text-xs font-semibold text-white truncate">{currentOrg?.name || 'Organization'}</div>
                  <div className="text-[10px] text-slate-400 font-mono truncate">{currentOrg?.slug}</div>
                </div>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-white transition-colors shrink-0" />
            </button>

            {/* Switcher Dropdown */}
            {isOrgDropdownOpen && (
              <div className="absolute top-full left-3 right-3 mt-1.5 rounded-xl bg-slate-900 border border-slate-800 shadow-2xl p-1.5 z-50">
                <div className="text-[10px] font-semibold text-slate-400 px-2 py-1 uppercase tracking-wider">
                  Your Organizations
                </div>
                {organizations.map((org) => (
                  <button
                    key={org.id}
                    onClick={() => {
                      setIsOrgDropdownOpen(false);
                      router.push(`/dashboard/${org.slug}`);
                    }}
                    className={`w-full flex items-center justify-between p-2 rounded-lg text-xs transition-colors ${
                      org.slug === orgSlug
                        ? 'bg-indigo-600/20 text-indigo-300 font-medium border border-indigo-500/30'
                        : 'text-slate-300 hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="truncate text-left">
                      <div className="truncate">{org.name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{org.role} • {org.plan}</div>
                    </div>
                    {org.slug === orgSlug && (
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0" />
                    )}
                  </button>
                ))}

                <button
                  onClick={() => {
                    setIsOrgDropdownOpen(false);
                    setShowNewOrgModal(true);
                  }}
                  className="w-full mt-1.5 p-2 rounded-lg border border-dashed border-slate-700 hover:border-indigo-500/50 text-[11px] text-slate-400 hover:text-indigo-300 flex items-center justify-center gap-1.5 transition-colors"
                >
                  <PlusCircle className="w-3.5 h-3.5" /> Create Organization
                </button>
              </div>
            )}
          </div>

          {/* Navigation Links */}
          <nav className="p-3 space-y-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 font-semibold'
                      : 'text-slate-400 hover:text-white hover:bg-slate-900/60'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User Card & Logout */}
        <div className="p-3 border-t border-slate-800/80 bg-slate-950/40">
          <div className="flex items-center justify-between p-2 rounded-xl bg-slate-900/60 border border-slate-800/80">
            <div className="truncate mr-2">
              <div className="text-xs font-medium text-white truncate">{user?.name || 'User'}</div>
              <div className="text-[10px] text-slate-400 truncate">{user?.email}</div>
              <div className="inline-flex items-center gap-1 mt-0.5">
                <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                  Role: {currentRole}
                </span>
              </div>
            </div>
            <button
              onClick={handleLogout}
              title="Sign Out"
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 min-w-0 overflow-y-auto h-screen p-6 sm:p-8">
        <div className="max-w-6xl mx-auto">{children}</div>
      </main>

      {/* Create Organization Modal */}
      {showNewOrgModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="glass-panel p-6 rounded-2xl border border-slate-800 w-full max-w-md shadow-2xl">
            <h2 className="text-base font-semibold text-white mb-1">Create New Organization</h2>
            <p className="text-xs text-slate-400 mb-4">
              Instantly provision an isolated tenant workspace with OWNER permissions.
            </p>

            {createOrgError && (
              <div className="mb-4 p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
                {createOrgError}
              </div>
            )}

            <form onSubmit={handleCreateOrg} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Organization Name</label>
                <input
                  type="text"
                  required
                  value={newOrgName}
                  onChange={(e) => {
                    setNewOrgName(e.target.value);
                    if (!newOrgSlug) {
                      setNewOrgSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '-'));
                    }
                  }}
                  placeholder="E.g. Wayne Enterprises"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">URL Identifier (Slug)</label>
                <input
                  type="text"
                  required
                  value={newOrgSlug}
                  onChange={(e) => setNewOrgSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                  placeholder="wayne-enterprises"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewOrgModal(false)}
                  className="px-3.5 py-2 rounded-xl text-xs text-slate-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingOrg}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-4 py-2 rounded-xl text-xs shadow-md shadow-indigo-600/30 transition-all disabled:opacity-50"
                >
                  {creatingOrg ? 'Provisioning...' : 'Create Workspace'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
