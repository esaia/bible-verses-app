/**
 * Grow `element`'s font size until the text would exceed `available` pixels
 * tall or spill out of its own box sideways, then keep the last size that
 * fitted. Used by the projector and by the preview panel so both scale text the
 * same way.
 *
 * The width test matters for song lyrics: one long Georgian word has no break
 * opportunity, so past a certain size it runs off the screen edges while the
 * block is still short enough to pass the height test.
 */
export const fitText = (element, available, { min = 8, max = 64 } = {}) => {
  if (!element || available <= 0) {
    return;
  }

  // Binary search rather than stepping one pixel at a time: text height grows
  // monotonically with font size, and every probe forces a layout, so this
  // turns ~50 reflows into ~6. That matters when dozens of verse cards refit
  // at once while the size slider moves.
  const fits = () => element.offsetHeight <= available && element.scrollWidth <= element.clientWidth;

  element.style.fontSize = `${max}px`;

  if (fits()) {
    return;
  }

  let low = min;
  let high = max;
  let best = min;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    element.style.fontSize = `${mid}px`;

    if (fits()) {
      best = mid;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  element.style.fontSize = `${best}px`;
};

/**
 * Run `refit` again once web fonts have swapped in.
 *
 * On a cold load the first measurement happens with fallback-font metrics,
 * which are narrower than BPG Banner Caps — the fit comes out too large and
 * the text is clipped until something else (a resize, a new verse) triggers a
 * remeasure. Returns a cleanup that cancels the pending callback.
 */
export const refitOnFontLoad = refit => {
  if (!document.fonts?.ready) {
    return () => {};
  }

  let cancelled = false;

  document.fonts.ready.then(() => {
    if (!cancelled) {
      refit();
    }
  });

  return () => {
    cancelled = true;
  };
};
