/**
 * @file +html.tsx
 * @description Root HTML for the WEB version only (static rendering; the Android
 * app never uses this file). It adds the home-screen icon, name and color, so
 * "Add to Home Screen" in iPhone Safari or Android Chrome shows the Mr. Liempo
 * logo instead of a plain letter. The icon files are in frontend/public, which
 * Expo copies to the root of the website when it builds.
 */
import type { ReactNode } from 'react';
import { ScrollViewStyleReset, useServerDocumentContext } from 'expo-router/html';

export default function Root({ children }: { children: ReactNode }) {
  const { bodyAttributes, bodyNodes, htmlAttributes, headNodes } = useServerDocumentContext();

  return (
    <html lang="en" {...htmlAttributes}>
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
        <title>Mr. Liempo</title>

        {/* iPhone / iPad: icon and name used by Safari's "Add to Home Screen" */}
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <meta name="apple-mobile-web-app-title" content="Mr. Liempo" />

        {/* Android Chrome reads its icon and name from the manifest */}
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#FFC400" />

        {/* Keeps ScrollView behaving like it does on the phone app */}
        <ScrollViewStyleReset />

        {headNodes}
      </head>
      <body {...bodyAttributes}>
        {children}
        {bodyNodes}
      </body>
    </html>
  );
}
