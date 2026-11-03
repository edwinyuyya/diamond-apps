import fs from 'fs';
import path from 'path';
import Home from './Home';

const pub = (...p) => path.join(process.cwd(), 'public', ...p);

// Foto: public/photos (carousel) dan public/photos/<menu>/. Video: public/videos + manifest.json
// (satu file video disimpan sekali, boleh dipakai di banyak menu).
function images(sub = '') {
  try {
    return fs.readdirSync(pub('photos', sub), { withFileTypes: true })
      .filter((f) => f.isFile() && /\.(jpe?g|png|webp|avif)$/i.test(f.name))
      .map((f) => f.name)
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
      .map((f) => ({ type: 'image', src: '/photos/' + (sub ? sub + '/' : '') + encodeURIComponent(f) }));
  } catch { return []; }
}

let manifest = {};
try { manifest = JSON.parse(fs.readFileSync(pub('videos', 'manifest.json'), 'utf8')); } catch {}
const videos = (tab) => (manifest[tab] || []).map((h) => ({ type: 'video', src: `/videos/${h}.mp4`, poster: `/videos/${h}.jpg` }));

// Sebar video di antara foto supaya tidak menumpuk di akhir
function mix(imgs, vids) {
  if (!vids.length) return imgs;
  const step = Math.max(1, Math.ceil(imgs.length / (vids.length + 1)));
  const out = []; let v = 0;
  imgs.forEach((im, i) => { out.push(im); if ((i + 1) % step === 0 && v < vids.length) out.push(vids[v++]); });
  return out.concat(vids.slice(v));
}

export default function Page() {
  const tabs = ['venue', 'online', 'classes', 'workshop', 'private', 'corporate', 'testimony', 'record'];
  const media = Object.fromEntries(tabs.map((t) => [t, mix(images(t), videos(t))]));
  return <Home slides={mix(images(), videos('carousel'))} media={media} />;
}
