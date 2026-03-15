

## Plan: Chronological Ascending Sort for Dashboard and PDF

### Problem
Both `AdminDashboard.tsx` and `LiveDashboard.tsx` fetch attendance logs sorted by `created_at` **descending** (newest first). The user wants **ascending** (oldest first) so S/NO 1 = first check-in.

### Changes

**1. `src/pages/AdminDashboard.tsx` (line ~130)**
- Change `{ ascending: false }` → `{ ascending: true }` in `fetchLogs`
- The S/NO column in both the dashboard table and PDF `autoTable` already uses array index + 1, so ascending order automatically makes S/NO 1 = first attendee.

**2. `src/pages/LiveDashboard.tsx` (line ~53)**
- Change `{ ascending: false }` → `{ ascending: true }` in the attendance fetch query
- Note: The "Recent Check-ins" display currently shows `.slice(0, 10)` — this should become `.slice(-10).reverse()` to show the 10 most recent at top while maintaining ascending DB order. Alternatively, keep descending for the live dashboard since it's a "recent" feed. Will keep descending here since "recent check-ins" semantically means newest first.

**3. PDF report** — no separate change needed. The PDF generation in `handlePrintPDF` iterates over `filteredRecords` which derives from `records` state, so fixing the fetch order fixes the PDF order automatically.

### Summary
- One line change in `AdminDashboard.tsx`: ascending sort
- Live Dashboard stays descending (it's a "recent" feed showing latest check-ins)
- S/NO logic already uses index+1, no changes needed

