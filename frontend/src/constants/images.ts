/**
 * @file images.ts
 * @description Pictures for menu and stock items, matched by name.
 * Names come from the database; anything without a picture uses the fallback.
 */

const CHICKEN = 'https://images.unsplash.com/photo-1598103442097-8b74394b95c6?auto=format&fit=crop&w=400&q=80';
const PORK = 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=400&q=80';
const CHORIZO = 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=400&q=80';
const ATSARA = 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=400&q=80';
const GRAVY = 'https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&w=400&q=80';

/** Exact-name images (lower-case keys). */
const BY_NAME: Record<string, string> = {
  'whole juicy chicken': CHICKEN,
  'half juicy chicken': CHICKEN,
  liempo: PORK,
  'regular chorizo': CHORIZO,
  'spicy chorizo': CHORIZO,
  atsara: ATSARA,
  'sarsa (gravy)': GRAVY,
};

/** Keyword images for items added later. */
const BY_KEYWORD: [RegExp, string][] = [
  [/chicken/i, CHICKEN],
  [/pork|liempo/i, PORK],
  [/chorizo/i, CHORIZO],
  [/atsara|pickle/i, ATSARA],
  [/sarsa|gravy|sauce/i, GRAVY],
];

/** Returns an image URL for a menu or stock item name. */
export function imageFor(name: string): string {
  const key = String(name || '').trim().toLowerCase();
  if (BY_NAME[key]) return BY_NAME[key];
  const hit = BY_KEYWORD.find(([re]) => re.test(key));
  return hit ? hit[1] : CHICKEN;
}
