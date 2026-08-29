import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'TenantFlow | Production Multi-Tenant B2B SaaS Platform',
  description:
    'Production-ready Multi-Tenant B2B SaaS architecture with organization-level RBAC, row-scoped tenant isolation, and idempotent webhook billing.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-[#090d16] text-slate-100 antialiased selection:bg-indigo-500/30 selection:text-indigo-200">
        {children}
      </body>
    </html>
  );
}
