# Ship It! Sweet Stack

A mouse-first, 60-second cooking game for a shared Microsoft Ignite booth computer.
Original GitHub-inspired styling with Microsoft and VS Code references. An unofficial
event tribute, not affiliated with or endorsed by Microsoft or GitHub.

## Run locally

Requires Node.js 22.12+, Node.js 24, or Node.js 26+.

```powershell
npm install
npm run dev
```

Open the localhost URL printed by Vite. For validation and a production build:

```powershell
npm test
npm run build
npm run preview
```

## Play

1. Read the instructions, optionally enable sound, and click **Let's cook**.
   New players can pick **Try a practice run** first: an untimed, burn-free
   kitchen where a coach walks through selecting, cooking, multitasking, and
   serving. Practice scores are never saved.
2. Select an order ticket, then click its station: waffles use the waffle iron,
   Copilot Lattes use the espresso bar, and pancakes and cookie skillets share the cooktop.
3. Keep all three stations busy. Click a station when **READY** to serve for 100 points.
   Serve within 1 second of READY for a **Perfect!** +25 bonus.
4. Food burns if you wait too long. Click to clear it before starting another dish.
5. At 60 seconds the round ends, including when the page was backgrounded.
   Play again for a fresh run.

Cooking times are 4 seconds for waffles, 2.5 for lattes, 3 for pancakes, and 5 for cookies.
Waffles have a 5-second serving window, lattes 3.5 seconds, and the others 4 seconds.
There are no order-expiration penalties, combos, or topping steps in this version.

**Sound off** is the default. Enable sound for original synthesized upbeat music
and short effects. Music runs only during a round; the sound button mutes both.
All illustrations are local SVG artwork; no external assets or services are required.

## Scores and challenges

Only the best five scores and completed challenge IDs are stored in browser
localStorage under `sweet-stack.progress.v1`. Scores have no player names.
This is **shared browser progress**, not personal accounts or an online leaderboard.
Clearing browser/site data removes it. Storage errors appear in the app and do not
prevent play.

Challenges: serve a dish; serve all four recipe types in one round; finish a round
with at least five dishes and no burns.

## Keep building through chat

The **Build Board** tracks development, while **Challenges** track gameplay.
Ask a coding assistant in this workspace to implement a change and update its
Build Board entry, for example:

> Add sprinkle toppings, test the new interaction, and mark GAME-02 Done.

Even faster: every Planned or In Progress card has a one-click **Copy prompt**
button that copies a ready-to-paste chat request for that item.

- [src/content.ts](src/content.ts): typed recipes, station definitions, challenge
  descriptions, and backlog items with stable IDs and status.
- [src/game.ts](src/game.ts): pure time-based game transitions, practice mode,
  tutorial coach steps, and challenge rules.
- [src/App.tsx](src/App.tsx): kitchen, results, challenges, and read-only Build Board.
- [src/Food.tsx](src/Food.tsx): original recipe illustrations.
- [src/styles.css](src/styles.css): theme, responsive layout, and reduced motion.
- [src/audio.ts](src/audio.ts): synthesized music/effects and their lifecycle.
- [src/storage.ts](src/storage.ts): versioned, validated local progress.

Adding a recipe requires extending the recipe ID type, adding its data and artwork,
and testing its station/timing behavior. Adding a challenge requires updating its
definition and evaluation rule. Migrate saved progress if you remove or rename
challenge IDs. Board statuses are source-controlled content, not visitor-editable
state. The app does not contain an embedded AI assistant or auto-build features.
