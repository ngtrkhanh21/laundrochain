import { useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  Check,
  ChevronDown,
  CircleHelp,
  Code2,
  FileCheck2,
  MoreHorizontal,
  PackageCheck,
  ShieldCheck,
  SlidersHorizontal,
  TerminalSquare,
  Wallet,
  X,
} from 'lucide-react';

const bundles = [
  {
    name: 'Standard wash & dry',
    id: 'BND-2409-001',
    author: 'Amelia Chen',
    date: 'Sep 18, 2024',
    amount: '$6.50',
    status: 'Published',
    verified: true,
  },
  {
    name: 'Weekend express bundle',
    id: 'BND-2409-002',
    author: 'Noah Williams',
    date: 'Sep 16, 2024',
    amount: '$9.00',
    status: 'Published',
    verified: true,
  },
  {
    name: 'Student saver pack',
    id: 'BND-2409-003',
    author: 'Sophia Martinez',
    date: 'Sep 14, 2024',
    amount: '$4.25',
    status: 'Pending',
    verified: false,
  },
  {
    name: 'Premium care cycle',
    id: 'BND-2409-004',
    author: 'Liam Johnson',
    date: 'Sep 11, 2024',
    amount: '$12.00',
    status: 'Published',
    verified: true,
  },
  {
    name: 'Quick refresh cycle',
    id: 'BND-2409-005',
    author: 'Amelia Chen',
    date: 'Sep 08, 2024',
    amount: '$3.50',
    status: 'Archived',
    verified: true,
  },
];

function MetricCard({ icon: Icon, eyebrow, value, detail, tone = 'blue', children }) {
  const tones = {
    blue: 'bg-blue-50 text-[#0f4e7f]',
    green: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
    violet: 'bg-violet-50 text-violet-600',
  };

  return (
    <article className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_3px_0_rgba(15,23,42,0.06),0_1px_2px_-1px_rgba(15,23,42,0.06)] transition-all hover:shadow-[0_8px_24px_rgba(15,23,42,0.08)] hover:-translate-y-0.5">
      <div className="flex items-start justify-between gap-3">
        <div className={`flex size-10 items-center justify-center rounded-xl ${tones[tone]}`}>
          <Icon className="size-[19px]" aria-hidden="true" />
        </div>
        {children}
      </div>
      <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-400">
        {eyebrow}
      </p>
      <p className="mt-1.5 text-[26px] font-bold tracking-[-0.03em] text-slate-900">{value}</p>
      <p className="mt-1 text-[12px] text-slate-500">{detail}</p>
    </article>
  );
}

export default function DashboardHome() {
  const [activeAction, setActiveAction] = useState(null);
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [filterOpen, setFilterOpen] = useState(false);

  const filteredBundles = selectedStatus === 'ALL'
    ? bundles
    : bundles.filter((b) => b.status === selectedStatus);

  return (
    <div className="flex flex-col gap-7">
      {/* Operations Overview Header */}
      <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-[#0f4e7f]">
            Operations overview
          </p>
          <h2 className="mt-1 text-[28px] font-bold tracking-[-0.04em] text-slate-950 sm:text-[32px]">
            Control center
          </h2>
          <p className="mt-1 text-[13px] text-slate-500">
            Monitor your laundry network and pricing infrastructure.
          </p>
        </div>
        <button className="inline-flex w-fit items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-[12px] font-medium text-slate-600 shadow-sm transition-colors hover:bg-slate-50">
          <span className="size-1.5 rounded-full bg-emerald-500" />
          All systems operational
          <ChevronDown className="size-3.5 text-slate-400" />
        </button>
      </section>

      {/* 4 Metric Cards - Distributed Evenly */}
      <section className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {/* Metric 1 */}
        <MetricCard
          icon={PackageCheck}
          eyebrow="Active price bundle"
          value="Version 2.4"
          detail="Published 2 days ago"
          tone="blue"
        >
          <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 border border-emerald-100">
            <ArrowUpRight className="size-3" />
            12%
          </span>
        </MetricCard>

        {/* Metric 2 */}
        <MetricCard
          icon={Activity}
          eyebrow="IoT kiosks"
          value="42 / 45 online"
          detail="93.3% network uptime"
          tone="green"
        >
          <span className="size-2 rounded-full bg-emerald-500 ring-4 ring-emerald-50" />
        </MetricCard>

        {/* Metric 3 */}
        <MetricCard
          icon={ShieldCheck}
          eyebrow="Static analysis status"
          value="Safe"
          detail="Last scan 8 minutes ago"
          tone="violet"
        >
          <FileCheck2 className="size-4 text-emerald-500" />
        </MetricCard>

        {/* Metric 4 */}
        <MetricCard
          icon={Wallet}
          eyebrow="Daily reserved balance"
          value="$12,480.00"
          detail="Available across 45 kiosks"
          tone="amber"
        >
          <span className="text-[11px] font-semibold text-emerald-600">+8.4%</span>
        </MetricCard>
      </section>

      {/* Quick Actions */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_3px_0_rgba(15,23,42,0.06)] sm:p-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h3 className="text-[15px] font-semibold text-slate-900">Quick actions</h3>
            <p className="mt-1 text-[12px] text-slate-500">
              Manage your decision and verification workflows.
            </p>
          </div>
          <div className="flex flex-wrap gap-2.5">
            <button
              onClick={() => setActiveAction('Author DMN')}
              className="inline-flex items-center gap-2 rounded-lg bg-[#0f4e7f] px-3.5 py-2.5 text-[12px] font-semibold text-white shadow-sm shadow-blue-900/10 transition-colors hover:bg-[#0c416a]"
            >
              <Code2 className="size-4" />
              Author DMN
              <ArrowUpRight className="size-3.5 opacity-70" />
            </button>
            <button
              onClick={() => setActiveAction('Run Z3 Analyser')}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-[12px] font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
            >
              <TerminalSquare className="size-4 text-slate-500" />
              Run Z3 Analyser
            </button>
          </div>
        </div>

        {activeAction && (
          <div
            className="mt-4 flex items-center justify-between rounded-lg border border-blue-100 bg-blue-50 px-3.5 py-2.5 text-[12px] text-[#0f4e7f]"
            role="status"
          >
            <span>
              <strong>{activeAction}</strong> workflow queued for the operations team.
            </span>
            <button
              onClick={() => setActiveAction(null)}
              className="text-[#0f4e7f]/70 hover:text-[#0f4e7f]"
              aria-label="Dismiss notification"
            >
              <X className="size-4" />
            </button>
          </div>
        )}
      </section>

      {/* Recently Published Bundles Table - Evenly Distributed Columns */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_1px_3px_0_rgba(15,23,42,0.06)]">
        <div className="flex flex-col justify-between gap-4 border-b border-slate-100 px-5 py-5 sm:flex-row sm:items-center sm:px-6">
          <div>
            <h3 className="text-[15px] font-semibold text-slate-900">
              Recently published bundles
            </h3>
            <p className="mt-1 text-[12px] text-slate-500">
              Price bundles deployed across your kiosk network.
            </p>
          </div>
          <div className="relative flex items-center gap-2">
            <button
              onClick={() => setFilterOpen((p) => !p)}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-[11px] font-medium text-slate-600 hover:bg-slate-50"
            >
              <SlidersHorizontal className="size-3.5" />
              Filter {selectedStatus !== 'ALL' && `(${selectedStatus})`}
            </button>
            {filterOpen && (
              <div className="absolute right-0 top-full mt-1 z-10 w-36 rounded-lg border border-slate-200 bg-white p-1 shadow-md">
                {['ALL', 'Published', 'Pending', 'Archived'].map((status) => (
                  <button
                    key={status}
                    onClick={() => {
                      setSelectedStatus(status);
                      setFilterOpen(false);
                    }}
                    className={`block w-full rounded px-2.5 py-1.5 text-left text-[11px] font-medium ${
                      selectedStatus === status
                        ? 'bg-blue-50 text-[#0f4e7f]'
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>
            )}
            <button
              onClick={() => setSelectedStatus('ALL')}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-[11px] font-medium text-slate-600 hover:bg-slate-50"
            >
              View all
              <ArrowUpRight className="size-3.5" />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left table-fixed">
            <thead className="bg-slate-50/70 border-b border-slate-100">
              <tr className="text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-400">
                <th className="w-[30%] px-6 py-3.5">Bundle</th>
                <th className="w-[18%] px-4 py-3.5">Author</th>
                <th className="w-[14%] px-4 py-3.5">Published</th>
                <th className="w-[11%] px-4 py-3.5">Value</th>
                <th className="w-[12%] px-4 py-3.5">Status</th>
                <th className="w-[11%] px-4 py-3.5">Signature</th>
                <th className="w-[4%] px-4 py-3.5 text-right">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredBundles.map((bundle) => (
                <tr key={bundle.id} className="group transition-colors hover:bg-slate-50/70">
                  <td className="px-6 py-4 truncate">
                    <div className="flex items-center gap-3">
                      <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                        <PackageCheck className="size-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[12px] font-semibold text-slate-800 truncate">{bundle.name}</p>
                        <p className="mt-0.5 font-mono text-[10px] text-slate-400">{bundle.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-[12px] text-slate-600 truncate">{bundle.author}</td>
                  <td className="px-4 py-4 text-[12px] text-slate-500 whitespace-nowrap">{bundle.date}</td>
                  <td className="px-4 py-4 text-[12px] font-semibold text-slate-700 whitespace-nowrap">
                    {bundle.amount}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                        bundle.status === 'Published'
                          ? 'bg-emerald-50 text-emerald-700'
                          : bundle.status === 'Pending'
                          ? 'bg-amber-50 text-amber-700'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {bundle.status}
                    </span>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    {bundle.verified ? (
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-emerald-600">
                        <span className="flex size-4 items-center justify-center rounded-full bg-emerald-100">
                          <Check className="size-2.5" />
                        </span>
                        Verified
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-amber-600">
                        <AlertTriangle className="size-3.5" />
                        Review needed
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-4 text-right">
                    <button
                      className="rounded-md p-1.5 text-slate-400 opacity-0 transition-opacity hover:bg-slate-100 hover:text-slate-600 group-hover:opacity-100"
                      aria-label={`More actions for ${bundle.name}`}
                    >
                      <MoreHorizontal className="size-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between border-t border-slate-100 px-6 py-3.5">
          <p className="text-[11px] text-slate-400">
            Showing <span className="font-medium text-slate-600">{filteredBundles.length}</span> of 24 bundles
          </p>
          <div className="flex items-center gap-1">
            <button
              className="rounded-md border border-slate-200 px-2.5 py-1.5 text-[11px] text-slate-400"
              disabled
            >
              Previous
            </button>
            <button className="rounded-md border border-slate-200 px-2.5 py-1.5 text-[11px] font-medium text-slate-600 hover:bg-slate-50">
              Next
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="flex flex-col justify-between gap-2 pb-2 pt-2 text-[11px] text-slate-400 sm:flex-row">
        <span>© 2024 LaundroChain · Operations platform</span>
        <div className="flex items-center gap-4">
          <a href="#" className="hover:text-slate-600">
            Documentation
          </a>
          <a href="#" className="flex items-center gap-1 hover:text-slate-600">
            <CircleHelp className="size-3.5" />
            Help center
          </a>
        </div>
      </footer>
    </div>
  );
}
