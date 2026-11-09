<?php
// API dashboard /admin (dipanggil lewat /api/ig/...): upload, caption AI, persetujuan,
// jadwal, posting ke Instagram, dan daftar kiriman form reservasi/kelas.
declare(strict_types=1);
require __DIR__ . '/lib.php';

$path = trim(preg_replace('#^/api/ig/?#', '', parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH)), '/');
[$route, $id] = array_pad(explode('/', $path), 2, '');
$method = $_SERVER['REQUEST_METHOD'];

// Foto kiriman form: dibuka lewat tautan bertanda tangan, tanpa header admin
if ($route === 'file' && $method === 'GET') {
    $n = (string) ($_GET['n'] ?? '');
    if (!preg_match('/^[a-f0-9]{16}_[a-z_]+\.(jpg|png|webp)$/', $n) || !valid_file_sig($n, (int) ($_GET['e'] ?? 0), (string) ($_GET['s'] ?? ''))) {
        json_out(['error' => 'Tautan tidak valid'], 403);
    }
    $f = DATA . "/uploads/$n";
    if (!is_file($f)) json_out(['error' => 'File tidak ditemukan'], 404);
    header('Content-Type: ' . (mime_content_type($f) ?: 'image/jpeg'));
    header('Cache-Control: private, max-age=3600');
    readfile($f);
    exit;
}

if (!is_admin()) json_out(['error' => 'Kata sandi admin salah'], 401);
$body = in_array($method, ['POST', 'PATCH'], true) ? (json_decode((string) file_get_contents('php://input'), true) ?: []) : [];

try {
    if ($route === 'status' && $method === 'GET') {
        $env = ['ANTHROPIC_API_KEY' => secret('ANTHROPIC_API_KEY') !== '', 'IG_ACCESS_TOKEN' => ig_token() !== null];
        $ig = null; $igError = null;
        if ($env['IG_ACCESS_TOKEN']) { try { $ig = ig_account(); } catch (Throwable $e) { $igError = $e->getMessage(); } }
        json_out(['env' => $env, 'ig' => $ig, 'igError' => $igError]);
    }

    if ($route === 'posts' && $id === '' && $method === 'GET') json_out(['posts' => list_posts()]);

    if ($route === 'posts' && $id === '' && $method === 'POST') {
        if (empty($body['image'])) json_out(['error' => 'Foto belum dipilih'], 400);
        json_out(['post' => create_post((string) $body['image'], (string) ($body['kind'] ?? 'photo'), (string) ($body['note'] ?? ''), (string) ($body['caption'] ?? ''))]);
    }

    if ($route === 'posts' && $id !== '') {
        $post = get_post($id);
        if (!$post) json_out(['error' => 'Post tidak ditemukan'], 404);
        if ($method === 'DELETE') { delete_post($id); json_out(['ok' => true]); }
        if ($method === 'PATCH') {
            if (isset($body['caption']) && is_string($body['caption'])) $post['caption'] = $body['caption'];
            if (isset($body['note']) && is_string($body['note'])) $post['note'] = $body['note'];
            $action = $body['action'] ?? null;
            if ($action === 'regenerate') {
                $post['caption'] = write_caption(base64_encode((string) file_get_contents(MEDIA . "/$id.jpg")), $post['kind'], $post['note']);
            }
            if ($action === 'approve') {
                $post['scheduled_at'] = !empty($body['scheduled_at']) ? gmdate('Y-m-d\TH:i:s.000\Z', strtotime((string) $body['scheduled_at'])) : next_free_slot(list_posts());
                $post['status'] = 'scheduled'; $post['error'] = null;
            }
            if ($action === 'unschedule') { $post['status'] = 'review'; $post['scheduled_at'] = null; }
            $post = save_post($post);
            if ($action === 'publish_now') $post = publish_post($post);
            json_out(['post' => $post]);
        }
    }

    if ($route === 'promo-text' && $method === 'POST') {
        if (empty($body['topic'])) json_out(['error' => 'Topik promo belum diisi'], 400);
        json_out(write_promo_text((string) $body['topic']));
    }

    if ($route === 'submissions' && $id === '' && $method === 'GET') json_out(['submissions' => list_submissions()]);

    if ($route === 'submissions' && $id !== '' && $method === 'DELETE' && preg_match('/^[a-f0-9]{16}$/', $id)) {
        $s = read_json(DATA . "/submissions/$id.json");
        foreach ($s['files'] ?? [] as $name) @unlink(DATA . "/uploads/$name");
        @unlink(DATA . "/submissions/$id.json");
        json_out(['ok' => true]);
    }

    json_out(['error' => 'Tidak ditemukan'], 404);
} catch (Throwable $e) {
    json_out(['error' => $e->getMessage() ?: 'Terjadi kesalahan'], 500);
}
