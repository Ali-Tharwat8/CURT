# 🏎️ Cairo University Racing Team (CURT)
### Team Project Management System — Backend Assessment (Season 26-27)

[![Live API](https://img.shields.io/badge/Live_API-curt--silk.vercel.app-brightgreen?style=for-the-badge&logo=vercel)](https://curt-silk.vercel.app/)
[![Health Check](https://img.shields.io/badge/Health_Check-UP-success?style=for-the-badge)](https://curt-silk.vercel.app/api/health)

A modular RESTful backend built for **Cairo University Racing Team (Formula Student / FSAE®)** to coordinate engineering projects, manage subsystem tasks, and enforce strict role-based access control.

* 🌐 **Live Cloud Deployment**: [https://curt-silk.vercel.app](https://curt-silk.vercel.app)
* 🩺 **Health Check**: [`https://curt-silk.vercel.app/api/health`](https://curt-silk.vercel.app/api/health)

---

## 🛠️ Tech Stack

* **Runtime & Framework**: Node.js (v18+) with Express 5 (ES Modules)
* **Language**: TypeScript (Strict mode)
* **Database**: PostgreSQL (Hosted on Supabase with connection pooling)
* **ORM & Query Builder**: Drizzle ORM (`pg-core`)
* **Input Validation**: Zod
* **Authentication**: JWT (Access Token + Refresh Token via HttpOnly cookies)
* **Security & Observability**: Helmet, Morgan, Express-Rate-Limit, bcrypt

---

## 🗄️ Database Design

The schema enforces strict referential integrity. When a project is deleted, its members and tasks cascade automatically (`CASCADE`). If an assigned engineer is removed, the task is preserved (`ON DELETE SET NULL`).

![CURT Relational Database Schema](db/relational_schema_diagram.png)

### 📑 Architectural Design Documents
* 📄 [Relational Database Schema (PDF)](db/relational_schema_diagram.pdf)
* 📄 [Entity-Relationship Diagram (ERD.pdf)](db/ERD.pdf)
* 📄 [Comprehensive API Design Specification](end_points/api-design.md)
* 📄 [Endpoints Specification (PDF)](end_points/end_points.pdf)
* 📄 [CURT Technical Assessment Requirements (task.pdf)](task.pdf)

<details>
<summary><b>Click to view Mermaid ERD Code Representation</b></summary>

```mermaid
erDiagram
    users ||--|| profiles : "1:1 CASCADE"
    users ||--o{ refresh_tokens : "1:N CASCADE"
    users ||--o{ projects : "creates"
    users ||--o{ project_members : "1:N CASCADE"
    users ||--o{ tasks : "assigned to (SET NULL)"
    projects ||--o{ project_members : "1:N CASCADE"
    projects ||--o{ tasks : "groups (CASCADE)"

    users {
        uuid id PK
        varchar username UK
        varchar email UK
        varchar password_hash
        timestamp created_at
    }
    profiles {
        uuid id PK
        uuid user_id FK
        varchar name
        text bio
    }
    refresh_tokens {
        uuid id PK
        uuid user_id FK
        text token UK "SHA-256 Hash"
        timestamp expires_at
    }
    projects {
        uuid id PK
        varchar name
        text description
        uuid created_by FK
        timestamp created_at
    }
    project_members {
        uuid id PK
        uuid project_id FK
        uuid user_id FK
        enum role "owner | member"
    }
    tasks {
        uuid id PK
        uuid project_id FK
        uuid assigned_to FK
        varchar title
        enum priority "Low | Medium | High"
        enum status "To Do | In progress | Done"
        timestamp created_at
    }
```
</details>

---

## 🚀 Quickstart & Local Setup

### 1. Clone & Install
```bash
git clone https://github.com/Ali-Tharwat8/CURT.git
cd CURT/server
npm install
```

### 2. Configure Environment (`.env`)
Create a `.env` file in `/server` (or copy from `.env.example`):
```env
PORT=3000
NODE_ENV=development
DATABASE_URL="postgresql://postgres.[REF]:[PASSWORD]@aws-1-eu-west-1.pooler.supabase.com:5432/postgres"
JWT_ACCESS_SECRET="faster_than_a_ferrari_pitstop_secret_curt_2027"
JWT_REFRESH_SECRET="aerodynamics_are_for_people_who_cant_build_engines_refresh_2027"
```

### 3. Database Push & Seed
```bash
# Push schema to Supabase PostgreSQL
npm run db:push

# Populate database with 10 engineers, 4 projects, 13 memberships, and 16 tasks
npm run db:seed
```
*(To clear all tables back to blank, run `npm run db:clear`)*

### 4. Run Server
```bash
# Development mode with live reload
npm run dev

# Or build & run compiled production bundle
npm run build
npm start
```
API runs on `http://localhost:3000`. Health check: `GET http://localhost:3000/api/health`.

---

## 👥 Seeded Test Credentials

Pre-populated accounts for immediate testing across CURT racing subsystems:

| Username | Email | Subsystem Role | Default Password |
| :--- | :--- | :--- | :--- |
| **`karim_amr`** | `karim@curt.racing` | Aerodynamics Head (**Project Owner**) | `CurtPassword123!` |
| **`nour_tarek`** | `nour@curt.racing` | Vehicle Dynamics Engineer (**Project Member**) | `CurtPassword123!` |
| **`salma_mostafa`**| `salma@curt.racing` | Powertrain Lead (**Outsider to Aero project**) | `CurtPassword123!` |

---

## 🔒 Role-Based Access Control (Level 3 RBAC)

| Action | Project Owner | Assigned Member | Other Project Member | Outsider |
| :--- | :---: | :---: | :---: | :---: |
| **View Project & Tasks** | ✅ `200` | ✅ `200` | ✅ `200` | ❌ `403` |
| **Edit / Delete Project** | ✅ `200` | ❌ `403` | ❌ `403` | ❌ `403` |
| **Add / Remove Members** | ✅ `200` | ❌ `403` | ❌ `403` | ❌ `403` |
| **Create Task** | ✅ `201` | ❌ `403` | ❌ `403` | ❌ `403` |
| **Assign Task to Outsider** | ❌ `400` | ❌ `403` | ❌ `403` | ❌ `403` |
| **Edit / Delete Task** | ✅ `200` | ❌ `403` | ❌ `403` | ❌ `403` |
| **Update Task Status** | ✅ `200` | ✅ `200` | ❌ `403` | ❌ `403` |

* **Assignment Integrity**: Assigning a task to someone outside the project returns `400 Bad Request`.
* **Member Status Updates**: Members can **only** update the status of tasks assigned directly to them.

---

## 🧪 Automated Testing

The suite contains **112 automated test assertions with 100% pass rate**:

```bash
# Custom CLI Test Scripts (Connects to live DB, verifies assertions & cleans up)
npm run test:auth        # 6/6 tests: Register, Login, Me, Refresh, Revocation
npm run test:projects    # 9/9 tests: Project CRUD, Membership guards, Ownership
npm run test:tasks       # 12/12 tests: Task CRUD, Assignment integrity, RBAC status
npm run test:ratelimit   # Live countdown verification & 429 throttle test

# 1-Click Master Postman Collection (44 requests, 87 assertions, 100% pass)
npx newman run postman/00_CURT_Master.postman_collection.json -e postman/CURT_Environment.postman_environment.json

# Or Individual Sub-Collections
npx newman run postman/01_CURT_Auth.postman_collection.json -e postman/CURT_Environment.postman_environment.json
npx newman run postman/02_CURT_Projects.postman_collection.json -e postman/CURT_Environment.postman_environment.json
npx newman run postman/03_CURT_Tasks.postman_collection.json -e postman/CURT_Environment.postman_environment.json
```

---

## 📡 API Endpoints

All responses use a standardized JSON envelope:
* **Success**: `{ success: true, message?: string, data: any, pagination?: object }`
* **Error**: `{ success: false, error: string, message: string, details?: any }`

### Authentication (`/api/auth`)
* `POST /api/auth/register` — Register new user + profile (Rate Limited)
* `POST /api/auth/login` — Authenticate user, receive access token & HttpOnly cookies (Rate Limited)
* `POST /api/auth/refresh` — Issue fresh access token using active refresh token
* `POST /api/auth/logout` — Invalidate session & clear cookies
* `GET  /api/auth/me` — Get authenticated user details (Requires Auth)

### Projects (`/api/projects`)
* `POST   /api/projects` — Create project (Creator becomes `owner`)
* `GET    /api/projects` — List user's projects (supports `?page=&limit=&search=&sortBy=&order=`)
* `GET    /api/projects/:id` — Get project details & team members (Members only)
* `PUT    /api/projects/:id` — Update project metadata (Owner only)
* `DELETE /api/projects/:id` — Delete project & cascade tasks (Owner only)
* `POST   /api/projects/:id/members` — Add member to project (Owner only)
* `DELETE /api/projects/:id/members/:userId` — Remove member (Owner only, cannot remove owner)

### Tasks (`/api/projects/:id/tasks` & `/api/tasks`)
* `POST   /api/projects/:id/tasks` — Create task within project (Owner only, validates assignee)
* `GET    /api/projects/:id/tasks` — List project tasks (supports `?status=&priority=&assignedTo=&search=&page=&limit=`)
* `GET    /api/tasks/:id` — Get single task details (Members only)
* `PUT    /api/tasks/:id` — Update task title, description, priority, assignee (Owner only)
* `PATCH  /api/tasks/:id/status` — Update task status (Owner or Assigned Member only)
* `DELETE /api/tasks/:id` — Delete task (Owner only)

---

## 🛡️ Security Highlights & Design Assumptions

1. **Zero Raw Token Leakage**: Refresh tokens are never returned in JSON bodies. They are delivered exclusively via `HttpOnly`, `SameSite=Lax/Strict` cookies scoped to `/api/auth`.
2. **SHA-256 Storage at Rest**: Refresh tokens are stored in the database as SHA-256 hashes. Database compromise cannot leak valid user sessions.
3. **Sliding-Window Rate Limiting**: Auth routes are protected by `express-rate-limit` using standard IETF Draft-7 headers (`RateLimit-*` and `Retry-After`).
4. **Environment Isolation**: Setting `NODE_ENV=test` automatically silences request logging and bypasses rate limits so automated test suites run without lockouts.
5. **Sanitized Errors**: In production (`NODE_ENV=production`), database errors and internal stack traces are stripped, returning clean, secure error messages.

---

## 👨‍💻 Submission
* **Applicant**: Ali Tharwat
* **Role**: Backend Developer Assessment
* **Team**: Cairo University Racing Team (CURT) — Season 26-27
