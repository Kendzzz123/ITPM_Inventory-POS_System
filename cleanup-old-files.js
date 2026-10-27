/**
 * cleanup-old-files.js — run ONCE after the restructure:
 *
 *     node cleanup-old-files.js
 *
 * Moves the old / duplicate / unused template files into _to_delete/
 * (same folder layout) so Expo Router stops seeing duplicate screens.
 * Nothing is permanently deleted: check the app runs, then delete the
 * _to_delete folder and this script yourself.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const TRASH = path.join(ROOT, '_to_delete');

const OLD_PATHS = [
  // Old screen folder — every screen now lives in src/app/(auth) and src/app/(main);
  // Role.tsx / RoleSideDrawer.tsx moved to src/store, src/services and src/components.
  // staff-module.tsx was an unused copy of account-info.tsx.
  'frontend/src/app/(login_module)',

  // Unused Expo starter-template files
  'frontend/src/components/animated-icon.module.css',
  'frontend/src/components/animated-icon.tsx',
  'frontend/src/components/animated-icon.web.tsx',
  'frontend/src/components/app-tabs.tsx',
  'frontend/src/components/app-tabs.web.tsx',
  'frontend/src/components/external-link.tsx',
  'frontend/src/components/hint-row.tsx',
  'frontend/src/components/themed-text.tsx',
  'frontend/src/components/themed-view.tsx',
  'frontend/src/components/web-badge.tsx',
  'frontend/src/components/ui',
  'frontend/src/constants/theme.ts',
  'frontend/src/global.css',
  'frontend/src/hooks/use-color-scheme.ts',
  'frontend/src/hooks/use-color-scheme.web.ts',
  'frontend/src/hooks/use-theme.ts',
  'frontend/scripts',
  'frontend/README.md',
  'frontend/assets/images/expo-badge-white.png',
  'frontend/assets/images/expo-badge.png',
  'frontend/assets/images/expo-logo.png',
  'frontend/assets/images/logo-glow.png',
  'frontend/assets/images/react-logo.png',
  'frontend/assets/images/react-logo@2x.png',
  'frontend/assets/images/react-logo@3x.png',
  'frontend/assets/images/tutorial-web.png',
  'frontend/assets/images/tabIcons',

  // Old backend layout — now backend/src/** and backend/database/**
  'backend/controller',
  'backend/middleware',
  'backend/pos_schema.sql',
  'backend/migrate.sql',
  'backend/seed.js',

  // Root leftovers: duplicate xlsx install and a submodule entry pointing to a folder that doesn't exist
  'package.json',
  'package-lock.json',
  'node_modules',
  '.gitmodules',
];

let moved = 0;
for (const rel of OLD_PATHS) {
  const from = path.join(ROOT, rel);
  if (!fs.existsSync(from)) continue;
  const to = path.join(TRASH, rel);
  fs.mkdirSync(path.dirname(to), { recursive: true });
  try {
    fs.renameSync(from, to);
    moved += 1;
    console.log(`moved  ${rel}`);
  } catch (err) {
    console.error(`skip   ${rel}  (${err.code}: close any editor/terminal using it and run again)`);
  }
}

console.log(
  moved
    ? `\nDone: ${moved} item(s) moved to _to_delete/. Run the app, then delete _to_delete/ and this script.`
    : '\nNothing to move — already cleaned up.'
);
