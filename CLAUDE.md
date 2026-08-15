# CLAUDE.md — Anu Heritage Homecare API

Guidance for any AI assistant and engineer working in this repository. Read this
first, then verify against the code before acting.

## Current state

This repository was bootstrapped as an enterprise NestJS service. What exists:

- A working NestJS 11 + Domain Driven Design scaffold with one sample bounded
  context, `clients` (care recipients), implemented end to end across the domain,
  application, infrastructure and presentation layers.
- A mobile `identity` bounded context, built end to end and unit tested: family
  owner self signup (US or Nigeria phone), login for caregivers and family
  members, email verification and forgot password by emailed OTP, and JWT access
  plus rotating refresh tokens. Login is blocked until the email is verified and
  returns the `EMAIL_NOT_VERIFIED` code so the app can route to the verify
  screen. The Prisma models exist and the client is generated, but the migration
  is not yet applied (no database provisioned at time of writing).
- A mobile `care-recipients` bounded context, built end to end and unit tested:
  after signup a family owner onboards each loved one through a multi step wizard
  (identity profile, care needs, health and medication information, care
  schedule) that is finalised into an active record. It is a draft plus steps
  API: creating the profile opens a `DRAFT`, each step is an idempotent `PUT`, and
  `finalize` promotes it to `ACTIVE`. Onboarding progress is persisted as an
  `onboardingStep` pointer surfaced to the client as `nextStep`, so a family that
  leaves the app mid onboarding resumes exactly where they stopped (list or fetch
  a draft and jump to `nextStep`). Every route is JWT protected and scoped to the
  owner; the profile photo is stored as an opaque `photoKey` (upload endpoint
  deferred); relationship, living situation and expected duration are free text;
  health data is redacted from logs. The Prisma models are authored and the
  client is generated, but the migration is not yet applied.
- A `care-plans` catalog context and a `bookings` context (Phase 1 of care plan
  selection and checkout). The catalog holds the four plans (Flexible hourly plus
  Standard, Premium and Live in monthly) with per currency pricing. Bookings
  covers the Flexible pay as you go flow (hours, date, time slot, server computed
  end time and price) and monthly Subscriptions for the other three plans; both
  land in `PENDING_PAYMENT`. Money is stored as integer minor units with an
  explicit `Currency` (shared kernel `Money` value object); the billing currency
  is derived server side from the owner's country, which the access token now
  carries. Payments (Stripe for USD, Paystack for NGN) are Phase 2 and not built
  yet. Catalog prices in `prisma/seed.ts` are placeholders pending real figures.
- Shared kernel (base `Entity`, `AggregateRoot`, `ValueObject`, `DomainEvent`,
  `Money`, `Currency`,
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
- The mobile `identity` context covers signup, login, email verification and
  password reset. Still to do for identity: caregiver self signup, the admin
  module and admin users, phone verification by SMS, and a full `Family`
  aggregate (for now a family owner is a `FAMILY_MEMBER` flagged
  `isFamilyOwner`).
- The `care-recipients` context covers the loved one onboarding wizard end to
  end. Still to do: a real profile photo upload endpoint (storage was not
  provisioned, so only an opaque `photoKey` is stored for now); restricting
  creation to family owners specifically once caregiver accounts exist (today any
  authenticated user can own a record, and access is owner scoped); and any
  richer care plan modelling that scheduling will need later.
- Care plan checkout is being built in phases. Phase 1 (catalog, Flexible
  bookings, monthly subscriptions, server side pricing) is done. Phase 2 is
  payments: a `PaymentGateway` port with Stripe (USD) and Paystack (NGN) adapters
  chosen by currency, saved payment methods, a charge that confirms the booking
  or activates the subscription, and provider webhooks. Phase 2 needs provider
  credentials and a database to verify. Replace the placeholder catalog prices in
  `prisma/seed.ts` with real figures before launch.
- Nothing is pushed. When asked to push, confirm the branch/remote first.
- The `identity` migration (`User`, `VerificationCode`, `RefreshToken`) and the
  `care-recipients` migration (`CareRecipient` plus the `Gender`, `CareNeed`,
  `CareFrequency`, `CareRecipientStatus` and `OnboardingStep` enums) and the
  care plans and bookings migration (`CarePlan`, `CarePlanPrice`, `Booking`,
  `Subscription` plus the `Currency`, `BillingModel`, `CarePlanType`,
  `BookingStatus` and `SubscriptionStatus` enums) are authored in
  `prisma/schema.prisma` but not applied. Run `npm run prisma:migrate` once a
  database is provisioned, then `npm run prisma:seed` to populate the catalog.
  Beyond that there are no real domain migrations past the sample `Client` model.
