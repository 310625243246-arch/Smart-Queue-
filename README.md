# 🏥 Smart Queue Management System

A modern **Digital Queue Management System** designed for hospitals, banks, and service centers to provide real-time queue tracking, digital tokens, waiting-time estimation, and efficient queue management.

## 🚀 Live Demo

👉 **[Open Smart Queue](https://ais-dev-3r4svd7axo7gw6t2y3qgqj-462897489933.asia-southeast1.run.app)**

## 📌 GitHub Repository

👉 **[View Source Code](https://github.com/310625243246-arch/Smart-Queue-)**

---

## 📖 Problem Statement

Customers at hospitals, banks, and service centers often have no visibility into:

- Current queue status
- Number of people waiting
- Estimated waiting time
- Current serving token
- Service progress

This project provides a digital solution that allows customers and staff to monitor and manage queues efficiently.

---

## 🎯 Project Objective

The main objective of Smart Queue is to provide:

- Digital queue/token generation
- Real-time queue status
- Estimated waiting time
- People-ahead information
- Staff queue management
- Service-specific queues
- Digital display monitoring
- Role-based access
- Efficient queue operations

---

## ✨ Features

### 👤 Customer

Customers can:

- Select a facility
- Select a service
- Join a queue
- Receive a digital queue number
- View people ahead
- View estimated waiting time
- View the currently serving number
- View assigned counter
- Track queue status
- Leave the queue

### 👨‍💼 Staff

Staff members can:

- View the active queue
- View currently serving customers
- Call the next customer
- Complete a customer
- Skip a customer
- Manage counter status
- Monitor queue progress
- Track service operations

### 🛡️ Admin

Administrators can:

- Monitor overall queue activity
- View queue statistics
- Monitor live queues
- Manage staff
- Manage counters
- Manage services
- View analytics
- Configure system settings
- View audit logs
- Monitor multiple facilities

---

## 🏥 Service-Based Queue Management

Smart Queue is designed so that different services can maintain their own independent queues.

### Example

```text
Hospital
│
├── General Consultation
│   ├── Q01
│   ├── Q02
│   └── Q03
│
├── Pharmacy
│   ├── P01
│   ├── P02
│   └── P03
│
├── Laboratory
│   ├── L01
│   ├── L02
│   └── L03
│
└── Billing
    ├── B01
    ├── B02
    └── B03

Each service can have its own:

Queue number
Waiting customers
Current serving customer
People ahead
Estimated waiting time
Counter assignment
Queue status

This prevents unrelated services from being mixed into one common queue.

📺 Digital Display Board

The system includes a live display screen for monitoring queue activity.

The display can show:

Current serving number
Queue status
Service information
Counter information
Waiting customers
Real-time queue updates

This can be used on a monitor or TV at a hospital, bank, or service center.

🔐 Role-Based Access

The application separates functionality based on user roles.

Role	Main Function
Customer	Join and track queue
Staff	Manage service queue
Admin	Manage and monitor system
Customer
Customer → Select Service → Join Queue → Track Token
Staff
Staff → View Queue → Call Next → Serve → Complete/Skip
Admin
Admin → Dashboard → Monitor → Manage → Analyze
🛠️ Technology Stack
Frontend
React
TypeScript
Vite
Lucide React
Backend
Node.js
Express.js
TypeScript
REST API
Development & Deployment
Git
GitHub
Docker
Cloud Deployment
🏗️ System Architecture
                ┌───────────────────┐
                │     Customer      │
                └─────────┬─────────┘
                          │
                          ▼
                ┌───────────────────┐
                │  React Frontend   │
                │ TypeScript + Vite │
                └─────────┬─────────┘
                          │
                     REST API
                          │
                          ▼
                ┌───────────────────┐
                │  Express Backend  │
                │   Node.js + TS    │
                └─────────┬─────────┘
                          │
             ┌────────────┼────────────┐
             ▼            ▼            ▼
        Queue Logic    Authentication   Services
             │
             ▼
       Queue Management
             │
      ┌──────┴──────┐
      ▼             ▼
   Staff         Display
🔄 Application Flow
Step 1 – Customer Selects Service

The customer selects the required facility and service.

Step 2 – Customer Joins Queue

The system generates a digital queue number.

Example:

Queue Number: Q05
People Ahead: 3
Estimated Wait: 15 minutes
Step 3 – Staff Manages Queue

Staff can:

Call Next
    ↓
Serve Customer
    ↓
Complete / Skip
    ↓
Call Next Customer
Step 4 – Queue Updates

The customer can monitor:

Current serving number
Position in queue
People ahead
Estimated waiting time
Counter
Current status
Step 5 – Completion

After service completion, the queue moves to the next waiting customer.

📊 Queue Status

The system supports different queue states:

WAITING
   ↓
CALLED
   ↓
SERVING
   ↓
COMPLETED

A customer can also be:

WAITING → SKIPPED
📁 Project Structure
Smart-Queue/
│
├── frontend/
│   ├── src/
│   ├── components/
│   ├── pages/
│   └── ...
│
├── backend/
│   ├── src/
│   ├── routes/
│   ├── controllers/
│   └── ...
│
├── package.json
├── README.md
└── ...
⚙️ Installation
1. Clone the Repository
git clone https://github.com/310625243246-arch/Smart-Queue-.git
2. Open the Project
cd Smart-Queue-
3. Install Dependencies

Install the required dependencies for the frontend and backend.

npm install

If the project contains separate frontend and backend folders:

cd frontend
npm install

and:

cd ../backend
npm install
4. Run the Application

Start the frontend and backend according to the project configuration.

🧪 Testing

The application can be tested using the following user flows:

Customer Flow
Login
 ↓
Select Facility
 ↓
Select Service
 ↓
Join Queue
 ↓
Receive Token
 ↓
Track Queue
 ↓
Leave Queue / Complete Service
Staff Flow
Login
 ↓
Open Staff Queue
 ↓
Call Next
 ↓
Serve Customer
 ↓
Complete / Skip
Admin Flow
Login
 ↓
Open Dashboard
 ↓
Monitor Queues
 ↓
Manage Services
 ↓
Manage Staff/Counters
 ↓
View Analytics
 ↓
View Audit Logs
🌐 Deployment

The project is deployed and accessible online.

Live Application

👉 https://ais-dev-3r4svd7axo7gw6t2y3qgqj-462897489933.asia-southeast1.run.app

Source Code

👉 https://github.com/310625243246-arch/Smart-Queue-

🎯 Key Benefits
Reduces physical waiting
Provides digital queue tokens
Improves queue visibility
Shows estimated waiting time
Helps staff manage queues efficiently
Separates queues by service
Provides real-time queue information
Improves customer experience
Supports centralized administration
🔮 Future Enhancements

Possible future improvements include:

SMS notifications
WhatsApp notifications
Email notifications
QR-code based queue joining
Mobile application
PostgreSQL database integration
Redis-based real-time queue processing
Advanced analytics
Multi-hospital support
Appointment integration
Cloud-based monitoring
👩‍💻 Author

Vidhya V

Computer Science / Software Development Student

🔗 Project Links
🌐 Live Demo
💻 GitHub Repository
⭐ Support

If you find this project useful, consider giving the repository a ⭐ on GitHub.

🚀 Smart Queue

Digital tokens. Real-time queue tracking. Better service management.
