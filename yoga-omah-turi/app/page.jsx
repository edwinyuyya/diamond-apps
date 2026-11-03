import fs from 'fs';
import path from 'path';
import Home from './Home';

// Semua foto di public/photos otomatis masuk carousel (urut nama file)
function getPhotos() {
  try {
    return fs.readdirSync(path.join(process.cwd(), 'public', 'photos'))
      .filter((f) => /\.(jpe?g|png|webp|avif)$/i.test(f))
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
      .map((f) => '/photos/' + encodeURIComponent(f));
  } catch { return []; }
}

export default function Page() {
  return <Home photos={getPhotos()} />;
}
