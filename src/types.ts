export type UserRole = 'CUSTOMER' | 'STAFF' | 'ADMIN';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  counterId?: string;
  createdAt: string;
}

export type OrganizationType = 'HOSPITAL' | 'BANK' | 'SERVICE_CENTER';

export interface Organization {
  id: string;
  name: string;
  type: OrganizationType;
  address: string;
  contactEmail?: string;
  contactPhone?: string;
  isActive: boolean;
  createdAt: string;
  servicesCount?: number;
}

export interface Service {
  id: string;
  organizationId: string;
  organizationName?: string;
  name: string;
  codePrefix: string; // e.g. "A", "C", "P"
  description: string;
  averageServiceTime: number; // in minutes
  isActive: boolean;
  createdAt: string;
}

export type CounterStatus = 'ACTIVE' | 'PAUSED' | 'OFFLINE';

export interface Counter {
  id: string;
  organizationId: string;
  counterNumber: string;
  serviceId?: string;
  serviceName?: string;
  staffId?: string;
  staffName?: string;
  status: CounterStatus;
  currentServingToken?: string;
  createdAt: string;
}

export type TokenStatus = 
  | 'WAITING' 
  | 'CALLED' 
  | 'SERVING' 
  | 'COMPLETED' 
  | 'SKIPPED' 
  | 'CANCELLED';

export interface QueueToken {
  id: string;
  tokenNumber: string;
  customerId: string;
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
  cancelledAt?: string;
  skippedAt?: string;
  createdAt: string;
}

export interface QueueStats {
  totalCustomers: number;
  waitingCustomers: number;
  currentlyServing: number;
  completedToday: number;
  averageWaitingTimeMinutes: number;
  averageServiceTimeMinutes: number;
  activeCounters: number;
}

export interface AppNotification {
  id: string;
  userId: string;
  tokenId?: string;
  title: string;
  message: string;
  isRead: boolean;
  type: 'INFO' | 'CALLED' | 'TURN_NEXT' | 'COMPLETED';
  createdAt: string;
}
