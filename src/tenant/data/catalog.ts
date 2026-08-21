/**
 * Content pools and the fixed physical catalog for the NASTP ecosystem.
 *
 * Kept apart from generation logic so the world can be re-themed without
 * touching `world.ts`. NASTP is an aerospace, science & technology park, so the
 * tenant roster reads as avionics, defence-tech, satellite and software firms —
 * never "Company XYZ".
 */

import type { OrganizationType } from './types';

/* ------------------------------------------------------------ organisations */

export interface OrgSeed {
  name: string;
  legal: string;
  code: string;
  type: OrganizationType;
  hue: number;
}

/** Believable NASTP tenants. Legal names and hues are stable per org. */
export const ORG_SEEDS: OrgSeed[] = [
  { name: 'Orbital Dynamics', legal: 'Orbital Dynamics (Pvt.) Ltd.', code: 'ORBIT', type: 'private_limited', hue: 214 },
  { name: 'AeroLogic Systems', legal: 'AeroLogic Systems Ltd.', code: 'AEROLG', type: 'public_limited', hue: 168 },
  { name: 'Falcon Avionics', legal: 'Falcon Avionics (Pvt.) Ltd.', code: 'FALCON', type: 'private_limited', hue: 26 },
  { name: 'Zenith Semiconductors', legal: 'Zenith Semiconductors Ltd.', code: 'ZENSC', type: 'multinational', hue: 275 },
  { name: 'Kavosh Robotics', legal: 'Kavosh Robotics (Pvt.) Ltd.', code: 'KAVOSH', type: 'private_limited', hue: 340 },
  { name: 'Meridian GeoSpatial', legal: 'Meridian GeoSpatial Ltd.', code: 'MERID', type: 'private_limited', hue: 192 },
  { name: 'Sentinel Defence Tech', legal: 'Sentinel Defence Technologies Ltd.', code: 'SENTNL', type: 'government', hue: 152 },
  { name: 'Nimbus Cloud Labs', legal: 'Nimbus Cloud Labs (Pvt.) Ltd.', code: 'NIMBUS', type: 'private_limited', hue: 232 },
  { name: 'Photon Optics', legal: 'Photon Optics (Pvt.) Ltd.', code: 'PHOTON', type: 'private_limited', hue: 48 },
  { name: 'Cascade Propulsion', legal: 'Cascade Propulsion Ltd.', code: 'CASCAD', type: 'public_limited', hue: 12 },
  { name: 'Vector Simulations', legal: 'Vector Simulations (Pvt.) Ltd.', code: 'VECTOR', type: 'private_limited', hue: 288 },
  { name: 'Helios Energy Systems', legal: 'Helios Energy Systems Ltd.', code: 'HELIOS', type: 'private_limited', hue: 40 },
  { name: 'Quanta Materials', legal: 'Quanta Advanced Materials Ltd.', code: 'QUANTA', type: 'multinational', hue: 258 },
  { name: 'SkyBridge Telemetry', legal: 'SkyBridge Telemetry (Pvt.) Ltd.', code: 'SKYBRG', type: 'private_limited', hue: 200 },
  { name: 'Ironclad Cyber', legal: 'Ironclad Cyber Security Ltd.', code: 'IRONCL', type: 'private_limited', hue: 0 },
  { name: 'Aria Aerostructures', legal: 'Aria Aerostructures (Pvt.) Ltd.', code: 'ARIAAS', type: 'private_limited', hue: 320 },
  { name: 'Polaris Navigation', legal: 'Polaris Navigation Systems Ltd.', code: 'POLARS', type: 'public_limited', hue: 220 },
  { name: 'Terra Drone Works', legal: 'Terra Drone Works (Pvt.) Ltd.', code: 'TERRAD', type: 'private_limited', hue: 132 },
  { name: 'Lumen AI Research', legal: 'Lumen AI Research (Pvt.) Ltd.', code: 'LUMEN', type: 'private_limited', hue: 264 },
  { name: 'Basalt Ground Systems', legal: 'Basalt Ground Systems Ltd.', code: 'BASALT', type: 'partnership', hue: 20 },
  { name: 'Emet Test Labs', legal: 'Emet Test Laboratories Ltd.', code: 'EMETTL', type: 'ngo', hue: 176 },
  { name: 'Northwind UAV', legal: 'Northwind UAV Solutions (Pvt.) Ltd.', code: 'NWUAV', type: 'private_limited', hue: 208 },
];

export const ORG_TYPE_LABEL: Record<OrganizationType, string> = {
  private_limited: 'Private Limited',
  public_limited: 'Public Limited',
  multinational: 'Multinational',
  government: 'Government / Public Sector',
  ngo: 'Non-Profit / NGO',
  sole_proprietor: 'Sole Proprietor',
  partnership: 'Partnership',
};

/* ------------------------------------------------------------------ people */

export const FIRST_NAMES = [
  'Ahmed', 'Bilal', 'Faisal', 'Hamza', 'Imran', 'Junaid', 'Kamran', 'Moiz',
  'Nadeem', 'Omar', 'Qasim', 'Rizwan', 'Saad', 'Talha', 'Usman', 'Yasir',
  'Zain', 'Adnan', 'Danish', 'Farhan', 'Haris', 'Shahzad', 'Waleed', 'Osama',
  'Ayesha', 'Bushra', 'Fatima', 'Hina', 'Iqra', 'Javeria', 'Komal', 'Laiba',
  'Maria', 'Nimra', 'Rabia', 'Sana', 'Uzma', 'Zara', 'Areeba', 'Mehwish',
  'Noor', 'Sadia', 'Anum', 'Hafsa', 'Sundas', 'Mahnoor',
];

export const LAST_NAMES = [
  'Khan', 'Ahmed', 'Malik', 'Sheikh', 'Raza', 'Iqbal', 'Hussain', 'Siddiqui',
  'Qureshi', 'Butt', 'Chaudhry', 'Farooq', 'Javed', 'Nawaz', 'Rashid', 'Saeed',
  'Tariq', 'Zafar', 'Abbasi', 'Bhatti', 'Durrani', 'Gilani', 'Haider', 'Kiani',
  'Mirza', 'Rehman', 'Shah', 'Yousaf', 'Baig', 'Cheema',
];

export const DESIGNATIONS = [
  'Chief Executive Officer', 'Chief Technology Officer', 'Operations Director',
  'Facilities Lead', 'Finance Controller', 'Office Manager', 'Programme Manager',
  'Head of Engineering', 'Administration Manager', 'Managing Partner',
];

export const VISITOR_COMPANIES = [
  'Pakistan Aeronautical Complex', 'SUPARCO', 'NESCOM', 'Air Weapons Complex',
  'GIDS', 'Interloop Ltd.', 'Systems Limited', 'NetSol Technologies',
  'Descon Engineering', 'National University of Sciences & Technology',
  'Air University', 'HITEC University', 'PTCL', 'Jazz', 'Zong',
  'Turkish Aerospace', 'Leonardo S.p.A.', 'Thales Group',
];

export const VISITOR_PURPOSES = [
  'Business meeting', 'Vendor demonstration', 'Contract discussion',
  'Technical audit', 'Equipment maintenance', 'Interview', 'Site survey',
  'Partnership briefing', 'Compliance inspection', 'Training session',
  'Deliverable handover', 'Investor visit',
];

/* -------------------------------------------------------------- buildings */

export interface BuildingSeed {
  id: string;
  name: string;
  code: string;
  address: string;
  floors: Array<{ name: string; level: number; netLeasableSqft: number }>;
}

/**
 * The physical park. "Delta" is the two-floor block referenced in the brief
 * (a main meter per floor, tenants on sub-meters). The taller towers host the
 * bulk of the roster.
 */
export const BUILDING_SEEDS: BuildingSeed[] = [
  {
    id: 'delta',
    name: 'Delta Block',
    code: 'DLT',
    address: 'NASTP Delta, Old Airport Road, Islamabad',
    floors: [
      { name: 'Ground Floor', level: 0, netLeasableSqft: 22000 },
      { name: 'First Floor', level: 1, netLeasableSqft: 22000 },
    ],
  },
  {
    id: 'aviation',
    name: 'Aviation Tower',
    code: 'AVT',
    address: 'NASTP Aviation Tower, Sector I, Islamabad',
    floors: [
      { name: 'Ground Floor', level: 0, netLeasableSqft: 18000 },
      { name: 'First Floor', level: 1, netLeasableSqft: 18000 },
      { name: 'Second Floor', level: 2, netLeasableSqft: 18000 },
      { name: 'Third Floor', level: 3, netLeasableSqft: 18000 },
      { name: 'Fourth Floor', level: 4, netLeasableSqft: 16000 },
    ],
  },
  {
    id: 'ignite',
    name: 'Ignite Block',
    code: 'IGN',
    address: 'NASTP Ignite Innovation Block, Islamabad',
    floors: [
      { name: 'Ground Floor', level: 0, netLeasableSqft: 15000 },
      { name: 'First Floor', level: 1, netLeasableSqft: 15000 },
      { name: 'Second Floor', level: 2, netLeasableSqft: 15000 },
    ],
  },
];

/* --------------------------------------------------- service center meta */

export const SERVICE_CATEGORY_LABEL: Record<string, string> = {
  electrical: 'Electrical',
  hvac: 'HVAC',
  lighting: 'Lighting',
  plumbing: 'Plumbing',
  internet: 'Internet',
  cleaning: 'Cleaning',
  security: 'Security',
  access_control: 'Access Control',
  elevator: 'Elevator',
  fire_safety: 'Fire & Safety',
  parking: 'Parking',
  building_maintenance: 'Building Maintenance',
  other: 'Other',
};

export const SERVICE_TITLES: Array<{ category: string; title: string }> = [
  { category: 'hvac', title: 'AC not cooling in conference room' },
  { category: 'hvac', title: 'Uneven temperature across the floor' },
  { category: 'electrical', title: 'Frequent tripping on workstation circuit' },
  { category: 'electrical', title: 'Power socket sparking near reception' },
  { category: 'lighting', title: 'Flickering lights in the east wing' },
  { category: 'lighting', title: 'Emergency light not illuminating' },
  { category: 'plumbing', title: 'Leaking tap in the pantry' },
  { category: 'internet', title: 'Intermittent connectivity in lab area' },
  { category: 'cleaning', title: 'Additional cleaning requested after event' },
  { category: 'access_control', title: 'Access card not working at side door' },
  { category: 'elevator', title: 'Lift making unusual noise on descent' },
  { category: 'fire_safety', title: 'Smoke detector beeping intermittently' },
  { category: 'parking', title: 'Reserved parking bay occupied by another vehicle' },
  { category: 'building_maintenance', title: 'Ceiling tile damaged by water seepage' },
  { category: 'security', title: 'Request CCTV footage for incident review' },
];

/* --------------------------------------------------------- meter models */

export const METER_MODELS = [
  'Schneider PM5560', 'Siemens PAC4200', 'ABB M4M', 'Socomec Diris A40',
  'Schneider PM2230', 'Lovato DMG900',
];
