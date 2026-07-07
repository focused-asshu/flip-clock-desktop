# FlipClock Wallpaper

FlipClock Wallpaper is an Electron + Three.js Windows desktop wallpaper that renders a real-time 3D split-flap clock in a transparent fullscreen fallback wallpaper window. It targets Windows 11 and should also work on Windows 10.

## Features

- Electron tray-only shell with no taskbar button.
- V1 fallback wallpaper mode: a fullscreen, transparent, borderless, click-through window that stays out of the taskbar and is shown inactive.
- WorkerW desktop embedding is planned for V2 after native packaging is hardened.
- Three.js scene with individual digit card meshes, depth, bevel-like box geometry, PBR materials, high-resolution canvas glyph textures, soft lighting, contact shadows, and perspective camera tilt.
- Efficient render loop: the scene renders on startup, settings changes, resize, and while a digit is actively flipping rather than running a constant 60 FPS loop.
- Settings panel for 12/24-hour mode, seconds, date visibility, theme presets, scale, position, and camera tilt.
- `electron-store` persistence and `auto-launch` login startup.
- `electron-builder` packaging for NSIS installer and portable Windows executable.
- GitHub Actions workflow that builds release `.exe` assets for tagged releases.

## Development

```bash
npm install
npm start
```

V1 always runs in fallback wallpaper mode. On non-Windows systems this is also useful for developing the renderer and settings UI.

## Build local Windows executables

```bash
npm install
npm run build
```

Build outputs are written to `dist/` and include both an NSIS installer and a portable executable.

## Wallpaper mode and WorkerW roadmap

V1 intentionally does not ship native WorkerW injection. The app uses a safe fallback wallpaper mode: Electron creates a transparent, borderless BrowserWindow sized to the union of all displays, marks it click-through so normal desktop interactions continue, skips the taskbar, and shows the window inactive. This keeps `npm install`, `npm start`, and `npm run build` reliable without native Win32 addon compilation.

WorkerW embedding is planned for V2. That future implementation can restore the `Progman` `0x052C` technique and `SetParent` behavior once it is packaged as a reliable prebuilt native helper instead of requiring fragile install-time native modules.

## Three.js flip-card rig notes

Each visible digit owns a `DigitCard` group containing top, bottom, and transient flap meshes. The meshes are thin `BoxGeometry` cards so they have physical depth and catch light. Canvas textures are generated per digit and half: the top half draws the lower part of a large glyph, and the bottom half draws the upper part, creating the split-flap illusion across the seam. During a change, the transient top flap starts with the previous digit texture and rotates down around the X axis with an ease-in and settle curve while the new top and bottom halves are already installed behind it.

Lighting uses ambient fill, a top-left key light with soft shadows, and a colored rim light. A large shadow-receiving plane sits just below the cards to create a faint contact shadow so the clock reads as a physical object floating above the desktop. Camera tilt is configurable and uses a perspective camera rather than orthographic projection so card thickness and foreshortening remain visible.

## Project structure

```text
src/main/       Electron main process, tray, settings, fallback wallpaper mode
src/renderer/   Three.js wallpaper renderer and settings panel
src/native/     Reserved for a future V2 WorkerW helper
.github/        Windows release build workflow
```
