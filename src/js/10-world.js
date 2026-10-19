/* ============================================================================
   WORLD CONFIG — the one block to edit when real routes, sites or numbers change.
   Every value carries where it came from:
     [thesis]  thesis.logixair.com (DOC LX-001 rev 6.0)
     [conops]  LogiXair Regulatory Framework & ConOps
     [vector]  LogiXair Vector consoles (vector-core.js)
     [mro]     LogiXair MRO calculator
     [model]   modelling assumption made for this twin, not a LogiXair figure
   ========================================================================== */

const L560 = {
  payloadKg: 300,        // [thesis]
  rangeKm: 600,          // [thesis]
  mtowKg: 1350,          // [conops]
  cruiseKmh: 250,        // [conops]
  footprintM: [7, 5],    // [thesis]
  rotors: '6+2',         // [thesis] 4 on the front tilt-wing, 2 on the rear, 2 fixed on the centreline (Fig. 01)
  // [model] flight-profile values the documents do not state
  hoverAltM: 45, liftMs: 2.5, landMs: 1.8, transSpeedMs: 50, transOutS: 26, transInS: 34,
  climbMs: 5.0, accelMs2: 0.6, bankDeg: 25, reservePct: 20
};

const CORRIDOR = {
  halfWidthM: 500,       // [conops] lateral box ±500 m
  floorFt: 1000,         // [conops]
  ceilFt: 6000,          // [conops]
  baseLevelFt: 2200,     // [conops] operating 2,200-2,500 ft
  sepVertFt: 200,        // [vector] vertical minimum
  sepTrailKm: 3.0,       // [vector] longitudinal minimum
  holdRadiusKm: 1.2,     // [vector] hold = 1.2 km orbit
  pilotMax: 15,          // [vector] aircraft per supervisory pilot
  groundLinkKm: 90       // [model] ground C2 reach before SATCOM backup takes over
};

/* Pod and pallet standard. Two pallets per pod is LogiXair's figure; the EUR 1200 x 800 mm footprint is [model]. */
/* Pod: 2.10 x 1.75 x 1.75 m outside, two pallets in tandem [LogiXair]. EUR footprint, wall allowance and load height are [model]. */
const POD = { pallets: 2, palletMm: [1200, 800], lenM: 2.10, widthM: 1.75, heightM: 1.75, loadHm: 1.45 };
const PODY = 0.60;                // pod underside above ground on the aircraft [model]
const AIRFRAME_DY = PODY + POD.heightM - 1.50;   // airframe raised so the pod top meets the spine
const PALLET_M3 = POD.palletMm[0] * POD.palletMm[1] / 1e6 * POD.loadHm;
/* Dock reporting splits cargo in two: wet = temperature-controlled or liquid; everything else moves as dry [model]. */
const WET_TYPES = { COLD: 1, LIQ: 1 };
/* Pod loading at the truck dock, seconds of simulated time [model]: vehicle in, one forklift cycle per pallet, vehicle out. */
const DOCK = { vIn: 52, move: 44, vOut: 50 };
const MX = { basicFh: 175, fullFh: 850, lifeFh: 20000, basicDurS: 3 * 3600 };  // [mro]; duration [model]

/* Tariff, rupees per kg per km [LogiXair]: wet = cold chain and liquid pods, everything else dry.
   Billed on the great-circle distance between the two sites at delivery [model]; maintenance ferries and empty legs earn nothing. */
const TARIFF = { DRY: 0.10, WET: 0.18 };
/* Demand: share of each line's roster wanted in the air, hour by hour (IST) [model] — a peak from 10:00 to 15:00,
   a long evening taper and a thin night service. Airframes not needed stand down wherever their last leg ended:
   in the base line hangar (limited slots), on a stand, or on an outstation's night stand. No positioning legs. */
const DEMAND = [0.15, 0.13, 0.12, 0.12, 0.15, 0.24, 0.38, 0.52, 0.66, 0.8, 0.95, 0.97, 0.97, 0.96, 0.94, 0.82, 0.7, 0.6, 0.5, 0.42, 0.34, 0.27, 0.21, 0.17];
/* offshore flies in daylight only; the navy runs a steady round-the-clock service */
const DEMAND_OF = [0, 0, 0, 0, 0, 0.04, 0.5, 0.85, 0.95, 0.97, 0.97, 0.97, 0.97, 0.97, 0.95, 0.92, 0.85, 0.6, 0.2, 0, 0, 0, 0, 0];
const DEMAND_NV = [0.4, 0.4, 0.4, 0.4, 0.4, 0.5, 0.6, 0.8, 0.9, 1, 1, 1, 1, 1, 1, 0.9, 0.8, 0.7, 0.6, 0.6, 0.5, 0.5, 0.4, 0.4];
/* local hour of a line: sim time is IST; a line abroad keeps its own clock (tz = hours ahead of IST) */
const TZ = {};
const hodOf = (t, scn) => { if (TZ[scn] == null) { const d = SCENARIOS.find(x => x.id === scn); TZ[scn] = d && d.tz ? d.tz : 0; } return (((t / 3600 + TZ[scn]) % 24) + 24) % 24; };
const demandAt = (t, scn) => { const D = scn === 'OF' ? DEMAND_OF : scn === 'NV' ? DEMAND_NV : DEMAND, h = hodOf(t, scn), i = Math.floor(h), f = h - i; return D[i] * (1 - f) + D[(i + 1) % 24] * f; };

/* Day-to-day variation [model]: no two days carry the same cargo. Each operating day gets a factor from its weekday,
   steady growth, the shopping and festival calendar of the market, and an unexplained day-to-day swing; each warehouse
   and corridor gets its own daily factor on top, and the hour carries a little noise. All deterministic from the date,
   so every viewer and the backend runner compute the same day. */
const hash01 = (...k) => { let h = 2166136261; for (const v of k) { const s = String(v); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } h ^= 0x2f; h = Math.imul(h, 16777619); } h ^= h >>> 13; h = Math.imul(h, 0x5bd1e995); h ^= h >>> 15; return (h >>> 0) / 4294967296; };
const WEEKDAY = [0.80, 1.06, 1.04, 1.02, 1.05, 1.09, 0.90];                 // Sunday .. Saturday
const EVENTS = {                                                           // [first day, last day, factor], dates of the operating day
  MM: [['2026-10-20', '2026-10-20', 0.78, 'Dussehra'], ['2026-10-26', '2026-10-31', 1.18, 'pre-Diwali build-up'], ['2026-11-01', '2026-11-06', 1.34, 'Diwali peak'], ['2026-11-07', '2026-11-07', 1.12, 'Diwali eve'],
       ['2026-11-08', '2026-11-08', 0.52, 'Diwali'], ['2026-11-09', '2026-11-09', 0.74, 'after Diwali'], ['2026-12-24', '2026-12-25', 0.78, 'Christmas'], ['2027-01-01', '2027-01-01', 0.70, 'New Year'], ['2027-01-26', '2027-01-26', 0.72, 'Republic Day']],
  SEA: [['2026-11-10', '2026-11-12', 1.38, '11.11 sales'], ['2026-11-13', '2026-11-15', 1.12, '11.11 returns'], ['2026-12-11', '2026-12-13', 1.28, '12.12 sales'], ['2026-12-15', '2026-12-23', 1.22, 'Christmas run-up'],
        ['2026-12-24', '2026-12-25', 0.62, 'Christmas'], ['2026-12-31', '2027-01-01', 0.60, 'New Year']]
};
const dayDate = day => new Date(Date.UTC(2026, 9, 12) + (day - 1) * 86400000);
function dayEvent(day, scn) { const k = dayDate(day).toISOString().slice(0, 10); for (const e of EVENTS[scn] || []) if (k >= e[0] && k <= e[1]) return e; return null; }
const _DF = {};
function dayFactor(day, scn) {
  const key = scn + day; if (_DF[key] != null) return _DF[key];
  return (_DF[key] = dayFactor0(day, scn));
}
function dayFactor0(day, scn) {
  const swing = hash01('day', scn, day);
  if (scn === 'NV') return 0.94 + 0.12 * swing;
  if (scn === 'OF') return 0.9 + 0.18 * swing;
  const e = dayEvent(day, scn), grow = 1 + Math.min(0.6, 0.0035 * Math.max(0, day - 1));
  return WEEKDAY[dayDate(day).getUTCDay()] * grow * (0.86 + 0.28 * swing) * (e ? e[2] : 1);
}
const _LF = {};
const laneFactor = (day, key) => { const k = key + '|' + day; return _LF[k] != null ? _LF[k] : (_LF[k] = 0.68 + 0.64 * hash01('lane', key, day)); };
function hourNoise(t, scn) { const h = t / 3600, i = Math.floor(h), f = h - i, a = hash01('h', scn, i), b = hash01('h', scn, i + 1); return 0.9 + 0.2 * (a + (b - a) * f * f * (3 - 2 * f)); }
/* demand level now: the hourly curve times the day and the hour's noise; above 1 means more cargo than the roster can lift */
const _DL = {};
const demandLevel = (t, scn) => { const q = Math.floor(t / 15), c = _DL[scn]; if (c && c.q === q) return c.v; const v = demandAt(q * 15, scn) * dayFactor(Math.floor((q * 15 - 6 * 3600) / 86400) + 1, scn) * hourNoise(q * 15, scn); _DL[scn] = { q, v }; return v; };
/* Consignments [model]: a pod consolidates parcels and part-loads, 2 to 35 kg mostly, some 35 to 120 kg, a few up to a full 300 kg pallet pair. */
const CONSIGN = { small: 0.55, medium: 0.35 };
/* Operating rules [LogiXair]: a pod is dispatched at least 75% full (consolidated, hold-for-load), and each airframe flies
   10 to 12 hours a day; the day-to-day swing in cargo shows up inside those bands. Prices stay at the tariff. */
const RULES = { minFill: 0.75, maxFill: 0.92, fhDay: [10, 12], lift: { MM: 1.12, SEA: 1.12, NV: 0.78, OF: 1.32 } };
/* roster share wanted at this hour: the hourly curve, lifted so the fleet averages 10-12 FH a day, with the day's swing kept inside that band */
const rosterLevel = (t, scn) => { const d = demandLevel(t, scn) / Math.max(0.05, demandAt(t, scn)), k = clamp(0.92 + 0.22 * (d - 0.8) / 0.5, 0.92, 1.14); return Math.min(1, demandAt(t, scn) * k * (RULES.lift[scn] || 1.12)); };
/* Each rest includes the daily inspection; a duty runs at most maxFh before the airframe must stand down [model]. */
/* A check due within mxWindowFh is pulled forward and done overnight: at the MRO hub when it is close to the base (mroNearKm), else in the base line hangar [model]. */
const DUTY = { maxFh: 12, minRestS: 4 * 3600, minDutyFh: 1.5, mxWindowFh: 50, mroNearKm: 80, lineCheckS: 2.5 * 3600 };
/* C2: ground stations about every c2SpacingKm along a land corridor; handoff when another station is nearer by c2HystKm [model]. */
const C2 = { spacingKm: 60, hystKm: 5, satKm: 90 };
/* Truck arrivals at each warehouse dock, per hour at full demand [model]; they keep coming at night, just fewer. */
const TRUCKS = { base: 14, spoke: 3, quay: 6, stagedBase: 8, stagedSpoke: 3 };
/* Cargo mix: dry 20% above wet across all lines [LogiXair] — wet share = 1 / 2.2 of consignments. */
const CARGO_MIX = { wet: 1 / 2.2, OF: 1 / 2.7 };                     // offshore: dry 1.7x wet [LogiXair]

/* Surface-mode comparison speeds. Road: 500 km in 16 h [thesis]. Boat: 12 kt supply run [model]. */
const SURFACE = { roadKmh: 31.25, boatKmh: 22.2 };

/* Ground handling, seconds of simulated time [model]; pod swap stays under the 10-minute figure [thesis]. */
const TURN = {
  land:  { SAFE: 45, POD_OUT: 150, POD_IN: 210, FUEL: 220, PREFLIGHT: 90 },
  deck:  { SAFE: 60, POD_OUT: 130, POD_IN: 170, FUEL: 0,   PREFLIGHT: 70 }
};

/* Site layouts in metres, site-local: x east, z south, origin at the site reference point. */
const LAYOUTS = {
  base: {
    pads: [
      { id: 'P1', x: -33, z: -24, hdg: 0 }, { id: 'P2', x: -11, z: -24, hdg: 0 }, { id: 'P3', x: 11, z: -24, hdg: 0 }, { id: 'P4', x: 33, z: -24, hdg: 0 },
      { id: 'P5', x: -33, z: 24, hdg: 180 }, { id: 'P6', x: -11, z: 24, hdg: 180 }, { id: 'P7', x: 11, z: 24, hdg: 180 }, { id: 'P8', x: 33, z: 24, hdg: 180 }
    ],
    doors: [[-33, -5], [-11, -5], [11, -5], [33, -5], [-33, 5], [-11, 5], [11, 5], [33, 5]],
    lanes: [{ z: -37, home: 50, pads: [0, 1, 2, 3] }, { z: 37, home: 50, pads: [4, 5, 6, 7] }],
    stands: [{ x: -62, z: -33, hdg: 90 }, { x: -48, z: -33, hdg: 90 }, { x: -62, z: 33, hdg: 90 }, { x: -48, z: 33, hdg: 90 }],
    hangar: 30, padElev: 0,
    /* pod loading at the cross-dock's west doors: pod position, d = unit vector from pod to vehicle, into = retract direction */
    dock: (function () {
      const lead = [[-122.4, -130], [-122.4, -26], [-121, -11], [-117.5, -5], [-113, -4.5], [-110, -8], [-109, -22], [-108.2, -29.5], [-105, -33.5], [-101.8, -29.5], [-101, -24]];
      const tail = [[-101, 26], [-102, 31], [-105.3, 34.6], [-108.6, 31], [-109.3, 22], [-110, 10], [-113.5, 4.6], [-120, 4.2], [-122.4, 14], [-122.4, 140]];
      return [
        { x: -80.5, z: -11, d: [-1, 0], into: [1, 0], bay: [-93, -11], pathIn: lead.concat([[-100.2, -21], [-95, -17.5], [-93, -14.5], [-93, -11]]), pathOut: [[-93, -11], [-93, -8], [-95, -3.5], [-100, 1], [-101, 8]].concat(tail) },
        { x: -80.5, z: 11, d: [-1, 0], into: [1, 0], bay: [-93, 11], pathIn: lead.concat([[-101, -10], [-100.4, 0], [-96, 5.5], [-93, 8], [-93, 11]]), pathOut: [[-93, 11], [-93, 14], [-95.5, 18.5], [-100.3, 22]].concat(tail) }
      ];
    })()
  },
  spoke: {
    pads: [{ id: 'P1', x: 0, z: -12, hdg: 0 }, { id: 'P2', x: 0, z: 12, hdg: 180 }],         // two 10 x 10 m pads either side of the pod dock: a compact yard
    doors: [[0, -4], [0, 4]],
    lanes: [{ z: -21, home: 18, pads: [0] }, { z: 21, home: 18, pads: [1] }],
    stands: [{ x: 21, z: 0, hdg: 270 }],                // one parking slot beside the pads; a warehouse yard has no room for more
    hangar: 0, padElev: 0,
    dock: [
      { x: -40, z: -33, d: [0, -1], into: [0, 1], bay: [-40, -42.5],
        pathIn: [[-122.4, -130], [-122.4, -26], [-121, -11], [-117.5, -5], [-112, -4.8], [-106, -8], [-102, -18], [-101, -34], [-97, -45], [-88, -48.5], [-70, -48.5], [-54, -46.5], [-45, -42.5], [-40, -42.5]],
        pathOut: [[-40, -42.5], [-35, -42.5], [-28, -45], [-22.5, -50.5], [-21, -56], [-25, -61], [-34, -62.5], [-90, -62.5], [-100, -60], [-107, -52], [-108.5, -36], [-108.5, -12], [-110, -2], [-114, 4], [-120, 4.2], [-122.4, 14], [-122.4, 140]] }
    ]
  },
  mro: {
    pads: [{ id: 'M1', x: -33, z: 12, hdg: 180 }, { id: 'M2', x: -11, z: 12, hdg: 180 }, { id: 'M3', x: 11, z: 12, hdg: 180 }, { id: 'M4', x: 33, z: 12, hdg: 180 }],
    doors: [[-33, -10], [-11, -10], [11, -10], [33, -10]],
    lanes: [{ z: 26, home: 54, pads: [0, 1, 2, 3] }],
    stands: [], hangar: 50, padElev: 0
  },
  quay: {
    pads: [{ id: 'Q1', x: -22, z: 0, hdg: 180 }, { id: 'Q2', x: 0, z: 0, hdg: 180 }, { id: 'Q3', x: 22, z: 0, hdg: 180 }, { id: 'Q4', x: 44, z: 0, hdg: 180 }, { id: 'Q5', x: 66, z: 0, hdg: 180 }],
    doors: [[-22, -20], [0, -20], [22, -20], [44, -20], [66, -20]],
    lanes: [{ z: 12, home: -40, pads: [0, 1, 2, 3, 4] }],
    stands: [], hangar: 16, padElev: 0
  },
  ship: {
    pads: [{ id: 'DECK', x: 0, z: 43, hdg: 0 }],
    doors: [[0, 27]],
    lanes: [], stands: [], padElev: 8.5, app: 180, dep: 310
  },
  platform: {
    pads: [{ id: 'HELI', x: 36, z: 0, hdg: 90 }],
    doors: [[25.5, 0]],
    lanes: [], stands: [], padElev: 38, app: 90, dep: 55
  }
};

const SCENARIOS = [
  {
    id: 'MM', region: 'IN', name: 'India middle-mile', sub: 'Southern and central network', stage: 'STAGE 03 · MIDDLE-MILE', color: '#78AAFF', prefix: 'LXA', csBase: 1000,
    blurb: 'Six bases at Hyderabad, Nagpur, Bengaluru, Chennai, Coimbatore and Madurai feed 37 city and port distribution centres across eight states with a fleet of 250 aircraft, on legs of 60 to 490 km. Hub-to-hub trunks and four DC-to-DC lateral lines let cargo move between zones without a road leg.',
    view: { lat: 14.6, lon: 78.6, dist: 3900, az: 0, tilt: 64 },
    surface: 'road',
    /* band: cruise-level band of the corridors that start at this base, so corridors of different bases cross with vertical separation [model] */
    sites: [
      { id: 'HYD', name: 'Hyderabad Base', kind: 'BASE', layout: 'base', lat: 17.628, lon: 78.482, npads: 8, refuel: true, band: 2200, spares: 3, roc: true, src: 'vector' },
      { id: 'BLR', name: 'Bengaluru Base', kind: 'BASE', layout: 'base', lat: 12.760, lon: 77.740, npads: 8, refuel: true, band: 3400, spares: 2, src: 'model' },
      { id: 'MAA', name: 'Chennai Base', kind: 'BASE', layout: 'base', lat: 12.830, lon: 79.950, npads: 8, refuel: true, band: 4600, spares: 2, src: 'model' },
      { id: 'NGP', name: 'Nagpur Base', kind: 'BASE', layout: 'base', lat: 21.040, lon: 79.050, npads: 8, refuel: true, band: 3400, spares: 2, src: 'model' },
      { id: 'IXM', name: 'Madurai Base', kind: 'BASE', layout: 'base', lat: 9.930, lon: 78.080, npads: 8, refuel: true, band: 3400, spares: 2, src: 'model' },
      { id: 'CJB', name: 'Coimbatore Base', kind: 'BASE', layout: 'base', lat: 11.100, lon: 77.180, npads: 8, refuel: true, band: 2200, spares: 2, src: 'model' },
      { id: 'MRO-A', name: 'MRO Hub Alpha', kind: 'MRO', layout: 'mro', lat: 17.452, lon: 78.318, npads: 4, refuel: true, src: 'vector' },
      { id: 'MRO-B', name: 'MRO Hub Bravo', kind: 'MRO', layout: 'mro', lat: 12.570, lon: 77.950, npads: 4, refuel: true, src: 'model' },
      // Hyderabad zone
      { id: 'VJA', name: 'Vijayawada DC', kind: 'DC', layout: 'spoke', lat: 16.506, lon: 80.648, npads: 2, refuel: true, src: 'vector' },
      { id: 'VTZ', name: 'Visakhapatnam DC', kind: 'DC', layout: 'spoke', lat: 17.690, lon: 83.020, npads: 2, refuel: true, src: 'model' },
      { id: 'KKD', name: 'Kakinada Port DC', kind: 'DC', layout: 'spoke', port: true, lat: 16.990, lon: 82.200, npads: 2, refuel: true, src: 'model' },
      { id: 'WGL', name: 'Warangal DC', kind: 'DC', layout: 'spoke', lat: 17.970, lon: 79.590, npads: 2, refuel: true, src: 'model' },
      { id: 'KNL', name: 'Kurnool DC', kind: 'DC', layout: 'spoke', lat: 15.830, lon: 78.040, npads: 2, refuel: true, src: 'model' },
      { id: 'GLB', name: 'Kalaburagi DC', kind: 'DC', layout: 'spoke', lat: 17.330, lon: 76.830, npads: 2, refuel: true, src: 'model' },
      { id: 'SSE', name: 'Solapur DC', kind: 'DC', layout: 'spoke', lat: 17.660, lon: 75.910, npads: 2, refuel: true, src: 'model' },
      { id: 'BEP', name: 'Ballari DC', kind: 'DC', layout: 'spoke', lat: 15.140, lon: 76.920, npads: 2, refuel: true, src: 'model' },
      { id: 'BBI', name: 'Bhubaneswar DC', kind: 'DC', layout: 'spoke', lat: 20.300, lon: 85.820, npads: 2, refuel: true, src: 'model' },
      // Nagpur zone
      { id: 'RPR', name: 'Raipur DC', kind: 'DC', layout: 'spoke', lat: 21.250, lon: 81.630, npads: 2, refuel: true, src: 'model' },
      { id: 'AMR', name: 'Amravati DC', kind: 'DC', layout: 'spoke', lat: 20.930, lon: 77.750, npads: 2, refuel: true, src: 'model' },
      { id: 'CDP', name: 'Chandrapur DC', kind: 'DC', layout: 'spoke', lat: 19.960, lon: 79.300, npads: 2, refuel: true, src: 'model' },
      { id: 'IXU', name: 'Aurangabad DC', kind: 'DC', layout: 'spoke', lat: 19.880, lon: 75.340, npads: 2, refuel: true, src: 'model' },
      // shared between two bases
      { id: 'SRC', name: 'Sri City DC', kind: 'DC', layout: 'spoke', lat: 13.555, lon: 79.995, npads: 2, refuel: true, src: 'model' },
      { id: 'MTM', name: 'Machilipatnam Port DC', kind: 'DC', layout: 'spoke', port: true, lat: 16.220, lon: 81.120, npads: 2, refuel: true, src: 'model' },
      { id: 'ATP', name: 'Anantapur DC', kind: 'DC', layout: 'spoke', lat: 14.720, lon: 77.700, npads: 2, refuel: true, src: 'model' },
      { id: 'COK', name: 'Kochi Port DC', kind: 'DC', layout: 'spoke', port: true, lat: 9.950, lon: 76.320, npads: 2, refuel: true, src: 'model' },
      // Bengaluru zone
      { id: 'MNG', name: 'Mangaluru Port DC', kind: 'DC', layout: 'spoke', port: true, lat: 12.830, lon: 74.950, npads: 2, refuel: true, src: 'model' },
      { id: 'HBX', name: 'Hubballi DC', kind: 'DC', layout: 'spoke', lat: 15.400, lon: 75.270, npads: 2, refuel: true, src: 'model' },
      { id: 'KPT', name: 'Krishnapatnam Port DC', kind: 'DC', layout: 'spoke', port: true, lat: 14.280, lon: 80.050, npads: 2, refuel: true, src: 'model' },
      { id: 'MYQ', name: 'Mysuru DC', kind: 'DC', layout: 'spoke', lat: 12.300, lon: 76.640, npads: 2, refuel: true, src: 'model' },
      { id: 'RQY', name: 'Shivamogga DC', kind: 'DC', layout: 'spoke', lat: 13.930, lon: 75.570, npads: 2, refuel: true, src: 'model' },
      { id: 'DVG', name: 'Davanagere DC', kind: 'DC', layout: 'spoke', lat: 14.460, lon: 75.920, npads: 2, refuel: true, src: 'model' },
      { id: 'GOI', name: 'Goa Port DC', kind: 'DC', layout: 'spoke', port: true, lat: 15.400, lon: 73.800, npads: 2, refuel: true, src: 'model' },
      { id: 'IXG', name: 'Belagavi DC', kind: 'DC', layout: 'spoke', lat: 15.850, lon: 74.500, npads: 2, refuel: true, src: 'model' },
      // Chennai zone
      { id: 'TRZ', name: 'Tiruchirappalli DC', kind: 'DC', layout: 'spoke', lat: 10.930, lon: 78.820, npads: 2, refuel: true, src: 'model' },
      { id: 'TUT', name: 'Thoothukudi Port DC', kind: 'DC', layout: 'spoke', port: true, lat: 8.860, lon: 78.130, npads: 2, refuel: true, src: 'model' },
      { id: 'VLR', name: 'Vellore DC', kind: 'DC', layout: 'spoke', lat: 12.920, lon: 79.130, npads: 2, refuel: true, src: 'model' },
      { id: 'PNY', name: 'Puducherry Port DC', kind: 'DC', layout: 'spoke', port: true, lat: 11.930, lon: 79.830, npads: 2, refuel: true, src: 'model' },
      { id: 'TIR', name: 'Tirupati DC', kind: 'DC', layout: 'spoke', lat: 13.630, lon: 79.420, npads: 2, refuel: true, src: 'model' },
      // Coimbatore zone
      { id: 'TCR', name: 'Thrissur DC', kind: 'DC', layout: 'spoke', lat: 10.520, lon: 76.210, npads: 2, refuel: true, src: 'model' },
      { id: 'CCJ', name: 'Kozhikode Port DC', kind: 'DC', layout: 'spoke', port: true, lat: 11.250, lon: 75.780, npads: 2, refuel: true, src: 'model' },
      { id: 'TRV', name: 'Thiruvananthapuram Port DC', kind: 'DC', layout: 'spoke', port: true, lat: 8.490, lon: 76.950, npads: 2, refuel: true, src: 'model' },
      { id: 'TEN', name: 'Tirunelveli DC', kind: 'DC', layout: 'spoke', lat: 8.730, lon: 77.700, npads: 2, refuel: true, src: 'model' },
      { id: 'NGL', name: 'Nagercoil DC', kind: 'DC', layout: 'spoke', lat: 8.180, lon: 77.430, npads: 2, refuel: true, src: 'model' },
      { id: 'RMM', name: 'Rameswaram Port DC', kind: 'DC', layout: 'spoke', port: true, lat: 9.290, lon: 79.300, npads: 2, refuel: true, src: 'model' },
      { id: 'SXV', name: 'Salem DC', kind: 'DC', layout: 'spoke', lat: 11.660, lon: 78.150, npads: 2, refuel: true, src: 'model' }
    ],
    routes: [
      // C corridors start at Hyderabad
      { id: 'C-21', a: 'HYD', b: 'VJA', n: 9, wps: [[17.56, 78.90], [17.05, 79.62], [16.70, 80.28]],
        cont: [['Suryapet', 17.14, 79.62], ['Kodad', 16.99, 79.97], ['Nandigama', 16.77, 80.29]] },
      { id: 'C-33', a: 'HYD', b: 'VTZ', n: 8, wps: [[17.74, 79.30], [17.56, 80.60], [17.46, 81.70], [17.62, 82.60]],
        cont: [['Jangaon', 17.72, 79.18], ['Kothagudem', 17.55, 80.62], ['Rampachodavaram', 17.44, 81.77]] },
      { id: 'C-28', a: 'HYD', b: 'NGP', n: 6, trunk: true, wps: [[18.30, 78.52], [19.30, 78.70], [20.20, 78.90]],
        cont: [['Kamareddy', 18.32, 78.34], ['Adilabad', 19.67, 78.53], ['Hinganghat', 20.55, 78.84]] },
      { id: 'C-45', a: 'HYD', b: 'SRC', n: 7, wps: [[17.47, 78.82], [16.90, 79.05], [15.90, 79.35], [14.60, 79.70]],
        cont: [['Nalgonda', 17.05, 79.27], ['Markapur', 15.74, 79.27], ['Atmakur', 14.62, 79.62]] },
      { id: 'C-52', a: 'HYD', b: 'MTM', n: 6, wps: [[17.52, 78.83], [16.75, 79.72], [16.22, 80.30], [16.20, 80.80]],
        cont: [['Miryalaguda', 16.87, 79.57], ['Sattenapalle', 16.39, 80.15], ['Tenali', 16.24, 80.64]] },
      { id: 'C-57', a: 'HYD', b: 'KKD', n: 5, wps: [[17.63, 79.30], [17.36, 80.35], [17.12, 81.20], [16.90, 81.62]],
        cont: [['Mahabubabad', 17.60, 80.00], ['Sathupalli', 17.25, 80.83], ['Kovvur', 17.01, 81.72]] },
      { id: 'C-64', a: 'HYD', b: 'ATP', n: 5, wps: [[17.40, 78.72], [16.95, 78.62], [16.20, 78.45], [15.45, 78.30]],
        cont: [['Kalwakurthy', 16.66, 78.49], ['Nandikotkur', 15.86, 78.27], ['Tadipatri', 14.91, 78.01]] },
      { id: 'C-12', a: 'HYD', b: 'WGL', n: 4, wps: [[17.85, 79.05]], cont: [['Bhongir', 17.51, 78.89], ['Jangaon', 17.72, 79.18]] },
      { id: 'C-15', a: 'HYD', b: 'KNL', n: 4, wps: [[16.80, 78.30]], cont: [['Mahabubnagar', 16.74, 77.99], ['Gadwal', 16.23, 77.80]] },
      { id: 'C-71', a: 'HYD', b: 'GLB', n: 4, wps: [[17.48, 77.70]], cont: [['Vikarabad', 17.34, 77.90], ['Tandur', 17.25, 77.58]] },
      { id: 'C-74', a: 'HYD', b: 'SSE', n: 4, wps: [[17.72, 77.40], [17.70, 76.60]], cont: [['Zaheerabad', 17.68, 77.61], ['Bidar', 17.91, 77.52], ['Akkalkot', 17.53, 76.21]] },
      { id: 'C-77', a: 'HYD', b: 'BEP', n: 4, wps: [[16.60, 77.75]], cont: [['Raichur', 16.20, 77.36], ['Sindhanur', 15.77, 76.75]] },
      { id: 'M-01', a: 'HYD', b: 'MRO-A', n: 0, mro: true, wps: [[17.71, 78.36], [17.57, 78.26]], cont: [] },
      // G corridors start at Nagpur
      { id: 'G-11', a: 'NGP', b: 'RPR', n: 6, wps: [[21.18, 80.30]], cont: [['Bhandara', 21.17, 79.65], ['Rajnandgaon', 21.10, 81.03]] },
      { id: 'G-14', a: 'NGP', b: 'AMR', n: 4, wps: [[21.05, 78.40]], cont: [['Talegaon', 20.89, 78.43]] },
      { id: 'G-17', a: 'NGP', b: 'CDP', n: 5, wps: [[20.50, 79.25]], cont: [['Warora', 20.23, 79.00]] },
      { id: 'G-21', a: 'NGP', b: 'IXU', n: 5, wps: [[20.70, 77.40], [20.25, 76.30]], cont: [['Akola', 20.70, 77.00], ['Jalna', 19.84, 75.88]] },
      // B corridors start at Bengaluru
      { id: 'B-11', a: 'BLR', b: 'MNG', n: 6, wps: [[12.62, 77.20], [12.75, 76.40], [12.85, 75.60]],
        cont: [['Channapatna', 12.65, 77.21], ['Channarayapatna', 12.90, 76.39], ['Sakleshpur', 12.94, 75.78]] },
      { id: 'B-14', a: 'BLR', b: 'HBX', n: 5, wps: [[12.80, 77.28], [13.22, 76.92], [14.10, 76.30], [14.90, 75.65]],
        cont: [['Kunigal', 13.02, 77.03], ['Hiriyur', 13.94, 76.62], ['Ranebennur', 14.62, 75.63]] },
      { id: 'B-17', a: 'BLR', b: 'COK', n: 5, wps: [[12.10, 77.25], [11.55, 76.75], [10.95, 76.50], [10.40, 76.20]],
        cont: [['Kollegal', 12.15, 77.11], ['Gudalur', 11.50, 76.50], ['Palakkad', 10.78, 76.65]] },
      { id: 'B-22', a: 'BLR', b: 'CJB', n: 4, trunk: true, wps: [[12.20, 77.72], [11.60, 77.45]],
        cont: [['Denkanikottai', 12.53, 77.79], ['Mettur', 11.79, 77.80], ['Gobichettipalayam', 11.45, 77.44]] },
      { id: 'B-26', a: 'BLR', b: 'SRC', n: 6, wps: [[12.95, 78.30], [13.20, 78.95], [13.36, 79.50]],
        cont: [['Mulbagal', 13.16, 78.39], ['Chittoor', 13.22, 79.10], ['Puttur', 13.44, 79.55]] },
      { id: 'B-31', a: 'BLR', b: 'KPT', n: 5, wps: [[13.20, 78.35], [13.80, 78.95], [14.15, 79.55]],
        cont: [['Madanapalle', 13.55, 78.50], ['Rayachoti', 14.05, 78.75], ['Gudur', 14.15, 79.85]] },
      { id: 'B-41', a: 'BLR', b: 'ATP', n: 4, wps: [[13.15, 78.02], [13.85, 78.00], [14.40, 77.85]],
        cont: [['Chintamani', 13.40, 78.05], ['Bagepalli', 13.78, 77.79], ['Dharmavaram', 14.41, 77.72]] },
      { id: 'B-05', a: 'BLR', b: 'MYQ', n: 4, wps: [[12.52, 77.20]], cont: [['Ramanagara', 12.72, 77.28], ['Mandya', 12.52, 76.90]] },
      { id: 'B-08', a: 'BLR', b: 'RQY', n: 4, wps: [[12.70, 77.00], [13.20, 76.20]], cont: [['Hassan', 13.00, 76.10], ['Tarikere', 13.71, 75.82]] },
      { id: 'T-20', a: 'BLR', b: 'MAA', n: 8, trunk: true, wps: [[12.62, 78.20], [12.80, 79.10], [12.80, 79.60]],
        cont: [['Krishnagiri', 12.53, 78.21], ['Ambur', 12.79, 78.72], ['Kanchipuram', 12.83, 79.70]] },
      { id: 'M-02', a: 'BLR', b: 'MRO-B', n: 0, mro: true, wps: [[12.70, 77.86]], cont: [] },
      // K corridors start at Chennai (Kancheepuram district)
      { id: 'K-12', a: 'MAA', b: 'TRZ', n: 4, wps: [[12.20, 79.50], [11.50, 79.10]],
        cont: [['Tindivanam', 12.23, 79.65], ['Vriddhachalam', 11.52, 79.32], ['Ariyalur', 11.14, 79.08]] },
      { id: 'K-15', a: 'MAA', b: 'IXM', n: 5, wps: [[12.30, 79.30], [11.35, 78.65], [10.75, 78.30], [10.25, 78.10]],
        cont: [['Tiruvannamalai', 12.23, 79.07], ['Thuraiyur', 11.14, 78.60], ['Dindigul', 10.36, 77.98]] },
      { id: 'K-19', a: 'MAA', b: 'TUT', n: 6, wps: [[12.10, 79.70], [11.45, 79.55], [10.60, 79.38], [9.85, 78.95], [9.20, 78.45]],
        cont: [['Chidambaram', 11.40, 79.69], ['Pattukkottai', 10.42, 79.32], ['Paramakudi', 9.55, 78.59]] },
      { id: 'K-23', a: 'MAA', b: 'CJB', n: 5, trunk: true, wps: [[12.45, 79.25], [11.95, 78.55], [11.48, 78.10], [11.30, 77.70]],
        cont: [['Chengam', 12.31, 78.79], ['Rasipuram', 11.46, 78.19], ['Erode', 11.34, 77.72]] },
      { id: 'K-31', a: 'MAA', b: 'MTM', n: 6, wps: [[13.22, 79.86], [13.75, 79.78], [14.45, 79.86], [15.50, 79.92], [15.95, 80.55]],
        cont: [['Naidupeta', 13.90, 79.90], ['Kavali', 14.92, 79.99], ['Bapatla', 15.90, 80.47]] },
      { id: 'K-03', a: 'MAA', b: 'VLR', n: 3, wps: [[12.95, 79.55]], cont: [['Arakkonam', 13.08, 79.67]] },
      { id: 'K-05', a: 'MAA', b: 'PNY', n: 4, wps: [[12.40, 79.98]], cont: [['Marakkanam', 12.19, 79.94]] },
      { id: 'K-08', a: 'MAA', b: 'TIR', n: 4, wps: [[13.20, 79.70]], cont: [['Tiruttani', 13.18, 79.62]] },
      { id: 'M-03', a: 'MAA', b: 'MRO-B', n: 0, mro: true, wps: [[12.70, 79.55], [12.58, 78.90], [12.45, 78.30]], cont: [] },
      // J corridors start at Coimbatore
      { id: 'J-11', a: 'CJB', b: 'COK', n: 4, wps: [[10.75, 76.80]], cont: [['Palakkad', 10.78, 76.65], ['Chalakudy', 10.30, 76.33]] },
      { id: 'J-14', a: 'CJB', b: 'TCR', n: 3, wps: [[10.90, 76.75]], cont: [['Ottapalam', 10.77, 76.38]] },
      { id: 'J-17', a: 'CJB', b: 'CCJ', n: 3, wps: [[11.30, 76.70]], cont: [['Mannarkkad', 10.99, 76.46], ['Malappuram', 11.07, 76.07]] },
      { id: 'J-21', a: 'CJB', b: 'TRV', n: 5, wps: [[10.40, 77.10], [9.30, 77.05]], cont: [['Pollachi', 10.66, 77.01], ['Kumily', 9.61, 77.17], ['Punalur', 9.02, 76.93]] },
      { id: 'J-24', a: 'CJB', b: 'TEN', n: 3, wps: [[10.20, 77.55], [9.30, 77.70]], cont: [['Palani', 10.45, 77.52], ['Rajapalayam', 9.45, 77.55]] },
      { id: 'J-31', a: 'CJB', b: 'SXV', n: 3, wps: [[11.40, 77.70]], cont: [['Bhavani', 11.45, 77.68]] },
      // D corridors start at Madurai, the southern base
      { id: 'D-11', a: 'IXM', b: 'COK', n: 5, wps: [[9.95, 77.30]], cont: [['Theni', 10.01, 77.48], ['Kumily', 9.61, 77.17], ['Kothamangalam', 10.06, 76.63]] },
      { id: 'D-14', a: 'IXM', b: 'TUT', n: 4, wps: [[9.40, 78.10]], cont: [['Aruppukottai', 9.51, 78.10], ['Ottapidaram', 8.91, 78.02]] },
      { id: 'D-17', a: 'IXM', b: 'CJB', n: 4, trunk: true, wps: [[10.45, 77.75]], cont: [['Oddanchatram', 10.49, 77.75], ['Dharapuram', 10.74, 77.53]] },
      { id: 'D-21', a: 'IXM', b: 'TRV', n: 4, wps: [[9.20, 77.45]], cont: [['Rajapalayam', 9.45, 77.55], ['Tenkasi', 8.96, 77.30]] },
      { id: 'D-24', a: 'IXM', b: 'TEN', n: 3, wps: [[9.30, 77.95]], cont: [['Kovilpatti', 9.17, 77.87]] },
      { id: 'D-27', a: 'IXM', b: 'TRZ', n: 3, wps: [[10.45, 78.45]], cont: [['Melur', 10.03, 78.34], ['Viralimalai', 10.60, 78.55]] },
      { id: 'D-31', a: 'IXM', b: 'NGL', n: 3, wps: [[8.90, 77.70]], cont: [['Sankarankovil', 9.17, 77.54], ['Valliyur', 8.38, 77.61]] },
      { id: 'D-34', a: 'IXM', b: 'RMM', n: 3, wps: [[9.55, 78.75]], cont: [['Paramakudi', 9.55, 78.59], ['Ramanathapuram', 9.37, 78.83]] },
      // L lines: DC to DC, flown in their own upper band
      { id: 'L-01', a: 'HBX', b: 'GOI', n: 3, band: 5000, wps: [[15.45, 74.60]], cont: [['Dharwad', 15.46, 75.01]] },
      { id: 'L-02', a: 'HBX', b: 'IXG', n: 2, band: 5000, wps: [], cont: [] },
      { id: 'L-03', a: 'HBX', b: 'DVG', n: 2, band: 5000, wps: [[14.90, 75.62]], cont: [['Haveri', 14.79, 75.40]] },
      { id: 'L-04', a: 'VTZ', b: 'BBI', n: 3, band: 5000, wps: [[18.70, 84.10], [19.50, 85.00]], cont: [['Srikakulam', 18.30, 83.90], ['Berhampur', 19.31, 84.79]] }
    ],
    pilots: [
      // all supervisory pilots sit in one remote operations centre at the main base; the other bases run with a small site crew
      ...['K. Raghavan', 'R. Iyer', 'S. Qureshi', 'M. Gowda', 'T. Mathew', 'D. Shetty', 'V. Subramanian', 'B. Naidu', 'A. Deshmukh', 'P. Menon', 'N. Reddy', 'F. Khan',
          'J. Pillai', 'S. Banerjee', 'R. Kulkarni', 'H. Rao', 'G. Varghese', 'L. Patil', 'C. Murthy', 'Y. Joshi'].map((n, i) => ({ id: 'P' + (i + 1), name: n, station: 'ROC Hyderabad' }))
    ],
    cargo: [
      ['COLD', 'Vaccine and biologics replenishment', 'Pharma DC'], ['COLD', 'Blood products, group-matched', 'Regional blood bank'],
      ['COLD', 'Diagnostic samples, time-critical', 'Pathology network'], ['DRY', 'Line-stop automotive spares', 'Tier-1 auto supplier'],
      ['DRY', 'B2B e-commerce replenishment', 'Fulfilment centre'], ['DRY', 'Machine-tool spindles and drives', 'Industrial spares desk'],
      ['SENS', 'SMT feeder modules and PCBAs', 'Electronics EMS'], ['SENS', 'Calibrated test instruments', 'Metrology lab'],
      ['LIQ', 'Reagents and process chemicals', 'Specialty chemicals'], ['DRY', 'Ship spares for a vessel at berth', 'Port agency desk'],
      ['SENS', 'Export electronics, customs-sealed', 'Container freight station'], ['DRY', 'Festive retail stock, mixed SKUs', 'Retail chain DC'],
      ['COLD', 'Fresh flowers and horticulture', 'Growers co-operative'], ['DRY', 'Textile and garment consignments', 'Apparel exporter']
    ]
  },
  {
    id: 'NV', region: 'IN', name: 'Navy ship-to-shore', sub: 'Western seaboard', stage: 'STAGE 01 · DEFENCE', color: '#3DDC97', prefix: 'LXD', csBase: 2000,
    blurb: 'Autonomous resupply between the dockyard, vessels under way and a coastal base 480 km south.',
    view: { lat: 17.05, lon: 72.75, dist: 760, az: -14, tilt: 50 },
    surface: 'boat',
    sites: [
      { id: 'NDM', name: 'Naval Dockyard, Mumbai', kind: 'DOCKYARD', layout: 'quay', lat: 18.927, lon: 72.838, npads: 3, refuel: true, navy: true, roc: true, src: 'thesis' },
      { id: 'ALFA', name: 'Vessel Alfa', kind: 'SHIP', layout: 'ship', npads: 1, refuel: false, src: 'model',
        track: { lat: 18.46, lon: 71.78, rKm: [26, 14], kt: 12, phase: 0.2 } },
      { id: 'BRAVO', name: 'Vessel Bravo', kind: 'SHIP', layout: 'ship', npads: 1, refuel: false, src: 'model',
        track: { lat: 17.52, lon: 72.02, rKm: [20, 30], kt: 10, phase: 2.6 } },
      { id: 'KWR', name: 'Karwar Naval Base', kind: 'DOCKYARD', layout: 'quay', lat: 14.800, lon: 74.115, npads: 2, refuel: true, navy: true, src: 'model' }
    ],
    routes: [
      { id: 'N-A', a: 'NDM', b: 'ALFA', n: 2, wps: [[18.85, 72.83], [18.79, 72.70]], cont: [] },
      { id: 'N-B', a: 'NDM', b: 'BRAVO', n: 1, wps: [[18.85, 72.83], [18.66, 72.72]], cont: [] },
      { id: 'N-K', a: 'NDM', b: 'KWR', n: 2, wps: [[18.85, 72.83], [18.30, 72.80], [17.00, 73.12], [15.60, 73.56], [15.02, 73.94]],
        cont: [['Ratnagiri coast', 16.99, 73.29], ['Malvan coast', 16.06, 73.46], ['Canacona coast', 15.01, 74.03]] }
    ],
    spares: 0,
    pilots: [{ id: 'D1', name: 'H. Chaudhary', station: 'ROC Naval Dockyard' }],
    cargo: [
      ['DEF', 'Machinery spares, priority demand', 'Dockyard stores'], ['DEF', 'Avionics line-replaceable units', 'Dockyard stores'],
      ['COLD', 'Medical stores', 'Naval hospital'], ['DRY', 'Mail, documents and personal parcels', 'Fleet mail office'],
      ['COLD', 'Fresh provisions top-up', 'Victualling yard'], ['SENS', 'Calibration standards', 'Weapon equipment depot']
    ]
  },
  {
    id: 'OF', region: 'IN', name: 'Offshore', sub: 'Mumbai offshore basin', stage: 'STAGE 02 · OFFSHORE', color: '#FAC83C', prefix: 'LXO', csBase: 3000,
    blurb: 'One shore base serving eight production fields, 85 to 190 km out, on the runs helicopters fly today.',
    view: { lat: 19.02, lon: 72.1, dist: 430, az: 12, tilt: 50 },
    surface: 'boat',
    sites: [
      { id: 'NSB', name: 'Nhava Shore Base', kind: 'SHOREBASE', layout: 'quay', lat: 18.950, lon: 72.950, npads: 5, refuel: true, roc: true, hangar: 24, src: 'model' },
      { id: 'MHN', name: 'Mumbai High North', kind: 'PLATFORM', layout: 'platform', lat: 19.58, lon: 71.35, npads: 1, refuel: false, src: 'model' },
      { id: 'MHS', name: 'Mumbai High South', kind: 'PLATFORM', layout: 'platform', lat: 19.33, lon: 71.30, npads: 1, refuel: false, src: 'model' },
      { id: 'HRA', name: 'Heera Field', kind: 'PLATFORM', layout: 'platform', lat: 18.55, lon: 72.25, npads: 1, refuel: false, src: 'model' },
      { id: 'BSN', name: 'Bassein Field', kind: 'PLATFORM', layout: 'platform', lat: 19.22, lon: 72.12, npads: 1, refuel: false, src: 'model' },
      { id: 'NLM', name: 'Neelam Field', kind: 'PLATFORM', layout: 'platform', lat: 18.78, lon: 72.02, npads: 1, refuel: false, src: 'model' },
      { id: 'PNA', name: 'Panna Field', kind: 'PLATFORM', layout: 'platform', lat: 19.78, lon: 71.92, npads: 1, refuel: false, src: 'model' },
      { id: 'B19', name: 'B-193 Cluster', kind: 'PLATFORM', layout: 'platform', lat: 19.95, lon: 71.55, npads: 1, refuel: false, src: 'model' },
      { id: 'RTN', name: 'Ratna Field', kind: 'PLATFORM', layout: 'platform', lat: 18.32, lon: 72.40, npads: 1, refuel: false, src: 'model' }
    ],
    routes: [
      { id: 'O-11', a: 'NSB', b: 'MHN', n: 3, wps: [[18.865, 72.905], [18.80, 72.78], [19.02, 72.30]], cont: [] },
      { id: 'O-12', a: 'NSB', b: 'MHS', n: 3, wps: [[18.865, 72.905], [18.79, 72.77], [18.93, 72.20]], cont: [] },
      { id: 'O-07', a: 'NSB', b: 'HRA', n: 2, wps: [[18.865, 72.905], [18.78, 72.77]], cont: [] },
      { id: 'O-09', a: 'NSB', b: 'BSN', n: 2, wps: [[18.865, 72.905], [18.81, 72.78], [18.99, 72.46]], cont: [] },
      { id: 'O-14', a: 'NSB', b: 'NLM', n: 2, wps: [[18.865, 72.905], [18.785, 72.775], [18.78, 72.40]], cont: [] },
      { id: 'O-16', a: 'NSB', b: 'PNA', n: 3, wps: [[18.865, 72.905], [18.82, 72.79], [19.10, 72.45], [19.55, 72.10]], cont: [] },
      { id: 'O-18', a: 'NSB', b: 'B19', n: 3, wps: [[18.865, 72.905], [18.88, 72.83], [19.30, 72.62], [19.75, 72.05]], cont: [] },
      { id: 'O-05', a: 'NSB', b: 'RTN', n: 2, wps: [[18.865, 72.905], [18.77, 72.76], [18.50, 72.55]], cont: [] }
    ],
    spares: 0,
    pilots: [{ id: 'O1', name: 'L. Fernandes', station: 'ROC Nhava' }, { id: 'O2', name: 'S. Pinto', station: 'ROC Nhava' }],
    cargo: [
      ['DRY', 'Valve and seal kit, compressor train', 'Shore warehouse'], ['DRY', 'Downhole tool sub-assembly', 'Shore warehouse'],
      ['SENS', 'Instrumentation and transmitter spares', 'Shore warehouse'], ['LIQ', 'Production chemical samples', 'Field laboratory'],
      ['COLD', 'Medical supplies', 'Occupational health'], ['DRY', 'Safety-critical PPE and gas detectors', 'HSE stores']
    ]
  },
  {
    id: 'SEA', region: 'SEA', name: 'Southeast Asia', sub: 'Island middle-mile', stage: 'STAGE 04 · SOUTHEAST ASIA', color: '#4FD1C5', prefix: 'LXS', csBase: 4000,
    blurb: 'Eight hubs in Indonesia, the Philippines and Thailand link 45 inhabited islands and port towns, from Lampung to Flores, Mindoro to Siargao and Koh Chang to Penang. Most legs cross open water, where a truck needs a ferry and a day; three lateral lines join neighbouring hubs\' islands.',
    view: { lat: 3.2, lon: 112.4, dist: 6500, az: 0, tilt: 60 },
    zones: { ID: { name: 'Indonesia', lat: -6.0, lon: 113.2, dist: 2900 }, PH: { name: 'Philippines', lat: 10.6, lon: 123.0, dist: 2300 }, TH: { name: 'Thailand · Malaysia', lat: 9.3, lon: 100.2, dist: 2200 } },
    tz: 1.5, tzName: 'local',
    surface: 'boat',
    sites: [
      // Indonesia
      { id: 'JKT', name: 'Jakarta Hub', kind: 'BASE', layout: 'base', lat: -6.290, lon: 107.130, npads: 6, refuel: true, band: 2200, spares: 1, zone: 'ID', roc: true, src: 'model' },
      { id: 'SUB', name: 'Surabaya Hub', kind: 'BASE', layout: 'base', lat: -7.370, lon: 112.770, npads: 6, refuel: true, band: 3400, spares: 1, zone: 'ID', src: 'model' },
      { id: 'UPG', name: 'Makassar Hub', kind: 'BASE', layout: 'base', lat: -5.070, lon: 119.550, npads: 6, refuel: true, band: 4600, spares: 1, zone: 'ID', src: 'model' },
      { id: 'TKG', name: 'Bandar Lampung DC', kind: 'DC', layout: 'spoke', port: true, lat: -5.420, lon: 105.260, npads: 2, refuel: true, zone: 'ID', src: 'model' },
      { id: 'PLM', name: 'Palembang DC', kind: 'DC', layout: 'spoke', lat: -2.980, lon: 104.760, npads: 2, refuel: true, zone: 'ID', src: 'model' },
      { id: 'PGK', name: 'Pangkal Pinang DC · Bangka', kind: 'DC', layout: 'spoke', port: true, lat: -2.120, lon: 106.120, npads: 2, refuel: true, zone: 'ID', src: 'model' },
      { id: 'TJQ', name: 'Tanjung Pandan DC · Belitung', kind: 'DC', layout: 'spoke', port: true, lat: -2.750, lon: 107.640, npads: 2, refuel: true, zone: 'ID', src: 'model' },
      { id: 'SRG', name: 'Semarang Port DC', kind: 'DC', layout: 'spoke', port: true, lat: -6.980, lon: 110.410, npads: 2, refuel: true, zone: 'ID', src: 'model' },
      { id: 'DPS', name: 'Denpasar DC · Bali', kind: 'DC', layout: 'spoke', port: true, lat: -8.680, lon: 115.200, npads: 2, refuel: true, zone: 'ID', src: 'model' },
      { id: 'AMI', name: 'Mataram DC · Lombok', kind: 'DC', layout: 'spoke', port: true, lat: -8.580, lon: 116.110, npads: 2, refuel: true, zone: 'ID', src: 'model' },
      { id: 'BDJ', name: 'Banjarmasin Port DC', kind: 'DC', layout: 'spoke', port: true, lat: -3.320, lon: 114.590, npads: 2, refuel: true, zone: 'ID', src: 'model' },
      { id: 'SMQ', name: 'Sumenep DC · Madura', kind: 'DC', layout: 'spoke', port: true, lat: -7.010, lon: 113.860, npads: 2, refuel: true, zone: 'ID', src: 'model' },
      { id: 'BMU', name: 'Bima DC · Sumbawa', kind: 'DC', layout: 'spoke', port: true, lat: -8.460, lon: 118.730, npads: 2, refuel: true, zone: 'ID', src: 'model' },
      { id: 'LBJ', name: 'Labuan Bajo DC · Flores', kind: 'DC', layout: 'spoke', port: true, lat: -8.490, lon: 119.890, npads: 2, refuel: true, zone: 'ID', src: 'model' },
      { id: 'KDI', name: 'Kendari Port DC', kind: 'DC', layout: 'spoke', port: true, lat: -3.970, lon: 122.510, npads: 2, refuel: true, zone: 'ID', src: 'model' },
      { id: 'BUW', name: 'Baubau DC · Buton', kind: 'DC', layout: 'spoke', port: true, lat: -5.470, lon: 122.610, npads: 2, refuel: true, zone: 'ID', src: 'model' },
      { id: 'PLW', name: 'Palu Port DC', kind: 'DC', layout: 'spoke', port: true, lat: -0.900, lon: 119.870, npads: 2, refuel: true, zone: 'ID', src: 'model' },
      // Philippines
      { id: 'MNL', name: 'Manila Hub', kind: 'BASE', layout: 'base', lat: 14.700, lon: 120.980, npads: 6, refuel: true, band: 2200, spares: 1, zone: 'PH', roc: true, src: 'model' },
      { id: 'CEB', name: 'Cebu Hub', kind: 'BASE', layout: 'base', lat: 10.320, lon: 123.980, npads: 6, refuel: true, band: 3400, spares: 1, zone: 'PH', src: 'model' },
      { id: 'DVO', name: 'Davao Hub', kind: 'BASE', layout: 'base', lat: 7.120, lon: 125.640, npads: 6, refuel: true, band: 4600, spares: 1, zone: 'PH', src: 'model' },
      { id: 'CPN', name: 'Calapan DC · Mindoro', kind: 'DC', layout: 'spoke', port: true, lat: 13.410, lon: 121.180, npads: 2, refuel: true, zone: 'PH', src: 'model' },
      { id: 'LGP', name: 'Legazpi Port DC', kind: 'DC', layout: 'spoke', port: true, lat: 13.140, lon: 123.730, npads: 2, refuel: true, zone: 'PH', src: 'model' },
      { id: 'VRC', name: 'Virac DC · Catanduanes', kind: 'DC', layout: 'spoke', port: true, lat: 13.580, lon: 124.230, npads: 2, refuel: true, zone: 'PH', src: 'model' },
      { id: 'USU', name: 'Coron DC · Busuanga', kind: 'DC', layout: 'spoke', port: true, lat: 12.000, lon: 120.200, npads: 2, refuel: true, zone: 'PH', src: 'model' },
      { id: 'KLO', name: 'Kalibo DC · Panay', kind: 'DC', layout: 'spoke', port: true, lat: 11.680, lon: 122.380, npads: 2, refuel: true, zone: 'PH', src: 'model' },
      { id: 'ILO', name: 'Iloilo Port DC', kind: 'DC', layout: 'spoke', port: true, lat: 10.710, lon: 122.560, npads: 2, refuel: true, zone: 'PH', src: 'model' },
      { id: 'BCD', name: 'Bacolod DC · Negros', kind: 'DC', layout: 'spoke', port: true, lat: 10.680, lon: 122.950, npads: 2, refuel: true, zone: 'PH', src: 'model' },
      { id: 'TAG', name: 'Tagbilaran DC · Bohol', kind: 'DC', layout: 'spoke', port: true, lat: 9.650, lon: 123.850, npads: 2, refuel: true, zone: 'PH', src: 'model' },
      { id: 'TAC', name: 'Tacloban DC · Leyte', kind: 'DC', layout: 'spoke', port: true, lat: 11.240, lon: 125.000, npads: 2, refuel: true, zone: 'PH', src: 'model' },
      { id: 'DGT', name: 'Dumaguete DC · Negros', kind: 'DC', layout: 'spoke', port: true, lat: 9.310, lon: 123.300, npads: 2, refuel: true, zone: 'PH', src: 'model' },
      { id: 'MBT', name: 'Masbate DC', kind: 'DC', layout: 'spoke', port: true, lat: 12.370, lon: 123.620, npads: 2, refuel: true, zone: 'PH', src: 'model' },
      { id: 'CGY', name: 'Cagayan de Oro Port DC', kind: 'DC', layout: 'spoke', port: true, lat: 8.480, lon: 124.650, npads: 2, refuel: true, zone: 'PH', src: 'model' },
      { id: 'GES', name: 'General Santos Port DC', kind: 'DC', layout: 'spoke', port: true, lat: 6.110, lon: 125.170, npads: 2, refuel: true, zone: 'PH', src: 'model' },
      { id: 'ZAM', name: 'Zamboanga Port DC', kind: 'DC', layout: 'spoke', port: true, lat: 6.920, lon: 122.070, npads: 2, refuel: true, zone: 'PH', src: 'model' },
      { id: 'SUG', name: 'Surigao Port DC', kind: 'DC', layout: 'spoke', port: true, lat: 9.790, lon: 125.480, npads: 2, refuel: true, zone: 'PH', src: 'model' },
      { id: 'IAO', name: 'Siargao DC', kind: 'DC', layout: 'spoke', port: true, lat: 9.860, lon: 126.010, npads: 2, refuel: true, zone: 'PH', src: 'model' },
      { id: 'PPS', name: 'Puerto Princesa DC · Palawan', kind: 'DC', layout: 'spoke', port: true, lat: 9.740, lon: 118.760, npads: 2, refuel: true, zone: 'PH', src: 'model' },
      // Thailand and northern Malaysia
      { id: 'BKK', name: 'Bangkok Hub', kind: 'BASE', layout: 'base', lat: 13.690, lon: 100.750, npads: 6, refuel: true, band: 2200, spares: 1, zone: 'TH', roc: true, src: 'model' },
      { id: 'URT', name: 'Surat Thani Hub', kind: 'BASE', layout: 'base', lat: 9.130, lon: 99.140, npads: 6, refuel: true, band: 3400, spares: 1, zone: 'TH', src: 'model' },
      { id: 'TDX', name: 'Koh Chang DC', kind: 'DC', layout: 'spoke', port: true, lat: 12.060, lon: 102.330, npads: 2, refuel: true, zone: 'TH', src: 'model' },
      { id: 'HHQ', name: 'Hua Hin DC', kind: 'DC', layout: 'spoke', lat: 12.570, lon: 99.960, npads: 2, refuel: true, zone: 'TH', src: 'model' },
      { id: 'CJM', name: 'Chumphon DC', kind: 'DC', layout: 'spoke', lat: 10.490, lon: 99.180, npads: 2, refuel: true, zone: 'TH', src: 'model' },
      { id: 'USM', name: 'Koh Samui DC', kind: 'DC', layout: 'spoke', port: true, lat: 9.550, lon: 100.060, npads: 2, refuel: true, zone: 'TH', src: 'model' },
      { id: 'KTO', name: 'Koh Tao DC', kind: 'DC', layout: 'spoke', port: true, lat: 10.090, lon: 99.840, npads: 2, refuel: true, zone: 'TH', src: 'model' },
      { id: 'HKT', name: 'Phuket DC', kind: 'DC', layout: 'spoke', port: true, lat: 7.880, lon: 98.390, npads: 2, refuel: true, zone: 'TH', src: 'model' },
      { id: 'KBV', name: 'Krabi DC', kind: 'DC', layout: 'spoke', port: true, lat: 8.100, lon: 98.910, npads: 2, refuel: true, zone: 'TH', src: 'model' },
      { id: 'LNT', name: 'Koh Lanta DC', kind: 'DC', layout: 'spoke', port: true, lat: 7.630, lon: 99.080, npads: 2, refuel: true, zone: 'TH', src: 'model' },
      { id: 'HDY', name: 'Hat Yai DC', kind: 'DC', layout: 'spoke', lat: 7.010, lon: 100.470, npads: 2, refuel: true, zone: 'TH', src: 'model' },
      { id: 'RNG', name: 'Ranong Port DC', kind: 'DC', layout: 'spoke', port: true, lat: 9.960, lon: 98.630, npads: 2, refuel: true, zone: 'TH', src: 'model' },
      { id: 'LGK', name: 'Langkawi DC · Malaysia', kind: 'DC', layout: 'spoke', port: true, lat: 6.330, lon: 99.850, npads: 2, refuel: true, zone: 'TH', src: 'model' },
      { id: 'PEN', name: 'Penang DC · Malaysia', kind: 'DC', layout: 'spoke', port: true, lat: 5.300, lon: 100.280, npads: 2, refuel: true, zone: 'TH', src: 'model' }
    ],
    routes: [
      { id: 'I-11', a: 'JKT', b: 'TKG', n: 3, sea: true, wps: [], cont: [] },
      { id: 'I-12', a: 'JKT', b: 'PLM', n: 4, sea: true, wps: [], cont: [] },
      { id: 'I-13', a: 'JKT', b: 'PGK', n: 3, sea: true, wps: [], cont: [] },
      { id: 'I-14', a: 'JKT', b: 'TJQ', n: 3, sea: true, wps: [], cont: [] },
      { id: 'I-15', a: 'JKT', b: 'SRG', n: 4, wps: [], cont: [] },
      { id: 'I-21', a: 'SUB', b: 'DPS', n: 5, sea: true, wps: [], cont: [] },
      { id: 'I-22', a: 'SUB', b: 'AMI', n: 4, sea: true, wps: [], cont: [] },
      { id: 'I-23', a: 'SUB', b: 'BDJ', n: 4, sea: true, wps: [], cont: [] },
      { id: 'I-24', a: 'SUB', b: 'SMQ', n: 2, sea: true, wps: [], cont: [] },
      { id: 'I-25', a: 'SUB', b: 'SRG', n: 3, wps: [], cont: [] },
      { id: 'I-31', a: 'UPG', b: 'BMU', n: 3, sea: true, wps: [], cont: [] },
      { id: 'I-32', a: 'UPG', b: 'LBJ', n: 3, sea: true, wps: [], cont: [] },
      { id: 'I-33', a: 'UPG', b: 'KDI', n: 3, sea: true, wps: [], cont: [] },
      { id: 'I-34', a: 'UPG', b: 'BUW', n: 3, sea: true, wps: [], cont: [] },
      { id: 'I-35', a: 'UPG', b: 'PLW', n: 3, sea: true, wps: [], cont: [] },
      { id: 'X-01', a: 'AMI', b: 'BMU', n: 3, sea: true, band: 5000, wps: [], cont: [] },
      { id: 'P-11', a: 'MNL', b: 'CPN', n: 3, sea: true, wps: [], cont: [] },
      { id: 'P-12', a: 'MNL', b: 'LGP', n: 4, sea: true, wps: [], cont: [] },
      { id: 'P-13', a: 'MNL', b: 'VRC', n: 3, sea: true, wps: [], cont: [] },
      { id: 'P-14', a: 'MNL', b: 'USU', n: 3, sea: true, wps: [], cont: [] },
      { id: 'P-15', a: 'MNL', b: 'KLO', n: 3, sea: true, wps: [], cont: [] },
      { id: 'P-21', a: 'CEB', b: 'ILO', n: 4, sea: true, wps: [], cont: [] },
      { id: 'P-22', a: 'CEB', b: 'BCD', n: 4, sea: true, wps: [], cont: [] },
      { id: 'P-23', a: 'CEB', b: 'TAG', n: 3, sea: true, wps: [], cont: [] },
      { id: 'P-24', a: 'CEB', b: 'TAC', n: 4, sea: true, wps: [], cont: [] },
      { id: 'P-25', a: 'CEB', b: 'DGT', n: 3, sea: true, wps: [], cont: [] },
      { id: 'P-26', a: 'CEB', b: 'MBT', n: 3, sea: true, wps: [], cont: [] },
      { id: 'P-27', a: 'CEB', b: 'CGY', n: 3, sea: true, wps: [], cont: [] },
      { id: 'P-28', a: 'CEB', b: 'KLO', n: 3, sea: true, wps: [], cont: [] },
      { id: 'P-31', a: 'DVO', b: 'GES', n: 3, wps: [], cont: [] },
      { id: 'P-32', a: 'DVO', b: 'ZAM', n: 4, sea: true, wps: [], cont: [] },
      { id: 'P-33', a: 'DVO', b: 'SUG', n: 3, sea: true, wps: [], cont: [] },
      { id: 'P-34', a: 'DVO', b: 'IAO', n: 2, sea: true, wps: [], cont: [] },
      { id: 'P-35', a: 'DVO', b: 'CGY', n: 3, wps: [], cont: [] },
      { id: 'X-02', a: 'ILO', b: 'PPS', n: 3, sea: true, band: 5000, wps: [], cont: [] },
      { id: 'S-11', a: 'BKK', b: 'TDX', n: 3, sea: true, wps: [], cont: [] },
      { id: 'S-12', a: 'BKK', b: 'HHQ', n: 3, wps: [], cont: [] },
      { id: 'S-13', a: 'BKK', b: 'CJM', n: 3, wps: [], cont: [] },
      { id: 'S-14', a: 'BKK', b: 'USM', n: 3, sea: true, wps: [], cont: [] },
      { id: 'S-21', a: 'URT', b: 'USM', n: 3, sea: true, wps: [], cont: [] },
      { id: 'S-22', a: 'URT', b: 'KTO', n: 2, sea: true, wps: [], cont: [] },
      { id: 'S-23', a: 'URT', b: 'HKT', n: 4, sea: true, wps: [], cont: [] },
      { id: 'S-24', a: 'URT', b: 'KBV', n: 3, sea: true, wps: [], cont: [] },
      { id: 'S-25', a: 'URT', b: 'LNT', n: 2, sea: true, wps: [], cont: [] },
      { id: 'S-26', a: 'URT', b: 'HDY', n: 3, wps: [], cont: [] },
      { id: 'S-27', a: 'URT', b: 'RNG', n: 2, wps: [], cont: [] },
      { id: 'S-28', a: 'URT', b: 'LGK', n: 3, sea: true, wps: [], cont: [] },
      { id: 'S-29', a: 'URT', b: 'PEN', n: 4, sea: true, wps: [], cont: [] },
      { id: 'S-30', a: 'URT', b: 'CJM', n: 2, wps: [], cont: [] },
      { id: 'X-03', a: 'HDY', b: 'PEN', n: 2, sea: true, band: 5000, wps: [], cont: [] }
    ],
    pilots: [{ id: 'S1', name: 'A. Wibowo', station: 'ROC Jakarta', zone: 'ID' }, { id: 'S2', name: 'D. Santoso', station: 'ROC Jakarta', zone: 'ID' }, { id: 'S3', name: 'R. Putri', station: 'ROC Jakarta', zone: 'ID' }, { id: 'S4', name: 'H. Siregar', station: 'ROC Jakarta', zone: 'ID' }, { id: 'S5', name: 'M. Reyes', station: 'ROC Manila', zone: 'PH' }, { id: 'S6', name: 'J. Dela Cruz', station: 'ROC Manila', zone: 'PH' }, { id: 'S7', name: 'A. Santos', station: 'ROC Manila', zone: 'PH' }, { id: 'S8', name: 'C. Bautista', station: 'ROC Manila', zone: 'PH' }, { id: 'S9', name: 'R. Villanueva', station: 'ROC Manila', zone: 'PH' }, { id: 'S10', name: 'S. Chaiyaporn', station: 'ROC Bangkok', zone: 'TH' }, { id: 'S11', name: 'N. Srisuk', station: 'ROC Bangkok', zone: 'TH' }, { id: 'S12', name: 'P. Wongsa', station: 'ROC Bangkok', zone: 'TH' }],
    cargo: [
      ['DRY', 'Marketplace parcels, island delivery', 'E-commerce sort centre'], ['COLD', 'Vaccines and insulin', 'Provincial health office'],
      ['COLD', 'Chilled tuna and seafood', 'Fishing port co-operative'], ['DRY', 'Resort and hotel supplies', 'Hospitality group'],
      ['SENS', 'Phones and electronics stock', 'Retail distributor'], ['LIQ', 'Hospital lab reagents', 'Provincial hospital'],
      ['DRY', 'Genset and ferry engine spares', 'Marine services yard'], ['COLD', 'Dairy and fresh produce', 'Supermarket chain'],
      ['DRY', 'School and government documents', 'Provincial office'], ['SENS', 'Medical devices, sterile', 'Hospital supply desk']
    ]
  }
];

const POD_TYPES = {
  DRY:  { label: 'DRY',        prefix: 'DR', color: '#C9CDD2', stripe: '#E8523F' },
  COLD: { label: 'COLD CHAIN', prefix: 'CC', color: '#E9EEF2', stripe: '#78AAFF' },
  LIQ:  { label: 'LIQUID',     prefix: 'LQ', color: '#B9C0C6', stripe: '#FAC83C' },
  SENS: { label: 'SENSITIVE',  prefix: 'SN', color: '#D8D4CC', stripe: '#C08CF0' },
  DEF:  { label: 'DEFENCE',    prefix: 'DF', color: '#6F7A72', stripe: '#3DDC97' },
  EMPTY: { label: 'EMPTY POD',  prefix: 'EP', color: '#9AA0A6', stripe: '#5A6068' }     // every airframe flies with a pod fitted, loaded or empty
};
