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
  screen. Caregivers, whose credentials are issued out of band (an admin
  provisions them; that provisioning surface is not built yet), log in with the
  same endpoint. An account provisioned with a temporary password carries a
  `mustChangePassword` flag that the login response surfaces so the app forces a
  password change on first login; the authenticated `POST /api/v1/auth/password/change`
  (verifies the current password, sets a new one, revokes every other session and
  returns a fresh token pair) clears it, and any password change, including a
  forgotten password reset, clears it too. Forgot password works for caregivers
  as it does for family members, since it is keyed on email and is user type
  agnostic. The Prisma models exist and the client is generated, but the migration
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
  carries (the token also carries the owner's email for the payment providers).
  Catalog prices in `prisma/seed.ts` are placeholders pending real figures.
- A `payments` context (Phase 2). A provider agnostic `PaymentGateway` port with
  a composite that dispatches to Stripe (USD) and Paystack (NGN) adapters by
  currency, `initiate` to start payment for a booking or subscription, saved
  payment methods, and signed provider webhooks that confirm the booking or
  activate the subscription on success. One time bookings create a single charge;
  monthly plans create a real recurring subscription at the provider (a Stripe
  Subscription or a Paystack plan transaction), using the provider price and plan
  references stored per currency on the catalog (`CarePlanPrice.stripePriceId`,
  `paystackPlanCode`). Those provider references must be created at Stripe and
  Paystack and seeded before recurring billing works. Money never comes from the client; the
  amount and currency are read from the payable. The provider adapters are
  written against the Stripe and Paystack REST APIs (no SDK dependency, using
  `fetch` and HMAC signature verification) but are NOT yet verified against live
  accounts: they need provider keys and a database. Keys are optional in config,
  and each adapter fails closed if used without its key.
- A `kyc` context (family owner identity verification with a live face match).
  The owner submits their first name, last name and date of birth plus a document,
  and a live selfie. Nigeria owners verify a NIN, driver's licence or passport
  through QoreID (synchronous, with QoreID's per document face match). US owners
  verify through a Stripe Identity document plus selfie session (Stripe extracts
  the ID data, matches the selfie to the ID photo and checks liveness); the SSN is
  no longer used, since a number carries no photo to match a face against. The
  application compares the claimed name and date of birth against what the
  provider returns for the real holder (normalised, in the `identity-matcher`);
  if the person is real but a detail or the face does not match, the owner is
  `REJECTED` and the field level differences are stored for the (deferred) admin
  audit, while the response returns only the names of the mismatched fields (never
  the provider's values). `FAILED` means the document could not be verified at
  all. Only a masked remnant (last four) and the outcome are stored, never the
  full number or the selfie; the document number, date of birth and selfie are
  redacted from logs. A verified KYC is required before `payments` will initiate a
  charge (returns the `KYC_REQUIRED` code otherwise). QoreID decides
  synchronously; Stripe Identity is asynchronous, so submitting returns a
  `clientSecret` for the frontend Stripe SDK and a signed webhook
  (`POST /api/v1/kyc/webhook/stripe`) carries the extracted identity so the US
  comparison and decision happen there. The QoreID and Stripe adapters are written
  but not yet verified against live accounts. No in house face matching is done or
  planned; face match is always the provider's.
- A `visits` context (the caregiver work schedule). A `Visit` is one scheduled
  care session assigning a caregiver to a care recipient on a day and time window
  (`startMinute`/`endMinute`, timezone free), with a status
  (`SCHEDULED`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`, `MISSED`). The visit owns
  its checklist of `VisitTask`s and its free text special instructions; the
  recipient's own identity, health note and address are read from the care
  recipients context, never duplicated. Two caregiver facing, JWT protected and
  caregiver scoped reads: `GET /api/v1/caregiver/schedule` (a single day by
  `date`, default today, or an inclusive `from`/`to` range for the Week view,
  with an optional `status` filter) and `GET /api/v1/caregiver/visits/:id` (the
  full appointment detail: recipient, tasks, special instructions, health note
  from the recipient's medical conditions and allergies, and an emergency
  contact). The recipient age is derived server side from the date of birth,
  which never leaves the application layer. The schedule batches its recipient
  lookups (no query per visit). Attendance is a geofenced clock in and out:
  `POST /api/v1/caregiver/visits/:id/clock-in` takes the caregiver's current
  latitude and longitude, checks it falls inside the geofence around the
  recipient's pinned address (radius from `GEOFENCE_RADIUS_METERS`, default 150),
  and on success starts the visit (`IN_PROGRESS`) and stamps a server `clockInAt`;
  `clock-out` stamps `clockOutAt` and completes it. Outside the geofence returns
  the `OUTSIDE_GEOFENCE` code (422). The server timestamps are the source of truth
  for how long a visit took. How visits are created and assigned (from bookings
  and subscriptions, or by an admin) is still deferred; the schedule reads
  whatever visits exist. The emergency contact is currently derived from the
  family owner's account (name and phone); if a distinct contact is captured
  later, only the `IdentityOwnerContactDirectory` adapter changes.
- A `tracking` context (caregiver location telemetry). One append only
  `POST /api/v1/caregiver/locations` ingests a batch (up to 500) of location
  breadcrumbs for the authenticated caregiver: latitude, longitude, optional
  accuracy, a `mode` (`NAVIGATION` sent every few minutes while travelling, or
  `BACKGROUND` sent occasionally), the device `recordedAt`, and an optional
  `visitId` tag. The server stamps `receivedAt` and bulk inserts. `LocationPing`
  rows are immutable and feed the future admin movement audit (path replay, total
  travel time, long stops), which is a read model deferred until the admin module
  exists. Location is sensitive personal data: caregivers may only write their
  own points, and coordinates are redacted from logs. The care recipient now
  carries the pinned `latitude`/`longitude` of its address (captured at
  onboarding, optional there but required before a caregiver can clock in), stored
  through a shared kernel `Coordinates` value object (validates lat/lng, haversine
  distance and the geofence check).
- **Caregiver active shift (visits context, added later).** During a shift a
  caregiver records: medication administration per scheduled dose
  (`PUT /api/v1/caregiver/visits/:id/medications/:medicationId`), vital signs
  including temperature (`PUT .../vitals`, temperature stored as integer tenths of
  a degree Celsius), qualitative observations of mood, appetite, mobility and
  medication taken (`PUT .../observations`), visit and family notes with photo
  keys (`PUT .../notes`), and ticks checklist tasks (`PUT .../tasks/:index`, which
  stamps a `completedAt` so an activity feed can place it on a timeline). Breaks:
  `POST .../break/start` and `.../break/end` with a distinct `ON_BREAK` status;
  clock out is blocked while a break is open. The pre completion review
  (`GET .../review`) reports which parts of the record are filled in, and clock
  out (`POST .../clock-out`, the Submit) returns the recipient and the time
  breakdown (active time excluding breaks, and break time). An SOS alert
  (`POST .../sos`, cancel `POST .../sos/:alertId/cancel`) is raised from a shift,
  capturing the caregiver position (best effort) and a recipient snapshot;
  coordinates, recipient name and address are kept out of the logs. Medication is
  now a structured child collection on the care recipient (name, dose, time),
  replacing the free text list. Tracking gained an `EMERGENCY` location mode tagged
  to an SOS alert for high frequency streaming.
- **Identity: two factor authentication (TOTP) and the profile endpoint.** Any
  account type can enable TOTP: `POST /api/v1/auth/2fa/setup` returns a base32
  secret and otpauth URI, `POST /auth/2fa/enable` proves a code and returns single
  use recovery codes, `POST /auth/2fa/disable` needs the current password. Login
  returns `{ twoFactorRequired, challengeToken }` when it is on; `POST /auth/2fa/login`
  completes with a code or a recovery code. TOTP is RFC 6238 via Node crypto (no
  dependency); the secret is encrypted at rest (AES 256 GCM, key from
  `TWO_FACTOR_ENCRYPTION_KEY`); recovery codes are SHA 256 hashed; the challenge is
  a short lived purpose scoped JWT (`JWT_MFA_SECRET`). `GET /api/v1/auth/me` returns
  the authenticated user's personal information (now including the postal address,
  which login and refresh also carry). New env: `JWT_MFA_SECRET`, `JWT_MFA_TTL`,
  `TWO_FACTOR_ENCRYPTION_KEY`, `TWO_FACTOR_ISSUER`.
- **Earnings context.** `GET /api/v1/caregiver/earnings/current` returns the
  current pay period wallet summary: period dates and progress, approved versus
  pending hours, a priced breakdown (regular, overtime, weekend bonus, gross,
  deductions, net) and estimated pay and projected earnings. Hours come from the
  caregiver's visits (completed count as approved), priced through a per caregiver
  `CaregiverPayRate` with rules in basis points and money in integer minor units.
  The pay rule figures are placeholders pending real numbers; there is no capture
  path yet (admin deferred).
- **Availability context.** `GET /api/v1/caregiver/availability` fetches a day or
  a range; `PUT /api/v1/caregiver/availability` sets (replaces) the windows for a
  day. Slots are minutes from midnight, ordered and non overlapping.
- **Family owner home dashboard (family-dashboard context).**
  `GET /api/v1/family/dashboard` aggregates, for the owner's recipients, today's
  visit and its care: recipient card, today's progress, the recent activity feed
  and the assigned caregiver. Read only; composes the care recipients, visits and
  identity contexts through local directory ports.
- **Family owner Care section (family-care context).** Owner scoped reads:
  `GET /api/v1/family/care-recipients/:id/overview` (Care Overview: card, plan
  name from the recipient's booking, caregiver, summary counts),
  `.../health` (today's vitals classified NORMAL or ATTENTION, plus observations),
  `.../care-plan` (plan name, services from care needs, schedule from the care
  schedule; goals, primary/backup/coordinator roles and instructions are office
  set and returned empty until an admin surface exists), `.../visits` (current and
  past visits), and `GET /api/v1/family/visits/:id` (full Visit Detail: Timeline,
  Task, Health, Notes, Photos). Notes surface the visit's single care team and
  family note (a multi note feed with unread counts is not modeled); Photos return
  keys only (storage deferred).
- **Care requests context.** `POST /api/v1/family/care-recipients/:id/care-requests`
  submits a family owner's request for additional care (type, date, start time,
  duration, reason) as a `PENDING` `AdditionalCareRequest` for the office to
  action; the office surface is deferred.
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

Status: build, lint (zero warnings) and unit tests pass (260 unit tests at the
time of writing); `npm audit` is at zero runtime vulnerabilities (3 high severity
in `deepmerge-ts` via the Prisma CLI dev dependency only, not in the runtime
bundle). The repository lives at `Documents/Others/anuheritagehomecare-api`. Git
remote is `github.com/Anu-Heritage-Homecare/anuheritagehomecare-api` (token was
scrubbed from the remote URL; rotate any token that was shared in chat).

**Committed state and current focus (read first when resuming).** The entire
mobile app backend (family owner app and caregiver app) is now built and
committed on branch `feat/care-recipient-onboarding`, screen by screen against
the mockups. That includes everything in the "added later" bullets above plus the
later review screens: the caregiver active shift, structured medications, tracking
`EMERGENCY` mode, identity two factor and `GET /auth/me`, earnings, availability
(with the single day picker that greys out booked slots), the family dashboard and
Care section, billing and invoices, and the full profile account area
(notifications, care circle care codes, account security with device sessions and
login activity, display preferences, and the read only calendar feed). It all
builds, lints clean and tests green (373 unit tests at the last screen).

The **mobile app is feature complete for now and parked. The current focus is the
admin back office**, built screen by screen against its own mockups (owner: "that's
all for the mobile app for now, so switching to the admin"). Admin has SEPARATE
auth from the mobile app. The first admin screen, the operations **Dashboard**, is
built end to end and committed (five commits, `1103536`..`61075f0`):

- **`admin-identity`** context: separate back office auth with its own `AdminUser`
  table, its own JWT secrets (`JWT_ADMIN_ACCESS_SECRET`/`JWT_ADMIN_REFRESH_SECRET`),
  an `admin-jwt-access` passport strategy and rotating `AdminSession`s. Endpoints
  under `/api/v1/admin/auth` (`login`, `refresh`, `logout`, `password/change`,
  `me`). A mobile token can never authenticate an admin route or the reverse. The
  shared admin guard, principal and `CurrentAdmin` decorator live in
  `src/shared/presentation/`. Admins are provisioned out of band (seed deferred).
- **`visits`**: added a care `type` and triage `priority`, and made the caregiver
  optional (Unassigned visits) with `assignedAt` and an `assignCaregiver` domain
  method; the family reads were guarded to tolerate a null caregiver.
- **`admin-alerts`** and **`admin-tasks`**: full contexts with controllers
  (`/api/v1/admin/alerts`, `/api/v1/admin/tasks`). **`care-ratings`** and
  **`certifications`**: read model contexts (capture surfaces deferred to their
  own screens).
- **`admin-dashboard`**: `GET /api/v1/admin/dashboard` aggregates the whole home
  screen, plus `POST /api/v1/admin/visits/:id/assign`. Reading the dashboard runs
  an idempotent detection sweep that raises Late Caregiver, Missed Clock in and
  Certification Expiring alerts. Revenue today is deliberately null (payments are
  per currency and cannot be summed into one honest figure yet).

Admin work still deferred (named by the slices above): caregiver provisioning
(sets `mustChangePassword`, issues the temporary password) and admin user
management; how visits get created and assigned from bookings and subscriptions
(only the assign action exists); the office set care plan data (care goals,
primary/backup/coordinator caregiver roles, care instructions); actioning
`AdditionalCareRequest`s; the caregiver movement audit read model over
`LocationPing`; capturing real `CaregiverPayRate` figures; the KYC mismatch audit;
a real per market revenue-today read; and the ratings and certifications capture
surfaces. The next admin screen drives the next work.

The only local working tree changes are two long standing unrelated edits left
untouched every commit (`prisma/seed.ts` and the visits photo ticket spec).
Nothing is pushed. When asked to commit, split into logical per feature commits;
per the owner's global rules use `--no-verify`, never add a Claude/Anthropic co
author, and push only when explicitly asked (to `origin-mattie HEAD:dev`).

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
npm install
npm run prisma:generate
npm run prisma:deploy         # apply committed migrations to the database
npm run prisma:seed           # populate the care plans catalog
npm run start:dev             # http://localhost:3000/api, docs at /api/docs
```

Before every commit: `npm run lint` and `npm test` must pass with zero warnings.

## Database and migrations

A managed PostgreSQL (CloudClusters) is provisioned and the baseline migration
(`prisma/migrations/0_init`) is applied; the catalog is seeded. The connection
string lives in `.env` (gitignored, never committed). `npm run prisma:seed` loads
`.env` on its own.

The application role on the managed database has no database level CREATE
privilege, so `prisma migrate dev` (which provisions a shadow database) cannot be
used against it. Author migrations the shadow free way instead:

```
# 1. Edit prisma/schema.prisma, then regenerate the client
npm run prisma:generate
# 2. Author a migration by diffing the LIVE database against the schema
#    (a read only introspection; writes a timestamped migration folder)
npm run prisma:migration:new -- <migration_name>
# 3. Review the generated SQL, then apply and record it
npm run prisma:deploy
# 4. Confirm the database is in sync
npm run prisma:status
```

If a `deploy` ever fails midway, mark it rolled back with
`npx prisma migrate resolve --rolled-back <migration_name>`, fix the SQL, and
redeploy. `prisma migrate diff`/`deploy` never provision a shadow database, so they
work with only the application role.

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

- **Resume checklist (read first when continuing in a new conversation).** The
  mobile app backend is feature complete and committed (see the committed state
  note above); the mobile screen by screen review is done. **The current focus is
  the admin module**, which is not built yet. Start there. The admin work that
  earlier slices deferred into it: caregiver provisioning (issues the temporary
  password and sets `mustChangePassword`) and admin users; how visits are created
  and assigned from bookings and subscriptions; the office set care plan data
  (care goals, primary/backup/coordinator caregiver roles, care instructions);
  actioning `AdditionalCareRequest`s; the caregiver movement audit read model over
  `LocationPing`; capturing real `CaregiverPayRate` figures; and the KYC audit
  review of stored mismatches. Open owner owned decisions still pending: the real
  earnings pay rule figures and pay period anchor (placeholders), real catalog
  prices in `prisma/seed.ts`, and provider credentials plus a database to verify
  payments and KYC end to end. The only unbuilt mobile area is the Messages tab /
  chat context, which was flagged but never requested.
- The `clients` context is a reference pattern; real bounded contexts (for
  example care workers, scheduling) beyond what exists are not built yet. How
  visits are created and assigned to caregivers (from bookings and subscriptions,
  or by an admin) is still deferred; the schedule and the family reads read
  whatever visits exist.
- The mobile `identity` context covers signup, login, email verification,
  password reset, and the forced first login password change for provisioned
  caregivers (the `mustChangePassword` flag plus `POST /auth/password/change`).
  Still to do for identity: the admin module and admin users and the caregiver
  provisioning surface that sets `mustChangePassword` and issues the temporary
  password (deferred deliberately; the flag and change flow are ready for it),
  phone verification by SMS, and a full `Family` aggregate (for now a family
  owner is a `FAMILY_MEMBER` flagged `isFamilyOwner`). The caregiver home
  dashboard is deferred until the visits, scheduling and earnings contexts exist,
  since it only aggregates their data.
- The `care-recipients` context covers the loved one onboarding wizard end to
  end. Still to do: a real profile photo upload endpoint (storage was not
  provisioned, so only an opaque `photoKey` is stored for now); restricting
  creation to family owners specifically once caregiver accounts exist (today any
  authenticated user can own a record, and access is owner scoped); and any
  richer care plan modelling that scheduling will need later.
- Care plan checkout: Phase 1 (catalog, Flexible bookings, monthly
  subscriptions, server side pricing) and Phase 2 (payments: Stripe and Paystack
  behind a gateway port, initiate, saved methods, signed webhooks) are both
  built. Still to do before payments go live: provider test credentials and a
  database, then verify the full charge and webhook flow end to end against
  Stripe and Paystack test accounts; wire real card tokenisation so saved payment
  methods are populated (only listing exists today); and replace the placeholder
  catalog prices in `prisma/seed.ts` with real figures.
- Nothing is pushed. When asked to push, confirm the branch/remote first.
- The `identity` migration (`User`, `VerificationCode`, `RefreshToken`) and the
  `care-recipients` migration (`CareRecipient` plus the `Gender`, `CareNeed`,
  `CareFrequency`, `CareRecipientStatus` and `OnboardingStep` enums) and the
  care plans, bookings and payments migration (`CarePlan`, `CarePlanPrice`,
  `Booking`, `Subscription`, `Payment`, `PaymentMethod` plus the `Currency`,
  `BillingModel`, `CarePlanType`, `BookingStatus`, `SubscriptionStatus`,
  `PaymentProvider`, `PaymentStatus` and `PayableType` enums), the `visits`
  migration (`Visit`, `VisitTask` plus the `VisitStatus` enum, and the
  `mustChangePassword` column on `User`), and the location and geofence migration
  (`LocationPing` plus the `LocationMode` enum, the `latitude`/`longitude` columns
  on `CareRecipient`, and the `clockInAt`/`clockOutAt`/`arrivalLatitude`/
  `arrivalLongitude` columns on `Visit`), and the KYC face match migration (the
  new `FaceMatchOutcome` enum, the `REJECTED` status and `DRIVERS_LICENSE`
  document type, and the `claimedFirstName`/`claimedLastName`/`claimedDateOfBirth`/
  `faceMatch`/`mismatches` columns on `KycVerification`, with `documentType` and
  `maskedReference` now nullable and `SSN_LAST4` removed), and the later additions
  from this session (the `Medication`, `VisitBreak`, `MedicationAdministration`,
  `VisitVitals`, `SosAlert` models and their enums, `ON_BREAK`, the visit note,
  observation and vitals `temperatureTenths` columns, the `VisitTask.completedAt`
  column, `LocationPing.sosAlertId` and `EMERGENCY`, the `CaregiverPayRate`,
  `CaregiverAvailability`/`CaregiverAvailabilitySlot`, `AdditionalCareRequest` plus
  `CareRequestStatus` models, the `TwoFactorRecoveryCode` model and the
  `twoFactorEnabled`/`twoFactorSecret` columns on `User`) were all captured in the
  baseline migration `prisma/migrations/0_init` and APPLIED to the managed
  CloudClusters database, and the catalog is seeded. For any later schema change,
  follow the shadow free flow in "Database and migrations" above
  (`prisma:generate`, `prisma:migration:new`, review, `prisma:deploy`,
  `prisma:status`). Run `npm run prisma:generate` after any schema edit.
