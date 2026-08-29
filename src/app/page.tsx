'use client';

import React from 'react';
import Link from 'next/link';
import {
  ShieldCheck,
  Layers,
  Users,
  CreditCard,
  Lock,
  Activity,
  CheckCircle2,
  ArrowRight,
  Database,
  RefreshCw,
  Zap,
  KeyRound,
  FileCheck,
} from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 selection:bg-indigo-500/30">
      {/* Background Glows */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-indigo-600/15 blur-[140px] rounded-full" />
        <div className="absolute top-1/3 -right-40 w-[500px] h-[400px] bg-violet-600/10 blur-[130px] rounded-full" />
      </div>

      {/* Navigation Header */}
      <header className="border-b border-slate-800/80 bg-slate-950/60 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/25">
              <Layers className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
              TenantFlow
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-medium">
              B2B SaaS Architecture
            </span>
          </div>

          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="text-sm font-medium text-slate-300 hover:text-white transition-colors px-3 py-1.5"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="text-sm font-medium bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg shadow-md shadow-indigo-600/30 transition-all hover:shadow-indigo-600/50 flex items-center gap-1.5"
            >
              Get Started <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-20 pb-16 px-6 max-w-5xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-semibold uppercase tracking-wider mb-6">
          <ShieldCheck className="w-4 h-4 text-indigo-400" />
          Production-Grade Multi-Tenant SaaS
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white leading-tight mb-6">
          Multi-Tenancy, RBAC &{' '}
          <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-cyan-400 bg-clip-text text-transparent">
            Idempotent Billing
          </span>
        </h1>

        <p className="text-lg text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
          Engineered to satisfy the <strong>6 Core Security Prompts</strong>: Row-scoped tenant isolation, centralized role-based access control, cryptographic signed invites, and duplicate webhook resilience.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/login"
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-6 py-3 rounded-xl shadow-lg shadow-indigo-600/30 transition-all flex items-center gap-2"
          >
            Launch Live Demo <Zap className="w-4 h-4" />
          </Link>
          <a
            href="https://github.com/Ishant6565/TenantFlow"
            target="_blank"
            rel="noopener noreferrer"
            className="glass-panel text-slate-300 hover:text-white font-medium px-6 py-3 rounded-xl transition-all border border-slate-700/80 hover:border-slate-600 flex items-center gap-2"
          >
            View GitHub Repository <ArrowRight className="w-4 h-4" />
          </a>
        </div>

        {/* Demo Fast-Login Pill */}
        <div className="mt-10 p-4 rounded-2xl glass-panel border border-slate-800/80 max-w-3xl mx-auto text-left">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <KeyRound className="w-4 h-4 text-indigo-400" /> Pre-Seeded Test Credentials
            </span>
            <span className="text-xs text-slate-400">Password for all: <code className="text-indigo-300 bg-slate-800/60 px-1.5 py-0.5 rounded">Demo1234!</code></span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
            <Link
              href="/login?email=alice@acme.com"
              className="p-2.5 rounded-lg bg-slate-900/80 hover:bg-indigo-950/40 border border-slate-800 hover:border-indigo-500/40 transition-all text-xs group"
            >
              <div className="font-semibold text-slate-200 group-hover:text-indigo-300">Alice (Owner)</div>
              <div className="text-slate-400 truncate">alice@acme.com</div>
              <div className="text-[10px] text-emerald-400 mt-1 font-medium">Acme Corp (Pro)</div>
            </Link>

            <Link
              href="/login?email=bob@acme.com"
              className="p-2.5 rounded-lg bg-slate-900/80 hover:bg-indigo-950/40 border border-slate-800 hover:border-indigo-500/40 transition-all text-xs group"
            >
              <div className="font-semibold text-slate-200 group-hover:text-indigo-300">Bob (Admin)</div>
              <div className="text-slate-400 truncate">bob@acme.com</div>
              <div className="text-[10px] text-indigo-400 mt-1 font-medium">Acme Corp (Pro)</div>
            </Link>

            <Link
              href="/login?email=charlie@acme.com"
              className="p-2.5 rounded-lg bg-slate-900/80 hover:bg-indigo-950/40 border border-slate-800 hover:border-indigo-500/40 transition-all text-xs group"
            >
              <div className="font-semibold text-slate-200 group-hover:text-indigo-300">Charlie (Member)</div>
              <div className="text-slate-400 truncate">charlie@acme.com</div>
              <div className="text-[10px] text-slate-400 mt-1 font-medium">Acme Corp (Pro)</div>
            </Link>

            <Link
              href="/login?email=tony@stark.com"
              className="p-2.5 rounded-lg bg-slate-900/80 hover:bg-violet-950/40 border border-slate-800 hover:border-violet-500/40 transition-all text-xs group"
            >
              <div className="font-semibold text-slate-200 group-hover:text-violet-300">Tony (Tenant B)</div>
              <div className="text-slate-400 truncate">tony@stark.com</div>
              <div className="text-[10px] text-amber-400 mt-1 font-medium">Stark Labs (Free)</div>
            </Link>
          </div>
        </div>
      </section>

      {/* 6 Security Pillars Showcase */}
      <section className="py-16 px-6 max-w-7xl mx-auto border-t border-slate-800/80">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">
            The 6 Production Security Pillars
          </h2>
          <p className="text-sm text-slate-400">
            Engineered specifically to solve real security audit requirements before shipping.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Pillar 1 */}
          <div className="p-6 rounded-2xl glass-panel border border-slate-800/80 glass-panel-hover">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-4 text-indigo-400">
              <Lock className="w-5 h-5" />
            </div>
            <h3 className="text-base font-semibold text-white mb-2">1. Secure Authentication</h3>
            <p className="text-xs text-slate-400 leading-relaxed mb-3">
              Bcrypt 12-round salted password hashing, 7-day secure HttpOnly JWT sessions, password complexity validation, and zero password exposure to the frontend.
            </p>
            <span className="text-[11px] font-mono text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded">
              lib/security/auth.ts
            </span>
          </div>

          {/* Pillar 2 */}
          <div className="p-6 rounded-2xl glass-panel border border-slate-800/80 glass-panel-hover">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-4 text-emerald-400">
              <Database className="w-5 h-5" />
            </div>
            <h3 className="text-base font-semibold text-white mb-2">2. IDOR & Tenant Isolation</h3>
            <p className="text-xs text-slate-400 leading-relaxed mb-3">
              Row-level query scoping using <code>organizationId</code> foreign keys. Zero cross-tenant data leaks guaranteed by <code>TenantDatabase</code> wrappers.
            </p>
            <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
              lib/security/tenant.ts
            </span>
          </div>

          {/* Pillar 3 */}
          <div className="p-6 rounded-2xl glass-panel border border-slate-800/80 glass-panel-hover">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-4 text-amber-400">
              <KeyRound className="w-5 h-5" />
            </div>
            <h3 className="text-base font-semibold text-white mb-2">3. Protected Secrets & Keys</h3>
            <p className="text-xs text-slate-400 leading-relaxed mb-3">
              Server-only execution boundaries, clean <code>.env.example</code> sanitization, and SHA-256 hashed API keys with prefix display.
            </p>
            <span className="text-[11px] font-mono text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded">
              .env.example & API keys
            </span>
          </div>

          {/* Pillar 4 */}
          <div className="p-6 rounded-2xl glass-panel border border-slate-800/80 glass-panel-hover">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center mb-4 text-cyan-400">
              <FileCheck className="w-5 h-5" />
            </div>
            <h3 className="text-base font-semibold text-white mb-2">4. Strict Input Validation</h3>
            <p className="text-xs text-slate-400 leading-relaxed mb-3">
              Zod schemas validating all API payloads, regex slug enforcement, and string sanitization preventing XSS and script injection.
            </p>
            <span className="text-[11px] font-mono text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded">
              lib/security/validation.ts
            </span>
          </div>

          {/* Pillar 5 */}
          <div className="p-6 rounded-2xl glass-panel border border-slate-800/80 glass-panel-hover">
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mb-4 text-rose-400">
              <Activity className="w-5 h-5" />
            </div>
            <h3 className="text-base font-semibold text-white mb-2">5. Abuse & Bot Protection</h3>
            <p className="text-xs text-slate-400 leading-relaxed mb-3">
              Sliding-window IP rate limiters on login, register, invites, and webhook endpoints with auto-purging memory storage.
            </p>
            <span className="text-[11px] font-mono text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded">
              lib/security/rate-limit.ts
            </span>
          </div>

          {/* Pillar 6 */}
          <div className="p-6 rounded-2xl glass-panel border border-slate-800/80 glass-panel-hover">
            <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center mb-4 text-violet-400">
              <RefreshCw className="w-5 h-5" />
            </div>
            <h3 className="text-base font-semibold text-white mb-2">6. Idempotency & Audit Trails</h3>
            <p className="text-xs text-slate-400 leading-relaxed mb-3">
              Distributed idempotency keys for exactly-once webhook processing plus immutable audit trails recording actor, IP, action, and JSON diffs.
            </p>
            <span className="text-[11px] font-mono text-violet-400 bg-violet-500/10 px-2 py-0.5 rounded">
              lib/idempotency.ts
            </span>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 py-8 px-6 text-center text-xs text-slate-400">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            Built with <strong>Next.js App Router, TypeScript, Prisma & SQLite/PostgreSQL</strong>
          </div>
          <div className="text-slate-400">
            Resume Project Vault 2026 • Flagship Project A2
          </div>
        </div>
      </footer>
    </div>
  );
}
