/**
 * All dashboard content, transcribed from the Figma design
 * (node 3159:8131 — "Energy Monitoring System EMS").
 *
 * Kept in one place so the presentational components stay dumb and the
 * screen can be wired to a real API by swapping this module out.
 */

export type Tone = 'neutral' | 'brand' | 'warning' | 'danger' | 'success';

/* ---------------------------------------------------------------- sidebar */

export const navItems = [
  { id: 'dashboard', label: 'dashboard', icon: 'home' },
  { id: 'energy-overview', label: 'Energy overview', icon: 'wireless' },
  { id: 'cost-savings', label: 'Cost & savings', icon: 'bolt' },
  { id: 'load-analysis', label: 'load analysis', icon: 'chart' },
  { id: 'equipment-monitoring', label: 'equipment monitoring', icon: 'suspension' },
  { id: 'utility-monitoring', label: 'utility monitoring', icon: 'plug' },
  { id: 'power-quality', label: 'power quality', icon: 'airbuds' },
  { id: 'alarms-alerts', label: 'Alarms & alerts', icon: 'bell' },
  { id: 'reports', label: 'reports', icon: 'clipboard' },
  { id: 'analytics', label: 'analytics', icon: 'graph' },
  { id: 'settings', label: 'settings', icon: 'settings' },
  { id: 'user-management', label: 'user management', icon: 'users' },
] as const;

export const facility = {
  label: 'facility',
  value: 'Nastle Kabirwala',
};

export const deviceStatus = {
  online: 47,
  total: 50,
  note: '3 offline - checked 2 mins ago',
};

/* ------------------------------------------------------------- stat cards */

export interface StatCard {
  label: string;
  value: string;
  unit?: string;
  caption: string;
  captionTone: Tone;
  icon: string;
  tone: Tone;
}

export const statCards: StatCard[] = [
  {
    label: 'Total Power',
    value: '2.54',
    unit: 'MW',
    caption: 'Live consumption',
    captionTone: 'neutral',
    icon: 'bolt',
    tone: 'neutral',
  },
  {
    label: 'Daily Energy',
    value: '58,765',
    unit: 'kWh',
    caption: "Today's consumption",
    captionTone: 'brand',
    icon: 'trend',
    tone: 'brand',
  },
  {
    label: 'Daily Cost',
    value: '1.52M',
    unit: 'PKR',
    caption: "Today's total cost",
    captionTone: 'warning',
    icon: 'cost',
    tone: 'warning',
  },
  {
    label: 'Current Demand',
    value: '2,890',
    unit: 'kW',
    caption: 'From 3,900 kW',
    captionTone: 'danger',
    icon: 'demand',
    tone: 'danger',
  },
  {
    label: 'Power factor',
    value: '0.92',
    unit: 'avg',
    caption: 'Moderately good',
    captionTone: 'neutral',
    icon: 'pulse',
    tone: 'neutral',
  },
  {
    label: 'Savings',
    value: '15.6',
    unit: '%',
    caption: 'vs Baseline',
    captionTone: 'success',
    icon: 'savings',
    tone: 'success',
  },
];

/* -------------------------------------------------- real-time load curve */

/** Hourly load in kW, 00:00 -> 24:00 (25 points so the curve closes on 12 AM). */
export const loadCurve = {
  hours: Array.from({ length: 25 }, (_, i) => i),
  today: [
    1780, 1750, 1720, 1700, 1690, 1700, 1740, 1810, 1880, 1960, 2050, 2120,
    2154, 2120, 2060, 2010, 1980, 1990, 2020, 2060, 2040, 1980, 1900, 1840,
    1800,
  ],
  yesterday: [
    1180, 1160, 1140, 1130, 1120, 1130, 1160, 1210, 1270, 1320, 1350, 1370,
    1360, 1330, 1300, 1290, 1300, 1330, 1370, 1400, 1390, 1350, 1300, 1260,
    1230,
  ],
  peak: 2200,
  peakLabel: 'PEAK CURVE',
  marker: { hour: 12, label: '12:00', value: '2,154 kW' },
  yTicks: [0, 500, 1000, 1500, 2000, 2500],
  xLabels: ['12 AM', '4 AM', '8 AM', '12 PM', '4 PM', '8 PM', '12 AM'],
  axisLabel: 'MW',
};

/* ------------------------------------------------- energy cost comparison */

export const costComparison = {
  months: ["Jan '26", "Feb '26", "Mar '26", "Apr '26", "May '26", "July '26"],
  baseline: [78, 85, 63, 88, 70, 62],
  actual: [58, 50, 46, 68, 45, 44],
  yTicks: [0, 20, 40, 60, 80, 100],
  axisLabel: 'PKR (Millions)',
};

/* ----------------------------------------------------- saving summary */

export const savingSummary = {
  percent: 16.5,
  caption: 'Total Savings',
  rows: [
    { label: 'Baseline Cost', value: '34,520,000', unit: 'PKR' },
    { label: 'Actual Cost', value: '29,250,000', unit: 'PKR' },
    { label: 'Total Savings', value: '53,65,000', unit: 'PKR' },
  ],
};

/* ------------------------------------------------------ energy breakdown */

export const energyBreakdown = {
  total: '58,765',
  unit: 'kWh',
  totalZones: '06',
  slices: [
    { label: 'HVAC', value: 26.0, color: 'var(--status-success-default)' },
    { label: 'Production', value: 25.5, color: 'var(--brand-primary)' },
    { label: 'Compressors', value: 12.5, color: 'var(--status-warning-default)' },
    { label: 'Boilers', value: 10.0, color: 'var(--navy-300)' },
    { label: 'Lightings', value: 12.5, color: 'var(--brand-hover)' },
    { label: 'Others', value: 14.0, color: 'var(--status-neutral-default)' },
  ],
};

/* ------------------------------------------- top energy consuming equipment */

export const topEquipment = {
  columns: ['Equipment', 'Consumption (kWh)', '% of Total'],
  rows: [
    { name: 'Boiler #1', consumption: '12,685', percent: 21.6 },
    { name: 'Chiller plant', consumption: '12,685', percent: 19.4 },
    { name: 'Air Compressor', consumption: '12,685', percent: 14.5 },
    { name: 'Production Line -1', consumption: '12,685', percent: 13.2 },
    { name: 'AHU - Block B', consumption: '12,685', percent: 10.8 },
  ],
};

/* -------------------------------------------------------- utility overview */

export const utilityOverview = [
  {
    name: 'Solar Energy',
    icon: 'sun',
    tile: 'var(--status-success-default)',
    amount: '58,765 kWh',
    amountColor: 'var(--status-success-strong)',
    cost: 'PKR 1,52,300',
  },
  {
    name: 'Electric Grid',
    icon: 'suspension',
    tile: 'var(--status-warning-default)',
    amount: '18,765 kWh',
    amountColor: 'var(--status-warning-strong)',
    cost: 'PKR 5,62,950',
  },
  {
    name: 'Generators',
    icon: 'generator',
    tile: 'var(--status-danger-default)',
    amount: '58,765 kWh',
    amountColor: 'var(--status-danger-text)',
    cost: 'PKR 1,52,300',
  },
  {
    name: 'Batteries',
    icon: 'battery',
    tile: 'var(--brand-primary)',
    amount: '58,765 kWh',
    amountColor: 'var(--text-brand)',
    cost: 'PKR 1,52,300',
  },
  {
    name: 'Gas',
    icon: 'flame',
    tile: 'var(--status-info-default)',
    // rendered with a <sup>2</sup> for the m² superscript
    amount: '18,652 m',
    amountSuffix: '2',
    amountColor: 'var(--status-info-text)',
    cost: 'PKR 1,52,300',
  },
];

/* ------------------------------------------------------------ power quality */

export const powerQuality = {
  columns: ['PARAMETER', 'L1', 'L2', 'L3', 'AVG'],
  rows: [
    { parameter: 'Voltage (V)', l1: '231', l2: '229', l3: '232', avg: '230' },
    { parameter: 'Current (A)', l1: '312', l2: '298', l3: '305', avg: '230' },
    { parameter: 'Power Factor', l1: '0.93', l2: '0.91', l3: '0.94', avg: '0.93' },
    { parameter: 'Frequency (Hz)', l1: '50.2', l2: '50.4', l3: '50.6', avg: '50.4' },
    { parameter: 'THD (%)', l1: '3.2', l2: '3.5', l3: '3.1', avg: '3.3' },
  ],
};

/* ---------------------------------------------------------- energy intensity */

export const energyIntensity = {
  subtitle: '(kWh / Unit Production)',
  stats: [
    { label: 'This month', value: '0.245', unit: 'kWh / Unit', tone: 'brand' as Tone },
    { label: 'Last month', value: '0.465', unit: 'kWh / Unit', tone: 'neutral' as Tone },
  ],
  improvement: { label: 'Improvements', value: '15.2%' },
  months: ["Jan '26", "Feb '26", "Mar '26", "Apr '26", "May '26", "July '26"],
  series: [56, 51, 54, 52, 53, 60],
  yTicks: [0, 20, 40, 60, 80],
};

/* -------------------------------------------------------- energy saving trend */

export const energySavingTrend = {
  label: 'Total Savings PKR',
  value: 'PKR 20,865,420',
  months: ["Jan '26", "Feb '26", "Mar '26", "Apr '26", "May '26", "July '26"],
  series: [3.2, 6.4, 9.6, 13.5, 19.2, 23.4],
  yTicks: [0, 5, 10, 15, 20, 25],
  yFormat: (v: number) => (v === 0 ? '0' : `${v}M`),
};
