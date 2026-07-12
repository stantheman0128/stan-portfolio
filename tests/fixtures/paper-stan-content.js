// Frozen content document for Paper Stan dialogue tests. The live
// data/content.json is owner-edited (items get renamed, reordered, deleted),
// so tests inject this stable fixture instead of reading the real file —
// otherwise every content edit in the site editor breaks the suite.
export const PAPER_STAN_TEST_CONTENT = {
  profile: {
    name: "Stan Shih",
    latinName: "Po-Han Shih",
    location: "Taipei, Taiwan",
    role: "Product builder",
    tagline: "I build things I like.",
    subtagline: "Ships end-to-end across web and mobile.",
    email: "stan@stan-shih.com",
    available: "Open to internships and collaborations",
  },
  items: [
    {
      id: "course-checker",
      title: "Course Checker",
      status: "Live",
      year: "2025",
      description: "A production PWA that checks NTNU CS graduation credits against catalog rules.",
      detail:
        "Loads a transcript and the department's catalog rules, then reports remaining required credits by category. Installable as a PWA and used by real students.",
    },
    {
      id: "etf-tracker",
      title: "ETF Tracker",
      status: "Live",
      year: "2025",
      description: "A personal dashboard that tracks Taiwan ETFs, US stocks, and BTC in one place.",
      detail: "Follows a real mixed portfolio with cost basis and live valuation.",
    },
  ],
  patent: {
    title: "Vehicle collision-avoidance system",
    ids: ["US10699576B1"],
    year: "2020",
    role: "Inventor",
    blurb: "A travel-path safety system for vehicles.",
    highlights: ["Granted in the United States"],
  },
};
