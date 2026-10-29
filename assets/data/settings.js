/* My settings, shown on the Rig page (rig.html#settings), one tab per set,
   each with a button that copies it as text for Discord.

   A set has:
     title, note    the tab name and a short subtitle
     blurb          a sentence or two about why it's set up that way
     groups         [{ title, rows: [[label, value], ...] }, ...]
     common: true   also show (and copy) the "every profile" group below
     curves         pedals only: output % at 20, 40, 60, 80 and 100% travel
   A set with no rows is left out. */
window.Z0_SETTINGS = {
  updated: '2026-10-29',

  // the same on every wheelbase profile
  common: {
    title: 'Same on every profile',
    rows: [
      ['FFB equaliser', 'Flat, every band at 100%'],
      ['FFB style', 'Standard'],
      ['Sensitivity', '10'],
      ['Base FFB curve', 'Linear'],
    ],
    note: 'Each profile can nudge the base curve slightly, but if you leave yours at its default it will match mine.',
  },

  sets: [
    {
      id: 'f1',
      title: 'F1 25',
      note: 'Pit House profile "f1 25 pure ffb", plus in-game settings',
      blurb: 'Raw force feedback: Pit House adds almost nothing on top of the game, so what comes through the rim is the car. I run 360° of rotation, which lets me reach full lock comfortably without straining my wrists and still gives plenty of control.',
      common: true,
      groups: [
        {
          title: 'Pit House: wheelbase',
          rows: [
            ['Maximum steering angle', '360°'],
            ['Limit and steering angle sync', 'On'],
            ['Game force feedback intensity', '100%'],
            ['Maximum output torque', '100% (9.0 Nm)'],
            ['Force feedback reversal', 'Off'],
            ['Force feedback interpolation', '1'],
            ['FFB centre deadzone compensation', '0'],
            ['Maximum wheel speed', '70%'],
            ['Hands-off protection', 'Off'],
            ['Performance output', 'Full'],
            ['Soft limit stiffness', 'Soft, 1'],
            ['Soft limit strength', 'Middle'],
            ['Soft limit game force strength', 'Off'],
          ],
        },
        {
          title: 'Pit House: force effects',
          rows: [
            ['Natural damping', '20%'],
            ['Natural friction', '0%'],
            ['Natural inertia', '100%'],
            ['Wheel spring strength', '0%'],
            ['Speed-dependent damping', '0%'],
            ['Speed-dependent damping starts at', '0 km/h'],
            ['Game spring', '0%'],
            ['Game damping', '10%'],
            ['Game inertia', '0%'],
            ['Game friction', '0%'],
          ],
        },
        {
          title: 'In game: vibration and force feedback',
          rows: [
            ['Vibration and force feedback', 'On'],
            ['Strength', '90'],
            ['On track effects', '0'],
            ['Rumble strip effects', '0'],
            ['Off track effects', '0'],
            ['Pit stop effects', '0'],
            ['Wheel damper', '0'],
            ['Maximum wheel rotation', '360°'],
          ],
        },
        {
          title: 'In game: calibration',
          rows: [
            ['Steering rate', '100%'],
            ['Steering deadzone, linearity, saturation', '0'],
            ['Throttle deadzone, linearity, saturation', '0'],
            ['Brake deadzone', '5'],
            ['Brake linearity, saturation', '0'],
          ],
        },
      ],
    },

    {
      id: 'pedals',
      title: 'CRP2 pedals',
      note: 'Pit House pedal and pedal vibration settings',
      blurb: 'The brake reads entirely from the load cell: if you\'ve paid for one, use all of it. All three pedals run linear curves because that\'s what most rigs use, so I can sit on anyone\'s setup and adapt quickly. Pedal vibration is kept to the essentials: it barely matters in F1, but in GT cars it tells me what the wheel can\'t.',
      groups: [
        {
          title: 'Pedals',
          rows: [
            ['Brake sensor output', '100% load cell'],
            ['Brake kit', 'Basic kit combination'],
            ['Brake cutoff throttle threshold', 'Off'],
            ['Curves', 'Linear on all three'],
            ['Reverse', 'Off on all three'],
          ],
        },
        {
          title: 'Pedal vibration (PHF)',
          rows: [
            ['Brake: ABS', 'On, 40 Hz, 55%'],
            ['Brake: wheel lockup', 'On, 51 Hz, 65%'],
            ['Throttle: traction control', 'On, 30 Hz, 50%'],
            ['Throttle: wheel spin', 'On, 30 Hz, 35%'],
            ['Everything else', 'Off'],
          ],
        },
      ],
      curves: {
        throttle: [20, 40, 60, 80, 100],
        brake: [20, 40, 60, 80, 100],
        clutch: [20, 40, 60, 80, 100],
      },
    },

    {
      id: 'acc',
      title: 'ACC',
      note: 'Pit House profile "R9-ACC-Official55"',
      blurb: 'A looser style of force feedback, which to me feels very close to the real thing.',
      common: true,
      groups: [
        {
          title: 'Pit House: wheelbase',
          rows: [
            ['Maximum steering angle', '900°'],
            ['Limit and steering angle sync', 'On'],
            ['Game force feedback intensity', '100%'],
            ['Maximum output torque', '100% (9.0 Nm)'],
            ['Force feedback reversal', 'Off'],
            ['Force feedback interpolation', '10'],
            ['FFB centre deadzone compensation', '10'],
            ['Maximum wheel speed', '160%'],
            ['Hands-off protection', 'Off'],
            ['Performance output', 'Full'],
            ['Soft limit stiffness', 'Soft, 1'],
            ['Soft limit strength', 'Middle'],
            ['Soft limit game force strength', 'On'],
          ],
        },
        {
          title: 'Pit House: force effects',
          rows: [
            ['Natural damping', '40%'],
            ['Natural friction', '30%'],
            ['Natural inertia', '150%'],
            ['Wheel spring strength', '0%'],
            ['Speed-dependent damping', '50%'],
            ['Speed-dependent damping starts at', '75 km/h'],
            ['Game spring', '100%'],
            ['Game damping', '100%'],
            ['Game inertia', '100%'],
            ['Game friction', '100%'],
          ],
        },
      ],
    },

    {
      id: 'ac',
      title: 'Assetto Corsa',
      note: 'Pit House profile "R9-AC-Official3"',
      blurb: 'Tuned for realism rather than raw data, so there\'s more going on through the rim. It copes with anything from a road car on a Sunday drive to a GT3.',
      common: true,
      groups: [
        {
          title: 'Pit House: wheelbase',
          rows: [
            ['Maximum steering angle', '900°'],
            ['Limit and steering angle sync', 'On'],
            ['Game force feedback intensity', '100%'],
            ['Maximum output torque', '100% (9.0 Nm)'],
            ['Force feedback reversal', 'Off'],
            ['Force feedback interpolation', '1'],
            ['FFB centre deadzone compensation', '10'],
            ['Maximum wheel speed', '200%'],
            ['Hands-off protection', 'Off'],
            ['Performance output', 'Full'],
            ['Soft limit stiffness', 'Soft, 1'],
            ['Soft limit strength', 'Middle'],
            ['Soft limit game force strength', 'On'],
          ],
        },
        {
          title: 'Pit House: force effects',
          rows: [
            ['Natural damping', '65%'],
            ['Natural friction', '50%'],
            ['Natural inertia', '250%'],
            ['Wheel spring strength', '0%'],
            ['Speed-dependent damping', '50%'],
            ['Speed-dependent damping starts at', '120 km/h'],
            ['Game spring', '100%'],
            ['Game damping', '100%'],
            ['Game inertia', '100%'],
            ['Game friction', '100%'],
          ],
        },
      ],
    },

    {
      id: 'iracing',
      title: 'iRacing',
      note: 'Pit House profile "R9-FormulVee"',
      blurb: 'Built around formula cars rather than GT, though it should carry over to other cars just as well.',
      common: true,
      groups: [
        {
          title: 'Pit House: wheelbase',
          rows: [
            ['Maximum steering angle', '900°'],
            ['Limit and steering angle sync', 'On'],
            ['Game force feedback intensity', '100%'],
            ['Maximum output torque', '100% (9.0 Nm)'],
            ['Force feedback reversal', 'Off'],
            ['Force feedback interpolation', '0'],
            ['FFB centre deadzone compensation', '0'],
            ['Maximum wheel speed', '100%'],
            ['Hands-off protection', 'Off'],
            ['Performance output', 'Full'],
            ['Soft limit stiffness', '5'],
            ['Soft limit strength', 'Hard'],
            ['Soft limit game force strength', 'On'],
          ],
        },
        {
          title: 'Pit House: force effects',
          rows: [
            ['Natural damping', '5%'],
            ['Natural friction', '50%'],
            ['Natural inertia', '150%'],
            ['Wheel spring strength', '0%'],
            ['Speed-dependent damping', '0%'],
            ['Speed-dependent damping starts at', '80 km/h'],
            ['Game spring', '100%'],
            ['Game damping', '50%'],
            ['Game inertia', '50%'],
            ['Game friction', '50%'],
          ],
        },
      ],
    },
  ],
};
