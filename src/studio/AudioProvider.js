import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { deleteLocalFile, isAudioFile, loadLocalFiles, saveLocalFile, titleFromName } from '../lib/localMedia';

const AudioPlayerContext = createContext(null);

const CUSTOM_KEY = 'studioCustomTracks';
const PLAYLIST_KEY = 'studioAudioPlaylist';
const CATEGORIES_KEY = 'studioAudioCategories';
const ASSIGNMENTS_KEY = 'studioAudioAssignments';
const VOLUME_KEY = 'studioAudioVolume';

/**
 * Starting and stopping ramp the volume instead of cutting, so a bed never
 * snaps on or off under a spoken word. How long that ramp takes is the
 * operator's call — a bed under communion wants a long one, a stab of music
 * between items wants none at all.
 */
const DEFAULT_FADE_MS = 700;
const FADE_STEP_MS = 40;
const FADE_KEY = 'studioAudioFade';
const DURATIONS_KEY = 'studioAudioDurations';

/** How long to wait for a file to admit its length before giving up. */
const PROBE_TIMEOUT_MS = 8000;

/** Reads a track's length without playing it. */
const probeDuration = src =>
  new Promise(resolve => {
    const element = new Audio();
    let settled = false;

    const done = value => {
      if (settled) {
        return;
      }

      settled = true;
      element.src = '';
      resolve(Number.isFinite(value) && value > 0 ? value : 0);
    };

    element.preload = 'metadata';
    element.onloadedmetadata = () => done(element.duration);
    element.onerror = () => done(0);
    setTimeout(() => done(0), PROBE_TIMEOUT_MS);
    element.src = src;
  });

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

  // What this service is going to play, in order. Whole track objects rather
  // than ids: a track added by URL lives nowhere else, so an id would dangle.
  const [playlist, setPlaylist] = useState(() => read(PLAYLIST_KEY, []));

  // Files dragged in from the operator's own machine. The blob URLs behind
  // them are per-session, so they are held apart from the track and resolved
  // at the moment of playing — a playlist saved last week still points at a
  // file this week, even though the URL it was given then is long dead.
  const [localTracks, setLocalTracks] = useState([]);
  const localUrls = useRef(new Map());

  // The operator's own filing, in the shape a presentation app uses: named
  // groups they invent — "Communion", "Before the service" — rather than the
  // fixed catalogue headings, which mean nothing to any particular church.
  //
  // Which track sits in which group is held apart from the tracks themselves,
  // so filing a song touches one small object instead of rewriting a file
  // record in IndexedDB.
  const [fadeMs, setFadeMsState] = useState(() => {
    const stored = read(FADE_KEY, DEFAULT_FADE_MS);

    return typeof stored === 'number' && stored >= 0 ? stored : DEFAULT_FADE_MS;
  });

  // Track lengths, cached because reading them means decoding each file's
  // header — cheap once, wasteful on every load of the console.
  const [durations, setDurations] = useState(() => read(DURATIONS_KEY, {}));

  // Files already asked this session. A probe that fails is not written to the
  // cache — caching a zero would mean the track never got its length again —
  // so this is what stops a failure being retried in a loop.
  const probed = useRef(new Set());

  const [categories, setCategories] = useState(() => read(CATEGORIES_KEY, []));
  const [assignments, setAssignments] = useState(() => read(ASSIGNMENTS_KEY, {}));
  const [error, setError] = useState(null);

  useEffect(() => write(CUSTOM_KEY, customTracks), [customTracks]);
  useEffect(() => write(PLAYLIST_KEY, playlist), [playlist]);
  useEffect(() => write(FADE_KEY, fadeMs), [fadeMs]);
  useEffect(() => write(DURATIONS_KEY, durations), [durations]);
  useEffect(() => write(CATEGORIES_KEY, categories), [categories]);
  useEffect(() => write(ASSIGNMENTS_KEY, assignments), [assignments]);
  useEffect(() => write(VOLUME_KEY, volume), [volume]);
  useEffect(() => write('studioAudioLoop', loop), [loop]);

  useEffect(() => {
    let cancelled = false;
    const urls = localUrls.current;

    loadLocalFiles()
      .then(records => {
        if (cancelled) {
          return;
        }

        setLocalTracks(
          (records || []).map(record => {
            urls.set(record.id, URL.createObjectURL(record.file));

            return {
              id: record.id,
              title: titleFromName(record.name),
              artist: 'On this computer',
              size: record.size,
              local: true,
            };
          }),
        );
      })
      .catch(() => {
        // Private mode, or storage disabled. Dropping a file will simply fail.
      });

    return () => {
      cancelled = true;
      urls.forEach(url => URL.revokeObjectURL(url));
      urls.clear();
    };
  }, []);

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

      if (fadeMs === 0) {
        element.pause();
        element.volume = volume;
        setPlaying(false);

        if (onDone) {
          onDone();
        }

        return;
      }

      const steps = Math.max(1, Math.round(fadeMs / FADE_STEP_MS));
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
    [cancelFade, volume, fadeMs],
  );

  const start = useCallback(
    track => {
      const element = elementRef.current;

      if (!element || !track) {
        return;
      }

      cancelFade();
      setError(null);

      const src = track.local ? localUrls.current.get(track.id) : track.src;

      if (!src) {
        setError(`“${track.title}” is no longer on this computer. Drag the file in again.`);
        return;
      }

      if (current?.id !== track.id) {
        element.src = src;
        element.currentTime = 0;
        setPosition(0);
        setDuration(0);
        setCurrent(track);
      }

      element.volume = fadeMs === 0 ? volume : 0;
      element.play().then(
        () => {
          setPlaying(true);

          if (fadeMs > 0) {
            const steps = Math.max(1, Math.round(fadeMs / FADE_STEP_MS));
            let step = 0;

            fadeRef.current = setInterval(() => {
              step += 1;
              element.volume = Math.min(volume, volume * (step / steps));

              if (step >= steps) {
                cancelFade();
              }
            }, FADE_STEP_MS);
          }
        },
        failure => {
          // A browser refusing to start audio without a gesture is not a
          // broken file, and telling the operator to go and check the file is
          // a wild goose chase.
          setError(
            failure?.name === 'NotAllowedError'
              ? `Click play again to start “${track.title}” — the browser blocked it from starting on its own.`
              : `Could not play “${track.title}”. ${track.local ? 'Try dragging the file in again.' : 'Check that the file exists.'}`,
          );
        },
      );
    },
    [cancelFade, current, volume, fadeMs],
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

  /**
   * Take dropped files. Anything that is not audio is ignored rather than
   * rejected loudly — dragging a folder's worth of mixed files in and getting
   * the music out of it is the useful behaviour.
   */
  const addLocalFiles = useCallback(async files => {
    const audio = [...files].filter(isAudioFile);

    if (audio.length === 0) {
      return [];
    }

    const added = [];

    for (const file of audio) {
      // Sequential on purpose: a dozen files at once should not open a dozen
      // IndexedDB transactions racing each other.
      // eslint-disable-next-line no-await-in-loop
      const record = await saveLocalFile(file);

      localUrls.current.set(record.id, URL.createObjectURL(record.file));

      added.push({
        id: record.id,
        title: titleFromName(record.name),
        artist: 'On this computer',
        size: record.size,
        local: true,
      });
    }

    setLocalTracks(current => [...current, ...added]);

    return added;
  }, []);

  const removeLocalTrack = useCallback(
    id => {
      deleteLocalFile(id).catch(() => {});

      const url = localUrls.current.get(id);

      if (url) {
        URL.revokeObjectURL(url);
        localUrls.current.delete(id);
      }

      setLocalTracks(tracks => tracks.filter(track => track.id !== id));
      setPlaylist(tracks => tracks.filter(track => track.id !== id));

      if (current?.id === id) {
        stop();
      }
    },
    [current, stop],
  );

  const setFadeMs = useCallback(value => setFadeMsState(Math.max(0, Math.min(5000, Math.round(value)))), []);

  const addCategory = useCallback(name => {
    const label = name.trim();

    if (!label) {
      return null;
    }

    const category = { id: `cat-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, name: label };

    setCategories(current => [...current, category]);

    return category;
  }, []);

  const renameCategory = useCallback((id, name) => {
    const label = name.trim();

    if (!label) {
      return;
    }

    setCategories(current => current.map(category => (category.id === id ? { ...category, name: label } : category)));
  }, []);

  /** Removing a group keeps its music: the tracks simply become unfiled. */
  const removeCategory = useCallback(id => {
    setCategories(current => current.filter(category => category.id !== id));
    setAssignments(current => {
      const next = { ...current };

      Object.keys(next).forEach(trackId => {
        if (next[trackId] === id) {
          delete next[trackId];
        }
      });

      return next;
    });
  }, []);

  const setTrackCategory = useCallback((trackId, categoryId) => {
    setAssignments(current => {
      const next = { ...current };

      if (categoryId) {
        next[trackId] = categoryId;
      } else {
        delete next[trackId];
      }

      return next;
    });
  }, []);

  /** Adding the same track twice is a mistake, not an intention. */
  const addToPlaylist = useCallback(track => {
    setPlaylist(current => (current.some(item => item.id === track.id) ? current : [...current, track]));
  }, []);

  const removeFromPlaylist = useCallback(id => {
    setPlaylist(current => current.filter(track => track.id !== id));
  }, []);

  const movePlaylistItem = useCallback((id, direction) => {
    setPlaylist(current => {
      const index = current.findIndex(track => track.id === id);
      const target = index + direction;

      if (index === -1 || target < 0 || target >= current.length) {
        return current;
      }

      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];

      return next;
    });
  }, []);

  const clearPlaylist = useCallback(() => setPlaylist([]), []);

  /**
   * Fill in any lengths we do not know yet, one file at a time so a freshly
   * dropped folder does not have the browser decode a dozen headers at once.
   */
  useEffect(() => {
    let cancelled = false;

    const missing = [...localTracks, ...customTracks].filter(
      track => durations[track.id] === undefined && !probed.current.has(track.id),
    );

    if (missing.length === 0) {
      return undefined;
    }

    (async () => {
      for (const track of missing) {
        const src = track.local ? localUrls.current.get(track.id) : track.src;

        if (!src) {
          continue;
        }

        probed.current.add(track.id);

        // eslint-disable-next-line no-await-in-loop
        const seconds = await probeDuration(src);

        if (cancelled) {
          return;
        }

        if (seconds > 0) {
          setDurations(current => ({ ...current, [track.id]: seconds }));
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [localTracks, customTracks, durations]);

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
      playlist,
      localTracks,
      addLocalFiles,
      removeLocalTrack,
      fadeMs,
      setFadeMs,
      durations,
      categories,
      assignments,
      addCategory,
      renameCategory,
      removeCategory,
      setTrackCategory,
      playTrack,
      togglePlay,
      stop,
      seek,
      setVolume,
      setLoop,
      addCustomTrack,
      removeCustomTrack,
      addToPlaylist,
      removeFromPlaylist,
      movePlaylistItem,
      clearPlaylist,
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
      playlist,
      localTracks,
      addLocalFiles,
      removeLocalTrack,
      fadeMs,
      setFadeMs,
      durations,
      categories,
      assignments,
      addCategory,
      renameCategory,
      removeCategory,
      setTrackCategory,
      playTrack,
      togglePlay,
      stop,
      seek,
      setVolume,
      addCustomTrack,
      removeCustomTrack,
      addToPlaylist,
      removeFromPlaylist,
      movePlaylistItem,
      clearPlaylist,
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
