import { Keyboard } from 'lucide-react';
import { Dialog, DialogBody, DialogContent, DialogHeader } from '../components/ui/overlay';
import { Kbd } from '../components/ui/primitives';
import { NAV_ITEMS } from './nav';
import { useSession } from '../store/session';

const GLOBAL = [
  { keys: ['⌘', 'K'], label: 'Open command palette' },
  { keys: ['/'], label: 'Focus global search' },
  { keys: ['?'], label: 'Show this help' },
  { keys: ['Esc'], label: 'Close panel or dialog' },
];

const VIEW = [
  { keys: ['1'], label: 'Parking Plaza — 2D map view' },
  { keys: ['2'], label: 'Parking Plaza — list view' },
  { keys: ['3'], label: 'Parking Plaza — table view' },
  { keys: ['F'], label: 'Cycle floor on plaza screens' },
];

export function ShortcutsDialog() {
  const { shortcutsOpen, setShortcutsOpen } = useSession();

  return (
    <Dialog open={shortcutsOpen} onOpenChange={setShortcutsOpen}>
      <DialogContent size="lg">
        <DialogHeader
          icon={<Keyboard className="h-4 w-4" />}
          title="Keyboard shortcuts"
          description="Everything in the product is reachable without the mouse."
        />
        <DialogBody>
          <div className="grid gap-6 md:grid-cols-2">
            <Section title="Global">
              {GLOBAL.map((s) => (
                <Row key={s.label} keys={s.keys} label={s.label} />
              ))}
            </Section>

            <Section title="Views">
              {VIEW.map((s) => (
                <Row key={s.label} keys={s.keys} label={s.label} />
              ))}
            </Section>

            <Section title="Navigation — press g, then…" className="md:col-span-2">
              <div className="grid gap-x-6 gap-y-0 sm:grid-cols-2">
                {NAV_ITEMS.map((item) => (
                  <Row key={item.id} keys={['g', item.chord]} label={item.label} />
                ))}
              </div>
            </Section>
          </div>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}

function Section({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={className}>
      <h4 className="mb-2 text-[10px] font-semibold uppercase tracking-[0.13em] text-subtle">{title}</h4>
      <div className="flex flex-col">{children}</div>
    </section>
  );
}

function Row({ keys, label }: { keys: string[]; label: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border-subtle py-2 last:border-0">
      <span className="text-[12.5px] text-muted">{label}</span>
      <span className="flex shrink-0 items-center gap-1">
        {keys.map((k) => (
          <Kbd key={k}>{k}</Kbd>
        ))}
      </span>
    </div>
  );
}
