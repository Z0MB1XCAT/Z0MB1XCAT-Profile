/* Partners, shown on the For teams page.

   current: partners I have now. Each: { name, url, logo, role }, where logo
   is an image in assets/img/partners/ (a wide transparent PNG or SVG).
   While this is empty the page shows the open slots instead.

   slots: the kinds of partnership on offer, and what each one gets. Edit
   the wording freely; set  open: false  on a slot once it's taken. */
window.Z0_PARTNERS = {
  current: [],
  slots: [
    {
      name: 'Primary partner',
      open: true,
      gets: [
        'Your logo on my stream overlay and Twitch panels',
        'Your logo on my car in sims that allow custom paint (iRacing, ACC, Assetto Corsa)',
        'Top billing on this site and on my driver sheet',
        'Mentions on stream, and links in my YouTube and TikTok descriptions',
      ],
    },
    {
      name: 'Hardware partner',
      open: true,
      gets: [
        'Your kit used and shown on stream, with honest feedback',
        'Setup guides and settings for your products on this site',
        'Your logo on this site and on my driver sheet',
      ],
    },
    {
      name: 'Supporting partner',
      open: true,
      gets: [
        'Your logo on this site and on my driver sheet',
        'A shout-out on stream and in my Discord',
      ],
    },
  ],
};
