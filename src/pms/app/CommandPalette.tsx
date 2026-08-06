/**
 * Command palette (⌘K / Ctrl+K).
 *
 * Navigation, operator commands, and global vehicle search in one surface —
 * so anything in the product is two keystrokes away, and an operator never has
 * to remember which screen owns an action.
 */

import { Command } from 'cmdk';
import {
  ArrowRight, Car, CornerDownLeft, Moon, Search, Siren, Sun, Unlock, Zap,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from '../lib/utils';
import { NAV_GROUPS, NAV_ITEMS } from './nav';
import { useSession } from '../store/session';
import { simulation, useWorld } from '../store/live';
import { Kbd } from '../components/ui/primitives';
import { PlateTag } from '../components/pms/atoms';
import * as DialogPrimitive from '@radix-ui/react-dialog';

export function CommandPalette() {
  const { paletteOpen, setPaletteOpen, prefs, setPrefs, operator, toast } = useSession();
  const navigate = useNavigate();
  const world = useWorld();
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (!paletteOpen) setQuery('');
  }, [paletteOpen]);

  const run = (fn: () => void) => {
    setPaletteOpen(false);
    // Let the dialog close before the route changes, so focus lands correctly.
    requestAnimationFrame(fn);
  };

  const plateMatches = useMemo(() => {
    const q = query.trim().toUpperCase();
    if (q.length < 2) return [];
    return Object.values(world.vehicles)
      .filter((v) => v.plate.includes(q) || v.ownerName.toUpperCase().includes(q))
      .sort((a, b) => Number(b.inside) - Number(a.inside))
      .slice(0, 5);
  }, [query, world.vehicles]);

  return (
    <DialogPrimitive.Root open={paletteOpen} onOpenChange={setPaletteOpen}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-[80] bg-black/60 backdrop-blur-[3px] data-[state=open]:animate-[fade-in_0.16s_ease-out]" />
        <DialogPrimitive.Content
          className={cn(
            'glass fixed left-1/2 top-[14vh] z-[81] w-[calc(100vw-2rem)] max-w-[620px] -translate-x-1/2',
            'overflow-hidden rounded-2xl shadow-[var(--shadow-lg)]',
            'data-[state=open]:animate-[fade-up_0.22s_cubic-bezier(0.22,1,0.36,1)]',
          )}
        >
          <DialogPrimitive.Title className="sr-only">Command palette</DialogPrimitive.Title>
          <DialogPrimitive.Description className="sr-only">
            Search screens, vehicles and operator commands
          </DialogPrimitive.Description>

          <Command loop className="flex flex-col" shouldFilter>
            <div className="flex items-center gap-2.5 border-b border-border px-4 py-3">
              <Search className="h-4 w-4 shrink-0 text-subtle" />
              <Command.Input
                value={query}
                onValueChange={setQuery}
                autoFocus
                placeholder="Search screens, plates, or run a command…"
                className="h-6 flex-1 bg-transparent text-[14px] text-foreground outline-none placeholder:text-disabled"
              />
              <Kbd>ESC</Kbd>
            </div>

            <Command.List className="max-h-[52vh] overflow-y-auto p-2">
              <Command.Empty className="px-3 py-8 text-center text-[12.5px] text-subtle">
                No matches for “{query}”.
              </Command.Empty>

              {plateMatches.length > 0 && (
                <Command.Group heading="Vehicles" className="cmd-group">
                  {plateMatches.map((v) => (
                    <Command.Item
                      key={v.plate}
                      value={`vehicle ${v.plate} ${v.ownerName}`}
                      onSelect={() => run(() => navigate(`/search?plate=${v.plate}`))}
                      className="cmd-item"
                    >
                      <Car className="h-3.5 w-3.5 shrink-0 text-subtle" />
                      <PlateTag plate={v.plate} size="xs" />
                      <span className="truncate text-muted">{v.ownerName}</span>
                      <span className={cn('ml-auto shrink-0 text-[11px]', v.inside ? 'text-success' : 'text-subtle')}>
                        {v.inside ? `Inside · ${v.spaceCode ?? '—'}` : 'Outside'}
                      </span>
                    </Command.Item>
                  ))}
                </Command.Group>
              )}

              {NAV_GROUPS.map((group) => {
                const items = NAV_ITEMS.filter((n) => n.group === group.id);
                if (!items.length) return null;
                return (
                  <Command.Group key={group.id} heading={group.label} className="cmd-group">
                    {items.map((item) => (
                      <Command.Item
                        key={item.id}
                        value={`${item.label} ${item.description}`}
                        onSelect={() => run(() => navigate(item.path))}
                        className="cmd-item"
                      >
                        <item.icon className="h-3.5 w-3.5 shrink-0 text-subtle" />
                        <span className="text-foreground">{item.label}</span>
                        <span className="truncate text-[11.5px] text-subtle">{item.description}</span>
                        <span className="ml-auto flex shrink-0 items-center gap-1">
                          <Kbd>g</Kbd>
                          <Kbd>{item.chord}</Kbd>
                        </span>
                      </Command.Item>
                    ))}
                  </Command.Group>
                );
              })}

              <Command.Group heading="Commands" className="cmd-group">
                <Command.Item
                  value="open all entry barriers"
                  onSelect={() =>
                    run(() => {
                      world.barriers
                        .filter((b) => b.direction === 'entry')
                        .forEach((b) => simulation.commandBarrier(b.id, 'open', `${operator.name} (${operator.id})`));
                      toast({ title: 'Entry barriers opened', description: 'Both inbound lanes are now held open.', variant: 'warning' });
                    })
                  }
                  className="cmd-item"
                >
                  <Unlock className="h-3.5 w-3.5 shrink-0 text-subtle" />
                  <span className="text-foreground">Open all entry barriers</span>
                </Command.Item>

                <Command.Item
                  value="engage plaza emergency release evacuation"
                  onSelect={() =>
                    run(() => {
                      simulation.emergencyAll(`${operator.name} (${operator.id})`);
                      toast({
                        title: 'Emergency release engaged',
                        description: 'All barriers are held open. Vehicles pass without validation.',
                        variant: 'danger',
                      });
                    })
                  }
                  className="cmd-item"
                >
                  <Siren className="h-3.5 w-3.5 shrink-0 text-danger" />
                  <span className="text-danger">Engage plaza-wide emergency release</span>
                </Command.Item>

                <Command.Item
                  value="acknowledge all alerts"
                  onSelect={() =>
                    run(() => {
                      simulation.acknowledgeAll(`${operator.name} (${operator.id})`);
                      toast({ title: 'All alerts acknowledged', variant: 'success' });
                    })
                  }
                  className="cmd-item"
                >
                  <Zap className="h-3.5 w-3.5 shrink-0 text-subtle" />
                  <span className="text-foreground">Acknowledge all active alerts</span>
                </Command.Item>

                <Command.Item
                  value="toggle theme dark light appearance"
                  onSelect={() => run(() => setPrefs({ theme: prefs.theme === 'dark' ? 'light' : 'dark' }))}
                  className="cmd-item"
                >
                  {prefs.theme === 'dark' ? (
                    <Sun className="h-3.5 w-3.5 shrink-0 text-subtle" />
                  ) : (
                    <Moon className="h-3.5 w-3.5 shrink-0 text-subtle" />
                  )}
                  <span className="text-foreground">
                    Switch to {prefs.theme === 'dark' ? 'light' : 'dark'} theme
                  </span>
                </Command.Item>

                <Command.Item
                  value="pause resume live updates"
                  onSelect={() => run(() => setPrefs({ liveUpdates: !prefs.liveUpdates }))}
                  className="cmd-item"
                >
                  <ArrowRight className="h-3.5 w-3.5 shrink-0 text-subtle" />
                  <span className="text-foreground">{prefs.liveUpdates ? 'Pause' : 'Resume'} live updates</span>
                </Command.Item>
              </Command.Group>
            </Command.List>

            <div className="flex items-center justify-between border-t border-border px-3 py-2 text-[10.5px] text-subtle">
              <span className="flex items-center gap-1.5">
                <Kbd>↑</Kbd>
                <Kbd>↓</Kbd> navigate
                <Kbd>
                  <CornerDownLeft className="h-2.5 w-2.5" />
                </Kbd>
                select
              </span>
              <span className="flex items-center gap-1.5">
                <Kbd>?</Kbd> keyboard shortcuts
              </span>
            </div>
          </Command>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
