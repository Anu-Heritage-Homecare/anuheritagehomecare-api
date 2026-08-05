# CLAUDE.md — Anu Heritage Homecare API

Guidance for any AI assistant and engineer working in this repository.

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

- NestJS 10 on Node 22, TypeScript strict mode.
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
