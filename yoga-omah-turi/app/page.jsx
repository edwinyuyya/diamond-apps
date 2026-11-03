import fs from 'fs';
import path from 'path';
import Home from './Home';

// Foto dibaca dari public/photos (carousel atas) dan subfolder per menu: venue, online, record
function getPhotos(sub = '') {
  try {
    return fs.readdirSync(path.join(process.cwd(), 'public', 'photos', sub), { withFileTypes: true })
      .filter((f) => f.isFile() && /\.(jpe?g|png|webp|avif)$/i.test(f.name))
      .map((f) => f.name)
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
      .map((f) => '/photos/' + (sub ? sub + '/' : '') + encodeURIComponent(f));
  } catch { return []; }
}

export default function Page() {
  const byTab = { venue: getPhotos('venue'), online: getPhotos('online'), record: getPhotos('record') };
  return <Home photos={getPhotos()} photosByTab={byTab} />;
}
