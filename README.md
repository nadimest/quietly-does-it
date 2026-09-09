# Quietly Does It

A small, empathetic 3D isometric game about navigating social spaces while honoring your limits. All scenery and characters are original procedural 3D models; no external art services or accounts are needed.

## Run locally

1. Install Node.js 22.13 or newer.
2. In this folder, run `npm install`.
3. Run `npm run dev`.
4. Open `http://localhost:3000` in a browser.

For a production check, run `npm run build`. The game needs a browser with WebGL support.

### Try it on your phone

Connect the phone and computer to the same Wi-Fi. Run `npm run dev:lan`, then open `http://YOUR-COMPUTER-LAN-IP:3000` on the phone (use your computer’s local network address, not `localhost`). Keep the server running while you play. A firewall or guest Wi-Fi isolation may prevent local connections.

Portrait mode follows the player and shows a minimap. Use the magnifying-glass button to switch to the whole scene. Landscape and fullscreen give more room.

## Controls

- Move: `W A S D` or arrow keys
- Take a breath: `Space`
- Polite boundary: `E`
- Quiet steps: hold `Shift`, or toggle Quiet steps
- Pause/resume: `Esc`

On mobile, drag the thumbstick and tap Breathe or Excuse me. Releasing or cancelling a touch stops movement. Changing tabs or leaving the game automatically pauses it. Sound starts muted; the speaker button enables gentle synthesized effects.

## How to play

Keep some distance from other people so the Social Pressure meter does not fill. When it does get crowded, use Take a Breath for a short pressure reduction and moment of breathing room.

- Park: reach the quiet bench.
- Supermarket: collect oat milk, apples, and bread in any order, then reach self-checkout.
- Party: deliver the gift, then reach the balcony.

Choose any chapter from the top bar. NPCs have individual patrols, speeds, awareness, appearances, and dialogue. Furniture blocks sight; amber dots show growing attention. A polite boundary makes nearby people return to their own evening. Mint quiet spots restore composure faster.

At 100 pressure you can retry the current level. Gentle mode slows NPCs and halves pressure gains. Finishing awards one star, with extra stars for keeping peak pressure below 70 and having fewer than three close-contact hellos. Breathing breaks never cost stars, and there is no time limit. Best stars are stored only in this browser.

## Project structure

- `app/game/world.ts`: level layouts, character personalities, collisions, and pathfinding
- `app/game/engine.ts`: deterministic movement, NPC awareness, abilities, and win/fail rules
- `app/game/scene.ts`: Three.js models, lighting, camera, and animation
- `app/game/audio.ts`: small synthesized sound effects
- `app/page.tsx`: interface, input, mobile controls, and local records

## Checks

Run `npm test` for 13 gameplay checks covering walkable destinations, safe NPC spawns, patrol collision safety, complete routes through all three levels, abilities, pause, sight blocking, and win/fail conditions. `npx tsc --noEmit` checks types; `npx oxlint app` checks game source. The starter's full `npm run lint` also checks unused bundled components, some of which have pre-existing warnings.
