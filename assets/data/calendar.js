/* League race calendars. The Live page lists every round here with a
   countdown to the next one, and the home page shows the next round.
   A league with no rounds is left out.

   One entry per round:
     { round: 5, date: '2026-11-14', time: '20:00', track: 'Monza', country: 'it' }
   - date is the UK date; time (optional) is the UK start time. Leave time
     out while it isn't known: the round then shows its date only.
   - country is the two-letter code of a flag in assets/img/flags/
   - tag (optional) shows a small label, e.g. 'Wildcard'
   - after the race, add  result: 'P3'  (or 'DNF') to show it in the results */
window.Z0_CALENDAR = [
  {
    league: 'Sector 04 Racing',
    season: 'Season 2',
    team: 'McLaren',
    color: '#ff8000',
    rounds: [
      { round: 1, date: '2026-10-10', track: 'Monza', country: 'it', result: 'P3' },
      { round: 2, date: '2026-10-17', track: 'Montréal', country: 'ca', tag: 'Wildcard' },
      { round: 3, date: '2026-10-24', track: 'Austin', country: 'us' },
      { round: 4, date: '2026-10-31', time: '19:30', track: 'Zandvoort', country: 'nl' },
      { round: 5, date: '2026-11-07', track: 'Barcelona', country: 'es', tag: 'Wildcard' },
      { round: 6, date: '2026-11-14', track: 'Singapore', country: 'sg' },
      { round: 7, date: '2026-11-28', track: 'Baku', country: 'az' },
      { round: 8, date: '2026-12-05', track: 'Imola', country: 'it' },
      { round: 9, date: '2026-12-12', track: 'Abu Dhabi', country: 'ae' },
      { round: 10, date: '2026-12-19', track: 'Suzuka', country: 'jp' },
      { round: 11, date: '2027-01-02', track: 'Monaco', country: 'mc', tag: 'Wildcard' },
      { round: 12, date: '2027-01-09', track: 'Silverstone', country: 'gb', tag: 'Wildcard' },
      { round: 13, date: '2027-01-16', track: 'Melbourne', country: 'au', tag: 'Wildcard' },
      { round: 14, date: '2027-01-23', track: 'São Paulo', country: 'br' },
      { round: 15, date: '2027-01-30', track: 'Red Bull Ring', country: 'at' },
    ],
  },
  {
    league: 'See The Air',
    team: 'Alpine',
    color: '#2293d1',
    rounds: [
      { round: 1, date: '2026-10-16', track: 'Mexico City', country: 'mx' },
      { round: 2, date: '2026-10-23', track: 'São Paulo', country: 'br' },
      { round: 3, date: '2026-10-30', track: 'Montréal', country: 'ca' },
      { round: 4, date: '2026-11-06', track: 'Barcelona', country: 'es' },
      { round: 5, date: '2026-11-20', track: 'Lusail', country: 'qa' },
      { round: 6, date: '2026-11-27', track: 'Jeddah', country: 'sa' },
      { round: 7, date: '2026-12-04', track: 'Suzuka', country: 'jp' },
      { round: 8, date: '2026-12-11', track: 'Imola', country: 'it' },
      { round: 9, date: '2027-01-08', track: 'Abu Dhabi', country: 'ae' },
      { round: 10, date: '2027-01-15', track: 'Zandvoort', country: 'nl' },
      { round: 11, date: '2027-01-22', track: 'Bahrain', country: 'bh' },
      { round: 12, date: '2027-01-29', track: 'Singapore', country: 'sg' },
    ],
  },
  {
    // no published schedule yet
    league: 'Overdrive Racing Series',
    team: 'Williams',
    color: '#64c4ff',
    rounds: [],
  },
];
