# Platinum Courier Services - Management System

A comprehensive parcel tracking and courier management platform for Platinum Courier Services Zambia. This system provides end-to-end management of courier operations including parcel booking, tracking, office management, trip scheduling, and delivery coordination.

## Overview

This repository contains a full-stack courier management solution with:

- **Backend**: NestJS REST API with PostgreSQL database
- **Frontend**: Angular web application with Material Design
- **Infrastructure**: Docker containers for PostgreSQL and Redis

## Key Features

### Parcel Management
- Parcel creation with sender/receiver details
- Multi-status tracking (pending, ready for collection, collected, damaged, complaint)
- Size categorization (small, medium, large)
- Parcel description and declared value tracking
- Unique tracking codes with barcode generation
- Payment processing (cash, mobile money, card)

### Office & Branch Operations
- Multi-functional offices (sending, receiving, dispatch, transit)
- Bay management (sending, receiving, dispatch, sorting bays)
- Branch code assignment and area routing
- Route-based office organization

### Trip & Route Management
- Trip planning and scheduling
- Driver and truck assignment
- Real-time trip status tracking (planned, loading, in transit, completed)
- Route-based parcel routing
- Trip logs and audit trails

### Scanning & Sorting
- Barcode scanning sessions for parcels
- Mail bag tracking
- Bay-based scanning workflows
- Individual and bag scanning modes
- Staff assignment to scanning sessions

### Customer Service
- Customer registration with ID verification
- Complaint management system
- Complaint status tracking and resolution
- Access logs and audit trails

### User Management
- Role-based access control
- Office assignment for staff
- Bay type authorization
- User activity logging

## Technology Stack

### Backend
- **Framework**: NestJS 10.x
- **Database**: PostgreSQL (via Prisma ORM)
- **Cache**: Redis
- **Authentication**: JWT with Passport
- **PDF Generation**: PDFKit
- **Barcode Generation**: bwip-js
- **SMS Integration**: Africa's Talking
- **Excel Export**: ExcelJS
- **API Documentation**: Swagger/OpenAPI

### Frontend
- **Framework**: Angular 19
- **UI Library**: Angular Material
- **State Management**: RxJS
- **Styling**: TailwindCSS
- **Date Handling**: Luxon
- **Charts**: ApexCharts
- **Rich Text**: Quill Editor

### Infrastructure
- **Containerization**: Docker & Docker Compose
- **Database**: PostgreSQL 15+
- **Cache**: Redis 7+

## Prerequisites

- [Node.js](https://nodejs.org/) 18 or later
- [npm](https://www.npmjs.com/)
- [Docker](https://www.docker.com/) and Docker Compose

## Getting Started

### 1. Start infrastructure services

PostgreSQL and Redis are provided via Docker. Before starting the containers,
create the persistent volume that Postgres uses:

```bash
docker volume create postgres_data
docker compose up -d postgres redis
```

This will expose Postgres on `localhost:5432` and Redis on `localhost:6379`.

### 2. Run the backend (NestJS)

```bash
cd backend
npm install

# create .env
cat <<'ENV' > .env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/platinum
NODE_ENV=development
PORT=3000
REDIS_HOST=localhost
REDIS_PORT=6379
ENV

# run database migrations
npm run prisma:dev

# start development server
npm run start:dev
```

The API will be available at `http://localhost:3000`.

### 3. Run the frontend (Angular)

In a new terminal:

```bash
cd frontend
npm install
npm start
```

The web application will be available at `http://localhost:4200`.

### 4. Shutting down

To stop the infrastructure containers run:

```bash
docker compose down
```

### 5. Running tests

Each project has its own test suite:

```bash
cd backend && npm test
cd ../frontend && npm test
```

> Frontend tests require a local Chrome installation.

## Project Structure

```
pcs-zambia/
├── backend/                 # NestJS API server
│   ├── prisma/             # Database schema and migrations
│   │   ├── schema.prisma   # Prisma schema definition
│   │   └── migrations/     # Database migration files
│   ├── src/                # Application source code
│   │   ├── modules/        # Feature modules
│   │   ├── auth/           # Authentication & authorization
│   │   ├── common/         # Shared utilities and guards
│   │   └── main.ts         # Application entry point
│   └── package.json
│
├── frontend/               # Angular web application
│   ├── src/
│   │   ├── app/           # Application modules and components
│   │   ├── assets/        # Static assets
│   │   └── environments/  # Environment configurations
│   └── package.json
│
├── docker-compose.yml     # Infrastructure services
└── README.md
```

## API Documentation

Once the backend is running, Swagger API documentation is available at:

- **Swagger UI**: `http://localhost:3000/api`

The API provides endpoints for:
- Authentication and user management
- Parcel creation and tracking
- Office and bay management
- Trip planning and execution
- Scanning session management
- Payment processing
- Complaint handling
- Reporting and analytics

## Database Schema

The system uses PostgreSQL with Prisma ORM. Key entities include:

- **Parcel**: Core parcel information with tracking
- **Customer**: Sender and receiver details
- **Office**: Branch locations with multi-function support
- **Trip**: Delivery trips with route assignments
- **ScanningSession**: Parcel scanning workflows
- **User**: Staff accounts with role-based permissions
- **Payment**: Payment records for parcels
- **Complaint**: Customer complaint tracking

## Schema Changes & Migrations

### Schema change: Multi-function offices

Offices now support multiple capabilities using a Postgres enum array.

- Prisma schema change: `Office.officeTypes: OfficeType[]` (replaces `officeType`).
- After pulling these changes, generate a migration and backfill existing data:

```bash
cd backend
npx prisma migrate dev -n office_types_array

# Optional: Backfill existing single values into arrays (manual SQL)
# UPDATE "Office" SET "officeTypes" = ARRAY["officeType"::"OfficeType"];  -- if upgrading from a DB with the old column
```

Code changes use inclusion checks, e.g. `office.officeTypes.includes('DISPATCH')`.

## Schema change: Parcel sending office

Parcels now capture the origin office via `Parcel.sendingOfficeId`.

- Prisma schema: `sendingOfficeId` (nullable) with relation `sendingOffice -> Office`.
- Backend sets `sendingOfficeId` from the authenticated user's `officeId` when creating parcels; if unavailable, it remains null.
- Receipts now display the origin office under Sender Details and the destination office under Receiver Details.

After pulling these changes, run a migration and regenerate the Prisma client:

```bash
cd backend
npx prisma migrate dev -n add_parcel_sending_office
```

## Development

### Environment Variables

The backend requires the following environment variables (create a `.env` file in the `backend/` directory):

```bash
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/platinum
NODE_ENV=development
PORT=3000
REDIS_HOST=localhost
REDIS_PORT=6379
JWT_SECRET=your-jwt-secret
# Optional: Africa's Talking SMS credentials
AT_API_KEY=your-api-key
AT_USERNAME=your-username
```

### Common Development Tasks

```bash
# Backend: Generate Prisma client after schema changes
cd backend
npx prisma generate

# Backend: Create a new migration
npx prisma migrate dev -n migration_name

# Backend: View database in Prisma Studio
npx prisma studio

# Frontend: Generate new component
cd frontend
ng generate component components/component-name

# Frontend: Build for production
npm run build
```

### Deployment

The backend includes a deployment script:

```bash
cd backend
npm run deploy
```

This command will:
1. Install dependencies
2. Run smart migrations (handles both new and existing databases)
3. Seed admin user
4. Start the production server

## Architecture

### Backend Architecture

- **Modular structure**: Features organized into NestJS modules
- **Authentication**: JWT-based authentication with Passport strategies
- **Authorization**: Role-based access control (RBAC) with guards
- **Validation**: Class-validator DTOs for request validation
- **Database**: Prisma ORM with PostgreSQL
- **Caching**: Redis for session management and caching
- **PDF Generation**: Dynamic receipt and label generation
- **Barcode**: 1D/2D barcode generation for tracking codes

### Frontend Architecture

- **Component-based**: Angular standalone components
- **Reactive**: RxJS for state management and async operations
- **Material Design**: Consistent UI with Angular Material
- **Routing**: Lazy-loaded modules for optimal performance
- **Authentication**: JWT token management with HTTP interceptors
- **Forms**: Reactive forms with validation

## Contributing

When contributing to this repository:

1. Create a feature branch from `dev`
2. Make your changes
3. Write/update tests as needed
4. Ensure all tests pass
5. Create a pull request to `dev` branch

## License

Copyright (c) 2024 Platinum Courier Services Zambia. All rights reserved.
