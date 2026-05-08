# Full Throttle Beta — Deployment Guide

## What's included
- `server.js` — Node.js game server (no dependencies required)
- `index.html` — Beta landing page and game creation
- `game.html` — Live game board
- `package.json` — Project config

## Running locally (for testing)

```bash
node server.js
```

Then open http://localhost:3000 in your browser.

To test two players on one machine, open two browser windows:
1. Window 1: Create a game, note the code
2. Window 2: Go to http://localhost:3000, enter the code to join

---

## Deploying to Render (free tier — recommended)

1. Create a free account at https://render.com
2. Click "New" → "Web Service"
3. Connect your GitHub repo (upload these files first)
4. Settings:
   - **Build Command:** (leave blank)
   - **Start Command:** `node server.js`
   - **Environment:** Node
5. Click Deploy

Render gives you a URL like `https://fullthrottle-beta.onrender.com`
Share that URL with beta testers.

---

## Deploying to Railway (alternative)

1. Create account at https://railway.app
2. New Project → Deploy from GitHub
3. Railway auto-detects Node.js and runs `npm start`
4. You get a URL immediately

---

## Deploying to Heroku

```bash
heroku create fullthrottle-beta
git push heroku main
heroku open
```

---

## How the game works

**Creating a game:**
1. Player 1 visits the site, picks a route and weapon, clicks "Create Game"
2. They get a unique 8-character game code
3. They share the code or the auto-generated join link with Player 2

**Joining a game:**
1. Player 2 visits the site, enters the code, picks their weapon, clicks "Join"
2. Both players are taken to the game board
3. The waiting overlay on Player 1's screen disappears automatically

**Playing:**
- Both players see the same route board with stop thresholds
- Gold dot = your position, blue dot = opponent's position
- Click FLIP to flip your top card
- If at different stops: each flip checks against their own threshold
- If at same stop: head-to-head — higher MPH wins
- Tied? Click FLIP again for sudden death
- First past the final stop wins

---

## Swapping in real card art

The card template in game.html uses CSS background colors per state band.
To replace with real card images:

In `game.html`, find the `renderCard()` function and update:
```javascript
// Replace the card-scene div with:
<div class="card-scene" style="background-image:url('/cards/${card.abbr}_${card.tier}_${card.weapon}.png');background-size:cover"></div>
```

Then add your card images to a `/cards/` folder on the server.
Naming format: `MA_Flash_Ghost.png`, `WY_Park_Cruise.png`, etc.

---

## Game state notes

- Games are stored in memory — they reset if the server restarts
- For persistent games, replace the `games` object with a database (Redis or SQLite)
- The server handles up to ~500 concurrent games comfortably on a free tier

---

## Beta feedback

Add a feedback link in index.html pointing to a Google Form or Typeform
to collect tester feedback automatically.
