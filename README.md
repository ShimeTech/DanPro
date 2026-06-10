# BuildPro IMS

BuildPro IMS is a modern Construction Project Management System designed to manage projects, WBS, tasks, schedules, resources, procurement, contracts, documents, and audits.

## Features

* Project Management
* Work Breakdown Structure (WBS)
* Task Management
* Task Dependencies
* Resource Management
* Procurement Management
* Contract Management
* Document Management
* Audit Trail
* Dashboard & Reporting

## Task Management

### Automatic Task Codes

Task codes are generated automatically:

```text
T-001
T-002
T-003
```

### Progress Calculation

Parent task progress is automatically calculated from subtasks.

Weighted Formula:

```text
Progress =
Σ(Task Progress × Duration)
/
Σ(Duration)
```

Fallback:

```text
Average(Subtask Progress)
```

### Task Statuses

```text
NOT_STARTED
IN_PROGRESS
ON_HOLD
COMPLETED
CANCELLED
```

### Task Priorities

```text
LOW
MEDIUM
HIGH
CRITICAL
```

## Technology Stack

### Backend

* NestJS
* TypeScript
* Prisma ORM
* MariaDB
* JWT Authentication

### Frontend

* React
* TypeScript
* Axios

## Installation

### Backend

```bash
npm install
npx prisma migrate dev
npx prisma generate
npm run start:dev
```

### Frontend

```bash
npm install
npm run dev
```

## Environment Variables

```env
DATABASE_URL=mysql://user:password@localhost:3306/buildpro_ims

JWT_SECRET=your-secret

PORT=5000
```

## Main API Endpoints

```http
POST   /tasks
GET    /tasks/project/:projectId
GET    /tasks/:id
PATCH  /tasks/:id
DELETE /tasks/:id
PATCH  /tasks/:id/activate
```

### Task Dependencies

```http
POST   /tasks/dependencies
DELETE /tasks/dependencies/:id
```

## Security

* JWT Authentication
* Role-Based Access Control (RBAC)
* Permission Management
* DTO Validation
* Audit Logging

## Future Enhancements

* Gantt Charts
* Critical Path Analysis
* Earned Value Management (EVM)
* Primavera P6 Integration
* BIM Integration
* Mobile Application

---

**BuildPro IMS** provides a scalable and enterprise-ready platform for managing construction projects from planning to completion.
