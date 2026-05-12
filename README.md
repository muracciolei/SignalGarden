# Signal Garden

Signal Garden is a front-end only Progressive Web App that generates a living procedural biosphere in the browser. It uses React, Vite, TypeScript, TailwindCSS, Three.js, GLSL shaders, the Web Audio API, IndexedDB, and a generated service worker.

Everything runs locally. There is no backend, authentication, database server, cloud API, or external AI service.

## Features

- Procedural organisms, spores, neural vines, plasma shockwaves, and floating signal structures.
- Audio reactive mode with microphone input or a local audio track.
- Pointer, touch, click, keyboard, and idle reactivity.
- Five cinematic moods: Abyss, Neon Jungle, Quantum Bloom, Solar Storm, and Frozen Signal.
- Screenshot export, short WebM loop export where supported, and shareable seed links.
- IndexedDB persistence for settings and favorite ecosystems.
- Installable PWA with offline caching.
- Responsive cyber-biological UI for desktop and mobile.

## Setup

```bash
npm install
npm run dev
```

Build for production:

```bash
npm run build
```

Preview the production build:

```bash
npm run preview
```

## GitHub Pages

The app is configured for GitHub Pages at:

```text
https://muracciolei.github.io/SignalGarden/
```

Pushes to `main` trigger `.github/workflows/deploy.yml`, which builds the Vite app and deploys `dist` through GitHub Pages.

## Project Structure

```text
src/
  components/       React UI and scene bridge
  config/           Mood definitions
  hooks/            Audio analyzer and IndexedDB-backed state
  lib/              Seed, persistence, and export helpers
  three/            Three.js engine and reusable GLSL shaders
  types/            Shared TypeScript models
```

## Browser Notes

Microphone mode requires a secure context, such as `localhost` or HTTPS. Video loop export uses `canvas.captureStream` and `MediaRecorder`, so unsupported browsers will gracefully fall back with an in-app status message.
