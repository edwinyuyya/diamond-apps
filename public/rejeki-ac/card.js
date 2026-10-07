/*
 * Desain kartu nama Rejeki Utama AC (ukuran standar 90 x 55 mm).
 * Kedua sisi digambar sebagai SVG 900 x 550 (1 unit = 0,1 mm) dengan
 * bleed 3 mm (30 unit) di tiap sisi untuk percetakan.
 *
 * PENTING: sisi DEPAN adalah "target AR". Kalau desain depan diubah,
 * file targets/kartu-depan.mind harus dibuat ulang lewat compile.html.
 */
(function () {
  var NAVY = "#071A33", NAVY2 = "#0C3363", ICE = "#19C6F0", ICE2 = "#8FE6FF",
      GOLD = "#F5B800", WHITE = "#FFFFFF";
  var BLEED = 30;

  function esc(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  // Kepingan salju 6 cabang, dipakai di logo & ornamen
  function snowflake(cx, cy, r, stroke, w) {
    var out = "";
    for (var i = 0; i < 6; i++) {
      var a = (Math.PI / 3) * i;
      var x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
      out += '<line x1="' + cx + '" y1="' + cy + '" x2="' + x.toFixed(1) + '" y2="' + y.toFixed(1) + '"/>';
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

  // Logo: perisai hexagon + salju + koin emas kecil ("rejeki")
  var logoSeq = 0;
  function logo(x, y, s, light) {
    var gid = "rulg" + (logoSeq++);
    var hex = [];
    for (var i = 0; i < 6; i++) {
      var a = Math.PI / 6 + (Math.PI / 3) * i;
      hex.push((50 + Math.cos(a) * 48).toFixed(1) + "," + (50 + Math.sin(a) * 48).toFixed(1));
    }
    return '<g transform="translate(' + x + "," + y + ") scale(" + s / 100 + ')">' +
      '<defs><linearGradient id="' + gid + '" x1="0" y1="0" x2="1" y2="1">' +
      '<stop offset="0" stop-color="' + ICE2 + '"/><stop offset="1" stop-color="' + ICE + '"/></linearGradient></defs>' +
      '<polygon points="' + hex.join(" ") + '" fill="url(#' + gid + ')"/>' +
      '<polygon points="' + hex.join(" ") + '" fill="none" stroke="' + (light ? NAVY : WHITE) + '" stroke-opacity=".35" stroke-width="2" transform="translate(50 50) scale(.84) translate(-50 -50)"/>' +
      snowflake(46, 50, 27, NAVY, 5) +
      '<circle cx="76" cy="74" r="15" fill="' + GOLD + '" stroke="' + NAVY + '" stroke-width="3"/>' +
      '<text x="76" y="80" text-anchor="middle" font-family="Montserrat" font-weight="900" font-size="17" fill="' + NAVY + '">Rp</text>' +
      "</g>";
  }

  // Unit AC split (indoor) + aliran udara sejuk
  function acUnit(x, y) {
    var vents = "";
    for (var i = 0; i < 7; i++) vents += '<rect x="' + (40 + i * 46) + '" y="98" width="34" height="5" rx="2.5" fill="#B9CCE0"/>';
    return '<g transform="translate(' + x + "," + y + ')">' +
      '<rect x="6" y="10" width="380" height="122" rx="26" fill="#000" opacity=".25"/>' +
      '<rect x="0" y="0" width="380" height="122" rx="26" fill="' + WHITE + '"/>' +
      '<rect x="0" y="0" width="380" height="58" rx="26" fill="#EEF5FC"/>' +
      '<rect x="0" y="32" width="380" height="26" fill="#EEF5FC"/>' +
      '<rect x="18" y="78" width="344" height="34" rx="12" fill="#DCE8F4"/>' + vents +
      '<circle cx="340" cy="34" r="7" fill="' + ICE + '"/><circle cx="340" cy="34" r="12" fill="none" stroke="' + ICE + '" stroke-opacity=".4" stroke-width="3"/>' +
      '<text x="28" y="44" font-family="Montserrat" font-weight="800" font-size="20" letter-spacing="3" fill="' + NAVY2 + '">RU·AC</text>' +
      '<text x="290" y="42" font-family="Montserrat" font-weight="700" font-size="16" fill="' + NAVY2 + '" text-anchor="end">18°C</text>' +
      "</g>";
  }

  function airflow(x, y) {
    var g = "", c = [ICE, ICE2, WHITE, ICE, ICE2];
    for (var i = 0; i < 5; i++) {
      var ox = i * 70;
      g += '<path d="M' + (30 + ox) + ' 0 C ' + (10 + ox) + ' 60, ' + (70 + ox) + ' 90, ' + (40 + ox) + ' 160 S ' + (60 + ox) + ' 230, ' + (30 + ox) + ' 270" stroke="' + c[i] + '" stroke-width="' + (i % 2 ? 5 : 8) + '" stroke-linecap="round" fill="none" opacity="' + (0.9 - i * 0.08) + '"/>';
    }
    return '<g transform="translate(' + x + "," + y + ')">' + g + "</g>";
  }

  function sparkle(x, y, r, fill) {
    return '<path transform="translate(' + x + "," + y + ')" d="M0 ' + -r + " Q" + r * 0.18 + " " + -r * 0.18 + " " + r + " 0 Q" + r * 0.18 + " " + r * 0.18 + " 0 " + r + " Q" + -r * 0.18 + " " + r * 0.18 + " " + -r + " 0 Q" + -r * 0.18 + " " + -r * 0.18 + " 0 " + -r + 'Z" fill="' + fill + '"/>';
  }

  function svgOpen(withBleed) {
    var vb = withBleed ? (-BLEED + " " + -BLEED + " " + (900 + 2 * BLEED) + " " + (550 + 2 * BLEED)) : "0 0 900 550";
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="' + vb + '" font-family="Poppins">';
  }

  // ---------------- SISI DEPAN (target AR) ----------------
  function front(cfg, opts) {
    opts = opts || {};
    var b = BLEED;
    // pola kristal es di latar (sengaja tidak simetris: bagus untuk pelacakan AR)
    var pattern = "";
    var pts = [[560, 40, 22], [860, 90, 30], [700, 500, 26], [470, 470, 14], [820, 470, 18], [610, 300, 12], [880, 290, 16], [330, 40, 12], [250, 505, 15], [400, 285, 10]];
    pts.forEach(function (p) { pattern += snowflake(p[0], p[1], p[2], ICE2, 2.4); });
    var sparks = sparkle(452, 190, 16, GOLD) + sparkle(865, 210, 11, GOLD) + sparkle(520, 420, 9, GOLD) + sparkle(780, 390, 13, WHITE) + sparkle(640, 470, 8, GOLD);
    var lines = "";
    for (var i = 0; i < 9; i++) lines += '<line x1="' + (-b) + '" y1="' + (i * 80 - 120) + '" x2="' + (900 + b) + '" y2="' + (i * 80 + 160) + '"/>';

    return svgOpen(opts.bleed) +
      '<defs><linearGradient id="fbg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="' + NAVY + '"/><stop offset=".65" stop-color="' + NAVY2 + '"/><stop offset="1" stop-color="#0F4C8A"/></linearGradient>' +
      '<radialGradient id="glow" cx=".72" cy=".55" r=".45"><stop offset="0" stop-color="' + ICE + '" stop-opacity=".45"/><stop offset="1" stop-color="' + ICE + '" stop-opacity="0"/></radialGradient></defs>' +
      '<rect x="' + -b + '" y="' + -b + '" width="' + (900 + 2 * b) + '" height="' + (550 + 2 * b) + '" fill="url(#fbg)"/>' +
      '<rect x="' + -b + '" y="' + -b + '" width="' + (900 + 2 * b) + '" height="' + (550 + 2 * b) + '" fill="url(#glow)"/>' +
      '<g stroke="' + WHITE + '" stroke-opacity=".05" stroke-width="22">' + lines + "</g>" +
      '<g opacity=".38">' + pattern + "</g>" +
      airflow(520, 245) +
      acUnit(470, 105) + sparks +
      // brand
      logo(54, 56, 96, false) +
      '<text x="168" y="98" font-family="Montserrat" font-weight="900" font-size="45" fill="' + WHITE + '" letter-spacing="1">REJEKI</text>' +
      '<text x="168" y="148" font-family="Montserrat" font-weight="900" font-size="45" fill="' + WHITE + '" letter-spacing="1">UTAMA</text>' +
      '<rect x="352" y="113" width="74" height="42" rx="8" fill="' + GOLD + '"/>' +
      '<text x="389" y="146" text-anchor="middle" font-family="Montserrat" font-weight="900" font-size="34" fill="' + NAVY + '">AC</text>' +
      '<text x="56" y="222" font-family="Poppins" font-weight="600" font-size="21" fill="' + ICE2 + '" letter-spacing=".5">' + esc(cfg.tagline) + "</text>" +
      '<text x="56" y="262" font-family="Poppins" font-weight="400" font-size="19" fill="' + WHITE + '" opacity=".8">Service • Perbaikan • Bongkar Pasang • Kontrak</text>' +
      // badge AR
      '<g transform="translate(56,370)">' +
      '<rect width="372" height="118" rx="20" fill="' + WHITE + '" fill-opacity=".08" stroke="' + ICE + '" stroke-width="2.5" stroke-dasharray="10 7"/>' +
      '<g transform="translate(22,24)" fill="none" stroke="' + GOLD + '" stroke-width="5" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M0 18 V0 H18 M52 0 H70 V18 M70 52 V70 H52 M18 70 H0 V52"/>' +
      '<path d="M35 16 L54 27 V47 L35 58 L16 47 V27 Z M16 27 L35 38 L54 27 M35 38 V58" stroke="' + WHITE + '" stroke-width="4"/></g>' +
      '<text x="114" y="50" font-family="Montserrat" font-weight="800" font-size="23" fill="' + GOLD + '">KARTU INI HIDUP!</text>' +
      '<text x="114" y="78" font-family="Poppins" font-weight="500" font-size="16" fill="' + WHITE + '">Scan QR di belakang, lalu</text>' +
      '<text x="114" y="99" font-family="Poppins" font-weight="500" font-size="16" fill="' + WHITE + '">arahkan kamera ke sisi ini</text>' +
      "</g>" +
      '<rect x="' + -b + '" y="536" width="' + (900 + 2 * b) + '" height="' + (14 + b) + '" fill="' + GOLD + '"/>' +
      "</svg>";
  }

  // ---------------- SISI BELAKANG (kontak + QR) ----------------
  function icon(name, x, y) {
    var p = {
      phone: '<path d="M5 2h5l2 6-3 2a13 13 0 0 0 6 6l2-3 6 2v5a2 2 0 0 1-2 2A20 20 0 0 1 3 4a2 2 0 0 1 2-2z"/>',
      mail: '<rect x="2" y="5" width="22" height="16" rx="3"/><path d="M4 8l9 6.5 9-6.5" fill="none" stroke="#0C3363" stroke-width="2.6"/>',
      ig: '<rect x="2" y="2" width="22" height="22" rx="7"/><circle cx="13" cy="13" r="5" fill="none" stroke="#0C3363" stroke-width="2.8"/><circle cx="19.3" cy="6.8" r="1.7" fill="#0C3363"/>',
      pin: '<path d="M13 1a9 9 0 0 1 9 9c0 7-9 15-9 15S4 17 4 10a9 9 0 0 1 9-9z"/><circle cx="13" cy="10" r="3.4" fill="#0C3363"/>',
    }[name];
    return '<g transform="translate(' + x + "," + y + ')"><circle cx="13" cy="13" r="21" fill="' + NAVY2 + '"/><g transform="translate(1.5,1.5) scale(.88)" fill="' + WHITE + '">' + p + "</g></g>";
  }

  function back(cfg, qrSvgInner, opts) {
    opts = opts || {};
    var b = BLEED;
    var rows = [
      ["phone", cfg.telepon + "  (Telp/WA)"],
      ["mail", cfg.email],
      ["ig", cfg.instagram],
      ["pin", cfg.alamat],
    ];
    var r = "";
    rows.forEach(function (row, i) {
      var y = 214 + i * 52;
      r += icon(row[0], 58, y - 20) + '<text x="112" y="' + (y + 1) + '" font-family="Poppins" font-weight="500" font-size="20" fill="' + NAVY + '">' + esc(row[1]) + "</text>";
    });
    return svgOpen(opts.bleed) +
      '<rect x="' + -b + '" y="' + -b + '" width="' + (900 + 2 * b) + '" height="' + (550 + 2 * b) + '" fill="#F4F9FE"/>' +
      '<g opacity=".07">' + snowflake(560, 120, 120, NAVY2, 7) + "</g>" +
      '<rect x="' + -b + '" y="' + -b + '" width="' + (16 + b) + '" height="' + (440 + b) + '" fill="' + ICE + '"/>' +
      // brand kecil
      logo(56, 38, 50, true) +
      '<text x="118" y="72" font-family="Montserrat" font-weight="900" font-size="22" fill="' + NAVY + '" letter-spacing="1">REJEKI UTAMA <tspan fill="#C99700">AC</tspan></text>' +
      // nama
      '<text x="58" y="146" font-family="Montserrat" font-weight="800" font-size="38" fill="' + NAVY + '">' + esc(cfg.nama) + "</text>" +
      '<text x="58" y="176" font-family="Poppins" font-weight="600" font-size="19" fill="#0A8FB8">' + esc(cfg.jabatan) + "</text>" +
      r +
      // QR
      '<g transform="translate(652,34)">' +
      '<rect width="210" height="210" rx="18" fill="' + WHITE + '" stroke="' + NAVY + '" stroke-width="4"/>' +
      '<g transform="translate(15,15)">' + qrSvgInner + "</g></g>" +
      '<text x="757" y="276" text-anchor="middle" font-family="Montserrat" font-weight="800" font-size="19" fill="' + NAVY + '">SCAN → LIHAT AR</text>' +
      '<text x="757" y="302" text-anchor="middle" font-family="Poppins" font-weight="500" font-size="15" fill="#3D5878">Company profile</text>' +
      '<text x="757" y="322" text-anchor="middle" font-family="Poppins" font-weight="500" font-size="15" fill="#3D5878">muncul di atas kartu</text>' +
      '<text x="757" y="414" text-anchor="middle" font-family="Poppins" font-weight="500" font-size="15" fill="#3D5878">Area: ' + esc(cfg.areaLayanan) + "</text>" +
      // pita promo + jadwal service
      '<rect x="' + -b + '" y="440" width="' + (900 + 2 * b) + '" height="' + (110 + b) + '" fill="' + NAVY + '"/>' +
      sparkle(54, 482, 14, GOLD) +
      '<text x="80" y="490" font-family="Montserrat" font-weight="900" font-size="25" fill="' + GOLD + '">' + esc(cfg.promo.judul) + "</text>" +
      '<text x="80" y="520" font-family="Poppins" font-weight="400" font-size="15" fill="' + WHITE + '" opacity=".9">' + esc(cfg.promo.detail) + "</text>" +
      '<rect x="618" y="456" width="252" height="78" rx="12" fill="' + WHITE + '"/>' +
      '<text x="636" y="482" font-family="Poppins" font-weight="600" font-size="14" fill="' + NAVY + '">Jadwal service berikutnya:</text>' +
      '<g stroke="#9FB3C8" stroke-width="2"><line x1="638" y1="520" x2="690" y2="520"/><line x1="718" y1="520" x2="770" y2="520"/><line x1="798" y1="520" x2="852" y2="520"/></g>' +
      '<text x="704" y="519" text-anchor="middle" font-size="22" fill="#9FB3C8">/</text><text x="784" y="519" text-anchor="middle" font-size="22" fill="#9FB3C8">/</text>' +
      "</svg>";
  }

  // QR code -> isi <svg> (path) ukuran 180x180
  function qrInner(url) {
    var qr = qrcode(0, "M");
    qr.addData(url);
    qr.make();
    var n = qr.getModuleCount(), cell = 180 / n, d = "";
    for (var y = 0; y < n; y++) for (var x = 0; x < n; x++) if (qr.isDark(y, x)) d += "M" + (x * cell).toFixed(2) + " " + (y * cell).toFixed(2) + "h" + cell.toFixed(2) + "v" + cell.toFixed(2) + "h-" + cell.toFixed(2) + "z";
    return '<path d="' + d + '" fill="' + NAVY + '"/>';
  }

  function arUrl(cfg) {
    if (cfg.urlAR) return cfg.urlAR;
    var here = location.href.split("#")[0].split("?")[0];
    return here.replace(/[^/]*$/, "") + "ar.html";
  }

  window.RUCard = { front: front, back: back, qrInner: qrInner, arUrl: arUrl, logo: logo, snowflake: snowflake, BLEED: BLEED };
})();
