# LogiXair operations record — daily logs

Day 1 began at 06:00 IST on 12 Oct 2026. Every operating day runs 06:00 → 06:00 IST, and one simulated day is one calendar day.
The GitHub Action in `.github/workflows/record.yml` flies the shared record forward every hour and, when a day closes, writes it here:

- `days.csv` — one row per day per line (MM India middle-mile, NV Navy, OF Offshore, SEA Southeast Asia) plus an ALL row: revenue (₹, dry and wet), tonnes, tonne-km, pods, consignments, legs, empty legs, load factor, flight hours, holds, late legs, checks, aircraft stood down, the day's demand factor and any calendar event.
- `day-NNN.json` — the full day: totals per line, per hub and per corridor, and every leg flown (callsign, departure and arrival in seconds since 12 Oct 00:00 IST, from, to, corridor, kg, cargo class, revenue, km, late, MRO ferry).
- `index.json` — the list of archived days.

The running state itself lives on the `record` branch (`state.json.gz`), which `index.html` loads so every viewer opens on today.
