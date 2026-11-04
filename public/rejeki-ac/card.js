/*
 * Desain kartu nama Rejeki Utama AC — 1 SISI, TEGAK 55 x 90 mm, gaya putih + biru dingin.
 * Digambar sebagai SVG 550 x 900 (1 unit = 0,1 mm) dengan bleed 3 mm (30 unit) untuk percetakan.
 *
 * Isi: "Ingin tahu apa yang sebenarnya terjadi di dalam AC Anda?", gambar AC, kode di dalam
 * gambar HP ("arahkan kamera ke sini"), nomor WhatsApp, dan ajakan "Buka kamera HP Anda".
 * Sisi ini adalah TARGET AR: kalau desainnya diubah, buat ulang targets/kartu-ac.mind
 * lewat compile.html (area kode dikosongkan, jadi ganti link tidak perlu compile ulang).
 */
(function () {
  // Palet putih + biru dingin (diambil dari biru logo #0AA0D2):
  // DARK = teks biru dingin gelap, BLUE = aksen biru logo, DEEP = biru pita/kolom.
  var DARK = "#0B4A6B", BLUE_M = "#0A86BD", DEEP = "#0A86BD", ICE = "#19C6F0", ICE2 = "#8FE6FF",
      BLUE = "#0AA0D2", BLUE2 = "#7FD3F2", FROST = "#E6F6FC", INK = "#0E3E5A", WHITE = "#FFFFFF";
  var BLEED = 30;
  // Unit AC digambar di koordinat aslinya 560 x 150, lalu diperkecil.
  // AC = posisi AC "rutin dirawat" di sisi belakang — overlay AR menempel tepat di sini.
  // Kartu 1 sisi, tegak 55 x 90 mm (550 x 900 unit). AC = posisi gambar AC di kartu;
  // overlay AR (presentasi.js) menempel tepat di sini.
  var CARD = { w: 550, h: 900 };
  var AC = { x: 135, y: 392, s: 0.5, w: 560, h: 150 };

  function esc(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function sparkle(x, y, r, fill) {
    return '<path transform="translate(' + x + "," + y + ')" d="M0 ' + -r + " Q" + r * 0.18 + " " + -r * 0.18 + " " + r + " 0 Q" + r * 0.18 + " " + r * 0.18 + " 0 " + r + " Q" + -r * 0.18 + " " + r * 0.18 + " " + -r + " 0 Q" + -r * 0.18 + " " + -r * 0.18 + " 0 " + -r + 'Z" fill="' + fill + '"/>';
  }

  // Logo resmi Rejeki Utama AC: emblem asli (PNG di logo-data.js, dimuat sebelum card.js).
  // Warna merek diambil dari file logo asli: biru #0DAEF1, bintang kuning #FEDE04.
  var BRAND = "#0DAEF1", STAR = "#FEDE04";
  var logoSeq = 0; // dipakai untuk id unik di front()
  function logo(x, y, s) {
    return '<image x="' + x + '" y="' + y + '" width="' + s + '" height="' + s + '" href="' + (window.RU_LOGO || "") + '"/>';
  }

  function star(cx, cy, r, fill) {
    var p = [];
    for (var k = 0; k < 10; k++) {
      var t = -Math.PI / 2 + (Math.PI / 5) * k, rr = k % 2 ? r * 0.45 : r;
      p.push((cx + Math.cos(t) * rr).toFixed(1) + "," + (cy + Math.sin(t) * rr).toFixed(1));
    }
    return '<polygon points="' + p.join(" ") + '" fill="' + fill + '"/>';
  }


  // Unit AC split indoor, koordinat asli 560 x 150 (titik 0,0)
  function acUnit(opt) {
    opt = opt || {};
    var w = 560, h = 150, vents = "", d = opt.dirty;
    for (var i = 0; i < 9; i++) vents += '<rect x="' + (40 + i * 54) + '" y="122" width="40" height="7" rx="3.5" fill="' + (d ? "#6d6252" : "#AFC3D8") + '"/>';
    var stains = "";
    if (d) [[60, 30, 26], [180, 90, 18], [300, 40, 30], [420, 100, 22], [500, 60, 16], [120, 110, 14], [380, 20, 12]].forEach(function (p) {
      stains += '<ellipse cx="' + p[0] + '" cy="' + p[1] + '" rx="' + p[2] * 1.6 + '" ry="' + p[2] + '" fill="#7a6a50" opacity=".35"/>';
    });
    return '<g class="ac-body">' +
      (opt.noShadow ? "" : '<rect x="10" y="16" width="' + w + '" height="' + h + '" rx="30" fill="#000" opacity=".22"/>') +
      '<rect x="0" y="0" width="' + w + '" height="' + h + '" rx="30" fill="' + (d ? "#CFC6B3" : WHITE) + '" stroke="' + (d ? "#9b907b" : "#C9D5E2") + '" stroke-width="3"/>' +
      '<path d="M30 0h500a30 30 0 0 1 30 30v42H0V30A30 30 0 0 1 30 0z" fill="' + (d ? "#DDD4C0" : "#F0F5FA") + '"/>' +
      '<rect x="22" y="104" width="516" height="36" rx="12" fill="' + (d ? "#8f846d" : "#DCE8F4") + '"/>' + vents + stains +
      '<text x="34" y="52" font-family="Montserrat" font-weight="800" font-size="24" letter-spacing="4" fill="' + (d ? "#6d6252" : BLUE_M) + '">RU·AC</text>' +
      '<rect x="392" y="22" width="108" height="46" rx="10" fill="' + (d ? "#3b352c" : DARK) + '"/>' +
      '<text class="ac-temp" x="446" y="55" text-anchor="middle" font-family="Montserrat" font-weight="800" font-size="26" fill="' + (d ? "#FF8E6B" : ICE2) + '">' + (d ? "31°C" : "18°C") + "</text>" +
      '<circle class="ac-led" cx="526" cy="45" r="9" fill="' + (d ? "#d9534f" : ICE) + '"/>' +
      "</g>";
  }
  function acAt(g, opt) {
    return '<g transform="translate(' + g.x + "," + g.y + ") scale(" + g.s + ')">' + acUnit(opt) + "</g>";
  }


  // Ikon garis kecil (kotak 24 x 24)
  var LINE_ICONS = {
    tools: "M14 4a5 5 0 0 0 5 7l-9 9-3-3 9-9a5 5 0 0 0 7-5l-3 3-3-1-1-3zM4 4l6 6M3 7l4-4",
    gear: "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1",
    box: "M3 8h18v12H3zM8 8V5h8v3M3 13h18",
    hand: "M8 21v-8M8 13 6 9a2 2 0 0 1 3-2l2 3V4a2 2 0 0 1 4 0v6l4 1a2 2 0 0 1 1 3l-2 7z",
    drop: "M12 3s7 7.5 7 12a7 7 0 0 1-14 0c0-4.5 7-12 7-12zM9 15a3 3 0 0 0 3 3",
    bolt: "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zM13 6l-5 7h4l-1 5 5-7h-4z",
    clock: "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zM12 6v6l4 3",
    pro: "M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM4 21a8 7 0 0 1 16 0M15 15l2 2 4-4",
    wind: "M2 8h12a3 3 0 1 0-3-3M2 12h17a3 3 0 1 1-3 3M2 16h9",
    snow: "M12 2v20M3.3 7l17.4 10M3.3 17 20.7 7M9 4l3 2 3-2M9 20l3-2 3 2",
    shield: "M12 2l8 3v6c0 5-3.5 9-8 11-4.5-2-8-6-8-11V5z",
    smile: "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zM8 14q4 4 8 0M9 9h.01M15 9h.01",
    frown: "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zM8 16q4-4 8 0M9 9h.01M15 9h.01",
    warn: "M12 3 2 20h20zM12 10v4M12 17h.01",
    tag: "M3 12V3h9l9 9-9 9zM7.5 7.5h.01",
  };
  function lineIcon(name, x, y, size, color, sw) {
    return '<g transform="translate(' + x + "," + y + ") scale(" + size / 24 + ')"><path d="' + LINE_ICONS[name] + '" fill="none" stroke="' + color + '" stroke-width="' + (sw || 2) + '" stroke-linecap="round" stroke-linejoin="round"/></g>';
  }

  // ---------------- DEPAN: tegak (55 x 90 mm), meniru layar pembuka AR ----------------
  // Judul utama berupa pertanyaan yang memancing rasa ingin tahu. Sengaja TIDAK memakai
  // kata "scan"/"QR" (banyak orang curiga datanya disedot): kodenya ada di dalam gambar
  // layar HP dan ditulis "arahkan kamera ke sini" — kamera HP modern mengenalinya otomatis.
  // Koordinat 550 x 900, area aman 30 unit dari tepi potong.
  function fitSize(text, max, width, em) {
    // perkiraan lebar huruf kapital Montserrat tebal ≈ em × ukuran per karakter
    return Math.min(max, +(width / (String(text).length * em)).toFixed(1));
  }
  function front(cfg, qrSvgInner, opts) {
    opts = opts || {};
    var u = "_" + (logoSeq++); // id unik: beberapa kartu bisa tampil di satu halaman
    var b = BLEED, W = 550, H = 900, cx = W / 2, k;
    var vb = opts.bleed ? (-b + " " + -b + " " + (W + 2 * b) + " " + (H + 2 * b)) : "0 0 " + W + " " + H;
    var stars = "";
    for (k = 0; k < 5; k++) stars += star(410 + k * 20, 127, 9, STAR);

    // gambar AC yang "hidup" saat disorot kamera
    var acArt = acAt(AC, {}) +
      sparkle(AC.x - 8, AC.y + 4, 11, BLUE) + sparkle(AC.x + AC.w * AC.s + 10, AC.y + 50, 8, BLUE);

    // HP dengan kode di layarnya
    var px = 180, py = 490, pw = 190, ph = 240, qs = 138, qx = cx - qs / 2, qy = 534;
    var phone =
      '<rect x="' + px + '" y="' + py + '" width="' + pw + '" height="' + ph + '" rx="30" fill="' + WHITE + '" stroke="' + DARK + '" stroke-width="6.5"/>' +
      '<rect x="' + (cx - 20) + '" y="' + (py + 12) + '" width="40" height="6" rx="3" fill="' + DARK + '"/>' +
      '<text x="' + cx + '" y="' + (qy - 14) + '" text-anchor="middle" font-family="Montserrat" font-weight="800" font-size="10.5" letter-spacing="1" fill="' + BLUE + '">ARAHKAN KAMERA KE SINI</text>' +
      '<rect x="' + (qx - 7) + '" y="' + (qy - 7) + '" width="' + (qs + 14) + '" height="' + (qs + 14) + '" rx="9" fill="none" stroke="' + BLUE + '" stroke-width="3" stroke-dasharray="10 6"/>' +
      (opts.noQr ? "" : '<g transform="translate(' + qx + "," + qy + ") scale(" + (qs / 112) + ')">' + qrSvgInner + "</g>") +
      '<text x="' + cx + '" y="' + (qy + qs + 30) + '" text-anchor="middle" font-family="Poppins" font-weight="600" font-size="10.5" fill="' + INK + '">lalu ketuk tautan yang muncul</text>';

    var waGlyph = '<path d="M16 3a13 13 0 0 0-11.2 19.6L3 29l6.6-1.7A13 13 0 1 0 16 3z" fill="none" stroke="#fff" stroke-width="2.4" stroke-linejoin="round"/><path d="M12 10.5c.3-.6.6-.6.9-.6h.5c.2 0 .4 0 .6.5l.9 2.1c.1.2.1.4 0 .6-.6 1.1-1.2 1-.9 1.5a7.6 7.6 0 0 0 3.8 3.3c.3.1.4 0 .6-.2s.6-.8.8-1 .4-.2.7-.1 1.6.8 1.9.9.4.2.5.3a2.4 2.4 0 0 1-.2 1.3 2.9 2.9 0 0 1-1.8 1.3c-.9.2-1.7.1-3.4-.7a12.6 12.6 0 0 1-4.8-4.3 5.5 5.5 0 0 1-1.1-2.9 3.2 3.2 0 0 1 1-2.4z" fill="#fff"/>';
    var camGlyph = '<path d="M3 8.5A1.5 1.5 0 0 1 4.5 7h2.8l1.6-2.2h6.2L16.7 7h2.8A1.5 1.5 0 0 1 21 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 17.5z" fill="none" stroke="#fff" stroke-width="2.2" stroke-linejoin="round"/><circle cx="12" cy="12.8" r="3.6" fill="none" stroke="#fff" stroke-width="2.2"/>';

    // "Powered by [Nexora] +62..." di dasar kartu
    var mk = cfg.pembuat || {}, poweredBy = "";
    if (mk.nama) {
      var lh = 13, lw = window.NX_MARK ? lh * 487 / 88 : 0, numW = String(mk.telepon || "").length * 11 * 0.62;
      var px0 = cx - (60 + 7 + lw + 9 + numW) / 2;
      poweredBy = '<text x="' + px0.toFixed(1) + '" y="864" font-family="Poppins" font-weight="500" font-size="11" fill="' + INK + '" fill-opacity=".75">Powered by</text>' +
        (window.NX_MARK ? '<image x="' + (px0 + 67).toFixed(1) + '" y="852.5" width="' + lw.toFixed(1) + '" height="' + lh + '" href="' + window.NX_MARK + '"/>'
                        : '<text x="' + (px0 + 67).toFixed(1) + '" y="864" font-family="Montserrat" font-weight="800" font-size="11" fill="' + DARK + '">' + esc(mk.nama) + "</text>") +
        '<text x="' + (px0 + 67 + lw + 9).toFixed(1) + '" y="864" font-family="Montserrat" font-weight="700" font-size="11" fill="' + INK + '">' + esc(mk.telepon || "") + "</text>";
    }

    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="' + vb + '" font-family="Poppins">' +
      '<defs><radialGradient id="fbg' + u + '" cx=".75" cy="0" r="1.1"><stop offset="0" stop-color="#D8F1FC"/><stop offset=".45" stop-color="#F4FBFE"/><stop offset="1" stop-color="#FFFFFF"/></radialGradient>' +
      '<linearGradient id="fbtn' + u + '" x1="0" x2="1"><stop offset="0" stop-color="#0A86BD"/><stop offset=".5" stop-color="#19B5E8"/><stop offset="1" stop-color="#0A86BD"/></linearGradient></defs>' +
      '<rect x="' + -b + '" y="' + -b + '" width="' + (W + 2 * b) + '" height="' + (H + 2 * b) + '" fill="url(#fbg' + u + ')"/>' +
      // merek
      logo(40, 40, 112) +
      '<text x="164" y="80" font-family="Montserrat" font-weight="900" font-size="29" fill="' + BRAND + '">REJEKI UTAMA AC</text>' +
      '<text x="165" y="104" font-family="Poppins" font-weight="600" font-size="14.5" fill="' + BRAND + '">' + esc(cfg.subjudul) + "</text>" +
      '<text transform="translate(165,134) skewX(-12)" font-family="Montserrat" font-weight="900" font-size="18" fill="' + BRAND + '">SERVICE EXCELLENT</text>' + stars +
      '<rect x="' + (cx - 30) + '" y="176" width="60" height="4" rx="2" fill="' + BLUE + '" opacity=".6"/>' +
      // judul utama: pertanyaan pemancing rasa ingin tahu
      '<text x="' + cx + '" y="236" text-anchor="middle" font-family="Montserrat" font-weight="900" font-size="33" fill="' + DARK + '">Ingin tahu apa yang</text>' +
      '<text x="' + cx + '" y="276" text-anchor="middle" font-family="Montserrat" font-weight="900" font-size="33" fill="' + DARK + '">sebenarnya terjadi</text>' +
      '<text x="' + cx + '" y="316" text-anchor="middle" font-family="Montserrat" font-weight="900" font-size="33" fill="' + BLUE + '">di dalam AC Anda?</text>' +
      // ajakan langsung di bawah judul
      '<rect x="40" y="332" width="470" height="44" rx="15" fill="url(#fbtn' + u + ')"/>' +
      '<g transform="translate(152,341) scale(1.05)">' + camGlyph + "</g>" +
      '<text x="186" y="361" font-family="Montserrat" font-weight="800" font-size="18" fill="#fff">Buka kamera HP Anda</text>' +
      acArt + phone +
      // penenang: tanpa aplikasi
      '<text x="' + cx + '" y="752" text-anchor="middle" font-family="Poppins" font-weight="600" font-size="14" fill="' + BLUE + '">Tanpa aplikasi \u2022 tanpa daftar \u2022 gratis</text>' +
      // kotak WhatsApp
      '<rect x="40" y="764" width="470" height="80" rx="22" fill="' + WHITE + '" stroke="#CDEBF7" stroke-width="2"/>' +
      '<rect x="60" y="778" width="52" height="52" rx="15" fill="#25D366"/>' +
      '<g transform="translate(68.5,786.5) scale(1.09)">' + waGlyph + "</g>" +
      '<text x="130" y="796" font-family="Montserrat" font-weight="800" font-size="13" letter-spacing="1.8" fill="' + BLUE + '">WHATSAPP KAMI</text>' +
      '<text x="129" y="830" font-family="Montserrat" font-weight="800" font-size="' + fitSize(cfg.telepon, 30, 350, 0.66) + '" fill="' + DARK + '">' + esc(cfg.telepon) + "</text>" +
      // "Powered by" pembuat kartu
      poweredBy +
      "</svg>";
  }

  // QR code -> isi <path>, ukuran size x size
  function qrInner(url, size) {
    size = size || 112;
    var qr = qrcode(0, "M");
    qr.addData(url);
    qr.make();
    var n = qr.getModuleCount(), cell = size / n, d = "";
    for (var y = 0; y < n; y++) for (var x = 0; x < n; x++) if (qr.isDark(y, x)) d += "M" + (x * cell).toFixed(2) + " " + (y * cell).toFixed(2) + "h" + cell.toFixed(2) + "v" + cell.toFixed(2) + "h-" + cell.toFixed(2) + "z";
    return '<path d="' + d + '" fill="' + DARK + '"/>';
  }

  function arUrl(cfg) {
    if (cfg.urlAR) return cfg.urlAR;
    var here = location.href.split("#")[0].split("?")[0];
    return here.replace(/[^/]*$/, "") + "ar.html";
  }

  window.RUCard = { front: front, qrInner: qrInner, arUrl: arUrl, logo: logo, star: star, BRAND: BRAND, STAR: STAR, sparkle: sparkle,
    acUnit: acUnit, lineIcon: lineIcon, AC: AC, CARD: CARD, BLEED: BLEED };
})();
