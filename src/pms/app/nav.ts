import {
  Activity, BarChart3, Bell, Car, Cctv, FileText, LayoutDashboard, LogIn,
  Settings, ShieldCheck, SlidersHorizontal, Users, UserSquare, type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  id: string;
  label: string;
  path: string;
  icon: LucideIcon;
  /** Second key of the `g …` navigation chord. */
  chord: string;
  group: 'operations' | 'people' | 'infrastructure' | 'intelligence' | 'system';
  description: string;
}

export const NAV_GROUPS: Array<{ id: NavItem['group']; label: string }> = [
  { id: 'operations', label: 'Operations' },
  { id: 'people', label: 'People' },
  { id: 'infrastructure', label: 'Infrastructure' },
  { id: 'intelligence', label: 'Intelligence' },
  { id: 'system', label: 'System' },
];

export const NAV_ITEMS: NavItem[] = [
  {
    id: 'dashboard', label: 'Dashboard', path: '/', icon: LayoutDashboard, chord: 'd',
    group: 'operations', description: 'Command centre overview of the whole plaza',
  },
  {
    id: 'plaza', label: 'Parking Plaza', path: '/plaza', icon: Car, chord: 'p',
    group: 'operations', description: '2D map, list and table views of every bay',
  },
  {
    id: 'search', label: 'Vehicle Search', path: '/search', icon: Activity, chord: 'v',
    group: 'operations', description: 'Find any vehicle by plate, owner or company',
  },
  {
    id: 'gates', label: 'Entry / Exit', path: '/gates', icon: LogIn, chord: 'e',
    group: 'operations', description: 'Live lane monitoring, ANPR and queue control',
  },
  {
    id: 'visitors', label: 'Visitors', path: '/visitors', icon: UserSquare, chord: 'g',
    group: 'people', description: 'Visitor registration, tickets and charges',
  },
  {
    id: 'employees', label: 'Employees', path: '/employees', icon: Users, chord: 'm',
    group: 'people', description: 'Employee records, vehicles and subscriptions',
  },
  {
    id: 'cctv', label: 'CCTV', path: '/cctv', icon: Cctv, chord: 'c',
    group: 'infrastructure', description: 'Camera wall, playback and health',
  },
  {
    id: 'barriers', label: 'Barriers', path: '/barriers', icon: ShieldCheck, chord: 'b',
    group: 'infrastructure', description: 'Barrier control and connection health',
  },
  {
    id: 'reports', label: 'Reports', path: '/reports', icon: FileText, chord: 'r',
    group: 'intelligence', description: 'Generate and export operational reports',
  },
  {
    id: 'analytics', label: 'Analytics', path: '/analytics', icon: BarChart3, chord: 'y',
    group: 'intelligence', description: 'Occupancy, peak hours, revenue and heatmaps',
  },
  {
    id: 'alerts', label: 'Alerts', path: '/alerts', icon: Bell, chord: 'a',
    group: 'intelligence', description: 'Active and historical alerts',
  },
  {
    id: 'admin', label: 'Administration', path: '/admin', icon: SlidersHorizontal, chord: 'n',
    group: 'system', description: 'Users, roles, tariffs and device registry',
  },
  {
    id: 'settings', label: 'Settings', path: '/settings', icon: Settings, chord: 's',
    group: 'system', description: 'Preferences, theme and API diagnostics',
  },
];

export const findNav = (pathname: string) =>
  NAV_ITEMS.find((n) => (n.path === '/' ? pathname === '/' : pathname.startsWith(n.path)));
