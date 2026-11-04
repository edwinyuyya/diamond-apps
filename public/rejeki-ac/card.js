/*
 * Desain kartu nama Rejeki Utama AC (ukuran standar 90 x 55 mm), gaya putih + biru dingin.
 * Kedua sisi digambar sebagai SVG 900 x 550 (1 unit = 0,1 mm) dengan
 * bleed 3 mm (30 unit) di tiap sisi untuk percetakan.
 *
 *  - DEPAN    : "kartu teka-teki" — tanpa nama, nomor disensor, QR di dalam gambar HP,
 *               3 langkah scan. Tujuannya memancing penerima mengeluarkan HP.
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
    tag: "M3 12V3h9l9 9-9 9zM7.5 7.5h.01",
  };
  function lineIcon(name, x, y, size, color, sw) {
    return '<g transform="translate(' + x + "," + y + ") scale(" + size / 24 + ')"><path d="' + LINE_ICONS[name] + '" fill="none" stroke="' + color + '" stroke-width="' + (sw || 2) + '" stroke-linecap="round" stroke-linejoin="round"/></g>';
  }

  // ---------------- DEPAN: "kartu teka-teki" ----------------
  // Sengaja TIDAK lengkap: tanpa nama, nomor WhatsApp disensor. Satu-satunya cara
  // membuka isinya adalah scan QR (di dalam gambar HP) lalu mengarahkan kamera ke kartu.
  // Kisi: margin kiri 48, area aman 30 unit dari tepi potong.
  function fitSize(text, max, width, em) {
    // perkiraan lebar huruf kapital Montserrat tebal ≈ em × ukuran per karakter
    return Math.min(max, +(width / (String(text).length * em)).toFixed(1));
  }
  function front(cfg, qrSvgInner, opts) {
    opts = opts || {};
    var u = "_" + (logoSeq++); // id unik: beberapa kartu bisa tampil di satu halaman
    var b = BLEED, tex = "";
    for (var i = 0; i < 14; i++) tex += '<line x1="' + (i * 80 - 300) + '" y1="' + (-b) + '" x2="' + (i * 80 + 100) + '" y2="' + (550 + b) + '"/>';

    // HP berisi QR: instruksi yang terbaca tanpa perlu membaca
    var px = 620, py = 34, pw = 222, ph = 386, qx = 656, qy = 118, qs = 150;
    function corner(x, y, dx, dy) {
      return '<path d="M' + x + " " + (y + dy * 22) + "V" + y + "H" + (x + dx * 22) + '" fill="none" stroke="' + BLUE + '" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>';
    }
    var phone =
      '<rect x="' + (px + 6) + '" y="' + (py + 10) + '" width="' + pw + '" height="' + ph + '" rx="36" fill="' + DARK + '" opacity=".18"/>' +
      '<rect x="' + px + '" y="' + py + '" width="' + pw + '" height="' + ph + '" rx="36" fill="' + DARK + '"/>' +
      '<rect x="' + (px + 11) + '" y="' + (py + 34) + '" width="' + (pw - 22) + '" height="' + (ph - 48) + '" rx="24" fill="' + WHITE + '"/>' +
      '<rect x="' + (px + pw / 2 - 26) + '" y="' + (py + 14) + '" width="52" height="9" rx="4.5" fill="#1F6587"/>' +
      '<text x="' + (px + pw / 2) + '" y="' + (qy - 16) + '" text-anchor="middle" font-family="Montserrat" font-weight="900" font-size="19" letter-spacing="2" fill="' + BLUE + '">SCAN SAYA</text>' +
      (opts.noQr ? "" : '<g transform="translate(' + qx + "," + qy + ") scale(" + (qs / 112) + ')">' + qrSvgInner + "</g>") +
      corner(qx - 10, qy - 10, 1, 1) + corner(qx + qs + 10, qy - 10, -1, 1) + corner(qx - 10, qy + qs + 10, 1, -1) + corner(qx + qs + 10, qy + qs + 10, -1, -1) +
      '<rect x="' + (qx - 4) + '" y="' + (qy + qs / 2 - 1.5) + '" width="' + (qs + 8) + '" height="3" rx="1.5" fill="' + ICE + '" opacity=".85"/>' +
      '<text x="' + (px + pw / 2) + '" y="' + (qy + qs + 46) + '" text-anchor="middle" font-family="Poppins" font-weight="500" font-size="14" fill="' + INK + '">lalu balik kartu &amp; arahkan</text>' +
      '<text x="' + (px + pw / 2) + '" y="' + (qy + qs + 66) + '" text-anchor="middle" font-family="Montserrat" font-weight="800" font-size="14.5" fill="' + DARK + '">kamera ke gambar AC</text>' +
      // ikon putar balik
      '<g transform="translate(' + (px + pw / 2) + "," + (qy + qs + 96) + ')" fill="none" stroke="' + BLUE + '" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M-13 -3A13 13 0 0 1 11 -7M13 3A13 13 0 0 1 -11 7"/><path d="M5 -12 11 -7 6 -1M-5 12 -11 7 -6 1"/></g>';

    // baris terkunci: nomor WhatsApp disensor
    var lock = '<g transform="translate(70,316)" fill="none" stroke="' + DARK + '" stroke-width="3" stroke-linejoin="round"><rect x="0" y="12" width="26" height="20" rx="4" fill="' + DARK + '"/><path d="M5 12V7a8 8 0 0 1 16 0v5"/></g>';
    var bars = [[112, 64], [184, 64], [256, 84]].map(function (r) {
      return '<rect x="' + r[0] + '" y="336" width="' + r[1] + '" height="16" rx="4" fill="' + DARK + '"/>';
    }).join("");
    var locked =
      '<rect x="48" y="296" width="520" height="76" rx="18" fill="' + WHITE + '" stroke="#BFE3F2" stroke-width="2"/>' + lock +
      '<text x="112" y="326" font-family="Montserrat" font-weight="800" font-size="14" letter-spacing="1.5" fill="' + BLUE + '">WHATSAPP</text>' + bars +
      '<text x="356" y="349" font-family="Poppins" font-weight="600" font-size="15" fill="' + BLUE + '">terbuka setelah scan</text>';

    // pita 3 langkah
    var steps = [["1", "SCAN QR"], ["2", "TEKAN MULAI AR"], ["3", "ARAHKAN KE KARTU"]], sx = 0, band = "";
    var widths = steps.map(function (st) { return 30 + 10 + st[1].length * 15 * 0.74; }), GAP = 58;
    sx = 450 - (widths.reduce(function (t, w) { return t + w; }, 0) + GAP * (steps.length - 1)) / 2;
    steps.forEach(function (st, k) {
      if (k) band += '<path d="M' + (sx - GAP / 2 - 5).toFixed(1) + ' 479l8 8-8 8" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" opacity=".8"/>';
      band += '<circle cx="' + (sx + 15).toFixed(1) + '" cy="487" r="15" fill="#fff"/>' +
        '<text x="' + (sx + 15).toFixed(1) + '" y="493" text-anchor="middle" font-family="Montserrat" font-weight="900" font-size="17" fill="' + BLUE_M + '">' + st[0] + "</text>" +
        '<text x="' + (sx + 40).toFixed(1) + '" y="493" font-family="Montserrat" font-weight="800" font-size="15" letter-spacing=".4" fill="#fff">' + st[1] + "</text>";
      sx += widths[k] + GAP;
    });
    band += '<text x="450" y="516" text-anchor="middle" font-family="Poppins" font-weight="500" font-size="13.5" fill="#fff" fill-opacity=".9">Gratis \u2022 tanpa install aplikasi \u2022 cuma 30 detik</text>';

    return svgOpen(opts.bleed) +
      '<defs><radialGradient id="fbg' + u + '" cx=".2" cy=".05" r="1.1"><stop offset="0" stop-color="#DDF3FC"/><stop offset=".45" stop-color="#F5FBFE"/><stop offset="1" stop-color="#FFFFFF"/></radialGradient>' +
      '<linearGradient id="fband' + u + '" x1="0" y1="0" x2="1" y2=".25"><stop offset="0" stop-color="#0A86BD"/><stop offset=".5" stop-color="#19B5E8"/><stop offset="1" stop-color="#0A86BD"/></linearGradient></defs>' +
      '<rect x="' + -b + '" y="' + -b + '" width="' + (900 + 2 * b) + '" height="' + (550 + 2 * b) + '" fill="url(#fbg' + u + ')"/>' +
      '<g stroke="' + BLUE + '" stroke-opacity=".035" stroke-width="26">' + tex + "</g>" +
      '<g opacity=".07">' + snowflake(560, 60, 120, BLUE, 8) + "</g>" +
      // merek (kecil)
      logo(46, 38, 62) +
      '<text x="122" y="68" font-family="Montserrat" font-weight="900" font-size="24" fill="' + DARK + '">REJEKI UTAMA AC</text>' +
      '<text x="123" y="92" font-family="Poppins" font-weight="500" font-size="14.5" fill="' + BLUE + '">' + esc(cfg.subjudul) + " \u2022 Sejak " + esc(cfg.tahunBerdiri) + "</text>" +
      // pengait rasa penasaran
      '<text x="46" y="178" font-family="Montserrat" font-weight="900" font-size="38" fill="' + DARK + '">Ada yang tersembunyi</text>' +
      '<text x="46" y="222" font-family="Montserrat" font-weight="900" font-size="38" fill="' + BLUE + '">di kartu ini.</text>' +
      '<text x="48" y="262" font-family="Poppins" font-weight="500" font-size="19" fill="' + INK + '">Hanya terlihat lewat kamera HP Anda.</text>' +
      locked + phone +
      '<rect x="' + -b + '" y="446" width="' + (900 + 2 * b) + '" height="' + (104 + b) + '" fill="url(#fband' + u + ')"/>' +
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
