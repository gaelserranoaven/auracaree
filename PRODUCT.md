# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Buyer (landing page's primary audience):** directors and coordinators of *centros de protección de persona mayor* in Bogotá, typically foundations that operate under contract with the SDIS (Secretaría Distrital de Integración Social). They decide whether their centers adopt AuraCare. What they need to believe: the record is legally defensible, supervision-ready, and simple enough for their nursing staff.
- **Daily users (the app):** auxiliares de enfermería on day (06:00–17:59) and night (18:00–05:59) shifts, often on shared computers or their phones; médicos / jefes de enfermería; administradores de sede y de turno; SDIS interventoría (read-only).

## Product Purpose

AuraCare is the care record for elderly-care protection centers: sealed clinical notes, vital signs with automatic alerts, attendance, supplies (dotación), belongings in custody, and signed shift handover — generating the SDIS FOR-PSS-729 formats from the daily record. Success: a center runs its shifts and passes SDIS supervision without paper and without disputes about who wrote what, when.

## Positioning

Clinical notes that cannot be edited or deleted: the server stamps date, time and author and chains each note to the previous one with a SHA-256 seal per site, and anyone authorized can verify the chain. Built around Bogotá's SDIS format and shift structure, not a generic EHR.

## Operating Context

- Two shifts per day in Bogotá time; shift handover is a ritual the product formalizes.
- SDIS format FOR-PSS-729 sections 1 (dotación), 4 (pertenencias), 5 (asistencia), 6 (novedades de salud), printed to PDF.
- Legal frame: Ley 1581 de 2012 (sensitive health data), Resolución 1995 de 1999 (clinical record integrity).
- Multi-site foundations; six roles; accounts approved by an administrator.

## Capabilities and Constraints

- Web app (React + Supabase Auth/Postgres/RLS/Realtime) served as static files from GitHub Pages; the landing page is static HTML/CSS at the repo root and must not require a build step.
- Six roles enforced in the database (RLS, migration 04 applied 2026-09-28).
- Session auto-closes after 20 minutes of inactivity.
- Pilot starts 2026-09-28 in one real site.
- Primary landing action: book a demo via WhatsApp (+57 310 824 7722). Secondary: sign in; request access.

## Brand Commitments

- Name: **AuraCare** (wordmark "Aura" + "Care"); logo is a rounded square with an ECG line. Spanish (Colombia) copy, tuteo.
- The user asked for a modern, technological, professional presentation in the spirit of Apple / Android product pages, and a new, better-matched color palette (the previous navy + mint pairing was judged not to combine well).

## Evidence on Hand

- Real app UI (screens can be recreated as demonstrations with sample data, labeled as such).
- Pilot in a real site from 2026-09-28 (no metrics yet).
- **Absent — must not be fabricated:** customer logos, testimonials, usage numbers, prices, certifications.

## Product Principles

1. The record is the product: integrity and traceability come before convenience.
2. Built for the shift, not the desk: fast entry, urgent things first, works on a phone.
3. Supervision-ready by default: every screen should make an SDIS visit easier, not harder.
4. Honest claims only.

## Accessibility & Inclusion

WCAG 2.1 AA. Staff use shared computers and phones under ward lighting, including night shift; older users among staff and supervisors.
