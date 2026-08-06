import { Compass, LayoutDashboard, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Page } from '../components/ui/page';
import { Card } from '../components/ui/card';
import { Button, Kbd } from '../components/ui/primitives';
import { NAV_ITEMS } from '../app/nav';
import { useSession } from '../store/session';

export default function NotFound() {
  const navigate = useNavigate();
  const { setPaletteOpen } = useSession();

  return (
    <Page>
      <Card className="mx-auto mt-10 w-full max-w-2xl p-8 text-center">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-surface-raised text-subtle">
          <Compass className="h-5 w-5" />
        </span>
        <h2 className="mt-4 text-[18px] font-semibold tracking-[-0.02em] text-foreground">
          That screen isn't part of this module
        </h2>
        <p className="mx-auto mt-2 max-w-md text-[12.5px] leading-relaxed text-muted">
          The parking module has thirteen screens. Jump to one below, or open the command palette with{' '}
          <Kbd>⌘K</Kbd> to search every screen, plate and command at once.
        </p>

        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <Button variant="primary" size="sm" onClick={() => navigate('/')}>
            <LayoutDashboard className="h-3.5 w-3.5" />
            Go to dashboard
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setPaletteOpen(true)}>
            <Search className="h-3.5 w-3.5" />
            Open command palette
          </Button>
        </div>

        <div className="mt-7 border-t border-border-subtle pt-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.13em] text-subtle">All screens</p>
          <div className="mt-3 flex flex-wrap justify-center gap-1.5">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.id}
                onClick={() => navigate(item.path)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface-inset px-2.5 py-1.5 text-[11.5px] text-muted transition-colors hover:border-border-strong hover:text-foreground"
              >
                <item.icon className="h-3 w-3" />
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </Card>
    </Page>
  );
}
