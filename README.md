# School Management System API (Axion Template)

This project implements a School Management System API on top of the Axion template with:

- JWT authentication (long token + short token)
- RBAC (`SUPERADMIN`, `SCHOOL_ADMIN`)
- School-scoped authorization for admin operations
- Entities: School, Classroom, Student
- Transfer workflow: Student -> Classroom transfer
- Automated endpoint tests

## Tech Stack

- Node.js + Express
- MongoDB (primary persistence)
- Redis (template runtime services)
- Mongoose

## Run Locally

1. Start MongoDB:
   - `sudo systemctl start mongod`
2. Start Redis (if not already running).
3. Install dependencies:
   - `npm install`
4. Create env file:
   - `cp .env.example .env`
5. Start API:
   - `node index.js`

Default local API URL: `http://127.0.0.1:5112`
Health check: `GET /health`
Swagger UI: `GET /docs`
OpenAPI JSON: `GET /docs.json`

## Admin Dashboard (Next.js)

A role-aware admin dashboard is included in `admin-dashboard/`.

Run locally:

1. Install dashboard dependencies:
   - `cd admin-dashboard && npm install`
2. Create dashboard env file:
   - `cp .env.example .env.local`
3. Start dashboard:
   - `npm run dev`

Dashboard URL: `http://127.0.0.1:3000`

Shortcut commands from repository root:

- `npm run dashboard:dev`
- `npm run dashboard:build`
- `npm run dashboard:start`

## Environment Variables

Required:

- `LONG_TOKEN_SECRET`
- `SHORT_TOKEN_SECRET`
- `NACL_SECRET`

Core runtime:

- `MONGO_URI` (default local)
- `USER_PORT`
- `REDIS_URI` / `CORTEX_REDIS` / `OYSTER_REDIS` / `CACHE_REDIS`

Security controls (optional overrides):

- `RATE_LIMIT_WINDOW_MS` (default: `900000`)
- `RATE_LIMIT_MAX` (default: `300`)
- `API_MAX_BODY_SIZE` (default: `100kb`)
- `CORS_ORIGIN` (default: `*`)

## API Endpoints (v1)

All requests use `POST /api/:module/:fnName`.

### Auth

- `POST /api/user/v1_register`
- `POST /api/user/v1_login`
- `POST /api/token/v1_createShortToken`

### School (SUPERADMIN)

- `POST /api/school/v1_createSchool`
- `POST /api/school/v1_getSchool`
- `POST /api/school/v1_listSchools`
- `POST /api/school/v1_updateSchool`
- `POST /api/school/v1_deleteSchool` (blocked if linked admins/classrooms/students exist)

### Classroom (SCHOOL_ADMIN + school scope)

- `POST /api/classroom/v1_createClassroom`
- `POST /api/classroom/v1_getClassroom`
- `POST /api/classroom/v1_listClassrooms`
- `POST /api/classroom/v1_updateClassroom`
- `POST /api/classroom/v1_deleteClassroom`

### Student (SCHOOL_ADMIN + school scope)

- `POST /api/student/v1_createStudent`
- `POST /api/student/v1_getStudent`
- `POST /api/student/v1_listStudents`
- `POST /api/student/v1_updateStudent`
- `POST /api/student/v1_deleteStudent`
- `POST /api/student/v1_transferStudent`

## Authentication Flow

1. Bootstrap the first superadmin with `v1_register` (`role=SUPERADMIN`).
2. Additional `SUPERADMIN` creation requires a valid superadmin long token in `token` header.
3. Login to obtain a long token.
4. Send long token in `token` header for protected routes.
5. Optionally create short token via `v1_createShortToken`.

## Error Handling Contract

Standard response shape:

- `ok`: boolean
- `data`: object/array
- `errors`: array/string
- `message`: string

Typical status mapping:

- `200`: success
- `400`: validation or business error
- `401`: unauthorized
- `403`: forbidden (RBAC/scope)
- `500`: internal server error

## Security

Implemented baseline hardening:

- `helmet` secure HTTP headers
- API rate limiting (`express-rate-limit`)
- Request body size limit for JSON/urlencoded payloads
- Configurable CORS origin

## Database Schema Diagram

```mermaid
erDiagram
    User ||--o| School : "belongs to (SCHOOL_ADMIN)"
    School ||--o{ Classroom : "has many"
    School ||--o{ Student : "has many"
    Classroom ||--o{ Student : "enrolled in"
    Student ||--o{ StudentTransfer : "has transfer history"
    
    User {
        string id PK
        string email UK
        string fullName
        string role "SUPERADMIN | SCHOOL_ADMIN"
        string schoolId FK "NULL for SUPERADMIN"
        boolean isActive
        date createdAt
    }
    
    School {
        string id PK
        string code UK
        string name
        string address
        string phone
        string email
        boolean isActive
        date createdAt
    }
    
    Classroom {
        string id PK
        string schoolId FK
        string name
        string gradeLevel
        number capacity
        array resources
        boolean isActive
        date createdAt
    }
    
    Student {
        string id PK
        string schoolId FK
        string classroomId FK "NULL if unassigned"
        string studentNumber UK "per school"
        string firstName
        string lastName
        date dob
        string status "ACTIVE | INACTIVE"
        date deletedAt "soft delete"
        date createdAt
    }
    
    StudentTransfer {
        string id PK
        string studentId FK
        string fromSchoolId FK
        string toSchoolId FK
        string reason
        string transferredBy FK "User.id"
        date transferredAt
    }
```

## Postman

Import:

- `postman/axion-auth-v1.postman_collection.json`

Collection includes auth, school, classroom, and student flows with variable captures.

## Swagger / OpenAPI

- Interactive docs: `http://127.0.0.1:5112/docs`
- Raw spec: `http://127.0.0.1:5112/docs.json`
- Spec file path: `docs/openapi.json`

## Automated Tests

Start the API first (default `http://127.0.0.1:5112`), then run:

```bash
npm test              # run all tests
npm run test:fresh    # clean DB + run all tests
npm run test:cleanup  # wipe test data from MongoDB
```

### Test Results (46 / 46 passing)

```
✔ v1_register creates a SUPERADMIN user
✔ v1_login returns longToken for registered user
✔ v1_createShortToken returns shortToken from a valid longToken
✔ v1_register returns clear validation error for invalid role
✔ v1_login returns invalid credentials for wrong password
✔ protected endpoint returns 401 without token
✔ protected endpoint returns 401 with invalid token
✔ v1_register blocks additional SUPERADMIN creation without token
✔ v1_register allows additional SUPERADMIN creation with SUPERADMIN token
✔ v1_register rejects SCHOOL_ADMIN with unknown schoolId
✔ v1_register allows SCHOOL_ADMIN with valid schoolId
✔ classroom v1 CRUD works for SCHOOL_ADMIN
✔ classroom create fails validation for missing required fields
✔ classroom create rejects duplicate name within same school
✔ classroom get/update/delete return not found for unknown id
✔ classroom CRUD works for SUPERADMIN (full system access)
✔ classroom school scope denies SCHOOL_ADMIN for other school
✔ auth - wrong password returns error
✔ auth - missing token returns 401
✔ auth - invalid token format returns 401
✔ RBAC - SCHOOL_ADMIN cannot create school
✔ RBAC - SCHOOL_ADMIN cannot delete school
✔ RBAC - SCHOOL_ADMIN cannot access other school data
✔ validation - empty school name rejected
✔ validation - missing required field rejected
✔ validation - invalid email format rejected
✔ business rule - duplicate school code rejected
✔ business rule - cannot delete school with classrooms
✔ business rule - classroom at capacity rejects enrollment
✔ business rule - get non-existent student returns 404
✔ edge case - list with skip beyond total returns empty
✔ edge case - list limit capped at 100
✔ school v1 CRUD endpoints work for SUPERADMIN
✔ school create returns validation errors for bad payload
✔ school RBAC denies SCHOOL_ADMIN for school endpoints
✔ school get/update/delete return not found for unknown id
✔ school delete is blocked when linked entities exist
✔ student v1 CRUD and transfer work for SCHOOL_ADMIN
✔ student create fails validation for missing required fields
✔ student create rejects invalid dob format
✔ student create rejects duplicate studentNumber in same school
✔ student get/update/delete return not found for unknown id
✔ student CRUD works for SUPERADMIN (full system access)
✔ student school scope denies SCHOOL_ADMIN for other school
✔ student transfer fails when student is not found
✔ student transfer fails when target classroom is outside school
ℹ tests 46 | pass 46 | fail 0 | duration ~10.5s
```

### Coverage by Suite

| Suite | Tests | Covers |
|-------|-------|--------|
| `auth.v1.test.js` | 11 | Registration, login, token creation, RBAC guards, invalid credentials |
| `classroom.v1.test.js` | 6 | CRUD, validation, duplicates, SUPERADMIN access, school scope |
| `school.v1.test.js` | 5 | CRUD, validation, RBAC, not-found, delete guards |
| `student.v1.test.js` | 9 | CRUD, validation, DOB format, duplicates, SUPERADMIN access, scope, transfer |
| `integration.v1.test.js` | 15 | Auth edge cases, RBAC enforcement, validation rules, business rules, edge cases |

### Test Utilities

- `tests/_helpers/apiTestUtils.js` — shared HTTP helpers, auth bootstrap, school/admin creation
- `tests/_helpers/cleanup.js` — MongoDB test data cleanup script

## Deployment Instructions

### Deploy on Render (Recommended)

1. Push code to a public GitHub repository.

2. **MongoDB** — Create a free cluster on [MongoDB Atlas](https://cloud.mongodb.com):
   - Create cluster → Get connection string → Set as `MONGO_URI`

3. **Redis** — Create a Redis instance on [Render](https://render.com) or [Upstash](https://upstash.com):
   - Get connection URL → Set as `REDIS_URI`, `CORTEX_REDIS`, `OYSTER_REDIS`, `CACHE_REDIS`

4. **Web Service** — Create a new Web Service on Render:
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Environment**: Node
   - Add all required env vars (see Environment Variables section)

5. **Environment Variables** to set on Render:
   ```
   MONGO_URI=mongodb+srv://<user>:<pass>@<cluster>.mongodb.net/axion
   REDIS_URI=redis://<your-redis-url>
   CORTEX_REDIS=redis://<your-redis-url>
   OYSTER_REDIS=redis://<your-redis-url>
   CACHE_REDIS=redis://<your-redis-url>
   LONG_TOKEN_SECRET=<random-32-char-string>
   SHORT_TOKEN_SECRET=<random-32-char-string>
   NACL_SECRET=<random-32-char-string>
   USER_PORT=5112
   ENV=production
   CORS_ORIGIN=*
   ```

6. Deploy and verify:
   - Health check: `GET https://<your-app>.onrender.com/health`
   - Swagger docs: `GET https://<your-app>.onrender.com/docs`

### Docker (Local Development)

```bash
docker compose up -d    # starts API + MongoDB + Redis
docker compose down      # stop all services
```

## Submission Checklist

- Public repository URL
- Public deployed API URL
- README with setup, env vars, endpoints, auth flow
- Postman collection
- Test results (`npm test` passing)
- Assumptions/notes section (if any deviations)

## Assumptions

- The Axion template routing style (`POST /api/:module/:fnName`) is preserved by design.
- "Transfer" is implemented as student transfer between classrooms inside a school scope.
- School administrators are strictly limited to their assigned `schoolId`.
