# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and Oxlint's TypeScript related rules in your project.


## Indian Place Guide demo update
- Existing login/register/dashboard layout and routing are retained.
- Place catalogue includes Indian heritage locations with coordinates, Hindi/English descriptions, and historical context.
- Use Nearby Indian Places → Use My GPS to request browser location permission. The default demo location is Rajwada, Indore.
- Use Indian Place Guide search to find any supported place across the demo dataset.
- “Listen to place guide” uses browser/device Speech Synthesis in Hindi or English; it does not depend on the old ambient WAV files.
- GPS works on localhost or HTTPS and requires user permission. Browser speech voice availability varies by device. Place facts are demo copy and should be checked against official sources before production.

## Run locally
1. Install Node.js (current LTS).
2. Open the `ProxiSpeak2` folder in a terminal.
3. Run `npm install` then `npm run dev`.
4. Open the localhost URL printed by Vite.
