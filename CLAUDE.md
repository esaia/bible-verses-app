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
| `font`              | `SelectTheme`                     | app + `/show`                  |
| `darkmode`          | `DarkModeSwitcher`                | `App`                          |

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

## Conventions

- Functional components, default export at the bottom, Tailwind utility classes inline (dark variants via `dark:`; dark mode is `class`-based, toggled on a wrapper `div` in `App.js`).
- JSX must use React DOM prop names (`htmlFor`, `className`) — a `for=` slipped in once and warned in the console.
- Georgian domain vocabulary (wigni/tavi/muxli) is intentional; keep it when touching API-facing code, don't half-rename it.
