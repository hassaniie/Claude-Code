/**
 * Global search (§33). Returns meaningful entities — tenants, service requests,
 * visitors, meters — and navigation targets, not page text. Filtering is done
 * against the world rather than by cmdk so results are real records.
 */

import { Command } from 'cmdk';
import {
  Building2, CornerDownLeft, Gauge, Search, UserRound, Wrench,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { simulation } from '../data/live';
import { useSession } from '../store/session';
import { ADMIN_NAV } from './nav';
import { Dialog, DialogContent } from '../components/ui/overlay';
import { Kbd, TenantMark } from '../components/ui/primitives';
import { TenantStatusBadge, ServiceStatusBadge, VisitorStatusBadge } from '../components/status';

export function CommandPalette() {
  const { paletteOpen, setPaletteOpen, experience, enterPortal } = useSession();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');

  const results = useMemo(() => {
    const w = simulation.getState();
    const term = query.trim().toLowerCase();
    if (term.length < 1) return { tenants: [], requests: [], visitors: [], meters: [] };
    const tenants = w.tenants.filter((t) => t.name.toLowerCase().includes(term) || t.code.toLowerCase().includes(term)).slice(0, 5);
    const requests = w.requests.filter((r) => r.title.toLowerCase().includes(term) || r.reference.toLowerCase().includes(term)).slice(0, 5);
    const visitors = w.visitors.filter((v) => v.fullName.toLowerCase().includes(term) || v.reference.toLowerCase().includes(term)).slice(0, 5);
    const meters = w.meters.filter((m) => m.serial.toLowerCase().includes(term) || m.name.toLowerCase().includes(term)).slice(0, 4);
    return { tenants, requests, visitors, meters };
  }, [query]);

  const go = (path: string) => {
    setPaletteOpen(false);
    setQuery('');
    navigate(path);
  };

  const navItems = experience === 'admin' ? ADMIN_NAV.flatMap((g) => g.items) : [];

  return (
    <Dialog open={paletteOpen} onOpenChange={setPaletteOpen}>
      <DialogContent size="lg" className="top-[18%] max-w-2xl translate-y-0 p-0">
        <Command shouldFilter={false} className="cmd-group">
          <div className="flex items-center gap-2.5 border-b border-border px-4">
            <Search className="h-4 w-4 shrink-0 text-subtle" />
            <Command.Input
              value={query}
              onValueChange={setQuery}
              autoFocus
              placeholder="Search tenants, requests, visitors, meters…"
              className="h-12 w-full bg-transparent text-[14px] text-foreground outline-none placeholder:text-subtle"
            />
            <Kbd>Esc</Kbd>
          </div>
          <Command.List className="max-h-[420px] overflow-y-auto p-2">
            <Command.Empty className="px-3 py-8 text-center text-[12.5px] text-subtle">
              {query ? 'No matches found.' : 'Start typing to search the ecosystem.'}
            </Command.Empty>

            {results.tenants.length > 0 && (
              <Command.Group heading="Tenants">
                {results.tenants.map((t) => (
                  <Command.Item key={t.id} value={`tenant-${t.id}`} onSelect={() => go(`/admin/tenants/${t.id}`)} className="cmd-item">
                    <TenantMark name={t.name} hue={t.brandHue} size={22} />
                    <span className="flex-1 truncate text-foreground">{t.name}</span>
                    <TenantStatusBadge status={t.status} size="sm" />
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            {results.requests.length > 0 && (
              <Command.Group heading="Service Requests">
                {results.requests.map((r) => (
                  <Command.Item key={r.id} value={`req-${r.id}`} onSelect={() => go(`/admin/service?open=${r.id}`)} className="cmd-item">
                    <Wrench className="h-4 w-4 text-service" />
                    <span className="tnum shrink-0 text-subtle">{r.reference}</span>
                    <span className="flex-1 truncate text-foreground">{r.title}</span>
                    <ServiceStatusBadge status={r.status} size="sm" />
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            {results.visitors.length > 0 && (
              <Command.Group heading="Visitors">
                {results.visitors.map((v) => (
                  <Command.Item key={v.id} value={`vis-${v.id}`} onSelect={() => go(`/admin/visitors/history?open=${v.id}`)} className="cmd-item">
                    <UserRound className="h-4 w-4 text-visitor" />
                    <span className="flex-1 truncate text-foreground">{v.fullName}</span>
                    <VisitorStatusBadge status={v.status} size="sm" />
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            {results.meters.length > 0 && (
              <Command.Group heading="Meters">
                {results.meters.map((m) => (
                  <Command.Item key={m.id} value={`mtr-${m.id}`} onSelect={() => go(`/admin/energy/meters?open=${m.id}`)} className="cmd-item">
                    <Gauge className="h-4 w-4 text-energy" />
                    <span className="tnum shrink-0 text-subtle">{m.serial}</span>
                    <span className="flex-1 truncate text-foreground">{m.name}</span>
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            {!query && navItems.length > 0 && (
              <Command.Group heading="Go to">
                {navItems.slice(0, 8).map((n) => (
                  <Command.Item key={n.id} value={`nav-${n.id}`} onSelect={() => go(n.path)} className="cmd-item">
                    <n.icon className="h-4 w-4 text-subtle" />
                    <span className="flex-1 text-foreground">{n.label}</span>
                    <CornerDownLeft className="h-3.5 w-3.5 text-subtle" />
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            {results.tenants.length > 0 && (
              <Command.Group heading="Quick actions">
                <Command.Item value="open-portal" onSelect={() => { enterPortal(results.tenants[0].id); go('/portal'); }} className="cmd-item">
                  <Building2 className="h-4 w-4 text-primary" />
                  <span className="flex-1 text-foreground">Open {results.tenants[0].name} portal</span>
                </Command.Item>
              </Command.Group>
            )}
          </Command.List>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
