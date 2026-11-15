/**
 * @file images.ts
 * @description Pictures for menu and stock items, matched by name.
 * Names come from the database; anything without a picture uses the fallback.
 *
 * The PNGs are the shop's own pictures in frontend/src. They are bundled with
 * the app (require), so they show without internet. Liempo has no PNG yet, so
 * it still uses an online photo — add src/liempo.png and swap PORK below.
 */
import type { ImageSourcePropType } from 'react-native';

const CHICKEN: ImageSourcePropType = require('../chicken.png');
const CHORIZO: ImageSourcePropType = require('../chorizo.png');
const ATSARA: ImageSourcePropType = require('../atsara.png');
const GRAVY: ImageSourcePropType = require('../gravy.png');
const PORK: ImageSourcePropType = {
  uri: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=400&q=80',
};

/** Exact-name images (lower-case keys). */
const BY_NAME: Record<string, ImageSourcePropType> = {
  'whole juicy chicken': CHICKEN,
  'half juicy chicken': CHICKEN,
  liempo: PORK,
  'regular chorizo': CHORIZO,
  'spicy chorizo': CHORIZO,
  'chorizo de cebu (regular)': CHORIZO,
  'chorizo de cebu (spicy)': CHORIZO,
  atsara: ATSARA,
  'sarsa (gravy)': GRAVY,
};

/** Keyword images for items added later. */
const BY_KEYWORD: [RegExp, ImageSourcePropType][] = [
  [/chicken/i, CHICKEN],
  [/pork|liempo/i, PORK],
  [/chorizo/i, CHORIZO],
  [/atsara|pickle/i, ATSARA],
  [/sarsa|gravy|sauce/i, GRAVY],
];

/** Returns the picture for a menu or stock item name (use as <Image source={...} />). */
export function imageFor(name: string): ImageSourcePropType {
  const key = String(name || '').trim().toLowerCase();
  if (BY_NAME[key]) return BY_NAME[key];
  const hit = BY_KEYWORD.find(([re]) => re.test(key));
  return hit ? hit[1] : CHICKEN;
}

// TEST: imageFor('Atsara') is the bundled atsara.png; imageFor('Chorizo De Cebu (Spicy)') is chorizo.png
// TEST: imageFor('Liempo') is the online pork photo until src/liempo.png is added; an unknown name -> chicken.png
