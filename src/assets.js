import pacifico from '../assets/fonts/pacifico.woff2';
import bebas from '../assets/fonts/bebas.woff2';
import alfaslab from '../assets/fonts/alfaslab.woff2';

const defs = [
  ['Pacifico', pacifico, '400'],
  ['Bebas Neue', bebas, '400'],
  ['Alfa Slab One', alfaslab, '400'],
];

let loaded = false;
export async function loadFonts() {
  if (loaded) return;
  loaded = true;
  const jobs = defs.map(async ([family, url, weight]) => {
    try {
      const face = new FontFace(family, `url(${url}) format('woff2')`, { weight, style: 'normal' });
      await face.load();
      document.fonts.add(face);
    } catch (e) {
      console.warn('font failed', family, e);
    }
  });
  await Promise.all(jobs);
  try { await document.fonts.ready; } catch (e) { /* noop */ }
  document.documentElement.style.setProperty('--font-ready', '1');
}
