# PrepAgent AI — Phase 1 & Phase 2

## Agentic AI Interview Preparation Platform Foundation

PrepAgent AI is an agentic AI-powered interview preparation platform. This repository contains the complete implementation for **Phase 1 (Project Foundation)** and **Phase 2 (Preparation Session Management)**.

---

## 🏗 Architecture Overview

```text
PrepAgent AI
├── backend/                  # Node.js + Express + MongoDB (MERN / MVC)
│   ├── src/
│   │   ├── config/           # MongoDB connection with Mongoose
│   │   ├── controllers/      # Auth, User, and Preparation controllers
│   │   ├── middleware/       # JWT auth, error handler, Multer resume uploads
│   │   ├── models/           # User, Resume, and PreparationSession
│   │   ├── routes/           # REST API routes
│   │   ├── utils/            # JWT token generator
│   │   ├── app.js            # Express app configuration & middleware
│   │   └── server.js         # Single entry point
│   ├── test_suite.js         # Automated end-to-end test suite
│   ├── package.json
│   └── .env.example
│
├── frontend/                 # React 18 + Vite + Tailwind CSS
│   ├── src/
│   │   ├── components/       # Reusable UI system (Royal Blue + Indigo theme)
│   │   │   ├── common/       # Button, Input, PasswordInput, Select, Textarea, Card, Modal, etc.
│   │   │   ├── navigation/   # Navbar, Sidebar (Desktop & Mobile Drawer)
│   │   │   ├── preparation/  # FileUploader, ResumeSelector, PreparationCard
│   │   │   └── ProtectedRoute.jsx
│   │   ├── context/          # AuthContext (first-time vs returning flow), ToastContext
│   │   ├── layouts/          # DashboardLayout
│   │   ├── pages/            # Landing, Login, Signup, Dashboard, PreparationSetup, Details, Profile
│   │   ├── services/         # Axios API clients
│   │   └── routes/           # AppRoutes
│   └── package.json
```

---

## 🚀 Quick Start

### 1. Backend Setup

```bash
cd backend
npm install
# Ensure MongoDB is running locally (e.g. mongodb://127.0.0.1:27017/prepagent)
npm start
```

Backend will run on: `http://localhost:5000`

### 2. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Frontend will run on: `http://localhost:5173`

---

## 🧪 Testing

Run the automated test suites against the backend:

```bash
# Phase 1 & 2 Test Suite (29 assertions)
npm run test:backend

# Phase 3 Resume Analysis Agent & Understanding Map Test Suite (36 assertions)
npm run test:phase3

# Run all test suites
npm run test:all
```

All 65 assertions across both test suites will execute, verifying:
- Registration & Bcrypt password hashing
- Login & JWT persistence
- First-time user detection (0 sessions -> `/preparation/setup`)
- Compulsory 5-point setup validation
- Resume upload & resume reuse
- Multi-session isolation (NVIDIA vs Microsoft)
- Strict multi-tenant security (Access Denied for unauthorized users)
- Resume text extraction (PDF / DOCX)
- Resume Analysis Agent extraction & schema normalization
- Negative hallucination constraints (no fake skills/companies)
- AI Resume Understanding Map (explicit tech-to-project relationships)
- Caching and explicit re-analysis (`force: true`)
- Strict phase separation (no fake skill gaps or JD comparisons)

