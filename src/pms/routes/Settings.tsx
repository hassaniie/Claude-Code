/**
 * Settings.
 *
 * Operator preferences plus the API diagnostics panel. The diagnostics are not
 * a novelty: injecting latency and failures is how you verify that every screen
 * really does have a loading state, an error state and a working retry before
 * the system meets a flaky network in production.
 */

import {
  Activity, Bell, Eye, Gauge, Languages, Monitor, Moon, Palette, Plug,
  RefreshCw, Sun, TriangleAlert, Wifi, Zap,
} from 'lucide-react';
import { useState } from 'react';
import { ago, cn, num } from '../lib/utils';
import { Page } from '../components/ui/page';
import { Card, CardHeader } from '../components/ui/card';
import { Badge, Button, Meter, Separator, StatusPill } from '../components/ui/primitives';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SettingRow, Switch } from '../components/ui/form';
import { Segmented } from '../components/ui/tabs';
import { DefList } from '../components/ui/data';
import { parkingApi, transport } from '../data/api';
import { simulation, useHealth, useKpis } from '../store/live';
import { useSession } from '../store/session';

export default function Settings() {
  const { prefs, setPrefs, operator, toast } = useSession();
  const health = useHealth();
  const kpis = useKpis();
  const [probe, setProbe] = useState<{ status: 'idle' | 'running' | 'ok' | 'failed'; ms?: number; message?: string }>({
    status: 'idle',
  });

  const runProbe = async () => {
    setProbe({ status: 'running' });
    const started = performance.now();
    try {
      await parkingApi.getKpis();
      setProbe({ status: 'ok', ms: Math.round(performance.now() - started) });
      toast({ title: 'Connection test passed', description: 'The Parking API responded normally.', variant: 'success' });
    } catch (err) {
      setProbe({
        status: 'failed',
        ms: Math.round(performance.now() - started),
        message: err instanceof Error ? err.message : 'Unknown error',
      });
      toast({
        title: 'Connection test failed',
        description: err instanceof Error ? err.message : 'The API did not respond.',
        variant: 'danger',
      });
    }
  };

  return (
    <Page>
      <div className="grid gap-3.5 xl:grid-cols-2">
        {/* ------------------------------------------------ appearance */}
        <Card>
          <CardHeader title="Appearance" subtitle="How the console looks on this workstation" icon={<Palette className="h-3.5 w-3.5" />} />
          <div className="divide-y divide-border-subtle px-4">
            <SettingRow
              title="Theme"
              description="Dark is the operational default; light is a full peer for daytime desks."
              control={
                <Segmented
                  value={prefs.theme}
                  onChange={(v) => setPrefs({ theme: v })}
                  options={[
                    { value: 'dark', label: 'Dark', icon: <Moon className="h-3.5 w-3.5" /> },
                    { value: 'light', label: 'Light', icon: <Sun className="h-3.5 w-3.5" /> },
                  ]}
                />
              }
            />
            <SettingRow
              title="Density"
              description="Compact tightens type and row heights for smaller control-room displays."
              control={
                <Segmented
                  value={prefs.density}
                  onChange={(v) => setPrefs({ density: v })}
                  options={[
                    { value: 'comfortable', label: 'Comfortable' },
                    { value: 'compact', label: 'Compact' },
                  ]}
                />
              }
            />
            <SettingRow
              title="Reduce motion"
              description="Disables gauge sweeps, counters and panel transitions."
              control={
                <Switch checked={prefs.reduceMotion} onCheckedChange={(v) => setPrefs({ reduceMotion: v })} />
              }
            />
            <SettingRow
              title="Language"
              description="Interface language for this operator account."
              control={
                <Select value="en-GB" onValueChange={() => {}}>
                  <SelectTrigger className="w-[170px]">
                    <Languages className="h-3.5 w-3.5 text-subtle" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en-GB">English (UK)</SelectItem>
                    <SelectItem value="ur-PK">اردو</SelectItem>
                    <SelectItem value="ar-AE">العربية</SelectItem>
                  </SelectContent>
                </Select>
              }
            />
          </div>
        </Card>

        {/* ---------------------------------------------- live updates */}
        <Card>
          <CardHeader title="Live data" subtitle="How often this console refreshes from the plaza" icon={<Activity className="h-3.5 w-3.5" />} />
          <div className="divide-y divide-border-subtle px-4">
            <SettingRow
              title="Live updates"
              description="Pause to freeze the console while you investigate a snapshot in peace."
              control={<Switch checked={prefs.liveUpdates} onCheckedChange={(v) => setPrefs({ liveUpdates: v })} />}
            />
            <SettingRow
              title="Update cadence"
              description="How frequently plaza state is applied. Slower cadences reduce CPU on shared displays."
              control={
                <Select value={String(prefs.tickMs)} onValueChange={(v) => setPrefs({ tickMs: Number(v) })}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1000">1 second</SelectItem>
                    <SelectItem value="2200">2.2 seconds</SelectItem>
                    <SelectItem value="5000">5 seconds</SelectItem>
                    <SelectItem value="15000">15 seconds</SelectItem>
                  </SelectContent>
                </Select>
              }
            />
            <SettingRow
              title="Audible alerts"
              description="Play a tone when a critical alert is raised."
              control={<Switch checked={prefs.soundAlerts} onCheckedChange={(v) => setPrefs({ soundAlerts: v })} />}
            />
          </div>

          <div className="border-t border-border-subtle p-4">
            <div className="flex items-center justify-between">
              <span className="text-[11.5px] text-subtle">Current state</span>
              <StatusPill tone={prefs.liveUpdates ? 'success' : 'warning'} pulse={prefs.liveUpdates}>
                {prefs.liveUpdates ? `Streaming every ${(prefs.tickMs / 1000).toFixed(1)}s` : 'Paused'}
              </StatusPill>
            </div>
          </div>
        </Card>

        {/* ---------------------------------------------- diagnostics */}
        <Card className="xl:col-span-2">
          <CardHeader
            title="API diagnostics"
            subtitle="Verify the console's behaviour under latency and failure"
            icon={<Plug className="h-3.5 w-3.5" />}
            actions={
              <Button variant="secondary" size="sm" onClick={runProbe} loading={probe.status === 'running'}>
                <Zap className="h-3.5 w-3.5" />
                Test connection
              </Button>
            }
          />

          <div className="grid gap-4 p-4 lg:grid-cols-2">
            <div className="flex flex-col gap-3">
              <div className="rounded-xl border border-border bg-surface-inset p-3.5">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-[11.5px] text-subtle">
                    <Wifi className="h-3.5 w-3.5" />
                    Live link
                  </span>
                  <StatusPill
                    tone={health.connection === 'connected' ? 'success' : health.connection === 'degraded' ? 'warning' : 'danger'}
                    pulse={health.connection !== 'connected'}
                  >
                    {health.connection}
                  </StatusPill>
                </div>
                <div className="mt-3">
                  <DefList
                    columns={2}
                    items={[
                      { label: 'Latency', value: <span className="tnum">{health.latencyMs} ms</span> },
                      { label: 'Last sync', value: <span className="tnum">{ago(health.lastSync)}</span> },
                      { label: 'Uptime (30d)', value: <span className="tnum">{health.uptimePct}%</span> },
                      { label: 'API errors (24h)', value: <span className="tnum">{num(health.apiErrors24h)}</span> },
                      { label: 'Nodes online', value: `${health.nodesOnline} / ${health.nodesTotal}` },
                      { label: 'Cameras offline', value: <span className="tnum">{num(kpis.offlineCameras)}</span> },
                    ]}
                  />
                </div>
                <Meter
                  className="mt-3"
                  value={(health.nodesOnline / health.nodesTotal) * 100}
                  tone={health.nodesOnline === health.nodesTotal ? 'success' : 'warning'}
                />
              </div>

              {probe.status !== 'idle' && probe.status !== 'running' && (
                <div
                  className={cn(
                    'rounded-xl border px-3.5 py-3',
                    probe.status === 'ok' ? 'border-success/30 bg-success-dim/40' : 'border-danger/30 bg-danger-dim/40',
                  )}
                >
                  <p className="text-[12px] font-medium text-foreground">
                    {probe.status === 'ok' ? 'Probe succeeded' : 'Probe failed'}
                    <span className="tnum ml-2 font-normal text-subtle">{probe.ms} ms round trip</span>
                  </p>
                  {probe.message && <p className="mt-1 text-[11.5px] text-muted">{probe.message}</p>}
                </div>
              )}
            </div>

            <div className="flex flex-col gap-3">
              <div className="rounded-xl border border-warning/25 bg-warning-dim/25 p-3.5">
                <p className="flex items-center gap-2 text-[12px] font-medium text-foreground">
                  <TriangleAlert className="h-3.5 w-3.5 text-warning" />
                  Fault injection
                </p>
                <p className="mt-1 text-[11.5px] leading-relaxed text-muted">
                  These controls degrade this console's own API client. Use them to confirm that every screen
                  shows a loading state, a readable error and a retry that works.
                </p>
              </div>

              <div className="divide-y divide-border-subtle">
                <SettingRow
                  title="Latency profile"
                  description={`Currently ${transport.minLatency}–${transport.maxLatency} ms per request`}
                  control={
                    <Select
                      value={prefs.latencyProfile}
                      onValueChange={(v) => setPrefs({ latencyProfile: v as typeof prefs.latencyProfile })}
                    >
                      <SelectTrigger className="w-[150px]">
                        <Gauge className="h-3.5 w-3.5 text-subtle" />
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fast">Fast (60–160 ms)</SelectItem>
                        <SelectItem value="normal">Normal (180–520 ms)</SelectItem>
                        <SelectItem value="slow">Slow (0.9–2.2 s)</SelectItem>
                      </SelectContent>
                    </Select>
                  }
                />
                <SettingRow
                  title="Failure rate"
                  description="Proportion of requests that fail with a 504, to exercise retry and error states"
                  control={
                    <Select value={String(prefs.failureRate)} onValueChange={(v) => setPrefs({ failureRate: Number(v) })}>
                      <SelectTrigger className="w-[150px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">None</SelectItem>
                        <SelectItem value="0.15">15%</SelectItem>
                        <SelectItem value="0.4">40%</SelectItem>
                        <SelectItem value="1">Always fail</SelectItem>
                      </SelectContent>
                    </Select>
                  }
                />
                <SettingRow
                  title="Simulate degraded link"
                  description="Forces the connection indicator into its degraded state"
                  control={
                    <Switch
                      checked={health.connection === 'degraded'}
                      onCheckedChange={(v) => simulation.setConnection(v ? 'degraded' : 'connected')}
                    />
                  }
                />
                <SettingRow
                  title="Simulate link loss"
                  description="Shows the stale-data banner across every live screen"
                  control={
                    <Switch
                      checked={health.connection === 'offline'}
                      onCheckedChange={(v) => simulation.setConnection(v ? 'offline' : 'connected')}
                    />
                  }
                />
              </div>

              {prefs.failureRate > 0 && (
                <div className="flex items-center gap-2 rounded-lg border border-danger/30 bg-danger-dim/40 px-3 py-2">
                  <TriangleAlert className="h-3.5 w-3.5 shrink-0 text-danger" />
                  <p className="text-[11.5px] text-foreground">
                    Fault injection is active at {(prefs.failureRate * 100).toFixed(0)}%. Reset it to “None” before
                    handing the console back to an operator.
                  </p>
                  <Button size="xs" variant="secondary" className="ml-auto" onClick={() => setPrefs({ failureRate: 0 })}>
                    <RefreshCw className="h-3 w-3" />
                    Reset
                  </Button>
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* -------------------------------------------- notifications */}
        <Card>
          <CardHeader title="Notifications" subtitle="What this console tells you about" icon={<Bell className="h-3.5 w-3.5" />} />
          <div className="divide-y divide-border-subtle px-4">
            {[
              ['Critical alerts', 'Parking full, camera offline, barrier fault, emergency mode', true],
              ['Capacity warnings', 'Plaza or a level crossing 80% occupancy', true],
              ['Failed recognitions', 'ANPR misreads that need manual admission', true],
              ['Payment failures', 'Declined or unsettled transactions at a terminal', false],
              ['Shift handover summary', 'A digest at the end of your shift', false],
            ].map(([title, description, on]) => (
              <SettingRow
                key={title as string}
                title={title as string}
                description={description as string}
                control={<Switch defaultChecked={on as boolean} />}
              />
            ))}
          </div>
        </Card>

        {/* --------------------------------------------------- session */}
        <Card>
          <CardHeader title="Session" subtitle="This operator and workstation" icon={<Eye className="h-3.5 w-3.5" />} />
          <div className="p-4">
            <DefList
              columns={2}
              items={[
                { label: 'Operator', value: operator.name },
                { label: 'Operator ID', value: <span className="font-mono">{operator.id}</span> },
                { label: 'Role', value: operator.role },
                { label: 'Shift', value: operator.shift },
                { label: 'Site', value: operator.site },
                { label: 'Workstation', value: <span className="font-mono">WS-CTRL-04</span> },
              ]}
            />

            <Separator className="my-4" />

            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="outline" size="sm">
                <Monitor className="h-3 w-3" />
                Nexus PMS v1.0.0
              </Badge>
              <Badge tone="outline" size="sm">
                BMS suite · Parking module
              </Badge>
              <Badge tone="outline" size="sm">
                Build {new Date().toISOString().slice(0, 10)}
              </Badge>
            </div>

            <p className="mt-3 text-[11.5px] leading-relaxed text-subtle">
              Preferences are stored on this workstation only. Operator accounts, roles and tariffs are managed
              centrally in Administration.
            </p>
          </div>
        </Card>
      </div>
    </Page>
  );
}
