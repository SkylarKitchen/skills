var CONFIG = {
  title: 'Test: arc lamp',
  subtitle: 'An arc lamp hanging its shade over a chair, and over a bookshelf it can’t clear',
  storageKey: 'room-test-arc-lamp',
  accent: 0x1f4fd8, fill: 0xa6c0f6,
  view: 'se', look: 'colour',
  PALETTE: {paint: [['Warm white', 0xf4f1ea]], wood: [['Oak', 0xcfae86]], fabric: [['Linen', 0xe9dfcc]]},
  LOOKS: [{name: 'As built', colors: {}}],
  ROOM: {
    outline: [[0, 0], [160, 0], [160, 140], [0, 140]],
    height: 96, wall: 5, walls: 0xf4f1ea, floor: 0xcfae86, trim: 0xf4f1ea, boards: 5, boardsDir: 'x',
    openings: [{type: 'door', c: [140, 140], width: 32, hinge: 'left', swing: 'in'}],
    fixed: [], verify: []
  },
  ITEMS: {
    lamp:  {name: 'Arc lamp', type: 'floorlamp', w: 14, d: 14, h: 72, arc: 30, shade: 9, color: 0x222222, color2: 0xf4f1ea},
    chair: {name: 'Armchair', type: 'armchair', w: 32, d: 34, h: 32, color: 0xe9dfcc},
    shelf: {name: 'Bookshelf', type: 'bookshelf', w: 30, d: 12, h: 60, color: 0xcfae86}
  },
  LAYOUTS: [
    {name: 'Lamp north of the chair', note: 'The shade hangs 30 in south of its base, over the chair.', place: {lamp: [80, 30, 0], chair: [80, 72, 180]}},
    {name: 'Lamp turned', note: 'The same lamp aimed east (rot 270), so a wrong turn shows up too.', place: {lamp: [40, 70, 270], chair: [84, 70, 90]}},
    {name: 'Shade over a bookshelf', note: 'Planted fault: the shade hangs lower than the 60 in bookshelf under it, so the checks must say so (expect.json).', place: {lamp: [40, 70, 270], shelf: [72, 70, 90]}}
  ],
  PHOTOS: []
};
