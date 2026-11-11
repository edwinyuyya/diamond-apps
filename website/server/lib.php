<?php
// Logika bersama Diamond (versi hosting PHP/cPanel): penyimpanan file, admin,
// caption AI (Claude), Instagram API, dan kiriman form reservasi/kelas.
declare(strict_types=1);

// Di hosting, pustaka dibungkus jadi satu file vendor.phar supaya upload FTP cepat
require is_file(__DIR__ . '/vendor.phar') ? 'phar://' . __DIR__ . '/vendor.phar/autoload.php' : __DIR__ . '/vendor/autoload.php';

const SITE = 'https://muasolo.com';
const SLOT_DAYS = [1, 3, 5];      // Senin, Rabu, Jumat
const SLOT_HOUR_UTC = 12;         // 19.00 WIB

define('ROOT', dirname(__DIR__));         // folder website (public_html domain)
define('DATA', ROOT . '/data');           // data privat (diblokir .htaccess)
define('MEDIA', ROOT . '/m');             // gambar publik untuk Instagram

function secret(string $key): string
{
    static $s = null;
    if ($s === null) $s = is_file(__DIR__ . '/secrets.php') ? (array) require __DIR__ . '/secrets.php' : [];
    $v = $s[$key] ?? getenv($key);
    return is_string($v) ? $v : '';
}

function json_out($data, int $status = 200): void
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function ensure_dir(string $dir): void
{
    if (!is_dir($dir)) mkdir($dir, 0755, true);
}

function read_json(string $file)
{
    return is_file($file) ? json_decode((string) file_get_contents($file), true) : null;
}

function write_json(string $file, $data): void
{
    ensure_dir(dirname($file));
    file_put_contents($file . '.tmp', json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT), LOCK_EX);
    rename($file . '.tmp', $file);
}

function new_id(): string
{
    return bin2hex(random_bytes(8));
}

function is_admin(): bool
{
    $want = secret('ADMIN_KEY');
    $got = $_SERVER['HTTP_X_ADMIN_KEY'] ?? '';
    return $want !== '' && hash_equals($want, $got);
}

// Tautan bertanda tangan untuk melihat foto kiriman form dari /admin (tag <img> tidak bisa kirim header)
function signed_file_url(string $name): string
{
    $exp = time() + 3600;
    $sig = hash_hmac('sha256', $name . '|' . $exp, secret('ADMIN_KEY'));
    return '/api/ig/file?' . http_build_query(['n' => $name, 'e' => $exp, 's' => $sig]);
}

function valid_file_sig(string $name, int $exp, string $sig): bool
{
    return $exp > time() && secret('ADMIN_KEY') !== ''
        && hash_equals(hash_hmac('sha256', $name . '|' . $exp, secret('ADMIN_KEY')), $sig);
}

// ---------- Posts Instagram ----------
function list_posts(): array
{
    $posts = [];
    foreach (glob(DATA . '/posts/*.json') ?: [] as $f) {
        $p = read_json($f);
        if ($p) $posts[] = $p;
    }
    usort($posts, fn($a, $b) => strcmp($b['created_at'] ?? '', $a['created_at'] ?? ''));
    return $posts;
}

function get_post(string $id): ?array
{
    return preg_match('/^[a-f0-9]{16}$/', $id) ? read_json(DATA . "/posts/$id.json") : null;
}

function save_post(array $post): array
{
    $post['updated_at'] = gmdate('c');
    write_json(DATA . "/posts/{$post['id']}.json", $post);
    return $post;
}

function create_post(string $imageB64, string $kind, string $note, string $caption): array
{
    $bytes = base64_decode($imageB64, true);
    if ($bytes === false || strlen($bytes) < 1000 || strlen($bytes) > 8000000 || !@getimagesizefromstring($bytes)) {
        throw new RuntimeException('Foto tidak valid');
    }
    $id = new_id();
    ensure_dir(MEDIA);
    file_put_contents(MEDIA . "/$id.jpg", $bytes);
    $post = [
        'id' => $id, 'kind' => $kind === 'promo' ? 'promo' : 'photo', 'note' => $note,
        'image_url' => SITE . "/m/$id.jpg", 'caption' => $caption,
        'status' => 'review', 'scheduled_at' => null, 'ig_media_id' => null, 'error' => null,
        'created_at' => gmdate('c'),
    ];
    if ($post['caption'] === '') $post['caption'] = write_caption($imageB64, $post['kind'], $note);
    return save_post($post);
}

function delete_post(string $id): void
{
    @unlink(DATA . "/posts/$id.json");
    @unlink(MEDIA . "/$id.jpg");
}

function next_free_slot(array $posts): string
{
    $taken = [];
    foreach ($posts as $p) if (($p['status'] ?? '') === 'scheduled' && $p['scheduled_at']) $taken[$p['scheduled_at']] = true;
    $t = (int) (floor(time() / 3600) * 3600);
    for ($i = 0; $i < 24 * 120; $i++) {
        $t += 3600;
        if ((int) gmdate('G', $t) !== SLOT_HOUR_UTC || !in_array((int) gmdate('w', $t), SLOT_DAYS, true)) continue;
        if ($t - time() < 1800) continue;
        $iso = gmdate('Y-m-d\TH:i:s.000\Z', $t);
        if (!isset($taken[$iso])) return $iso;
    }
    throw new RuntimeException('Tidak ada slot kosong dalam 4 bulan ke depan');
}

// ---------- Caption AI (Claude) ----------
const BRAND = <<<TXT
Kamu adalah social media copywriter untuk Diamond Make Up Artist (@diamond.makeupartist), MUA di Solo (Surakarta) yang dipimpin Ing2 bersama tim (Ellyana, Monic, Davina, Risna, dan Clara untuk hair & hijab do).
Layanan: makeup pengantin, lamaran, prewedding, wisuda & party, sweet seventeen, maternity, mature makeup, photoshoot, kids makeup, hairdo & hijab do, serta makeup course privat.
Gaya brand: elegan, hangat, premium tapi tidak kaku. Bahasa Indonesia santai-sopan, sapa pembaca dengan "kak".
Aturan caption:
- Kalimat pertama adalah hook yang membuat orang berhenti scroll.
- 2-4 kalimat isi yang relevan dengan foto atau topik. Jangan mengarang nama klien, harga, atau promo yang tidak disebutkan.
- Ajakan reservasi: WhatsApp 0895 1261 4222 atau muasolo.com.
- Maksimal 3 emoji yang relevan.
- Tutup dengan 12-18 hashtag, wajib berisi #muasolo #muasurakarta #makeupartistsolo #diamondmakeupartist, sisanya sesuai foto.
- Tulis caption saja, tanpa pengantar atau penjelasan.
TXT;

function ask_claude(array $content, int $maxTokens = 2000): string
{
    if (secret('ANTHROPIC_API_KEY') === '') throw new RuntimeException('ANTHROPIC_API_KEY belum diisi');
    $client = new Anthropic\Client(apiKey: secret('ANTHROPIC_API_KEY'), baseUrl: secret('ANTHROPIC_BASE_URL') ?: null);
    $res = $client->beta->messages->create(
        model: 'claude-opus-5-5',
        maxTokens: $maxTokens,
        messages: [['role' => 'user', 'content' => $content]],
        system: BRAND,
        outputConfig: ['effort' => 'low'],
        fallbacks: 'default',
        betas: ['server-side-fallback-2026-07-01'],
    );
    if ($res->stopReason === 'refusal') throw new RuntimeException('AI menolak membuat caption untuk konten ini');
    $text = '';
    foreach ($res->content as $block) if ($block->type === 'text') $text .= $block->text;
    $text = trim($text);
    if ($text === '') throw new RuntimeException('Caption AI kosong');
    return $text;
}

function write_caption(?string $imageB64, string $kind, string $note): string
{
    $content = [];
    if ($imageB64) $content[] = ['type' => 'image', 'source' => ['type' => 'base64', 'mediaType' => 'image/jpeg', 'data' => $imageB64]];
    $content[] = ['type' => 'text', 'text' => $kind === 'promo'
        ? 'Buat caption Instagram untuk postingan promo/info Diamond. Topik: ' . ($note ?: '(lihat gambar)')
        : 'Buat caption Instagram untuk foto hasil makeup di atas.' . ($note ? " Keterangan dari tim: $note" : '')];
    return ask_claude($content);
}

function write_promo_text(string $topic): array
{
    $text = ask_claude([['type' => 'text', 'text' => "Buat materi postingan promo/info Instagram Diamond dengan topik: \"$topic\".
Balas HANYA dalam format JSON tanpa teks lain: {\"headline\": \"...\", \"subline\": \"...\", \"caption\": \"...\"}
- headline: maksimal 5 kata, untuk ditulis besar di gambar
- subline: maksimal 12 kata, penjelas singkat di gambar
- caption: caption Instagram lengkap sesuai aturan"]], 3000);
    if (!preg_match('/\{.*\}/s', $text, $m) || !is_array($j = json_decode($m[0], true))) {
        throw new RuntimeException('Format teks promo dari AI tidak terbaca');
    }
    return $j;
}

// ---------- Instagram ----------
function ig_base(): string
{
    return secret('IG_API_BASE') ?: 'https://graph.instagram.com';
}

function ig_token(): ?array
{
    $saved = read_json(DATA . '/token.json');
    if (!empty($saved['token'])) return $saved;
    $env = secret('IG_ACCESS_TOKEN');
    return $env !== '' ? ['token' => $env, 'refreshed_at' => null] : null;
}

function http_call(string $method, string $url, array $params = []): array
{
    $ch = curl_init();
    if ($method === 'GET') {
        curl_setopt($ch, CURLOPT_URL, $url . (str_contains($url, '?') ? '&' : '?') . http_build_query($params));
    } else {
        curl_setopt_array($ch, [CURLOPT_URL => $url, CURLOPT_POST => true, CURLOPT_POSTFIELDS => http_build_query($params)]);
    }
    curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 60]);
    $body = curl_exec($ch);
    $err = curl_error($ch);
    curl_close($ch);
    if ($body === false) throw new RuntimeException("Koneksi gagal: $err");
    $data = json_decode((string) $body, true);
    return is_array($data) ? $data : [];
}

function ig_call(string $path, array $params, string $method = 'POST'): array
{
    $t = ig_token();
    if (!$t) throw new RuntimeException('Instagram belum terhubung (IG_ACCESS_TOKEN belum diisi)');
    $data = http_call($method, ig_base() . $path, $params + ['access_token' => $t['token']]);
    if (isset($data['error'])) throw new RuntimeException('Instagram: ' . ($data['error']['message'] ?? 'error'));
    return $data;
}

function ig_account(): array
{
    return ig_call('/me', ['fields' => 'user_id,username'], 'GET');
}

// Token Instagram berlaku 60 hari; diperpanjang otomatis setiap 20 hari (maksimal 1 percobaan per hari)
function refresh_token_if_due(): array
{
    $t = ig_token();
    if (!$t) return ['refreshed' => false, 'reason' => 'IG_ACCESS_TOKEN belum diisi'];
    $age = $t['refreshed_at'] ? time() - strtotime($t['refreshed_at']) : PHP_INT_MAX;
    if ($age < 20 * 86400) return ['refreshed' => false];
    $last = read_json(DATA . '/token-attempt.json');
    if ($last && time() - strtotime($last['at']) < 86400) return ['refreshed' => false];
    write_json(DATA . '/token-attempt.json', ['at' => gmdate('c')]);
    $data = http_call('GET', ig_base() . '/refresh_access_token', ['grant_type' => 'ig_refresh_token', 'access_token' => $t['token']]);
    if (empty($data['access_token'])) return ['refreshed' => false, 'reason' => $data['error']['message'] ?? 'Gagal memperpanjang token'];
    write_json(DATA . '/token.json', ['token' => $data['access_token'], 'refreshed_at' => gmdate('c'), 'expires_in' => $data['expires_in'] ?? null]);
    return ['refreshed' => true];
}

function publish_post(array $post): array
{
    try {
        $c = ig_call('/me/media', ['image_url' => $post['image_url'], 'caption' => $post['caption']]);
        for ($i = 0; $i < 10; $i++) {
            $st = ig_call('/' . $c['id'], ['fields' => 'status_code'], 'GET');
            if (($st['status_code'] ?? '') === 'FINISHED') break;
            if (in_array($st['status_code'] ?? '', ['ERROR', 'EXPIRED'], true)) throw new RuntimeException("Instagram menolak gambar ({$st['status_code']})");
            usleep(1500000);
        }
        $pub = ig_call('/me/media_publish', ['creation_id' => $c['id']]);
        $permalink = null;
        try { $permalink = ig_call('/' . $pub['id'], ['fields' => 'permalink'], 'GET')['permalink'] ?? null; } catch (Throwable $e) {}
        $post = array_merge($post, ['status' => 'published', 'ig_media_id' => $pub['id'], 'permalink' => $permalink, 'published_at' => gmdate('c'), 'error' => null]);
    } catch (Throwable $e) {
        $post = array_merge($post, ['status' => 'failed', 'error' => $e->getMessage()]);
    }
    return save_post($post);
}

// ---------- Kiriman form website ----------
function list_submissions(): array
{
    $list = [];
    foreach (glob(DATA . '/submissions/*.json') ?: [] as $f) {
        $s = read_json($f);
        if (!$s) continue;
        foreach ($s['files'] ?? [] as $field => $name) $s['file_urls'][$field] = signed_file_url($name);
        $list[] = $s;
    }
    usort($list, fn($a, $b) => strcmp($b['created_at'], $a['created_at']));
    return $list;
}
