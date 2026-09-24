# Russian Fish

A browser card game based on Russian 101. I wanted the table to feel alive: cards move between hands, special cards interrupt the turn, and small synthesized sounds make each action easier to follow.

You play against computer opponents. Match the rank or suit of the discard pile, use special cards to change the flow, and empty your hand first. The game includes an in-app **How to Play** guide, so you can learn the exact rules while playing.

## Run it

```bash
npm install
npm run dev
```

`npm run build` makes a production build. This is a React, TypeScript, and Vite project. The game runs in your browser; there is no account or online multiplayer.

## What is here

The interesting part is the interaction work: turn state, playable-card rules, card movement, responsive table layout, and sound made with the Web Audio API.

This is a playable experiment, not a finished multiplayer product.
