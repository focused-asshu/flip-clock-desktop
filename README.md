# FlipClock Wallpaper

FlipClock Wallpaper is an Electron Windows wallpaper app with a Three.js split-flap clock. V2 adds true desktop-icon wallpaper integration while keeping the V1 transparent fullscreen fallback.

## V2 WorkerW wallpaper mode

On Windows, the app loads a small C++ N-API addon (`src/native/workerw.cc`) without dynamic FFI packages. The addon asks Explorer to create the desktop `WorkerW` layer, enumerates top-level windows to find `SHELLDLL_DefView`, locates the sibling `WorkerW`, then reparents the Electron wallpaper HWND behind the desktop icons. It also applies click-through, no-activate, and tool-window extended window styles so the wallpaper stays non-interactive and out of Alt-Tab.

The main process reattaches the wallpaper when displays are added, removed, or their metrics change. It also retries periodically, which lets the wallpaper recover after Explorer restarts.

## Fallback mode

If WorkerW attachment fails, FlipClock remains usable in the V1 fullscreen transparent wallpaper window. The Settings > Diagnostics section shows whether WorkerW is active, whether fallback is active, and the most recent attach error reason.

## 3D flip-card rig

The renderer uses Three.js with shared rounded/beveled card geometry, PBR-style materials, cached canvas digit textures, contact shadows, accent glow, and key/rim/fill lighting. Each digit is a split-flap rig with top, bottom, and animated flap halves. The flap rotates around a hinge-like top pivot with a spring/bounce settle curve, and rendering is requested only during flips, resize, or settings changes to keep idle CPU/GPU use low.

## Settings

Open the tray menu and choose **Settings**. V2 groups controls into Clock, Appearance, Layout, Animation, and Diagnostics. Changes save instantly and are pushed to the wallpaper immediately, including 12/24-hour mode, seconds, date, colors, scale, position, offsets, camera tilt, animation speed, shadow strength, and glow intensity.

## Build the Windows EXE from GitHub Actions

1. Push to `main` or run the **Build Windows EXE** workflow manually from the Actions tab.
2. The workflow runs `npm install`, `npm run lint`, and `npm run build -- --publish never` on `windows-latest`.
3. Download the `windows-exe-artifacts` artifact; it contains the generated `dist/*.exe` installer/portable builds.

## Local development

```bash
npm install
npm run lint
npm start
```

To build locally on Windows:

```bash
npm run build -- --publish never
```

## V2 smoke test checklist

After downloading or building the Windows EXE:

1. Run the EXE and open **Settings** from the tray icon.
2. Check **Diagnostics** and confirm the native addon is loaded, WorkerW is active, and fallback is not active.
3. Confirm the clock appears behind desktop icons rather than above them.
4. Click desktop icons and empty desktop space through the wallpaper to confirm click-through behavior.
5. If WorkerW is not active, confirm fallback is active and record the native addon or attach error from Diagnostics.

## Troubleshooting WorkerW

- Check **Settings > Diagnostics** for `WorkerW active`, `Fallback active`, native addon load state, addon path, addon load error, and the attach error.
- Restart Explorer or use the tray **Restart clock** action if Explorer was recently restarted.
- Ensure the app is running on Windows; WorkerW mode is not available on macOS/Linux.
- If the native addon cannot load, run `npm install` again on Windows with Visual Studio Build Tools installed, then rebuild the app.
- The fallback mode should continue showing the clock even when WorkerW attachment is unavailable.
