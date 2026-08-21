/**
 * Admin — Charges & Billing (§16). Invoices across every tenant with payment
 * status, outstanding tracking and a downloadable invoice. Realistic mock
 * invoice data with export-ready structures; no online payment.
 */

import { Wallet } from 'lucide-react';
import { useState } from 'react';
import { Page, StatGrid, Toolbar } from '../../../components/ui/page';
import { Card } from '../../../components/ui/card';
import { PageHeader, StatCard } from '../../../components/common';
import { SearchInput, SimpleSelect } from '../../../components/ui/form';
import { DataTable, type Column } from '../../../components/ui/data';
import { PaymentBadge } from '../../../components/status';
import { InvoiceDialog } from '../../energyShared';
import { useLive } from '../../../data/live';
import { currency, fmtDateFull, num } from '../../../lib/utils';
import type { Invoice, PaymentStatus } from '../../../data/types';

export default function Billing() {
  const invoices = useLive((w) => w.invoices.map((i) => ({ ...i, tenantName: w.tenantById[i.tenantId]?.name ?? '—' })).sort((a, b) => b.periodStart - a.periodStart));
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<PaymentStatus | 'all'>('all');
  const [open, setOpen] = useState<Invoice | null>(null);

  const filtered = invoices.filter((i) => {
    if (status !== 'all' && i.paymentStatus !== status) return false;
    const t = search.trim().toLowerCase();
    if (t && !(i.tenantName.toLowerCase().includes(t) || i.number.toLowerCase().includes(t))) return false;
    return true;
  });

  const outstanding = invoices.filter((i) => i.paymentStatus === 'due' || i.paymentStatus === 'overdue').reduce((s, i) => s + i.total, 0);
  const overdue = invoices.filter((i) => i.paymentStatus === 'overdue').length;
  const monthTotal = invoices.slice(0, 20).reduce((s, i) => s + i.total, 0);

  const columns: Column<(typeof invoices)[number]>[] = [
    { key: 'number', header: 'Invoice', cell: (i) => <span className="tnum font-medium text-foreground">{i.number}</span>, sortValue: (i) => i.number },
    { key: 'tenant', header: 'Tenant', cell: (i) => i.tenantName, sortValue: (i) => i.tenantName },
    { key: 'period', header: 'Period', cell: (i) => i.periodLabel, hideBelow: 'md' },
    { key: 'kwh', header: 'kWh', align: 'right', cell: (i) => <span className="tnum">{num(i.totalKwh)}</span>, sortValue: (i) => i.totalKwh, hideBelow: 'lg' },
    { key: 'total', header: 'Amount', align: 'right', cell: (i) => <span className="tnum font-medium text-foreground">{currency(i.total)}</span>, sortValue: (i) => i.total },
    { key: 'due', header: 'Due', cell: (i) => <span className="tnum text-muted">{fmtDateFull(i.dueDate)}</span>, hideBelow: 'xl' },
    { key: 'status', header: 'Status', cell: (i) => <PaymentBadge status={i.paymentStatus} size="sm" /> },
  ];

  return (
    <Page>
      <PageHeader title="Charges & Billing" description="Energy invoices and payment status across all tenants." />

      <StatGrid cols={4}>
        <StatCard label="Invoices" value={num(invoices.length)} icon={Wallet} tone="primary" />
        <StatCard label="Recent Billed" value={currency(monthTotal, { compact: true })} icon={Wallet} tone="energy" caption="Last 20 invoices" />
        <StatCard label="Outstanding" value={currency(outstanding, { compact: true })} icon={Wallet} tone={outstanding ? 'warning' : 'success'} />
        <StatCard label="Overdue" value={num(overdue)} icon={Wallet} tone={overdue ? 'critical' : 'success'} />
      </StatGrid>

      <Card>
        <div className="border-b border-border-subtle p-3.5">
          <Toolbar>
            <SearchInput value={search} onChange={setSearch} placeholder="Search by tenant or invoice…" className="w-full sm:w-[300px]" />
            <SimpleSelect value={status} onChange={setStatus} options={[{ value: 'all', label: 'All statuses' }, { value: 'paid', label: 'Paid' }, { value: 'due', label: 'Due' }, { value: 'overdue', label: 'Overdue' }]} className="w-[170px]" />
          </Toolbar>
        </div>
        <DataTable rows={filtered} columns={columns} rowKey={(i) => i.id} onRowClick={(i) => setOpen(i)} emptyTitle="No invoices match" pageSize={14} />
      </Card>

      <InvoiceDialog invoice={open} open={Boolean(open)} onOpenChange={(o) => !o && setOpen(null)} tenantName={open ? (open as { tenantName?: string }).tenantName : undefined} />
    </Page>
  );
}
