'use client';

import React, { useState, useEffect, use } from 'react';
import {
  CreditCard,
  CheckCircle2,
  Zap,
  ShieldCheck,
  RefreshCw,
  Clock,
  ArrowRight,
  AlertTriangle,
  Send,
  Lock,
} from 'lucide-react';
import { PLANS } from '@/lib/billing-plans';

export default function BillingPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = use(params);

  const [currentPlan, setCurrentPlan] = useState<string>('FREE');
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Idempotency Lab State
  const [testEventId, setTestEventId] = useState(`evt_sim_${Date.now()}`);
  const [webhookTargetPlan, setWebhookTargetPlan] = useState('PRO');
  const [webhookLogs, setWebhookLogs] = useState<any[]>([]);
  const [firingWebhook, setFiringWebhook] = useState(false);

  const loadBilling = async () => {
    try {
      const res = await fetch(`/api/orgs/${orgSlug}/usage/meter`);
      if (res.ok) {
        const data = await res.json();
        setCurrentPlan(data.plan?.id || 'FREE');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBilling();
  }, [orgSlug]);

  const handlePlanChange = async (planKey: string) => {
    setUpgrading(true);
    setFeedback(null);
    try {
      const res = await fetch(`/api/orgs/${orgSlug}/billing/simulate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: planKey }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update plan');
      }
      setFeedback(data.message);
      await loadBilling();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setUpgrading(false);
    }
  };

  const handleFireWebhook = async () => {
    setFiringWebhook(true);
    try {
      const startTime = performance.now();
      const res = await fetch('/api/webhooks/stripe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'stripe-signature': 't=1600000000,v1=mock_signature_for_testing',
        },
        body: JSON.stringify({
          id: testEventId,
          type: 'customer.subscription.updated',
          data: {
            object: {
              id: 'sub_test_12345',
              organizationId: orgSlug === 'acme-corp' ? 'cmtec7k7q0004vvywgio9oh8e' : undefined,
              plan: webhookTargetPlan,
              status: 'ACTIVE',
            },
          },
        }),
      });

      const latency = Math.round(performance.now() - startTime);
      const data = await res.json();

      const newLog = {
        timestamp: new Date().toLocaleTimeString(),
        eventId: testEventId,
        isDuplicate: data.duplicateDelivery || false,
        status: res.status,
        latencyMs: latency,
        response: data,
      };

      setWebhookLogs((prev) => [newLog, ...prev]);
      await loadBilling();
    } catch (err: any) {
      console.error(err);
    } finally {
      setFiringWebhook(false);
    }
  };

  if (loading) {
    return <div className="py-12 text-center text-xs text-slate-400">Loading subscription and billing state...</div>;
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Subscription Plans & Billing</h1>
        <p className="text-xs text-slate-400 mt-1">
          Feature tier gating, quota limits, and idempotent payment webhook handling.
        </p>
      </div>

      {feedback && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Plan Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {Object.values(PLANS).map((plan) => {
          const isCurrent = currentPlan === plan.id;
          return (
            <div
              key={plan.id}
              className={`p-6 rounded-2xl glass-panel border flex flex-col justify-between transition-all ${
                isCurrent
                  ? 'border-indigo-500/60 bg-indigo-950/20 shadow-xl shadow-indigo-600/10'
                  : 'border-slate-800'
              }`}
            >
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-base font-bold text-white">{plan.name}</h3>
                  {isCurrent && (
                    <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[10px] font-semibold uppercase tracking-wider">
                      Current Plan
                    </span>
                  )}
                </div>

                <div className="mb-4">
                  <span className="text-3xl font-extrabold text-white">${plan.price}</span>
                  <span className="text-xs text-slate-400 font-normal"> / month</span>
                </div>

                <p className="text-xs text-slate-400 mb-6 leading-relaxed">{plan.description}</p>

                <div className="space-y-2.5 text-xs text-slate-300 mb-6 border-t border-slate-800/80 pt-4">
                  {plan.features.map((feature, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={() => handlePlanChange(plan.id)}
                disabled={isCurrent || upgrading}
                className={`w-full py-2.5 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
                  isCurrent
                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/30'
                }`}
              >
                {isCurrent ? 'Active Tier' : `Switch to ${plan.name}`}
              </button>
            </div>
          );
        })}
      </div>

      {/* Idempotent Webhook Testing Lab */}
      <div className="glass-panel rounded-2xl border border-slate-800 p-6 sm:p-8">
        <div className="flex items-start gap-3.5 mb-6">
          <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400 shrink-0">
            <RefreshCw className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">Interactive Webhook Idempotency Lab</h2>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              Test how TenantFlow safely handles duplicate payment webhook retries. When payment gateways (Stripe/Razorpay) experience network timeouts, they retry the same event up to 5 times. Our idempotency engine processes the event <strong>exactly once</strong> and returns cached responses for subsequent duplicates.
            </p>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 mb-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Simulated Webhook Event ID</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={testEventId}
                  onChange={(e) => setTestEventId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-indigo-300 font-mono focus:outline-none focus:border-indigo-500"
                />
                <button
                  onClick={() => setTestEventId(`evt_sim_${Date.now()}`)}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs shrink-0"
                  title="Generate new unique Event ID"
                >
                  New ID
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Target Subscription Tier</label>
              <select
                value={webhookTargetPlan}
                onChange={(e) => setWebhookTargetPlan(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="FREE">FREE</option>
                <option value="PRO">PRO</option>
                <option value="ENTERPRISE">ENTERPRISE</option>
              </select>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              onClick={handleFireWebhook}
              disabled={firingWebhook}
              className="bg-violet-600 hover:bg-violet-500 text-white font-medium px-4 py-2 rounded-xl text-xs shadow-md shadow-violet-600/30 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              {firingWebhook ? 'Delivering...' : 'Send Webhook Payload (Simulate Delivery)'}
            </button>
            <span className="text-[11px] text-slate-400">
              👉 Click multiple times to observe duplicate detection in action!
            </span>
          </div>
        </div>

        {/* Webhook Delivery Live Log */}
        {webhookLogs.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs font-semibold text-slate-300 flex items-center justify-between">
              <span>Live Delivery Responses</span>
              <button
                onClick={() => setWebhookLogs([])}
                className="text-[10px] text-slate-400 hover:text-white"
              >
                Clear logs
              </button>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto">
              {webhookLogs.map((log, index) => (
                <div
                  key={index}
                  className={`p-3 rounded-xl border text-xs font-mono transition-all ${
                    log.isDuplicate
                      ? 'bg-amber-950/20 border-amber-500/30 text-amber-300'
                      : 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold">
                      {log.isDuplicate ? '⚠️ DUPLICATE DETECTED (Cached Exactly-Once)' : '✅ PROCESSED (First Delivery)'}
                    </span>
                    <span className="text-[10px] text-slate-400">{log.timestamp} • {log.latencyMs}ms</span>
                  </div>
                  <div className="text-[11px] text-slate-300 truncate">
                    Event ID: <span className="text-white">{log.eventId}</span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1">
                    Payload: {JSON.stringify(log.response)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
