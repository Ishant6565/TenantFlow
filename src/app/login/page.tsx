'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Layers, Lock, Mail, ArrowRight, AlertCircle, CheckCircle2, Shield } from 'lucide-react';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('Demo1234!');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const prefillEmail = searchParams.get('email');
    if (prefillEmail) {
      setEmail(prefillEmail);
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Login failed');
      }

      if (data.defaultOrgSlug) {
        router.push(`/dashboard/${data.defaultOrgSlug}`);
      } else {
        router.push('/dashboard/acme-corp');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('Demo1234!');
  };

  return (
    <div className="w-full max-w-md">
      {/* Header */}
      <div className="text-center mb-8">
        <Link href="/" className="inline-flex items-center gap-2.5 mb-4 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/25 group-hover:scale-105 transition-transform">
            <Layers className="w-5 h-5 text-white" />
          </div>
          <span className="text-2xl font-bold tracking-tight text-white">TenantFlow</span>
        </Link>
        <h1 className="text-xl font-semibold text-white">Sign in to your workspace</h1>
        <p className="text-xs text-slate-400 mt-1">Multi-tenant session with RBAC enforcement</p>
      </div>

      {/* Login Card */}
      <div className="glass-panel p-6 sm:p-8 rounded-2xl border border-slate-800 shadow-2xl relative">
        {error && (
          <div className="mb-5 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Work Email</label>
            <div className="relative">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                className="w-full bg-slate-900/90 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
              />
              <Mail className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-medium text-slate-300">Password</label>
              <span className="text-[11px] text-slate-400">Default: Demo1234!</span>
            </div>
            <div className="relative">
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-900/90 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
              />
              <Lock className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-2.5 rounded-xl text-xs shadow-lg shadow-indigo-600/30 transition-all hover:shadow-indigo-600/50 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <span className="inline-block animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
            ) : (
              <>
                Sign In to Workspace <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Quick Demo Fill Buttons */}
        <div className="mt-6 pt-5 border-t border-slate-800/80">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-indigo-400" /> One-Click Demo Personas:
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleQuickLogin('alice@acme.com')}
              className="text-left p-2 rounded-lg bg-slate-900/80 hover:bg-indigo-950/40 border border-slate-800 hover:border-indigo-500/30 transition-all text-[11px]"
            >
              <div className="font-semibold text-indigo-300">Alice (Owner)</div>
              <div className="text-slate-400 text-[10px] truncate">Acme Corp • Pro</div>
            </button>

            <button
              type="button"
              onClick={() => handleQuickLogin('bob@acme.com')}
              className="text-left p-2 rounded-lg bg-slate-900/80 hover:bg-indigo-950/40 border border-slate-800 hover:border-indigo-500/30 transition-all text-[11px]"
            >
              <div className="font-semibold text-slate-200">Bob (Admin)</div>
              <div className="text-slate-400 text-[10px] truncate">Acme Corp • Pro</div>
            </button>

            <button
              type="button"
              onClick={() => handleQuickLogin('charlie@acme.com')}
              className="text-left p-2 rounded-lg bg-slate-900/80 hover:bg-indigo-950/40 border border-slate-800 hover:border-indigo-500/30 transition-all text-[11px]"
            >
              <div className="font-semibold text-slate-200">Charlie (Member)</div>
              <div className="text-slate-400 text-[10px] truncate">Acme Corp • Pro</div>
            </button>

            <button
              type="button"
              onClick={() => handleQuickLogin('tony@stark.com')}
              className="text-left p-2 rounded-lg bg-slate-900/80 hover:bg-violet-950/40 border border-slate-800 hover:border-violet-500/30 transition-all text-[11px]"
            >
              <div className="font-semibold text-violet-300">Tony (Tenant B)</div>
              <div className="text-slate-400 text-[10px] truncate">Stark Labs • Free</div>
            </button>
          </div>
        </div>
      </div>

      <div className="text-center mt-6">
        <p className="text-xs text-slate-400">
          Need a new workspace?{' '}
          <Link href="/register" className="text-indigo-400 hover:text-indigo-300 font-medium">
            Create an organization
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-[#090d16] flex items-center justify-center p-6 relative">
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[400px] bg-indigo-600/10 blur-[130px] rounded-full" />
      </div>
      <Suspense fallback={<div className="text-slate-400 text-xs">Loading...</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
