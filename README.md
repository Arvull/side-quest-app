# Side Quest

A cosy quest log. Two kinds of quest:

- **Daily Quests** — the small repeating things (bathroom deep clean, water the plants, pay the bills).
  Set a repeat schedule and they come back around on their own, with a streak for keeping at it.
- **Epic Quests** — big life goals, broken into sub-quests you can actually tick off. A progress ring
  fills as you go, and finishing the last step pays out the full reward.

Everything earns XP, XP earns levels, and levels earn you a slightly grander title — Wanderer at level
one, Legend of the Hollow at ten. Each rank has its own portrait: the same character throughout, just
better equipped as you climb, from a commoner in linen to a crowned figure with a halo. The Hearth tab
shows the whole ladder, with ranks you haven't reached yet greyed out, and a masculine/feminine toggle
that redraws every portrait. It is meant to feel like a quest
log in a game, but warm and quiet rather than loud and neon.

Completing a quest takes a short **press and hold** rather than a tap, so a stray thumb on a scrolling
list can't tick anything off. Hold anywhere on the quest — the whole card is the target, not just the
little circle — and the ring fills as you hold. Move your finger and it turns back into a scroll. If
something does slip through, the toast that follows carries an Undo with a visible countdown.

## Running it

There is no build step and no dependencies — it is plain HTML, CSS and ES modules. It does need to be
served over HTTP though (ES modules and the service worker will not run from `file://`):

```bash
python -m http.server 5173
```

Then open http://localhost:5173.

## Installing it

Side Quest is a PWA, so it installs as a real app on all three platforms:

- **iPhone / iPad** — open it in Safari, tap Share, then "Add to Home Screen".
- **Android** — Chrome offers "Install app", or use the menu → "Add to Home screen".
- **Windows / Mac** — Chrome or Edge shows an install icon in the address bar.

Once installed it runs full screen, offline, with no browser chrome. The **Hearth** tab has an
Install button that triggers the native prompt where the browser supports it.

## Where the data lives

In `localStorage`, on the device, under the key `side-quest/v1`. There is no account and no server.
Hearth → Export writes a JSON backup you can carry to another device; Import reads it back.

Because it is per-device, the same log will not appear on your phone and your PC. Syncing is the
obvious next thing to add, and would mean a small backend.

## How it is put together

| File | What it does |
| --- | --- |
| `index.html` | App shell — top bar, view container, tab bar, sheet/toast roots |
| `css/styles.css` | The whole visual system. Two themes ("Dawn", "Dusk") driven by CSS custom properties |
| `js/store.js` | State, persistence, and every action that mutates the quest log |
| `js/schedule.js` | Date maths and the repeat-rule engine (daily / every N days / weekly / monthly) |
| `js/views.js` | Renders the four tabs as HTML strings |
| `js/sheets.js` | Bottom sheets: quest type picker, both editors, confirmations |
| `js/ui.js` | Icons, escaping, toasts, the sparkle effect |
| `js/avatar.js` | Rank portraits, drawn as stacked SVG parts rather than ten separate pictures |
| `js/app.js` | Routing, delegated event handling, theme, install prompt, import/export |
| `sw.js` | Service worker — cached shell so it opens instantly and works offline |

Views re-render wholesale on every state change, and all interaction goes through delegated
`[data-action]` handlers, so nothing ever needs re-binding.

### Updates

The installed app keeps itself current. It checks for a new version whenever it comes back to the
foreground, and when one is waiting it offers a one-tap "Refresh" toast; otherwise the update applies
silently on the next cold start. Re-adding it to the home screen is never needed for a content update
— only a change to the *icon* needs that, because iOS bakes the icon in at install time.

When you deploy a change, bump `CACHE` in `sw.js`. That is what tells installed apps a new version
exists.

## Ideas for next

- Reminders / notifications when a daily quest falls due
- Sync across devices
- Rewards you set yourself for hitting a level
- Wrapping it with Capacitor for actual App Store and Play Store builds
