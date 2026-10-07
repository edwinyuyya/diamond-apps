/*
 * Pengalaman AR Rejeki Utama AC.
 *
 *  - PANEL   : presentasi yang "keluar" dari kartu (1000 x 1100 px)
 *  - OVERLAY : animasi yang menempel PERSIS di atas gambar AC di kartu
 *              (1000 x 611 px = ukuran kartu). AC di kartu jadi hidup.
 *
 * Alur: AC hidup → "tapi di dalamnya?" → x-ray (filter, evaporator, blower,
 * kondensor makin kotor) → indikator → teknisi: Preventive Maintenance →
 * company profile → kuis kesehatan AC → ending + WhatsApp.
 * Semua isi diambil dari config.js (window.RU).
 */
(function () {
  function esc(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  var NAVY = "#0E1B33", NAVY2 = "#13284A", ICE = "#19C6F0", ICE2 = "#8FE6FF", GOLD = "#E2B04A";

  var ICONS = {
    rumah: '<path d="M8 30 32 10l24 20v24a4 4 0 0 1-4 4H12a4 4 0 0 1-4-4z" fill="#071A33"/><rect x="26" y="38" width="12" height="20" rx="2" fill="#8FE6FF"/>',
    gedung: '<rect x="12" y="8" width="28" height="50" rx="3" fill="#071A33"/><rect x="40" y="24" width="14" height="34" rx="2" fill="#071A33"/><path d="M19 17h5m5 0h5M19 27h5m5 0h5M19 37h5m5 0h5" stroke="#8FE6FF" stroke-width="4" stroke-linecap="round"/>',
    kontrak: '<rect x="14" y="8" width="36" height="48" rx="6" fill="#071A33"/><path d="M22 22h20M22 31h20M22 40h12" stroke="#8FE6FF" stroke-width="4" stroke-linecap="round"/>',
    tameng: '<path d="M32 6 54 14v16c0 14-10 24-22 28C20 54 10 44 10 30V14z" fill="#071A33"/><path d="m22 32 7 7 13-14" stroke="#8FE6FF" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
    perbaikan: '<path d="M40 10a14 14 0 0 0-13 19L10 46l8 8 17-17a14 14 0 0 0 19-13l-8 8-8-2-2-8z" fill="#071A33"/>',
    pasang: '<rect x="6" y="14" width="52" height="22" rx="7" fill="#071A33"/><path d="M14 30h36" stroke="#8FE6FF" stroke-width="3"/><path d="M32 40v16m-7-7 7 7 7-7" stroke="#071A33" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
  };
  var WA_ICON = '<svg viewBox="0 0 32 32" fill="currentColor"><path d="M16 3a13 13 0 0 0-11.2 19.6L3 29l6.6-1.7A13 13 0 1 0 16 3zm0 23.6a10.6 10.6 0 0 1-5.4-1.5l-.4-.2-3.9 1 1-3.8-.2-.4A10.6 10.6 0 1 1 16 26.6zm5.8-7.9c-.3-.2-1.9-.9-2.2-1s-.5-.2-.7.2-.8 1-1 1.2-.4.2-.7 0a8.7 8.7 0 0 1-4.3-3.8c-.3-.6.3-.5 1-1.7.1-.2 0-.4 0-.6l-1-2.4c-.3-.6-.5-.5-.7-.5h-.6a1.2 1.2 0 0 0-.9.4 3.6 3.6 0 0 0-1.1 2.7 6.3 6.3 0 0 0 1.3 3.3 14.4 14.4 0 0 0 5.5 4.9c2 .9 2.8 1 3.9.8a3.3 3.3 0 0 0 2.1-1.5 2.7 2.7 0 0 0 .2-1.5c-.1-.1-.3-.2-.6-.3z"/></svg>';
  var PHONE_ICON = '<svg viewBox="0 0 26 26" fill="currentColor"><path d="M5 2h5l2 6-3 2a13 13 0 0 0 6 6l2-3 6 2v5a2 2 0 0 1-2 2A20 20 0 0 1 3 4a2 2 0 0 1 2-2z"/></svg>';
  var USER_ICON = '<svg viewBox="0 0 26 26" fill="currentColor"><circle cx="13" cy="8" r="6"/><path d="M1 25a12 10 0 0 1 24 0z"/></svg>';
  var CHIP_COLORS = ["#0C3363", "#19A7D6", "#C99700", "#2BB58A", "#E0555A", "#6B5BD6", "#0F7C9E", "#D9822B"];

  // angka acak tapi tetap sama tiap kali (supaya gambar konsisten)
  function rng(seed) { return function () { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; }; }

  function waLink(cfg, text) {
    return "https://wa.me/" + cfg.whatsapp + "?text=" + encodeURIComponent(text);
  }

  // ---------------- Teknisi (ilustrasi) ----------------
  function techSvg(cls) {
    var lg = window.RUCard ? RUCard.logo(0, 0, 100) : "";
    return '<svg class="' + (cls || "tech") + '" viewBox="0 0 300 400">' +
      '<ellipse cx="150" cy="394" rx="115" ry="9" fill="#000" opacity=".25"/>' +
      '<path d="M48 400V300q0-56 62-66h80q62 10 62 66v100z" fill="' + NAVY2 + '"/>' +
      '<path d="M126 234l24 44 24-44z" fill="#fff"/>' +
      '<rect x="48" y="318" width="204" height="12" fill="' + ICE + '"/>' +
      '<g transform="translate(184,256) scale(.38)">' + lg + "</g>" +
      '<rect x="132" y="204" width="36" height="36" rx="8" fill="#D99A6C"/>' +
      '<circle cx="93" cy="168" r="12" fill="#E0A97E"/><circle cx="207" cy="168" r="12" fill="#E0A97E"/>' +
      '<circle cx="150" cy="162" r="58" fill="#E8B48A"/>' +
      '<path d="M90 152q0-60 60-60t60 60z" fill="' + NAVY2 + '"/>' +
      '<path d="M150 142q72-2 92 12-34 10-92 2z" fill="' + NAVY + '"/>' +
      '<circle cx="150" cy="118" r="11" fill="' + GOLD + '"/>' +
      '<ellipse cx="130" cy="172" rx="5.5" ry="7.5" fill="#2b1a10"/><ellipse cx="170" cy="172" rx="5.5" ry="7.5" fill="#2b1a10"/>' +
      '<circle cx="118" cy="190" r="9" fill="#f08a7a" opacity=".35"/><circle cx="182" cy="190" r="9" fill="#f08a7a" opacity=".35"/>' +
      '<path d="M130 192q20 18 40 0" stroke="#7a3e22" stroke-width="5" fill="none" stroke-linecap="round"/>' +
      '<path d="M238 306q38-30 30-86" stroke="' + NAVY2 + '" stroke-width="34" stroke-linecap="round" fill="none"/>' +
      '<circle cx="266" cy="208" r="22" fill="#E8B48A"/><rect x="257" y="166" width="15" height="32" rx="7.5" fill="#E8B48A"/>' +
      '<path d="M62 306q-20 40-6 80" stroke="' + NAVY2 + '" stroke-width="32" stroke-linecap="round" fill="none"/>' +
      "</svg>";
  }

  // ---------------- Overlay di atas gambar AC ----------------
  // Efek pada AC digambar di koordinat asli AC (560 x 150) lalu diskalakan ke
  // posisi AC di kartu; label & kondensor digambar langsung di koordinat kartu.
  function overlaySvg() {
    var A = RUCard.AC, x = 0, y = 0, w = 560, h = 150, bot = h, r = rng(7), i;
    function C(nx, ny) { return [+(A.x + nx * A.s).toFixed(1), +(A.y + ny * A.s).toFixed(1)]; }
    var defs = '<defs><clipPath id="ovclip"><rect x="0" y="0" width="560" height="150" rx="30"/></clipPath>' +
      '<pattern id="dust" width="18" height="18" patternUnits="userSpaceOnUse"><rect width="18" height="18" fill="#6b5236"/><circle cx="4" cy="5" r="3" fill="#8a7055"/><circle cx="13" cy="12" r="4" fill="#4d3a26"/><circle cx="12" cy="3" r="1.6" fill="#a08566"/></pattern>' +
      '<linearGradient id="beam" x1="0" x2="1"><stop offset="0" stop-color="' + ICE + '" stop-opacity="0"/><stop offset=".5" stop-color="' + ICE2 + '" stop-opacity=".9"/><stop offset="1" stop-color="' + ICE + '" stop-opacity="0"/></linearGradient>' +
      '<linearGradient id="shine" x1="0" x2="1"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".9"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>' +
      "</defs>";

    // angin dingin + salju (meluber ke bawah kartu → efek "keluar" dari kartu)
    var cold = "";
    for (i = 0; i < 7; i++) {
      var wx = 50 + i * 77;
      cold += '<path class="wind" style="animation-delay:' + (-i * 0.13).toFixed(2) + 's" d="M' + wx + " " + (bot + 6) + " C " + (wx - 40) + " " + (bot + 110) + ", " + (wx + 50) + " " + (bot + 220) + ", " + (wx + 6) + " " + (bot + 360) + '" stroke="' + (i % 3 === 1 ? "#5FC8EE" : i % 2 ? ICE2 : ICE) + '" stroke-width="16" stroke-linecap="round" fill="none"/>';
    }
    for (i = 0; i < 18; i++) {
      cold += '<circle class="snow" style="animation-delay:' + (r() * 2.6).toFixed(2) + 's" cx="' + (30 + r() * (w - 60)).toFixed(0) + '" cy="' + (bot + 10) + '" r="' + (7 + r() * 7).toFixed(1) + '" fill="#E6F9FF" stroke="' + ICE + '" stroke-width="3"/>';
    }

    // x-ray: isi AC
    var mesh = "", fins = "", blades = "", spots = "";
    for (i = 30; i < w - 30; i += 13) mesh += '<line x1="' + i + '" y1="12" x2="' + i + '" y2="38"/>';
    for (i = 26; i < w - 26; i += 9) fins += '<line x1="' + i + '" y1="46" x2="' + i + '" y2="92"/>';
    for (i = -20; i < w + 20; i += 16) blades += '<line x1="' + i + '" y1="100" x2="' + (i + 10) + '" y2="136"/>';
    for (i = 0; i < 14; i++) spots += '<circle cx="' + (40 + r() * (w - 80)).toFixed(0) + '" cy="' + (50 + r() * 40).toFixed(0) + '" r="' + (4 + r() * 6).toFixed(1) + '" fill="#2f4a22" opacity=".85"/>';
    var xray = '<g clip-path="url(#ovclip)">' +
      '<rect width="' + w + '" height="' + h + '" fill="#08182c"/>' +
      '<rect x="24" y="10" width="' + (w - 48) + '" height="30" rx="5" fill="#cfd8e3"/>' +
      '<g stroke="#9fb0c2" stroke-width="2">' + mesh + "</g>" +
      '<rect class="dirt" style="--t:.8s" x="24" y="10" width="' + (w - 48) + '" height="30" rx="5" fill="url(#dust)"/>' +
      '<rect x="20" y="44" width="' + (w - 40) + '" height="50" rx="4" fill="#3a4c60"/>' +
      '<g stroke="#c5d1dc" stroke-width="3">' + fins + "</g>" +
      '<path d="M20 58H' + (w - 20) + "M20 80H" + (w - 20) + '" stroke="#c87533" stroke-width="5"/>' +
      '<g class="dirt" style="--t:3.2s"><rect x="20" y="44" width="' + (w - 40) + '" height="50" rx="4" fill="url(#dust)" opacity=".85"/>' + spots + "</g>" +
      '<rect x="30" y="100" width="' + (w - 60) + '" height="38" rx="19" fill="#22364d"/>' +
      '<g class="blade" stroke="#7d93ab" stroke-width="4">' + blades + "</g>" +
      '<rect class="dirt" style="--t:5.6s" x="30" y="100" width="' + (w - 60) + '" height="38" rx="19" fill="#1d140b" opacity=".9"/>' +
      "</g>";

    // dampak: angin lemah, menetes, bau, kotor
    var weak = "", grime = "";
    for (i = 0; i < 5; i++) {
      var kx = 80 + i * 100;
      weak += '<path class="wind" d="M' + kx + " " + (bot + 6) + ' q -24 60 8 140" stroke="#8d97a3" stroke-width="14" stroke-linecap="round" fill="none" opacity=".75"/>';
    }
    [70, 250, w - 90].forEach(function (dx, k) {
      weak += '<path class="drip" style="animation-delay:' + k * 0.45 + 's" d="M' + dx + " " + (bot + 4) + ' q -16 28 0 40 q 16 -12 0 -40z" fill="' + ICE2 + '"/>';
    });
    [w - 160, w - 100, w - 40].forEach(function (sx, k) {
      weak += '<path class="smell" style="animation-delay:' + k * 0.5 + 's" d="M' + sx + ' -14 q 20 -24 0 -48 q -20 -24 0 -48" stroke="#7FB069" stroke-width="10" fill="none" stroke-linecap="round"/>';
    });
    for (i = 0; i < 22; i++) grime += '<circle cx="' + (20 + r() * (w - 40)).toFixed(0) + '" cy="' + (10 + r() * (h - 20)).toFixed(0) + '" r="' + (4 + r() * 9).toFixed(1) + '" fill="#6b5236" opacity="' + (0.35 + r() * 0.4).toFixed(2) + '"/>';
    grime = '<g clip-path="url(#ovclip)"><rect width="' + w + '" height="' + h + '" fill="#8a6a3e" opacity=".42"/>' + grime + "</g>";

    var scan = '<g clip-path="url(#ovclip)"><rect class="beam" x="-30" y="0" width="70" height="' + h + '" fill="url(#beam)"/></g>' +
      '<rect x="-10" y="-10" width="' + (w + 20) + '" height="' + (h + 20) + '" rx="36" fill="none" stroke="' + ICE + '" stroke-width="7" stroke-dasharray="22 14"/>';
    var band = '<g clip-path="url(#ovclip)"><rect class="band" x="-160" y="-20" width="160" height="' + (h + 40) + '" fill="url(#shine)"/></g>';

    // --- koordinat kartu ---
    var cx = 478, cy = 196, cg = "";
    for (i = 0; i < 6; i++) cg += '<line x1="' + (cx + 86) + '" y1="' + (cy + 14 + i * 12) + '" x2="' + (cx + 110) + '" y2="' + (cy + 14 + i * 12) + '"/>';
    var cond = '<rect x="' + cx + '" y="' + cy + '" width="118" height="92" rx="10" fill="#e8eef5"/>' +
      '<circle cx="' + (cx + 44) + '" cy="' + (cy + 46) + '" r="36" fill="#33475f"/>' +
      '<g class="spin"><ellipse cx="' + (cx + 44) + '" cy="' + (cy + 30) + '" rx="9" ry="16" fill="#9fb3c8"/><ellipse cx="' + (cx + 44) + '" cy="' + (cy + 62) + '" rx="9" ry="16" fill="#9fb3c8"/><ellipse cx="' + (cx + 28) + '" cy="' + (cy + 46) + '" rx="16" ry="9" fill="#9fb3c8"/><ellipse cx="' + (cx + 60) + '" cy="' + (cy + 46) + '" rx="16" ry="9" fill="#9fb3c8"/></g>' +
      '<g stroke="#9fb3c8" stroke-width="3">' + cg + "</g>" +
      '<rect class="dirt" style="--t:8s" x="' + cx + '" y="' + cy + '" width="118" height="92" rx="10" fill="url(#dust)" opacity=".85"/>';
    function pill(px, py, pw, text, t, pt) {
      return '<g style="--t:' + t + '"><line x1="' + px + '" y1="' + (py + 15) + '" x2="' + pt[0] + '" y2="' + pt[1] + '" stroke="' + GOLD + '" stroke-width="2.5"/>' +
        '<circle cx="' + pt[0] + '" cy="' + pt[1] + '" r="5" fill="' + GOLD + '"/>' +
        '<rect x="' + px + '" y="' + py + '" width="' + pw + '" height="30" rx="15" fill="' + GOLD + '"/>' +
        '<text x="' + (px + pw / 2) + '" y="' + (py + 20) + '" text-anchor="middle" font-family="Montserrat" font-weight="900" font-size="13.5" fill="' + NAVY + '">' + text + "</text></g>";
    }
    var lbl = pill(318, 62, 150, "1 · FILTER", ".6s", C(470, 25)) +
      pill(318, 104, 150, "2 · EVAPORATOR", "3s", C(470, 69)) +
      pill(318, 146, 150, "3 · BLOWER", "5.4s", C(470, 119)) +
      '<g style="--t:7.8s"><rect x="' + (cx - 16) + '" y="' + (cy - 38) + '" width="150" height="30" rx="15" fill="' + GOLD + '"/><text x="' + (cx + 59) + '" y="' + (cy - 18) + '" text-anchor="middle" font-family="Montserrat" font-weight="900" font-size="13.5" fill="' + NAVY + '">4 · KONDENSOR</text></g>';
    var ac0 = C(0, 0), ac1 = C(w, h);
    var shine = '<g class="tw">' + RUCard.sparkle(ac0[0] - 4, ac0[1] + 2, 15, GOLD) + '</g>' +
      '<g class="tw" style="animation-delay:.3s">' + RUCard.sparkle(ac1[0] + 4, ac0[1] + 16, 12, "#fff") + '</g>' +
      '<g class="tw" style="animation-delay:.6s">' + RUCard.sparkle(ac0[0] + 40, ac1[1] + 22, 10, GOLD) + '</g>' +
      '<g class="tw" style="animation-delay:.15s">' + RUCard.sparkle(ac1[0] - 30, ac1[1] + 26, 13, "#fff") + '</g>' +
      '<g class="ok"><rect x="' + ((ac0[0] + ac1[0]) / 2 - 70) + '" y="' + (ac1[1] + 14) + '" width="140" height="36" rx="18" fill="#2BD99A"/>' +
      '<text x="' + ((ac0[0] + ac1[0]) / 2) + '" y="' + (ac1[1] + 38) + '" text-anchor="middle" font-family="Montserrat" font-weight="900" font-size="17" fill="' + NAVY + '">✓ BERSIH</text></g>';

    var T = '<g transform="translate(' + A.x + "," + A.y + ") scale(" + A.s + ')">';
    return uniqueIds('<svg viewBox="0 0 900 550">' + defs +
      '<g class="g o-dim"><rect x="-40" y="-40" width="980" height="630" rx="20" fill="#06101f" opacity=".8"/></g>' +
      T +
      '<g class="g o-cold">' + cold + "</g>" +
      '<g class="g o-weak">' + weak + "</g>" +
      '<g class="o-ac">' + RUCard.acUnit({ noShadow: true }) + "</g>" +
      '<g class="g o-grime">' + grime + "</g>" +
      '<g class="g o-xray">' + xray + "</g>" +
      '<g class="g o-scan">' + scan + "</g>" +
      '<g class="g o-sweep">' + band + "</g>" +
      "</g>" +
      '<g class="g o-cond">' + cond + "</g>" +
      '<g class="g o-lbl">' + lbl + "</g>" +
      '<g class="g o-sweep">' + shine + "</g>" +
      "</svg>");
  }

  // id SVG harus unik per halaman (overlay AR & mode layar bisa ada bersamaan)
  var idSeq = 0;
  function uniqueIds(svg) {
    var u = "_ov" + (idSeq++);
    return svg.replace(/id="(ovclip|dust|beam|shine)"/g, 'id="$1' + u + '"').replace(/url\(#(ovclip|dust|beam|shine)\)/g, "url(#$1" + u + ")");
  }

  // ---------------- Before / after (ilustrasi bila belum ada foto) ----------------
  function finsSvg(dirty) {
    var r = rng(dirty ? 3 : 5), g = "", i;
    var bg = dirty ? "#4a3a28" : "#b9c7d4";
    for (i = 0; i < 860; i += 16) g += '<rect x="' + i + '" y="0" width="7" height="560" fill="' + (dirty ? "#7a6448" : "#eef4f9") + '"/>';
    [150, 300, 450].forEach(function (ty) { g += '<rect x="0" y="' + ty + '" width="860" height="24" fill="' + (dirty ? "#6b4a2b" : "#d4884a") + '"/>'; });
    if (dirty) {
      for (i = 0; i < 70; i++) g += '<circle cx="' + (r() * 860).toFixed(0) + '" cy="' + (r() * 560).toFixed(0) + '" r="' + (6 + r() * 22).toFixed(0) + '" fill="' + (r() > 0.7 ? "#2f4a22" : "#5e4a33") + '" opacity="' + (0.5 + r() * 0.4).toFixed(2) + '"/>';
    } else {
      for (i = 0; i < 6; i++) g += RUCard.sparkle((80 + r() * 700).toFixed(0), (60 + r() * 440).toFixed(0), 14 + r() * 16, "#fff");
    }
    return '<svg viewBox="0 0 860 560" preserveAspectRatio="xMidYMid slice"><rect width="860" height="560" fill="' + bg + '"/>' + g + "</svg>";
  }

  // ---------------- Daftar adegan ----------------
  function build(cfg) {
    var umur = Math.max(1, new Date().getFullYear() - cfg.tahunBerdiri);
    var s = [];

    s.push({ cls: "s-alive", ov: "alive", dur: 7000, temp: [30, 18, 900, 2200], html:
      '<div class="ru-kicker in">Kartu ini hidup ✨</div>' +
      '<h2 class="in" style="--d:150">Ini AC Anda.</h2>' +
      '<p class="ru-lead in" style="--d:400">Dinyalakan… udara dingin keluar, ruangan jadi nyaman. Semua terlihat baik-baik saja.</p>' +
      '<div class="bigtemp in" style="--d:700"><b class="tempMirror">30°</b><span>suhu ruangan<br>turun perlahan</span></div>' +
      '<div class="chips"><span class="pop" style="--d:2200">❄️ Sejuk</span><span class="pop" style="--d:2450">😌 Nyaman</span><span class="pop" style="--d:2700">👍 Normal</span></div>' });

    s.push({ cls: "s-q", ov: "question", dur: 5500, temp: [18, 18, 0, 0], html:
      '<div class="ru-kicker in">Tunggu dulu…</div>' +
      '<h2 class="in" style="--d:150">AC Anda mungkin<br>terlihat bersih.</h2>' +
      '<h2 class="in ru-gold" style="--d:900;margin-top:26px">Tapi bagaimana kondisi di dalamnya?</h2>' +
      '<div class="scanbox in" style="--d:500"><div class="t"><span>🔍 Memindai bagian dalam AC</span><span>x-ray</span></div><div class="track"><i></i></div></div>' });

    s.push({ cls: "s-x", ov: "xray", dur: 11000, temp: [18, 18, 0, 0], html:
      '<div class="ru-kicker in">Di balik casing</div>' +
      '<h2 class="in" style="--d:150">Yang tidak terlihat<br><span class="ru-red">dari luar</span></h2>' +
      '<div class="xl">' +
      '<div class="it in" style="--d:600"><div class="n">1</div><div><b>Filter tersumbat debu</b><span>Udara tertahan, AC harus kerja ekstra</span></div></div>' +
      '<div class="it in" style="--d:3000"><div class="n">2</div><div><b>Evaporator berkerak & berjamur</b><span>Dingin tidak menyebar, sumber bau apek</span></div></div>' +
      '<div class="it in" style="--d:5400"><div class="n">3</div><div><b>Blower kotor & berlendir</b><span>Hembusan melemah, debu ikut tertiup</span></div></div>' +
      '<div class="it in" style="--d:7800"><div class="n">4</div><div><b>Kondensor tertutup kotoran</b><span>Panas tak terbuang, kompresor terforsir</span></div></div>' +
      "</div>" });

    s.push({ cls: "s-imp", ov: "impact", dur: 8500, temp: [18, 27, 900, 3000], html:
      '<div class="ru-kicker in">Akibatnya</div>' +
      '<h2 class="in" style="--d:150">Kalau AC tidak<br>pernah di-service…</h2>' +
      '<div class="ind">' +
      '<div class="r down in" style="--d:400"><div class="t">AIRFLOW <em>↓ melemah</em></div><div class="tr"><i style="--a:96%;--b:48%"></i></div></div>' +
      '<div class="r down in" style="--d:550"><div class="t">COOLING <em>↓ kurang dingin</em></div><div class="tr"><i style="--a:94%;--b:42%"></i></div></div>' +
      '<div class="r up in" style="--d:700"><div class="t">ENERGY USE <em>↑ boros</em></div><div class="tr"><i style="--a:38%;--b:88%"></i></div></div>' +
      '<div class="r up in" style="--d:850"><div class="t">RISIKO KERUSAKAN <em>↑ tinggi</em></div><div class="tr"><i style="--a:18%;--b:94%"></i></div></div>' +
      '</div><p class="ind-note in" style="--d:2600">+ bau apek • air menetes • bunyi berisik</p>' });

    s.push({ cls: "s-sol", ov: "clean", dur: 8500, temp: [27, 18, 1500, 2200], html:
      '<div class="sol">' + techSvg() + '<div class="bubble in" style="--d:1100">Solusinya bukan menunggu AC rusak.</div></div>' +
      '<div class="pm in" style="--d:2300"><b>PREVENTIVE<br>MAINTENANCE.</b><span>Service rutin & terjadwal — AC awet, listrik hemat, udara tetap sehat.</span></div>' });

    s.push({ cls: "s-est", ov: "calm", dur: 9000, html:
      '<div class="ru-kicker in">Kenapa Rejeki Utama AC?</div>' +
      '<div class="est in" style="--d:200"><b>' + esc(cfg.tahunBerdiri) + '</b><span>ESTA-<br>BLISHED</span></div>' +
      '<p class="ru-lead in" style="--d:400;margin-top:6px">' + umur + " tahun menjaga AC tetap sejuk.</p>" +
      '<div class="tl">' + cfg.sejarah.map(function (x, i) {
        return '<div class="it in" style="--d:' + (700 + i * 450) + '"><div class="yr">' + esc(x.tahun) + '</div><div class="tx">' + esc(x.teks) + "</div></div>";
      }).join("") + "</div>" });

    s.push({ cls: "s-lay", ov: "calm", dur: 9000, html:
      '<div class="ru-kicker in">Yang kami kerjakan</div><h2 class="in" style="--d:150">Satu tim untuk<br><span class="ru-gold">semua kebutuhan AC</span></h2>' +
      '<div class="lg">' + cfg.layanan.map(function (x, i) {
        return '<div class="c pop" style="--d:' + (400 + i * 170) + '"><div class="ic"><svg viewBox="0 0 64 64">' + (ICONS[x.ikon] || ICONS.perbaikan) + "</svg></div><h3>" + esc(x.judul) + "</h3><p>" + esc(x.teks) + "</p></div>";
      }).join("") + "</div>" });

    s.push({ cls: "s-pj", ov: "calm", dur: 9500, html:
      '<div class="ru-kicker in">Proyek & klien</div><h2 class="in" style="--d:150">Sudah dipercaya<br><span class="ru-ice">rumah & bisnis</span></h2>' +
      '<div class="pj">' + cfg.proyek.map(function (x, i) {
        return '<div class="c in" style="--d:' + (400 + i * 250) + '"><div><b>' + esc(x.judul) + "</b><span>" + esc(x.detail) + "</span></div></div>";
      }).join("") + "</div>" +
      '<div class="kl-h in" style="--d:1200">KLIEN KAMI</div><div class="kl">' + cfg.klien.slice(0, 6).map(function (k, i) {
        var nama = typeof k === "string" ? k : k.nama, logo = typeof k === "string" ? "" : k.logo;
        if (logo) return '<div class="c pop" style="--d:' + (1350 + i * 120) + '"><img src="' + esc(logo) + '" alt="' + esc(nama) + '"></div>';
        var ini = nama.replace(/^(PT|CV)\s+/i, "").split(/\s+/).map(function (w) { return w[0]; }).join("").slice(0, 2).toUpperCase();
        return '<div class="c pop" style="--d:' + (1350 + i * 120) + '"><i style="background:' + CHIP_COLORS[i % CHIP_COLORS.length] + '">' + esc(ini) + "</i>" + esc(nama) + "</div>";
      }).join("") + "</div>" });

    var ba = cfg.beforeAfter && cfg.beforeAfter[0];
    s.push({ cls: "s-ba", ov: "calm", dur: 8500, html:
      '<div class="ru-kicker in">Bukti, bukan janji</div><h2 class="in" style="--d:150">Before <span class="ru-gold">&</span> after</h2>' +
      '<div class="ba in" style="--d:400">' +
      '<div class="l before">' + (ba ? '<img src="' + esc(ba.before) + '" alt="Sebelum">' : finsSvg(true)) + "</div>" +
      '<div class="l after">' + (ba ? '<img src="' + esc(ba.after) + '" alt="Sesudah">' : finsSvg(false)) + "</div>" +
      '<span class="tag b">SEBELUM</span><span class="tag a">SESUDAH</span></div>' +
      '<p class="ba-cap in" style="--d:700">' + esc(ba ? ba.caption : "Evaporator yang kami cuci — fotonya dikirim ke WA Anda setiap selesai service.") + "</p>" });

    s.push({ cls: "s-tm", ov: "calm", dur: 9000, html:
      '<div class="ru-kicker in">Kata pelanggan</div><h2 class="in" style="--d:150">Mereka sudah<br><span class="ru-ice">merasakan bedanya</span></h2>' +
      '<div class="tm">' + cfg.testimoni.slice(0, 2).map(function (t, i) {
        return '<div class="c in" style="--d:' + (450 + i * 500) + '"><div class="st">★★★★★</div><p>' + esc(t.teks) + '</p><div class="who">' + esc(t.nama) + " <span>— " + esc(t.peran) + "</span></div></div>";
      }).join("") + "</div>" });

    s.push({ cls: "s-why6", ov: "calm", dur: 9000, html:
      '<div class="ru-kicker in">Kenapa Rejeki Utama AC?</div><h2 class="in" style="--d:150">Kepercayaan dibangun<br><span class="ru-gold">dari layanan</span></h2>' +
      '<div class="why6">' + cfg.keunggulan.slice(0, 6).map(function (k, i) {
        return '<div class="c pop" style="--d:' + (400 + i * 160) + '"><svg viewBox="0 0 24 24">' + RUCard.lineIcon(k.ikon, 0, 0, 24, GOLD, 1.6) + "</svg><div><b>" + esc(k.judul) + "</b><span>" + esc(k.teks) + "</span></div></div>";
      }).join("") + '</div><p class="why-foot in" style="--d:1500">Cocok untuk restoran & kafe • hotel • kantor • rumah</p>' });

    s.push({ cls: "s-team", ov: "calm", dur: 9000, html:
      '<div class="ru-kicker in">Tim & standar kerja</div><h2 class="in" style="--d:150">Profesional, dari<br><span class="ru-gold">datang sampai pulang</span></h2>' +
      '<div class="team in" style="--d:400">' + (cfg.tim.foto ? '<img src="' + esc(cfg.tim.foto) + '" alt="Tim Rejeki Utama AC">' : techSvg("t") + techSvg("t") + techSvg("t")) +
      '<span class="cap">' + esc(cfg.tim.jumlah) + "</span></div>" +
      '<div class="sop">' + cfg.standar.slice(0, 6).map(function (x, i) {
        return '<div class="in" style="--d:' + (700 + i * 160) + '"><em>✓</em>' + esc(x) + "</div>";
      }).join("") + "</div>" });

    s.push({ cls: "s-quiz", ov: "calm", dur: 0, interactive: true, quiz: true, html:
      '<div class="ru-kicker in">Cek 30 detik</div><h2 class="in" style="--d:150">Seberapa sehat<br><span class="ru-ice">AC Anda?</span></h2>' +
      '<div class="qz"></div>' });

    s.push({ cls: "s-end", ov: "calm", dur: 0, interactive: true, html:
      '<h2 class="in" style="--d:150">Jangan tunggu AC rusak untuk <span class="ru-gold">mulai peduli.</span></h2>' +
      '<div class="lg-wrap in" style="--d:600"><svg viewBox="0 0 100 100">' + RUCard.logo(0, 0, 100) + '</svg><div class="brand">REJEKI UTAMA AC<small>' + esc(cfg.subjudul) + '</small><em>SERVICE EXCELLENT <span>★★★★★</span></em></div></div>' +
      (cfg.promo && cfg.promo.judul ? '<div class="promo">' + esc(cfg.promo.judul) + "<b>" + esc(cfg.promo.kode) + "</b></div>" : "") +
      '<a class="btn-wa in" style="--d:900" target="_blank" rel="noopener" href="' + waLink(cfg, "Halo " + cfg.perusahaan + ", saya dapat kartu nama Anda dan mau konsultasi/booking service AC." + (cfg.promo && cfg.promo.kode ? " (kode " + cfg.promo.kode + ")" : "")) + '">' + WA_ICON + "WhatsApp Service</a>" +
      '<div class="row2"><a class="btn-w in" style="--d:1050" href="tel:' + esc(cfg.telepon.replace(/[^0-9+]/g, "")) + '">' + PHONE_ICON + 'Telepon</a><a class="btn-w in vcard" style="--d:1200" href="#">' + USER_ICON + "Simpan Kontak</a></div>" +
      '<button class="again">↺ Putar ulang</button>' });
    return s;
  }

  // ---------------- Kuis ----------------
  var QUIZ = [
    { q: "Terakhir service AC kapan?", o: [["Kurang dari 3 bulan", 0], ["3 – 6 bulan lalu", 1], ["Lebih dari 6 bulan / lupa", 2]] },
    { q: "AC terasa kurang dingin?", o: [["Ya", 2], ["Tidak", 0]] },
    { q: "Ada bau atau suara aneh?", o: [["Ya", 2], ["Tidak", 0]] },
  ];
  function runQuiz(box, cfg, onNext) {
    var ans = [];
    function render() {
      var i = ans.length;
      if (i < QUIZ.length) {
        box.innerHTML = '<div class="anim"><div class="step">PERTANYAAN ' + (i + 1) + " / " + QUIZ.length + '</div><div class="q">' + QUIZ[i].q + '</div><div class="opts">' +
          QUIZ[i].o.map(function (o, k) { return '<button data-k="' + k + '">' + o[0] + "</button>"; }).join("") +
          '</div><button class="skip">Lewati kuis →</button></div>';
        box.querySelectorAll(".opts button").forEach(function (b) {
          b.onclick = function () { ans.push(+b.getAttribute("data-k")); render(); };
        });
        box.querySelector(".skip").onclick = onNext;
        return;
      }
      var score = ans.reduce(function (t, k, j) { return t + QUIZ[j].o[k][1]; }, 0);
      var lv = score <= 1 ? ["g", "🟢", "GOOD", "AC Anda dalam kondisi baik. Pertahankan dengan service rutin tiap 3–4 bulan."] :
               score <= 3 ? ["y", "🟡", "NEEDS ATTENTION", "Mulai ada tanda-tanda. Lebih murah dicek sekarang daripada diperbaiki nanti."] :
                            ["r", "🔴", "SERVICE RECOMMENDED", "AC Anda butuh perhatian segera sebelum kerusakan makin besar."];
      var detail = QUIZ.map(function (q, j) { return q.q.replace("?", "") + ": " + q.o[ans[j]][0]; }).join("; ");
      var msg = "Halo " + cfg.perusahaan + ", saya habis cek kesehatan AC lewat kartu nama Anda. Hasil: " + lv[2] + " (" + detail + "). Mau konsultasi gratis.";
      box.innerHTML = '<div class="anim"><div class="res ' + lv[0] + '"><div class="dot">' + lv[1] + '</div><div class="lv">' + lv[2] + "</div><p>" + lv[3] + "</p></div>" +
        '<a class="btn-wa" target="_blank" rel="noopener" href="' + waLink(cfg, msg) + '">' + WA_ICON + "Konsultasi Gratis</a>" +
        '<div class="row2"><button class="btn-w redo">↺ Ulangi</button><button class="btn-w nx">Lanjut →</button></div></div>';
      box.querySelector(".redo").onclick = function () { ans = []; render(); };
      box.querySelector(".nx").onclick = onNext;
    }
    render();
  }

  function vcard(cfg) {
    return ["BEGIN:VCARD", "VERSION:3.0", "N:;" + cfg.nama + ";;;", "FN:" + cfg.nama, "ORG:" + cfg.perusahaan, "TITLE:" + cfg.jabatan,
      "TEL;TYPE=CELL:" + cfg.telepon, "EMAIL:" + cfg.email, "NOTE:" + cfg.subjudul + " — " + cfg.tagline, "END:VCARD"].join("\r\n");
  }

  // ---------------- Mesin presentasi ----------------
  function mount(panelHost, ovHost, opts) {
    opts = opts || {};
    var cfg = window.RU, slides = build(cfg);
    var stage = document.createElement("div");
    stage.className = "ru-stage";
    stage.innerHTML = slides.map(function (x) { return '<section class="ru-slide ' + x.cls + '">' + x.html + "</section>"; }).join("") +
      '<div class="ru-tapL"></div><div class="ru-tapR"></div>' +
      '<div class="ru-bar">' + slides.map(function () { return "<i><b></b></i>"; }).join("") + "</div>";
    panelHost.appendChild(stage);

    var ov = document.createElement("div");
    ov.className = "ru-ov";
    ov.innerHTML = overlaySvg();
    ovHost.appendChild(ov);
    var tempEl = ov.querySelector(".ac-temp");
    tempEl.textContent = "--";

    var els = stage.querySelectorAll(".ru-slide"), bars = stage.querySelectorAll(".ru-bar i");
    var cur = -1, timer = null, startedAt = 0, remaining = 0, paused = false, tempAnim = 0, tempTimer = null;

    stage.querySelector(".vcard").addEventListener("click", function (e) {
      e.preventDefault();
      var a = document.createElement("a");
      a.href = URL.createObjectURL(new Blob([vcard(cfg)], { type: "text/vcard" }));
      a.download = "Rejeki-Utama-AC.vcf";
      document.body.appendChild(a); a.click(); a.remove();
    });
    stage.querySelector(".again").addEventListener("click", function () { go(0); });

    function setTemp(t) {
      var v = Math.round(t) + "°C";
      tempEl.textContent = v;
      stage.querySelectorAll(".tempMirror").forEach(function (m) { m.textContent = Math.round(t) + "°"; });
    }
    function animTemp(cfgT) {
      clearTimeout(tempTimer); cancelAnimationFrame(tempAnim);
      if (!cfgT) { setTemp(18); return; }
      var from = cfgT[0], to = cfgT[1], delay = cfgT[2], dur = cfgT[3];
      if (cfgT === slides[0].temp) tempEl.textContent = "--";
      else setTemp(from);
      tempTimer = setTimeout(function () {
        var t0 = performance.now();
        setTemp(from);
        (function tick(t) {
          var p = dur ? Math.min(1, (t - t0) / dur) : 1;
          setTemp(from + (to - from) * (1 - Math.pow(1 - p, 2)));
          if (p < 1) tempAnim = requestAnimationFrame(tick);
        })(t0);
      }, delay);
    }

    function schedule(ms) {
      clearTimeout(timer);
      remaining = ms; startedAt = Date.now();
      if (ms > 0 && !paused) timer = setTimeout(function () { go(cur + 1); }, ms);
    }

    function go(i) {
      if (i < 0) i = 0;
      if (i >= slides.length) i = slides.length - 1;
      if (cur >= 0) els[cur].classList.remove("on");
      cur = i;
      var sl = slides[i], el = els[i];
      void el.offsetWidth; // restart animasi CSS
      el.classList.add("on");
      stage.classList.toggle("interactive", !!sl.interactive);
      ov.className = "ru-ov"; void ov.getBoundingClientRect(); ov.className = "ru-ov ov-" + sl.ov;
      animTemp(sl.temp);
      if (sl.quiz) runQuiz(el.querySelector(".qz"), cfg, function () { go(cur + 1); });
      bars.forEach(function (b, k) {
        b.className = k < i ? "done" : k === i ? (sl.dur ? "cur" : "done") : "";
        b.style.setProperty("--dur", slides[k].dur / 1000 + "s");
        var fill = b.firstChild; fill.style.animation = "none"; void fill.offsetWidth; fill.style.animation = "";
      });
      if (opts.onChange) opts.onChange(i, slides.length);
      schedule(sl.dur);
    }

    stage.querySelector(".ru-tapR").addEventListener("click", function () { go(cur + 1); });
    stage.querySelector(".ru-tapL").addEventListener("click", function () { go(cur - 1); });
    bars.forEach(function (b, k) { b.addEventListener("click", function () { go(k); }); });

    function quizIndex() { for (var k = 0; k < slides.length; k++) if (slides[k].quiz) return k; return 0; }

    return {
      stage: stage, overlay: ov, count: slides.length, quizIndex: quizIndex(),
      start: function (at) { paused = false; stage.classList.remove("paused"); cur = -1; go(at || 0); },
      next: function () { go(cur + 1); },
      prev: function () { go(cur - 1); },
      go: go,
      pause: function () {
        if (paused) return;
        paused = true; stage.classList.add("paused"); clearTimeout(timer);
        remaining = Math.max(0, remaining - (Date.now() - startedAt));
      },
      resume: function () {
        if (!paused) return;
        paused = false; stage.classList.remove("paused");
        if (slides[cur] && slides[cur].dur) schedule(remaining || 1);
      },
      get index() { return cur; },
    };
  }

  window.RUShow = { mount: mount };
})();
