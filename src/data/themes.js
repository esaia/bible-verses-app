// Projector backgrounds, in the order they are offered.
//
// `className` is written out in full because Tailwind's scanner only sees
// literal class names — building `bg-${id}img` at runtime would silently
// drop the background from the stylesheet.
export const THEMES = [
  { id: '21', className: 'bg-21img', src: '/images/the-crown.webp', label: 'The Crown' },
  { id: '22', className: 'bg-22img', src: '/images/kingdom-crown.webp', label: 'Kingdom Come — Crown' },
  { id: '23', className: 'bg-23img', src: '/images/kingdom-cross.webp', label: 'Kingdom Come — Cross' },
  { id: '24', className: 'bg-24img', src: '/images/kingdom-dove.webp', label: 'Kingdom Come — Dove' },
  { id: '25', className: 'bg-25img', src: '/images/kingdom-hands.webp', label: 'Kingdom Come — Hands' },
  { id: '26', className: 'bg-26img', src: '/images/kingdom-communion.webp', label: 'Kingdom Come — Communion' },
  { id: '27', className: 'bg-27img', src: '/images/jesus-saves.webp', label: 'Jesus Saves' },
  { id: '28', className: 'bg-28img', src: '/images/kingdom-come-b.webp', label: 'Kingdom Come II' },
  { id: '29', className: 'bg-29img', src: '/images/kingdom-come-c.webp', label: 'Kingdom Come III' },
  { id: '30', className: 'bg-30img', src: '/images/fragrance-a.webp', label: 'Fragrance I' },
  { id: '31', className: 'bg-31img', src: '/images/fragrance-b.webp', label: 'Fragrance II' },
  { id: '32', className: 'bg-32img', src: '/images/isaiah-52-a.webp', label: 'Isaiah 52-53 I' },
  { id: '33', className: 'bg-33img', src: '/images/isaiah-52-b.webp', label: 'Isaiah 52-53 II' },
  { id: '1', className: 'bg-1img', src: '/images/1.jpeg', label: 'Background 1' },
  { id: '2', className: 'bg-2img', src: '/images/2.jpeg', label: 'Background 2' },
  { id: '3', className: 'bg-3img', src: '/images/3.jpeg', label: 'Background 3' },
  { id: '4', className: 'bg-4img', src: '/images/4.jpeg', label: 'Background 4' },
  { id: '5', className: 'bg-5img', src: '/images/5.jpeg', label: 'Background 5' },
  { id: '6', className: 'bg-6img', src: '/images/6.jpeg', label: 'Background 6' },
  { id: '7', className: 'bg-7img', src: '/images/7.jpeg', label: 'Background 7' },
  { id: '8', className: 'bg-8img', src: '/images/8.jpeg', label: 'Background 8' },
  { id: '9', className: 'bg-9img', src: '/images/9.jpeg', label: 'Background 9' },
  { id: '10', className: 'bg-10img', src: '/images/10.jpeg', label: 'Background 10' },
  { id: '11', className: 'bg-11img', src: '/images/11.jpeg', label: 'Background 11' },
  { id: '12', className: 'bg-12img', src: '/images/12.jpeg', label: 'Background 12' },
  { id: '13', className: 'bg-13img', src: '/images/13.jpeg', label: 'Background 13' },
  { id: '14', className: 'bg-14img', src: '/images/14.jpeg', label: 'Background 14' },
  { id: '15', className: 'bg-15img', src: '/images/15.jpeg', label: 'Background 15' },
  { id: '16', className: 'bg-16img', src: '/images/16.jpeg', label: 'Background 16' },
  { id: '17', className: 'bg-17img', src: '/images/17.jpeg', label: 'Background 17' },
  { id: '18', className: 'bg-18img', src: '/images/18.jpeg', label: 'Background 18' },
  { id: '19', className: 'bg-19img', src: '/images/19.jpeg', label: 'Background 19' },
  { id: '20', className: 'bg-20img', src: '/images/20.jpeg', label: 'Background 20' },
];

export const themeClassName = id => THEMES.find(theme => theme.id === id)?.className || THEMES[0].className;

/** The operator's own picture, held on their machine rather than in this list. */
export const LOCAL_THEME = 'localIMG';
