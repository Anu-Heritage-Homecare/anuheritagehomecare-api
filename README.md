# Anu Heritage Homecare API

Enterprise NestJS service built with Domain Driven Design, PostgreSQL and Prisma.

## Requirements

- Node.js 22 (or >= 20.11)
- Docker (for local PostgreSQL) or a reachable PostgreSQL 16 instance

## Getting started

```bash
cp .env.example .env            # set a real DATABASE_URL and CORS_ORIGINS
docker compose up -d postgres   # start local PostgreSQL
npm install
npm run prisma:generate
npm run prisma:migrate          # apply schema to the database
npm run start:dev
```

The API is served under the `/api` prefix with URI versioning, for example
`GET /api/v1/clients/:id`. Interactive OpenAPI docs are at `/api/docs` outside
production.

Health probes:

- Liveness: `GET /api/health/live`
- Readiness (checks the database): `GET /api/health/ready`

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run start:dev` | Run in watch mode |
| `npm run build` | Compile to `dist/` |
| `npm run lint` | ESLint, zero warnings allowed |
| `npm test` | Unit tests |
| `npm run test:e2e` | End to end tests |
| `npm run prisma:migrate` | Create and apply a dev migration |
| `npm run prisma:studio` | Open Prisma Studio |

## Architecture

Domain Driven Design, organised by bounded context with strict inward pointing
dependencies (domain, application, infrastructure, presentation). See
[CLAUDE.md](./CLAUDE.md) for the full architecture and engineering standards.

## Standards

Every change must be enterprise grade in security, performance, and code quality.
The bar and the definition of done are documented in [CLAUDE.md](./CLAUDE.md).
