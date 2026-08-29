# SmartQueue - Full-Stack Digital Queue Management System

SmartQueue is a production-ready, full-stack digital queue management platform built for **hospitals, banks, and citizen service centers**. It replaces chaotic physical waiting lines with digital tokens, real-time queue position tracking, counter assignment routing, and instant notification chimes.

---

## 🌟 Key Features

- 🎟️ **Digital Token Generation**: Instant token generation with automated service prefix codes (`A101`, `B101`, `C101`, `D101`).
- ⏱️ **Live Position & Wait-Time Estimation**: Real-time computation of queue depth, people ahead, and expected wait time based on average service handling duration.
- ⚡ **Redis Fast Active Queue & Concurrency Lock**: High-speed queue states with atomic mutex locks on "Call Next" operations to eliminate race conditions between multiple service counters.
- 📡 **Real-Time Server-Sent Events (SSE)**: Instant bi-directional broadcast of queue advancement, counter calls, and customer notifications.
- 🏢 **Multi-Organization & Multi-Sector Support**: Pre-configured support for **Hospitals** (Consultations, Cardiology, Pharmacy, Labs), **Banks** (Tellers, Loans, Accounts), and **Service Centers** (Verification, Permits).
- 🖥️ **Staff Counter Operations**: Interactive desk console with session stopwatch, Call Next, Start Serving, Complete, Skip, and Recall capabilities.
- 📊 **Executive Admin & Analytics Dashboard**: Real-time multi-queue board, trend charts, volume by service, counter assignment, and CSV history audit export.
- 🔔 **Multi-Channel In-App Alerts**: Audio chime and floating alert banner when a customer's token is called.

---

## 🏗️ Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS, React Router, Recharts, Lucide Icons |
| **Backend** | Node.js, Express.js, TypeScript, REST API Architecture |
| **Database** | PostgreSQL Relational Schema (`/database/schema.sql`) |
| **Fast Cache** | Redis Queue Mutex & Active State Engine |
| **Realtime** | Server-Sent Events (SSE) Stream at `/api/realtime/events` |
| **Authentication**| JWT (JSON Web Tokens) with bcrypt password hashing |
| **Containerization**| Docker & Docker Compose (`docker-compose.yml`) |

---

## 📋 Implementation Stages (All 14 Stages Completed)

- [x] **Stage 1: Frontend & Backend Foundation** - Express + React Vite unified architecture, routes, context, and types.
- [x] **Stage 2: PostgreSQL Database Schema** - Full DDL schema in `/database/schema.sql` with tables for users, organizations, services, counters, queues, tokens, notifications, and history.
- [x] **Stage 3: Authentication & Security** - JWT-based auth, password hashing, role-based access control (`ADMIN`, `STAFF`, `CUSTOMER`), and 1-click demo accounts.
- [x] **Stage 4: Organizations & Services Management** - Multi-tenant structure supporting hospitals, banks, and citizen hubs with customizable handling durations.
- [x] **Stage 5: Queue & Token Generation Engine** - Atomic sequence generator, real-time wait estimation, and customer queue tracking.
- [x] **Stage 6: Staff Queue Management** - Counter operator desk with Call Next, Serving, Complete, Skip, and Recall actions.
- [x] **Stage 7: Redis Cache & Concurrency Lock** - High-speed queue cache and mutex lock preventing duplicate token calls across multiple tellers.
- [x] **Stage 8: Real-Time Updates** - SSE live stream syncing dashboards immediately upon any queue advancement.
- [x] **Stage 9: Customer Dashboard & Live Tracker** - 3-step venue/service selector, active token tracker card, and past visit history.
- [x] **Stage 10: Admin Dashboard & Analytics** - Recharts analytics, live multi-queue board, CRUD tables for venues/services/desks.
- [x] **Stage 11: Notification System** - Audio chime and banner notifications for "Token Called" and "You Are Next in Line".
- [x] **Stage 12: Docker Containerization** - Multi-stage `Dockerfile` and `docker-compose.yml` orchestrating App, PostgreSQL, and Redis.
- [x] **Stage 13: Testing & Concurrency Hardening** - Rigorous validation, verified TypeScript types, and linter check.
- [x] **Stage 14: Documentation & Deployment** - Complete API specification and setup manual.

---

## 🚀 Getting Started

### 1. Local Development

```bash
# Install dependencies
npm install

# Start development server on port 3000
npm run dev
```

Visit `http://localhost:3000` in your browser.

### 2. Running with Docker Compose

```bash
# Start full stack: SmartQueue app + PostgreSQL + Redis
docker-compose up --build
```

---

## 🔑 Demo Accounts

Use the **1-Click Demo Switcher** in the top navigation bar or log in with:

| Role | Email | Password | Access |
|---|---|---|---|
| **Admin** | `admin@smartqueue.com` | `admin123` | Full analytics, CRUD organizations, services, and counters |
| **Staff** | `staff@smartqueue.com` | `staff123` | Counter operator desk, Call Next, Start, Complete, Skip |
| **Customer** | `customer@smartqueue.com` | `customer123` | Generate tokens, live position tracker, visit history |

---

## 📡 REST API Documentation

### Authentication
- `POST /api/auth/register` - Create new user account.
- `POST /api/auth/login` - Authenticate user and receive JWT.
- `GET /api/auth/me` - Get authenticated user profile.
- `POST /api/auth/demo-switch` - 1-Click role switcher for demo testing.

### Organizations & Services
- `GET /api/organizations` - List all organizations and venues.
- `POST /api/organizations` - Create new organization *(Admin)*.
- `PUT /api/organizations/:id` - Update organization *(Admin)*.
- `DELETE /api/organizations/:id` - Remove organization *(Admin)*.
- `GET /api/services` - List services by organization.
- `POST /api/services` - Add service queue with code prefix & avg handling time *(Admin)*.

### Queues & Digital Tokens
- `GET /api/queues` - Multi-queue live status board.
- `GET /api/queues/:serviceId/status` - Live queue depth and waiting customer list.
- `POST /api/queues/join` - Generate digital token (Join queue).
- `GET /api/tokens/:idOrNumber` - Look up token by ID or number (e.g. `A105`).
- `POST /api/tokens/:id/cancel` - Cancel active token.
- `GET /api/customer/tokens` - Active and past tokens for current user.

### Staff Counter Desk
- `POST /api/staff/queue/next` - Atomic "Call Next" with Redis mutex lock.
- `POST /api/staff/tokens/:id/start` - Mark token as SERVING and begin stopwatch.
- `POST /api/staff/tokens/:id/complete` - Mark COMPLETED and record audit history.
- `POST /api/staff/tokens/:id/skip` - Skip absent customer.
- `POST /api/staff/tokens/:id/recall` - Recall customer back to counter.
- `POST /api/staff/counter/status` - Toggle counter state (`ACTIVE`, `PAUSED`, `OFFLINE`).

### Admin & Analytics
- `GET /api/admin/dashboard` - High-level metrics and KPIs.
- `GET /api/admin/statistics` - Weekly volume trend, service category distribution.
- `GET /api/admin/history` - Comprehensive audit log history.

### Realtime SSE
- `GET /api/realtime/events` - Server-Sent Events stream for live queue broadcasts.

---

## 📄 License
MIT License - Built for high-efficiency digital queue orchestration.
