# JKUAT Industrial Park Meeting Attendance

A full-featured event attendance management system for JKUAT Industrial Park Limited.

## Architecture

This is a **pure frontend React SPA** (Single Page Application) built with Vite + React + TypeScript + TailwindCSS. It communicates directly with Supabase for:
- **Authentication**: Supabase Auth (email/password, session management)
- **Database**: Supabase Postgres via the JS client (with Row Level Security)
- **Realtime**: Supabase Realtime channels for live attendance dashboard
- **Edge Functions**: Supabase Edge Function `manage-admin` handles admin user creation/deletion with service role key (server-side, secure)
- **Storage**: Supabase Storage bucket `signatures` for signature images

## Key Pages

- `/` — Redirects to `/admin`
- `/admin` — Admin login
- `/admin/dashboard` — Admin dashboard (events, attendance logs, manage admins)
- `/checkin?event=<eventId>` — Public check-in form (no auth required)
- `/event/:id/live` — Live attendance display (public, real-time)

## Roles

- **super_admin** — Full access; can manage events, attendance logs, admins
- **admin** — Restricted access based on permissions (export_data, create_events, manage_attendance)

## Tech Stack

- React 18 + TypeScript
- Vite 5 (dev server on port 5000)
- TailwindCSS + shadcn/ui components
- @supabase/supabase-js for database + auth + realtime
- @tanstack/react-query for data fetching
- react-router-dom v6 for routing
- jsPDF + jspdf-autotable for PDF export
- xlsx for Excel export
- qrcode.react for QR code generation
- react-hook-form + zod for form validation

## Environment Variables

Set in Replit environment (shared):
- `VITE_SUPABASE_URL` — Supabase project URL
- `VITE_SUPABASE_PUBLISHABLE_KEY` — Supabase anon/public key
- `VITE_SUPABASE_PROJECT_ID` — Supabase project ID

## Running

The app runs with `npm run dev` which starts Vite on port 5000.

## Database Schema (Supabase)

Tables:
- `events` — Event records (title, date, venue, times)
- `attendance_logs` — Check-in records per event
- `user_roles` — Admin role assignments (super_admin | admin)
- `admin_permissions` — Granular permissions per admin user
- `admin_login_logs` — Login audit trail

Views:
- `attendance_logs_public` — Public-facing subset for live dashboard (no email/phone)

Functions (RPCs):
- `has_role(_user_id, _role)` — Check if a user has a specific role
- `list_admins()` — List all admin users with roles

Edge Function:
- `manage-admin` — Create/delete admin users (requires super_admin, uses service role key)
