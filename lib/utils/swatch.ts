export function getSwatchStyle(colorHex?: string | null): React.CSSProperties {
  if (!colorHex) return {};

  const colors = colorHex.split(',').map(c => c.trim()).filter(Boolean);
  
  if (colors.length === 0) return {};

  if (colors.length === 1) {
    return { backgroundColor: colors[0] };
  }

  if (colors.length === 2) {
    return {
      background: `linear-gradient(135deg, ${colors[0]} 50%, ${colors[1]} 50%)`
    };
  }

  if (colors.length === 3) {
    return {
      background: `conic-gradient(${colors[0]} 0 33.33%, ${colors[1]} 33.33% 66.66%, ${colors[2]} 66.66% 100%)`
    };
  }

  // 4 or more colors (split evenly)
  const step = 100 / colors.length;
  const gradientParts = colors.map((color, index) => {
    const start = index * step;
    const end = (index + 1) * step;
    return `${color} ${start}% ${end}%`;
  });

  return {
    background: `conic-gradient(${gradientParts.join(', ')})`
  };
}

const colors: Record<string, string> = {
  // Basics
  black: '#000000',
  white: '#ffffff',
  red: '#ff0000',
  blue: '#0000ff',
  green: '#008000',
  yellow: '#ffff00',
  orange: '#ffa500',
  purple: '#800080',
  pink: '#ffc0cb',
  brown: '#a52a2a',
  grey: '#808080',
  gray: '#808080',
  silver: '#c0c0c0',
  gold: '#ffd700',

  // Expanded Colors & Shades
  ruby: '#e0115f',
  emerald: '#50c878',
  sapphire: '#0f52ba',
  amethyst: '#9966cc',
  topaz: '#ffc87c',
  pearl: '#eae0c8',
  onyx: '#353839',
  crystal: '#a7d8de',
  diamond: '#b9f2ff',
  jade: '#00a86b',
  amber: '#ffbf00',
  garnet: '#733635',
  opal: '#a8c3bc',
  turquoise: '#40e0d0',
  coral: '#ff7f50',
  
  // Specific Tones
  pastel: '#fdfd96',
  multi: '#ff0000,#00ff00,#0000ff',
  rainbow: '#ff0000,#ff7f00,#ffff00,#00ff00,#0000ff,#4b0082,#8b00ff',
  multicolor: '#ff0000,#00ff00,#0000ff',
  champagne: '#f7e7ce',
  crimson: '#dc143c',
  maroon: '#800000',
  burgundy: '#800020',
  wine: '#722f37',
  fuchsia: '#ff00ff',
  rose: '#ff007f',
  blush: '#de5d83',
  peach: '#ffe5b4',
  apricot: '#fbceb1',
  salmon: '#fa8072',
  rust: '#b7410e',
  copper: '#b87333',
  bronze: '#cd7f32',
  brass: '#b5a642',
  mustard: '#ffdb58',
  chartreuse: '#7fff00',
  lime: '#00ff00',
  mint: '#98ff98',
  olive: '#808000',
  teal: '#008080',
  cyan: '#00ffff',
  aqua: '#00ffff',
  navy: '#000080',
  indigo: '#4b0082',
  violet: '#ee82ee',
  plum: '#dda0dd',
  lilac: '#c8a2c8',
  lavender: '#e6e6fa',
  mauve: '#e0b0ff',
  magenta: '#ff00ff',
  taupe: '#483c32',
  tan: '#d2b48c',
  beige: '#f5f5dc',
  cream: '#fffdd0',
  ivory: '#fffff0',
  khaki: '#c3b091',
  charcoal: '#36454f',
  slate: '#708090',
  aquamarine: '#7fffd4',
  azure: '#f0ffff'
};

export const STANDARD_COLOR_MAP = colors;

export function extractColorsFromName(name: string): string | undefined {
  if (!name) return undefined;
  const words = name.toLowerCase().split(/[\s-]+/);
  const foundColors: string[] = [];
  for (const word of words) {
    if (STANDARD_COLOR_MAP[word]) foundColors.push(STANDARD_COLOR_MAP[word]);
  }
  if (foundColors.length > 0) {
    const allHexes = foundColors.join(',').split(',').filter(Boolean);
    const uniqueHexes = Array.from(new Set(allHexes));
    return uniqueHexes.join(',');
  }
  return undefined;
}
