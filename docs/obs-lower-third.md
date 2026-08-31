# OBS lower third

Puts the live slide on a stream as a broadcast lower third, over a transparent
background, so verses can be keyed over camera during a service.

---

## Why it does not use `localStorage`

The projector (`/show`) reaches the operator console through `localStorage` plus
the `storage` event. That works because both are tabs in the same browser
profile.

**OBS is not.** Its Browser Source is a separate CEF process with its own
storage, so it never sees anything the console writes. The projector transport
cannot be reused, and no amount of same-origin trickery will fix it.

The way across is OBS itself:

```
studio console --ws--> OBS (localhost:4455) --emit_event--> Browser Source
```

obs-websocket ships **inside OBS 28+** (no plugin to install), and its
`obs-browser` vendor exposes an `emit_event` request that fires a JavaScript
`CustomEvent` into every running Browser Source. Nothing is hosted, nothing is
polled, and the source is never reloaded — so the overlay can animate between
slides.

## The one awkward constraint

An HTTPS page may not open a `ws://` connection, and obs-websocket speaks only
plain `ws://` (it has no certificate). So:

| Window | Served from | Why |
| --- | --- | --- |
| Lower third (Browser Source) | the deployed HTTPS site is fine | only *receives* events |
| Studio console | **must be `http://localhost`** | must reach `ws://localhost:4455` |
| `/show` projector | unchanged | same browser as the studio |

During a service, serve the built app locally and use that for the console:

```
npx serve -s build -l 3000     # then open http://localhost:3000/studio
```

The Browser Source can still point at the Netlify URL — only the operator
window needs to be local.

---

## Setup

### 1. OBS — enable the WebSocket server

`Tools → WebSocket Server Settings`

- tick **Enable WebSocket server**
- leave the port at **4455**
- **Show Connect Info** and copy the password

### 2. Studio — connect

Sidebar → **OBS lower third**

- paste the password, flip the toggle
- the dot turns **green** and the panel reads `Slides delivered: N`
- choose **Bottom** or **Top**

### 3. OBS — add the Browser Source

`Sources → + → Browser`

| Setting | Value |
| --- | --- |
| URL | `http://localhost:3000/lower3rd` |
| Width × Height | 1920 × 1080 |
| Shutdown source when not visible | **unchecked** |

Then drag the Browser source **above** the camera in the Sources list. It is
transparent, so it must be on top or it will be hidden behind the video.

> A transparent overlay over an **empty** scene composites to black. That is OBS
> drawing nothing, not a fault. Put a camera or image behind it before judging.

### 4. NDI out (optional)

The page cannot emit NDI — NDI is a native SDK and no web page can speak it.
Instead let OBS re-broadcast: install the **DistroAV** plugin and enable its NDI
output. OBS becomes the NDI sender, lower third included.

---

## Controls

All of these live in the sidebar's **OBS lower third** section and take effect
immediately — changing one re-pushes the current slide, so OBS redraws without
the operator touching the verse.

| Control | What it does |
| --- | --- |
| Connection toggle | Opens/closes the obs-websocket connection. |
| **Show on stream** | Blanks the overlay **without** dropping the connection, so verses can come off the stream while staying on the projector. |
| **Language on stream** | The single language the overlay shows, picked from the projector's armed set — a lower third is read at a glance, so stacking translations in it defeats the point. An unarmed language is disabled and marked `· not armed`. If the chosen language is later disarmed the overlay falls back to the first armed one instead of blanking, and the stored preference is kept so re-arming restores it. |
| **Style · verses** / **Style · lyrics** | Chosen independently, mirroring the projector's own verses/lyrics split: `scrim` gradient fade (default), `solid` slab, `bands` per-line light plates, `bandsdark` the same in black, `card` a filled slab with the reference chipped above it, `split` a slab with the reference in its own ruled column, `plain` text only. Each variant re-points CSS variables on `.lower3rd-bar`; see `index.css`. |
| **Position** | Top or bottom. Independent of style — the gradient direction follows from a `--l3-dir` variable. |

The **bands** looks put the plate on the text rather than the block, with
`box-decoration-break: clone`, so a verse that wraps gets one plate per line
that hugs the words instead of a single full-width slab. The two colourways
share every mechanic and differ only in `--l3-plate` and `--l3-fg`.

The **card** and **split** looks reverse `.lower3rd-block` (`column-reverse` and
`row-reverse` respectively) so the reference lands above or to the left of the
verse, rather than reordering the markup — every other look, and every screen
reader, keeps the reading order verse-then-reference.

The reference renders as two spans — `.lower3rd-ref-book` and
`.lower3rd-ref-num` — so the column looks can size them separately. Run together
they still read "Mark 3:16".

### Line budgets

Text is scaled down to fit a line budget rather than being allowed to grow into
a paragraph that eats the frame:

| Content | Lines |
| --- | --- |
| Bible verse | 4 |
| Song lyrics | 2 |

Scripture is read, whereas lyrics are sung along to and only need prompting,
which is why they differ. `fitText` takes an optional `constrain` callback for
this: the lower third measures each `.lower3rd-text` against its own computed
`line-height`, so the cap holds whatever typeface or size the binary search
lands on. The projector passes no `constrain` and is unaffected.

The studio's floating **Preview** panel has a **Lower third** tab that embeds
this very page in a scaled iframe rather than re-drawing the design. Same origin
means it picks the slide up through the `storage` event, and its `vh`/`vw`
padding resolves against its own 1920x1080 viewport — so the preview cannot
drift from what OBS draws. The chequerboard behind it stands in for the camera.

---

## Troubleshooting

Add `?debug=1` to the Browser Source URL and hit **Refresh**. An opaque panel
appears in the top-left — deliberately visible when the rest of the page is
correctly invisible.

```
lower3rd — page loaded
OBS events received: 5 (last 14:05:59)
showing: geo, eng · visible
text: "საოცრებანი მოიმოქმედა ქამის ქვეყანაში..."
viewport 1920x1080 · bar top 651 h 453 · font 46px · innerW 1690
```

| Symptom | Meaning |
| --- | --- |
| No panel at all | Page is not loading. Is `serve` still running on 3000? Refresh the source. |
| `events received: 0` | Page fine, bridge not delivering. Check the studio toggle is green and a slide is live. |
| `text: "(no verse text in payload)"` | The slide arrived but its verses are empty — see the marshalling note below. |
| `bar h` ≈ 92 with `font 49px` | The bar is pure padding: no text inside. `font` sitting at its computed maximum means `fitText` had nothing to measure. |
| Panel shows correct text, nothing on screen | Almost certainly the scene, not the page. Check source ordering and that something is behind it. |

Remove `?debug=1` when finished.

**Both sides must be refreshed after a code change**: reload the studio page
*and* refresh the Browser Source. Forgetting the studio is the usual cause of
"I rebuilt and nothing changed".

---

## Gotcha: OBS mangles nested payloads

`emit_event` data does **not** travel as plain JSON. OBS marshals it through its
own `obs_data_t` structures, and that round trip does not faithfully carry
**arrays of objects**: the array arrives with its length intact while the fields
inside each element are silently dropped.

This produces a uniquely misleading failure — `showData.geo.length` is still
`1`, so every "is there content?" check passes, but every `verse.bv` is gone and
the bar renders empty.

**The payload is therefore sent as a single JSON string** and parsed on the
other side:

```js
requestData: { event_name: OBS_EVENT, event_data: { json: JSON.stringify(payload) } }
```

A string passes through whole, so nesting depth stops mattering. Do not
"simplify" this back into a nested object.

## Why the payload carries its own style

The Browser Source cannot read this origin's `localStorage`, so none of the
projector keys (`font`, `projectorAlign`, `projectorOrder`, …) are readable from
inside it. Every push therefore carries the style **with** the content. Changing
a font in the studio re-pushes the current slide so OBS redraws immediately.

## Heartbeat

The bridge re-sends the current slide every 3s. A Browser Source that starts,
reloads, or un-hides after the last push would otherwise stay blank until the
operator advanced a verse. The receiver ignores a payload identical to the one
it is already showing, so this costs nothing visually and never restarts a fade.

---

## Files

| File | Role |
| --- | --- |
| `src/lib/obsBridge.js` | connection, auth, reconnect, heartbeat, `emit_event` |
| `src/pages/Lower3rd.js` | the `/lower3rd` Browser Source page and `?debug=1` panel |
| `src/studio/components/ObsSection.js` | sidebar controls and status |
| `src/studio/StudioProvider.js` | `pushShow()` — writes `showData` *and* pushes to OBS |
| `src/index.css` | `.lower3rd-*` styles |
