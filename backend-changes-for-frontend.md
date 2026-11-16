# Backend API changes for the mobile app

**Date:** 2026 11 16
**Audience:** mobile app frontend developer (family owner app and caregiver app)
**Base URL:** every path below is under `/api/v1` (for example `POST /api/v1/bookings`).
**Auth:** unless noted, every endpoint needs the user bearer token (`Authorization: Bearer <accessToken>`).

This covers the six backend changes shipped in the latest release. Four are
**breaking** (the app must change to keep working) and two are **additive** (new
capabilities you should adopt). The database migrations are already applied to
the shared database, so there is nothing to run on your side.

---

## Summary

| # | Change | Type | What you must do |
|---|--------|------|------------------|
| 1 | Flexible booking and quote require `planType` | **Breaking** | Send the selected `planType` on the quote and the create |
| 2 | Location ingest requires a `clientId` per point | **Breaking** | Attach a stable UUID to every queued point |
| 3 | `register-and-link` endpoint removed | **Breaking** | Drop the pre registration screen; use sign up then redeem |
| 4 | Care code join now needs owner approval | **Breaking (behaviour)** | Handle the pending state; build the owner approval screen |
| 5 | Caregiver availability optimistic concurrency | Additive | Send `expectedRevision`; handle `409` |
| 6 | Consent acceptance recorded | Additive | Call the consent endpoint; read `consentAcceptedAt` |

---

## 1. Flexible booking and quote now require `planType` (breaking)

The Flexible booking request did not send the plan the user selected, so the
backend hard coded the Flexible plan and the price shown could drift from the
booking created. Both the quote and the create now carry the selected plan and
price from it, so the quote always matches the booking.

**`planType` enum values:** `FLEXIBLE`, `STANDARD_MONTHLY`, `PREMIUM`, `LIVE_IN`.
For these two endpoints the plan **must be the hourly (pay as you go) plan**
(`FLEXIBLE`). Sending a monthly plan is rejected, because monthly plans go
through the subscription flow, not here.

**`GET /api/v1/bookings/quote`** — query now requires `planType`:
```
GET /api/v1/bookings/quote?planType=FLEXIBLE&hours=6&date=2026-12-01&startMinute=540
```

**`POST /api/v1/bookings`** — body now requires `planType`:
```jsonc
{
  "planType": "FLEXIBLE",          // NEW, required
  "careRecipientId": "<uuid>",
  "hours": 6,
  "date": "2026-12-01",
  "startMinute": 540
  // ...existing fields unchanged
}
```

**What you must do:** add `planType` to the quote query and the create body. For
the Flexible flow send `FLEXIBLE`. Money and currency are still computed on the
server; never send amounts. Omitting `planType` now returns `400`.

---

## 2. Location ingest requires a `clientId` per point (breaking)

The caregiver app queues location points offline and pushes them later. Ingest
used to be an append only insert, so re pushing a batch duplicated every point.
Each point now carries a client generated `clientId` that is unique per
caregiver, and the server skips duplicates, so replaying a batch stores only the
points not already saved.

**`POST /api/v1/caregiver/locations`** — every item in `points` now requires
`clientId` (a UUID):
```jsonc
{
  "points": [
    {
      "clientId": "9f1d2c3b-4a5e-6789-0abc-def012345678", // NEW, required, UUID
      "latitude": 37.3861,
      "longitude": -122.0839,
      "mode": "NAVIGATION",
      "recordedAt": "2026-07-12T09:12:00.000Z"
      // accuracyMeters?, visitId?, sosAlertId? unchanged
    }
  ]
}
```

**Response:**
```jsonc
{ "accepted": 12 }   // how many were newly stored; a full replay returns 0
```

**What you must do:** generate a stable `clientId` when a point is first queued
and reuse the same value on every retry or replay (do not regenerate it on
resend). That is what makes the dedupe work. A missing or non UUID `clientId`
returns `400`. Use the `accepted` count to confirm how many new points landed.

---

## 3. The `register-and-link` endpoint was removed (breaking)

`POST /api/v1/profile/care-circle/register-and-link` is **gone** (now `404`). It
created the account and the circle membership in one call, which forced a bespoke
pre registration screen and an email verification handoff that clashed with the
normal post login flow.

**New flow for a person without an account who wants to join a circle:**
1. Sign up the normal way (`POST /api/v1/auth/register`).
2. Verify their email.
3. Log in.
4. Redeem the care code through the normal redeem endpoint (see change 4).

**What you must do:** remove the pre registration / register and link screen and
route these users through the standard sign up then redeem path. The public care
code **preview** endpoint (name and avatar for the confirmation step) is
unchanged.

---

## 4. Care code join now needs owner approval (breaking behaviour)

Redeeming a care code no longer grants instant access. A care code is a seven day
bearer credential, so joining immediately meant a leaked code gave an unapproved
person access to sensitive care information. Redeeming now raises a **pending**
membership that the owner must approve before any access is granted.

### Joiner side

**`POST /api/v1/profile/care-circle/redeem`** — body unchanged
(`{ code, relationship? }`), but the response now tells you it is pending:
```jsonc
{
  "ownerName": "Joseph Simon",
  "alreadyMember": false,
  "pending": true    // NEW: true while awaiting owner approval; the joiner has NO access yet
}
```
Until approved, the joiner is not returned by `GET /api/v1/profile/care-circle`
(that endpoint lists only approved members) and the access guard treats them as
having no access.

**What you must do (joiner):** after redeem, show a "waiting for approval" state
driven by `pending`. Do not assume access was granted.

### Owner side (new screens)

Three new owner scoped endpoints power the Pending Invitations screen:

**`GET /api/v1/profile/care-circle/requests`** — list pending requests:
```jsonc
{
  "requests": [
    {
      "id": "<membershipId>",
      "name": "Jane Doe",
      "relationship": "Daughter",
      "photoUrl": null,
      "requestedAt": "2026-09-13T00:00:00.000Z"
    }
  ]
}
```

**`POST /api/v1/profile/care-circle/requests/:id/approve`** — approve, activating
the membership. Optional body:
```jsonc
{
  "accessLevel": "LIMITED",   // optional, one of LIMITED | VIEW_ONLY | FULL
  "relationship": "Daughter"  // optional, lets the owner correct the self chosen relationship
}
```
Returns `204 No Content`.

**`POST /api/v1/profile/care-circle/requests/:id/reject`** — reject and remove the
request. Returns `204 No Content`.

**What you must do (owner):** point the Pending Invitations screen at
`GET .../requests` and wire approve/reject. The `:id` is the request `id` from the
list.

---

## 5. Caregiver availability optimistic concurrency (additive)

Setting a day's availability was a blind replace, so two devices editing the same
day silently overwrote each other. Each day now carries a `revision` that is
bumped on every change.

**`GET /api/v1/caregiver/availability`** — each day in the response now includes:
```jsonc
{ "date": "2026-07-11", "revision": 3, "slots": [ /* ... */ ] }
```

**`PUT /api/v1/caregiver/availability`** — the set request may now include
`expectedRevision`:
```jsonc
{
  "date": "2026-07-11",
  "expectedRevision": 3,   // NEW, optional: the revision you last fetched
  "slots": [ /* ... */ ]
}
```
- If `expectedRevision` no longer matches the stored day, the write is rejected
  with **`409 Conflict`** so you can reconcile instead of overwriting.
- Omitting `expectedRevision` overwrites unconditionally (a first time set is
  unaffected).

**What you should do:** keep the `revision` from the read, send it back as
`expectedRevision` on save, and on `409` refetch the day and ask the user to
retry or merge. This is optional but recommended to stop cross device clobbering.

---

## 6. Consent acceptance is now recorded (additive)

The app asks the family user to accept consent, but nothing recorded it, so the
client could not tell whether consent was already accepted on another device.

**`POST /api/v1/auth/consent`** (new) — records that the authenticated user
accepted the consent terms and returns the updated profile. Idempotent: the first
acceptance timestamp is kept, so calling it again does not move it.

**`GET /api/v1/auth/me`** — the profile now includes:
```jsonc
{
  // ...existing profile fields
  "consentAcceptedAt": "2026-11-15T09:30:00.000Z"  // NEW, ISO string, or null if never accepted
}
```

**What you should do:** call `POST /auth/consent` when the user accepts the terms,
and read `consentAcceptedAt` on the profile to decide whether to show the consent
gate (skip it when it is already set, including on a fresh device).

---

## Migrations

All schema changes (care circle member status, availability revision, user
`consentAcceptedAt`, location ping `clientId`) are already applied to the shared
database. Nothing to run on your side.

## Questions

If any request or response shape here does not match what you see against the
running API, flag it and we will reconcile the contract.
