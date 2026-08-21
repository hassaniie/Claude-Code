/**
 * Shared energy building blocks used by both the admin and portal energy
 * experiences: the date-range control (§17), a reading-range resolver, the
 * peak/off-peak split, and the invoice detail dialog with its export path.
 */

import { Download, Printer } from 'lucide-react';
import { useState } from 'react';
import { Segmented } from '../components/ui/tabs';
import { Button } from '../components/ui/primitives';
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader } from '../components/ui/overlay';
import { PaymentBadge } from '../components/status';
import { currency, downloadBlob, fmtDateFull, num, toCsv } from '../lib/utils';
import type { Invoice, MeterReading } from '../data/types';

export type RangeKey = 'today' | 'last7' | 'last30' | 'thisMonth' | 'prevMonth' | 'year';

export const RANGE_OPTIONS: Array<{ value: RangeKey; label: string }> = [
  { value: 'today', label: 'Today' },
  { value: 'last7', label: '7 Days' },
  { value: 'last30', label: '30 Days' },
  { value: 'thisMonth', label: 'This Month' },
  { value: 'prevMonth', label: 'Prev Month' },
  { value: 'year', label: 'Year' },
];

export function RangeControl({ value, onChange }: { value: RangeKey; onChange: (v: RangeKey) => void }) {
  return <Segmented value={value} onChange={onChange} options={RANGE_OPTIONS} size="sm" />;
}

export interface ReadingBundle {
  hourly: MeterReading[];
  daily: MeterReading[];
  monthly: MeterReading[];
}

/** Resolve a range to the appropriate reading series and slice. */
export function sliceReadings(b: ReadingBundle, range: RangeKey): { data: MeterReading[]; granularity: 'hour' | 'day' | 'month' } {
  switch (range) {
    case 'today':
      return { data: b.hourly, granularity: 'hour' };
    case 'last7':
      return { data: b.daily.slice(-7), granularity: 'day' };
    case 'last30':
      return { data: b.daily, granularity: 'day' };
    case 'thisMonth': {
      const start = new Date();
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      return { data: b.daily.filter((d) => d.ts >= start.getTime()), granularity: 'day' };
    }
    case 'prevMonth': {
      const s = new Date();
      s.setMonth(s.getMonth() - 1, 1);
      s.setHours(0, 0, 0, 0);
      const e = new Date();
      e.setDate(1);
      e.setHours(0, 0, 0, 0);
      return { data: b.daily.filter((d) => d.ts >= s.getTime() && d.ts < e.getTime()), granularity: 'day' };
    }
    case 'year':
      return { data: b.monthly, granularity: 'month' };
  }
}

export function sumField(rows: MeterReading[], key: 'kwh' | 'peakKwh' | 'offPeakKwh') {
  return Math.round(rows.reduce((s, r) => s + r[key], 0));
}

/* -------------------------------------------------------------- Invoice */

export function InvoiceDialog({ invoice, open, onOpenChange, tenantName }: { invoice: Invoice | null; open: boolean; onOpenChange: (o: boolean) => void; tenantName?: string }) {
  const [printing, setPrinting] = useState(false);
  if (!invoice) return null;
  const inv = invoice;

  const exportCsv = () => {
    const rows = inv.lines.map((l) => ({ Component: l.component, Units_kWh: l.units, Rate_PKR: l.rate, Amount_PKR: l.amount }));
    downloadBlob(toCsv(rows), `${inv.number}.csv`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg">
        <DialogHeader title={inv.number} description={`${tenantName ? tenantName + ' · ' : ''}${inv.periodLabel}`} />
        <DialogBody>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Metric label="Total consumption" value={`${num(inv.totalKwh)} kWh`} />
            <Metric label="Peak" value={`${num(inv.peakKwh)} kWh`} />
            <Metric label="Off-peak" value={`${num(inv.offPeakKwh)} kWh`} />
            <Metric label="Status" value={<PaymentBadge status={inv.paymentStatus} />} />
          </div>

          <div className="mt-5 overflow-hidden rounded-xl border border-border">
            <table className="w-full text-left text-[12.5px]">
              <thead className="bg-surface-inset">
                <tr>
                  <th className="px-3.5 py-2.5 font-semibold uppercase tracking-[0.08em] text-subtle">Component</th>
                  <th className="px-3.5 py-2.5 text-right font-semibold uppercase tracking-[0.08em] text-subtle">Units (kWh)</th>
                  <th className="px-3.5 py-2.5 text-right font-semibold uppercase tracking-[0.08em] text-subtle">Rate</th>
                  <th className="px-3.5 py-2.5 text-right font-semibold uppercase tracking-[0.08em] text-subtle">Amount</th>
                </tr>
              </thead>
              <tbody>
                {inv.lines.map((l) => (
                  <tr key={l.component} className="border-t border-border-subtle">
                    <td className="px-3.5 py-2.5 capitalize text-foreground">{l.component.replace('_', '-')}</td>
                    <td className="tnum px-3.5 py-2.5 text-right text-muted">{num(l.units)}</td>
                    <td className="tnum px-3.5 py-2.5 text-right text-muted">{l.rate.toFixed(2)}</td>
                    <td className="tnum px-3.5 py-2.5 text-right font-medium text-foreground">{currency(l.amount)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-border bg-surface-inset/50">
                  <td className="px-3.5 py-2.5 font-semibold text-foreground" colSpan={3}>Total</td>
                  <td className="tnum px-3.5 py-2.5 text-right text-[14px] font-semibold text-foreground">{currency(inv.total)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-4 text-[12px] sm:grid-cols-3">
            <KV label="Issued" value={fmtDateFull(inv.issuedAt)} />
            <KV label="Due date" value={fmtDateFull(inv.dueDate)} />
            <KV label="Rate schedule" value={inv.tariffId === 'tariff-2026' ? 'FY26 Standard' : 'FY25 Q4'} />
          </div>
        </DialogBody>
        <DialogFooter>
          <Button variant="secondary" size="sm" onClick={exportCsv}><Download className="h-4 w-4" />Export CSV</Button>
          <Button variant="secondary" size="sm" loading={printing} onClick={() => { setPrinting(true); setTimeout(() => { setPrinting(false); window.print(); }, 300); }}><Printer className="h-4 w-4" />Print / PDF</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Metric({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border-subtle bg-surface-inset/50 p-3">
      <p className="text-[10px] uppercase tracking-[0.08em] text-subtle">{label}</p>
      <p className="tnum mt-1 text-[15px] font-semibold text-foreground">{value}</p>
    </div>
  );
}

function KV({ label, value }: { label: string; value: string }) {
  return <div><p className="text-[10.5px] text-subtle">{label}</p><p className="text-[12.5px] font-medium text-foreground">{value}</p></div>;
}
