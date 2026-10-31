"""
Generator banner & promo tile Toyzone dari foto produk.
Jalankan ulang setiap ada foto/produk baru:

    python3 scripts/make_banners.py

Hasil: public/banner/hero-*.webp (desktop 1920x640 & HP 1080x1080)
       public/banner/promo-*.webp (1200x500)
Ubah teks/foto di daftar HERO dan PROMO di bawah.
"""
from PIL import Image, ImageDraw, ImageFilter, ImageFont, ImageOps
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PUB = os.path.join(ROOT, 'public')
FONTS = os.path.join(ROOT, '..', 'toyzone-poster', 'fonts')
OUT = os.path.join(PUB, 'banner')

FT1 = '/produk/fat-tiger-dragon-soaring-tiger-leaping'
FT2 = '/produk/fat-tiger-food-party-plush-pendant'
RL = '/produk/rolife-super-creator-double-joy-bubble-tea'

HERO = [
    dict(name='fat-tiger-dragon', kicker='BLIND BOX BARU', title=['Fat Tiger', 'Dragon & Tiger'],
         sub='8 desain + 1 hidden edition. Berani tebak isinya?', cta='Lihat Sekarang',
         bg=('#0b2d5e', '#1d4f9c'), fg='#ffffff', accent='#ffd400', cta_fg='#e3000b',
         photos=[f'{FT1}/01.webp', f'{FT1}/04.webp', f'{FT1}/03.webp']),
    dict(name='food-party', kicker='GANTUNGAN TAS BLIND BOX', title=['Tiger Food', 'Party'],
         sub='Boneka Fat Tiger mini, 6 desain lucu', cta='Lihat Koleksi',
         bg=('#ff6a13', '#ffa040'), fg='#ffffff', accent='#0b2d5e', cta_fg='#e3000b',
         photos=[f'{FT2}/03.webp', f'{FT2}/01.webp', f'{FT2}/04.webp']),
    dict(name='rolife-bubble-tea', kicker='ROLIFE DIY MINIATUR', title=['Rakit Kedai', 'Bubble Tea Mini'],
         sub='Rolife Super Creator, Double Joy Bubble Tea', cta='Lihat Produk',
         bg=('#3fa9a6', '#7fd6d3'), fg='#ffffff', accent='#d81b60', cta_fg='#d81b60',
         photos=[f'{RL}/01.webp']),
    dict(name='gratis-ongkir', kicker='GRATIS ONGKIR', title=['Belanja Rp1 Juta', 'Gratis Ongkir'],
         sub='Dikirim aman ke seluruh Indonesia', cta='Mulai Belanja',
         bg=('#ffd400', '#ffb300'), fg='#0b2d5e', accent='#e3000b', cta_fg='#e3000b',
         photos=[f'{FT2}/01.webp', f'{RL}/01.webp', f'{FT1}/01.webp']),
]

PROMO = [
    dict(name='fat-tiger-dragon', small='Fat Tiger Blind Box', big=['Dragon Soaring &', 'Tiger Leaping'],
         body='8 desain + 1 hidden edition', bg='#f27c00', photo=f'{FT1}/02.webp'),
    dict(name='food-party', small='Fat Tiger Food Party', big=['Gantungan boneka', 'blind box'],
         body='6 desain lucu untuk tas & kunci', bg='#e65100', photo=f'{FT2}/01.webp', focus=0.08),
    dict(name='rolife', small='Rolife Super Creator', big=['Double Joy', 'Bubble Tea'],
         body='Rakit sendiri kedai mini yang detail', bg='#d81b60', photo=f'{RL}/01.webp'),
    dict(name='segera-hadir', small='Segera Hadir', big=['Doraemon, Sinchan', '& Emma'],
         body='Blind box karakter favorit segera masuk', bg='#0b2d5e', photo=None),
]


def font(name, size):
    return ImageFont.truetype(os.path.join(FONTS, name), size)


def hexrgb(h):
    h = h.lstrip('#')
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def background(w, h, c1, c2, dots=True):
    a, b = hexrgb(c1), hexrgb(c2)
    im = Image.new('RGB', (w, h))
    px = im.load()
    for y in range(h):
        for x in range(0, w):
            t = min(1, (x / w) * 0.7 + (y / h) * 0.3)
            px[x, y] = tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))
    im = im.convert('RGBA')
    if dots:
        layer = Image.new('RGBA', (w, h), (0, 0, 0, 0))
        d = ImageDraw.Draw(layer)
        step = 46
        for y in range(step // 2, h, step):
            for x in range(step // 2, w, step):
                d.ellipse([x - 6, y - 6, x + 6, y + 6], fill=(255, 255, 255, 26))
        im = Image.alpha_composite(im, layer)
    return im


def photo_card(path, size, border=14, radius=30, angle=0):
    src = ImageOps.exif_transpose(Image.open(PUB + path)).convert('RGB')
    w, h = size
    src = ImageOps.fit(src, (w - border * 2, h - border * 2), Image.LANCZOS)
    card = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    mask = Image.new('L', (w, h), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, w - 1, h - 1], radius, fill=255)
    white = Image.new('RGBA', (w, h), (255, 255, 255, 255))
    card.paste(white, (0, 0), mask)
    inner = Image.new('L', src.size, 0)
    ImageDraw.Draw(inner).rounded_rectangle([0, 0, src.width - 1, src.height - 1], radius - border // 2, fill=255)
    card.paste(src, (border, border), inner)
    pad = 60
    full = Image.new('RGBA', (w + pad * 2, h + pad * 2), (0, 0, 0, 0))
    shadow = Image.new('RGBA', full.size, (0, 0, 0, 0))
    ImageDraw.Draw(shadow).rounded_rectangle([pad + 6, pad + 22, pad + w + 6, pad + h + 22], radius, fill=(0, 0, 0, 95))
    shadow = shadow.filter(ImageFilter.GaussianBlur(20))
    full = Image.alpha_composite(shadow, full)
    full.paste(card, (pad, pad), card)
    return full.rotate(angle, resample=Image.BICUBIC, expand=True)


def paste_center(base, layer, cx, cy):
    base.alpha_composite(layer, (int(cx - layer.width / 2), int(cy - layer.height / 2)))


def text(d, xy, s, f, fill, anchor='la', shadow=True):
    if shadow:
        d.text((xy[0] + 3, xy[1] + 4), s, font=f, fill=(0, 0, 0, 60), anchor=anchor)
    d.text(xy, s, font=f, fill=fill, anchor=anchor)


def pill(d, xy, label, f, bg, fg, anchor='l'):
    tw = d.textlength(label, font=f)
    h = f.size + 36
    w = tw + 64
    x, y = xy
    if anchor == 'c':
        x -= w / 2
    d.rounded_rectangle([x + 3, y + 5, x + w + 3, y + h + 5], h / 2, fill=(0, 0, 0, 50))
    d.rounded_rectangle([x, y, x + w, y + h], h / 2, fill=bg)
    d.text((x + w / 2, y + h / 2 + 1), label, font=f, fill=fg, anchor='mm')


def cluster(base, photos, cx, cy, big):
    """1-3 foto produk sebagai kartu miring yang bertumpuk."""
    n = len(photos)
    if n == 1:
        paste_center(base, photo_card(photos[0], (int(big * 1.3), int(big * 0.97)), angle=-3), cx, cy)
        return
    small = int(big * 0.62)
    if n >= 3:
        paste_center(base, photo_card(photos[2], (small, small), angle=9), cx + big * 0.55, cy - big * 0.22)
    paste_center(base, photo_card(photos[1], (small, small), angle=-10), cx - big * 0.58, cy + big * 0.2)
    paste_center(base, photo_card(photos[0], (big, big), angle=2), cx, cy)


def hero_desktop(c):
    W, H = 1920, 640
    im = background(W, H, *c['bg'])
    d = ImageDraw.Draw(im)
    cluster(im, c['photos'], 1430, 330, 430)
    x = 130
    text(d, (x, 120), c['kicker'], font('Outfit-800.ttf', 30), c['accent'], shadow=False)
    ft = font('Fredoka-700.ttf', 104)
    for i, line in enumerate(c['title']):
        text(d, (x, 165 + i * 112), line, ft, c['fg'])
    text(d, (x, 410), c['sub'], font('Outfit-500.ttf', 36), c['fg'], shadow=False)
    pill(d, (x, 480), c['cta'] + '  ›', font('Outfit-800.ttf', 32), '#ffffff', c['cta_fg'])
    return im


def hero_mobile(c):
    W = H = 1080
    im = background(W, H, *c['bg'])
    d = ImageDraw.Draw(im)
    cluster(im, c['photos'], W / 2, 735, 420)
    text(d, (W / 2, 70), c['kicker'], font('Outfit-800.ttf', 34), c['accent'], anchor='ma', shadow=False)
    ft = font('Fredoka-700.ttf', 92)
    for i, line in enumerate(c['title']):
        text(d, (W / 2, 120 + i * 100), line, ft, c['fg'], anchor='ma')
    text(d, (W / 2, 330), c['sub'], font('Outfit-500.ttf', 36), c['fg'], anchor='ma', shadow=False)
    return im


def mystery_boxes(im, cx, cy):
    d = ImageDraw.Draw(im)
    f = font('Fredoka-700.ttf', 110)
    for i, (dx, dy, col, ang) in enumerate([(-150, 30, '#f27c00', -8), (0, -20, '#ffd400', 4), (150, 35, '#d81b60', 10)]):
        box = Image.new('RGBA', (190, 190), (0, 0, 0, 0))
        bd = ImageDraw.Draw(box)
        bd.rounded_rectangle([0, 0, 189, 189], 28, fill=col, outline='#ffffff', width=8)
        bd.text((95, 100), '?', font=f, fill='#ffffff', anchor='mm')
        paste_center(im, box.rotate(ang, resample=Image.BICUBIC, expand=True), cx + dx, cy + dy)


def promo(c):
    W, H = 1200, 500
    im = Image.new('RGBA', (W, H), hexrgb(c['bg']) + (255,))
    art_w = 640
    art = background(art_w, H, c['bg'], '#000000' if c['photo'] is None else c['bg'])
    if c['photo']:
        photo = ImageOps.fit(ImageOps.exif_transpose(Image.open(PUB + c['photo'])).convert('RGBA'), (art_w, H), Image.LANCZOS, centering=(0.5, c.get('focus', 0.45)))
        art = photo
    else:
        art = background(art_w, H, '#16438a', '#0b2d5e')
        mystery_boxes(art, art_w / 2, H / 2)
    im.alpha_composite(art, (0, 0))
    panel = Image.new('RGBA', (W - art_w, H), (12, 12, 16, 255))
    im.alpha_composite(panel, (art_w, 0))
    d = ImageDraw.Draw(im)
    d.line([(art_w, 0), (art_w, H)], fill=c['bg'], width=10)
    x = art_w + 44
    text(d, (x, 78), c['small'], font('Fredoka-700.ttf', 34), '#ffd400', shadow=False)
    fb = font('Outfit-800.ttf', 44)
    for i, line in enumerate(c['big']):
        text(d, (x, 134 + i * 54), line, fb, '#ffffff', shadow=False)
    text(d, (x, 262), c['body'], font('Outfit-500.ttf', 27), '#d8d8de', shadow=False)
    pill(d, (x, 330), 'Belanja  ›', font('Outfit-800.ttf', 28), '#ffffff', '#111111')
    return im


def save(im, name, q=82):
    os.makedirs(OUT, exist_ok=True)
    path = os.path.join(OUT, name)
    im.convert('RGB').save(path, 'WEBP', quality=q, method=6)
    print(path.replace(PUB, ''), os.path.getsize(path) // 1024, 'KB')


if __name__ == '__main__':
    for c in HERO:
        save(hero_desktop(c), f"hero-{c['name']}.webp")
        save(hero_mobile(c), f"hero-{c['name']}-m.webp")
    for c in PROMO:
        save(promo(c), f"promo-{c['name']}.webp")
