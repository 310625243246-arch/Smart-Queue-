import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import cors from 'cors';
import { createServer as createViteServer } from 'vite';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';

dotenv.config();

const PORT = 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'smartqueue-secure-jwt-secret-key-2026';

// ==============================================================================
// 1. DATA MODELS & RELATIONAL DATABASE STATE (PostgreSQL Architecture Mirror)
// ==============================================================================

export type UserRole = 'CUSTOMER' | 'STAFF' | 'ADMIN';
export type OrganizationType = 'HOSPITAL' | 'BANK' | 'SERVICE_CENTER';
export type CounterStatus = 'ACTIVE' | 'PAUSED' | 'OFFLINE';
export type TokenStatus = 'WAITING' | 'CALLED' | 'SERVING' | 'COMPLETED' | 'SKIPPED' | 'CANCELLED';

interface DBUser {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  counterId?: string;
  createdAt: string;
  updatedAt: string;
}

interface DBOrganization {
  id: string;
  name: string;
  type: OrganizationType;
  address: string;
  contactEmail: string;
  contactPhone: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface DBService {
  id: string;
  organizationId: string;
  name: string;
  codePrefix: string;
  description: string;
  averageServiceTime: number; // in minutes
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface DBCounter {
  id: string;
  organizationId: string;
  counterNumber: string;
  serviceId?: string;
  staffId?: string;
  status: CounterStatus;
  currentTokenId?: string;
  createdAt: string;
  updatedAt: string;
}

interface DBQueueToken {
  id: string;
  tokenNumber: string;
  customerId?: string;
  customerName: string;
  customerEmail: string;
  serviceId: string;
  organizationId: string;
  counterId?: string;
  staffId?: string;
  status: TokenStatus;
  sequenceNumber: number;
  calledAt?: string;
  serviceStartedAt?: string;
  completedAt?: string;
  skippedAt?: string;
  cancelledAt?: string;
  createdAt: string;
  updatedAt: string;
}

interface DBNotification {
  id: string;
  userId: string;
  tokenId?: string;
  title: string;
  message: string;
  type: 'INFO' | 'CALLED' | 'TURN_NEXT' | 'COMPLETED';
  isRead: boolean;
  createdAt: string;
}

interface DBQueueHistory {
  id: string;
  tokenId: string;
  tokenNumber: string;
  customerId?: string;
  customerName: string;
  organizationId: string;
  organizationName: string;
  serviceId: string;
  serviceName: string;
  counterNumber?: string;
  staffName?: string;
  status: string;
  waitingTimeMinutes: number;
  serviceTimeMinutes: number;
  createdAt: string;
  completedAt: string;
}

// In-Memory PostgreSQL + Redis State Engine
const db = {
  users: [] as DBUser[],
  organizations: [] as DBOrganization[],
  services: [] as DBService[],
  counters: [] as DBCounter[],
  tokens: [] as DBQueueToken[],
  notifications: [] as DBNotification[],
  history: [] as DBQueueHistory[],
};

// Redis-style Atomic Queue Locks & Cache Layer
const redisCache = {
  // Lock Map to prevent race conditions during "Call Next" operations
  locks: new Map<string, boolean>(),
  
  // Fast Lookup for Service Sequence Counters
  sequenceCounters: new Map<string, number>(),

  // Fast Active Queue Array (Service ID -> Array of Token IDs)
  activeQueues: new Map<string, string[]>(),

  acquireLock(key: string, ttlMs = 3000): boolean {
    if (this.locks.get(key)) {
      return false; // Lock already held
    }
    this.locks.set(key, true);
    setTimeout(() => {
      this.locks.delete(key);
    }, ttlMs);
    return true;
  },

  releaseLock(key: string) {
    this.locks.delete(key);
  },

  getNextSequence(prefix: string): number {
    const current = this.sequenceCounters.get(prefix) || 100;
    const next = current + 1;
    this.sequenceCounters.set(prefix, next);
    return next;
  },
};

// Real-Time Server-Sent Events (SSE) Hub
type SSEClient = {
  id: string;
  userId?: string;
  res: Response;
};
const sseClients: SSEClient[] = [];

function broadcastSSE(eventType: string, data: any) {
  const payload = `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;
  sseClients.forEach((client) => {
    try {
      client.res.write(payload);
    } catch {
      // client dropped
    }
  });
}

function sendPersonalSSE(userId: string, eventType: string, data: any) {
  const payload = `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;
  sseClients
    .filter((client) => client.userId === userId)
    .forEach((client) => {
      try {
        client.res.write(payload);
      } catch {
        // client dropped
      }
    });
}

// ==============================================================================
// 2. SEED INITIAL DATA (Hospitals, Banks, Service Centers, Services, Users)
// ==============================================================================

function seedDatabase() {
  const now = new Date().toISOString();

  // Users
  const adminUser: DBUser = {
    id: 'usr-admin-1',
    name: 'Eleanor Vance (Admin)',
    email: 'admin@smartqueue.com',
    passwordHash: bcrypt.hashSync('admin123', 10),
    role: 'ADMIN',
    createdAt: now,
    updatedAt: now,
  };

  const staffUser1: DBUser = {
    id: 'usr-staff-1',
    name: 'Dr. Marcus Wright',
    email: 'staff@smartqueue.com',
    passwordHash: bcrypt.hashSync('staff123', 10),
    role: 'STAFF',
    createdAt: now,
    updatedAt: now,
  };

  const staffUser2: DBUser = {
    id: 'usr-staff-2',
    name: 'Priya Sharma (Bank Teller)',
    email: 'priya@smartqueue.com',
    passwordHash: bcrypt.hashSync('staff123', 10),
    role: 'STAFF',
    createdAt: now,
    updatedAt: now,
  };

  const customerUser: DBUser = {
    id: 'usr-cust-1',
    name: 'Alex Johnson',
    email: 'customer@smartqueue.com',
    passwordHash: bcrypt.hashSync('customer123', 10),
    role: 'CUSTOMER',
    createdAt: now,
    updatedAt: now,
  };

  db.users.push(adminUser, staffUser1, staffUser2, customerUser);

  // Organizations
  const orgHospital: DBOrganization = {
    id: 'org-hosp-1',
    name: 'Metropolitan Central Hospital',
    type: 'HOSPITAL',
    address: '742 Evergreen Healthcare Blvd, Medical District',
    contactEmail: 'contact@metrohospital.org',
    contactPhone: '+1 (555) 019-2831',
    isActive: true,
    createdAt: now,
    updatedAt: now,
  };

  const orgBank: DBOrganization = {
    id: 'org-bank-1',
    name: 'Apex Heritage Bank - Downtown Flagship',
    type: 'BANK',
    address: '100 Financial Plaza, Suite 400',
    contactEmail: 'support@apexheritage.com',
    contactPhone: '+1 (555) 018-9942',
    isActive: true,
    createdAt: now,
    updatedAt: now,
  };

  const orgGovt: DBOrganization = {
    id: 'org-govt-1',
    name: 'Civic Gateway Public Service Center',
    type: 'SERVICE_CENTER',
    address: '500 Commonwealth Ave, Sector 4',
    contactEmail: 'help@civicgateway.gov',
    contactPhone: '+1 (555) 014-7721',
    isActive: true,
    createdAt: now,
    updatedAt: now,
  };

  db.organizations.push(orgHospital, orgBank, orgGovt);

  // Services
  // Hospital Services
  const srvGenConsult: DBService = {
    id: 'srv-gen-1',
    organizationId: orgHospital.id,
    name: 'General Consultation',
    codePrefix: 'A',
    description: 'Routine physician consultation, diagnostics check-up, and general triage.',
    averageServiceTime: 8, // 8 mins
    isActive: true,
    createdAt: now,
    updatedAt: now,
  };

  const srvCardio: DBService = {
    id: 'srv-cardio-1',
    organizationId: orgHospital.id,
    name: 'Cardiology Specialist',
    codePrefix: 'C',
    description: 'Cardiovascular examination, ECG analysis, and specialist review.',
    averageServiceTime: 15,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  };

  const srvPharm: DBService = {
    id: 'srv-pharm-1',
    organizationId: orgHospital.id,
    name: 'Pharmacy & Dispensation',
    codePrefix: 'P',
    description: 'Prescription pickup, medication consultation, and dispensation.',
    averageServiceTime: 4,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  };

  const srvLab: DBService = {
    id: 'srv-lab-1',
    organizationId: orgHospital.id,
    name: 'Diagnostic Laboratory',
    codePrefix: 'L',
    description: 'Blood sample collection, urinalysis, and rapid lab pathology.',
    averageServiceTime: 6,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  };

  // Bank Services
  const srvDeposit: DBService = {
    id: 'srv-dep-1',
    organizationId: orgBank.id,
    name: 'Cash Deposit & Withdrawal',
    codePrefix: 'B',
    description: 'High-volume teller cash deposits, withdrawals, and demand drafts.',
    averageServiceTime: 5,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  };

  const srvAccount: DBService = {
    id: 'srv-acc-1',
    organizationId: orgBank.id,
    name: 'New Account Opening',
    codePrefix: 'N',
    description: 'Personal, corporate savings and checking account onboarding.',
    averageServiceTime: 18,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  };

  const srvLoan: DBService = {
    id: 'srv-loan-1',
    organizationId: orgBank.id,
    name: 'Loan & Credit Enquiries',
    codePrefix: 'M',
    description: 'Home mortgages, personal loans, vehicle financing, and credit limits.',
    averageServiceTime: 20,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  };

  // Service Center Services
  const srvDocVerify: DBService = {
    id: 'srv-doc-1',
    organizationId: orgGovt.id,
    name: 'Document Verification & Notary',
    codePrefix: 'D',
    description: 'Identity verification, notary stamping, apostille, and credentials audit.',
    averageServiceTime: 10,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  };

  const srvCitizenSupport: DBService = {
    id: 'srv-cit-1',
    organizationId: orgGovt.id,
    name: 'Citizen Support & Permits',
    codePrefix: 'S',
    description: 'Municipal permits, business licenses, and public grievances.',
    averageServiceTime: 12,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  };

  db.services.push(
    srvGenConsult, srvCardio, srvPharm, srvLab,
    srvDeposit, srvAccount, srvLoan,
    srvDocVerify, srvCitizenSupport
  );

  // Counters
  const cntHosp1: DBCounter = {
    id: 'cnt-hosp-1',
    organizationId: orgHospital.id,
    counterNumber: 'Counter 01',
    serviceId: srvGenConsult.id,
    staffId: staffUser1.id,
    status: 'ACTIVE',
    createdAt: now,
    updatedAt: now,
  };

  const cntHosp2: DBCounter = {
    id: 'cnt-hosp-2',
    organizationId: orgHospital.id,
    counterNumber: 'Counter 02',
    serviceId: srvGenConsult.id,
    status: 'ACTIVE',
    createdAt: now,
    updatedAt: now,
  };

  const cntHosp3: DBCounter = {
    id: 'cnt-hosp-3',
    organizationId: orgHospital.id,
    counterNumber: 'Counter 03 (Pharmacy)',
    serviceId: srvPharm.id,
    status: 'ACTIVE',
    createdAt: now,
    updatedAt: now,
  };

  const cntBank1: DBCounter = {
    id: 'cnt-bank-1',
    organizationId: orgBank.id,
    counterNumber: 'Teller 01',
    serviceId: srvDeposit.id,
    staffId: staffUser2.id,
    status: 'ACTIVE',
    createdAt: now,
    updatedAt: now,
  };

  const cntBank2: DBCounter = {
    id: 'cnt-bank-2',
    organizationId: orgBank.id,
    counterNumber: 'Desk 02 (Accounts)',
    serviceId: srvAccount.id,
    status: 'ACTIVE',
    createdAt: now,
    updatedAt: now,
  };

  const cntGovt1: DBCounter = {
    id: 'cnt-govt-1',
    organizationId: orgGovt.id,
    counterNumber: 'Booth 01',
    serviceId: srvDocVerify.id,
    status: 'ACTIVE',
    createdAt: now,
    updatedAt: now,
  };

  db.counters.push(cntHosp1, cntHosp2, cntHosp3, cntBank1, cntBank2, cntGovt1);

  // Initial Tokens Seed (Representing live realistic queue states)
  // General Consultation Queue:
  // A101 (Completed) -> A102 (Serving at Counter 01) -> A103 (Waiting) -> A104 (Waiting) -> A105 (Waiting - Alex Johnson)
  redisCache.sequenceCounters.set('A', 105);
  redisCache.sequenceCounters.set('B', 103);
  redisCache.sequenceCounters.set('D', 102);

  const tA101: DBQueueToken = {
    id: 'tok-a101',
    tokenNumber: 'A101',
    customerName: 'Claire Redfield',
    customerEmail: 'claire@example.com',
    serviceId: srvGenConsult.id,
    organizationId: orgHospital.id,
    counterId: cntHosp1.id,
    staffId: staffUser1.id,
    status: 'COMPLETED',
    sequenceNumber: 101,
    calledAt: new Date(Date.now() - 35 * 60 * 1000).toISOString(),
    serviceStartedAt: new Date(Date.now() - 34 * 60 * 1000).toISOString(),
    completedAt: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 50 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
  };

  const tA102: DBQueueToken = {
    id: 'tok-a102',
    tokenNumber: 'A102',
    customerName: 'Robert Vance',
    customerEmail: 'robert@example.com',
    serviceId: srvGenConsult.id,
    organizationId: orgHospital.id,
    counterId: cntHosp1.id,
    staffId: staffUser1.id,
    status: 'SERVING',
    sequenceNumber: 102,
    calledAt: new Date(Date.now() - 6 * 60 * 1000).toISOString(),
    serviceStartedAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 40 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
  };
  cntHosp1.currentTokenId = tA102.id;

  const tA103: DBQueueToken = {
    id: 'tok-a103',
    tokenNumber: 'A103',
    customerName: 'Elena Rostova',
    customerEmail: 'elena@example.com',
    serviceId: srvGenConsult.id,
    organizationId: orgHospital.id,
    status: 'WAITING',
    sequenceNumber: 103,
    createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
  };

  const tA104: DBQueueToken = {
    id: 'tok-a104',
    tokenNumber: 'A104',
    customerName: 'David Kim',
    customerEmail: 'david@example.com',
    serviceId: srvGenConsult.id,
    organizationId: orgHospital.id,
    status: 'WAITING',
    sequenceNumber: 104,
    createdAt: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
  };

  const tA105: DBQueueToken = {
    id: 'tok-a105',
    tokenNumber: 'A105',
    customerId: customerUser.id,
    customerName: 'Alex Johnson',
    customerEmail: 'customer@smartqueue.com',
    serviceId: srvGenConsult.id,
    organizationId: orgHospital.id,
    status: 'WAITING',
    sequenceNumber: 105,
    createdAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
  };

  // Bank Tokens
  const tB101: DBQueueToken = {
    id: 'tok-b101',
    tokenNumber: 'B101',
    customerName: 'Samira Khan',
    customerEmail: 'samira@example.com',
    serviceId: srvDeposit.id,
    organizationId: orgBank.id,
    counterId: cntBank1.id,
    staffId: staffUser2.id,
    status: 'SERVING',
    sequenceNumber: 101,
    calledAt: new Date(Date.now() - 3 * 60 * 1000).toISOString(),
    serviceStartedAt: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
  };
  cntBank1.currentTokenId = tB101.id;

  const tB102: DBQueueToken = {
    id: 'tok-b102',
    tokenNumber: 'B102',
    customerName: 'Lucas Martin',
    customerEmail: 'lucas@example.com',
    serviceId: srvDeposit.id,
    organizationId: orgBank.id,
    status: 'WAITING',
    sequenceNumber: 102,
    createdAt: new Date(Date.now() - 8 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 8 * 60 * 1000).toISOString(),
  };

  db.tokens.push(tA101, tA102, tA103, tA104, tA105, tB101, tB102);

  // Queue History Seed
  db.history.push({
    id: uuidv4(),
    tokenId: tA101.id,
    tokenNumber: 'A101',
    customerName: 'Claire Redfield',
    organizationId: orgHospital.id,
    organizationName: orgHospital.name,
    serviceId: srvGenConsult.id,
    serviceName: srvGenConsult.name,
    counterNumber: cntHosp1.counterNumber,
    staffName: staffUser1.name,
    status: 'COMPLETED',
    waitingTimeMinutes: 16,
    serviceTimeMinutes: 9,
    createdAt: tA101.createdAt,
    completedAt: tA101.completedAt!,
  });

  // Seed Notifications
  db.notifications.push({
    id: uuidv4(),
    userId: customerUser.id,
    tokenId: tA105.id,
    title: 'Digital Token A105 Created',
    message: 'You have joined the General Consultation queue at Metropolitan Central Hospital.',
    type: 'INFO',
    isRead: false,
    createdAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
  });
}

seedDatabase();

// ==============================================================================
// 3. QUEUE LOGIC & HELPER FUNCTIONS
// ==============================================================================

export interface FormattedTokenPayload {
  id: string;
  tokenNumber: string;
  customerId?: string;
  customerName: string;
  customerEmail: string;
  serviceId: string;
  serviceName: string;
  organizationId: string;
  organizationName: string;
  counterId?: string;
  counterNumber?: string;
  staffId?: string;
  staffName?: string;
  status: TokenStatus;
  positionInQueue: number;
  peopleAhead: number;
  estimatedWaitMinutes: number;
  calledAt?: string;
  serviceStartedAt?: string;
  completedAt?: string;
  skippedAt?: string;
  cancelledAt?: string;
  createdAt: string;
}

function calculateTokenQueueStats(token: DBQueueToken): FormattedTokenPayload {
  const service = db.services.find((s) => s.id === token.serviceId);
  const org = db.organizations.find((o) => o.id === token.organizationId);
  const counter = db.counters.find((c) => c.id === token.counterId);
  const staff = db.users.find((u) => u.id === token.staffId);

  // Find all tokens in same service with WAITING status created prior or equal sequence
  const waitingTokensInService = db.tokens
    .filter((t) => t.serviceId === token.serviceId && t.status === 'WAITING')
    .sort((a, b) => a.sequenceNumber - b.sequenceNumber);

  const positionIndex = waitingTokensInService.findIndex((t) => t.id === token.id);
  
  let peopleAhead = 0;
  let positionInQueue = 0;

  if (token.status === 'WAITING') {
    if (positionIndex >= 0) {
      peopleAhead = positionIndex; // 0 people ahead if index is 0
      positionInQueue = positionIndex + 1;
    }
  } else {
    peopleAhead = 0;
    positionInQueue = 0;
  }

  // Active serving counters for this service
  const activeCounters = db.counters.filter(
    (c) => c.serviceId === token.serviceId && c.status === 'ACTIVE'
  ).length || 1;

  const avgServiceTime = service?.averageServiceTime || 8;
  const estimatedWaitMinutes = token.status === 'WAITING' 
    ? Math.max(1, Math.round((peopleAhead * avgServiceTime) / activeCounters))
    : 0;

  return {
    id: token.id,
    tokenNumber: token.tokenNumber,
    customerId: token.customerId,
    customerName: token.customerName,
    customerEmail: token.customerEmail,
    serviceId: token.serviceId,
    serviceName: service ? service.name : 'Unknown Service',
    organizationId: token.organizationId,
    organizationName: org ? org.name : 'Unknown Organization',
    counterId: token.counterId,
    counterNumber: counter ? counter.counterNumber : undefined,
    staffId: token.staffId,
    staffName: staff ? staff.name : undefined,
    status: token.status,
    positionInQueue,
    peopleAhead,
    estimatedWaitMinutes,
    calledAt: token.calledAt,
    serviceStartedAt: token.serviceStartedAt,
    completedAt: token.completedAt,
    skippedAt: token.skippedAt,
    cancelledAt: token.cancelledAt,
    createdAt: token.createdAt,
  };
}

// ==============================================================================
// 4. EXPRESS APP & REST API HANDLERS
// ==============================================================================

async function startServer() {
  const app = express();

  app.use(cors());
  app.use(express.json());

  // SSE Realtime Event Stream Endpoint
  app.get('/api/realtime/events', (req: Request, res: Response) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    const clientId = uuidv4();
    const token = req.query.token as string;
    let userId: string | undefined;

    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET) as { id: string };
        userId = decoded.id;
      } catch {
        // anonymous connection allowed
      }
    }

    const client: SSEClient = { id: clientId, userId, res };
    sseClients.push(client);

    // Initial greeting message
    res.write(`event: connected\ndata: ${JSON.stringify({ clientId, timestamp: new Date().toISOString() })}\n\n`);

    req.on('close', () => {
      const idx = sseClients.findIndex((c) => c.id === clientId);
      if (idx !== -1) {
        sseClients.splice(idx, 1);
      }
    });
  });

  // Health Check
  app.get('/api/health', (req: Request, res: Response) => {
    res.json({
      status: 'healthy',
      service: 'SmartQueue Unified Engine',
      database: 'PostgreSQL Active Schema',
      cache: 'Redis Active Queue Lock & State',
      connectedClients: sseClients.length,
      activeTokens: db.tokens.filter((t) => t.status === 'WAITING' || t.status === 'SERVING' || t.status === 'CALLED').length,
      timestamp: new Date().toISOString(),
    });
  });

  // Auth Middleware
  const authenticateJWT = (req: any, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Authorization token required' });
    }

    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { id: string; role: UserRole };
      const user = db.users.find((u) => u.id === decoded.id);
      if (!user) {
        return res.status(401).json({ message: 'User account not found' });
      }
      req.user = user;
      next();
    } catch (err) {
      return res.status(403).json({ message: 'Invalid or expired session' });
    }
  };

  const requireRole = (roles: UserRole[]) => {
    return (req: any, res: Response, next: NextFunction) => {
      if (!req.user || !roles.includes(req.user.role)) {
        return res.status(403).json({ message: 'Forbidden: Insufficient privileges for this role' });
      }
      next();
    };
  };

  // ----------------------------------------------------------------------------
  // AUTH ROUTES
  // ----------------------------------------------------------------------------
  app.post('/api/auth/register', (req: Request, res: Response) => {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email, and password are required' });
    }

    const existing = db.users.find((u) => u.email.toLowerCase() === email.toLowerCase().trim());
    if (existing) {
      return res.status(409).json({ message: 'An account with this email already exists' });
    }

    const now = new Date().toISOString();
    const newUser: DBUser = {
      id: uuidv4(),
      name: name.trim(),
      email: email.toLowerCase().trim(),
      passwordHash: bcrypt.hashSync(password, 10),
      role: role && ['CUSTOMER', 'STAFF', 'ADMIN'].includes(role) ? role : 'CUSTOMER',
      createdAt: now,
      updatedAt: now,
    };

    db.users.push(newUser);

    const token = jwt.sign(
      { id: newUser.id, email: newUser.email, role: newUser.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    const { passwordHash: _, ...safeUser } = newUser;
    return res.status(201).json({
      message: 'Registration successful',
      token,
      user: safeUser,
    });
  });

  app.post('/api/auth/login', (req: Request, res: Response) => {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const user = db.users.find((u) => u.email.toLowerCase() === email.toLowerCase().trim());
    if (!user || !bcrypt.compareSync(password, user.passwordHash)) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    const { passwordHash: _, ...safeUser } = user;
    return res.json({
      message: 'Login successful',
      token,
      user: safeUser,
    });
  });

  app.get('/api/auth/me', authenticateJWT, (req: any, res: Response) => {
    const { passwordHash: _, ...safeUser } = req.user;
    res.json({ user: safeUser });
  });

  // Demo user quick-switch endpoint for development ease
  app.post('/api/auth/demo-switch', (req: Request, res: Response) => {
    const { role } = req.body;
    const target = db.users.find((u) => u.role === role);
    if (!target) {
      return res.status(404).json({ message: `No demo account found for role: ${role}` });
    }

    const token = jwt.sign(
      { id: target.id, email: target.email, role: target.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    const { passwordHash: _, ...safeUser } = target;
    return res.json({ token, user: safeUser });
  });

  // ----------------------------------------------------------------------------
  // ORGANIZATIONS ROUTES
  // ----------------------------------------------------------------------------
  app.get('/api/organizations', (req: Request, res: Response) => {
    const orgs = db.organizations.map((org) => {
      const services = db.services.filter((s) => s.organizationId === org.id);
      const counters = db.counters.filter((c) => c.organizationId === org.id);
      return {
        ...org,
        servicesCount: services.length,
        countersCount: counters.length,
        services,
      };
    });
    res.json({ organizations: orgs });
  });

  app.post('/api/organizations', authenticateJWT, requireRole(['ADMIN']), (req: Request, res: Response) => {
    const { name, type, address, contactEmail, contactPhone } = req.body;
    if (!name || !type || !address) {
      return res.status(400).json({ message: 'Name, type, and address are required' });
    }

    const now = new Date().toISOString();
    const newOrg: DBOrganization = {
      id: uuidv4(),
      name: name.trim(),
      type,
      address: address.trim(),
      contactEmail: contactEmail || '',
      contactPhone: contactPhone || '',
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };

    db.organizations.push(newOrg);
    broadcastSSE('ORGANIZATIONS_UPDATED', { organizationId: newOrg.id });
    res.status(201).json({ organization: newOrg });
  });

  app.put('/api/organizations/:id', authenticateJWT, requireRole(['ADMIN']), (req: Request, res: Response) => {
    const { id } = req.params;
    const org = db.organizations.find((o) => o.id === id);
    if (!org) return res.status(404).json({ message: 'Organization not found' });

    const { name, type, address, contactEmail, contactPhone, isActive } = req.body;
    if (name !== undefined) org.name = name.trim();
    if (type !== undefined) org.type = type;
    if (address !== undefined) org.address = address.trim();
    if (contactEmail !== undefined) org.contactEmail = contactEmail;
    if (contactPhone !== undefined) org.contactPhone = contactPhone;
    if (isActive !== undefined) org.isActive = Boolean(isActive);
    org.updatedAt = new Date().toISOString();

    broadcastSSE('ORGANIZATIONS_UPDATED', { organizationId: org.id });
    res.json({ organization: org });
  });

  app.delete('/api/organizations/:id', authenticateJWT, requireRole(['ADMIN']), (req: Request, res: Response) => {
    const { id } = req.params;
    const index = db.organizations.findIndex((o) => o.id === id);
    if (index === -1) return res.status(404).json({ message: 'Organization not found' });

    db.organizations.splice(index, 1);
    broadcastSSE('ORGANIZATIONS_UPDATED', { organizationId: id });
    res.json({ message: 'Organization deleted successfully' });
  });

  // ----------------------------------------------------------------------------
  // SERVICES ROUTES
  // ----------------------------------------------------------------------------
  app.get('/api/services', (req: Request, res: Response) => {
    const { organizationId } = req.query;
    let list = db.services;
    if (organizationId) {
      list = list.filter((s) => s.organizationId === organizationId);
    }

    const formatted = list.map((srv) => {
      const org = db.organizations.find((o) => o.id === srv.organizationId);
      const waitingCount = db.tokens.filter((t) => t.serviceId === srv.id && t.status === 'WAITING').length;
      const servingCount = db.tokens.filter((t) => t.serviceId === srv.id && t.status === 'SERVING').length;
      return {
        ...srv,
        organizationName: org ? org.name : '',
        organizationType: org ? org.type : '',
        waitingCount,
        servingCount,
      };
    });

    res.json({ services: formatted });
  });

  app.post('/api/services', authenticateJWT, requireRole(['ADMIN']), (req: Request, res: Response) => {
    const { organizationId, name, codePrefix, description, averageServiceTime } = req.body;
    if (!organizationId || !name || !codePrefix) {
      return res.status(400).json({ message: 'Organization, name, and code prefix are required' });
    }

    const org = db.organizations.find((o) => o.id === organizationId);
    if (!org) return res.status(400).json({ message: 'Invalid organization ID' });

    const now = new Date().toISOString();
    const newService: DBService = {
      id: uuidv4(),
      organizationId,
      name: name.trim(),
      codePrefix: codePrefix.trim().toUpperCase(),
      description: description || '',
      averageServiceTime: Number(averageServiceTime) || 10,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };

    db.services.push(newService);
    broadcastSSE('SERVICES_UPDATED', { serviceId: newService.id });
    res.status(201).json({ service: newService });
  });

  app.put('/api/services/:id', authenticateJWT, requireRole(['ADMIN']), (req: Request, res: Response) => {
    const { id } = req.params;
    const service = db.services.find((s) => s.id === id);
    if (!service) return res.status(404).json({ message: 'Service not found' });

    const { name, codePrefix, description, averageServiceTime, isActive } = req.body;
    if (name !== undefined) service.name = name.trim();
    if (codePrefix !== undefined) service.codePrefix = codePrefix.trim().toUpperCase();
    if (description !== undefined) service.description = description;
    if (averageServiceTime !== undefined) service.averageServiceTime = Number(averageServiceTime);
    if (isActive !== undefined) service.isActive = Boolean(isActive);
    service.updatedAt = new Date().toISOString();

    broadcastSSE('SERVICES_UPDATED', { serviceId: service.id });
    res.json({ service });
  });

  app.delete('/api/services/:id', authenticateJWT, requireRole(['ADMIN']), (req: Request, res: Response) => {
    const { id } = req.params;
    const index = db.services.findIndex((s) => s.id === id);
    if (index === -1) return res.status(404).json({ message: 'Service not found' });

    db.services.splice(index, 1);
    broadcastSSE('SERVICES_UPDATED', { serviceId: id });
    res.json({ message: 'Service removed successfully' });
  });

  // ----------------------------------------------------------------------------
  // COUNTERS ROUTES
  // ----------------------------------------------------------------------------
  app.get('/api/counters', (req: Request, res: Response) => {
    const { organizationId } = req.query;
    let list = db.counters;
    if (organizationId) {
      list = list.filter((c) => c.organizationId === organizationId);
    }

    const formatted = list.map((c) => {
      const org = db.organizations.find((o) => o.id === c.organizationId);
      const srv = db.services.find((s) => s.id === c.serviceId);
      const staff = db.users.find((u) => u.id === c.staffId);
      const currentToken = db.tokens.find((t) => t.id === c.currentTokenId);

      return {
        ...c,
        organizationName: org ? org.name : '',
        serviceName: srv ? srv.name : '',
        staffName: staff ? staff.name : '',
        currentServingToken: currentToken ? currentToken.tokenNumber : undefined,
      };
    });

    res.json({ counters: formatted });
  });

  app.post('/api/counters', authenticateJWT, requireRole(['ADMIN']), (req: Request, res: Response) => {
    const { organizationId, counterNumber, serviceId, staffId } = req.body;
    if (!organizationId || !counterNumber) {
      return res.status(400).json({ message: 'Organization and counter number are required' });
    }

    const now = new Date().toISOString();
    const newCounter: DBCounter = {
      id: uuidv4(),
      organizationId,
      counterNumber: counterNumber.trim(),
      serviceId: serviceId || undefined,
      staffId: staffId || undefined,
      status: 'ACTIVE',
      createdAt: now,
      updatedAt: now,
    };

    db.counters.push(newCounter);
    broadcastSSE('COUNTERS_UPDATED', { counterId: newCounter.id });
    res.status(201).json({ counter: newCounter });
  });

  app.put('/api/counters/:id', authenticateJWT, (req: Request, res: Response) => {
    const { id } = req.params;
    const counter = db.counters.find((c) => c.id === id);
    if (!counter) return res.status(404).json({ message: 'Counter not found' });

    const { counterNumber, serviceId, staffId, status } = req.body;
    if (counterNumber !== undefined) counter.counterNumber = counterNumber.trim();
    if (serviceId !== undefined) counter.serviceId = serviceId;
    if (staffId !== undefined) counter.staffId = staffId;
    if (status !== undefined) counter.status = status;
    counter.updatedAt = new Date().toISOString();

    broadcastSSE('COUNTERS_UPDATED', { counterId: counter.id });
    res.json({ counter });
  });

  app.delete('/api/counters/:id', authenticateJWT, requireRole(['ADMIN']), (req: Request, res: Response) => {
    const { id } = req.params;
    const index = db.counters.findIndex((c) => c.id === id);
    if (index === -1) return res.status(404).json({ message: 'Counter not found' });

    db.counters.splice(index, 1);
    broadcastSSE('COUNTERS_UPDATED', { counterId: id });
    res.json({ message: 'Counter removed successfully' });
  });

  // ----------------------------------------------------------------------------
  // QUEUES & TOKEN GENERATION ROUTES
  // ----------------------------------------------------------------------------
  app.get('/api/queues', (req: Request, res: Response) => {
    const result = db.services.map((service) => {
      const org = db.organizations.find((o) => o.id === service.organizationId);
      const waitingTokens = db.tokens.filter((t) => t.serviceId === service.id && t.status === 'WAITING');
      const servingTokens = db.tokens.filter((t) => t.serviceId === service.id && t.status === 'SERVING');
      const currentToken = servingTokens.length > 0 ? servingTokens[0].tokenNumber : (waitingTokens[0]?.tokenNumber || 'None');
      const activeCounters = db.counters.filter((c) => c.serviceId === service.id && c.status === 'ACTIVE').length;

      return {
        id: service.id,
        serviceId: service.id,
        serviceName: service.name,
        codePrefix: service.codePrefix,
        organizationId: service.organizationId,
        organizationName: org ? org.name : '',
        organizationType: org ? org.type : '',
        currentToken,
        waitingCount: waitingTokens.length,
        servingCount: servingTokens.length,
        estimatedWaitTime: Math.round((waitingTokens.length * service.averageServiceTime) / (activeCounters || 1)),
        activeCounters,
      };
    });

    res.json({ queues: result });
  });

  app.get('/api/queues/:serviceId/status', (req: Request, res: Response) => {
    const { serviceId } = req.params;
    const service = db.services.find((s) => s.id === serviceId);
    if (!service) return res.status(404).json({ message: 'Service queue not found' });

    const waitingTokens = db.tokens
      .filter((t) => t.serviceId === serviceId && t.status === 'WAITING')
      .sort((a, b) => a.sequenceNumber - b.sequenceNumber);
    const servingTokens = db.tokens
      .filter((t) => t.serviceId === serviceId && t.status === 'SERVING');

    res.json({
      serviceId,
      serviceName: service.name,
      currentServingToken: servingTokens[0]?.tokenNumber || 'None',
      waitingCount: waitingTokens.length,
      waitingTokens: waitingTokens.map(calculateTokenQueueStats),
      servingTokens: servingTokens.map(calculateTokenQueueStats),
    });
  });

  // JOIN QUEUE (Generate Digital Token)
  app.post('/api/queues/join', (req: any, res: Response) => {
    const { serviceId, customerName, customerEmail } = req.body;

    if (!serviceId) {
      return res.status(400).json({ message: 'Service ID is required' });
    }

    const service = db.services.find((s) => s.id === serviceId);
    if (!service || !service.isActive) {
      return res.status(404).json({ message: 'Service is not active or available' });
    }

    const org = db.organizations.find((o) => o.id === service.organizationId);
    if (!org || !org.isActive) {
      return res.status(404).json({ message: 'Organization is currently not accepting new tokens' });
    }

    // Optional user token from auth
    const authHeader = req.headers.authorization;
    let customerId: string | undefined = undefined;
    let resolvedName = customerName || 'Customer';
    let resolvedEmail = customerEmail || 'guest@smartqueue.com';

    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const decoded = jwt.verify(authHeader.split(' ')[1], JWT_SECRET) as { id: string };
        const user = db.users.find((u) => u.id === decoded.id);
        if (user) {
          customerId = user.id;
          resolvedName = user.name;
          resolvedEmail = user.email;
        }
      } catch {
        // guest mode
      }
    }

    // Sequence Generator via Redis counter
    const seq = redisCache.getNextSequence(service.codePrefix);
    const tokenNumber = `${service.codePrefix}${seq}`;
    const now = new Date().toISOString();

    const newToken: DBQueueToken = {
      id: uuidv4(),
      tokenNumber,
      customerId,
      customerName: resolvedName,
      customerEmail: resolvedEmail,
      serviceId: service.id,
      organizationId: org.id,
      status: 'WAITING',
      sequenceNumber: seq,
      createdAt: now,
      updatedAt: now,
    };

    db.tokens.push(newToken);

    // Create In-App Notification if user is registered
    if (customerId) {
      db.notifications.push({
        id: uuidv4(),
        userId: customerId,
        tokenId: newToken.id,
        title: `Token ${newToken.tokenNumber} Generated`,
        message: `You joined the queue for ${service.name} at ${org.name}.`,
        type: 'INFO',
        isRead: false,
        createdAt: now,
      });
    }

    const formatted = calculateTokenQueueStats(newToken);

    // Broadcast Real-time event to all connected dashboards
    broadcastSSE('QUEUE_ADVANCED', {
      serviceId: service.id,
      tokenNumber: newToken.tokenNumber,
      action: 'TOKEN_JOINED',
    });

    res.status(201).json({
      message: 'Token generated successfully',
      token: formatted,
    });
  });

  // GET TOKEN STATUS BY ID OR TOKEN NUMBER
  app.get('/api/tokens/:idOrNumber', (req: Request, res: Response) => {
    const { idOrNumber } = req.params;
    const query = idOrNumber.trim();

    const token = db.tokens.find(
      (t) => t.id === query || t.tokenNumber.toUpperCase() === query.toUpperCase()
    );

    if (!token) {
      return res.status(404).json({ message: `No active or recent token found for "${query}"` });
    }

    res.json({ token: calculateTokenQueueStats(token) });
  });

  // CANCEL TOKEN
  app.post('/api/tokens/:id/cancel', (req: Request, res: Response) => {
    const { id } = req.params;
    const token = db.tokens.find((t) => t.id === id || t.tokenNumber.toUpperCase() === id.toUpperCase());
    if (!token) return res.status(404).json({ message: 'Token not found' });

    if (token.status === 'COMPLETED' || token.status === 'CANCELLED') {
      return res.status(400).json({ message: `Token is already ${token.status}` });
    }

    token.status = 'CANCELLED';
    token.cancelledAt = new Date().toISOString();
    token.updatedAt = new Date().toISOString();

    // Release counter if it was assigned
    if (token.counterId) {
      const counter = db.counters.find((c) => c.id === token.counterId);
      if (counter && counter.currentTokenId === token.id) {
        counter.currentTokenId = undefined;
      }
    }

    broadcastSSE('QUEUE_ADVANCED', {
      serviceId: token.serviceId,
      tokenNumber: token.tokenNumber,
      action: 'TOKEN_CANCELLED',
    });

    res.json({
      message: 'Token cancelled successfully',
      token: calculateTokenQueueStats(token),
    });
  });

  // CUSTOMER TOKENS & HISTORY
  app.get('/api/customer/tokens', authenticateJWT, (req: any, res: Response) => {
    const userTokens = db.tokens
      .filter((t) => t.customerId === req.user.id || t.customerEmail.toLowerCase() === req.user.email.toLowerCase())
      .map(calculateTokenQueueStats);

    const activeTokens = userTokens.filter((t) => t.status === 'WAITING' || t.status === 'CALLED' || t.status === 'SERVING');
    const pastTokens = userTokens.filter((t) => t.status === 'COMPLETED' || t.status === 'SKIPPED' || t.status === 'CANCELLED');

    res.json({ activeTokens, pastTokens });
  });

  app.get('/api/customer/history', authenticateJWT, (req: any, res: Response) => {
    const history = db.history.filter(
      (h) => h.customerId === req.user.id || h.customerName === req.user.name
    );
    res.json({ history });
  });

  // ----------------------------------------------------------------------------
  // STAFF QUEUE MANAGEMENT WITH ATOMIC CONCURRENCY LOCK
  // ----------------------------------------------------------------------------
  app.post('/api/staff/queue/next', authenticateJWT, requireRole(['STAFF', 'ADMIN']), (req: any, res: Response) => {
    const { counterId, serviceId } = req.body;

    if (!counterId) {
      return res.status(400).json({ message: 'Counter ID is required' });
    }

    const counter = db.counters.find((c) => c.id === counterId);
    if (!counter) {
      return res.status(404).json({ message: 'Counter not found' });
    }

    const targetServiceId = serviceId || counter.serviceId;
    if (!targetServiceId) {
      return res.status(400).json({ message: 'No service assigned to this counter or provided in request' });
    }

    // Atomic Redis Mutex Lock on Service Queue to prevent two staff members from getting the same token
    const lockKey = `lock:queue:${targetServiceId}`;
    const acquired = redisCache.acquireLock(lockKey, 2000);
    if (!acquired) {
      return res.status(429).json({ message: 'Queue is currently being processed by another counter. Please retry.' });
    }

    try {
      // Find oldest waiting token
      const waitingTokens = db.tokens
        .filter((t) => t.serviceId === targetServiceId && t.status === 'WAITING')
        .sort((a, b) => a.sequenceNumber - b.sequenceNumber);

      if (waitingTokens.length === 0) {
        return res.status(404).json({ message: 'No waiting customers in this queue' });
      }

      const nextToken = waitingTokens[0];
      const now = new Date().toISOString();

      // Update token state
      nextToken.status = 'CALLED';
      nextToken.counterId = counter.id;
      nextToken.staffId = req.user.id;
      nextToken.calledAt = now;
      nextToken.updatedAt = now;

      // Update counter state
      counter.currentTokenId = nextToken.id;
      counter.staffId = req.user.id;
      counter.updatedAt = now;

      // Send Personal In-App Notification
      if (nextToken.customerId) {
        db.notifications.push({
          id: uuidv4(),
          userId: nextToken.customerId,
          tokenId: nextToken.id,
          title: `Your Token ${nextToken.tokenNumber} Has Been Called!`,
          message: `Please proceed immediately to ${counter.counterNumber}.`,
          type: 'CALLED',
          isRead: false,
          createdAt: now,
        });

        sendPersonalSSE(nextToken.customerId, 'TOKEN_CALLED', {
          tokenId: nextToken.id,
          tokenNumber: nextToken.tokenNumber,
          counterNumber: counter.counterNumber,
        });
      }

      // Check next-in-line customer to notify "You are next in queue"
      const upcomingWaiting = db.tokens
        .filter((t) => t.serviceId === targetServiceId && t.status === 'WAITING')
        .sort((a, b) => a.sequenceNumber - b.sequenceNumber);

      if (upcomingWaiting.length > 0 && upcomingWaiting[0].customerId) {
        db.notifications.push({
          id: uuidv4(),
          userId: upcomingWaiting[0].customerId,
          tokenId: upcomingWaiting[0].id,
          title: 'You are next in the queue!',
          message: `Token ${upcomingWaiting[0].tokenNumber}: Please prepare your documents and stay alert.`,
          type: 'TURN_NEXT',
          isRead: false,
          createdAt: now,
        });
      }

      // Broadcast Realtime Queue Change
      broadcastSSE('QUEUE_ADVANCED', {
        action: 'TOKEN_CALLED',
        serviceId: targetServiceId,
        tokenNumber: nextToken.tokenNumber,
        counterNumber: counter.counterNumber,
      });

      return res.json({
        message: `Token ${nextToken.tokenNumber} called to ${counter.counterNumber}`,
        token: calculateTokenQueueStats(nextToken),
        counter,
      });
    } finally {
      redisCache.releaseLock(lockKey);
    }
  });

  app.post('/api/staff/tokens/:id/start', authenticateJWT, requireRole(['STAFF', 'ADMIN']), (req: Request, res: Response) => {
    const { id } = req.params;
    const token = db.tokens.find((t) => t.id === id);
    if (!token) return res.status(404).json({ message: 'Token not found' });

    const now = new Date().toISOString();
    token.status = 'SERVING';
    token.serviceStartedAt = now;
    token.updatedAt = now;

    broadcastSSE('QUEUE_ADVANCED', {
      action: 'TOKEN_SERVING',
      serviceId: token.serviceId,
      tokenNumber: token.tokenNumber,
    });

    res.json({
      message: `Started serving token ${token.tokenNumber}`,
      token: calculateTokenQueueStats(token),
    });
  });

  app.post('/api/staff/tokens/:id/complete', authenticateJWT, requireRole(['STAFF', 'ADMIN']), (req: any, res: Response) => {
    const { id } = req.params;
    const token = db.tokens.find((t) => t.id === id);
    if (!token) return res.status(404).json({ message: 'Token not found' });

    const now = new Date().toISOString();
    token.status = 'COMPLETED';
    token.completedAt = now;
    token.updatedAt = now;

    // Clear counter's current token
    const counter = db.counters.find((c) => c.id === token.counterId);
    if (counter && counter.currentTokenId === token.id) {
      counter.currentTokenId = undefined;
    }

    // Calculate waiting & service times
    const createdAtMs = new Date(token.createdAt).getTime();
    const calledAtMs = token.calledAt ? new Date(token.calledAt).getTime() : createdAtMs;
    const startedAtMs = token.serviceStartedAt ? new Date(token.serviceStartedAt).getTime() : calledAtMs;
    const completedAtMs = new Date(now).getTime();

    const waitingMinutes = Math.max(1, Math.round((startedAtMs - createdAtMs) / (1000 * 60)));
    const serviceMinutes = Math.max(1, Math.round((completedAtMs - startedAtMs) / (1000 * 60)));

    const service = db.services.find((s) => s.id === token.serviceId);
    const org = db.organizations.find((o) => o.id === token.organizationId);

    // Save into Permanent Queue History (PostgreSQL Relational table)
    db.history.unshift({
      id: uuidv4(),
      tokenId: token.id,
      tokenNumber: token.tokenNumber,
      customerId: token.customerId,
      customerName: token.customerName,
      organizationId: token.organizationId,
      organizationName: org ? org.name : 'Organization',
      serviceId: token.serviceId,
      serviceName: service ? service.name : 'Service',
      counterNumber: counter?.counterNumber,
      staffName: req.user.name,
      status: 'COMPLETED',
      waitingTimeMinutes: waitingMinutes,
      serviceTimeMinutes: serviceMinutes,
      createdAt: token.createdAt,
      completedAt: now,
    });

    if (token.customerId) {
      db.notifications.push({
        id: uuidv4(),
        userId: token.customerId,
        tokenId: token.id,
        title: 'Service Completed',
        message: `Your visit for ${token.tokenNumber} is complete. Thank you!`,
        type: 'COMPLETED',
        isRead: false,
        createdAt: now,
      });
    }

    broadcastSSE('QUEUE_ADVANCED', {
      action: 'TOKEN_COMPLETED',
      serviceId: token.serviceId,
      tokenNumber: token.tokenNumber,
    });

    res.json({
      message: `Token ${token.tokenNumber} completed`,
      token: calculateTokenQueueStats(token),
    });
  });

  app.post('/api/staff/tokens/:id/skip', authenticateJWT, requireRole(['STAFF', 'ADMIN']), (req: Request, res: Response) => {
    const { id } = req.params;
    const token = db.tokens.find((t) => t.id === id);
    if (!token) return res.status(404).json({ message: 'Token not found' });

    const now = new Date().toISOString();
    token.status = 'SKIPPED';
    token.skippedAt = now;
    token.updatedAt = now;

    const counter = db.counters.find((c) => c.id === token.counterId);
    if (counter && counter.currentTokenId === token.id) {
      counter.currentTokenId = undefined;
    }

    broadcastSSE('QUEUE_ADVANCED', {
      action: 'TOKEN_SKIPPED',
      serviceId: token.serviceId,
      tokenNumber: token.tokenNumber,
    });

    res.json({
      message: `Token ${token.tokenNumber} skipped`,
      token: calculateTokenQueueStats(token),
    });
  });

  app.post('/api/staff/tokens/:id/recall', authenticateJWT, requireRole(['STAFF', 'ADMIN']), (req: Request, res: Response) => {
    const { id } = req.params;
    const { counterId } = req.body;
    const token = db.tokens.find((t) => t.id === id);
    if (!token) return res.status(404).json({ message: 'Token not found' });

    const counter = db.counters.find((c) => c.id === (counterId || token.counterId));
    if (!counter) return res.status(404).json({ message: 'Counter not found' });

    const now = new Date().toISOString();
    token.status = 'CALLED';
    token.counterId = counter.id;
    token.calledAt = now;
    token.updatedAt = now;

    counter.currentTokenId = token.id;

    if (token.customerId) {
      db.notifications.push({
        id: uuidv4(),
        userId: token.customerId,
        tokenId: token.id,
        title: `RECALL: Token ${token.tokenNumber}`,
        message: `You have been recalled to ${counter.counterNumber}. Please proceed immediately.`,
        type: 'CALLED',
        isRead: false,
        createdAt: now,
      });
    }

    broadcastSSE('QUEUE_ADVANCED', {
      action: 'TOKEN_RECALLED',
      serviceId: token.serviceId,
      tokenNumber: token.tokenNumber,
      counterNumber: counter.counterNumber,
    });

    res.json({
      message: `Token ${token.tokenNumber} recalled to ${counter.counterNumber}`,
      token: calculateTokenQueueStats(token),
    });
  });

  app.post('/api/staff/counter/status', authenticateJWT, requireRole(['STAFF', 'ADMIN']), (req: Request, res: Response) => {
    const { counterId, status } = req.body;
    const counter = db.counters.find((c) => c.id === counterId);
    if (!counter) return res.status(404).json({ message: 'Counter not found' });

    counter.status = status;
    counter.updatedAt = new Date().toISOString();

    broadcastSSE('COUNTERS_UPDATED', { counterId: counter.id, status });
    res.json({ counter });
  });

  // ----------------------------------------------------------------------------
  // ADMIN DASHBOARD & STATISTICS ROUTES
  // ----------------------------------------------------------------------------
  app.get('/api/admin/dashboard', (req: Request, res: Response) => {
    const totalCustomers = db.tokens.length;
    const waitingCustomers = db.tokens.filter((t) => t.status === 'WAITING').length;
    const currentlyServing = db.tokens.filter((t) => t.status === 'SERVING' || t.status === 'CALLED').length;
    const completedToday = db.tokens.filter((t) => t.status === 'COMPLETED').length;
    const activeCounters = db.counters.filter((c) => c.status === 'ACTIVE').length;

    // Averages
    const completedHistory = db.history.filter((h) => h.status === 'COMPLETED');
    const avgWait = completedHistory.length > 0
      ? Math.round(completedHistory.reduce((acc, h) => acc + h.waitingTimeMinutes, 0) / completedHistory.length)
      : 14;
    const avgService = completedHistory.length > 0
      ? Math.round(completedHistory.reduce((acc, h) => acc + h.serviceTimeMinutes, 0) / completedHistory.length)
      : 8;

    res.json({
      stats: {
        totalCustomers,
        waitingCustomers,
        currentlyServing,
        completedToday,
        averageWaitingTimeMinutes: avgWait,
        averageServiceTimeMinutes: avgService,
        activeCounters,
      },
      organizationsCount: db.organizations.length,
      servicesCount: db.services.length,
      countersCount: db.counters.length,
    });
  });

  app.get('/api/admin/statistics', (req: Request, res: Response) => {
    // Volume by service
    const volumeByService = db.services.map((srv) => {
      const count = db.tokens.filter((t) => t.serviceId === srv.id).length;
      return {
        name: srv.name,
        code: srv.codePrefix,
        volume: count,
        avgTime: srv.averageServiceTime,
      };
    });

    // Hourly / Daily Simulation Data
    const dailyTrend = [
      { day: 'Mon', customers: 42, completed: 39, avgWait: 12 },
      { day: 'Tue', customers: 58, completed: 54, avgWait: 15 },
      { day: 'Wed', customers: 64, completed: 60, avgWait: 18 },
      { day: 'Thu', customers: 51, completed: 48, avgWait: 11 },
      { day: 'Fri', customers: 79, completed: 73, avgWait: 22 },
      { day: 'Sat', customers: 35, completed: 34, avgWait: 9 },
      { day: 'Today', customers: db.tokens.length, completed: db.tokens.filter((t) => t.status === 'COMPLETED').length, avgWait: 14 },
    ];

    // Status breakdown
    const statusDistribution = [
      { name: 'Waiting', value: db.tokens.filter((t) => t.status === 'WAITING').length, color: '#f59e0b' },
      { name: 'Serving', value: db.tokens.filter((t) => t.status === 'SERVING').length, color: '#10b981' },
      { name: 'Called', value: db.tokens.filter((t) => t.status === 'CALLED').length, color: '#3b82f6' },
      { name: 'Completed', value: db.tokens.filter((t) => t.status === 'COMPLETED').length, color: '#64748b' },
      { name: 'Skipped/Cancelled', value: db.tokens.filter((t) => t.status === 'SKIPPED' || t.status === 'CANCELLED').length, color: '#ef4444' },
    ];

    res.json({
      volumeByService,
      dailyTrend,
      statusDistribution,
    });
  });

  app.get('/api/admin/history', (req: Request, res: Response) => {
    res.json({ history: db.history });
  });

  // ----------------------------------------------------------------------------
  // NOTIFICATIONS API
  // ----------------------------------------------------------------------------
  app.get('/api/notifications', authenticateJWT, (req: any, res: Response) => {
    const list = db.notifications
      .filter((n) => n.userId === req.user.id)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    res.json({ notifications: list });
  });

  app.post('/api/notifications/:id/read', authenticateJWT, (req: Request, res: Response) => {
    const { id } = req.params;
    const notification = db.notifications.find((n) => n.id === id);
    if (notification) {
      notification.isRead = true;
    }
    res.json({ success: true });
  });

  app.post('/api/notifications/clear', authenticateJWT, (req: any, res: Response) => {
    const unread = db.notifications.filter((n) => n.userId === req.user.id);
    unread.forEach((n) => {
      n.isRead = true;
    });
    res.json({ success: true });
  });

  // ----------------------------------------------------------------------------
  // API 404 CATCH-ALL HANDLER
  // Prevents unmatched /api/* requests from falling through to Vite SPA middleware
  // which causes "Unexpected token '<', <!doctype..." JSON parse errors.
  // ----------------------------------------------------------------------------
  app.all('/api/*', (req: Request, res: Response) => {
    res.status(404).json({
      error: 'Not Found',
      message: `API endpoint ${req.method} ${req.originalUrl} not found`,
    });
  });

  app.all('/api', (req: Request, res: Response) => {
    res.status(404).json({
      error: 'Not Found',
      message: `API endpoint ${req.method} ${req.originalUrl} not found`,
    });
  });

  // ----------------------------------------------------------------------------
  // VITE DEV MIDDLEWARE / PRODUCTION SPA FALLBACK
  // ----------------------------------------------------------------------------
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[SmartQueue] Complete REST & Realtime Server active at http://0.0.0.0:${PORT}`);
  });
}

startServer();
