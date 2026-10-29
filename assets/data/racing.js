/* Every league, season, round and result, in one place. The race calendar,
   the results history, the stats and the driver sheet all read from here.

   ADDING A RESULT: find the round and add  result: 'P5'  to it.
   See The Air runs two races a round (reverse grid, then feature), so its
   results are written as a pair:  result: '8·3'  (a / or | works too).
   DNF and DNS are fine anywhere:  result: 'DNF'  or  result: '6·DNF'.

   Optional extras on a round:
     grid: 2            where I started (grid: 1 counts as pole)
     points: 17         points scored
     note: '...'        a short line shown with the result
     mate: { grid: 14, pos: 6 }   my teammate's start and finish, for the
                        head-to-head (pos can be 'DNF')
   On a round in the calendar:
     date: '2026-11-14' UK date;  time: '19:30' only if it differs from
     the season's usual start;  tag: 'Wildcard' shows a small label.

   A past season with no round details can be pasted as one line:
     raw: '9·DNF 9·6 7·3'   (one entry per round, in order)

   On a season: current: true puts it in the calendar and "this season";
   standing: 4 is my championship position after the latest round. */
window.Z0_RACING = {
  leagues: [
    {
      id: 's4r',
      name: 'Sector 04 Racing',
      seasons: [
        {
          name: 'Season 1',
          team: 'Alpine',
          note: 'Joined for the final two rounds, straight in with no practice.',
          rounds: [
            { round: 9, track: 'Madrid', country: 'es', result: 'P8', grid: 11, points: 4 },
            { round: 10, track: 'Interlagos', country: 'br', result: 'P11', grid: 12, points: 0.5 },
          ],
        },
        {
          name: 'Season 2',
          team: 'McLaren',
          current: true,
          time: '20:00',
          standing: 4,
          rounds: [
            { round: 1, date: '2026-10-10', track: 'Monza', country: 'it', result: 'P3', grid: 2, points: 17, mate: { grid: 14, pos: 6 } },
            { round: 2, date: '2026-10-17', track: 'Montréal', country: 'ca', tag: 'Wildcard', result: 'P7', grid: 1, points: 7, note: 'Crossed the line fifth, then a two-place penalty dropped me to seventh.', mate: { grid: 2, pos: 4 } },
            { round: 3, date: '2026-10-24', track: 'Austin', country: 'us', result: 'P7', grid: 4, points: 6, note: 'Hit by another car during the race.', mate: { grid: 8, pos: 11 } },
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
      ],
    },

    {
      id: 'sta',
      name: 'See The Air',
      races: ['Reverse grid', 'Feature'],
      seasons: [
        {
          name: 'Season 4',
          note: 'My debut season.',
          raw: '9·DNF 9·6 7·3 DNF·DNF 7·5 DNS·DNS DNS·DNS 7·6 8·10 8·7 3·6 3·3',
        },
        {
          name: 'Season 5',
          team: 'Alpine',
          current: true,
          time: '19:00',
          rounds: [
            { round: 1, date: '2026-10-16', track: 'Mexico City', country: 'mx', result: '8·3' },
            { round: 2, date: '2026-10-23', track: 'São Paulo', country: 'br', result: '3·10' },
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
      ],
    },

    {
      id: 'ors',
      name: 'Overdrive Racing Series',
      team: 'Williams',
      // no fixed calendar yet; shown as a line under the race calendar
      schedule: 'Races on Sundays, at varying times',
      seasons: [],
    },

    {
      id: 'chaos',
      name: 'Chaos Grid',
      seasons: [
        {
          name: '',
          rounds: [
            { track: 'Bahrain', country: 'bh', result: 'P7', note: 'My first ever league race.' },
            { track: 'Montréal', country: 'ca', result: 'P2', note: 'My best finish so far.' },
          ],
        },
      ],
    },
  ],

  // races outside the leagues; listed in the history, not counted in the stats
  events: [
    { name: '6 Hours of Road America', detail: 'LMP2 in Assetto Corsa, driven solo from start to finish', result: '6 h' },
  ],
};
