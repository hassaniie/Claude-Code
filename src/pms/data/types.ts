/**
 * Domain model for the parking plaza.
 *
 * These types mirror what a real Parking Management API would return, so the
 * simulation in `world.ts` can be swapped for HTTP calls without touching a
 * single component. Anything a screen renders is defined here.
 */

export type FloorId = 'ground' | 'first' | 'second' | 'rooftop';

export type SpaceStatus = 'vacant' | 'occupied';

/** Bay classification. The plaza reports only vacant/occupied, but bays still
 *  differ physically — EV chargers, accessible bays, reserved executive slots. */
export type BayClass = 'standard' | 'ev' | 'accessible' | 'reserved';

export type VehicleClass = 'car' | 'motorcycle';

export interface ParkingSpace {
  id: string;
  /** Operator-facing label, e.g. "G-A-014". */
  code: string;
  floorId: FloorId;
  zoneId: string;
  vehicleClass: VehicleClass;
  bayClass: BayClass;
  status: SpaceStatus;
  /** Plate of the occupying vehicle, when occupied. */
  plate?: string;
  /** Epoch ms the current status began — drives dwell time. */
  since: number;
  cameraId: string;
  /** Position inside the camera module: which side of the aisle, and index. */
  side: 'north' | 'south';
  slot: number;
  /** Grid coordinates for the 2D map. */
  row: number;
  col: number;
}

export interface Zone {
  id: string;
  name: string;
  floorId: FloorId;
  vehicleClass: VehicleClass;
  moduleIds: string[];
}

/** A camera module = one camera + the 6 bays it watches (3 per side). */
export interface CameraModule {
  id: string;
  cameraId: string;
  zoneId: string;
  spaceIds: string[];
}

export type CameraHealth = 'online' | 'degraded' | 'offline';

/** Bay cameras derive red/green from coverage; lane cameras run ANPR. */
export type CameraRole = 'bay' | 'lane' | 'perimeter';

export interface Camera {
  id: string;
  name: string;
  floorId: FloorId;
  zoneId: string;
  role: CameraRole;
  health: CameraHealth;
  recording: boolean;
  /** 0-100, disk consumed on the NVR channel. */
  storagePct: number;
  fps: number;
  resolution: string;
  ptz: boolean;
  lastHeartbeat: number;
  /** Bays this camera monitors — always 6 for role 'bay'. */
  spaceIds: string[];
  /** Derived: red when every covered bay is occupied, green otherwise. */
  coverageStatus: 'red' | 'green' | 'unknown';
  occupiedCount: number;
  ipAddress: string;
}

export interface Floor {
  id: FloorId;
  name: string;
  shortName: string;
  level: number;
  zoneIds: string[];
  carCapacity: number;
  motorcycleCapacity: number;
}

export type OwnerType = 'employee' | 'visitor' | 'unknown';

export type PaymentStatus = 'paid' | 'unpaid' | 'subscription' | 'waived';

export interface Vehicle {
  plate: string;
  vehicleClass: VehicleClass;
  make: string;
  colour: string;
  ownerType: OwnerType;
  ownerName: string;
  ownerId?: string;
  department?: string;
  company?: string;
  phone?: string;
  /** Live presence in the plaza. */
  inside: boolean;
  floorId?: FloorId;
  spaceId?: string;
  spaceCode?: string;
  entryTime?: number;
  exitTime?: number;
  paymentStatus: PaymentStatus;
  subscription?: SubscriptionTier;
  /** Simulated ANPR crop; the real API returns a signed snapshot URL. */
  snapshotSeed: number;
  confidence: number;
}

export type SubscriptionTier = 'none' | 'monthly' | 'quarterly' | 'annual';

export type EmployeeStatus = 'active' | 'suspended' | 'inactive';

export interface Employee {
  id: string;
  name: string;
  department: string;
  designation: string;
  email: string;
  phone: string;
  plate: string;
  vehicleClass: VehicleClass;
  subscription: SubscriptionTier;
  subscriptionExpiry?: number;
  status: EmployeeStatus;
  accessLevel: 'standard' | 'executive' | 'contractor';
  photoSeed: number;
}

export type VisitorStatus = 'inside' | 'departed' | 'overstay';

export interface Visitor {
  id: string;
  ticket: string;
  plate: string;
  name: string;
  phone: string;
  company: string;
  purpose: string;
  cnic: string;
  host: string;
  hostDepartment: string;
  vehicleClass: VehicleClass;
  entryTime: number;
  exitTime?: number;
  status: VisitorStatus;
  charges: number;
  paymentStatus: PaymentStatus;
  spaceCode?: string;
  floorId?: FloorId;
}

export type EventType =
  | 'vehicle_entered'
  | 'vehicle_exited'
  | 'visitor_registered'
  | 'payment_completed'
  | 'barrier_opened'
  | 'barrier_closed'
  | 'camera_offline'
  | 'camera_restored'
  | 'recognition_failed'
  | 'floor_full'
  | 'space_occupied'
  | 'space_released'
  | 'emergency_mode'
  | 'operator_action';

export interface ActivityEvent {
  id: string;
  type: EventType;
  ts: number;
  title: string;
  detail: string;
  plate?: string;
  floorId?: FloorId;
  spaceCode?: string;
  cameraId?: string;
  amount?: number;
  actor?: string;
}

export type AlertSeverity = 'critical' | 'warning' | 'info';

export type AlertType =
  | 'occupancy_80'
  | 'parking_full'
  | 'floor_full'
  | 'camera_offline'
  | 'recognition_failed'
  | 'barrier_offline'
  | 'api_failure'
  | 'communication_failure'
  | 'emergency_mode';

export interface Alert {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  message: string;
  ts: number;
  source: string;
  floorId?: FloorId;
  acknowledged: boolean;
  acknowledgedBy?: string;
  resolved: boolean;
}

export type BarrierStatus = 'open' | 'closed' | 'moving' | 'fault';
export type BarrierMode = 'auto' | 'manual' | 'emergency';

export interface Barrier {
  id: string;
  name: string;
  laneId: string;
  direction: 'entry' | 'exit';
  status: BarrierStatus;
  mode: BarrierMode;
  lastAction: string;
  lastActionTs: number;
  lastOperator: string;
  connection: 'healthy' | 'degraded' | 'lost';
  latencyMs: number;
  cyclesToday: number;
  firmware: string;
}

export type RecognitionStatus = 'idle' | 'reading' | 'matched' | 'failed';

export interface QueuedVehicle {
  plate: string;
  arrivedAt: number;
  ownerType: OwnerType;
  vehicleClass: VehicleClass;
  confidence: number;
}

export interface Lane {
  id: string;
  name: string;
  direction: 'entry' | 'exit';
  barrierId: string;
  cameraId: string;
  recognition: RecognitionStatus;
  lastPlate?: string;
  lastPlateTs?: number;
  lastConfidence?: number;
  snapshotSeed: number;
  queue: QueuedVehicle[];
  throughputPerHour: number;
  avgProcessingSec: number;
}

export interface OccupancyPoint {
  /** Bucket label — hour ("14:00"), day ("Mon"), week ("W23") or month. */
  label: string;
  ts: number;
  occupancy: number;
  entries: number;
  exits: number;
  revenue: number;
}

export interface RevenueSnapshot {
  today: number;
  yesterday: number;
  month: number;
  lastMonth: number;
  visitorRevenue: number;
  subscriptionRevenue: number;
  penaltyRevenue: number;
  transactionsToday: number;
  avgTicket: number;
}

export interface FloorStats {
  floorId: FloorId;
  name: string;
  carCapacity: number;
  carOccupied: number;
  motorcycleCapacity: number;
  motorcycleOccupied: number;
  occupancyPct: number;
  available: number;
  trend: number;
  status: 'normal' | 'filling' | 'critical' | 'full';
}

export interface PlazaKpis {
  totalSpaces: number;
  carSpaces: number;
  motorcycleSpaces: number;
  occupied: number;
  available: number;
  occupancyPct: number;
  motorcyclesOccupied: number;
  entriesToday: number;
  exitsToday: number;
  vehiclesInside: number;
  employeesInside: number;
  visitorsInside: number;
  revenueToday: number;
  monthlySubscribers: number;
  failedRecognitions: number;
  activeAlerts: number;
  criticalAlerts: number;
  offlineCameras: number;
  totalCameras: number;
  redCameras: number;
  barriersOpen: number;
  barriersTotal: number;
  avgDwellMs: number;
  peakOccupancyToday: number;
  /** Minutes until projected full at the current fill rate; null when falling. */
  minutesUntilFull: number | null;
  fillRatePerHour: number;
}

/** Connection state for the live API link — surfaced in the top bar. */
export type ConnectionState = 'connected' | 'degraded' | 'reconnecting' | 'offline';

export interface SystemHealth {
  connection: ConnectionState;
  lastSync: number;
  latencyMs: number;
  apiErrors24h: number;
  uptimePct: number;
  nodesOnline: number;
  nodesTotal: number;
}

/** Standard envelope for every async read — screens branch on `status`. */
export interface AsyncResult<T> {
  status: 'idle' | 'loading' | 'success' | 'error';
  data?: T;
  error?: string;
  fetchedAt?: number;
}
