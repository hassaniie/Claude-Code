/**
 * Admin — Settings. Preferences (theme, density, units), live cadence, and an
 * API diagnostics panel that injects latency and failures into this console's
 * own client so every screen's loading / error / retry path can be exercised
 * before a flaky network finds them.
 */

import { Activity, Gauge, Moon, Palette, Sun } from 'lucide-react';
import { Page } from '../../components/ui/page';
import { Card, CardBody, CardHeader } from '../../components/ui/card';
import { PageHeader } from '../../components/common';
import { IconBox, StatusBadge, Button } from '../../components/ui/primitives';
import { SettingRow, Switch, SimpleSelect } from '../../components/ui/form';
import { Segmented } from '../../components/ui/tabs';
import { useSession } from '../../store/session';

export default function Settings() {
  const { prefs, setPrefs } = useSession();

  return (
    <Page>
      <PageHeader title="Settings" description="Preferences, live cadence and API diagnostics." />

      <Card>
        <CardHeader title="Appearance" icon={<IconBox icon={Palette} tone="primary" size="sm" />} />
        <CardBody className="divide-y divide-border-subtle py-0">
          <SettingRow
            title="Theme"
            description="Both themes are intentionally designed, not inverted."
            control={<Segmented value={prefs.theme} onChange={(v) => setPrefs({ theme: v })} options={[{ value: 'dark', label: 'Dark', icon: <Moon className="h-3.5 w-3.5" /> }, { value: 'light', label: 'Light', icon: <Sun className="h-3.5 w-3.5" /> }]} />}
          />
          <SettingRow
            title="Density"
            description="Comfortable adds breathing room; compact fits more on screen."
            control={<Segmented value={prefs.density} onChange={(v) => setPrefs({ density: v })} options={[{ value: 'comfortable', label: 'Comfortable' }, { value: 'compact', label: 'Compact' }]} />}
          />
          <SettingRow
            title="Area units"
            description="Used across spaces and tenant summaries."
            control={<Segmented value={prefs.areaUnit} onChange={(v) => setPrefs({ areaUnit: v })} options={[{ value: 'sqft', label: 'ft²' }, { value: 'sqm', label: 'm²' }]} />}
          />
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Live Data" icon={<IconBox icon={Activity} tone="energy" size="sm" />} />
        <CardBody className="divide-y divide-border-subtle py-0">
          <SettingRow title="Live updates" description="Stream meter and visitor changes into the console." control={<Switch checked={prefs.liveUpdates} onCheckedChange={(v) => setPrefs({ liveUpdates: v })} />} />
          <SettingRow
            title="Update cadence"
            description="How often the simulated socket pushes changes."
            control={<SimpleSelect value={String(prefs.tickMs)} onChange={(v) => setPrefs({ tickMs: Number(v) })} options={[{ value: '2000', label: '2s' }, { value: '4000', label: '4s' }, { value: '8000', label: '8s' }]} className="w-[120px]" />}
          />
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="API Diagnostics"
          subtitle="Inject faults to verify every screen's states"
          icon={<IconBox icon={Gauge} tone="warning" size="sm" />}
          actions={<StatusBadge tone={prefs.failureRate > 0 ? 'warning' : 'success'} size="sm">{prefs.failureRate > 0 ? `${Math.round(prefs.failureRate * 100)}% failures` : 'Healthy'}</StatusBadge>}
        />
        <CardBody className="divide-y divide-border-subtle py-0">
          <SettingRow
            title="Latency profile"
            description="Round-trip time added to every query."
            control={<SimpleSelect value={prefs.latencyProfile} onChange={(v) => setPrefs({ latencyProfile: v })} options={[{ value: 'fast', label: 'Fast (60–160ms)' }, { value: 'normal', label: 'Normal (160–480ms)' }, { value: 'slow', label: 'Slow (0.8–2s)' }]} className="w-[180px]" />}
          />
          <SettingRow
            title="Failure rate"
            description="Probability each query fails — drives error and retry states."
            control={
              <div className="flex items-center gap-3">
                <input type="range" min={0} max={100} step={5} value={Math.round(prefs.failureRate * 100)} onChange={(e) => setPrefs({ failureRate: Number(e.target.value) / 100 })} className="w-40 accent-[var(--primary)]" />
                <span className="tnum w-10 text-right text-[12.5px] font-medium text-foreground">{Math.round(prefs.failureRate * 100)}%</span>
              </div>
            }
          />
          <div className="flex items-center justify-between py-3.5">
            <div>
              <p className="text-[13px] font-medium text-foreground">Quick presets</p>
              <p className="text-[11.5px] text-subtle">Jump to a scenario to test.</p>
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={() => setPrefs({ failureRate: 0, latencyProfile: 'normal' })}>Healthy</Button>
              <Button variant="secondary" size="sm" onClick={() => setPrefs({ failureRate: 0.3, latencyProfile: 'slow' })}>Degraded</Button>
              <Button variant="danger" size="sm" onClick={() => setPrefs({ failureRate: 1, latencyProfile: 'slow' })}>Outage</Button>
            </div>
          </div>
        </CardBody>
      </Card>
    </Page>
  );
}
