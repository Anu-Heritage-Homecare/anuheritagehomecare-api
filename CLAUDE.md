# CLAUDE.md — Anu Heritage Homecare API

Guidance for any AI assistant and engineer working in this repository. Read this
first, then verify against the code before acting.

## Current state

This repository was bootstrapped as an enterprise NestJS service. What exists:

- A working NestJS 11 + Domain Driven Design scaffold with one sample bounded
  context, `clients` (care recipients), implemented end to end across the domain,
  application, infrastructure and presentation layers.
- Shared kernel (base `Entity`, `AggregateRoot`, `ValueObject`, `DomainEvent`,
  transport agnostic `DomainException`), Prisma service and module, global
  exception filters, `Clock` and `IdGenerator` ports.
- Application hardening in `main.ts`: helmet, compression, CORS allowlist, global
  `ValidationPipe` (whitelist), rate limiting, structured redacted logging,
  graceful shutdown, Swagger at `/api/docs` outside production.
- Config validated at boot with zod (fails fast on invalid environment).
- Prisma schema for a `Client` model, seed script, health probes, Dockerfile,
  `docker-compose.yml`, CI ready scripts.

Status: build, lint (zero warnings) and unit tests pass; `npm audit` is at zero
vulnerabilities. There is a single commit on `main` (the bootstrap); nothing has
been pushed. The repository currently lives at
`Documents/Others/anuheritagehomecare-api`. Git remote is
`github.com/Anu-Heritage-Homecare/anuheritagehomecare-api` (token was scrubbed
from the remote URL; rotate any token that was shared in chat).

## Prime directive: enterprise grade, always

Everything produced in this project MUST meet enterprise grade standards across
three dimensions. This is non negotiable and applies to every change, however
small.

1. **Security.** Treat all input as hostile. Validate and whitelist at the edge,
   never trust client data, never log secrets or personal data, apply least
   privilege, keep dependencies patched, and fail closed. Homecare data is
   sensitive personal data; handle it accordingly.
2. **Performance.** Design for efficiency: avoid N plus 1 queries, index what you
   filter on, stream or paginate large results, cache deliberately, keep hot
   paths allocation light, and measure before and after non trivial changes.
3. **Code syntax and quality.** Idiomatic, strictly typed, lint clean, formatted,
   and covered by tests. No `any`, no unused code, no floating promises, no
   silent catch. Readable names and small, single responsibility units.

If a change cannot meet all three, stop and raise it rather than lowering the bar.

## Architecture: Domain Driven Design

The codebase is organised by bounded context, each with four layers. Dependencies
point inward only: domain depends on nothing; application depends on domain;
infrastructure and presentation depend on application and domain.

```
src/
  config/                 Validated, typed environment configuration
  shared/                 Shared kernel and cross cutting technical concerns
    domain/               Base Entity, AggregateRoot, ValueObject, DomainEvent, exceptions
    application/ports/    Technical ports (Clock, IdGenerator)
    infrastructure/       Prisma service and module, HTTP filters, system adapters
  modules/
    <context>/            One bounded context (for example: clients)
      domain/             Entities, value objects, domain events, repository ports (interfaces)
      application/        Use cases, commands, queries, application DTOs
      infrastructure/     Repository adapters (Prisma), mappers
      presentation/       Controllers and request/response DTOs
      <context>.module.ts Composition root that binds ports to adapters
```

Rules that keep the layers honest:

- The **domain** layer imports no framework code (no Nest, no Prisma, no HTTP).
  Invariants live in entities and value objects; construction goes through
  factory methods so an aggregate is never in an invalid state.
- **Repositories are ports**: interfaces declared in the domain, implemented in
  infrastructure, and bound in the module via an injection token. The
  application layer depends only on the interface (dependency inversion).
- **Mappers** are the only place that knows both the Prisma row shape and the
  domain shape. Prisma types never leak past the infrastructure layer.
- **Controllers stay thin**: translate HTTP to a use case call and back to a DTO.
  No business logic in controllers.
- Domain errors are transport agnostic (`DomainException` with a `kind`); the
  HTTP layer maps them to status codes in a single exception filter.

## Stack

- NestJS 11 on Node 22, TypeScript strict mode.
- PostgreSQL via Prisma (`prisma/schema.prisma`), migrations under `prisma/`.
- class-validator and class-transformer for edge validation.
- helmet, compression, CORS allow list, and @nestjs/throttler for security.
- nestjs-pino for structured, redacted logging.
- Jest for unit and e2e tests.

## Conventions

- **File naming.** Use the idiomatic NestJS convention: kebab case, dot
  separated by role (for example `email-address.vo.ts`, `clients.controller.ts`,
  `client.repository.ts`). Keep it consistent across the codebase.
- **No dashes in prose or in code identifiers we author** unless a hyphen is
  syntactically required for something to work. Rephrase instead. File names are
  exempt from this and use kebab case as above.
- Path aliases: `@shared/*`, `@modules/*`, `@config/*`.
- Every use case is a class with a single `execute` method and its own spec.

## Local workflow

```
cp .env.example .env          # then set a real DATABASE_URL
docker compose up -d postgres # start PostgreSQL
npm install
npm run prisma:generate
npm run prisma:migrate        # create/apply the local schema
npm run start:dev             # http://localhost:3000/api, docs at /api/docs
```

Before every commit: `npm run lint` and `npm test` must pass with zero warnings.

## Definition of done for any change

- [ ] Strictly typed, no `any`, lint clean with zero warnings.
- [ ] Input validated at the boundary; no secrets or personal data logged.
- [ ] Domain rules live in the domain layer, not in controllers or services.
- [ ] Unit tests added or updated; meaningful paths covered.
- [ ] No performance regressions (queries indexed, no N plus 1, pagination on lists).

## GitHub ticketing workflow

The owner wants each unit of work tracked on the organisation GitHub project.
For every meaningful thing carried out, create a ticket (or update an existing
one to the appropriate status):

- **Board:** org project "Anu Heritage Homecare" (org project number 2,
  `https://github.com/orgs/Anu-Heritage-Homecare/projects/2`). Status options are
  `Todo`, `In progress`, `Done`.
- **Issues** live in this repo (`Anu-Heritage-Homecare/anuheritagehomecare-api`).
- Label every ticket `backend`, assign it to `Israel001`, add it to the board,
  and set the status (`In progress` while working, `Done` when finished). The
  board has an automation that closes an issue when its status becomes `Done`.
- Write a full description (what, why, key files, verification). **Never mention
  Claude, Anthropic, or any AI assistant in ticket titles or descriptions.**
- Relate backend tickets to Milestone 3 ("Backend Architecture and Live Staging",
  issue 3 in the `anu-heritage-homecare` planning repo) for traceability.
- Tickets 1 to 5 for the initial bootstrap already exist and are `Done`.

Tooling notes: `gh` CLI is not installed here; use the GitHub GraphQL API via
`curl` for Projects v2 (it is GraphQL only). This needs a token with the
`project` scope in addition to `repo`; a plain `repo` token cannot touch the
board. Ask the owner for a fresh project scoped token each session and do not
persist it in the repo.

## Open items / next

- The `clients` context is a reference pattern; real bounded contexts (for
  example care workers, visits, scheduling) are not built yet.
- Nothing is pushed. When asked to push, confirm the branch/remote first.
- No real domain migrations beyond the sample `Client` model.
