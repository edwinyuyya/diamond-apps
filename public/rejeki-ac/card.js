/*
 * Desain kartu nama Rejeki Utama AC (ukuran standar 90 x 55 mm), gaya putih + biru dingin.
 * Kedua sisi digambar sebagai SVG 900 x 550 (1 unit = 0,1 mm) dengan
 * bleed 3 mm (30 unit) di tiap sisi untuk percetakan.
 *
 *  - DEPAN    : layout "Minimal" — logo, tagline, nama, WhatsApp, pita layanan biru.
 *  - BELAKANG : layout "QR & AR dominan" — AC rutin dirawat VS tidak dirawat + QR.
 *               Sisi ini adalah TARGET AR: kalau desainnya diubah, buat ulang
 *               targets/kartu-ac.mind lewat compile.html.
 */
(function () {
  // Palet putih + biru dingin (diambil dari biru logo #0AA0D2):
  // DARK = teks biru dingin gelap, BLUE = aksen biru logo, DEEP = biru pita/kolom.
  var DARK = "#0B4A6B", BLUE_M = "#0A86BD", DEEP = "#0A86BD", ICE = "#19C6F0", ICE2 = "#8FE6FF",
      BLUE = "#0AA0D2", BLUE2 = "#7FD3F2", FROST = "#E6F6FC", INK = "#0E3E5A", WHITE = "#FFFFFF";
  var BLEED = 30;
  // Unit AC digambar di koordinat aslinya 560 x 150, lalu diperkecil.
  // AC = posisi AC "rutin dirawat" di sisi belakang — overlay AR menempel tepat di sini.
  var AC = { x: 48, y: 86, s: 0.42, w: 560, h: 150 };
  var AC_DIRTY = { x: 355, y: 86, s: 0.42 };

  function esc(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function snowflake(cx, cy, r, stroke, w) {
    var out = "";
    for (var i = 0; i < 6; i++) {
      var a = (Math.PI / 3) * i;
      out += '<line x1="' + cx + '" y1="' + cy + '" x2="' + (cx + Math.cos(a) * r).toFixed(1) + '" y2="' + (cy + Math.sin(a) * r).toFixed(1) + '"/>';
      [0.55, 0.8].forEach(function (t, k) {
        var bx = cx + Math.cos(a) * r * t, by = cy + Math.sin(a) * r * t, bl = r * (k ? 0.18 : 0.26);
        [-1, 1].forEach(function (s) {
          var ba = a + s * Math.PI / 4;
          out += '<line x1="' + bx.toFixed(1) + '" y1="' + by.toFixed(1) + '" x2="' + (bx + Math.cos(ba) * bl).toFixed(1) + '" y2="' + (by + Math.sin(ba) * bl).toFixed(1) + '"/>';
        });
      });
    }
    return '<g stroke="' + stroke + '" stroke-width="' + w + '" stroke-linecap="round" fill="none">' + out + "</g>";
  }

  function sparkle(x, y, r, fill) {
    return '<path transform="translate(' + x + "," + y + ')" d="M0 ' + -r + " Q" + r * 0.18 + " " + -r * 0.18 + " " + r + " 0 Q" + r * 0.18 + " " + r * 0.18 + " 0 " + r + " Q" + -r * 0.18 + " " + r * 0.18 + " " + -r + " 0 Q" + -r * 0.18 + " " + -r * 0.18 + " 0 " + -r + 'Z" fill="' + fill + '"/>';
  }

  // Logo resmi Rejeki Utama AC (digambar ulang sebagai vektor, kotak 100 x 100):
  // lingkaran biru, kepingan salju 8 cabang, dua tangan menjaga mur heksagon.
  var BRAND = "#0AA0D2";
  var logoSeq = 0;
  function logo(x, y, s) {
    var arms = "", i;
    for (i = 0; i < 8; i++) {
      var a = (Math.PI / 4) * i, ca = Math.cos(a), sa = Math.sin(a);
      arms += '<line x1="50" y1="50" x2="' + (50 + ca * 38).toFixed(1) + '" y2="' + (50 + sa * 38).toFixed(1) + '"/>';
      [[19, 9.5], [29.5, 7.5]].forEach(function (c) {
        var bx = 50 + ca * c[0], by = 50 + sa * c[0];
        [-1, 1].forEach(function (k) {
          var ba = a + k * 0.72;
          arms += '<line x1="' + bx.toFixed(1) + '" y1="' + by.toFixed(1) + '" x2="' + (bx + Math.cos(ba) * c[1]).toFixed(1) + '" y2="' + (by + Math.sin(ba) * c[1]).toFixed(1) + '"/>';
        });
      });
    }
    function hex(r) {
      var p = [];
      for (var k = 0; k < 6; k++) { var t = (Math.PI / 3) * k; p.push((50 + Math.cos(t) * r).toFixed(1) + "," + (50 + Math.sin(t) * r).toFixed(1)); }
      return p.join(" ");
    }
    // tangan atas: pergelangan di kiri, jari melengkung turun menjaga mur dari atas.
    // Tangan bawah = tangan atas diputar 180°.
    var hand = "M17 38.5C29 30.5 44 26.2 56.5 29.6C62 31.2 66 34.8 67.6 39.2C67.9 40.9 66.6 41.7 65.4 40.9C63.2 38.9 60.7 37.4 57.8 36.7" +
      "C59.6 38.3 60.9 40.2 61.3 42.1C61.5 43.6 60.1 44.2 58.9 43.4C55.8 40.3 51 37.9 45 37.6C36 37.4 27 40.4 18.5 44Z";
    function handG(rot) {
      return '<g transform="rotate(' + rot + ' 50 50)">' +
        '<path d="' + hand + '" fill="#fff" stroke="#fff" stroke-width="6" stroke-linejoin="round"/>' +
        '<path d="' + hand + '" fill="#fff" stroke="' + BRAND + '" stroke-width="1.8" stroke-linejoin="round"/>' +
        '<path d="M50 31.6C54 31.6 57.6 32.6 60.6 34.6M47 33.9C51 33.8 54.6 34.6 57.6 36" stroke="' + BRAND + '" stroke-width="1.1" fill="none" stroke-linecap="round"/></g>';
    }
    return '<g transform="translate(' + x + "," + y + ") scale(" + s / 100 + ')">' +
      '<circle cx="50" cy="50" r="48" fill="#fff"/>' +
      '<circle cx="50" cy="50" r="45.5" fill="none" stroke="' + BRAND + '" stroke-width="3.6"/>' +
      '<g stroke="' + BRAND + '" stroke-width="5.4" stroke-linecap="round">' + arms + "</g>" +
      handG(0) + handG(180) +
      '<polygon points="' + hex(12) + '" fill="' + BRAND + '" stroke="#fff" stroke-width="2.4"/>' +
      '<polygon points="' + hex(6) + '" fill="#fff"/>' +
      "</g>";
  }

  function star(cx, cy, r, fill) {
    var p = [];
    for (var k = 0; k < 10; k++) {
      var t = -Math.PI / 2 + (Math.PI / 5) * k, rr = k % 2 ? r * 0.45 : r;
      p.push((cx + Math.cos(t) * rr).toFixed(1) + "," + (cy + Math.sin(t) * rr).toFixed(1));
    }
    return '<polygon points="' + p.join(" ") + '" fill="' + fill + '"/>';
  }

  // Tulisan merek sesuai logo resmi: nama, bidang usaha, SERVICE EXCELLENT + 5 bintang.
  function wordmark(x, y, cfg, light) {
    var main = light ? DARK : WHITE, sub = light ? BRAND : "#5CC8F0", stars = "";
    for (var k = 0; k < 5; k++) stars += star(x + 316 + k * 32, y + 75, 12.5, light ? BLUE : BLUE2);
    return '<text x="' + x + '" y="' + y + '" font-family="Montserrat" font-weight="900" font-size="50" letter-spacing=".5" fill="' + main + '">REJEKI UTAMA AC</text>' +
      '<text x="' + (x + 2) + '" y="' + (y + 37) + '" font-family="Poppins" font-weight="600" font-size="23" fill="' + sub + '">' + esc(cfg.subjudul) + "</text>" +
      '<text transform="translate(' + (x + 2) + "," + (y + 84) + ') skewX(-12)" font-family="Montserrat" font-weight="900" font-size="26" fill="' + main + '">SERVICE EXCELLENT</text>' +
      stars;
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

  function svgOpen(withBleed) {
    var vb = withBleed ? (-BLEED + " " + -BLEED + " " + (900 + 2 * BLEED) + " " + (550 + 2 * BLEED)) : "0 0 900 550";
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="' + vb + '" font-family="Poppins">';
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
  };
  function lineIcon(name, x, y, size, color, sw) {
    return '<g transform="translate(' + x + "," + y + ") scale(" + size / 24 + ')"><path d="' + LINE_ICONS[name] + '" fill="none" stroke="' + color + '" stroke-width="' + (sw || 2) + '" stroke-linecap="round" stroke-linejoin="round"/></g>';
  }

  // ---------------- DEPAN: Minimal ----------------
  // Kisi: margin kiri 60, area aman 30 unit dari tepi potong. Teks terkecil 18,5 unit (± 5,3 pt, huruf kapital tebal).
  function fitSize(text, max, width, em) {
    // perkiraan lebar huruf kapital Montserrat tebal ≈ em × ukuran per karakter
    return Math.min(max, +(width / (String(text).length * em)).toFixed(1));
  }
  function front(cfg, opts) {
    opts = opts || {};
    var u = "_" + (logoSeq++); // id unik: beberapa kartu bisa tampil di satu halaman
    var b = BLEED, tex = "";
    for (var i = 0; i < 14; i++) tex += '<line x1="' + (i * 80 - 300) + '" y1="' + (-b) + '" x2="' + (i * 80 + 100) + '" y2="' + (550 + b) + '"/>';
    // pita layanan: satu baris rata tengah, dipisah belah ketupat kecil (lebar teks diukur untuk Montserrat 800 / 19)
    var svc = [["SERVICE AC", 129.6], ["MAINTENANCE", 161.8], ["INSTALLATION", 158.5], ["TROUBLESHOOTING", 217.6]], band = "", GAP = 40;
    var bx = 450 - (svc.reduce(function (t, s) { return t + s[1]; }, 0) + GAP * (svc.length - 1)) / 2;
    svc.forEach(function (s, k) {
      if (k) band += '<rect x="' + (bx - GAP / 2 - 4).toFixed(1) + '" y="495" width="8" height="8" transform="rotate(45 ' + (bx - GAP / 2).toFixed(1) + ' 499)" fill="#fff" fill-opacity=".7"/>';
      band += '<text x="' + bx.toFixed(1) + '" y="506" font-family="Montserrat" font-weight="800" font-size="19" letter-spacing=".9" fill="#fff">' + s[0] + "</text>";
      bx += s[1] + GAP;
    });
    var nama = cfg.nama.toUpperCase(), jab = cfg.jabatan.toUpperCase();
    var nSize = fitSize(nama, 34, 410, 0.78), jSize = fitSize(jab, 18.5, 410, 0.74);
    return svgOpen(opts.bleed) +
      '<defs><radialGradient id="fbg' + u + '" cx=".78" cy=".05" r="1.1"><stop offset="0" stop-color="#DDF3FC"/><stop offset=".45" stop-color="#F5FBFE"/><stop offset="1" stop-color="#FFFFFF"/></radialGradient>' +
      '<linearGradient id="fgold' + u + '" x1="0" y1="0" x2="1" y2=".25"><stop offset="0" stop-color="#0A86BD"/><stop offset=".5" stop-color="#19B5E8"/><stop offset="1" stop-color="#0A86BD"/></linearGradient>' +
      '<linearGradient id="fline' + u + '" x1="0" x2="1"><stop offset="0" stop-color="' + BLUE + '"/><stop offset=".7" stop-color="' + BLUE + '" stop-opacity=".55"/><stop offset="1" stop-color="' + BLUE + '" stop-opacity="0"/></linearGradient></defs>' +
      '<rect x="' + -b + '" y="' + -b + '" width="' + (900 + 2 * b) + '" height="' + (550 + 2 * b) + '" fill="url(#fbg' + u + ')"/>' +
      '<g stroke="' + BLUE + '" stroke-opacity=".035" stroke-width="26">' + tex + "</g>" +
      // tanda air kepingan salju (sangat halus) di kanan
      '<g opacity=".08">' + snowflake(858, 40, 150, BLUE, 9) + "</g>" +
      // logo + tulisan merek
      logo(60, 46, 152) +
      wordmark(238, 102, cfg, true) +
      // tagline rata kiri, sejajar logo
      '<text x="62" y="262" font-family="Poppins" font-weight="500" font-size="24" fill="' + INK + '">' + esc(cfg.tagline) + "</text>" +
      '<rect x="62" y="288" width="778" height="2" fill="url(#fline' + u + ')"/>' +
      // nama & jabatan
      '<text x="60" y="360" font-family="Montserrat" font-weight="800" font-size="' + nSize + '" letter-spacing=".5" fill="' + DARK + '">' + esc(nama) + "</text>" +
      '<text x="62" y="396" font-family="Montserrat" font-weight="700" font-size="' + jSize + '" letter-spacing="1.6" fill="' + BLUE + '">' + esc(jab) + "</text>" +
      '<rect x="508" y="324" width="2" height="82" fill="' + BLUE + '" fill-opacity=".8"/>' +
      // whatsapp
      '<circle cx="568" cy="364" r="32" fill="' + BLUE + '"/>' +
      '<g transform="translate(548.5,344.5) scale(1.22)"><path d="M16 3a13 13 0 0 0-11.2 19.6L3 29l6.6-1.7A13 13 0 1 0 16 3z" fill="none" stroke="#fff" stroke-width="2.2" stroke-linejoin="round"/><path d="M12 10.5c.3-.6.6-.6.9-.6h.5c.2 0 .4 0 .6.5l.9 2.1c.1.2.1.4 0 .6-.6 1.1-1.2 1-.9 1.5a7.6 7.6 0 0 0 3.8 3.3c.3.1.4 0 .6-.2s.6-.8.8-1 .4-.2.7-.1 1.6.8 1.9.9.4.2.5.3a2.4 2.4 0 0 1-.2 1.3 2.9 2.9 0 0 1-1.8 1.3c-.9.2-1.7.1-3.4-.7a12.6 12.6 0 0 1-4.8-4.3 5.5 5.5 0 0 1-1.1-2.9 3.2 3.2 0 0 1 1-2.4z" fill="#fff"/></g>' +
      '<text x="618" y="350" font-family="Montserrat" font-weight="700" font-size="18.5" letter-spacing="1.6" fill="' + BLUE + '">WHATSAPP</text>' +
      '<text x="617" y="389" font-family="Montserrat" font-weight="800" font-size="' + fitSize(cfg.telepon, 30, 245, 0.66) + '" fill="' + DARK + '">' + esc(cfg.telepon) + "</text>" +
      // pita layanan biru
      '<rect x="' + -b + '" y="450" width="' + (900 + 2 * b) + '" height="' + (100 + b) + '" fill="url(#fgold' + u + ')"/>' +
      '<rect x="' + -b + '" y="450" width="' + (900 + 2 * b) + '" height="2" fill="#fff" fill-opacity=".4"/>' +
      band +
      "</svg>";
  }

  // ---------------- BELAKANG: QR & AR dominan (target AR) ----------------
  function back(cfg, qrSvgInner, opts) {
    opts = opts || {};
    var u = "_" + (logoSeq++);
    var b = BLEED, i;
    // aliran udara bersih vs udara kotor (tercetak)
    var cleanAir = "", dirtyAir = "";
    for (i = 0; i < 5; i++) {
      var x0 = 78 + i * 44;
      cleanAir += '<path d="M' + x0 + " 154 c -10 18, 14 30, 2 " + (52 + (i % 2) * 8) + '" stroke="' + (i % 2 ? ICE2 : "#5FC8EE") + '" stroke-width="4" fill="none" stroke-linecap="round" opacity=".8"/>';
      var x1 = 385 + i * 44;
      dirtyAir += '<path d="M' + x1 + " 154 q 6 12 -2 22 q -8 10 2 " + (18 + (i % 3) * 6) + '" stroke="#8a8170" stroke-width="3" fill="none" stroke-linecap="round" opacity=".75"/>';
    }
    dirtyAir += '<path d="M420 156 q -5 9 0 13 q 5 -4 0 -13z" fill="#8a8170"/><path d="M540 156 q -5 9 0 13 q 5 -4 0 -13z" fill="#8a8170"/>';
    var good = [["wind", "Udara bersih & sehat"], ["snow", "Dingin optimal"], ["bolt", "Hemat energi"], ["shield", "AC lebih awet"], ["smile", "Nyaman setiap saat"]];
    var bad = [["wind", "Udara kotor & berbau"], ["snow", "Kurang dingin"], ["bolt", "Boros listrik"], ["warn", "Berisiko kerusakan"], ["frown", "Tidak nyaman"]];
    var lists = "";
    good.forEach(function (g, k) {
      lists += lineIcon(g[0], 56, 268 + k * 34, 20, INK, 2) + '<text x="86" y="284" transform="translate(0,' + k * 34 + ')" font-family="Poppins" font-weight="500" font-size="16.5" fill="' + INK + '">' + esc(g[1]) + "</text>";
    });
    bad.forEach(function (g, k) {
      lists += lineIcon(g[0], 360, 268 + k * 34, 20, INK, 2) + '<text x="390" y="284" transform="translate(0,' + k * 34 + ')" font-family="Poppins" font-weight="500" font-size="16.5" fill="' + INK + '">' + esc(g[1]) + "</text>";
    });
    var feats = [["gear", "PREVENTIVE", "MAINTENANCE"], ["drop", "INDOOR AIR", "QUALITY"], ["bolt", "ENERGY", "EFFICIENCY"], ["clock", "FAST", "RESPONSE"], ["pro", "PROFESSIONAL", "SERVICE"]];
    var band = "";
    feats.forEach(function (f, k) {
      var cx = 28 + k * 172;
      band += lineIcon(f[0], cx, 482, 32, BLUE, 2) +
        '<text x="' + (cx + 42) + '" y="495" font-family="Montserrat" font-weight="700" font-size="12.5" letter-spacing=".8" fill="' + DARK + '">' + f[1] + "</text>" +
        '<text x="' + (cx + 42) + '" y="512" font-family="Montserrat" font-weight="700" font-size="12.5" letter-spacing=".8" fill="' + DARK + '">' + f[2] + "</text>";
    });
    var qr = opts.noQr ? "" : qrSvgInner;
    return svgOpen(opts.bleed) +
      '<defs><linearGradient id="bcr' + u + '" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFFFFF"/><stop offset="1" stop-color="#EAF7FD"/></linearGradient></defs>' +
      '<rect x="' + -b + '" y="' + -b + '" width="' + (900 + 2 * b) + '" height="' + (550 + 2 * b) + '" fill="' + DEEP + '"/>' +
      '<rect x="' + -b + '" y="' + -b + '" width="' + (668 + b) + '" height="' + (484 + b) + '" fill="url(#bcr' + u + ')"/>' +
      // judul kolom
      '<text x="165" y="58" text-anchor="middle" font-family="Montserrat" font-weight="800" font-size="18" letter-spacing=".5" fill="' + INK + '">AC RUTIN DIRAWAT</text>' +
      '<text x="474" y="58" text-anchor="middle" font-family="Montserrat" font-weight="800" font-size="18" letter-spacing=".5" fill="' + INK + '">AC TIDAK DIRAWAT</text>' +
      '<line x1="318" y1="36" x2="318" y2="158" stroke="#BFE3F2" stroke-width="2"/><line x1="318" y1="222" x2="318" y2="452" stroke="#BFE3F2" stroke-width="2"/>' +
      acAt(AC, {}) + acAt(AC_DIRTY, { dirty: true }) +
      cleanAir + dirtyAir +
      '<circle cx="318" cy="190" r="30" fill="' + BLUE + '"/><text x="318" y="199" text-anchor="middle" font-family="Montserrat" font-weight="800" font-size="24" fill="' + WHITE + '">VS</text>' +
      '<circle cx="70" cy="236" r="17" fill="none" stroke="' + INK + '" stroke-width="2.6"/><path d="M62 236l6 6 11-12" fill="none" stroke="' + INK + '" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>' +
      '<circle cx="602" cy="236" r="17" fill="none" stroke="' + INK + '" stroke-width="2.6"/><path d="M595 229l14 14M609 229l-14 14" stroke="' + INK + '" stroke-width="3" stroke-linecap="round"/>' +
      lists +
      // kolom kanan
      '<text x="784" y="56" text-anchor="middle" font-family="Montserrat" font-weight="800" font-size="19" fill="' + WHITE + '">Jangan tunggu</text>' +
      '<text x="784" y="81" text-anchor="middle" font-family="Montserrat" font-weight="800" font-size="19" fill="' + WHITE + '">AC rusak untuk</text>' +
      '<text x="784" y="106" text-anchor="middle" font-family="Montserrat" font-weight="800" font-size="19" fill="' + WHITE + '">mulai peduli.</text>' +
      '<rect x="700" y="124" width="168" height="70" rx="6" fill="' + WHITE + '"/>' +
      '<text x="784" y="150" text-anchor="middle" font-family="Montserrat" font-weight="900" font-size="17" fill="' + DARK + '">SCAN —</text>' +
      '<text x="784" y="168" text-anchor="middle" font-family="Montserrat" font-weight="800" font-size="13" fill="' + DARK + '">LIHAT KONDISI</text>' +
      '<text x="784" y="185" text-anchor="middle" font-family="Montserrat" font-weight="800" font-size="13" fill="' + DARK + '">AC ANDA</text>' +
      '<rect x="716" y="208" width="136" height="136" rx="8" fill="' + WHITE + '"/>' +
      '<g transform="translate(728,220)">' + qr + "</g>" +
      '<rect x="704" y="360" width="160" height="46" rx="6" fill="none" stroke="' + WHITE + '" stroke-width="2"/>' +
      '<rect x="712" y="367" width="40" height="32" rx="4" fill="none" stroke="' + WHITE + '" stroke-width="2"/>' +
      '<text x="732" y="390" text-anchor="middle" font-family="Montserrat" font-weight="900" font-size="18" fill="' + WHITE + '">AR</text>' +
      '<text x="762" y="381" font-family="Montserrat" font-weight="800" font-size="12.5" letter-spacing="1" fill="' + WHITE + '">COMPANY</text>' +
      '<text x="762" y="397" font-family="Montserrat" font-weight="800" font-size="12.5" letter-spacing="1" fill="' + WHITE + '">PROFILE</text>' +
      '<text x="784" y="432" text-anchor="middle" font-family="Poppins" font-weight="600" font-size="12" fill="' + WHITE + '">Simpan kartu ini. Suatu hari</text>' +
      '<text x="784" y="449" text-anchor="middle" font-family="Poppins" font-weight="600" font-size="12" fill="' + WHITE + '">AC Anda akan membutuhkannya.</text>' +
      // pita bawah
      '<rect x="' + -b + '" y="466" width="' + (900 + 2 * b) + '" height="' + (84 + b) + '" fill="' + FROST + '"/>' +
      '<rect x="' + -b + '" y="466" width="' + (900 + 2 * b) + '" height="2" fill="' + BLUE + '" opacity=".5"/>' + band +
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

  window.RUCard = { front: front, back: back, qrInner: qrInner, arUrl: arUrl, logo: logo, wordmark: wordmark, star: star, BRAND: BRAND, snowflake: snowflake, sparkle: sparkle,
    acUnit: acUnit, lineIcon: lineIcon, AC: AC, BLEED: BLEED };
})();
