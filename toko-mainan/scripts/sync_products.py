"""
Sinkronisasi produk dari Google Sheet "Toyzone — Data Produk" ke website.

    python3 scripts/sync_products.py --sheet <ID atau link sheet>
    python3 scripts/sync_products.py --csv produk.csv      (file CSV hasil download sheet)

Yang dilakukan:
1. Membaca baris produk (hanya yang "Tampil di Website" = Ya).
2. Membaca isi "Link Folder Foto" (folder Drive yang bisa dibuka siapa saja yang punya link),
   mengunduh fotonya, mengompres ke WebP di public/produk/<slug>/01.webp, 02.webp, ...
   Foto yang tidak berubah tidak diunduh ulang.
3. Menulis lib/products-data.json (dibaca oleh lib/products.js).
Slug (alamat halaman produk) tetap sama selama Kode tidak diubah.
"""
import argparse, csv, html, io, json, os, re, shutil, subprocess, sys
from datetime import datetime, timezone

from PIL import Image, ImageOps

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PUB = os.path.join(ROOT, 'public', 'produk')
DATA = os.path.join(ROOT, 'lib', 'products-data.json')

CATEGORY_STYLE = {
    'blind-box': ('#f27c00', '🎁', 'Figure & gantungan kejutan, siapa tahu dapat hidden edition'),
    'rolife': ('#d81b60', '🏠', 'Rumah miniatur DIY untuk dirakit sendiri'),
    'figure': ('#0a63c9', '🦸', 'Figure karakter untuk koleksi'),
    'plush': ('#ad1457', '🧸', 'Boneka lembut untuk segala usia'),
}
PALETTE = ['#00897b', '#6a1b9a', '#1e88e5', '#e65100', '#2e7d32', '#c62828']

COLS = {
    'kode': 'Kode', 'nama': 'Nama Produk', 'kategori': 'Kategori', 'seri': 'Seri / Karakter',
    'harga': 'Harga (Rp)', 'coret': 'Harga Coret (Rp)', 'stok': 'Stok', 'usia': 'Usia Minimal',
    'label': 'Label', 'folder': 'Link Folder Foto', 'urutan': 'Urutan Foto', 'deskripsi': 'Deskripsi',
    'spek': 'Spesifikasi', 'tampil': 'Tampil di Website',
}


def slugify(s):
    s = re.sub(r'[^a-z0-9]+', '-', s.lower()).strip('-')
    return re.sub(r'-{2,}', '-', s)[:70].strip('-')


def num(v):
    v = re.sub(r'[^\d]', '', str(v or ''))
    return int(v) if v else None


def curl(url, out=None, timeout=60):
    cmd = ['curl', '-sSL', '-m', str(timeout), '-A', 'Mozilla/5.0', url]
    if out:
        cmd[1:1] = ['-o', out]
    r = subprocess.run(cmd, capture_output=True)
    if r.returncode != 0:
        raise RuntimeError(f'Gagal mengambil {url}: {r.stderr.decode()[-200:]}')
    return r.stdout


def read_sheet(arg):
    sid = re.search(r'/d/([\w-]{20,})', arg)
    sid = sid.group(1) if sid else arg
    text = curl(f'https://docs.google.com/spreadsheets/d/{sid}/export?format=csv').decode('utf-8')
    if text.lstrip().startswith('<'):
        raise RuntimeError('Sheet tidak bisa dibaca. Pastikan sheet dibagikan "Siapa saja yang memiliki link: Pelihat".')
    return text


def folder_images(link):
    """Daftar foto (nama, id) langsung di dalam folder Drive publik."""
    fid = re.search(r'folders/([\w-]{20,})', link or '') or re.search(r'id=([\w-]{20,})', link or '')
    if not fid:
        return []
    page = curl(f'https://drive.google.com/drive/folders/{fid.group(1)}').decode('utf-8', 'ignore')
    found, seen = [], set()
    for m in re.finditer(r'data-id="(1[\w-]{20,60})"', page):
        cid = m.group(1)
        if cid in seen:
            continue
        seen.add(cid)
        label = re.search(r'data-tooltip="([^"]+)"', page[m.start(): m.start() + 8000])
        label = html.unescape(label.group(1)) if label else ''
        name = re.sub(r'\s+Image$', '', label)
        if re.search(r'\.(jpe?g|png|webp|heic)$', name, re.I):
            found.append((name, cid))
    return found


def order_images(imgs, urutan):
    if not urutan:
        return sorted(imgs, key=lambda x: x[0].lower())
    wanted = [w.strip().lower() for w in urutan.split(',') if w.strip()]
    key = lambda n: os.path.splitext(n)[0].lower()
    first = [i for w in wanted for i in imgs if key(i[0]) == w or i[0].lower() == w]
    rest = sorted([i for i in imgs if i not in first], key=lambda x: x[0].lower())
    return first + rest


def sync_photos(slug, imgs):
    """Unduh & kompres foto; lewati kalau daftar foto sama dengan sinkronisasi sebelumnya."""
    folder = os.path.join(PUB, slug)
    marker = os.path.join(folder, '.source.json')
    ids = [i[1] for i in imgs]
    if os.path.exists(marker) and json.load(open(marker)) == ids:
        return [f'/produk/{slug}/{n:02d}.webp' for n in range(1, len(ids) + 1)], False
    tmp = folder + '.tmp'
    shutil.rmtree(tmp, ignore_errors=True)
    os.makedirs(tmp)
    for n, (name, fid) in enumerate(imgs, 1):
        raw = os.path.join(tmp, 'raw')
        curl(f'https://drive.usercontent.google.com/download?id={fid}&export=download', raw, 120)
        im = ImageOps.exif_transpose(Image.open(raw)).convert('RGB')
        im.thumbnail((1400, 1400), Image.LANCZOS)
        im.save(os.path.join(tmp, f'{n:02d}.webp'), 'WEBP', quality=82, method=6)
        os.remove(raw)
    json.dump(ids, open(os.path.join(tmp, '.source.json'), 'w'))
    shutil.rmtree(folder, ignore_errors=True)
    os.rename(tmp, folder)
    return [f'/produk/{slug}/{n:02d}.webp' for n in range(1, len(ids) + 1)], True


def specs(s):
    out = {}
    for part in (s or '').split(';'):
        if ':' in part:
            k, v = part.split(':', 1)
            if k.strip() and v.strip():
                out[k.strip()] = v.strip()
    return out


def main():
    ap = argparse.ArgumentParser()
    g = ap.add_mutually_exclusive_group(required=True)
    g.add_argument('--sheet')
    g.add_argument('--csv')
    args = ap.parse_args()
    text = read_sheet(args.sheet) if args.sheet else open(args.csv, encoding='utf-8-sig').read()
    rows = list(csv.DictReader(io.StringIO(text)))
    missing = [c for c in COLS.values() if rows and c not in rows[0]]
    if missing:
        sys.exit(f'Kolom tidak ditemukan di sheet: {", ".join(missing)}')

    old = json.load(open(DATA)) if os.path.exists(DATA) else {'products': [], 'categories': []}
    old_by_id = {p['id']: p for p in old['products']}
    cats, products, report = {}, [], []
    for r in rows:
        g = lambda k: (r.get(COLS[k]) or '').strip()
        if g('tampil').lower() not in ('ya', 'y', 'yes'):
            continue
        kode, nama = g('kode'), g('nama')
        if not kode or not nama:
            report.append(f'LEWATI: baris tanpa Kode/Nama ({kode or nama})')
            continue
        cat_name = g('kategori') or 'Lainnya'
        cslug = slugify(cat_name)
        if cslug not in cats:
            color, emoji, desc = CATEGORY_STYLE.get(cslug, (PALETTE[len(cats) % len(PALETTE)], '🧸', f'Koleksi {cat_name}'))
            cats[cslug] = {'slug': cslug, 'name': cat_name, 'emoji': emoji, 'color': color, 'desc': desc}
        prev = old_by_id.get(kode, {})
        slug = prev.get('slug') or slugify(nama)
        imgs = order_images(folder_images(g('folder')), g('urutan'))
        if imgs:
            images, changed = sync_photos(slug, imgs)
        else:
            images, changed = prev.get('images', []), False
            report.append(f'PERINGATAN {kode}: tidak ada foto di folder, pakai foto lama ({len(images)})')
        harga, coret = num(g('harga')), num(g('coret'))
        stok = num(g('stok'))
        products.append({
            'id': kode, 'slug': slug, 'name': nama, 'category': cslug, 'series': g('seri'),
            'price': coret if (coret and harga and coret > harga) else harga,
            'salePrice': harga if (coret and harga and coret > harga) else None,
            'age': num(g('usia')) or 3, 'stock': 99 if stok is None else stok,
            'badge': g('label') if g('label') in ('Baru', 'Terlaris', 'Eksklusif') else '',
            'emoji': cats[cslug]['emoji'], 'color': cats[cslug]['color'],
            'rating': prev.get('rating', 5.0), 'sold': prev.get('sold', 0),
            'images': images, 'description': g('deskripsi'), 'specs': specs(g('spek')),
        })
        report.append(f'OK {kode} {nama}: {len(images)} foto{" (baru diunduh)" if changed else ""}'
                      f'{", harga belum diisi" if harga is None else ""}')

    data = {'updatedAt': datetime.now(timezone.utc).isoformat(), 'source': 'google-sheet',
            'categories': list(cats.values()), 'products': products}
    json.dump(data, open(DATA, 'w'), ensure_ascii=False, indent=2)
    # hapus folder foto produk yang sudah tidak ada di sheet
    keep = {p['slug'] for p in products}
    for d in os.listdir(PUB) if os.path.isdir(PUB) else []:
        if os.path.isdir(os.path.join(PUB, d)) and d not in keep and not d.startswith('.'):
            shutil.rmtree(os.path.join(PUB, d))
            report.append(f'HAPUS foto lama: {d}')
    print('\n'.join(report))
    print(f'Selesai: {len(products)} produk, {len(cats)} kategori → lib/products-data.json')


if __name__ == '__main__':
    main()
