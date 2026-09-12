/* =============================================================================
 *  data.js — the single source of truth for the car-decision site
 *  Bellevue, WA · compiled 11–12 Sep 2026
 * =============================================================================
 *
 *  RULE ZERO
 *  ---------
 *  No number in this file may be invented. If a figure is not in the research
 *  files, it is a PENDING slot. A pending slot never carries a plausible
 *  placeholder value — it carries `v: null`. The UI renders pending slots as
 *  visible gaps, and every calculator that depends on one refuses to compute.
 *
 *  THE FACT WRAPPER
 *  ----------------
 *  Any single data point is a "fact" object:
 *
 *      {
 *        v:      <number|string|boolean|array|null>   the value. null == unknown
 *        u:      "usd" | "pct" | "pp100" | "mpg" | "yr" | "mi" | ...  (optional)
 *        status: "verified" | "pending" | "unverified"
 *        src:    "<sourceId>" | ["<sourceId>", ...]   keys into DATA.sources
 *        date:   "YYYY-MM-DD"   (optional; defaults to the source's date)
 *        note:   "..."          (optional; a caveat that MUST survive into the UI)
 *        need:   "..."          (pending only: what has to be looked up)
 *      }
 *
 *  STATUS VOCABULARY — exactly three values, and they mean different things:
 *
 *    "verified"    Read from a named, dated source. Renders normally, with the
 *                  source and date reachable from the UI.
 *    "pending"     NOT YET RESEARCHED. `v` is null. Renders as a hatched
 *                  placeholder that cannot be mistaken for data. Fill `v` and
 *                  flip `status` to "verified" to bring it alive.
 *    "unverified"  A value exists but is a judgement, an estimate, an optimistic
 *                  source, or a claim we could not confirm. Renders with a
 *                  visible flag. Never silently promoted.
 *
 *  GROUP STATUS
 *  ------------
 *  A table or block whose rows all share one provenance carries the status once,
 *  on the group: `{ status, src, date, note, rows: [...] }`. Rows inside such a
 *  group are plain values. A row may override with its own `status`/`src`/`note`.
 *
 *  JUDGEMENTS ARE NOT FACTS
 *  ------------------------
 *  A recommendation or a ranking is not measurable, so it does not take a
 *  `status`. Judgement objects carry instead:
 *      confidence: "high" | "medium" | "low"
 *      basis:      [<sourceId|factPath>, ...]   what it rests on
 *      changesIf:  "..."                        what would overturn it
 *
 *  SCORE CELLS (DATA.matrix)
 *  -------------------------
 *  A criteria-matrix cell is:
 *      { s: 1..5 | null, st: <status>, why: "<one line>", src: [...] }
 *  `s: null` with `st: "pending"` means the score is unknown. The ranking model
 *  never guesses it: it computes a BAND from s=1 to s=5 for every pending cell,
 *  and the UI shows the band. See DATA.weighting for the formula, which is
 *  printed in the UI verbatim.
 *
 *  TO EXTEND THIS FILE
 *  -------------------
 *  1. Add your source to DATA.sources first. Nothing may cite an absent source.
 *  2. Fill `v`, set `status: "verified"`, set `src`, set `date`.
 *  3. Delete `need`.
 *  4. Nothing in index.html should need to change. If it does, that is a bug in
 *     index.html, not in this file.
 *
 *  EVERY PENDING KEY IS LISTED AT THE BOTTOM OF THIS FILE (DATA.pendingIndex),
 *  with its dotted path, so you can find them all without grepping.
 * ============================================================================= */

window.DATA = (function () {
  "use strict";

  /* Shorthand builders. Purely sugar — they emit the fact shape documented above. */
  const V = (v, src, opts) => Object.assign({ v, status: "verified", src }, opts || {});
  const U = (v, src, opts) => Object.assign({ v, status: "unverified", src }, opts || {});
  const P = (need, opts) => Object.assign({ v: null, status: "pending", need }, opts || {});

  /* ===========================================================================
   * 0. META
   * ========================================================================= */
  const meta = {
    title: "Buying a car",
    subtitle: "Bellevue, WA · September 2026",
    compiled: "2026-09-11",
    lastTouched: "2026-09-12",
    today: "2026-09-12",
    testDriveDate: "2026-09-12",
    buyer: {
      location: V("Bellevue, WA 98007 — King County, inside the Sound Transit RTA district", "wa-dor", {
        date: "2026-09-12",
        note: "WA DOR location code 1704, \"BELLEVUE RTA\", rta=\"Y\", Q3 2026."
      }),
      budget: V("$40,000–$60,000, with $65,000 on the road as a soft ceiling", "owner", { date: "2026-09-11" }),
      homeCharging: V("None. Assigned parking spot in a multi-unit building, no outlet.", "owner", { date: "2026-09-11" }),
      officeCharging: U("Possibly at the Amazon office. Unconfirmed, and employer-dependent.", "owner", {
        date: "2026-09-11",
        note: "Depends on continued employment, the return-to-office policy, charger availability, and staying in a building that has chargers. None of those are under the buyer's control."
      }),
      holdPeriod: V("Long. Plan on 7–10 years.", "owner", { date: "2026-09-11" }),
      timeline: V("Willing to buy in 2 weeks to 2 months.", "owner", {
        date: "2026-09-12",
        note: "Buyer's words: \"car matters more, don't want to rush but if we decide on Mazda then why not\"."
      }),
      household: V("Spouse lives in Chicago and is not a daily passenger. The rear-seat test is about a future child seat, not about her comfort.", "owner", { date: "2026-09-12" }),
      taxFiling: V("Married filing separately. Income about $200,000+.", "owner", { date: "2026-09-12" }),
      licence: V("US licence for 4 years. No car-insurance history in the buyer's own name.", "owner", { date: "2026-09-12" })
    }
  };

  /* ===========================================================================
   * 1. SOURCES — nothing in this file may cite a source that is not here
   * ========================================================================= */
  const sources = {
    owner: { publisher: "The buyer", title: "Stated criteria, constraints and decisions", date: "2026-09-11", url: null },

    "kbb-trims-2026": {
      publisher: "Kelley Blue Book", title: "2026 model trim tables and per-trim MSRP",
      date: "2026-09-12", url: "https://www.kbb.com/",
      note: "KBB trim prices INCLUDE destination, but KBB implies a $1,450 Toyota destination fee and the real figure is $1,595 — so ADD $145 to any KBB-based Toyota estimate. Car and Driver runs a uniform ~$500 above KBB on Toyota and Lexus; neither feed could be dated."
    },
    "toyota-com-2026": {
      publisher: "Toyota USA", title: "2026 model pricing (excludes destination)",
      date: "2026-09-12", url: "https://www.toyota.com/",
      note: "Manufacturer prices EXCLUDE destination. Toyota's destination charge is $1,595, RESOLVED: all 48 dealer window stickers read \"DELIVERY, PROCESSING AND HANDLING FEE 1,595.00\", and Car and Driver's published $33,495-$50,095 range reconciles at $1,595 against Toyota's base prices at both ends. The earlier $1,450/$1,495 figures were wrong."
    },
    "rav4-sticker": {
      publisher: "Michael's Toyota of Bellevue", title: "2026 RAV4 XLE Premium FWD spec sheet, VIN 2T36DRBV5TW026590",
      date: "2026-09-12", url: null,
      note: "Toyota-generated spec sheet supplied by the buyer. Confirms identity and MSRP. Does NOT confirm the car is on the lot: no status field, no arrival date, no odometer."
    },

    "cr-brand-2026": {
      publisher: "Carscoops", title: "Consumer Reports 2026 Automotive Brand Report Card — reliability rankings",
      date: "2026-04-12", url: "https://www.carscoops.com/2026/04/consumer-reports-reliability-rankings/",
      note: "The underlying Consumer Reports data was released 4 Dec 2025. It is nine months old. CR's own pages return HTTP 403, so this table comes from the Carscoops page only."
    },
    "jdp-iqs-2026": {
      publisher: "J.D. Power", title: "2026 U.S. Initial Quality Study",
      date: "2026-06-25", url: "https://www.jdpower.com/business/press-releases/2026-us-initial-quality-study-iqs",
      note: "Measures problems at 90 days. Build quality, not durability. Base 78,514 owners of 2026 vehicles. Rank numbers are derived from score order — J.D. Power prints scores without ranks."
    },
    "jdp-vds-2026": {
      publisher: "Visual Capitalist", title: "Car brands with the fewest problems, 2026 (J.D. Power Vehicle Dependability Study)",
      date: "2026-06-20", url: "https://www.visualcapitalist.com/car-brands-with-the-fewest-problems-2026/",
      note: "Measures three-year-old cars. This is the durability study. Ranks 16–26 could not be verified."
    },
    "cr-cx5-avoid": {
      publisher: "Consumer Reports (Jon Linkov)", title: "Reasons to avoid the 2026 Mazda CX-5 now",
      date: "2026-06-05", url: "https://www.consumerreports.org/cars/suvs/reasons-to-avoid-the-2026-mazda-cx-5-now-a1077933851/",
      note: "CR bought an S Preferred at about $37,000. The CX-5 has no CR Overall Score and no predicted reliability rating — testing was incomplete."
    },
    "cd-cx5-lt": {
      publisher: "Car and Driver (Drew Dorian)", title: "2026 Mazda CX-5 Premium Plus long-term test",
      date: "2026-08-24", url: "https://www.caranddriver.com/reviews/2026-mazda-cx-5-premium-plus-reliability-maintenance/",
      note: "$41,080 as tested, on a 40,000-mile test. No TSB number is cited and C/D never says the dealer reproduced the fault."
    },
    "iseecars-2026": {
      publisher: "iSeeCars", title: "Cars that hold their value — 2026 depreciation study",
      date: "2026-03-24", url: "https://www.iseecars.com/cars-that-hold-their-value-study",
      note: "Over 950,000 actual completed sales of five-year-old cars, Mar 2025 – Feb 2026. Real sales, not modelled projections."
    },
    "iseecars-slashgear": {
      publisher: "SlashGear, reporting iSeeCars", title: "Mazda five-year depreciation figures",
      date: "2026-03-24", url: null
    },
    caredge: {
      publisher: "CarEdge", title: "Model depreciation projections",
      date: "2026-01-01", url: null,
      note: "SYSTEMATICALLY OPTIMISTIC. Runs above iSeeCars and KBB, sometimes by more than 20 points on the same car — for the RAV4 CarEdge says 28% where KBB says 51%. Treat CarEdge rows as the optimistic end of a range, not as measurements."
    },
    "kbb-resale-2026": {
      publisher: "Kelley Blue Book", title: "2026 Best Resale Value Award winners (24th annual)",
      date: "2026-03-19", url: "https://mediaroom.kbb.com/2026-03-19-Kelley-Blue-Book-Announces-2026-Best-Resale-Value-Award-Winners",
      note: "Method: projected five-year residual as a percentage of MSRP at 75,000 miles. KBB publishes brand averages only — no per-model residual percentages."
    },
    "carbuzz-brand-resale": {
      publisher: "CarBuzz, using CarEdge data", title: "Which car brand has the best resale value?",
      date: "2026-07-29", url: null,
      note: "CarEdge-sourced, therefore optimistic. See the CarEdge note."
    },
    repairpal: {
      publisher: "RepairPal", title: "Average annual repair cost by model",
      date: "2026-09-11", url: null,
      note: "METHODOLOGY CONTRADICTS ITSELF. RepairPal's model pages define the figure as UNSCHEDULED repairs and say routine oil changes were omitted; RepairPal's brand pages say the figure INCLUDES scheduled maintenance. Both claims sit on RepairPal's own site. It therefore does not answer \"what does a service cost\". Severity thresholds also differ by price class, so a luxury car's severe-repair rate and a mainstream car's use different bars."
    },
    "cr-10yr": {
      publisher: "Consumer Reports 10-year owner-paid survey, via Carscoops", title: "What owners pay to maintain and repair a car over 10 years",
      date: "2024-12-01", url: null,
      note: "DOLLAR FIGURES ARE THE 2024 EDITION. The 2025 edition's brand order matches closely, but its dollars are members-only. Read the shape, not the total."
    },
    "insurify-carscoops": {
      publisher: "Insurify, via Carscoops", title: "The priciest EVs to insure",
      date: "2026-06-13", url: null,
      note: "Study of over 235 million rates. National averages, not Washington rates."
    },
    "wa-insurance-2026": {
      publisher: "Washington insurance rate research", title: "Annual full-coverage premiums by model, Washington",
      date: "2026-09-12", url: null,
      note: "Washington-specific full-coverage averages. A first policy in the buyer's own name attracts a \"no prior coverage\" surcharge; surcharges multiply, so the absolute gap between models widens rather than shrinking."
    },
    "carscoops-tesla-nhtsa": {
      publisher: "Carscoops", title: "NHTSA opens preliminary investigation into Tesla front suspension links",
      date: "2026-08-03", url: null
    },
    "electrek-gfv": {
      publisher: "Electrek", title: "Tesla moves to guarantee resale value for buyers after price cuts",
      date: "2026-07-14", url: null,
      note: "Australia only. Financed by Driva, an Australian company. No percentage of MSRP is published."
    },
    "gadgetreview-gfv": { publisher: "Gadget Review", title: "Tesla guaranteed future value programme", date: "2026-07-14", url: null },
    mitchell: { publisher: "Mitchell International", title: "2025 collision repair severity", date: "2025-12-31", url: null },
    "uk-ev-claims": { publisher: "UK insurance claim data", title: "Most expensive EV repair parts", date: "2026-01-01", url: null, note: "UK claim data. Dollar conversions as reported." },

    "mazda-offer": {
      publisher: "Mazda USA", title: "0% APR offer terms, read from Mazda's own offer page",
      date: "2026-09-11", url: null
    },
    "cd-prices": { publisher: "Car and Driver", title: "2026 model-year MSRP ranges", date: "2026-09-11", url: null, note: "MSRP before destination, tax and fees." },
    "kbb-modely": { publisher: "Kelley Blue Book", title: "2026 Tesla Model Y trims and prices", date: "2026-09-11", url: null },
    "mazda-usa": { publisher: "Mazda USA", title: "CX-50 Hybrid pricing and EPA figures", date: "2026-09-11", url: null },

    "autoblog-cx90": { publisher: "Autoblog", title: "Least reliable cars in America — Mazda CX-90 PHEV", date: "2026-07-22", url: null },
    "usatoday-cx90": { publisher: "USA Today", title: "Mazda CX-90 reliability score", date: "2025-12-18", url: null },
    "cleantechnica-cx70": { publisher: "CleanTechnica", title: "Five least reliable midsize SUVs", date: "2026-05-14", url: null },
    "cr-rav4-2026": { publisher: "Consumer Reports", title: "Review: 2026 Toyota RAV4 impresses with powertrain, infotainment and safety advances", date: "2026-08-06", url: null },
    "cd-rav4-2026": { publisher: "Car and Driver", title: "2026 Toyota RAV4 review", date: "2026-09-11", url: null },
    "cd-crv-10best": { publisher: "Car and Driver", title: "2026 10Best — Honda CR-V", date: "2026-09-11", url: null },
    "cd-cx50": { publisher: "Car and Driver", title: "2026 Mazda CX-50 and CX-50 Hybrid review", date: "2026-09-11", url: null },

    "wa-dor": {
      publisher: "Washington State Department of Revenue", title: "Local sales and use tax rates, Q3 2026 — location code 1704 (Bellevue RTA)",
      date: "2026-09-12", url: null
    },
    "wa-cost-2026": {
      publisher: "Washington vehicle cost research", title: "Bellevue purchase tax, RTA excise tax, tab fees, dealer fees",
      date: "2026-09-12", url: null,
      note: "Statutory citations are carried on the individual rows: RCW 82.08.020(3) motor-vehicle tax, RCW 46.17.323/324 electrification surcharges, RCW 46.70.180 doc-fee cap, RCW 82.08.9999 expired EV exemption."
    },
    "kuow-ev-tax": { publisher: "KUOW", title: "Washington sees 11th-hour rush to buy EVs before tax incentive disappears", date: "2025-09-24", url: null },
    "fed-30d": { publisher: "Federal statute / IRS", title: "Clean vehicle credit (30D) termination", date: "2025-09-30", url: null },
    "fed-30c": { publisher: "Federal statute / IRS", title: "Alternative fuel vehicle refueling property credit (30C) termination", date: "2026-06-30", url: null },
    "wa-used-ev-rebate": { publisher: "Washington State", title: "Used-EV rebate programme for vulnerable populations", date: "2026-09-12", url: null },
    pse: { publisher: "Puget Sound Energy", title: "Home EV charger rebate eligibility", date: "2026-09-12", url: null },
    "fed-loan-interest": { publisher: "Federal statute", title: "Deduction for interest on new-vehicle loans", date: "2026-09-12", url: null, note: "Assembly-in-the-United-States requirement, with an income phase-out. The phase-out treatment for married-filing-separately has not been confirmed." }
  };

  /* ===========================================================================
   * 2. THE SIX CRITERIA — in the buyer's own stated order
   * ========================================================================= */
  const criteria = [
    {
      id: "reliable", n: 1, label: "Reliable, low service cost",
      stated: "No large service bill every few months.",
      defaultWeight: 5,
      measuredBy: "Brand rank in all three 2026 studies, RepairPal annual repair cost, and the Consumer Reports years 6–10 owner-paid figure.",
      src: ["owner"]
    },
    {
      id: "value", n: 2, label: "Value for money",
      stated: "This is a large purchase. We do not want to skimp.",
      defaultWeight: 4,
      measuredBy: "Content and quality per dollar of out-the-door price. Judgement, not a measurement — and it needs prices, so several cells are pending.",
      src: ["owner"]
    },
    {
      id: "resale", n: 3, label: "Holds its value",
      stated: "Holds its value.",
      defaultWeight: 4,
      measuredBy: "Five-year depreciation from iSeeCars completed sales where it exists; KBB awards and CarEdge projections where it does not.",
      src: ["owner"]
    },
    {
      id: "space", n: 4, label: "Spacious — room for a future kid",
      stated: "A future kid and passengers must fit easily. No sedans.",
      defaultWeight: 5,
      measuredBy: "Rear seat behind the driver's own seating position, child-seat fit, and boot volume with a stroller and a suitcase at once. Today's test drive resolves this criterion.",
      src: ["owner"]
    },
    {
      id: "apr", n: 5, label: "Low APR (a bonus)",
      stated: "Low APR is a bonus, not a requirement.",
      defaultWeight: 2,
      measuredBy: "Manufacturer subsidised rate available today. Only Mazda's is confirmed; the rest need dealer quotes.",
      src: ["owner"]
    },
    {
      id: "hybrid", n: 6, label: "Prefer a hybrid",
      stated: "Prefer a hybrid over pure petrol. Added 11 Sep 2026.",
      defaultWeight: 4,
      measuredBy: "Full hybrid or plug-in hybrid only. A 48-volt mild hybrid does not count — it cannot drive the car on electricity and returns very little fuel saving.",
      src: ["owner"]
    }
  ];

  const weighting = {
    formula: "score = Σ( weight_i × cell_i ) ÷ Σ( weight_i × 5 ) × 100",
    explanation: [
      "Each criterion gets a weight from 0 to 5. Each car gets a cell score from 1 to 5 per criterion.",
      "The score is the weighted sum divided by the best possible weighted sum, as a percentage. A car that scored 5 on every criterion would be 100.",
      "A PENDING cell is never guessed. Instead the model computes the score twice — once with every pending cell at 1, once at 5 — and shows the result as a band.",
      "Cars are ordered by the middle of their band. The band is drawn so you can see how much of the ordering is actually unknown."
    ],
    scale: { 1: "Poor", 2: "Weak", 3: "Average", 4: "Good", 5: "Best in this shortlist" }
  };

  /* ===========================================================================
   * 3. CARS
   * ========================================================================= */
  const cars = {
    rav4hev: {
      name: "Toyota RAV4 Hybrid", brand: "Toyota", body: "2-row SUV",
      shortlisted: true,
      hybrid: V("Full hybrid. The 2026 RAV4 is hybrid-only — the petrol-only engines were dropped. Up to 236 hp.", "cd-rav4-2026"),
      price: V([33495, 50095], "cd-prices", { u: "usd", note: "2026 MSRP range for the RAV4 line, which is hybrid-only. One real sticker seen: XLE Premium FWD, base $36,100 + $1,139 options + $1,595 destination = $38,834 total MSRP, no dealer markup and no dealer add-ons. That car works out to about $43,913 out-the-door in Bellevue, roughly $21,000 under the ceiling. It is a conventional hybrid (43 mpg combined, 226 hp), so it pays the $75/yr Washington surcharge, not $225. MOONROOF AND COLOUR RESOLVED: the XLE Premium FWD CAN take a panoramic moonroof, package SR at $1,850, no trim change needed. Storm Cloud paint is free and Wind Chill Pearl is $475, and both are available on this trim. The same car with the roof in Storm Cloud is $40,684 MSRP, about $45,963 out-the-door; in Wind Chill Pearl $41,159 and about $46,489. Hybrid grades are LE, SE, XLE Premium, Woodland, XSE, Limited — there is no plain XLE and no Platinum for 2026." }),
      assembly: U("Mixed. NHTSA's MY2026 report says US, but every 2026 RAV4 Hybrid VIN sampled decoded to Woodstock, Ontario or to Japan. The one sticker seen decoded to Woodstock, Ontario.", "rav4-sticker", { note: "Assembly is per-VIN, not per model. Decode the actual VIN at nhtsa.gov/vin-decoder." }),
      firstYear: V("Yes — fully redesigned for 2026. Car and Driver: Toyota gave it a \"tip-to-tail re-do\" and dropped the petrol-only engines. Mitigation: the hybrid system was carried forward, not invented.", "cd-rav4-2026", { note: "CONTESTED: a later analysis claimed 2026 is the second year of this generation, citing no source. Car and Driver is preferred, so first-year risk stands." })
    },
    rav4phev: {
      name: "Toyota RAV4 PHEV", brand: "Toyota", body: "2-row SUV",
      shortlisted: true,
      hybrid: V("Plug-in hybrid. 324 hp on all trims, up to 54 miles of electric range on the SE. AWD only, so there is no front-drive version. Pays Washington's $225/yr surcharge, not $75.", "kbb-trims-2026"),
      price: V([43095, 50095], "toyota-com-2026", { u: "usd", note: "Including the confirmed $1,595 destination. Excluding destination: $41,500-$48,500. All four grades are AWD only. Trims: SE $41,500 (54 mi electric), Woodland $45,300 (49 mi), XSE $47,200 (52 mi), GR Sport $48,500 (49 mi). 324 hp on every trim. Named \"RAV4 Plug-in Hybrid\" now; \"Prime\" is gone; there is no Limited PHEV. KBB's sidebar figure of 42 miles is stale 2025 data." }),
      assembly: V("Takaoka, Japan.", "kbb-trims-2026"),
      firstYear: V("Yes — fully redesigned for 2026.", "cd-rav4-2026")
    },
    crvhev: {
      name: "Honda CR-V Hybrid", brand: "Honda", body: "2-row SUV",
      shortlisted: true,
      hybrid: V("Full hybrid, and full hybrid only — no CR-V plug-in exists for 2026. A 2.0-litre four with TWO electric motors, 204 hp, 37-40 mpg combined. That is 14 hp more than the petrol CR-V.", "kbb-trims-2026"),
      price: V([37080, 44000], "kbb-trims-2026", { u: "usd", note: "Including destination. Trims: Sport $37,080, Sport L $40,175, TrailSport $40,250, Sport Touring $44,000. The cheapest full hybrid on the shortlist, and the cheapest to run at $407/yr on RepairPal." }),
      assembly: V("Greensburg, Indiana and East Liberty, Ohio.", "kbb-trims-2026", { note: "The petrol CR-V is also built in Alliston, Ontario, so for that version the VIN decides." }),
      firstYear: V("No. Not a new generation for 2026, so there is no first-year risk.", "cd-crv-10best")
    },
    cx50hev: {
      name: "Mazda CX-50 Hybrid", brand: "Mazda", body: "2-row SUV",
      shortlisted: true,
      hybrid: V("Full hybrid, and the powertrain is borrowed from the Toyota RAV4 Hybrid.", "cd-cx50"),
      price: V(34750, "mazda-usa", { u: "usd", note: "\"From\" price. The CX-50 line overall is $31,395–$44,395 per Car and Driver. Per-trim Hybrid prices not retrieved." }),
      assembly: V("Mazda Toyota Manufacturing, Huntsville, Alabama. There is no Japan-built CX-50.", "mazda-usa"),
      firstYear: V("No. In production since 2022. The platform and the line are both mature.", "cd-cx50")
    },
    lexusnx: {
      name: "Lexus NX", brand: "Lexus", body: "2-row luxury SUV",
      shortlisted: true,
      hybrid: V("Both a full hybrid and a plug-in. NX 350h is the full hybrid; NX 450h+ is the plug-in at 302 hp with 37 miles of electric range and 18.1 kWh. The petrol NX 350 is a 2.4 turbo, AWD only.", "kbb-trims-2026"),
      price: V([46070, 64125], "kbb-trims-2026", { u: "usd", note: "Including destination. NOTE THE ORDERING: the cheapest NX is the hybrid, at $46,070 for the NX 350h, below the petrol NX 350 at $46,720. Then 350h Premium $47,995, 350h Luxury $52,135, 350h F SPORT Handling $54,545. The plug-ins run $59,105-$64,125, which is about $66,700 on the road, so they break the ceiling. The NX 250 was dropped for 2026, and every NX now requires 91-octane premium fuel." }),
      assembly: V("Cambridge, Ontario, Canada. The plug-in versions are built in Miyawaka, Japan.", "kbb-trims-2026"),
      firstYear: U("No. The 2026 changes are trim-level: the NX 250 dropped, front-wheel drive added to the 350h, a new Premium grade for the plug-in. No source describes a redesign.", "kbb-trims-2026", { note: "Absence of a redesign claim, not a positive statement that the generation is unchanged." })
    },
    lexusrx: {
      name: "Lexus RX", brand: "Lexus", body: "2-row luxury SUV",
      shortlisted: true,
      hybrid: V("Four powertrains for 2026: petrol RX 350; RX 350h full hybrid; RX 500h full hybrid at 366 hp with no plug; RX 450h+ plug-in with 37 miles of electric range and 83 MPGe.", "kbb-trims-2026"),
      price: V([51975, 73310], "kbb-trims-2026", { u: "usd", note: "Including destination. RX 350h $54,275, 350h Premium $56,450, 350h Luxury $64,195. The RX 500h full hybrid is $66,850 and the RX 450h+ plug-ins are $66,680 and $73,310 — all three break the ceiling before tax. Car and Driver puts the petrol top at $65,095 against KBB's $62,695, a $2,400 gap wider than the usual offset." }),
      assembly: V("Cambridge, Ontario, Canada. The plug-in is built in Miyawaka, Japan.", "kbb-trims-2026"),
      firstYear: U("No. No source describes a 2026 redesign.", "kbb-trims-2026", { note: "IMPORTANT for the space criterion: the 2026 US RX is 2-row and 5-seat ONLY. The 3-row RX 350L is gone. The 3-row Lexus is the TX." })
    },
    grandhighlander: {
      name: "Toyota Grand Highlander Hybrid", brand: "Toyota", body: "3-row SUV",
      shortlisted: true,
      hybrid: V("Full hybrid, in two outputs, neither with a plug. The standard system makes 245 hp and 36 mpg; Hybrid MAX makes 362 hp through a 6-speed automatic and drops to 27 mpg. Pays Washington's $75/yr surcharge.", "kbb-trims-2026"),
      price: V([46205, 60770], "kbb-trims-2026", { u: "usd", note: "Including destination. LE $46,205, XLE $47,375, Limited $53,705, Nightshade $54,685, Hybrid MAX Limited $56,685, Hybrid MAX Platinum $60,770. AWD is standard on every trim EXCEPT the XLE, where it is a $1,600 option — so the XLE in front-wheel drive is the efficiency pick at 36 mpg against 34, and this buyer does not need AWD. About $53,500 out-the-door in Bellevue." }),
      assembly: V("Princeton, Indiana.", "kbb-trims-2026"),
      firstYear: V("No. Not a 2026 redesign, so there is no first-year risk.", "kbb-trims-2026", { note: "Third row 33.5 in of legroom and 20.6 cu ft behind it, against the smaller Highlander's 28.0 in and 16.0 cu ft. KBB calls the Highlander's third row \"best left to smaller children\". This is the real 3-row of the two, and it costs LESS." })
    },
    modely: {
      name: "Tesla Model Y", brand: "Tesla", body: "2-row SUV (battery electric)",
      shortlisted: false, ruledOut: true,
      hybrid: V("Not a hybrid. Battery electric — which needs charging the buyer does not have.", "owner"),
      price: V([41630, 61630], "cd-prices", { u: "usd" }),
      trims: {
        status: "verified", src: "kbb-modely",
        rows: [
          { trim: "Standard", msrp: 41630, range: "294–327 mi" },
          { trim: "Long Range", msrp: 46630, range: "294–327 mi" },
          { trim: "Premium", msrp: 46630, range: "294–327 mi" },
          { trim: "Performance", msrp: 59130, range: "294–327 mi" }
        ]
      },
      assembly: V("Texas or California.", "cd-prices"),
      firstYear: null
    },
    bmwx3: {
      name: "BMW X3", brand: "BMW", body: "2-row luxury SUV",
      shortlisted: false, ruledOut: true,
      hybrid: V("48-volt mild hybrid only. Does not count — it cannot drive the car on electricity.", "owner"),
      price: V([52650, 67850], "cd-prices", { u: "usd" }),
      assembly: null,
      firstYear: V("A newer generation than the Mercedes GLC.", "cd-prices")
    },
    cx5: {
      name: "Mazda CX-5 (2026)", brand: "Mazda", body: "2-row SUV",
      shortlisted: false, ruledOut: true,
      hybrid: V("None. Mazda told Consumer Reports its own hybrid arrives for model year 2027.", "cr-cx5-avoid"),
      price: V([31485, 40485], "cd-prices", { u: "usd" }),
      assembly: V("Japan. The CX-5 is the Japan-built car; the CX-50 is the Alabama-built one.", "mazda-usa"),
      firstYear: V("Yes — an all-new generation. Longer and wider, wheelbase up 4.5 inches, standard AWD, carried-over 2.5-litre naturally aspirated engine and 6-speed automatic. The 2.5-litre turbo is gone.", "cd-prices")
    },
    glc: {
      name: "Mercedes-Benz GLC", brand: "Mercedes-Benz", body: "2-row luxury SUV",
      shortlisted: false, ruledOut: true,
      hybrid: V("48-volt mild hybrid only. Does not count.", "owner"),
      price: V([50900, 63500], "cd-prices", { u: "usd" }),
      assembly: null,
      firstYear: V("No. Fully redesigned in 2023, minor updates for 2026 — the lower-risk German of the two.", "cd-prices")
    },
    cx90phev: {
      name: "Mazda CX-90 PHEV", brand: "Mazda", body: "3-row SUV",
      shortlisted: false, ruledOut: true,
      hybrid: V("Plug-in hybrid.", "autoblog-cx90"),
      price: V([52225, 60230], "kbb-trims-2026", { u: "usd", note: "PHEV, including destination: Preferred $52,225, Premium Sport $57,030, Premium Plus $60,230. Excluding destination: $50,695-$58,700; Mazda's destination is $1,530, confirmed by arithmetic on all 9 CX-90 trims. The inline-6 CX-90 is $40,830-$59,100 but is a 48-VOLT MILD HYBRID, which fails the hybrid criterion outright. So the I6 fails criterion 6 and the PHEV fails criterion 1 — there is no CX-90 to buy." }),
      assembly: null, firstYear: null
    },
    forester: {
      name: "Subaru Forester", brand: "Subaru", body: "2-row SUV",
      shortlisted: false, ruledOut: true,
      hybrid: V("Full hybrid, series-parallel, 194 hp, 35 mpg combined against 26-29 for the petrol car. No plug.", "kbb-trims-2026"),
      price: V([36180, 42995], "kbb-trims-2026", { u: "usd", note: "Hybrid trims including destination: Premium $36,180, Sport $39,380, Limited $40,445, Touring $42,995. Petrol runs $31,445-$43,045. Subaru cut Forester prices in February 2026. AWD is standard with no front-drive version, so its main advantage is one this buyer does not need — and RepairPal puts it at $632/yr, the worst of the mainstream options." }),
      assembly: U("Subaru builds in Indiana.", "mazda-usa", { note: "Cited only as a general point about US plants building reliable cars — not confirmed for the 2026 Forester specifically." }),
      firstYear: null
    },
    sienna: {
      name: "Toyota Sienna", brand: "Toyota", body: "Minivan",
      shortlisted: false, ruledOut: true,
      hybrid: V("Full hybrid, and hybrid-only — it is the sole powertrain. 245 hp, 36 mpg combined in front-wheel drive.", "toyota-com-2026"),
      price: V([41320, 58710], "toyota-com-2026", { u: "usd", note: "EXCLUDING destination. LE $41,320, XLE $46,020, XSE $49,245, Limited $52,005, Woodland $52,100, Platinum $58,710. AWD adds $2,000. Eight seats are available only on LE and XLE. Confirms the earlier point: a Sienna costs LESS than an equivalent 3-row hybrid SUV, not more. Ruled out by the buyer on size and feel, which are valid grounds." }),
      assembly: null, firstYear: null
    }
  };

  /* Models named in the pending price research but not otherwise on the board. */
  const pendingModels = {
    note: "These models are in the price-research queue. Nothing about them is presented as fact yet.",
    rows: [
      { model: "Lexus NX", variants: "gas / hybrid / PHEV", key: "pendingModels.lexusNX" },
      { model: "Lexus RX", variants: "gas / hybrid / PHEV", key: "pendingModels.lexusRX" },
      { model: "Lexus TX", variants: "350 / 500h / 550h+", key: "pendingModels.lexusTX" },
      { model: "Honda CR-V Hybrid", variants: "hybrid", key: "pendingModels.crvHybrid" },
      { model: "Toyota RAV4 PHEV", variants: "PHEV", key: "pendingModels.rav4PHEV" },
      { model: "Toyota Highlander Hybrid", variants: "hybrid", key: "pendingModels.highlanderHybrid" },
      { model: "Toyota Grand Highlander Hybrid", variants: "hybrid, incl. Hybrid MAX", key: "pendingModels.grandHighlanderHybrid" },
      { model: "Subaru Forester", variants: "unknown", key: "pendingModels.forester" },
      { model: "Mazda CX-90", variants: "inline-6 / PHEV", key: "pendingModels.cx90" },
      { model: "Hyundai Palisade", variants: "unknown", key: "pendingModels.palisade" },
      { model: "Kia Telluride", variants: "unknown", key: "pendingModels.telluride" },
      { model: "Toyota Sienna", variants: "hybrid", key: "pendingModels.sienna" }
    ],
    needPerModel: ["MSRP range", "per-trim prices", "assembly plant", "hybrid type offered (HEV / PHEV / 48V mild / none)"]
  };

  /* ===========================================================================
   * 4. THE CRITERIA MATRIX
   * ========================================================================= */
  const C = (s, st, why, src) => ({ s: s, st: st, why: why, src: src || [] });

  const matrix = {
    rav4hev: {
      reliable: C(5, "verified", "Toyota is 1st in Consumer Reports reliability at 66. RepairPal $429/yr, 3rd of 26 compact SUVs. CR years 6–10 $3,775, the lowest of any non-Tesla brand here.", ["cr-brand-2026", "repairpal", "cr-10yr"]),
      value: C(4, "unverified", "Priced $33,495–$50,095 with a hybrid standard. Car and Driver is lukewarm on the interior: \"materials feel cheap\". A judgement, not a measurement.", ["cd-prices", "cd-rav4-2026"]),
      resale: C(5, "verified", "25.2% five-year depreciation, $7,731 lost, from 950,000 completed sales. Best figure on the board. Toyota also took the KBB brand award for the sixth year running.", ["iseecars-2026", "kbb-resale-2026"]),
      space: C(4, "unverified", "2-row, rated Good in the earlier assessment. Today's test drive settles it.", ["owner"]),
      apr: C(null, "pending", "No confirmed subsidised Toyota rate. Needs a dealer quote and a credit-union pre-approval to compare against.", []),
      hybrid: C(5, "verified", "Full hybrid, and the only powertrain offered — the petrol-only engines were dropped for 2026.", ["cd-rav4-2026"])
    },
    rav4phev: {
      reliable: C(4, "verified", "Same Toyota brand record, marked down one step because the J.D. Power VDS found plug-in hybrids the worst powertrain in the study at 281 PP100 against a 204 average.", ["cr-brand-2026", "jdp-vds-2026"]),
      value: C(null, "pending", "No PHEV price. Cannot judge value without it.", []),
      resale: C(5, "verified", "Carries the RAV4's 25.2% figure. iSeeCars reports the RAV4 and RAV4 Hybrid together and does not separate the PHEV.", ["iseecars-2026"]),
      space: C(4, "unverified", "Same body as the Hybrid.", ["owner"]),
      apr: C(null, "pending", "Needs a dealer quote.", []),
      hybrid: C(5, "verified", "Plug-in hybrid claiming 50 miles of electric range. It also removes the charging risk outright: charge at the office and driving is electric; fail to charge and it is simply a hybrid.", ["cd-rav4-2026"])
    },
    crvhev: {
      reliable: C(4, "verified", "Honda is 4th in CR at 59 and 13th in IQS. RepairPal $407/yr, the lowest figure on the board, 2nd of 26 compact SUVs. No J.D. Power VDS placing was retrieved. CR years 6–10 $4,400.", ["cr-brand-2026", "jdp-iqs-2026", "repairpal", "cr-10yr"]),
      value: C(null, "pending", "The petrol CR-V is $32,470–$38,450 but the Hybrid's prices were not retrieved.", []),
      resale: C(4, "verified", "28.9% five-year depreciation, $8,946 lost — second best, and behind the RAV4. Won the KBB compact SUV award.", ["iseecars-2026", "kbb-resale-2026"]),
      space: C(4, "unverified", "Rated Good in the earlier assessment; Car and Driver calls it \"a better all-arounder\" than the CX-50 and the boot is usually strong. Today's test drive settles it.", ["cd-crv-10best"]),
      apr: C(null, "pending", "Needs a dealer quote.", []),
      hybrid: C(null, "pending", "The CR-V Hybrid exists, but its system type was not confirmed against the 48-volt exclusion rule.", [])
    },
    cx50hev: {
      reliable: C(3, "verified", "Mazda sits in the bottom third of all three studies — CR 14th, IQS 21st, VDS 14th. But CR rates the CX-50 itself AVERAGE, and Mazda's fall is attributed to the CX-70 and CX-90, so do not transfer it. RepairPal has no CX-50 figure; the CX-5's is $447/yr. The hybrid powertrain is Toyota's.", ["cr-brand-2026", "jdp-iqs-2026", "jdp-vds-2026", "cr-cx5-avoid", "repairpal", "cd-cx50"]),
      value: C(4, "unverified", "From $34,750 with 38 mpg combined and 0% for 36 months on the table. Strong on paper. Mazda includes no free maintenance at all, so the first two years cost more out of pocket than a Toyota's.", ["mazda-usa", "mazda-offer", "cr-10yr"]),
      resale: C(2, "verified", "39.3% five-year depreciation — the worst of the shortlisted cars, 14 points behind the RAV4. Mazda won nothing in the KBB 2026 awards.", ["iseecars-slashgear", "kbb-resale-2026"]),
      space: C(2, "unverified", "The lowest, most sloped roof here. Tightest car on the board for rear headroom and cargo, which conflicts directly with criterion 4. Test this FIRST, before falling for how it drives.", ["cd-cx50"]),
      apr: C(5, "verified", "0% APR for 36 months, confirmed in Mazda's own offer terms with the CX-50 Hybrid named on the eligible list. The only confirmed subsidised rate on the board.", ["mazda-offer"]),
      hybrid: C(5, "verified", "Full hybrid, and the powertrain is the Toyota RAV4 Hybrid's. 39/37/38 mpg against 26 for the petrol CX-50 — a 12 mpg gain.", ["cd-cx50", "mazda-usa"])
    },
    lexusnx: {
      reliable: C(5, "verified", "Lexus is the only brand in the top four of all three studies: CR 3rd, IQS 4th, VDS 1st for the fourth year running. RepairPal NX 200t $690/yr, 2nd of 11 luxury compacts. Counterweight: CR years 6–10 $5,000, above Toyota's $3,775.", ["cr-brand-2026", "jdp-iqs-2026", "jdp-vds-2026", "repairpal", "cr-10yr"]),
      value: C(null, "pending", "No 2026 NX prices. This is the top research gap.", []),
      resale: C(3, "unverified", "Won the KBB luxury compact SUV award, and Lexus took the luxury brand award for the fifth year running at 47%. But the only NX percentage available — 41% depreciation — is CarEdge, which runs systematically optimistic. Soft row.", ["kbb-resale-2026", "caredge"]),
      space: C(3, "unverified", "A compact luxury SUV, so smaller than the RX. No measurements retrieved.", ["owner"]),
      apr: C(null, "pending", "Needs a dealer quote.", []),
      hybrid: C(null, "pending", "NX hybrid and PHEV availability for 2026 not confirmed.", [])
    },
    lexusrx: {
      reliable: C(5, "verified", "Same Lexus record. RepairPal RX 450h $540/yr and RX 350 $550/yr, both top-3 of 14 luxury midsize SUVs — cheaper to run than a Subaru Forester. Hybrid battery warranty 10 yr / 150,000 mi.", ["cr-brand-2026", "jdp-iqs-2026", "jdp-vds-2026", "repairpal"]),
      value: C(null, "pending", "No 2026 RX prices.", []),
      resale: C(3, "unverified", "Won the KBB luxury midsize SUV award. The only RX 350 percentage available — 33% depreciation — is CarEdge, therefore optimistic. Soft row.", ["kbb-resale-2026", "caredge"]),
      space: C(4, "unverified", "The larger Lexus, so it serves criterion 4 better than the NX. No measurements retrieved.", ["owner"]),
      apr: C(null, "pending", "Needs a dealer quote.", []),
      hybrid: C(null, "pending", "RX hybrid and PHEV availability for 2026 not confirmed.", [])
    },
    grandhighlander: {
      reliable: C(5, "verified", "Toyota brand record, applied at brand level only — no model-level reliability data was retrieved for the Grand Highlander.", ["cr-brand-2026", "cr-10yr"]),
      value: C(null, "pending", "No prices.", []),
      resale: C(4, "verified", "Won the KBB 2026 midsize SUV resale award. No percentage exists — KBB publishes brand averages only.", ["kbb-resale-2026"]),
      space: C(5, "unverified", "3-row, and the largest thing still on the board. The buyer accepted a 3-row SUV on 11 Sep 2026. No measurements retrieved.", ["owner"]),
      apr: C(null, "pending", "Needs a dealer quote.", []),
      hybrid: C(null, "pending", "Hybrid and Hybrid MAX system types not confirmed.", [])
    },
    modely: {
      reliable: C(4, "verified", "Kept here as a benchmark. Tesla rose eight places to 9th in CR, the largest gain in the study, credited to the Model 3 and \"in particular, the Model Y\". IQS score 149, better than average — but Tesla is NOT rank-eligible, so it has no rank. Against it: an NHTSA preliminary investigation covering nearly 1.2 million vehicles including 2021–2023 Model Y, and no RepairPal figure at all.", ["cr-brand-2026", "jdp-iqs-2026", "carscoops-tesla-nhtsa", "repairpal"]),
      value: C(2, "unverified", "$41,630–$61,630, and the running-cost advantage depends on charging the buyer does not have. Washington and federal purchase subsidies are both gone.", ["cd-prices", "kuow-ev-tax", "fed-30d"]),
      resale: C(1, "verified", "57.8% five-year depreciation, $26,020 lost — 2.3 times the RAV4's loss, and the 14th worst vehicle sold in America. Worse than the EV average of 57.2%. Won no KBB award.", ["iseecars-2026", "kbb-resale-2026"]),
      space: C(5, "unverified", "Rated Best for space in the earlier assessment.", ["owner"]),
      apr: C(null, "pending", "No Tesla rate retrieved.", []),
      hybrid: C(1, "unverified", "Not a hybrid. A battery electric car satisfies \"not pure petrol\" on its face, but with no home charging it fails the intent of the criterion — the fallback is Supercharging, which removes most of the running-cost advantage.", ["owner"])
    },
    bmwx3: {
      reliable: C(2, "verified", "The case against the X3 is COST, not reliability — BMW is 5th in CR at 58, nine places above Mazda, and 12th in IQS, above average. But RepairPal puts it at $1,034/yr, 10th of 11 luxury compacts, and CR's owner-paid survey puts BMW at $7,800 across years 6–10 against Toyota's $3,775. On record: a cylinder head replacement at $9,896–$12,254.", ["cr-brand-2026", "jdp-iqs-2026", "repairpal", "cr-10yr"]),
      value: C(2, "unverified", "$52,650–$67,850. Better interior, better seats, better road manners — and the top of the range is above the on-road ceiling before tax.", ["cd-prices"]),
      resale: C(2, "unverified", "54% five-year depreciation — but that figure is CarEdge, therefore optimistic, so the real number is probably worse. Won no KBB award. Soft row.", ["caredge", "kbb-resale-2026"]),
      space: C(4, "unverified", "Rated Good in the earlier assessment.", ["owner"]),
      apr: C(null, "pending", "No BMW rate retrieved.", []),
      hybrid: C(1, "verified", "48-volt mild hybrid only. The buyer's own rule excludes it: it cannot drive the car on electricity and returns very little fuel saving.", ["owner"])
    }
  };

  /* ===========================================================================
   * 5. VERDICT
   * ========================================================================= */
  const verdict = {
    headline: {
      pick: "Toyota RAV4 Hybrid",
      alternate: "Lexus NX or RX, if the price research lands inside budget",
      oneLine: "The RAV4 Hybrid is the only car on the board that wins criterion 1 and criterion 3 outright and satisfies criterion 6 as standard.",
      confidence: "medium",
      basis: ["cr-brand-2026", "iseecars-2026", "kbb-resale-2026", "repairpal", "cr-10yr", "cd-rav4-2026"],
      changesIf: "Lexus NX or RX prices land well inside budget — Lexus is the only brand in the top four of all three reliability studies, and it wins criterion 1 more convincingly than Toyota does. A bad rear-seat result for the RAV4 at today's test drive would also move this.",
      caveat: "The RAV4 is a first-year redesign for 2026, and its 25.2% depreciation figure was measured on five-year-old cars — the previous generation. Treat it as a strong prior, not a promise."
    },

    shortlist: [
      { car: "rav4hev", rank: 1, reason: "Best depreciation on the board at 25.2%, Toyota 1st in CR reliability, $429/yr at RepairPal, and hybrid is the only powertrain offered.", confidence: "high" },
      { car: "rav4phev", rank: 2, reason: "The same car, plus 50 claimed electric miles — which is the only clean answer to having no home charger. Marked down because plug-in hybrids were the worst powertrain in the J.D. Power dependability study, and its price is unknown.", confidence: "medium" },
      { car: "lexusrx", rank: 3, reason: "Lexus is the only brand in the top four of all three studies, and the RX is the one that also answers criterion 4. Ranked on reliability alone — its price is unknown.", confidence: "low" },
      { car: "lexusnx", rank: 4, reason: "Same reliability record in a smaller body. Delivers the premium feel the buyer wants without breaking criterion 1, the way the German cars do.", confidence: "low" },
      { car: "crvhev", rank: 5, reason: "Cheapest to repair on the board at $407/yr, second-best depreciation at 28.9%, a Car and Driver 10Best, and no first-year risk. Loses to the RAV4 only on resale.", confidence: "medium" },
      { car: "grandhighlander", rank: 6, reason: "The 3-row answer, and the KBB midsize SUV resale winner. Everything about the specific car is still pending.", confidence: "low" },
      { car: "cx50hev", rank: 7, reason: "The mature Mazda, running Toyota's hybrid system, with the only confirmed 0% APR. But it depreciates 14 points worse than the RAV4 and it is the tightest cabin here — which collides with criterion 4.", confidence: "medium" }
    ],

    ruledOut: [
      {
        car: "modely", verdict: "Out",
        why: "Two verified numbers, either of which would be enough on its own.",
        reasons: [
          "Depreciation: 57.8% over five years, $26,020 lost, against the RAV4's $7,731. That is 2.3 times the loss, measured on completed sales, and it makes the Model Y the 14th worst vehicle sold in America.",
          "Insurance: $4,039 a year in Washington against $1,747 for a RAV4. That is +$2,300 every year, before the buyer's \"no prior coverage\" surcharge, which multiplies and therefore widens the gap.",
          "No home charging. An assigned space with no outlet, and an unconfirmed employer charger that depends on continued employment, the RTO policy, charger availability and staying in that building.",
          "The purchase subsidy is gone twice over: Washington's EV sales-tax exemption expired 31 Jul 2025 and the federal 30D credit ended for vehicles acquired after 30 Sep 2025.",
          "Washington charges a $225/yr registration surcharge on a BEV against $75 on a conventional hybrid.",
          "NHTSA has a preliminary investigation open covering nearly 1.2 million vehicles including 2021–2023 Model Y, after 156 complaints of front suspension link failure."
        ],
        fairCounterpoints: [
          "Tesla rose eight places to 9th in Consumer Reports reliability — the largest gain in the study — credited to the Model 3 and \"in particular, the Model Y\".",
          "IQS score 149, well better than the 175 average. Tesla is not rank-eligible, so it has no rank.",
          "Cheapest brand in CR's 10-year owner-paid survey: $580 in years 1–5 and $3,455 in years 6–10.",
          "Rated Best for space of anything on the board."
        ],
        confidence: "high", src: ["iseecars-2026", "wa-insurance-2026", "kuow-ev-tax", "fed-30d", "wa-cost-2026", "carscoops-tesla-nhtsa", "cr-brand-2026"]
      },
      {
        car: "cx5", verdict: "Out",
        why: "It fails criterion 1 and criterion 6, and it was the buyer's original first choice. Section 5 shows the whole working.",
        reasons: [
          "A first-year redesign — the worst point in a model's life for reliability — with a defect that is already documented and unresolved.",
          "Car and Driver's long-term car still bricks its infotainment at 10,000 miles, locking the driver out of navigation, radio AND climate control. A dealer software update in month 1 did not fix it.",
          "Consumer Reports published six reasons to avoid it, from a car CR bought itself at about $37,000.",
          "No hybrid until model year 2027, so it fails criterion 6 outright.",
          "Mazda is in the bottom third of all three 2026 reliability studies."
        ],
        fairCounterpoints: [
          "$0 spent on service, wear and repair in 10,296 miles and four months.",
          "Interior \"free from any signs of premature wear and tear\".",
          "26 mpg observed against an EPA 26 combined — it met the figure.",
          "Strong standard safety kit on every trim, the suspension absorbs impacts better than the old car, and CR says it \"handles better than most of its competitors\"."
        ],
        confidence: "high", src: ["cr-cx5-avoid", "cd-cx5-lt", "cr-brand-2026"]
      },
      {
        car: "cx90phev", verdict: "Out",
        why: "It is the 4th least reliable car in America.",
        reasons: [
          "Consumer Reports score about 20 — 4th least reliable vehicle sold in America. Problem areas: battery, electric motor, transmission, steering and suspension, brakes.",
          "The petrol CX-90 is barely better at 23, and the CX-70 and CX-70 PHEV score 32.",
          "These are the cars Carscoops blames for Mazda's eight-place fall in Consumer Reports."
        ],
        fairCounterpoints: [
          "It is a 3-row, which the buyer accepted on 11 Sep 2026, and it is on Mazda's 0% APR eligible list."
        ],
        confidence: "high", src: ["autoblog-cx90", "usatoday-cx90", "cleantechnica-cx70", "cr-brand-2026"]
      },
      {
        car: "bmwx3", verdict: "Out",
        why: "Cost, not reliability. Get this reason right — an earlier note in this workspace had it wrong.",
        reasons: [
          "CR owner-paid: BMW $7,800 across years 6–10 against Toyota's $3,775. About $4,000 more, arriving exactly when a 7–10 year owner still holds the car.",
          "RepairPal $1,034/yr, 10th of 11 luxury compact SUVs, rated 2.5/5. On record: cylinder head replacement $9,896–$12,254.",
          "BMW's 3 yr / 36,000 mi free maintenance — the most generous of the eight brands here — hides all of that until year 6. Free maintenance defers cost; it does not remove it.",
          "48-volt mild hybrid only, which the buyer's own rule excludes.",
          "Higher value means a higher Sound Transit RTA excise bill every year, for as long as the car is owned."
        ],
        fairCounterpoints: [
          "BMW is 5th in Consumer Reports reliability at 58 — NINE PLACES ABOVE MAZDA — and 12th in IQS, above average. The reliability case against BMW does not exist.",
          "It fits the budget, it satisfies \"do not skimp\", and it has the better interior, seats and road manners.",
          "In years 1–5 BMW costs the same as Subaru."
        ],
        confidence: "high", src: ["cr-10yr", "repairpal", "cr-brand-2026", "jdp-iqs-2026", "owner"]
      },
      {
        car: "glc", verdict: "Out",
        why: "The same cost argument as the X3, with worse reliability and no free maintenance.",
        reasons: [
          "Mercedes is 19th in Consumer Reports reliability at 41, five places below Mazda.",
          "CR owner-paid: $2,850 in years 1–5 — the worst first-five-years figure of the eight brands — and $7,675 in years 6–10. Ten-year total $10,525, the worst here.",
          "RepairPal $1,039/yr.",
          "NO free maintenance at all, which is why its years 1–5 figure is so much worse than BMW's.",
          "48-volt mild hybrid only.",
          "There is NO five-year depreciation figure for the GLC on any reachable outlet. The nearest proxy, a GLA 250 at 47.12% retained, is a smaller and cheaper car and must not be substituted."
        ],
        fairCounterpoints: [
          "Of the two Germans it is the lower-risk choice, because it is mature: fully redesigned in 2023 with only minor updates for 2026.",
          "It is 17th in IQS at 182, only 7 points off average and well ahead of Mazda's 210."
        ],
        confidence: "high", src: ["cr-brand-2026", "cr-10yr", "repairpal", "cd-prices", "owner"]
      },
      {
        car: "forester", verdict: "Out",
        why: "It is the one car whose brand reputation and whose running-cost data point in opposite directions.",
        reasons: [
          "RepairPal $632/yr and a 3.5/5 rating — 21st of 26 compact SUVs. That is the worst mainstream figure on the board, above the $521 compact-SUV average, and worse than a Lexus RX 450h at $540.",
          "CR owner-paid: $1,700 in years 1–5 and $5,500 in years 6–10. Its 10-year total of $7,200 is closer to BMW's $9,500 than to Toyota's $4,900.",
          "No free maintenance.",
          "Subaru won nothing in the KBB 2026 resale awards, and no five-year Forester depreciation percentage could be found anywhere.",
          "Whether it even offers a qualifying hybrid is still pending."
        ],
        fairCounterpoints: [
          "Subaru is 2nd in Consumer Reports reliability at 63, above Lexus. It is 8th in IQS and 6th in VDS — a top-eight finish in all three studies.",
          "2nd in brand five-year resale at 61.2% behind Toyota, though that figure is CarEdge-sourced and therefore optimistic."
        ],
        confidence: "medium", src: ["repairpal", "cr-10yr", "kbb-resale-2026", "cr-brand-2026", "carbuzz-brand-resale"]
      },
      {
        car: "sienna", verdict: "Out",
        why: "Ruled out by the buyer on 11 Sep 2026, on size and driving feel. Those are valid grounds.",
        reasons: [
          "The buyer rejected the minivan body style outright — on size and feel, not on cost.",
          "Revisit at two children."
        ],
        fairCounterpoints: [
          "The cost assumption behind the decision was backwards. The buyer assumed a minivan costs more than an equivalent SUV; it normally costs less. The decision still stands on its stated grounds — but the cost fact is recorded here in case the question returns.",
          "It is a Toyota hybrid, so it would inherit the brand's reliability and resale record."
        ],
        confidence: "high", src: ["owner"]
      }
    ],

    decisions: {
      status: "verified", src: "owner", date: "2026-09-11",
      rows: [
        { date: "2026-09-11", decision: "A 3-row SUV is acceptable." },
        { date: "2026-09-11", decision: "No mountain passes, no skiing. AWD is optional, not required." },
        { date: "2026-09-11", decision: "No minivan. Rejected on size and driving feel, not on cost. Revisit at two kids." },
        { date: "2026-09-11", decision: "Hybrid preferred over pure petrol. A 48-volt mild hybrid does not count." }
      ]
    }
  };

  /* ===========================================================================
   * 6. RELIABILITY EVIDENCE
   * ========================================================================= */
  const reliability = {
    studies: [
      {
        id: "cr", name: "Consumer Reports brand reliability", scoreLabel: "Score", better: "higher",
        base: "About 380,000 vehicles, 26 brands.",
        published: "2026-04-12", dataDate: "2025-12-04",
        limits: [
          "The underlying data was released 4 Dec 2025. IT IS NINE MONTHS OLD. No newer CR brand reliability report exists.",
          "CR's own pages return HTTP 403. This table comes from the fetched Carscoops page only. Headline-level corroboration exists from CNBC, Yahoo Finance and USA Today, 4–5 Dec 2025.",
          "Do not confuse this with CR's Brand Report Card OVERALL ranking, released the same day, which mixes road test, satisfaction and safety. Press coverage of that one put Subaru and BMW on top."
        ],
        status: "verified", src: "cr-brand-2026",
        rows: [
          { rank: 1, brand: "Toyota", score: 66, hl: true }, { rank: 2, brand: "Subaru", score: 63, hl: true },
          { rank: 3, brand: "Lexus", score: 60, hl: true }, { rank: 4, brand: "Honda", score: 59, hl: true },
          { rank: 5, brand: "BMW", score: 58, hl: true }, { rank: 6, brand: "Nissan", score: 57 },
          { rank: 7, brand: "Acura", score: 54 }, { rank: 8, brand: "Buick", score: 51 },
          { rank: 9, brand: "Tesla", score: 50, hl: true, delta: "up 8 — the largest gain in the study" },
          { rank: 10, brand: "Kia", score: 49 }, { rank: 11, brand: "Ford", score: 48 },
          { rank: 12, brand: "Hyundai", score: 48 }, { rank: 13, brand: "Audi", score: 44 },
          { rank: 14, brand: "Mazda", score: 43, hl: true, delta: "down 8" },
          { rank: 15, brand: "Volvo", score: 42 }, { rank: 16, brand: "Volkswagen", score: 42 },
          { rank: 17, brand: "Chevrolet", score: 42 }, { rank: 18, brand: "Cadillac", score: 41 },
          { rank: 19, brand: "Mercedes-Benz", score: 41, hl: true }, { rank: 20, brand: "Lincoln", score: 40 },
          { rank: 21, brand: "Genesis", score: 33 }, { rank: 22, brand: "Chrysler", score: 31 },
          { rank: 23, brand: "GMC", score: 31 }, { rank: 24, brand: "Jeep", score: 28 },
          { rank: 25, brand: "Ram", score: 26 }, { rank: 26, brand: "Rivian", score: 24 }
        ],
        findings: [
          "Mazda is 14th and fell eight places. Carscoops attributes the fall to the CX-70 and CX-90, worst in plug-in hybrid form. Older Mazda models \"still did reasonably well\".",
          "Tesla is 9th and rose eight places, the largest gain in the study, credited to the Model 3 and \"in particular, the Model Y\".",
          "BMW is 5th, nine places above Mazda. Mercedes-Benz is 19th."
        ]
      },
      {
        id: "iqs", name: "J.D. Power 2026 Initial Quality Study", scoreLabel: "PP100", better: "lower",
        base: "78,514 owners of 2026 vehicles. Industry average 175 PP100.",
        published: "2026-06-25", dataDate: "2026-06-25",
        limits: [
          "IQS MEASURES PROBLEMS AT 90 DAYS. It is build quality, not durability. Do not read it as a durability score.",
          "Rank numbers are derived from score order — J.D. Power's chart prints scores without ranks. Cross-checked against CarBuzz at nine points.",
          "Tesla is NOT rank-eligible. The 149 PP100 score is confirmed; any rank for Tesla would be invented.",
          "Toyota is 15th at 181, below average. Toyota's strength is long-run durability, not 90-day build quality."
        ],
        status: "verified", src: "jdp-iqs-2026",
        average: 175,
        rows: [
          { rank: 1, brand: "Porsche", score: 138 }, { rank: 2, brand: "Genesis", score: 151 },
          { rank: 3, brand: "Ford", score: 152 }, { rank: 4, brand: "Lexus", score: 156, hl: true },
          { rank: 5, brand: "Nissan", score: 156 }, { rank: 8, brand: "Subaru", score: 170, hl: true },
          { rank: 12, brand: "BMW", score: 178, hl: true }, { rank: 13, brand: "Honda", score: 179, hl: true },
          { rank: 15, brand: "Toyota", score: 181, hl: true }, { rank: 17, brand: "Mercedes-Benz", score: 182, hl: true },
          { rank: 21, brand: "Mazda", score: 210, hl: true }, { rank: 26, brand: "Volkswagen", score: 233 },
          { rank: null, brand: "Tesla", score: 149, hl: true, noRank: true, delta: "scored but not rank-eligible — it has no rank" }
        ],
        findings: [
          "Mazda is 21st at 210 PP100, 35 points worse than average.",
          "J.D. Power's own note: infotainment was the only category that got worse. Of owners reporting a distraction problem, 46% blamed the touchscreen. That is directly relevant to the CX-5's fault.",
          "Rows shown are the brands relevant to this shortlist plus the top five and the bottom of the study — the full 26-brand list was not retrieved."
        ]
      },
      {
        id: "vds", name: "J.D. Power 2026 Vehicle Dependability Study", scoreLabel: "PP100", better: "lower",
        base: "Three-year-old cars. Study average a record-worst 204 PP100.",
        published: "2026-06-20", dataDate: "2026-06-20",
        limits: [
          "This is the durability study — the one that actually measures what criterion 1 asks about.",
          "Ranks 16–26 could not be verified.",
          "Plug-in hybrids were the WORST powertrain in the study at 281 PP100 against a 204 average. That marks down every PHEV on this board.",
          "Retrieved via Visual Capitalist, not from J.D. Power directly."
        ],
        status: "verified", src: "jdp-vds-2026",
        average: 204,
        rows: [
          { rank: 1, brand: "Lexus", score: 151, hl: true, delta: "1st for the fourth year running" },
          { rank: 2, brand: "Buick", score: 160 }, { rank: 3, brand: "MINI", score: 168 },
          { rank: 4, brand: "Cadillac", score: 175 }, { rank: 5, brand: "Chevrolet", score: 178 },
          { rank: 6, brand: "Subaru", score: 181, hl: true }, { rank: 7, brand: "Porsche", score: 182 },
          { rank: 8, brand: "Toyota", score: 185, hl: true }, { rank: 9, brand: "Kia", score: 193 },
          { rank: 10, brand: "Nissan", score: 194 }, { rank: 11, brand: "BMW", score: 198, hl: true },
          { rank: 12, brand: "Hyundai", score: 198 }, { rank: 13, brand: "Genesis", score: 208 },
          { rank: 14, brand: "Mazda", score: 210, hl: true }
        ],
        findings: [
          "Lexus is 1st at 151 PP100, for the fourth year running.",
          "Honda, Tesla and Mercedes do not appear in the retrieved portion of this study."
        ]
      }
    ],

    agreement: {
      status: "verified", src: ["cr-brand-2026", "jdp-iqs-2026", "jdp-vds-2026"],
      rows: [
        { brand: "Lexus", cr: "3rd", iqs: "4th", vds: "1st, 4 yrs running", verdict: "best" },
        { brand: "Subaru", cr: "2nd", iqs: "8th", vds: "6th", verdict: "good" },
        { brand: "Toyota", cr: "1st", iqs: "15th", vds: "8th", verdict: "good" },
        { brand: "Honda", cr: "4th", iqs: "13th", vds: "—", verdict: "good" },
        { brand: "BMW", cr: "5th", iqs: "12th", vds: "11th", verdict: "good" },
        { brand: "Tesla", cr: "9th, up 8", iqs: "149, not rank-eligible", vds: "—", verdict: "mixed" },
        { brand: "Mercedes-Benz", cr: "19th", iqs: "17th", vds: "—", verdict: "mixed" },
        { brand: "Mazda", cr: "14th, down 8", iqs: "21st", vds: "14th", verdict: "worst" }
      ]
    },

    conclusions: [
      { text: "Three independent surveys put Mazda in the bottom third in 2026.", confidence: "high" },
      { text: "Lexus is the only brand in the top four of all three.", confidence: "high" }
    ],

    mazdaProblemModels: {
      status: "verified",
      note: "No CX-5 or CX-50 appears on any 2026 least-reliable list. These are the Mazdas that do.",
      rows: [
        { model: "Mazda CX-90 PHEV", crScore: 20, claim: "4th least reliable car in America. Problems: battery, electric motor, transmission, steering and suspension, brakes.", src: "autoblog-cx90" },
        { model: "Mazda CX-90 petrol", crScore: 23, claim: "Barely better than the PHEV.", src: "usatoday-cx90" },
        { model: "Mazda CX-70 and CX-70 PHEV", crScore: 32, claim: "Among the five least reliable midsize SUVs.", src: "cleantechnica-cx70" }
      ]
    },

    corrections: {
      note: "Earlier notes in this workspace that the full data overturned. Kept visible so a wrong reason is not repeated.",
      status: "verified", src: ["cr-brand-2026", "jdp-vds-2026", "iseecars-2026", "electrek-gfv", "autoblog-cx90", "cr-cx5-avoid"],
      rows: [
        { was: "\"Lexus leads the reliability ranking.\"", is: "Toyota leads CR at 66. Subaru 2nd, Lexus 3rd. Lexus does lead the J.D. Power VDS, four years running." },
        { was: "\"Neither BMW nor Mercedes appears near the top.\"", is: "BMW is 5th in CR, above Mazda at 14th, and 12th in IQS, above average. The case against BMW is COST, not reliability." },
        { was: "CX-5 resale rated \"Fair\", level with the CX-50 and CR-V.", is: "CX-5 37.9% and CX-50 39.3% depreciation, against RAV4 25.2% and CR-V 28.9%. Mazda is a clear step behind." },
        { was: "The Tesla resale guarantee might offer protection.", is: "Australia only, residual undisclosed. It offers a Bellevue buyer nothing." },
        { was: "CX-90 PHEV listed as a 3-row candidate.", is: "It is the 4th least reliable car in America. Drop it." },
        { was: "Mazda's reliability drop shades the CX-50.", is: "CR rates the CX-50 AVERAGE. The drop is attributed to the CX-70 and CX-90. Do not transfer it." }
      ]
    }
  };

  /* ===========================================================================
   * 7. MONEY
   * ========================================================================= */
  const money = {
    /* ---- Depreciation ---------------------------------------------------- */
    depreciation: {
      study: {
        name: "iSeeCars 2026 depreciation study", date: "2026-03-24", src: "iseecars-2026",
        base: "Over 950,000 actual completed sales of five-year-old cars, Mar 2025 – Feb 2026. Real sales, not modelled projections.",
        averages: [
          { label: "All vehicles", pct: 41.8 }, { label: "Hybrids", pct: 35.4 },
          { label: "EVs", pct: 57.2 }, { label: "SUVs", pct: 44.9 }, { label: "Compact SUVs", pct: 39.9 }
        ]
      },
      warning: "CarEdge runs systematically optimistic against iSeeCars and KBB — sometimes by more than 20 points on the same car. For the RAV4, CarEdge says 28% where KBB says 51%. The Lexus and BMW rows below are the optimistic end of a range, not measurements. They are marked SOFT.",
      rows: [
        { model: "Toyota RAV4 / Hybrid", pct: 25.2, retained: 74.8, dollars: 7731, quality: "hard", status: "verified", src: "iseecars-2026" },
        { model: "Honda CR-V", pct: 28.9, retained: 71.1, dollars: 8946, quality: "hard", status: "verified", src: "iseecars-2026" },
        { model: "Lexus RX 350", pct: 33, retained: 67, dollars: null, quality: "soft", status: "unverified", src: "caredge", note: "CarEdge — optimistic. Treat as a ceiling, not a measurement." },
        { model: "Mazda CX-5", pct: 37.9, retained: 62.1, dollars: null, quality: "hard", status: "verified", src: "iseecars-slashgear" },
        { model: "Mazda CX-50", pct: 39.3, retained: 60.7, dollars: null, quality: "hard", status: "verified", src: "iseecars-slashgear" },
        { model: "Lexus NX 350", pct: 41, retained: 59, dollars: null, quality: "soft", status: "unverified", src: "caredge", note: "CarEdge — optimistic." },
        { model: "BMW X3", pct: 54, retained: 46, dollars: null, quality: "soft", status: "unverified", src: "caredge", note: "CarEdge — optimistic, so the real figure is probably worse." },
        { model: "Tesla Model Y", pct: 57.8, retained: 42.2, dollars: 26020, quality: "hard", status: "verified", src: "iseecars-2026", note: "14th worst vehicle sold in America for five-year depreciation, and worse than the EV average of 57.2%." },
        { model: "Mercedes GLC", pct: null, retained: null, dollars: null, quality: "none", status: "pending", src: null, need: "Mercedes GLC five-year depreciation percentage", note: "No figure on any reachable outlet. The nearest proxy, a GLA 250 at 47.12% retained, is a smaller and cheaper car. DO NOT SUBSTITUTE IT.", key: "money.depreciation.rows[GLC]" },
        { model: "Subaru Forester", pct: null, retained: null, dollars: null, quality: "none", status: "pending", src: null, need: "Subaru Forester five-year depreciation percentage", key: "money.depreciation.rows[Forester]" }
      ],
      headline: {
        text: "The Model Y depreciates about 2.3 times as fast as a RAV4: $26,020 lost against $7,731.",
        status: "verified", src: "iseecars-2026"
      }
    },

    kbbAwards: {
      status: "verified", src: "kbb-resale-2026", date: "2026-03-19",
      method: "Projected five-year residual as a percentage of MSRP, at 75,000 miles. The average 2026 vehicle retains about 45%; the top 10 are at about 55%+.",
      rows: [
        { award: "Brand", winner: "Toyota — 6th win in a row", resale: "53%" },
        { award: "Luxury brand", winner: "Lexus — 5th in a row", resale: "47%" },
        { award: "Compact SUV", winner: "Honda CR-V", resale: null },
        { award: "Midsize SUV", winner: "Toyota Grand Highlander", resale: null },
        { award: "Luxury compact SUV", winner: "Lexus NX", resale: null },
        { award: "Luxury midsize SUV", winner: "Lexus RX", resale: null },
        { award: "Electric car", winner: "Tesla Model 3", resale: null }
      ],
      wonNothing: "Mazda won nothing. Subaru won nothing. The BMW X3, the Mercedes GLC and the Tesla Model Y won nothing — the Model 3 took Electric Car, not the Model Y."
    },

    brandResale: {
      status: "unverified", src: "carbuzz-brand-resale", date: "2026-07-29",
      note: "CarEdge-sourced, therefore optimistic. Useful for ORDER, not for magnitude.",
      rows: [
        { brand: "Toyota", retained: 64.9 }, { brand: "Subaru", retained: 61.2 },
        { brand: "Honda", retained: 60.5 }, { brand: "Mazda", retained: 59.7 }
      ],
      models: [{ model: "RAV4", retained: 72.5 }, { model: "CR-V", retained: 71 }, { model: "CX-30", retained: 64.2 }]
    },

    teslaGfv: {
      status: "verified", src: ["electrek-gfv", "gadgetreview-gfv"], date: "2026-07-14",
      headline: "The Tesla resale guarantee does not apply here. It is AUSTRALIA ONLY.",
      detail: [
        "It is a Guaranteed Future Value balloon-loan product, launched 10 Jul 2026, financed by Driva — an Australian company. Both outlets say plainly that it is Australia only.",
        "Its terms, if it ever arrives here: annual mileage limits agreed upfront, fair wear and tear rules for the whole term, rideshare drivers excluded.",
        "The catch is that no percentage of MSRP is published. Electrek: \"GFV programs are only as generous as the guaranteed figure, and Tesla controls that number.\"",
        "Supporting figures: the average Model Y lost about 25.5% of its value in one year, Jan 2024 to Jan 2025. 2022 Model Y Long Range buyers who paid $62,000–$66,000 faced $28,000–$36,000 losses at two to three years."
      ],
      readAs: "A manufacturer only guarantees residuals when residuals are weak. Read it as evidence AGAINST Tesla on criterion 3, not as protection."
    },

    /* ---- Service cost ---------------------------------------------------- */
    repairpal: {
      status: "verified", src: "repairpal", date: "2026-09-11",
      caveats: [
        "SERIOUS METHODOLOGY CONTRADICTION. RepairPal's model pages define the figure as UNSCHEDULED repairs and say routine oil changes were omitted — so it does not answer \"what does a service cost\". RepairPal's BRAND pages say the opposite: that the figure includes scheduled maintenance. Both claims sit on RepairPal's own site.",
        "Severity thresholds differ by price class, so the X3's 14% severe-repair rate and the CR-V's 9% use different bars.",
        "Treat every figure below as an approximation, not a price."
      ],
      averages: [
        { label: "Compact SUV", usd: 521 }, { label: "Luxury compact SUV", usd: 859 }, { label: "All vehicles", usd: 652 }
      ],
      rows: [
        { model: "Honda CR-V", usd: 407, rating: 4.5, segRank: "2nd of 26 compact" },
        { model: "Toyota RAV4", usd: 429, rating: 4.0, segRank: "3rd of 26 compact" },
        { model: "Mazda CX-5", usd: 447, rating: 4.5, segRank: "1st of 26 midsize" },
        { model: "Lexus RX 450h", usd: 540, rating: 4.0, segRank: "1st of 14 lux midsize" },
        { model: "Lexus RX 350", usd: 550, rating: 4.0, segRank: "3rd of 14 lux midsize" },
        { model: "Subaru Forester", usd: 632, rating: 3.5, segRank: "21st of 26 compact" },
        { model: "Lexus NX 200t", usd: 690, rating: 4.0, segRank: "2nd of 11 lux compact" },
        { model: "BMW X3", usd: 1034, rating: 2.5, segRank: "10th of 11 lux compact" },
        { model: "Mercedes GLC 300", usd: 1039, rating: null, segRank: null },
        { model: "Mazda CX-50", usd: null, rating: null, segRank: null, status: "pending", need: "RepairPal annual repair cost for the Mazda CX-50", key: "money.repairpal.rows[CX-50]" },
        { model: "Tesla Model Y", usd: null, rating: null, segRank: null, status: "pending", need: "RepairPal annual repair cost for the Tesla Model Y", key: "money.repairpal.rows[ModelY]" }
      ]
    },

    costCurve: {
      status: "verified", src: "cr-10yr", date: "2024-12-01",
      title: "The 10-year owner-paid cost curve",
      caveat: "DOLLAR FIGURES ARE THE 2024 EDITION of the Consumer Reports survey. The 2025 edition's brand order matches closely, but its dollars are members-only. Read the SHAPE, not the total.",
      rows: [
        { brand: "Tesla", y1_5: 580, y6_10: 3455, total: 4035 },
        { brand: "Toyota", y1_5: 1125, y6_10: 3775, total: 4900, hl: true },
        { brand: "Mazda", y1_5: 1400, y6_10: 4400, total: 5800 },
        { brand: "Honda", y1_5: 1435, y6_10: 4400, total: 5835 },
        { brand: "Lexus", y1_5: 1750, y6_10: 5000, total: 6750 },
        { brand: "Subaru", y1_5: 1700, y6_10: 5500, total: 7200 },
        { brand: "BMW", y1_5: 1700, y6_10: 7800, total: 9500, hl: true },
        { brand: "Mercedes", y1_5: 2850, y6_10: 7675, total: 10525, hl: true }
      ],
      deltas: [
        { pair: "BMW vs Toyota, years 6–10", perYear: 805, overFive: 4025 },
        { pair: "Mercedes vs Toyota, years 6–10", perYear: 780, overFive: 3900 }
      ],
      reading: [
        "BMW costs the SAME as Subaru in years 1 to 5 — $1,700 each — because free maintenance and warranty absorb the bills.",
        "The gap opens in year 6. CR states it: \"costs can skyrocket when the warranty and free maintenance periods expire.\"",
        "Over a 7–10 year hold, a BMW X3 costs roughly $4,000 more than a RAV4 in years 6–10 alone.",
        "One like-for-like job: AC condenser, X3 $1,097–$1,400 against RAV4 $950–$1,124. Also on record: X3 cylinder head replacement $9,896–$12,254."
      ]
    },

    warranty: {
      status: "verified", src: ["repairpal", "cr-10yr", "cd-cx5-lt"], date: "2026-09-11",
      rows: [
        { brand: "BMW", free: "3 yr / 36,000 mi — includes brake fluid, spark plugs, filters", basic: "4 yr / 50,000", powertrain: "4 yr / 50,000" },
        { brand: "Mercedes", free: "NONE", basic: "4 yr / 50,000", powertrain: "4 yr / 50,000" },
        { brand: "Toyota", free: "2 yr / 25,000 mi", basic: "3 yr / 36,000", powertrain: "5 yr / 60,000" },
        { brand: "Honda", free: "1 yr / 12,000 mi", basic: "3 yr / 36,000", powertrain: "5 yr / 60,000" },
        { brand: "Lexus", free: "2 services", basic: "4 yr / 50,000", powertrain: "6 yr / 70,000" },
        { brand: "Mazda", free: "NONE", basic: "3 yr / 36,000", powertrain: "5 yr / 60,000" },
        { brand: "Tesla", free: "NONE", basic: "4 yr / 50,000", powertrain: "8 yr / 100,000 or 120,000 — SOURCES CONFLICT", conflict: true },
        { brand: "Subaru", free: "NONE", basic: "3 yr / 36,000", powertrain: "5 yr / 60,000" }
      ],
      hybridBattery: "Toyota and Lexus 10 yr / 150,000 mi. Mazda 96 months / 100,000 mi.",
      findings: [
        "BMW's free plan is the most generous of the eight, and Mercedes gives nothing. That is exactly why CR's years 1–5 put BMW level with Subaru. FREE MAINTENANCE DEFERS COST; IT DOES NOT REMOVE IT.",
        "Toyota cuts ToyotaCare for model year 2027, from 2 yr / 25,000 mi to 1 yr / 10,000 mi. BUYING A 2026 KEEPS THE LONGER PLAN.",
        "Mazda includes no free maintenance at all. Toyota gives 2 years, Honda 1. Underlying service prices are similar, so a Mazda costs more out of pocket in the first two years."
      ]
    },

    /* ---- Insurance ------------------------------------------------------- */
    insurance: {
      wa: {
        status: "verified", src: "wa-insurance-2026", date: "2026-09-12",
        title: "Washington annual full coverage",
        rows: [
          { model: "Tesla Model Y", usd: 4039, hl: true },
          { model: "Toyota RAV4", usd: 1747 },
          { model: "Honda CR-V", usd: 1712 }
        ],
        gap: { text: "+$2,300 a year for the Model Y over a RAV4.", usd: 2292 },
        surcharge: {
          status: "verified", src: "wa-insurance-2026",
          text: "The buyer has held a US licence for four years but has NO insurance history in their own name. That attracts a \"no prior coverage\" surcharge of roughly 11–25% on top of these figures.",
          range: [11, 25], u: "pct",
          consequence: "Surcharges MULTIPLY, so they widen the absolute gap between the Model Y and the RAV4 rather than shrinking it."
        },
        settled: { status: "verified", src: "wa-insurance-2026", usd: 2800, text: "Bellevue full coverage for a settled driver runs about $2,800 a year." },
        perCar: {
          status: "pending",
          need: "Real Bellevue quotes by VIN or trim for each shortlisted car, including the no-prior-coverage surcharge",
          key: "money.insurance.wa.perCar",
          note: "The three figures above are Washington averages. Get quotes for the actual cars."
        }
      },
      national: {
        status: "verified", src: "insurify-carscoops", date: "2026-06-13",
        note: "National averages from an Insurify study of over 235 million rates. Kept as corroboration of the Washington figures, not as a substitute for them.",
        rows: [{ model: "Tesla Model Y", usd: 4021 }, { model: "Audi Q5", usd: 3011 }],
        gap: 1010,
        extra: "All five Tesla models rank in the ten priciest EVs to insure."
      }
    },

    /* ---- Tesla-specific running cost ------------------------------------- */
    teslaRunning: {
      status: "verified", src: ["carscoops-tesla-nhtsa", "mitchell", "uk-ev-claims", "cd-cx5-lt"],
      forIt: [
        "No oil changes, and regenerative braking extends brake pad life.",
        "Cheapest brand in CR's 10-year owner-paid survey: $580 in years 1–5, $3,455 in years 6–10."
      ],
      againstIt: [
        { text: "NHTSA opened a preliminary investigation covering nearly 1.2 million vehicles including 2021–2023 Model Y, after 156 complaints of front suspension link failure. One complaint reports total failure of the front lower lateral links, compliance links and upper control arms at 29,103 miles, paid by the owner.", src: "carscoops-tesla-nhtsa", date: "2026-08-03" },
        { text: "Tyres wear faster because of kerb weight.", src: "carscoops-tesla-nhtsa" },
        { text: "Out-of-warranty battery replacement runs $5,000–$15,000.", src: "carscoops-tesla-nhtsa" },
        { text: "2025 collision repair averaged $6,395 for a battery electric car against $5,105 for petrol.", src: "mitchell", date: "2025-12-31" },
        { text: "From UK claim data, the expensive EV repairs are ordinary parts: suspension wishbones average $1,650 with a worst case of $5,515; the on-board charger averages $2,890 with a worst case of $14,000. THE TRACTION BATTERY IS NOT IN THE TOP FIVE.", src: "uk-ev-claims" },
        { text: "Battery warranty mileage is UNRESOLVED. Consumer Reports says 120,000 mi; Car and Driver says 100,000. tesla.com is blocked.", src: "cd-cx5-lt", unresolved: true }
      ]
    },

    /* ---- Washington cost structure — now VERIFIED ------------------------ */
    wa: {
      status: "verified", src: ["wa-dor", "wa-cost-2026"], date: "2026-09-12",
      district: {
        status: "verified", src: "wa-dor",
        text: "ZIP 98007 is confirmed inside the Sound Transit RTA district — WA DOR location code 1704, \"BELLEVUE RTA\", rta=\"Y\", Q3 2026."
      },
      purchaseTax: {
        status: "verified", src: ["wa-dor", "wa-cost-2026"],
        components: [
          { label: "Washington state retail sales tax", pct: 6.50 },
          { label: "Bellevue local sales tax", pct: 3.80 },
          { label: "Additional WA motor vehicle sales/use tax", pct: 0.50, note: "RCW 82.08.020(3). Rose from 0.30% on 1 Jan 2026." }
        ],
        combinedRetail: 10.30,
        totalVehicle: 10.80,
        note: "Bellevue combined retail rate is 10.30%. Vehicles pay an extra 0.50%, so the purchase tax on a car is 10.80%."
      },
      outTheDoor: {
        status: "verified", src: "wa-cost-2026",
        upliftPct: 12.9,
        note: "Rule of thumb: out-the-door runs about 12.9% over sticker. It bundles tax, destination and fees, so the itemised calculator below will not match it to the dollar.",
        anchors: [
          { sticker: 45000, otd: 50813 },
          { sticker: 60000, otd: 67653 }
        ],
        reframe: {
          ceilingOtd: 65000,
          impliedSticker: 57600,
          text: "To land at $65,000 on the road, the sticker has to be about $57,600. The stated budget is a sticker budget of roughly $57,600, not $65,000."
        }
      },
      rta: {
        status: "verified", src: "wa-cost-2026",
        title: "Sound Transit RTA excise tax (MVET)",
        ratePct: 1.1,
        basis: "A percentage of DEPRECIATED MSRP, charged every year the car is registered in the district.",
        schedule: [
          { year: 1, pct: 100 }, { year: 2, pct: 95 }, { year: 3, pct: 89 }, { year: 4, pct: 83 },
          { year: 5, pct: 74 }, { year: 6, pct: 65 }, { year: 7, pct: 57 }, { year: 8, pct: 48 },
          { year: 9, pct: 40 }, { year: 10, pct: 31 }, { year: 11, pct: 22 }, { year: 12, pct: 14 },
          { year: 13, pct: 10, label: "13+" }
        ],
        tenYearTotalPctOfMsrp: 7.5,
        note: "Over a 10-year hold the RTA excise tax totals 7.5% of MSRP. It is why a more expensive car costs more to keep on the road every year, permanently, not once."
      },
      tabs: {
        status: "verified", src: "wa-cost-2026",
        base: 48.00,
        weightFees: [
          { band: "Under 4,000 lb", usd: 35 },
          { band: "4,001–6,000 lb", usd: 65 }
        ],
        note: "Annual tab base is $48.00 plus a weight fee."
      },
      electrificationSurcharge: {
        status: "verified", src: "wa-cost-2026",
        title: "Annual electrified-vehicle surcharge",
        rows: [
          { type: "Petrol only", usd: 0, note: "No surcharge." },
          { type: "Conventional hybrid", usd: 75, note: "RCW 46.17.324(2). A RAV4 Hybrid or a CX-50 Hybrid pays this." },
          { type: "BEV or PHEV with 30+ miles electric range", usd: 225, note: "RCW 46.17.323 + 46.17.324. A RAV4 PHEV or a Model Y pays this." }
        ],
        yearOne: "Both surcharges are collected AT RENEWAL ONLY, so year 1 is $0.",
        reading: "This favours a conventional hybrid over a plug-in by $150 a year — small against depreciation, but it runs for the whole hold period."
      },
      fees: {
        status: "verified", src: "wa-cost-2026",
        rows: [
          { label: "Dealer documentation fee", usd: 200, note: "Capped at $200 by RCW 46.70.180 — AND NEGOTIABLE BY STATUTE. Ask for it to be removed." },
          { label: "Dealer title fee", usd: 15, note: "RISES FROM $15 TO $40 ON 1 OCT 2026.", changesOn: "2026-10-01", newUsd: 40 }
        ]
      },
      luxuryTax: {
        status: "verified", src: "wa-cost-2026",
        thresholdUsd: 102000, pct: 8,
        applies: false,
        note: "Washington's 8% luxury vehicle tax applies above $102,000. Not applicable here."
      },
      incentives: {
        status: "verified",
        title: "Every purchase incentive is dead",
        rows: [
          { item: "Washington EV sales-tax exemption", state: "Expired 31 Jul 2025 (RCW 82.08.9999). The 2026 legislature did not revive it.", src: ["kuow-ev-tax", "wa-cost-2026"] },
          { item: "Federal clean vehicle credit (30D)", state: "Terminated for vehicles acquired after 30 Sep 2025.", src: ["fed-30d"] },
          { item: "Washington's new EV rebate", state: "Income-limited to \"vulnerable populations\", it is a USED-EV programme, and it opens in early 2027. This buyer will not qualify.", src: ["wa-used-ev-rebate"] },
          { item: "Federal 30C charger credit", state: "Terminated for property placed in service after 30 Jun 2026.", src: ["fed-30c"] },
          { item: "PSE home-charger rebate", state: "Single-family homes only. The buyer has an assigned space in a multi-unit building, so it does not apply.", src: ["pse"] }
        ],
        consequence: "An EV no longer carries any purchase-price subsidy in Bellevue."
      },
      loanInterestDeduction: {
        status: "unverified", src: "fed-loan-interest", date: "2026-09-12",
        text: "A federal deduction for interest on new-vehicle loans exists, limited to vehicles assembled in the United States, with an income phase-out.",
        forThisBuyer: "The buyer files MARRIED FILING SEPARATELY with income about $200,000+. The deduction is very likely FULLY PHASED OUT and worth $0.",
        consequence: "If it is worth $0, it removes the only financial reason final-assembly location mattered — which retires the whole \"Alabama or Japan\" question as a money question.",
        need: "Confirm the phase-out thresholds for married filing separately, and get a final yes/no.",
        key: "money.wa.loanInterestDeduction",
        assembly: {
          status: "unverified", src: "cd-prices",
          rows: [
            { model: "Mazda CX-5", assembly: "Japan", qualifies: "No" },
            { model: "Mazda CX-50", assembly: "Huntsville, Alabama", qualifies: "Yes" },
            { model: "Tesla Model Y", assembly: "Texas / California", qualifies: "Yes" },
            { model: "Toyota RAV4", assembly: "Kentucky / Canada, by trim", qualifies: "Depends on trim" },
            { model: "Honda CR-V", assembly: "Ohio / Indiana / Canada, by trim", qualifies: "Depends on trim" }
          ],
          note: "Confirm the specific VIN's assembly plant before relying on any of this."
        }
      }
    },

    /* ---- The CX-50 vs RAV4 net money table ------------------------------- */
    netMoney: {
      status: "verified", src: "mazda-offer", date: "2026-09-11",
      title: "CX-50 Hybrid against RAV4 Hybrid, on roughly $40,000, over five years",
      rows: [
        { item: "0% for 36 months against 5%", favours: "cx50", usd: 3180, range: null },
        { item: "Loan-interest deduction, if it applies to the RAV4", favours: "rav4", usd: 760, range: null, note: "For THIS buyer this line is very likely $0 — married filing separately at $200,000+ is almost certainly phased out. Marked unverified.", status: "unverified" },
        { item: "Five-year depreciation gap, 39.3% against 25.2%", favours: "rav4", usd: 5640, range: null },
        { item: "No car for 2–6 more months", favours: "cx50", usd: null, range: [500, 3000] }
      ],
      net: { favours: "rav4", range: [200, 2700], text: "Net: the RAV4 is ahead by roughly $200 to $2,700. That is close to a wash, and it sits inside the error bars of the depreciation estimate." },
      interactions: [
        "At 0% the loan-interest deduction is worth nothing, because there is no interest to deduct. It only helps the financed RAV4. So the CX-50's US assembly — the thing that would qualify it for the deduction — gains it nothing if you take the 0%.",
        "The RAV4's 25.2% depreciation figure was measured on five-year-old cars, meaning the PREVIOUS generation. The 2026 is all new. Treat it as a strong prior, not a promise.",
        "And for this buyer the deduction line is very likely $0 anyway, which makes the RAV4's edge slightly smaller."
      ]
    },

    prices: {
      status: "verified", src: ["cd-prices", "mazda-usa", "kbb-modely"], date: "2026-09-11",
      note: "2026 model-year MSRP, before destination, tax and fees.",
      rows: [
        { model: "Mazda CX-5", lo: 31485, hi: 40485 },
        { model: "Mazda CX-50", lo: 31395, hi: 44395 },
        { model: "Mazda CX-50 Hybrid", lo: 34750, hi: null, note: "\"From\" price. Per-trim Hybrid prices not retrieved." },
        { model: "Honda CR-V (petrol)", lo: 32470, hi: 38450 },
        { model: "Toyota RAV4 (hybrid only)", lo: 33495, hi: 50095 },
        { model: "Tesla Model Y", lo: 41630, hi: 61630 },
        { model: "Mercedes-Benz GLC", lo: 50900, hi: 63500 },
        { model: "BMW X3", lo: 52650, hi: 67850 }
      ],
      observation: "The budget overshoots the two original candidates. A loaded CX-5 is $40,485 and a Model Y Long Range is $46,630 — but after Washington tax the on-road ceiling of $65,000 corresponds to a sticker of about $57,600, so there is real room and it is smaller than a raw $65,000 suggests."
    }
  };

  /* ===========================================================================
   * 8. ON-ROAD COST CALCULATOR
   * ========================================================================= */
  const calculator = {
    title: "On-road cost calculator",
    explain: "Every rate below comes from data.js. Where a rate is pending, the calculator refuses to compute that line and says so — it never substitutes a plausible number.",
    inputs: {
      sticker: { label: "Sticker price (MSRP)", default: 45000, min: 20000, max: 120000, step: 500, u: "usd" },
      destination: { label: "Destination charge", default: 0, min: 0, max: 3000, step: 25, u: "usd", note: "Ask the dealer. Not in any source, so it defaults to 0 rather than to a guess." },
      docFee: { label: "Dealer doc fee", default: 200, min: 0, max: 200, step: 25, u: "usd", note: "Capped at $200 and negotiable by statute. Try 0." },
      down: { label: "Down payment", default: 5000, min: 0, max: 60000, step: 500, u: "usd" },
      apr: { label: "APR", default: 0, min: 0, max: 15, step: 0.25, u: "pct" },
      termMonths: { label: "Term", default: 36, options: [24, 36, 48, 60, 72], u: "mo" },
      powertrain: { label: "Powertrain", default: "hev", options: [
        { v: "petrol", label: "Petrol only" }, { v: "hev", label: "Conventional hybrid" }, { v: "phev", label: "PHEV or BEV, 30+ electric miles" }
      ] },
      weightBand: { label: "Kerb weight", default: "under4000", options: [
        { v: "under4000", label: "Under 4,000 lb" }, { v: "4001to6000", label: "4,001–6,000 lb" }
      ] },
      holdYears: { label: "Years you will hold it", default: 8, min: 1, max: 13, step: 1, u: "yr" },
      titleDate: { label: "Title fee schedule", default: "before", options: [
        { v: "before", label: "Buying before 1 Oct 2026 ($15)" }, { v: "after", label: "Buying on or after 1 Oct 2026 ($40)" }
      ] }
    },
    /* Which data.js paths each output line depends on. The UI blocks a line whose
     * dependency is pending, and shows exactly which key is missing. */
    dependencies: {
      purchaseTax: ["money.wa.purchaseTax.totalVehicle"],
      docFee: ["money.wa.fees.rows[doc]"],
      titleFee: ["money.wa.fees.rows[title]"],
      firstTabs: ["money.wa.tabs.base", "money.wa.tabs.weightFees"],
      firstRta: ["money.wa.rta.ratePct", "money.wa.rta.schedule"],
      annualSurcharge: ["money.wa.electrificationSurcharge.rows"],
      insurance: ["money.insurance.wa.perCar"],
      serviceOverHold: ["money.repairpal.rows"],
      loanInterestDeduction: ["money.wa.loanInterestDeduction"]
    },
    blocked: {
      insurance: { key: "money.insurance.wa.perCar", label: "Insurance over the hold period", why: "Needs a real Bellevue quote for the actual car. The three Washington averages in the Money section are averages, not quotes." },
      service: { key: "money.repairpal.rows[<model>]", label: "Service and repair over the hold period", why: "RepairPal has no figure for the CX-50 or the Model Y, and its methodology contradicts itself on whether scheduled maintenance is included. A single number here would be false precision." }
    }
  };

  /* ===========================================================================
   * 9. THE CX-5 CASE
   * ========================================================================= */
  const cx5Case = {
    intro: "The 2026 CX-5 was the buyer's original first choice, alongside the Model Y. Here is the whole working, including the parts that argue the other way. The point is that the buyer should be able to disagree with the conclusion after reading it.",
    carUnderTest: {
      status: "verified", src: ["cr-cx5-avoid", "cd-cx5-lt"],
      cr: "Consumer Reports bought an S Preferred at about $37,000.",
      cd: "Car and Driver's long-term car is a Premium Plus at $41,080 as tested, on a 40,000-mile test, with the larger 15.6-inch screen.",
      noRating: "The CX-5 has NO CR Overall Score and NO predicted reliability rating, because testing was incomplete."
    },
    crReasons: {
      status: "verified", src: "cr-cx5-avoid", date: "2026-06-05",
      note: "Consumer Reports gives SIX reasons, not five — the headline circulated as \"5 reasons\".",
      rows: [
        { n: 1, title: "Touchscreen-based controls", detail: "Nearly every physical control moved to the screen. A tester: \"It's one step forward and three steps backward.\" Climate control is \"a headache\". Seat and wheel heaters need the system to initialise, then a \"convoluted menu\". Steering wheel controls became flat pads that are hard to use without looking down." },
        { n: 2, title: "Fit and finish for the price", detail: "A tester: \"This is one of the most depressing areas of the vehicle compared to past Mazdas.\" Hard plastic everywhere, even on the top trim. \"Zero padding for the driver's right knee.\" CR's verdict on the $37,000 trim: \"acceptable for the class but not for Mazda.\" CR calls the cost-cutting \"overt\"." },
        { n: 3, title: "Seat comfort", detail: "Pronounced lumbar support, stiff fabric, almost no bolsters. CR advises long test drives." },
        { n: 4, title: "Engine noise", detail: "Loud on the highway with a coarse note. Power is limited, so it revs high to pass or climb. \"Even the slightest acceleration brings the unpleasant sound to life.\"" },
        { n: 5, title: "Mazda's recent reliability", detail: "Brand inference, since CR has no CX-5 data. Mazda3 mostly above average. CX-50 AVERAGE. CX-70 and CX-90 petrol below average; their PHEVs well below average. CR's warning: \"an all-new infotainment system can pose a big reliability headache.\"" },
        { n: 6, title: "One powertrain only", detail: "No hybrid. Mazda told CR its own hybrid arrives for model year 2027. CR suggests waiting." }
      ]
    },
    crCounterpoints: {
      status: "verified", src: "cr-cx5-avoid",
      rows: [
        "Strong standard safety kit on every trim.",
        "The suspension absorbs impacts better than the old car.",
        "It \"handles better than most of its competitors\"."
      ]
    },
    cdFaults: {
      status: "verified", src: "cd-cx5-lt", date: "2026-08-24",
      faults: [
        { n: 1, title: "The infotainment display bricks itself", detail: "Locking the driver out of navigation, radio, AND climate control." },
        { n: 2, title: "i-Activsense driver-assistance warnings", detail: "Worst on adaptive cruise. When the warning appears the radar feature will not work." }
      ],
      frequency: "Intermittent, not constant.",
      worstCase: "The touchscreen froze for the LAST THREE HOURS of a road trip through Ohio. The staffer: \"I'm glad we had the A/C running since there was no way to change that for the remainder of our trip.\"",
      oddity: "Staff using the facial-recognition profile reported FEWER outages.",
      fixAttempt: {
        headline: "Was it fixed? No.",
        rows: [
          "A dealer applied a software update in month 1.",
          "At one month: \"our trip to the service bay does not appear to have solved the CX-5's issues.\"",
          "By 10,000 miles the fault had CHANGED CHARACTER, not stopped.",
          "A second dealer visit was still pending.",
          "Car and Driver: \"It appears we may have to wait for future software updates from Mazda to get it all sorted.\""
        ],
        limits: [
          "NO TSB number is cited.",
          "Car and Driver never says the dealer reproduced the fault.",
          "Whether the dealer ever reproduced it, and the outcome of the second visit, are both unknown."
        ]
      },
      inFavour: [
        "$0 SPENT on service, wear and repair in 10,296 miles and four months.",
        "Interior \"free from any signs of premature wear and tear\".",
        "26 mpg observed against an EPA 26 combined — it met the combined figure."
      ],
      against: [
        "0–60 mph in 8.0 seconds.",
        "70–0 mph braking in 173 feet, \"albeit with significant brake fade\"."
      ]
    },
    corroboration: {
      status: "verified", src: "cd-prices",
      note: "The published trail on this car, by date.",
      rows: [
        { date: "2026-05-11", publisher: "Consumer Reports", headline: "First Drive: Roomy Interior But Lacks a Hybrid Version" },
        { date: "2026-05-29", publisher: "MotorTrend", headline: "Uh-Oh? Our Year With the All-New Mazda CX-5 Is Off to a Bumpy Start", unreadable: true },
        { date: "2026-06-05", publisher: "Consumer Reports", headline: "5 Reasons to Avoid the 2026 Mazda CX-5 Now" },
        { date: "2026-06-23", publisher: "TFLcar", headline: "2026 Mazda CX-5 Review: 3 Steps Forward, 2 Steps Back" },
        { date: "2026-08-12", publisher: "Quartz", headline: "2026 Mazda CX-5 drawbacks uncovered by Consumer Reports testers" },
        { date: "2026-08-23", publisher: "Car and Driver", headline: "10,000 Miles in and We're Still Experiencing Intermittent Bricking of the CX-5's Infotainment" }
      ],
      missing: "The three MotorTrend CX-5 long-term articles could not be read — motortrend.com is blocked. That is a SECOND long-term data set on the same car that we cannot see."
    },
    doNotTransfer: {
      status: "verified", src: ["cr-cx5-avoid", "cr-brand-2026"],
      text: "Do not transfer the CX-5's faults to the CX-50. CR rates the CX-50 AVERAGE, and Mazda's brand fall is attributed to the CX-70 and CX-90. The CX-50 has been in production since 2022, is built in Alabama, and its hybrid powertrain is Toyota's."
    },
    assembly: {
      status: "verified", src: "mazda-offer", date: "2026-09-11",
      title: "\"Alabama or Japan\" is really \"CX-50 or CX-5\"",
      rows: [
        "The CX-50 is built only at Mazda Toyota Manufacturing in Huntsville, Alabama. There is no Japan-built CX-50. The CX-5 is the Japan-built car. So the choice is a change of MODEL, not of plant.",
        "The evidence runs OPPOSITE to the concern. The documented, repeated defect sits on the Japan-built CX-5. Nothing comparable is documented on the Alabama-built CX-50.",
        "Mazda's reliability fall was attributed to new technology — software and infotainment. Those are designed centrally, not caused by an assembly line.",
        "Huntsville is a Mazda-Toyota joint venture and also builds the Toyota Corolla Cross.",
        "It has built the CX-50 since 2022. Plant and model maturity predict build quality better than country does.",
        "US plants build many of the most reliable cars sold here: Honda in Ohio, Toyota in Kentucky, Subaru in Indiana."
      ],
      conclusion: "Do not treat Alabama assembly as a defect risk.",
      limit: "Plant-level reliability data was not available, so this rests on the evidence above rather than on direct measurement.",
      moneyFootnote: "The one thing that made assembly location a MONEY question was the federal loan-interest deduction. For this buyer that is very likely worth $0."
    },
    verdict: {
      confidence: "high",
      text: "Out. A first-year redesign with a reproduced, unresolved defect in a daily-use system, and no hybrid until 2027 — so it fails criterion 1 and criterion 6.",
      howToDisagree: "The honest case for the CX-5 is this: one long-term car is a sample of one, no TSB or recall number exists, the dealer may never have reproduced the fault, the car cost $0 to run in 10,296 miles, and CR never gave it a reliability rating at all — so the reliability charge is brand inference, not a CX-5 measurement. If you drive one today and the screen behaves through a deliberate ten-minute stress test, that is real evidence against the case above. It still has no hybrid, and that alone fails criterion 6."
    }
  };

  /* ===========================================================================
   * 10. THE MAZDA 0% OFFER
   * ========================================================================= */
  const mazdaOffer = {
    status: "verified", src: "mazda-offer", date: "2026-09-11",
    title: "Mazda 0% APR — confirmed for the CX-50 Hybrid",
    eligibleQuote: "\"...new 2026 Mazda CX-5, CX-30, CX-50, CX-50 Hybrid, CX-70 Inline 6, CX-70 PHEV, CX-90 Inline 6, CX-90 PHEV, Mazda3...\"",
    terms: [
      { term: "Rate", detail: "0% APR for 36 months" },
      { term: "Payment factor", detail: "$27.78 per $1,000 financed, per month. That is exactly $1,000 ÷ 36, so the 0% is genuine with no hidden cost." },
      { term: "On $40,000", detail: "$1,111 per month" },
      { term: "Expiry", detail: "9/30/2026. You must TAKE DELIVERY, not merely sign." },
      { term: "Inventory", detail: "Participating dealer's CURRENT INVENTORY ONLY — which limits trim and colour." },
      { term: "Credit", detail: "\"Very well-qualified customers\" only." },
      { term: "Deferral", detail: "90 days. The warning that finance charges accrue is real at other rates and MEANINGLESS at 0%." },
      { term: "Customer cash", detail: "None listed for the CX-50 Hybrid. The $1,000 cash appears on the CX-5. So the usual \"0% or cash\" tradeoff probably does not apply — confirm anyway." }
    ],
    deadline: { iso: "2026-09-30T23:59:59", label: "Delivery deadline — 30 Sep 2026", requirement: "Delivery, not signature." },
    tell: {
      quote: "\"Dealer contribution may vary and could affect purchase price.\"",
      reading: "This is the tell. Mazda subsidises the 0%, and the dealer may hold firmer on price because of it. Ask for the out-the-door price WITH 0% and again WITHOUT it, then compare the totals, not the rates. A subsidised rate that costs you a discount is not a discount."
    },
    readDeadlineCorrectly: [
      "The deadline is real pressure, and it is also a sales lever.",
      "MAZDA RUNS 0% OFTEN. If this window closes, a similar offer will likely return.",
      "Do not let a deadline pick a car."
    ],
    fuelEconomy: {
      status: "verified", src: "mazda-usa",
      rows: [
        { version: "CX-50 Hybrid", epa: "39 city / 37 highway / 38 combined" },
        { version: "CX-50 petrol", epa: "26 combined" }
      ],
      finding: "A 12 mpg gain. This is the strongest argument for the Hybrid over the petrol CX-50, independent of every other consideration."
    },
    actions: [
      "Ask for the out-the-door price WITH 0% and WITHOUT it. Compare totals.",
      "Confirm whether any customer cash exists on the CX-50 Hybrid, and whether it stacks with the 0%.",
      "Get a bank or credit-union PRE-APPROVAL before you go. That quote is your only leverage, and it is the number a Toyota dealer has to beat.",
      "Ask what the DEALER CONTRIBUTION is on the car you are looking at.",
      "Confirm delivery can happen before 9/30/2026 if you want the 0%.",
      "Ask for the doc fee to be removed. It is capped at $200 and negotiable by statute."
    ]
  };

  /* ===========================================================================
   * 11. TEST DRIVE — TODAY
   * ========================================================================= */
  const testDrive = {
    date: "2026-09-12",
    storageKey: "buyacar.testdrive.v1",
    priority: {
      status: "verified", src: ["cr-brand-2026", "cd-crv-10best", "cd-cx50", "cr-cx5-avoid"],
      note: "The original plan was Tesla plus Mazda CX-5. Research says change it. If you only get three drives, do 1, 2 and 3.",
      rows: [
        { p: 1, car: "Toyota RAV4 Hybrid or PHEV", why: "Toyota leads reliability. The PHEV suits your charging situation." },
        { p: 2, car: "Honda CR-V Hybrid", why: "Car and Driver 10Best 2026. No first-year risk. Cheapest to repair on the board." },
        { p: 3, car: "Mazda CX-50 Hybrid", why: "The mature Mazda. Uses the RAV4 hybrid powertrain, and it holds the only confirmed 0% APR." },
        { p: 4, car: "Tesla Model Y", why: "Ruled out on depreciation and insurance. Drive it only to close the question for yourself — and treat the charging plan as the real test.", ruledOut: true },
        { p: 5, car: "Mazda CX-5", why: "Ruled out. Drive it only to confirm or reject the reported faults.", ruledOut: true }
      ]
    },
    rules: [
      "Do not negotiate. Say \"I am only driving today.\"",
      "Do not let anyone run your credit. This costs you nothing to refuse.",
      "Do not sign anything.",
      "Ask for the out-the-door quote BY EMAIL instead. That gives you a written number you can compare and forward.",
      "Ask for 45 minutes per car. Ten minutes tells you nothing."
    ],
    bring: [
      { item: "A car seat, borrowed if needed", tests: "Rear-facing fit behind your own driving position" },
      { item: "A stroller", tests: "Whether it goes in the boot without folding the seats" },
      { item: "Your largest suitcase", tests: "Real cargo space, not the brochure number" },
      { item: "Your phone and cable", tests: "CarPlay or Android Auto pairing, and cable routing" },
      { item: "Your sunglasses", tests: "Screen glare and reflections" }
    ],
    route: {
      rule: "Pick ONE loop and repeat it in every car. Comparison only works if the route is constant.",
      must: [
        "A highway on-ramp merge. Accelerate hard. Judge whether it feels safe with four people aboard.",
        "A rough or broken road. Judge ride comfort and cabin noise.",
        "A tight parking spot. Reverse in. Use the camera.",
        "A U-turn or tight car park. Judge the turning circle.",
        "Stop-and-go traffic if you can find it."
      ]
    },
    checks: [
      {
        group: "Space — the kid question",
        note: "The spouse lives in Chicago and is not a daily passenger, so this is about a future child seat, not about her comfort.",
        items: [
          "Sit in the back seat BEHIND YOUR OWN DRIVING POSITION. Set the driver's seat where you actually drive, then get in behind it.",
          "Fit the car seat. Note whether you must move the front seat forward.",
          "Check the boot with the stroller AND the suitcase in it at once.",
          "Check the rear door opening. A narrow opening makes loading a child hard."
        ]
      },
      {
        group: "Driving",
        items: [
          "Visibility forward over the bonnet, and over your shoulder.",
          "Blind spots at the rear pillars.",
          "Seat comfort, and whether the seat goes high enough.",
          "Cabin noise at 60 mph on a coarse surface.",
          "Brake feel."
        ]
      },
      {
        group: "Controls",
        items: [
          "Can you adjust the climate without looking away from the road?",
          "Can you find the wipers, lights and mirrors quickly?",
          "Does the screen accept touch WHILE MOVING?",
          "Does CarPlay or Android Auto connect without fuss? Wired and wireless."
        ]
      }
    ],
    perCar: [
      {
        car: "Toyota RAV4 (2026, all new)",
        items: [
          "It is HYBRID ONLY now. The petrol-only engines were dropped.",
          "Car and Driver criticised it: \"interior materials feel cheap\" and the \"standard hybrid has a noisy engine\". VERIFY BOTH YOURSELF. Accelerate hard and listen. Touch the dashboard and door plastics.",
          "If you drive the PHEV, confirm the electric range claim and ask how long a full charge takes on a normal office charger.",
          "This is a first-year redesign. Ask the dealer whether they have seen any early problems.",
          "Ask whether the car still carries the 2 yr / 25,000 mi ToyotaCare plan. Model year 2027 cuts it to 1 yr / 10,000 mi."
        ]
      },
      {
        car: "Honda CR-V Hybrid",
        items: [
          "It won Car and Driver 10Best for 2026, so expect competence, not excitement.",
          "Car and Driver's criticism of the NON-hybrid is that the CVT drones under hard acceleration. Drive the HYBRID and check whether it does the same.",
          "Check the boot. The CR-V is usually strong here.",
          "Ask exactly what the 1-year Service Pass covers. Car and Driver's own pages disagree with each other on the item list."
        ]
      },
      {
        car: "Mazda CX-50 Hybrid",
        items: [
          "The cabin is TIGHTER than the CX-5 and the RAV4, and the roof slopes. This is the car most likely to fail your rear-seat test. TEST THAT FIRST, before you fall for how it drives.",
          "The hybrid uses the Toyota RAV4 hybrid system. That is a point in its favour.",
          "Ask what the dealer contribution is on this exact car, and get the out-the-door price with and without the 0%.",
          "Confirm delivery can happen before 30 Sep 2026."
        ]
      },
      {
        car: "Tesla Model Y",
        note: "Already ruled out on depreciation and insurance. If you drive it, the charging plan is the real test, not the car.",
        items: [
          "Ask directly: with no charger at home, and charging only at the office, what happens if the office chargers are full or you change jobs? Note the answer, then judge it yourself.",
          "There is NO instrument cluster. All speed and gear information sits on the centre screen. Drive and decide whether that bothers you.",
          "The wipers and mirrors live in the touchscreen. Test the wipers — Bellevue is wet, so this matters here more than most places.",
          "Regenerative braking. Lift off the accelerator and feel how hard it slows. Ride as a passenger if you can: it causes motion sickness in some people.",
          "Ride firmness. Larger wheels ride harder.",
          "Test the phone-as-key. Then ask what happens when the phone battery dies.",
          "Ask what the battery warranty mileage is. Consumer Reports says 120,000 and Car and Driver says 100,000, and tesla.com is blocked — get the answer in writing."
        ]
      },
      {
        car: "Mazda CX-5 (2026)",
        note: "Already ruled out. If you drive it, test the reported faults directly.",
        items: [
          "SIT WITH THE INFOTAINMENT FOR A FULL TEN MINUTES. Use CarPlay. Use the navigation. Switch sources. Restart the car and reconnect. The reported fault is intermittent, so a short test will miss it.",
          "Ask the salesperson, in these words: \"Have any 2026 CX-5 customers come back with infotainment problems?\" Watch the reaction as much as the answer.",
          "The turbo engine is gone. Only the naturally aspirated 2.5 remains, with a 6-speed automatic. Merge onto a motorway and judge whether it is enough.",
          "There is no hybrid until 2027.",
          "Try the facial-recognition profile. Car and Driver's staff reported fewer outages when using it."
        ]
      }
    ],
    dealerQuestions: [
      "What is the out-the-door price on this exact car? Email it to me.",
      "What is the destination charge, and what dealer fees do you add?",
      "Is the doc fee $200 or less, and will you remove it? It is capped and negotiable by statute.",
      "What add-ons are already on this car, and can they be removed?",
      "What APR can I get, and at what credit tier? Is there a manufacturer subsidised rate?",
      "Is there a manufacturer rebate or customer cash on this model right now?",
      "Where was this specific car assembled? I want the VIN.",
      "What does the scheduled maintenance cost for the first five years?",
      "What is the warranty, in years and miles, for the powertrain and the battery?",
      "Do you have this car in stock, or is it an order?"
    ],
    dealerNote: "Mazda advertised 0% for 36 months plus 90-day deferred payments, and $1,000 customer cash on select 2026 CX-5 models. The CX-90 showed $3,500 customer cash. Ask what applies to the exact car in front of you.",
    scoreRows: [
      { id: "rearseat", label: "Rear seat behind my driving position" },
      { id: "carseat", label: "Car seat fits" },
      { id: "boot", label: "Boot with stroller and suitcase" },
      { id: "merge", label: "Merging power" },
      { id: "ride", label: "Ride comfort on rough road" },
      { id: "noise", label: "Cabin noise at speed" },
      { id: "visibility", label: "Visibility" },
      { id: "controls", label: "Controls without looking" },
      { id: "screen", label: "Screen behaved" },
      { id: "parking", label: "Parking and turning circle" },
      { id: "gut", label: "Gut feel after driving it", note: "This row was \"Wife's verdict\" in the original checklist. The spouse lives in Chicago and will not be at the dealer." },
      { id: "eightyears", label: "Would I keep this for 8 years" }
    ],
    scoreCars: [
      { id: "rav4hev", label: "RAV4 Hybrid" },
      { id: "rav4phev", label: "RAV4 PHEV" },
      { id: "crvhev", label: "CR-V Hybrid" },
      { id: "cx50hev", label: "CX-50 Hybrid" },
      { id: "modely", label: "Model Y" },
      { id: "cx5", label: "CX-5" }
    ],
    scoreNote: "Fill this in for every car, on the day, before you leave the car park. Memory degrades fast when you drive several cars in a row.",
    later: {
      title: "Before you buy anything — not today",
      rows: [
        "Get insurance quotes for each car, by VIN or by trim. The Washington averages say $1,747 for a RAV4 and $4,039 for a Model Y, and your first policy in your own name adds 11–25% on top. Get the real Bellevue number.",
        "Confirm the office charging: which building, how many chargers, what cost, and what the queue is like at 09:00. Do this before you buy any EV.",
        "Get the out-the-door quote in writing from every dealer, then compare.",
        "Get your own financing pre-approval from a bank or credit union first. Then let the dealer try to beat it. Never take the first APR offered.",
        "Remember the on-road maths: about 12.9% over sticker. To land at $65,000 on the road, the sticker has to be about $57,600.",
        "Check the annual Sound Transit RTA excise tax on each car: 1.1% of depreciated MSRP, every year, which totals 7.5% of MSRP over a 10-year hold."
      ]
    }
  };

  /* ===========================================================================
   * 12. OPEN QUESTIONS AND GAPS
   * ========================================================================= */
  const openQuestions = {
    intro: "This section is a feature, not an apology. A decision worth $40,000–$60,000 deserves to know what it does not know.",
    toTheBuyer: {
      title: "Questions only you can answer",
      rows: [
        { q: "Does the Amazon office charging exist, at which building, and is it free? How many days a week do you go in?", status: "open", note: "This decides whether a PHEV's electric range is real for you. It does not rescue the Model Y — depreciation and insurance already close that." },
        { q: "Cash, or finance? If finance, what down payment?", status: "open", note: "It also decides whether the Mazda 0% is worth anything to you." },
        { q: "Is a 3-row SUV actually wanted, or merely acceptable?", status: "answered", note: "Answered 11 Sep 2026: a 3-row is acceptable. But nothing on the 3-row list has a verified price yet." },
        { q: "Do you ski or drive mountain passes?", status: "answered", note: "Answered 11 Sep 2026: no. AWD is optional, not required." }
      ]
    },
    unverified: {
      title: "Shown in the UI, but flagged — confirm before relying on it",
      rows: [
        { item: "Lexus and BMW depreciation percentages", detail: "Sourced from CarEdge, which runs systematically optimistic against iSeeCars and KBB — sometimes by over 20 points on the same car. The Lexus RX 33%, Lexus NX 41% and BMW X3 54% rows are SOFT.", src: "caredge" },
        { item: "Every RepairPal figure", detail: "RepairPal's model pages say the number is UNSCHEDULED repairs with oil changes omitted; its brand pages say it INCLUDES scheduled maintenance. Both claims are on RepairPal's own site, and the contradiction undermines the precision of every figure.", src: "repairpal" },
        { item: "The Consumer Reports maintenance dollars", detail: "The cost-curve table is the 2024 EDITION. The 2025 edition's brand order matches closely, but its dollars are members-only.", src: "cr-10yr" },
        { item: "The federal loan-interest deduction", detail: "Married filing separately at about $200,000+ is very likely fully phased out, making it worth $0 — which retires assembly location as a money question. Needs a final answer.", src: "fed-loan-interest" },
        { item: "Brand five-year resale percentages", detail: "Toyota 64.9%, Subaru 61.2%, Honda 60.5%, Mazda 59.7% — CarEdge-sourced via CarBuzz, therefore optimistic. Useful for ORDER, not magnitude.", src: "carbuzz-brand-resale" },
        { item: "Assembly plants by trim", detail: "RAV4 Kentucky/Canada and CR-V Ohio/Indiana/Canada vary by trim. Confirm the specific VIN.", src: "cd-prices" },
        { item: "Amazon office charging", detail: "Unconfirmed, and dependent on continued employment, the RTO policy, charger availability and staying in that building. None of it is under the buyer's control.", src: "owner" },
        { item: "Space ratings", detail: "The Good/Poor/Best space ratings are judgements carried over from the earlier assessment, not measurements. Today's test drive replaces them.", src: "owner" }
      ]
    },
    couldNotVerify: {
      title: "Could not verify",
      note: "Retrieved 11 Sep 2026. Nothing here was filled with a substitute.",
      groups: [
        {
          group: "Reliability",
          rows: [
            "Consumer Reports' own pages for the reliability table. CR returns HTTP 403, so the table comes from the fetched Carscoops page only. Headline-level corroboration exists from CNBC, Yahoo Finance and USA Today, 4–5 Dec 2025.",
            "IQS rank numbers. Derived from score order; J.D. Power's chart prints scores without ranks. Cross-checked against CarBuzz at nine points.",
            "Tesla's IQS rank. Tesla is not rank-eligible. The 149 PP100 score is confirmed. ANY RANK FOR TESLA WOULD BE INVENTED.",
            "VDS ranks 16–26.",
            "Any TSB or recall number for the CX-5 infotainment fault. Car and Driver cites none. NHTSA was not searched — THIS IS THE OBVIOUS NEXT STEP.",
            "Whether the Mazda dealer ever reproduced the CX-5 fault, and the second visit's outcome.",
            "Any CR Overall Score or predicted reliability rating for the 2026 CX-5. Neither exists yet.",
            "The three MotorTrend CX-5 long-term articles. motortrend.com is blocked. That is a second long-term data set on the same car that we cannot read."
          ]
        },
        {
          group: "Resale",
          rows: [
            "A clean 1/3/5-year series for the Model Y. The CarBuzz article promising one in its headline does not contain one. ANY SUCH SERIES WOULD BE FABRICATED.",
            "The percentage of MSRP in Tesla's guaranteed-future-value programme. Nobody publishes it.",
            "Mercedes GLC five-year depreciation. No figure on any reachable outlet. The nearest proxy, a GLA 250 at 47.12% retained, is a smaller and cheaper car. DO NOT SUBSTITUTE IT.",
            "A Subaru Forester five-year depreciation percentage.",
            "KBB per-model residual percentages. KBB publishes brand averages only."
          ]
        },
        {
          group: "Service cost",
          rows: [
            "RepairPal figures for the CX-50, Model Y, GLC, and the current NX and RX. NO SUBSTITUTION WAS MADE.",
            "A reconciliation of RepairPal's two conflicting definitions. This undermines the precision of every RepairPal figure.",
            "Consumer Reports' 2025-edition maintenance dollars. Members-only. The table shown is the 2024 edition.",
            "Car and Driver, 26 Jun 2026, \"Which Cars Cost the Most in Scheduled Maintenance, and Which Cost the Least?\" THIS IS THE SINGLE BEST MISSING SOURCE for the question actually asked.",
            "Tesla Model Y battery warranty mileage. CR says 120,000; Car and Driver says 100,000. tesla.com is blocked. Unresolved.",
            "Honda's Service Pass item list for the current 1-year version. Car and Driver's pages disagree with each other. Confirm at the dealer for the specific car."
          ]
        }
      ]
    },
    thinOrContradictory: {
      title: "Where the source material is thin or fights itself",
      rows: [
        "RepairPal contradicts itself on whether the annual figure includes scheduled maintenance. It is the ONLY per-model service-cost source available, and it cannot answer the question the buyer actually asked.",
        "CarEdge and iSeeCars disagree by more than 20 points on the same car. Every Lexus and BMW depreciation figure here comes from the optimistic one, because nothing better exists for those models.",
        "The Consumer Reports reliability table is nine months old, and CR's own site cannot be read to check it.",
        "Consumer Reports says the CX-5 article gives SIX reasons; the headline that circulated says five.",
        "The market-research file is partly superseded by the reliability file, and the two disagree on BMW's reliability standing and on Mazda's resale position. The reliability file wins, and the corrections are listed in the Reliability section.",
        "Three studies measure three different things — 90-day build quality, three-year dependability, and owner-reported problems over a nine-month-old survey window. They are shown side by side because averaging them would be meaningless.",
        "Nine of the twelve models the buyer might want have NO verified price at all. Every ranking that involves them is provisional."
      ]
    }
  };

  /* ===========================================================================
   * 13. PENDING INDEX — every pending slot, by dotted path
   * ========================================================================= */
  const pendingIndex = [
    { group: "Prices, trims, assembly and hybrid type (research agent 1)", keys: [
      { key: "cars.rav4phev.price", need: "2026 RAV4 PHEV MSRP range and per-trim prices" },
      { key: "cars.crvhev.price", need: "2026 Honda CR-V Hybrid MSRP range and per-trim prices" },
      { key: "cars.crvhev.hybrid", need: "CR-V Hybrid system type, against the 48V exclusion rule" },
      { key: "cars.lexusnx.price", need: "2026 Lexus NX MSRP ranges and per-trim prices — gas, hybrid, PHEV" },
      { key: "cars.lexusnx.hybrid", need: "Which hybrid types the 2026 NX offers" },
      { key: "cars.lexusnx.assembly", need: "2026 Lexus NX assembly plant" },
      { key: "cars.lexusnx.firstYear", need: "Whether the 2026 NX is a first-year redesign" },
      { key: "cars.lexusrx.price", need: "2026 Lexus RX MSRP ranges and per-trim prices — gas, hybrid, PHEV" },
      { key: "cars.lexusrx.hybrid", need: "Which hybrid types the 2026 RX offers" },
      { key: "cars.lexusrx.assembly", need: "2026 Lexus RX assembly plant" },
      { key: "cars.lexusrx.firstYear", need: "Whether the 2026 RX is a first-year redesign" },
      { key: "cars.grandhighlander.price", need: "2026 Grand Highlander Hybrid prices, including Hybrid MAX" },
      { key: "cars.grandhighlander.hybrid", need: "Grand Highlander Hybrid and Hybrid MAX system types" },
      { key: "cars.grandhighlander.assembly", need: "2026 Grand Highlander assembly plant" },
      { key: "cars.grandhighlander.firstYear", need: "Whether the 2026 Grand Highlander is a first-year redesign" },
      { key: "cars.cx90phev.price", need: "2026 Mazda CX-90 MSRP range and per-trim prices" },
      { key: "cars.forester.price", need: "2026 Subaru Forester MSRP range and per-trim prices" },
      { key: "cars.forester.hybrid", need: "Whether the 2026 Forester offers a qualifying hybrid" },
      { key: "cars.sienna.price", need: "2026 Toyota Sienna MSRP range and per-trim prices" },
      { key: "cars.sienna.hybrid", need: "2026 Sienna hybrid system type" },
      { key: "pendingModels.rows[Lexus TX]", need: "Lexus TX 350 / 500h / 550h+ prices, assembly, hybrid types" },
      { key: "pendingModels.rows[Toyota Highlander Hybrid]", need: "Highlander Hybrid prices, assembly, hybrid type" },
      { key: "pendingModels.rows[Hyundai Palisade]", need: "Palisade prices, assembly, hybrid type" },
      { key: "pendingModels.rows[Kia Telluride]", need: "Telluride prices, assembly, hybrid type" }
    ] },
    { group: "Washington and Bellevue cost structure (research agent 2) — NOW VERIFIED, except these", keys: [
      { key: "money.insurance.wa.perCar", need: "Real Bellevue insurance quotes by VIN or trim for each shortlisted car, including the no-prior-coverage surcharge" },
      { key: "money.wa.loanInterestDeduction", need: "Confirm the federal auto-loan interest deduction phase-out for married filing separately at $200,000+. Status is unverified, and the working assumption is $0." }
    ] },
    { group: "Matrix cells with no data", keys: [
      { key: "matrix.rav4hev.apr", need: "Toyota subsidised APR, if any" },
      { key: "matrix.rav4phev.value", need: "RAV4 PHEV price, so value can be judged" },
      { key: "matrix.rav4phev.apr", need: "Toyota subsidised APR" },
      { key: "matrix.crvhev.value", need: "CR-V Hybrid price" },
      { key: "matrix.crvhev.apr", need: "Honda subsidised APR" },
      { key: "matrix.crvhev.hybrid", need: "CR-V Hybrid system type" },
      { key: "matrix.lexusnx.value", need: "Lexus NX price" },
      { key: "matrix.lexusnx.apr", need: "Lexus subsidised APR" },
      { key: "matrix.lexusnx.hybrid", need: "NX hybrid / PHEV availability" },
      { key: "matrix.lexusrx.value", need: "Lexus RX price" },
      { key: "matrix.lexusrx.apr", need: "Lexus subsidised APR" },
      { key: "matrix.lexusrx.hybrid", need: "RX hybrid / PHEV availability" },
      { key: "matrix.grandhighlander.value", need: "Grand Highlander price" },
      { key: "matrix.grandhighlander.apr", need: "Toyota subsidised APR" },
      { key: "matrix.grandhighlander.hybrid", need: "Grand Highlander hybrid types" },
      { key: "matrix.cx50hev.*", need: "Nothing pending — the CX-50 Hybrid is the only fully-scored car" },
      { key: "matrix.modely.apr", need: "Tesla APR" },
      { key: "matrix.bmwx3.apr", need: "BMW APR" }
    ] },
    { group: "Data the research explicitly could not find", keys: [
      { key: "money.depreciation.rows[GLC]", need: "Mercedes GLC five-year depreciation. Do NOT substitute the GLA 250." },
      { key: "money.depreciation.rows[Forester]", need: "Subaru Forester five-year depreciation" },
      { key: "money.repairpal.rows[CX-50]", need: "RepairPal annual cost, Mazda CX-50" },
      { key: "money.repairpal.rows[ModelY]", need: "RepairPal annual cost, Tesla Model Y" }
    ] }
  ];

  return {
    meta: meta, sources: sources, criteria: criteria, weighting: weighting,
    cars: cars, pendingModels: pendingModels, matrix: matrix, verdict: verdict,
    reliability: reliability, money: money, calculator: calculator,
    cx5Case: cx5Case, mazdaOffer: mazdaOffer, testDrive: testDrive,
    openQuestions: openQuestions, pendingIndex: pendingIndex
  };
})();
