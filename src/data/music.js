// Music the operator can play under a service, catalogued the same way the
// projector backgrounds are in `themes.js`: a static list pointing at files in
// `/public`, so adding a song is dropping an mp3 in `public/audio/` and adding
// one line here.
//
// A track is `{ id, title, artist, src }`. Ids must stay unique across the
// whole catalog — they are what the player compares to decide what is playing.
export const MUSIC_CATEGORIES = [
  {
    id: 'ambient',
    label: 'Background ambient',
    hint: 'Long, textless beds for prayer, communion and the minutes before the service starts.',
    tracks: [],
  },
  {
    id: 'forrest-frank',
    label: 'Forrest Frank',
    hint: 'Instrumental and lo-fi worship.',
    tracks: [],
  },
  {
    id: 'worship',
    label: 'Worship instrumental',
    hint: 'Familiar worship songs without vocals, for reading over.',
    tracks: [],
  },
];

/** Every catalogued track, flattened — used to resolve a saved track id. */
export const ALL_TRACKS = MUSIC_CATEGORIES.flatMap(category =>
  category.tracks.map(track => ({ ...track, categoryId: category.id })),
);

export const findTrack = id => ALL_TRACKS.find(track => track.id === id) || null;
