// ============================================================
// Game Detector
// ============================================================
// Detects if the current foreground app is a game (OpenGL/
// SurfaceView) or a standard Android app with native widgets.
// ============================================================

import { adb } from './device.js';

/**
 * Known game package prefixes/names.
 * This list is checked first for instant detection.
 */
const KNOWN_GAME_PACKAGES: string[] = [
  'com.dts.freefireth',
  'com.dts.freefiremax',
  'com.tencent.ig',              // PUBG Mobile
  'com.activision.callofduty',   // COD Mobile
  'com.supercell.clashofclans',
  'com.supercell.clashroyale',
  'com.kiloo.subwaysurf',
  'com.halfbrick.fruitninjafree',
  'com.king.candycrushsaga',
  'com.mojang.minecraftpe',      // Minecraft
  'com.riotgames.league.wildrift',
  'com.garena.game.codm',
  'com.mobile.legends',
];

/**
 * Check if the current app is a game by:
 * 1. Matching against known game package list
 * 2. Checking if the app uses SurfaceView/GLSurfaceView (OpenGL rendering)
 */
export async function isGameApp(
  deviceId: string,
  currentPackage: string
): Promise<boolean> {
  // Quick check: known games
  if (KNOWN_GAME_PACKAGES.some(pkg => currentPackage.startsWith(pkg))) {
    return true;
  }

  // Heuristic: Check if the app has any SurfaceView layers
  // Games typically render via SurfaceView/GLSurfaceView
  try {
    const surfaces = await adb(
      ['shell', 'dumpsys', 'SurfaceFlinger', '--list'],
      deviceId
    );
    
    const appSurfaces = surfaces
      .split('\n')
      .filter(line => line.includes(currentPackage));
    
    // If the app has a SurfaceView but no standard Android views,
    // it's likely a game
    const hasSurfaceView = appSurfaces.some(
      line => line.includes('SurfaceView') || line.includes('GLSurfaceView')
    );
    
    return hasSurfaceView;
  } catch {
    return false;
  }
}
