/*
 * Presentasi company profile Rejeki Utama AC.
 * Dipakai di mode AR (menempel di atas kartu) dan mode layar penuh.
 * Semua isi diambil dari config.js (window.RU).
 */
(function () {
  function esc(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function rp(n) { return "Rp " + Math.round(n).toLocaleString("id-ID"); }

  var ICONS = {
    cuci: '<path d="M8 20h48v14a6 6 0 0 1-6 6H14a6 6 0 0 1-6-6z" fill="#071A33"/><path d="M18 48c0 4-3 6-3 9M32 46c0 4-3 6-3 9M46 48c0 4-3 6-3 9" stroke="#fff" stroke-width="4" stroke-linecap="round" fill="none"/><circle cx="48" cy="27" r="3" fill="#8FE6FF"/>',
    freon: '<rect x="20" y="16" width="24" height="40" rx="10" fill="#071A33"/><rect x="26" y="8" width="12" height="10" rx="3" fill="#071A33"/><path d="M26 34h12" stroke="#8FE6FF" stroke-width="4" stroke-linecap="round"/>',
    pasang: '<path d="M14 50l18-18m6-6 8-8a6 6 0 0 1 8 8l-8 8M24 28l12 12" stroke="#071A33" stroke-width="7" stroke-linecap="round" fill="none"/>',
    perbaikan: '<path d="M40 10a14 14 0 0 0-13 19L10 46l8 8 17-17a14 14 0 0 0 19-13l-8 8-8-2-2-8z" fill="#071A33"/>',
    kontrak: '<rect x="14" y="8" width="36" height="48" rx="6" fill="#071A33"/><path d="M22 22h20M22 31h20M22 40h12" stroke="#8FE6FF" stroke-width="4" stroke-linecap="round"/>',
    unit: '<rect x="6" y="16" width="52" height="24" rx="7" fill="#071A33"/><path d="M14 33h36" stroke="#8FE6FF" stroke-width="3"/><path d="M20 46c0 3-2 5-2 8M32 46c0 3-2 5-2 8M44 46c0 3-2 5-2 8" stroke="#071A33" stroke-width="4" stroke-linecap="round" fill="none"/>',
  };
  var WA_ICON = '<svg viewBox="0 0 32 32" fill="currentColor"><path d="M16 3a13 13 0 0 0-11.2 19.6L3 29l6.6-1.7A13 13 0 1 0 16 3zm0 23.6a10.6 10.6 0 0 1-5.4-1.5l-.4-.2-3.9 1 1-3.8-.2-.4A10.6 10.6 0 1 1 16 26.6zm5.8-7.9c-.3-.2-1.9-.9-2.2-1s-.5-.2-.7.2-.8 1-1 1.2-.4.2-.7 0a8.7 8.7 0 0 1-4.3-3.8c-.3-.6.3-.5 1-1.7.1-.2 0-.4 0-.6l-1-2.4c-.3-.6-.5-.5-.7-.5h-.6a1.2 1.2 0 0 0-.9.4 3.6 3.6 0 0 0-1.1 2.7 6.3 6.3 0 0 0 1.3 3.3 14.4 14.4 0 0 0 5.5 4.9c2 .9 2.8 1 3.9.8a3.3 3.3 0 0 0 2.1-1.5 2.7 2.7 0 0 0 .2-1.5c-.1-.1-.3-.2-.6-.3z"/></svg>';
  var PHONE_ICON = '<svg viewBox="0 0 26 26" fill="currentColor"><path d="M5 2h5l2 6-3 2a13 13 0 0 0 6 6l2-3 6 2v5a2 2 0 0 1-2 2A20 20 0 0 1 3 4a2 2 0 0 1 2-2z"/></svg>';
  var USER_ICON = '<svg viewBox="0 0 26 26" fill="currentColor"><circle cx="13" cy="8" r="6"/><path d="M1 25a12 10 0 0 1 24 0z"/></svg>';
  var IG_ICON = '<svg viewBox="0 0 26 26"><rect x="2" y="2" width="22" height="22" rx="7" fill="currentColor"/><circle cx="13" cy="13" r="5" fill="none" stroke="#fff" stroke-width="2.6"/></svg>';
  var CHIP_COLORS = ["#0C3363", "#19A7D6", "#C99700", "#2BB58A", "#E0555A", "#6B5BD6", "#0F7C9E", "#D9822B"];

  function logoSvg(cfg) {
    var inner = window.RUCard ? RUCard.logo(0, 0, 100, false) : "";
    return '<svg class="logo" viewBox="0 0 100 100">' + inner + "</svg>";
  }

  function whyIllustration() {
    function unit(fill, panel, vent) {
      var v = "";
      for (var i = 0; i < 7; i++) v += '<rect x="' + (250 + i * 48) + '" y="168" width="34" height="6" rx="3" fill="' + vent + '"/>';
      return '<rect x="210" y="70" width="420" height="125" rx="28" fill="' + fill + '"/><rect x="228" y="150" width="384" height="34" rx="12" fill="' + panel + '"/>' + v;
    }
    var dust = "", bugs = "", sparks = "";
    for (var i = 0; i < 14; i++) {
      dust += '<circle class="dust" cx="' + (240 + (i * 53) % 380) + '" cy="' + (200 + (i % 3) * 8) + '" r="' + (4 + (i % 3) * 2) + '" fill="#8a7a63" style="animation-delay:' + (i * 0.17).toFixed(2) + 's"/>';
    }
    [[260, 110], [400, 100], [560, 120], [330, 135], [500, 140]].forEach(function (p, i) {
      bugs += '<g class="bug" style="animation-delay:' + i * 0.2 + 's"><circle cx="' + p[0] + '" cy="' + p[1] + '" r="12" fill="#6BBF59"/><circle cx="' + (p[0] - 4) + '" cy="' + (p[1] - 3) + '" r="2.5" fill="#1d3b14"/><circle cx="' + (p[0] + 4) + '" cy="' + (p[1] - 3) + '" r="2.5" fill="#1d3b14"/></g>';
    });
    [[200, 80], [650, 90], [300, 330], [560, 360], [700, 250], [140, 260]].forEach(function (p, i) {
      var r = 10 + (i % 3) * 5;
      sparks += '<path transform="translate(' + p[0] + "," + p[1] + ')" d="M0 -' + r + "Q2 -2 " + r + " 0Q2 2 0 " + r + "Q-2 2 -" + r + " 0Q-2 -2 0 -" + r + 'Z" fill="#F5B800"/>';
    });
    var windD = "", windC = "";
    for (var k = 0; k < 5; k++) {
      var x = 260 + k * 80;
      windD += '<path class="wind" d="M' + x + " 205 C " + (x - 20) + " 260, " + (x + 30) + " 300, " + x + ' 400" stroke="#8d8d8d" stroke-width="7" fill="none" stroke-linecap="round" opacity=".7"/>';
      windC += '<path class="wind" d="M' + x + " 205 C " + (x - 20) + " 260, " + (x + 30) + " 300, " + x + ' 400" stroke="' + (k % 2 ? "#8FE6FF" : "#19C6F0") + '" stroke-width="9" fill="none" stroke-linecap="round"/>';
    }
    return '<svg viewBox="0 0 840 430">' +
      '<g class="dirty">' + unit("#d9d2bf", "#9b8b6c", "#6e604a") +
      '<rect x="240" y="88" width="360" height="40" rx="8" fill="#7b6a4d" opacity=".55"/>' + windD + dust + bugs +
      '<text x="420" y="58" text-anchor="middle" font-family="Montserrat" font-weight="800" font-size="22" fill="#FF8E91">⚠ 31°C — kok gak dingin?</text></g>' +
      '<g class="clean">' + unit("#ffffff", "#DCE8F4", "#B9CCE0") + windC + sparks +
      '<circle cx="590" cy="100" r="8" fill="#19C6F0"/>' +
      '<text x="420" y="58" text-anchor="middle" font-family="Montserrat" font-weight="800" font-size="22" fill="#8FE6FF">❄ 18°C — sejuk & hemat</text></g>' +
      "</svg>" +
      '<div class="lbl d dirty">AC jarang di-service</div><div class="lbl k clean">Setelah service Rejeki Utama AC</div>';
  }

  function build(cfg) {
    var tahunIni = new Date().getFullYear();
    var umur = Math.max(1, tahunIni - cfg.tahunBerdiri);
    var b = cfg.biaya;
    var maxCost = Math.max(b.serviceRutin, b.kompresorRusak);
    var persen = Math.round((b.serviceRutin / b.kompresorRusak) * 100);
    var waText = encodeURIComponent("Halo " + cfg.perusahaan + ", saya dapat kartu nama Anda. Mau booking service AC (kode promo " + cfg.promo.kode + ").");

    var s = [];
    // 1. Intro
    s.push({ cls: "s-intro", dur: 6500, html:
      logoSvg(cfg) +
      '<h2 class="in" style="--d:500">REJEKI UTAMA<span class="ac">AC</span></h2>' +
      '<p class="tag in" style="--d:800">' + esc(cfg.slogan) + "</p>" +
      '<div class="since in" style="--d:1200"><b data-count="' + umur + '">0</b><span>tahun menjaga AC<br>tetap sejuk sejak <b style="font-size:inherit;color:#8FE6FF">' + esc(cfg.tahunBerdiri) + "</b></span></div>" });
    // 2. Sejarah
    s.push({ cls: "s-tl", dur: 8000, html:
      '<div class="ru-kicker in">Perjalanan kami</div><h2 class="in" style="--d:150">Dari 1 motor,<br>jadi <span class="ru-gold">andalan bisnis</span></h2>' +
      '<div class="tl">' + cfg.sejarah.map(function (x, i) {
        return '<div class="it in" style="--d:' + (500 + i * 450) + '"><div class="yr">' + esc(x.tahun) + '</div><div class="tx">' + esc(x.teks) + "</div></div>";
      }).join("") + "</div>" });
    // 3. Angka
    s.push({ cls: "s-st", dur: 6500, html:
      '<div class="ru-kicker in">Dalam angka</div><h2 class="in" style="--d:150">Sudah dipercaya<br><span class="ru-ice">banyak orang</span></h2>' +
      '<div class="st">' + cfg.statistik.map(function (x, i) {
        return '<div class="c in" style="--d:' + (400 + i * 300) + '"><div class="n"><span data-count="' + x.angka + '">0</span>' + esc(x.akhiran) + '</div><div class="l">' + esc(x.label) + "</div></div>";
      }).join("") + "</div>" });
    // 4. Layanan
    s.push({ cls: "s-lay", dur: 8500, html:
      '<div class="ru-kicker in">Yang kami kerjakan</div><h2 class="in" style="--d:150">Satu nomor untuk<br><span class="ru-gold">semua urusan AC</span></h2>' +
      '<div class="lg">' + cfg.layanan.map(function (x, i) {
        return '<div class="c pop" style="--d:' + (400 + i * 180) + '"><div class="ic"><svg viewBox="0 0 64 64">' + (ICONS[x.ikon] || ICONS.cuci) + "</svg></div><h3>" + esc(x.judul) + "</h3><p>" + esc(x.teks) + "</p></div>";
      }).join("") + "</div>" });
    // 5. Klien
    s.push({ cls: "s-kl", dur: 7000, html:
      '<div class="ru-kicker in">Klien kami</div><h2 class="in" style="--d:150">Mereka sudah<br><span class="ru-ice">sejuk bersama kami</span></h2>' +
      '<div class="kl">' + cfg.klien.slice(0, 8).map(function (n, i) {
        var ini = n.replace(/^(PT|CV)\s+/i, "").split(/\s+/).map(function (w) { return w[0]; }).join("").slice(0, 2).toUpperCase();
        return '<div class="c pop" style="--d:' + (350 + i * 150) + '"><i style="background:' + CHIP_COLORS[i % CHIP_COLORS.length] + '">' + esc(ini) + "</i>" + esc(n) + "</div>";
      }).join("") + '</div><p class="kl-note in" style="--d:1700">…dan ratusan rumah tangga di ' + esc(cfg.areaLayanan) + "</p>" });
    // 6. Kenapa rajin service
    s.push({ cls: "s-why", dur: 10000, html:
      '<div class="ru-kicker in">Kenapa harus rutin?</div><h2 class="in" style="--d:150">AC kotor itu<br><span style="color:#FF8E91">musuh diam-diam</span></h2>' +
      '<div class="ill in" style="--d:350">' + whyIllustration() + "</div>" +
      '<div class="dg">' +
      '<div class="c pop" style="--d:900"><b>⚡ Listrik boros</b><span>Bisa naik hingga ' + esc(b.borosListrik) + "% karena AC kerja ekstra</span></div>" +
      '<div class="c pop" style="--d:1100"><b>🦠 Udara kotor</b><span>Debu, jamur & bakteri ikut terhirup keluarga</span></div>' +
      '<div class="c pop" style="--d:1300"><b>🔥 Kompresor jebol</b><span>Mesin dipaksa terus, umurnya jadi pendek</span></div>' +
      '<div class="c pop" style="--d:1500"><b>💧 Bocor & bau apek</b><span>Saluran buntu, air netes ke lantai & kasur</span></div>' +
      "</div>" });
    // 7. Hitung-hitungan
    s.push({ cls: "s-cost", dur: 8000, html:
      '<div class="ru-kicker in">Hitung-hitungan</div><h2 class="in" style="--d:150">Rawat sekarang,<br><span class="ru-gold">hemat jutaan</span></h2>' +
      '<div class="cmp">' +
      '<div class="row g in" style="--d:350"><div class="t">Service rutin 4× setahun <b>' + rp(b.serviceRutin) + '</b></div><div class="track"><div class="fill" style="--w:' + (b.serviceRutin / maxCost * 100).toFixed(1) + '%"></div></div></div>' +
      '<div class="row r in" style="--d:550"><div class="t">Ganti kompresor rusak <b>' + rp(b.kompresorRusak) + '</b></div><div class="track"><div class="fill" style="--w:' + (b.kompresorRusak / maxCost * 100).toFixed(1) + '%"></div></div></div>' +
      "</div>" +
      '<div class="cost-big pop" style="--d:2300">Service rutin setahun cuma<br>±' + persen + "% dari biaya ganti kompresor</div>" +
      '<p class="cost-note in" style="--d:2600">*Perkiraan, belum termasuk hemat listrik tiap bulan.</p>' });
    // 8. Kenapa Rejeki Utama AC
    s.push({ cls: "s-vs", dur: 10000, html:
      '<div class="ru-kicker in">Kenapa kami?</div><h2 class="in" style="--d:150">Bukan sekadar<br><span class="ru-gold">tukang AC</span></h2>' +
      '<div class="vs"><div class="hd in" style="--d:350"><div class="a">Tempat lain</div><div class="b">Rejeki Utama AC</div></div>' +
      cfg.keunggulan.map(function (x, i) {
        return '<div class="r in" style="--d:' + (600 + i * 380) + '"><div class="a"><em>✕</em>' + esc(x[0]) + '</div><div class="b"><em>✓</em>' + esc(x[1]) + "</div></div>";
      }).join("") + "</div>" });
    // 9. CTA
    s.push({ cls: "s-cta", dur: 0, html:
      '<div class="ru-kicker in">Jangan buang kartunya!</div><h2 class="in" style="--d:150">Kartu ini<br><span class="ru-gold">bernilai uang</span></h2>' +
      '<div class="coupon"><div class="big">' + esc(cfg.promo.judul) + '</div><div class="code">' + esc(cfg.promo.kode) + "</div><p>" + esc(cfg.promo.detail) + "</p></div>" +
      '<div class="cta-btns">' +
      '<a class="wa in" style="--d:900" target="_blank" rel="noopener" href="https://wa.me/' + esc(cfg.whatsapp) + "?text=" + waText + '">' + WA_ICON + "Booking via WhatsApp</a>" +
      '<a class="in" style="--d:1050" href="tel:' + esc(cfg.telepon.replace(/[^0-9+]/g, "")) + '">' + PHONE_ICON + "Telepon</a>" +
      '<a class="in vcard" style="--d:1200" href="#">' + USER_ICON + "Simpan Kontak</a>" +
      "</div>" });
    return s;
  }

  function vcard(cfg) {
    return ["BEGIN:VCARD", "VERSION:3.0", "N:;" + cfg.nama + ";;;", "FN:" + cfg.nama, "ORG:" + cfg.perusahaan, "TITLE:" + cfg.jabatan,
      "TEL;TYPE=CELL:" + cfg.telepon, "EMAIL:" + cfg.email, "ADR;TYPE=WORK:;;" + cfg.alamat + ";;;;",
      "NOTE:" + cfg.tagline + " | Promo: " + cfg.promo.kode, "END:VCARD"].join("\r\n");
  }

  function countUp(el) {
    var target = +el.getAttribute("data-count"), t0 = performance.now(), dur = 1600;
    (function tick(t) {
      var p = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(target * e).toLocaleString("id-ID");
      if (p < 1) requestAnimationFrame(tick);
    })(t0);
  }

  function mount(host, opts) {
    opts = opts || {};
    var cfg = window.RU, slides = build(cfg);
    var stage = document.createElement("div");
    stage.className = "ru-stage";
    stage.innerHTML = slides.map(function (x) { return '<section class="ru-slide ' + x.cls + '">' + x.html + "</section>"; }).join("") +
      '<div class="ru-tapL"></div><div class="ru-tapR"></div>' +
      '<div class="ru-bar">' + slides.map(function () { return "<i><b></b></i>"; }).join("") + "</div>";
    host.appendChild(stage);

    var els = stage.querySelectorAll(".ru-slide"), bars = stage.querySelectorAll(".ru-bar i");
    var cur = -1, timer = null, startedAt = 0, remaining = 0, paused = false;

    stage.querySelector(".vcard").addEventListener("click", function (e) {
      e.preventDefault();
      var a = document.createElement("a");
      a.href = URL.createObjectURL(new Blob([vcard(cfg)], { type: "text/vcard" }));
      a.download = "Rejeki-Utama-AC.vcf";
      document.body.appendChild(a); a.click(); a.remove();
    });

    function schedule(ms) {
      clearTimeout(timer);
      remaining = ms; startedAt = Date.now();
      if (ms > 0 && !paused) timer = setTimeout(function () { go(cur + 1); }, ms);
    }

    function go(i) {
      if (i < 0) i = 0;
      if (i >= slides.length) i = slides.length - 1;
      if (i === cur) return;
      if (cur >= 0) els[cur].classList.remove("on");
      cur = i;
      var el = els[i];
      void el.offsetWidth; // restart animasi CSS
      el.classList.add("on");
      el.querySelectorAll("[data-count]").forEach(function (c) { c.textContent = "0"; setTimeout(function () { countUp(c); }, 900); });
      bars.forEach(function (b, k) {
        b.className = k < i ? "done" : k === i ? (slides[i].dur ? "cur" : "done") : "";
        b.style.setProperty("--dur", slides[k].dur / 1000 + "s");
        var fill = b.firstChild; fill.style.animation = "none"; void fill.offsetWidth; fill.style.animation = "";
      });
      if (opts.onChange) opts.onChange(i, slides.length);
      schedule(slides[i].dur);
    }

    stage.querySelector(".ru-tapR").addEventListener("click", function () { go(cur + 1); });
    stage.querySelector(".ru-tapL").addEventListener("click", function () { go(cur - 1); });
    bars.forEach(function (b, k) { b.addEventListener("click", function () { go(k); }); });

    return {
      stage: stage,
      start: function () { paused = false; stage.classList.remove("paused"); cur = -1; go(0); },
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
