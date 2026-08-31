/**
 * How long the projector takes to swap one slide for the next, in milliseconds,
 * stored raw under `projectorTransition` so `/show` can read it without JSON.
 *
 * The number is the whole crossfade: the outgoing text fades out over half of
 * it, the incoming text fades in over the other half. `0` disables the
 * transition entirely and the slide cuts, like turning it off in ProPresenter.
 */
export const TRANSITION_KEY = 'projectorTransition';

export const DEFAULT_TRANSITION_MS = 320;
export const MIN_TRANSITION_MS = 0;
export const MAX_TRANSITION_MS = 2000;

export const clampTransition = value =>
  Math.min(MAX_TRANSITION_MS, Math.max(MIN_TRANSITION_MS, Math.round(value / 10) * 10));

export const readTransition = () => {
  const raw = Number(localStorage.getItem(TRANSITION_KEY));

  return Number.isFinite(raw) && localStorage.getItem(TRANSITION_KEY) !== null
    ? clampTransition(raw)
    : DEFAULT_TRANSITION_MS;
};
