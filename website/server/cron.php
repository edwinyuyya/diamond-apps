<?php
// Dijalankan Cron Job cPanel tiap jam: memposting post terjadwal yang sudah waktunya
// dan memperpanjang token Instagram. Bisa lewat CLI, atau URL dengan ?key=ADMIN_KEY.
declare(strict_types=1);
require __DIR__ . '/lib.php';

if (PHP_SAPI !== 'cli' && !hash_equals(secret('ADMIN_KEY') ?: random_bytes(16), (string) ($_GET['key'] ?? ''))) {
    json_out(['error' => 'Forbidden'], 403);
}

$token = refresh_token_if_due();
$results = [];
foreach (list_posts() as $post) {
    if (($post['status'] ?? '') !== 'scheduled' || empty($post['scheduled_at']) || strtotime($post['scheduled_at']) > time()) continue;
    $done = publish_post($post);
    $results[] = ['id' => $done['id'], 'status' => $done['status'], 'error' => $done['error']];
}
$out = ['ran_at' => gmdate('c'), 'token' => $token, 'published' => $results];
write_json(DATA . '/cron-last.json', $out);
if (PHP_SAPI === 'cli') echo json_encode($out), "\n"; else json_out($out);
