# Henry’s Trains

A complete 3D revamp of Henry the Train: a small toy railway Henry can control, built with TypeScript, Three.js and Vite. The previous game remains at https://seansommer.github.io/henrythetrain/.

## Play

- Choose Henry, Poppy, Sunny or Clover. Each has a different color and whistle.
- **Go train!** starts a continuous ride. Tap again to stop. The speed slider works during the ride.
- **Lights** switches the crossing lights on or off; they keep alternating until switched off.
- **Gates** lowers or raises both gates. Another tap reverses them smoothly, even mid-animation.
- **Crossing show** plays a repeatable sequence: warning lights, lower gates, one train lap, raise gates, lights off. A main control takes over immediately.
- **Choo!** sounds the selected train’s whistle. Tap the station or duck for a small response.
- The view button switches between the crossing and the whole railway.

Parent controls include volume, optional original music, steady lights, gentle movement, repeating shows and a pictures-only interface. Settings stay on the device. The game pauses while parent controls are open or the app is hidden. There are no accounts, timers, scores, advertisements, tracking or purchases.

## Game Center and artwork

Henry’s Trains is listed in [Game Center](https://seansommer.github.io/gamecenter/?play=henrystrains) as a guest game. The original Henry the Train remains a separate game in the collection.

The named train artwork supplies the Game Center tile, favicon, Apple touch icon, Android icons, header and loading image. The original 1200×630 sharing card is `public/og.png`; Open Graph and X metadata use the public game URL. Prompts and asset mapping are in `docs/henry-named-artwork.md`.

## Hosting

The entire game runs in the browser. No Firebase rules, Cloudflare Worker, database, API key or paid 3D service is required. Graphics need a browser with WebGL 2 support; there is a link to the original game if 3D cannot start.

The GitHub Actions workflow builds and publishes `dist/` to GitHub Pages. Relative asset paths support both `seansommer.github.io/henrystrains/` and a root domain.

1. Open **Settings → Pages** and choose **GitHub Actions** as the source.
2. For free GitHub Pages, the repository must be public. Private repositories require a GitHub plan that supports Pages.
3. Run **Actions → Publish Henry’s Trains → Run workflow** if it has not already published automatically.

On iPhone, open the game in Safari and use **Share → Add to Home Screen**. On supported Android browsers, use **Install app / Add to Home screen** from the browser menu.

## Develop

Use Node 22.13 or newer. Run `npm ci`, `npm run dev`, `npm test`, and `npm run build`. `node scripts/verify-build.mjs` checks the deployment files after building. The separate Sites publication uses the same static `dist/` output.

The world, trains, wheels, gates and animals are actual 3D meshes in one coordinate system. The track uses an arc-length table so the locomotive and carriages follow the same path at consistent speed. Original generated icon provenance is in `docs/artwork-provenance.md`. Source dependencies retain their respective licenses.

Made for Henry, with love. Created by Sean.
