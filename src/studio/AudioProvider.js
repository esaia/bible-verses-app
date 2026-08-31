import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

const AudioPlayerContext = createContext(null);

const CUSTOM_KEY = 'studioCustomTracks';
const VOLUME_KEY = 'studioAudioVolume';

/** Stopping ramps the volume down instead of cutting, so a bed never snaps off. */
const FADE_MS = 700;
const FADE_STEP_MS = 40;

const read = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? fallback : JSON.parse(raw);
  } catch (e) {
    return fallback;
  }
};

const write = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    // Non-critical.
  }
};

/**
 * One `<audio>` element for the whole Studio page, driven by the Audio tab and
 * by the transport bar that stays visible while the operator is back on the
 * Bible tab. Playback lives here rather than on `/show` so every control is
 * instant and the browser's autoplay policy is satisfied by the click that
 * started the track.
 */
const AudioProvider = ({ children }) => {
  const elementRef = useRef(null);
  const fadeRef = useRef(null);

  const [current, setCurrent] = useState(null);
  const [playing, setPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [loop, setLoop] = useState(() => read('studioAudioLoop', true));
  const [volume, setVolumeState] = useState(() => {
    const stored = read(VOLUME_KEY, 0.8);
    return typeof stored === 'number' ? Math.min(1, Math.max(0, stored)) : 0.8;
  });
  const [customTracks, setCustomTracks] = useState(() => read(CUSTOM_KEY, []));
  const [error, setError] = useState(null);

  useEffect(() => write(CUSTOM_KEY, customTracks), [customTracks]);
  useEffect(() => write(VOLUME_KEY, volume), [volume]);
  useEffect(() => write('studioAudioLoop', loop), [loop]);

  const cancelFade = useCallback(() => {
    if (fadeRef.current) {
      clearInterval(fadeRef.current);
      fadeRef.current = null;
    }
  }, []);

  /** Ramp to silence, pause, then restore the operator's volume for next time. */
  const fadeOut = useCallback(
    onDone => {
      const element = elementRef.current;

      if (!element) {
        return;
      }

      cancelFade();

      const steps = Math.max(1, Math.round(FADE_MS / FADE_STEP_MS));
      const from = element.volume;
      let step = 0;

      fadeRef.current = setInterval(() => {
        step += 1;
        element.volume = Math.max(0, from * (1 - step / steps));

        if (step >= steps) {
          cancelFade();
          element.pause();
          element.volume = volume;
          setPlaying(false);

          if (onDone) {
            onDone();
          }
        }
      }, FADE_STEP_MS);
    },
    [cancelFade, volume],
  );

  const start = useCallback(
    track => {
      const element = elementRef.current;

      if (!element || !track) {
        return;
      }

      cancelFade();
      setError(null);

      if (current?.id !== track.id) {
        element.src = track.src;
        element.currentTime = 0;
        setPosition(0);
        setDuration(0);
        setCurrent(track);
      }

      element.volume = volume;
      element.play().then(
        () => setPlaying(true),
        () => setError(`Could not play “${track.title}”. Check that the file exists.`),
      );
    },
    [cancelFade, current, volume],
  );

  /** Clicking the track that is already playing fades it out, like the verse cards. */
  const playTrack = useCallback(
    track => {
      if (current?.id === track.id && playing) {
        fadeOut();
        return;
      }

      start(track);
    },
    [current, fadeOut, playing, start],
  );

  const togglePlay = useCallback(() => {
    if (!current) {
      return;
    }

    if (playing) {
      fadeOut();
    } else {
      start(current);
    }
  }, [current, fadeOut, playing, start]);

  /** Fade out and forget the track, clearing the transport bar. */
  const stop = useCallback(() => {
    const clear = () => {
      setCurrent(null);
      setPosition(0);
      setDuration(0);
    };

    if (playing) {
      fadeOut(clear);
    } else {
      elementRef.current?.pause();
      clear();
    }
  }, [fadeOut, playing]);

  const seek = useCallback(seconds => {
    if (elementRef.current) {
      elementRef.current.currentTime = seconds;
      setPosition(seconds);
    }
  }, []);

  const setVolume = useCallback(value => {
    const next = Math.min(1, Math.max(0, value));

    setVolumeState(next);

    // Not while fading, or the ramp would fight the slider.
    if (elementRef.current && !fadeRef.current) {
      elementRef.current.volume = next;
    }
  }, []);

  const addCustomTrack = useCallback((src, title) => {
    const url = src.trim();

    if (!url) {
      return null;
    }

    const track = {
      id: `custom-${Date.now()}`,
      title: title?.trim() || decodeURIComponent(url.split('/').pop().split('?')[0]) || 'Custom track',
      artist: 'Added by URL',
      src: url,
      custom: true,
    };

    setCustomTracks(tracks => [...tracks, track]);

    return track;
  }, []);

  const removeCustomTrack = useCallback(
    id => {
      setCustomTracks(tracks => tracks.filter(track => track.id !== id));

      if (current?.id === id) {
        stop();
      }
    },
    [current, stop],
  );

  useEffect(() => () => cancelFade(), [cancelFade]);

  const value = useMemo(
    () => ({
      current,
      playing,
      position,
      duration,
      volume,
      loop,
      error,
      customTracks,
      playTrack,
      togglePlay,
      stop,
      seek,
      setVolume,
      setLoop,
      addCustomTrack,
      removeCustomTrack,
    }),
    [
      current,
      playing,
      position,
      duration,
      volume,
      loop,
      error,
      customTracks,
      playTrack,
      togglePlay,
      stop,
      seek,
      setVolume,
      addCustomTrack,
      removeCustomTrack,
    ],
  );

  return (
    <AudioPlayerContext.Provider value={value}>
      {children}

      <audio
        ref={elementRef}
        loop={loop}
        preload="none"
        onTimeUpdate={e => setPosition(e.target.currentTime)}
        onDurationChange={e => setDuration(Number.isFinite(e.target.duration) ? e.target.duration : 0)}
        onEnded={() => setPlaying(false)}
        onError={() => {
          if (current) {
            setPlaying(false);
            setError(`Could not load “${current.title}”. Check that the file exists.`);
          }
        }}
      />
    </AudioPlayerContext.Provider>
  );
};

export const useAudio = () => useContext(AudioPlayerContext);

export default AudioProvider;
