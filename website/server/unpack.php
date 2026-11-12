<?php
// Pembongkar deploy sekali pakai. GitHub Actions meng-upload site.zip dan file ini lewat FTP
// (hanya 2 transfer, karena firewall hosting membatasi banyak koneksi FTP), lalu memanggilnya
// lewat HTTPS dengan token acak per deploy. Setelah selesai, zip dan file ini menghapus diri.
// Zip dibaca dengan PHP murni: hosting tidak selalu mengaktifkan ekstensi zip atau phar.
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
$ext = [];
foreach (['curl', 'mbstring', 'openssl', 'fileinfo', 'gd', 'zlib', 'zip', 'phar', 'json'] as $e) $ext[$e] = extension_loaded($e);
if (!is_file($zip)) { http_response_code(404); exit(json_encode(['error' => 'site.zip tidak ditemukan', 'php' => PHP_VERSION, 'ext' => $ext])); }

function rrmdir(string $d): void
{
    if (!is_dir($d)) return;
    foreach (new RecursiveIteratorIterator(new RecursiveDirectoryIterator($d, FilesystemIterator::SKIP_DOTS), RecursiveIteratorIterator::CHILD_FIRST) as $f) {
        $f->isDir() ? @rmdir($f->getPathname()) : @unlink($f->getPathname());
    }
    @rmdir($d);
}

/** Bongkar zip (metode simpan/deflate) lewat central directory. Mengembalikan jumlah file. */
function extract_zip(string $zip, string $dest): int
{
    $fh = fopen($zip, 'rb');
    if (!$fh) throw new RuntimeException('Zip tidak bisa dibuka');
    $size = filesize($zip);
    $tail = min($size, 65557);
    fseek($fh, $size - $tail);
    $buf = fread($fh, $tail);
    $pos = strrpos($buf, "PK\x05\x06");
    if ($pos === false) throw new RuntimeException('Akhir zip tidak ditemukan');
    $eocd = unpack('vdisk/vcdisk/ventries/vtotal/Vcdsize/Vcdoffset', substr($buf, $pos + 4, 16));
    fseek($fh, $eocd['cdoffset']);
    $cd = fread($fh, $eocd['cdsize']);
    $count = 0;
    $p = 0;
    for ($i = 0; $i < $eocd['total']; $i++) {
        if (substr($cd, $p, 4) !== "PK\x01\x02") throw new RuntimeException('Central directory rusak');
        $h = unpack('vmade/vneed/vflag/vmethod/vtime/vdate/Vcrc/Vcsize/Vusize/vnlen/vxlen/vclen/vdisk/viattr/Veattr/Voffset', substr($cd, $p + 4, 42));
        $name = substr($cd, $p + 46, $h['nlen']);
        $p += 46 + $h['nlen'] + $h['xlen'] + $h['clen'];

        $name = str_replace('\\', '/', $name);
        if ($name === '' || $name[0] === '/' || preg_match('#(^|/)\.\.(/|$)#', $name)) throw new RuntimeException("Nama file tidak aman: $name");
        $target = "$dest/$name";
        if (str_ends_with($name, '/')) { if (!is_dir($target)) mkdir($target, 0755, true); continue; }

        fseek($fh, $h['offset']);
        $lh = unpack('Vsig/vneed/vflag/vmethod/vtime/vdate/Vcrc/Vcsize/Vusize/vnlen/vxlen', fread($fh, 30));
        if ($lh['sig'] !== 0x04034b50) throw new RuntimeException("Header lokal rusak: $name");
        fseek($fh, $h['offset'] + 30 + $lh['nlen'] + $lh['xlen']);
        $data = $h['csize'] > 0 ? fread($fh, $h['csize']) : '';
        if ($h['method'] === 8) $data = gzinflate($data);
        elseif ($h['method'] !== 0) throw new RuntimeException("Metode kompresi tidak didukung: $name");
        if ($data === false || strlen($data) !== $h['usize']) throw new RuntimeException("Isi file tidak lengkap: $name");
        if ((crc32($data) & 0xffffffff) !== $h['crc']) throw new RuntimeException("CRC tidak cocok: $name");

        $parent = dirname($target);
        if (!is_dir($parent)) mkdir($parent, 0755, true);
        if (file_put_contents($target, $data) === false) throw new RuntimeException("Gagal menulis: $name");
        $count++;
    }
    fclose($fh);
    return $count;
}

try {
    // Pustaka PHP dikirim utuh sebagai folder api/vendor: ganti versi lama sepenuhnya
    rrmdir("$dir/api/vendor");
    $count = extract_zip($zip, $dir);
    @unlink("$dir/api/vendor.phar");
    @unlink("$dir/.ftp-deploy-sync-state.json");
    @unlink($zip);
    @unlink(__FILE__);
    echo json_encode(['ok' => true, 'files' => $count, 'php' => PHP_VERSION, 'ext' => $ext]);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage(), 'php' => PHP_VERSION, 'ext' => $ext]);
}
