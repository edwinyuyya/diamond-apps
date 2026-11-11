<?php
// Pembongkar deploy sekali pakai. GitHub Actions meng-upload site.zip dan file ini lewat FTP
// (hanya 2 transfer, karena firewall hosting membatasi banyak koneksi FTP), lalu memanggilnya
// lewat HTTPS dengan token acak per deploy. Setelah selesai, zip dan file ini menghapus diri.
declare(strict_types=1);

$token = '__DEPLOY_TOKEN__';
if (strlen($token) < 32 || !hash_equals($token, (string) ($_GET['t'] ?? ''))) {
    http_response_code(403);
    exit('forbidden');
}
@set_time_limit(600);
header('Content-Type: application/json');

$dir = __DIR__;
$zip = "$dir/site.zip";
if (!is_file($zip)) { http_response_code(404); exit(json_encode(['error' => 'site.zip tidak ditemukan'])); }

function rrmdir(string $d): void
{
    foreach (new RecursiveIteratorIterator(new RecursiveDirectoryIterator($d, FilesystemIterator::SKIP_DOTS), RecursiveIteratorIterator::CHILD_FIRST) as $f) {
        $f->isDir() ? @rmdir($f->getPathname()) : @unlink($f->getPathname());
    }
    @rmdir($d);
}

try {
    if (class_exists('ZipArchive')) {
        $z = new ZipArchive();
        if ($z->open($zip) !== true) throw new RuntimeException('Zip tidak bisa dibuka');
        $count = $z->numFiles;
        if (!$z->extractTo($dir)) throw new RuntimeException('Gagal membongkar zip');
        $z->close();
    } else {
        $p = new PharData($zip);
        $count = count($p);
        $p->extractTo($dir, null, true);
    }
    // Sisa upload FTP lama yang tidak dipakai lagi (pustaka kini di api/vendor.phar)
    if (is_dir("$dir/api/vendor")) rrmdir("$dir/api/vendor");
    @unlink("$dir/.ftp-deploy-sync-state.json");
    @unlink($zip);
    @unlink(__FILE__);
    echo json_encode(['ok' => true, 'files' => $count, 'php' => PHP_VERSION]);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage(), 'php' => PHP_VERSION]);
}
