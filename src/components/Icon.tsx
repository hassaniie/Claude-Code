/**
 * Icon layer.
 *
 * NOTE ON FIDELITY
 * ----------------
 * The Figma file draws its icons from the **Solar** icon set, and the MCP
 * server returns them as `figma.com/api/mcp/asset/…` SVG URLs. This build
 * environment's egress policy blocks `www.figma.com`, so those exact assets
 * could not be downloaded. Every glyph below is therefore the closest
 * available match from `lucide-react`, chosen per icon by eye against the
 * design screenshot.
 *
 * The original Solar name is recorded next to each entry, so swapping in the
 * real assets later is a one-file change: replace the map values with
 * `<img src={…} />` or inline SVGs and nothing else has to move.
 */
import {
  Activity,
  AirVent,
  BadgePercent,
  BatteryCharging,
  Bell,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Flame,
  Gauge,
  Grid2x2,
  HandCoins,
  House,
  Laptop,
  LineChart,
  Moon,
  PanelLeft,
  PieChart,
  Plug,
  Projector,
  RotateCw,
  Router,
  Search,
  Server,
  Settings,
  SquareActivity,
  Sun,
  TrendingUp,
  Users,
  WashingMachine,
  Wind,
  Zap,
  type LucideIcon,
} from 'lucide-react';

/** name used in data/components -> [lucide glyph, original Solar icon name] */
const registry: Record<string, [LucideIcon, string]> = {
  /* ---- sidebar nav ---- */
  home: [House, 'Bold / Essentional, UI / Home Smile'],
  wireless: [Gauge, 'Outline / Electronic, Devices / Wireless Charge'],
  bolt: [Zap, 'Outline / Essentional, UI / Bolt'],
  chart: [LineChart, 'Linear / Business, Statistic / Chart'],
  suspension: [Grid2x2, 'Linear / Transport, Parts, Service / Suspension Bolt'],
  plug: [Plug, 'Linear / Electronic, Devices / Plug Circle'],
  airbuds: [SquareActivity, 'Outline / Electronic, Devices / Airbuds Case Charge'],
  bell: [Bell, 'Linear / Notifications / Bell Bing'],
  clipboard: [ClipboardList, 'Linear / Notes / Clipboard'],
  graph: [PieChart, 'Outline / Business, Statistic / Round Graph'],
  settings: [Settings, 'Outline / Settings, Fine Tuning / Settings'],
  users: [Users, 'Outline / Users / Users Group Two Rounded'],

  /* ---- chrome ---- */
  sidebarToggle: [PanelLeft, 'Outline / Network, IT, Programming / Sidebar Minimalistic'],
  search: [Search, 'Outline / Search / Rounded Magnifer'],
  chevronDown: [ChevronDown, 'Linear / Arrows / Alt Arrow Down'],
  chevronRight: [ChevronRight, 'Outline / Arrows / Alt Arrow Right'],
  sun: [Sun, 'Bold / Weather / Sun 2'],
  moon: [Moon, 'Bold / Weather / Moon'],
  laptop: [Laptop, 'Bold / Electronic, Devices / Laptop'],
  refresh: [RotateCw, 'Bold / Arrows / Restart Circle'],

  /* ---- stat cards ---- */
  trend: [TrendingUp, 'Linear / Business, Statistic / Chart 2'],
  cost: [HandCoins, 'Linear / Money / Hand Money'],
  demand: [Gauge, 'Linear / Business, Statistic / Speedometer Max'],
  pulse: [Activity, 'Linear / Medicine / Pulse'],
  savings: [BadgePercent, 'Linear / Money / Verified Check'],

  /* ---- utility overview ---- */
  generator: [Server, 'Bold / Home, Furniture / Washing Machine'],
  battery: [BatteryCharging, 'Bold / Essentional, UI / Battery Charge'],
  flame: [Flame, 'Bold / Nature, Travel / Flame'],

  /* ---- equipment table ---- */
  boiler: [WashingMachine, 'Outline / Home, Furniture / Washing Machine'],
  chiller: [AirVent, 'Outline / Home, Furniture / Condicioner'],
  compressor: [Wind, 'Outline / Weather / Wind'],
  productionLine: [Router, 'Linear / Network, IT, Programming / Wi-Fi Router'],
  ahu: [Projector, 'Linear / Electronic, Devices / Projector'],
};

export interface IconProps {
  name: keyof typeof registry | string;
  size?: number;
  color?: string;
  strokeWidth?: number;
  className?: string;
  /** Renders the glyph filled, approximating Solar's "Bold" weight. */
  filled?: boolean;
}

export function Icon({
  name,
  size = 16,
  color = 'currentColor',
  strokeWidth = 1.6,
  className,
  filled = false,
}: IconProps) {
  const entry = registry[name];
  if (!entry) return null;
  const [Glyph] = entry;

  return (
    <Glyph
      size={size}
      color={color}
      strokeWidth={strokeWidth}
      className={className}
      fill={filled ? color : 'none'}
      aria-hidden="true"
      // lock both dimensions so the glyph never inherits a stretched box
      style={{ width: size, height: size, flexShrink: 0 }}
    />
  );
}
