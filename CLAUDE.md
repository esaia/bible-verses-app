# CLAUDE.md

## What this is

A React SPA that displays Bible verses in up to **three languages at once (Georgian / English / Russian)** on a projector or big screen during church services.

Two windows are meant to be open at the same time:

- **Operator window** (`/`) — the person running the service picks book / chapter / verse and the translations, then presses **Show**.
- **Projector window** (`/show`) — opened in a second tab/screen, fullscreen, no controls. It renders whatever the operator last pushed.

The two windows are **not** connected by React state. They talk through `localStorage` + the browser `storage` event. `onSave()` writes `showData` to `localStorage`; the `/show` tab listens for `storage` and re-renders. This is the single most important architectural fact about the app.

## Stack

Create React App 5 (`react-scripts`), React 18, JS (no TypeScript), Tailwind 3 + `@material-tailwind/react`, `react-query` v3, `react-router-dom` v6, `react-select`, `framer-motion`, axios, `react-icons`.

```
npm start    # dev server on :3000
npm run build
npm test     # CRA/jest — no tests written yet
```

Prettier config is in `.prettierrc.json` (single quotes, 120 cols, no-paren arrows). Match it.

## Data source

All data comes from one external endpoint: `REACT_APP_BASE_URL` (`https://holybible.ge/service.php`) via `src/lib/axios.js` → `fetchData(params)`. There is no backend of our own, no auth, no database.

Query params the API expects:

| param      | meaning                                  |
| ---------- | ---------------------------------------- |
| `w`        | book number (1-based, Georgian ordering) |
| `t`        | chapter                                  |
| `m`        | verse (always sent empty)                |
| `s`        | search phrase                            |
| `mv`       | translation/version name (string)        |
| `language` | `geo` \| `eng` \| `ru`                   |
| `page`     | always 1                                 |

Response shape used by the app: `{ bibleData: [{ bv, wigni, tavi, muxli }], bibleNames: [...], versions: [...], tavi: [{cc}], muxli: [{cc}] }`.
Georgian field names are used throughout the codebase: **wigni = book, tavi = chapter, muxli = verse, versemde = "up to verse"**. `bv` is the verse HTML (rendered with `dangerouslySetInnerHTML` in `Preview`).

Caveat baked into `BibleSettingProvider.onSave`: the English API uses a **different book ordering** for books 48–68, remapped by the `englishBooks` lookup table. Any change to book handling must keep that remap.

## Routes (`src/App.js`)

| path        | page                 | purpose                                              |
| ----------- | -------------------- | ---------------------------------------------------- |
| `/`         | `pages/Filteres.js`  | operator console — filters, preview, versions, themes |
| `/show`     | `pages/Show.js`      | projector output (fullscreen, background image, big text) |
| `/bible`    | `pages/Bible.js`     | plain reading view, whole chapter                     |
| `/doc`      | `pages/Documentation.js` | usage docs (GeoDoc / EngDoc)                      |
| `/donation` | `pages/Donate.js`    | donation info                                         |
| `/lower3rd` | `pages/Lower3rd.js`  | OBS Browser Source output — transparent lower third   |

## State

Three layers, all global:

1. **`context/InputValuesProvider.js`** — `useReducer` over the current selection (`language`, `version`, `book`, `chapter`, `verse`, `versemde`, `phrase`, `separate`). It **mirrors every selection into the URL query string** (`useSearchParams`), so a verse is shareable/bookmarkable. The reducer also handles cascade-clearing (changing book resets chapter/verse/versemde). Also owns the `react-query` fetch for the preview (`enabled: false` + manual `refetch()` in an effect).
2. **`context/BibleSettingProvider.js`** — dark mode, font, per-language selected translation, and `onSave()` (the "Show" action) which fetches the three languages, slices `verse..versemde`, and writes `showData` to `localStorage`.
3. **`hooks/useData.js`** — not really a hook for state; it's a big static catalog: language list, hardcoded translation lists per language (`versionGeo` / `versionEng` / `versionRus`), hardcoded book-name arrays for all three languages (`bibleNamesGeo/Eng/Rus`), and derived react-select option arrays. ~1000 lines, mostly data.

`hooks/useBibleContext.js` is a thin passthrough for `BibleContext`.

## localStorage keys (the app's real persistence layer)

| key                 | written by                        | read by                        |
| ------------------- | --------------------------------- | ------------------------------ |
| `showData`          | `BibleSettingProvider.onSave`     | `/show`                        |
| `projectorLanguages`| `VersionSelect`, `Versions.clearAll` | `/show` (which langs to display) |
| `requestManagement` | `RequestManagement`               | `onSave` (which langs to *fetch*) |
| `versions`          | `VersionSelect`                   | `BibleSettingProvider`         |
| `themeNumber`       | `SelectTheme`                     | `/show` background             |
| `dynamicImage`      | `SelectTheme`                     | `/show` (custom bg URL)        |
| `localImage`        | `StudioProvider.setLocalBackground` | `/show` (which of the operator's own pictures; the bytes travel by WebRTC) |
| `font`              | `SelectTheme`                     | app + `/show`                  |
| `darkmode`          | `DarkModeSwitcher`                | `App`                          |
| `obsBridge`         | `ObsSection` (via `lib/obsBridge`)| `lib/obsBridge` (enabled/url/password) |
| `lowerThirdPosition`| `StudioProvider`                  | `/lower3rd` (top or bottom)    |
| `lowerThirdVariant` | `StudioProvider`                  | `/lower3rd` verse look         |
| `lyricsVariant`     | `StudioProvider`                  | `/lower3rd` lyric look         |
| `lowerThirdLanguage` | `StudioProvider`                 | the single language shown on the stream |
| `obsHidden`         | `StudioProvider`                  | blanks the overlay, keeps the connection |

**"Request management" vs "projector languages" are two different things** and users confuse them: green checkboxes (`requestManagement`) control which of the 3 API requests are actually sent; blue checkboxes (`projectorLanguages`) control which languages are shown on the projector.

## Projector rendering details (`pages/Show.js`)

- Backgrounds are 20 Tailwind classes `bg-1img`…`bg-20img` declared in `tailwind.config.js` from `/public/images/N.jpeg`, selected by a `switch` on `themeNumber`. They must be static class names — Tailwind cannot see dynamically built strings. `dynamicIMG` sets `style.backgroundImage` from a user-supplied URL instead.
- `resizeText()` is a hand-rolled fit-to-screen: it walks font-size 2px→70px until the text block would exceed `window.innerHeight - 150`. It runs on every render (effect with no dep array).
- Fonts: `font-banner` (BPG Banner Caps, Georgian) and `font-valera`, loaded from `/public/fonts` via `@font-face` in `index.css`.

## Known rough edges (context for improvement work)

- `onSave` has a copy/paste bug: the Russian query key uses `versions.eng` instead of `versions.rus` (`BibleSettingProvider.js`, `keyRus`).
- The three per-language fetch blocks in `onSave` are near-identical and beg to be a loop.
- `useData.js` mixes ~900 lines of static data with derived options; the data belongs in `src/data/`.
- `Show.js` has a 20-case `switch` for backgrounds and a duplicated theme list in `SelectTheme.js`.
- Cross-tab sync relies on the `storage` event, which does **not** fire in the tab that wrote the value — fine here, but it means `/show` must be a separate tab.
- No tests, no error boundary, no loading state on the projector view.
- `node-sass` and `react-awesome-button` are legacy deps; `module.scss` is only button theming.
- Deployed as a static SPA with `public/_redirects` (`/* /index.html 200`) — Netlify-style hosting.

## OBS lower third (`/lower3rd`)

**`localStorage` does not reach OBS.** Its Browser Source is a separate CEF
process with its own storage, so the projector transport cannot be reused. The
slide travels through OBS itself: the console opens an obs-websocket connection
and calls the `obs-browser` vendor's `emit_event`, which fires a `CustomEvent`
into the running Browser Source.

Three things about this are easy to break:

- **The payload is sent as a single JSON string**, not a nested object. OBS
  marshals vendor-request data through `obs_data_t`, which drops the fields
  inside arrays of objects while keeping the array length — so the page receives
  the right number of verses with no text in them. Do not un-stringify it.
- **The style travels with the content**, because the Browser Source cannot read
  any of the projector keys above.
- **An HTTPS console can only reach obs-websocket on loopback.** obs-websocket
  has no TLS, and a `ws://` connection from an HTTPS page is mixed content —
  but loopback is exempt as a potentially trustworthy origin, so the deployed
  console drives OBS on the *same machine* fine in Chromium and Firefox.
  Reaching OBS on another device (a phone as the console, say) needs either an
  `http://` console on the LAN or a `wss://` endpoint in front of
  obs-websocket. Safari refuses `ws://` from HTTPS outright, loopback included.

The stream shows **one** language, chosen from the projector's armed set — only
armed languages are fetched, so the choice is a filter over that set, and a
language that is later disarmed falls back to the first armed one rather than
blanking the stream. The stored preference is kept, so re-arming restores it.

`StudioProvider.pushShow()` is the single point that writes `showData` *and*
pushes to the bridge; the five call sites all go through it. The bridge is inert
when OBS is not connected, so `/show` is unaffected.

Setup, troubleshooting and the `?debug=1` overlay are documented in
[`docs/obs-lower-third.md`](docs/obs-lower-third.md).

## Operator's own backgrounds (WebRTC)

A picture the operator adds in Settings → Projector lives in that browser's
IndexedDB (`studioMedia`, store `files`), like the music library. `localStorage`
and the relay both fail to carry it to a projector on another machine: the
relay is sized for a few kB of verse text, and a blob URL dies with the
document that minted it.

So only the *identity* rides with the slide (`projector.localImage`), and
`/show` fetches the bytes itself over a WebRTC data channel (`lib/peerAssets.js`):

- **The relay is only the switchboard.** Offers, answers and ICE candidates go
  through it as `{ type: 'signal', … }` messages, which the Worker passes
  through and never stores. The picture itself never touches the relay.
- **`/show` initiates**, the console answers. A room with two consoles gets two
  answers; the first wins and the loser's candidates are ignored.
- **A received file is cached** in the `received` store, so a reload — or a
  console that has since been shut — does not blank the screen.
- The console's own projector tab finds the file in the same IndexedDB and
  never negotiates anything.
- STUN only, no TURN. Two machines on one church LAN connect on host
  candidates.

The signal pass-through is a **Worker change**: `/show` gets nothing until
`relay/` is redeployed.

## Conventions

- Functional components, default export at the bottom, Tailwind utility classes inline (dark variants via `dark:`; dark mode is `class`-based, toggled on a wrapper `div` in `App.js`).
- JSX must use React DOM prop names (`htmlFor`, `className`) — a `for=` slipped in once and warned in the console.
- Georgian domain vocabulary (wigni/tavi/muxli) is intentional; keep it when touching API-facing code, don't half-rename it.
