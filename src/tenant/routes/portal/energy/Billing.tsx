/**
 * Tenant Portal — Billing & Charges (§16). Complete billing information: the
 * current period, historical bills, payment status, outstanding amounts and a
 * downloadable invoice. No estimated billing, no online payment.
 */

import { Wallet } from 'lucide-react';
import { useState } from 'react';
import { StatGrid } from '../../../components/ui/page';
import { Card, CardBody, CardHeader } from '../../../components/ui/card';
import { StatCard } from '../../../components/common';
import { Button, IconBox } from '../../../components/ui/primitives';
import { DataTable, type Column } from '../../../components/ui/data';
import { PaymentBadge } from '../../../components/status';
import { InvoiceDialog } from '../../energyShared';
import { useSession } from '../../../store/session';
import { useLive } from '../../../data/live';
import { currency, fmtDateFull, num } from '../../../lib/utils';
import type { Invoice } from '../../../data/types';

export default function PortalEnergyBilling() {
  const { tenantId } = useSession();
  const invoices = useLive((w) => w.invoices.filter((i) => i.tenantId === tenantId).sort((a, b) => b.periodStart - a.periodStart));
  const [open, setOpen] = useState<Invoice | null>(null);

  const latest = invoices[0];
  const outstanding = invoices.filter((i) => i.paymentStatus !== 'paid').reduce((s, i) => s + i.total, 0);
  const overdue = invoices.filter((i) => i.paymentStatus === 'overdue').length;

  const columns: Column<Invoice>[] = [
    { key: 'number', header: 'Invoice', cell: (i) => <span className="tnum font-medium text-foreground">{i.number}</span>, sortValue: (i) => i.number },
    { key: 'period', header: 'Period', cell: (i) => i.periodLabel, sortValue: (i) => i.periodStart },
    { key: 'kwh', header: 'kWh', align: 'right', cell: (i) => <span className="tnum">{num(i.totalKwh)}</span>, hideBelow: 'md' },
    { key: 'total', header: 'Amount', align: 'right', cell: (i) => <span className="tnum font-medium text-foreground">{currency(i.total)}</span>, sortValue: (i) => i.total },
    { key: 'due', header: 'Due', cell: (i) => <span className="tnum text-muted">{fmtDateFull(i.dueDate)}</span>, hideBelow: 'lg' },
    { key: 'status', header: 'Status', cell: (i) => <PaymentBadge status={i.paymentStatus} size="sm" /> },
  ];

  return (
    <>
      <StatGrid cols={3}>
        <StatCard label="Current Bill" value={latest ? currency(latest.total, { compact: true }) : '—'} icon={Wallet} tone="energy" caption={latest?.periodLabel} onClick={latest ? () => setOpen(latest) : undefined} />
        <StatCard label="Outstanding" value={currency(outstanding, { compact: true })} icon={Wallet} tone={outstanding ? 'warning' : 'success'} />
        <StatCard label="Overdue" value={num(overdue)} icon={Wallet} tone={overdue ? 'critical' : 'success'} />
      </StatGrid>

      {latest && (
        <Card>
          <CardHeader title="Current Period Breakdown" subtitle={latest.periodLabel} icon={<IconBox icon={Wallet} tone="energy" size="sm" />} actions={<Button variant="secondary" size="sm" onClick={() => setOpen(latest)}>View invoice</Button>} />
          <CardBody>
            <div className="overflow-hidden rounded-xl border border-border">
              <table className="w-full text-left text-[12.5px]">
                <thead className="bg-surface-inset"><tr>
                  <th className="px-3.5 py-2.5 font-semibold uppercase tracking-[0.08em] text-subtle">Component</th>
                  <th className="px-3.5 py-2.5 text-right font-semibold uppercase tracking-[0.08em] text-subtle">Units (kWh)</th>
                  <th className="px-3.5 py-2.5 text-right font-semibold uppercase tracking-[0.08em] text-subtle">Rate</th>
                  <th className="px-3.5 py-2.5 text-right font-semibold uppercase tracking-[0.08em] text-subtle">Amount</th>
                </tr></thead>
                <tbody>
                  {latest.lines.map((l) => (
                    <tr key={l.component} className="border-t border-border-subtle">
                      <td className="px-3.5 py-2.5 capitalize text-foreground">{l.component.replace('_', '-')}</td>
                      <td className="tnum px-3.5 py-2.5 text-right text-muted">{num(l.units)}</td>
                      <td className="tnum px-3.5 py-2.5 text-right text-muted">{l.rate.toFixed(2)}</td>
                      <td className="tnum px-3.5 py-2.5 text-right font-medium text-foreground">{currency(l.amount)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot><tr className="border-t border-border bg-surface-inset/50">
                  <td className="px-3.5 py-2.5 font-semibold text-foreground" colSpan={3}>Total</td>
                  <td className="tnum px-3.5 py-2.5 text-right text-[14px] font-semibold text-foreground">{currency(latest.total)}</td>
                </tr></tfoot>
              </table>
            </div>
          </CardBody>
        </Card>
      )}

      <Card>
        <CardHeader title="Historical Bills" subtitle={`${invoices.length} invoices`} icon={<IconBox icon={Wallet} tone="primary" size="sm" />} />
        <DataTable rows={invoices} columns={columns} rowKey={(i) => i.id} onRowClick={(i) => setOpen(i)} emptyTitle="No invoices yet" emptyDescription="Invoices appear here once the first billing period closes." />
      </Card>

      <InvoiceDialog invoice={open} open={Boolean(open)} onOpenChange={(o) => !o && setOpen(null)} />
    </>
  );
}
