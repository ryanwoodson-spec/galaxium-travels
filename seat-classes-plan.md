# Seat Classes Plan — Galaxium Travels

## Overview

Add three seat classes — **Economy**, **Business**, and **Galaxium** — to the flight booking system.
Each class has its own independent seat pool stored directly on the `Flight` table.
Pricing is derived from the flight's base price using fixed multipliers (no new DB columns).
The selected class is stored on the `Booking` record and displayed in My Bookings.

### Key Decisions
- `seats_available` removed from `Flight`; replaced by `seats_economy`, `seats_business`, `seats_galaxium`
- `seat_class` column added to `Booking` (`"economy" | "business" | "galaxium"`)
- Price multipliers: Economy = 1×, Business = 2.5×, Galaxium = 5× (computed, not stored)
- Class selector added as a step inside the existing `BookingModal` before the confirm button
- MCP tools updated to accept `seat_class`; seed data updated to populate all three pools

### Multipliers (reference)
| Class     | Multiplier | Example (base $1,000,000) |
|-----------|-----------|--------------------------|
| Economy   | 1×        | $1,000,000               |
| Business  | 2.5×      | $2,500,000               |
| Galaxium  | 5×        | $5,000,000               |

---

## Sub-Tasks

---

### Sub-Task 1 — Backend: Update data models and schemas

**Status:** `[ ] pending`

**Intent**
Replace the single `seats_available` column with three class-specific seat columns on `Flight`,
add `seat_class` to `Booking`, and update all Pydantic schemas to match.
This is the foundation every other sub-task depends on.

**Expected Outcomes**
- `Flight` SQLAlchemy model has `seats_economy`, `seats_business`, `seats_galaxium` (Integer, non-null); `seats_available` removed
- `Booking` SQLAlchemy model has `seat_class` (String, non-null)
- `FlightOut` Pydantic schema exposes the three new seat fields (no `seats_available`)
- `BookingOut` Pydantic schema exposes `seat_class`
- `BookingRequest` Pydantic schema requires `seat_class`

**Todo List**
1. In `models.py`: remove `seats_available` column; add `seats_economy`, `seats_business`, `seats_galaxium` Integer columns (non-null)
2. In `models.py`: add `seat_class` String column (non-null) to `Booking`
3. In `schemas.py`: update `FlightOut` — remove `seats_available`; add `seats_economy`, `seats_business`, `seats_galaxium`
4. In `schemas.py`: update `BookingOut` — add `seat_class: str`
5. In `schemas.py`: update `BookingRequest` — add `seat_class: str`

**Relevant Context**
- `booking_system_backend/models.py` — `Flight` and `Booking` SQLAlchemy models
- `booking_system_backend/schemas.py` — `FlightOut`, `BookingOut`, `BookingRequest` Pydantic schemas
- Database is SQLite; no migration tooling — `db.py` calls `Base.metadata.create_all()` on startup, so dropping and recreating the DB is acceptable in dev

---

### Sub-Task 2 — Backend: Update booking service logic

**Status:** `[ ] pending`

**Intent**
Update the booking and cancellation service functions to operate on the correct per-class seat pool
instead of the removed `seats_available` field.
Add validation that the requested class exists and has seats.

**Expected Outcomes**
- `book_flight()` accepts `seat_class`, decrements the matching column (`seats_economy` / `seats_business` / `seats_galaxium`)
- `book_flight()` returns `INVALID_SEAT_CLASS` error for unknown class values
- `book_flight()` returns `NO_SEATS_AVAILABLE` error when the requested class pool is 0
- `cancel_booking()` reads `booking.seat_class` and increments the matching column on the flight
- All existing error codes and validation chain order preserved

**Todo List**
1. In `services/booking.py`: update `book_flight` signature to accept `seat_class: str`
2. Add validation: reject unknown `seat_class` values with error code `INVALID_SEAT_CLASS`
3. Replace `flight.seats_available` check and decrement with per-class logic using `seat_class`
4. In `cancel_booking`: read `booking.seat_class`; increment the matching flight column

**Relevant Context**
- `booking_system_backend/services/booking.py` — `book_flight()` and `cancel_booking()` functions
- Current validation order in `book_flight`: flight exists → seats available → user exists → name matches → decrement → create booking
- Existing error codes: `FLIGHT_NOT_FOUND`, `NO_SEATS_AVAILABLE`, `USER_NOT_FOUND`, `NAME_MISMATCH`
- New error code to add: `INVALID_SEAT_CLASS`

---

### Sub-Task 3 — Backend: Update API routes, MCP tools, and seed data

**Status:** `[ ] pending`

**Intent**
Wire the updated service signature through the FastAPI route and MCP tool,
and refresh seed data so all three seat pools are populated from the start.

**Expected Outcomes**
- `POST /book` route passes `seat_class` from `BookingRequest` to `booking.book_flight()`
- MCP `book_flight` tool accepts a `seat_class` parameter and passes it through
- `seed.py` replaces `seats_available` with realistic values for all three class columns
- The app starts cleanly and all existing tests still pass (or are updated to pass)

**Todo List**
1. In `server.py`: update `POST /book` handler to pass `body.seat_class` to `booking.book_flight()`
2. In `server.py`: update MCP `book_flight` tool — add `seat_class` parameter to tool definition and handler call
3. In `seed.py`: replace `seats_available=N` with `seats_economy=N`, `seats_business=N`, `seats_galaxium=N` on all 10 flight records; use varied but realistic counts (e.g. economy: 5–10, business: 2–4, galaxium: 1–2)
4. Review `tests/` directory; update any test that references `seats_available` or the old `book_flight` signature

**Relevant Context**
- `booking_system_backend/server.py` — FastAPI route handlers and MCP tool definitions
- `booking_system_backend/seed.py` — 10 Flight seed records, 20 Booking seed records
- `booking_system_backend/tests/` — existing pytest suite
- MCP tool `book_flight` currently takes `(user_id, name, flight_id)`; needs `seat_class` added

---

### Sub-Task 4 — Frontend: Update TypeScript types and API client

**Status:** `[ ] pending`

**Intent**
Keep the frontend type system and API client in sync with the updated backend contracts.
Add the `SeatClass` union type as a single source of truth for the three classes,
and add seat-class helpers to the formatters utility.

**Expected Outcomes**
- `Flight` type has `seats_economy`, `seats_business`, `seats_galaxium`; `seats_available` removed
- `Booking` type has `seat_class: SeatClass`
- `BookingRequest` type has `seat_class: SeatClass`
- New `SeatClass` union type exported from `types/index.ts`
- `bookFlight()` in `api.ts` passes `seat_class` in the request body
- `formatters.ts` exports `getSeatClassLabel(cls: SeatClass): string` and `getSeatClassMultiplier(cls: SeatClass): number`

**Todo List**
1. In `types/index.ts`: add `export type SeatClass = 'economy' | 'business' | 'galaxium'`
2. Update `Flight` interface: remove `seats_available`; add `seats_economy: number`, `seats_business: number`, `seats_galaxium: number`
3. Update `Booking` interface: add `seat_class: SeatClass`
4. Update `BookingRequest` interface: add `seat_class: SeatClass`
5. In `services/api.ts`: `bookFlight` already accepts `BookingRequest`; no signature change needed — the type update in step 3 propagates automatically
6. In `utils/formatters.ts`: add `getSeatClassLabel` mapping (`economy` → `"Economy"`, `business` → `"Business"`, `galaxium` → `"Galaxium"`) and `getSeatClassMultiplier` (`economy` → `1`, `business` → `2.5`, `galaxium` → `5`)

**Relevant Context**
- `booking_system_frontend/src/types/index.ts`
- `booking_system_frontend/src/services/api.ts` — `bookFlight(data: BookingRequest)`
- `booking_system_frontend/src/utils/formatters.ts` — existing `formatCurrency` helper (integers, no decimals)
- Note: `formatCurrency` uses integer prices; class prices must be `Math.round(basePrice * multiplier)` before formatting

---

### Sub-Task 5 — Frontend: Update FlightCard to show per-class availability

**Status:** `[ ] pending`

**Intent**
Replace the single "X seats available" display with a per-class breakdown so users can
see availability and computed price for each class before clicking Book Now.

**Expected Outcomes**
- `FlightCard` shows three rows/badges: Economy, Business, Galaxium — each with seat count and computed price
- A class is visually marked as "Sold Out" when its seat count is 0
- Low-seat warning (≤ 2) applies per class
- The "Book Now" button is only disabled when **all three classes** are sold out
- Overall look and feel stays consistent with the existing cosmic/glass-card design

**Todo List**
1. Read `FlightCard.tsx` fully before editing
2. Replace `flight.seats_available` references with per-class counts
3. Render a seat-class availability row for each of the three classes using `getSeatClassLabel`, `getSeatClassMultiplier`, and `formatCurrency`
4. Update "Sold Out" and low-seat logic to operate per-class; disable Book Now only if all classes are 0
5. Ensure no TypeScript errors; run build to verify

**Relevant Context**
- `booking_system_frontend/src/components/flights/FlightCard.tsx`
- `getSeatClassLabel` and `getSeatClassMultiplier` from `utils/formatters.ts` (added in Sub-Task 4)
- `formatCurrency` from `utils/formatters.ts`
- Existing card uses Tailwind classes and `framer-motion`; maintain the same styling conventions

---

### Sub-Task 6 — Frontend: Add class selector to BookingModal and update BookingCard

**Status:** `[ ] pending`

**Intent**
Let users choose their seat class inside `BookingModal` before confirming,
and display the booked class on `BookingCard` in My Bookings.
Update `useBookingFlow` to carry the selected class through to the API call.

**Expected Outcomes**
- `BookingModal` shows a class-selector step with Economy / Business / Galaxium options, seat availability per class, and computed price for each
- Selecting a class with 0 seats is not allowed (option disabled)
- The confirm button shows the final price for the selected class
- `BookingCard` displays the booked seat class (e.g. a badge or label)
- `useBookingFlow` carries `selectedSeatClass` state and passes it to `bookFlight`
- TypeScript compiles cleanly; build passes

**Todo List**
1. Read `BookingModal.tsx`, `BookingCard.tsx`, and `useBookingFlow.ts` fully before editing
2. In `useBookingFlow.ts`: add `selectedSeatClass: SeatClass | null` state; expose setter; pass it to `bookFlight` in `handleBookingSuccess`
3. In `BookingModal.tsx`: add a class-selector UI section above the confirm button — three selectable cards/buttons showing label, seat count, and computed price; default to `'economy'`; disable options with 0 seats; on class change, call the setter from `useBookingFlow`
4. In `BookingModal.tsx`: update the confirm button label to show the selected class price
5. In `BookingCard.tsx`: add a seat class badge/label using `getSeatClassLabel`
6. Run build; fix any TypeScript errors

**Relevant Context**
- `booking_system_frontend/src/components/bookings/BookingModal.tsx`
- `booking_system_frontend/src/components/bookings/BookingCard.tsx`
- `booking_system_frontend/src/hooks/useBookingFlow.ts`
- `booking_system_frontend/src/pages/Flights.tsx` — passes `onSuccess` to `BookingModal`; no changes expected here
- `SeatClass` type and formatter helpers from Sub-Tasks 4 and 5

---

## Dependency Order

Sub-Tasks must be completed in order:

```
Sub-Task 1 (models + schemas)
    ↓
Sub-Task 2 (booking service)
    ↓
Sub-Task 3 (routes + MCP + seed)
    ↓
Sub-Task 4 (TS types + API client + formatters)
    ↓
Sub-Task 5 (FlightCard UI)
    ↓
Sub-Task 6 (BookingModal + BookingCard + useBookingFlow)
```
