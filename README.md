# Platinum System

This repository contains the backend and frontend for the Platinum Courier Services platform.

## Prerequisites

- [Node.js](https://nodejs.org/) 18 or later
- [npm](https://www.npmjs.com/)
- [Docker](https://www.docker.com/) and Docker Compose

## 1. Start infrastructure services

PostgreSQL and Redis are provided via Docker. Before starting the containers,
create the persistent volume that Postgres uses:

```bash
docker volume create postgres_data
docker compose up -d postgres redis
```

This will expose Postgres on `localhost:5432` and Redis on `localhost:6379`.

## 2. Run the backend (NestJS)

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

## 3. Run the frontend (Angular)

In a new terminal:

```bash
cd frontend
npm install
npm start
```

The web application will be available at `http://localhost:4200`.

## 4. Shutting down

To stop the infrastructure containers run:

```bash
docker compose down
```

## 5. Running tests

Each project has its own test suite:

```bash
cd backend && npm test
cd ../frontend && npm test
```

> Frontend tests require a local Chrome installation.

## Schema change: Multi-function offices

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
