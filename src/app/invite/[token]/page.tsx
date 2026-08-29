'use client';

import React, { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Layers, Mail, CheckCircle2, AlertCircle, Shield, ArrowRight } from 'lucide-react';

export default function InviteAcceptPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [inviteData, setInviteData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    async function fetchInvite() {
      try {
        const res = await fetch(`/api/orgs/invites/${token}/accept`);
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Failed to verify invitation');
        }
        setInviteData(data.invitation);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchInvite();
  }, [token]);

  const handleAccept = async () => {
    setAccepting(true);
    setError(null);
    try {
      const res = await fetch(`/api/orgs/invites/${token}/accept`, {
        method: 'POST',
      });
      const data = await res.json();

      if (!res.ok) {
        if (res.status === 401) {
          router.push(`/login?redirect=/invite/${token}`);
          return;
        }
        throw new Error(data.error || 'Failed to accept invitation');
      }

      setSuccessMsg(data.message);
      setTimeout(() => {
        router.push(`/dashboard/${data.organizationSlug}`);
      }, 1500);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setAccepting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#090d16] flex items-center justify-center p-6 relative">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2.5 mb-4 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/25">
              <Layers className="w-5 h-5 text-white" />
            </div>
            <span className="text-2xl font-bold tracking-tight text-white">TenantFlow</span>
          </Link>
          <h1 className="text-xl font-semibold text-white">Team Workspace Invitation</h1>
        </div>

        <div className="glass-panel p-6 sm:p-8 rounded-2xl border border-slate-800 shadow-2xl">
          {loading ? (
            <div className="text-center py-8 text-slate-400 text-xs flex flex-col items-center gap-3">
              <div className="animate-spin w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full" />
              Verifying cryptographic signature...
            </div>
          ) : error ? (
            <div className="text-center py-6">
              <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-semibold text-white mb-2">Invitation Error</h3>
              <p className="text-xs text-rose-300 mb-6">{error}</p>
              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 font-medium"
              >
                Go to Sign In <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          ) : successMsg ? (
            <div className="text-center py-6">
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-semibold text-white mb-2">Invitation Accepted!</h3>
              <p className="text-xs text-emerald-300 mb-2">{successMsg}</p>
              <p className="text-[11px] text-slate-400">Redirecting to organization workspace...</p>
            </div>
          ) : (
            <div>
              <div className="text-center mb-6">
                <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto mb-3">
                  <Shield className="w-6 h-6" />
                </div>
                <h2 className="text-base font-semibold text-white">
                  Join {inviteData?.organization?.name}
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Invited by {inviteData?.inviter?.name || inviteData?.inviter?.email}
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2.5 text-xs mb-6">
                <div className="flex justify-between">
                  <span className="text-slate-400">Target Email:</span>
                  <span className="text-white font-medium">{inviteData?.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Assigned Role:</span>
                  <span className="text-indigo-400 font-semibold px-2 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20">
                    {inviteData?.role}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Token Status:</span>
                  <span className="text-emerald-400 font-medium">Valid (Cryptographically Signed)</span>
                </div>
              </div>

              <button
                onClick={handleAccept}
                disabled={accepting}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-2.5 rounded-xl text-xs shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {accepting ? (
                  <span className="inline-block animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                ) : (
                  <>
                    Accept & Join Workspace <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
