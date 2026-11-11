<?php
// API CRM Diamond (dipanggil lewat /api/crm/...): klien, jadwal job MUA, pembayaran/DP,
// murid makeup course, dan impor kiriman form website menjadi data CRM.
declare(strict_types=1);
require __DIR__ . '/lib.php';

const TEAM = ['Ing2', 'Ellyana', 'Monic', 'Davina', 'Risna', 'Clara'];

// Kolom yang boleh disimpan per koleksi (selain id, timestamps, pembayaran)
const FIELDS = [
    'clients' => ['nama', 'whatsapp', 'instagram', 'alamat', 'catatan'],
    'jobs' => ['client_id', 'tanggal', 'jam_mulai', 'jam_selesai', 'lokasi', 'lokasi_maps', 'layanan', 'gaya_makeup',
        'mua', 'hairdo', 'jumlah_orang', 'harga', 'status', 'catatan', 'foto'],
    'students' => ['nama', 'whatsapp', 'domisili', 'kelas', 'pengalaman', 'jadwal_sesi', 'harga', 'status', 'catatan'],
];
const NUMERIC = ['harga', 'jumlah_orang'];

function col_dir(string $c): string { return DATA . "/crm/$c"; }

function col_list(string $c): array
{
    $out = [];
    foreach (glob(col_dir($c) . '/*.json') ?: [] as $f) if ($r = read_json($f)) $out[] = $r;
    return $out;
}

function col_get(string $c, string $id): ?array
{
    return preg_match('/^[a-f0-9]{16}$/', $id) ? read_json(col_dir($c) . "/$id.json") : null;
}

function col_save(string $c, array $r): array
{
    $r['updated_at'] = gmdate('c');
    if (isset($r['pembayaran'])) {
        $paid = array_sum(array_map(fn($p) => (int) ($p['jumlah'] ?? 0), $r['pembayaran']));
        $r['dibayar'] = $paid;
        $r['sisa'] = max(0, (int) ($r['harga'] ?? 0) - $paid);
    }
    write_json(col_dir($c) . "/{$r['id']}.json", $r);
    return $r;
}

function clean(string $c, array $in, array $base = []): array
{
    foreach (FIELDS[$c] as $f) {
        if (!array_key_exists($f, $in)) continue;
        $v = $in[$f];
        if (in_array($f, NUMERIC, true)) $v = (int) preg_replace('/\D/', '', (string) $v);
        elseif ($f === 'foto' && is_array($v)) $v = array_values(array_filter($v, 'is_string'));
        else $v = mb_substr(trim((string) $v), 0, 4000);
        $base[$f] = $v;
    }
    return $base;
}

function new_record(string $c, array $in): array
{
    $r = clean($c, $in, ['id' => new_id(), 'created_at' => gmdate('c')]);
    if ($c === 'clients' && ($r['nama'] ?? '') === '') throw new InvalidArgumentException('Nama klien wajib diisi');
    if ($c === 'students' && ($r['nama'] ?? '') === '') throw new InvalidArgumentException('Nama murid wajib diisi');
    if ($c === 'jobs') {
        if (empty($r['client_id']) || !col_get('clients', $r['client_id'])) throw new InvalidArgumentException('Pilih klien untuk job ini');
        if (empty($r['tanggal'])) throw new InvalidArgumentException('Tanggal job wajib diisi');
        $r['status'] = $r['status'] ?? 'tentatif';
    }
    if ($c === 'students') $r['status'] = $r['status'] ?? 'daftar';
    if ($c !== 'clients') $r['pembayaran'] = [];
    return col_save($c, $r);
}

// Normalisasi nomor WA untuk mencari klien yang sama (08xx = 628xx)
function wa_key(string $n): string
{
    $d = preg_replace('/\D/', '', $n);
    return str_starts_with($d, '0') ? '62' . substr($d, 1) : $d;
}

function find_client_by_wa(string $wa): ?array
{
    $k = wa_key($wa);
    if (strlen($k) < 9) return null;
    foreach (col_list('clients') as $c) if (wa_key($c['whatsapp'] ?? '') === $k) return $c;
    return null;
}

function minutes(?string $hhmm, int $fallback): int
{
    return preg_match('/^(\d{1,2}):(\d{2})/', (string) $hhmm, $m) ? (int) $m[1] * 60 + (int) $m[2] : $fallback;
}

// Job lain di tanggal sama yang jamnya bertabrakan dan memakai MUA/hairdo yang sama
function conflicts(array $job): array
{
    if (empty($job['tanggal'])) return [];
    $people = array_filter([$job['mua'] ?? '', $job['hairdo'] ?? '']);
    if (!$people) return [];
    $s = minutes($job['jam_mulai'] ?? null, 0);
    $e = minutes($job['jam_selesai'] ?? null, $s + 180);
    $hits = [];
    foreach (col_list('jobs') as $o) {
        if ($o['id'] === ($job['id'] ?? '') || ($o['tanggal'] ?? '') !== $job['tanggal'] || ($o['status'] ?? '') === 'batal') continue;
        $shared = array_intersect($people, array_filter([$o['mua'] ?? '', $o['hairdo'] ?? '']));
        if (!$shared) continue;
        $os = minutes($o['jam_mulai'] ?? null, 0);
        $oe = minutes($o['jam_selesai'] ?? null, $os + 180);
        if ($s < $oe && $os < $e) $hits[] = ['id' => $o['id'], 'jam' => trim(($o['jam_mulai'] ?? '') . '–' . ($o['jam_selesai'] ?? ''), '–'), 'orang' => array_values($shared)];
    }
    return $hits;
}

function with_client(array $job, array $clients): array
{
    $job['client'] = $clients[$job['client_id']] ?? null;
    $job['bentrok'] = conflicts($job);
    $job['foto_urls'] = array_map('signed_file_url', $job['foto'] ?? []);
    return $job;
}

function clients_by_id(): array
{
    $m = [];
    foreach (col_list('clients') as $c) $m[$c['id']] = ['id' => $c['id'], 'nama' => $c['nama'], 'whatsapp' => $c['whatsapp'] ?? ''];
    return $m;
}

// Kiriman form website -> klien + job (reservasi) atau murid (kelas)
function import_submission(string $sid): array
{
    $s = preg_match('/^[a-f0-9]{16}$/', $sid) ? read_json(DATA . "/submissions/$sid.json") : null;
    if (!$s) throw new InvalidArgumentException('Kiriman tidak ditemukan');
    if (!empty($s['imported'])) throw new InvalidArgumentException('Kiriman ini sudah dimasukkan ke CRM');
    $d = $s['data'];
    if ($s['form'] === 'kelas') {
        $rec = new_record('students', ['nama' => $d['nama'], 'whatsapp' => $d['whatsapp'], 'domisili' => $d['domisili'] ?? '',
            'kelas' => $d['kelas'] ?? '', 'pengalaman' => $d['pengalaman'] ?? '',
            'catatan' => trim(($d['rencana_mulai'] ?? '') !== '' ? "Rencana mulai: {$d['rencana_mulai']}\n" : '') . ($d['catatan'] ?? '')]);
        $s['imported'] = ['type' => 'student', 'id' => $rec['id']];
    } else {
        $client = find_client_by_wa($d['whatsapp']) ?? new_record('clients', ['nama' => $d['nama'], 'whatsapp' => $d['whatsapp'], 'alamat' => $d['alamat'] ?? '']);
        $rec = new_record('jobs', ['client_id' => $client['id'], 'tanggal' => $d['tanggal'] ?? '', 'jam_mulai' => $d['jam_mulai'] ?? '',
            'jam_selesai' => $d['jam_selesai'] ?? '', 'lokasi' => $d['alamat'] ?? '', 'lokasi_maps' => $d['lokasi_maps'] ?? '',
            'layanan' => $d['layanan'] ?? '', 'gaya_makeup' => $d['gaya_makeup'] ?? '', 'catatan' => $d['catatan'] ?? '',
            'foto' => array_values($s['files'] ?? []), 'status' => 'tentatif']);
        $s['imported'] = ['type' => 'job', 'id' => $rec['id'], 'client_id' => $client['id']];
    }
    write_json(DATA . "/submissions/$sid.json", $s);
    return $s['imported'];
}

// ---------- Router ----------
if (realpath($_SERVER['SCRIPT_FILENAME'] ?? '') !== __FILE__) return; // dipakai sebagai library (mis. oleh CS AI)
if (!is_admin()) json_out(['error' => 'Kata sandi admin salah'], 401);

$path = trim(preg_replace('#^/api/crm/?#', '', parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH)), '/');
[$col, $id, $sub] = array_pad(explode('/', $path), 3, '');
$method = $_SERVER['REQUEST_METHOD'];
$body = in_array($method, ['POST', 'PATCH'], true) ? (json_decode((string) file_get_contents('php://input'), true) ?: []) : [];

try {
    if ($col === 'meta') json_out(['team' => TEAM]);

    if ($col === 'summary') {
        $clients = clients_by_id();
        $today = (new DateTime('now', new DateTimeZone('Asia/Jakarta')))->format('Y-m-d');
        $jobs = array_map(fn($j) => with_client($j, $clients), col_list('jobs'));
        $upcoming = array_values(array_filter($jobs, fn($j) => ($j['tanggal'] ?? '') >= $today && ($j['status'] ?? '') !== 'batal'));
        usort($upcoming, fn($a, $b) => strcmp($a['tanggal'] . ($a['jam_mulai'] ?? ''), $b['tanggal'] . ($b['jam_mulai'] ?? '')));
        $students = col_list('students');
        $unpaid = array_values(array_filter(array_merge(
            array_map(fn($j) => $j + ['jenis' => 'job'], array_filter($jobs, fn($j) => ($j['status'] ?? '') !== 'batal')),
            array_map(fn($s) => $s + ['jenis' => 'murid'], $students)
        ), fn($r) => ($r['sisa'] ?? 0) > 0));
        $pending = 0;
        foreach (glob(DATA . '/submissions/*.json') ?: [] as $f) if (empty(read_json($f)['imported'])) $pending++;
        json_out([
            'today' => $today, 'upcoming' => array_slice($upcoming, 0, 15),
            'unpaid' => $unpaid, 'total_sisa' => array_sum(array_column($unpaid, 'sisa')),
            'active_students' => count(array_filter($students, fn($s) => in_array($s['status'] ?? '', ['daftar', 'berjalan'], true))),
            'pending_submissions' => $pending, 'clients' => count($clients),
        ]);
    }

    if ($col === 'import' && $method === 'POST') json_out(['imported' => import_submission($id)]);

    if (!isset(FIELDS[$col])) json_out(['error' => 'Tidak ditemukan'], 404);

    if ($id === '' && $method === 'GET') {
        $rows = col_list($col);
        if ($col === 'jobs') {
            $clients = clients_by_id();
            if (!empty($_GET['month'])) $rows = array_filter($rows, fn($j) => str_starts_with($j['tanggal'] ?? '', (string) $_GET['month']));
            if (!empty($_GET['client'])) $rows = array_filter($rows, fn($j) => ($j['client_id'] ?? '') === $_GET['client']);
            $rows = array_map(fn($j) => with_client($j, $clients), array_values($rows));
            usort($rows, fn($a, $b) => strcmp(($a['tanggal'] ?? '') . ($a['jam_mulai'] ?? ''), ($b['tanggal'] ?? '') . ($b['jam_mulai'] ?? '')));
        } else {
            usort($rows, fn($a, $b) => strcasecmp($a['nama'] ?? '', $b['nama'] ?? ''));
        }
        json_out([$col => array_values($rows)]);
    }

    if ($id === '' && $method === 'POST') {
        $r = new_record($col, $body);
        json_out(['record' => $col === 'jobs' ? with_client($r, clients_by_id()) : $r]);
    }

    $r = col_get($col, $id);
    if (!$r) json_out(['error' => 'Data tidak ditemukan'], 404);

    if ($method === 'GET') json_out(['record' => $col === 'jobs' ? with_client($r, clients_by_id()) : $r]);

    if ($method === 'DELETE' && $sub === '') {
        if ($col === 'clients' && array_filter(col_list('jobs'), fn($j) => ($j['client_id'] ?? '') === $id)) {
            json_out(['error' => 'Klien masih punya job. Hapus job-nya dulu.'], 409);
        }
        @unlink(col_dir($col) . "/$id.json");
        json_out(['ok' => true]);
    }

    if ($sub === 'payments' && $col !== 'clients') {
        if ($method === 'POST') {
            $amt = (int) preg_replace('/\D/', '', (string) ($body['jumlah'] ?? ''));
            if ($amt <= 0) json_out(['error' => 'Jumlah pembayaran tidak valid'], 400);
            $r['pembayaran'][] = ['id' => new_id(), 'tanggal' => (string) ($body['tanggal'] ?? date('Y-m-d')), 'jumlah' => $amt,
                'metode' => mb_substr((string) ($body['metode'] ?? ''), 0, 60), 'ket' => mb_substr((string) ($body['ket'] ?? ''), 0, 200)];
        } elseif ($method === 'DELETE') {
            $pid = (string) ($_GET['pid'] ?? '');
            $r['pembayaran'] = array_values(array_filter($r['pembayaran'], fn($p) => $p['id'] !== $pid));
        }
        $r = col_save($col, $r);
        json_out(['record' => $col === 'jobs' ? with_client($r, clients_by_id()) : $r]);
    }

    if ($method === 'PATCH') {
        $r = col_save($col, clean($col, $body, $r));
        json_out(['record' => $col === 'jobs' ? with_client($r, clients_by_id()) : $r]);
    }

    json_out(['error' => 'Tidak ditemukan'], 404);
} catch (InvalidArgumentException $e) {
    json_out(['error' => $e->getMessage()], 400);
} catch (Throwable $e) {
    json_out(['error' => $e->getMessage() ?: 'Terjadi kesalahan'], 500);
}
