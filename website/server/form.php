<?php
// Menerima kiriman form "Reservasi Makeup" dan "Daftar Makeup Course" dari website.
// Data disimpan privat di folder data/, dan (opsional) diberitahukan lewat email NOTIFY_EMAIL.
declare(strict_types=1);
require __DIR__ . '/lib.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') json_out(['error' => 'Metode tidak didukung'], 405);

// Bot biasanya mengisi kolom tersembunyi "website": terima diam-diam tanpa disimpan
if (trim((string) ($_POST['website'] ?? '')) !== '') json_out(['ok' => true]);

// Batasi 10 kiriman per IP per jam
$ipKey = hash('sha256', ($_SERVER['REMOTE_ADDR'] ?? '') . secret('ADMIN_KEY'));
$rateFile = DATA . "/rate/$ipKey.json";
$hits = array_filter((array) read_json($rateFile), fn($t) => $t > time() - 3600);
if (count($hits) >= 10) json_out(['error' => 'Terlalu banyak kiriman, coba lagi nanti'], 429);
$hits[] = time();
write_json($rateFile, array_values($hits));

$FIELDS = [
    'reservasi' => ['nama', 'whatsapp', 'tanggal', 'alamat', 'lokasi_maps', 'layanan', 'jam_mulai', 'jam_selesai', 'gaya_makeup', 'catatan'],
    'kelas' => ['nama', 'whatsapp', 'kelas', 'pengalaman', 'rencana_mulai', 'domisili', 'catatan'],
];
$form = (string) ($_POST['form-name'] ?? '');
if (!isset($FIELDS[$form])) json_out(['error' => 'Form tidak dikenal'], 400);

$data = [];
foreach ($FIELDS[$form] as $f) $data[$f] = mb_substr(trim((string) ($_POST[$f] ?? '')), 0, 2000);
if ($data['nama'] === '' || strlen(preg_replace('/\D/', '', $data['whatsapp'])) < 9) {
    json_out(['error' => 'Nama dan nomor WhatsApp wajib diisi dengan benar'], 422);
}

$id = new_id();
$files = [];
foreach (['foto_bare_face', 'foto_referensi'] as $field) {
    $up = $_FILES[$field] ?? null;
    if (!$up || ($up['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) continue;
    if ($up['size'] > 8000000) json_out(['error' => 'Ukuran foto maksimal 8 MB'], 413);
    $info = @getimagesize($up['tmp_name']);
    $ext = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp'][$info['mime'] ?? ''] ?? null;
    if (!$ext) continue;
    ensure_dir(DATA . '/uploads');
    $name = "{$id}_{$field}.$ext";
    move_uploaded_file($up['tmp_name'], DATA . "/uploads/$name");
    $files[$field] = $name;
}

$sub = ['id' => $id, 'form' => $form, 'data' => $data, 'files' => $files, 'created_at' => gmdate('c')];
write_json(DATA . "/submissions/$id.json", $sub);

$to = secret('NOTIFY_EMAIL');
if ($to !== '') {
    $title = $form === 'kelas' ? 'Pendaftaran Makeup Course' : 'Reservasi Makeup';
    $lines = [];
    foreach ($data as $k => $v) if ($v !== '') $lines[] = ucfirst(str_replace('_', ' ', $k)) . ": $v";
    if ($files) $lines[] = "\nFoto terlampir bisa dilihat di " . SITE . "/admin (tab Kiriman Form).";
    @mail($to, "[Diamond] $title baru: {$data['nama']}", implode("\n", $lines),
        "From: Diamond Website <noreply@muasolo.com>\r\nContent-Type: text/plain; charset=utf-8");
}

json_out(['ok' => true]);
