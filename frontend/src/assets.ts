/*
 * Photography.
 *
 * One editorial image per surface, always behind a scrim and always optional —
 * the <Photo> component removes itself if a URL fails, leaving the painted
 * background intact, so the product never depends on the network to look right.
 */

const unsplash = (id: string, w: number) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=80`;

export const imagery = {
  /** Sign-in: a quiet, light-filled workspace. */
  signIn: unsplash('1497366754035-f200968a6e72', 1400),
  /** Dashboard welcome band: people at work, cropped wide and low-contrast. */
  welcome: unsplash('1522071820081-009f0129c71c', 1200),
  /** Contracts: architectural lines, used as a texture rather than a subject. */
  contracts: unsplash('1486406146926-c627a92ad1ab', 900),
};
