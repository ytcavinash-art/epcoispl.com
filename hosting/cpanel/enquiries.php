<?php
declare(strict_types=1);
ini_set('display_errors', '0');
// PHP 8.1+. Keep the enquiry register outside the domain document root.
// Optional provider credentials belong in the hosting environment, never HTML.
function reply(int $status, array $payload): never {
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    header('X-Content-Type-Options: nosniff');
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}
function storage_dir(): string {
    $configured = getenv('ENQUIRY_DATA_DIR');
    $root = realpath($_SERVER['DOCUMENT_ROOT'] ?? dirname(__DIR__));
    if ($root === false) { $root = dirname(__DIR__); }
    $dir = $configured ?: dirname($root) . '/.epco-enquiries-' . substr(hash('sha256', $root), 0, 12);
    if (!is_dir($dir) && !mkdir($dir, 0700, true) && !is_dir($dir)) { throw new RuntimeException('Storage unavailable'); }
    $real = realpath($dir);
    if ($real === false || $real === $root || str_starts_with($real, $root . DIRECTORY_SEPARATOR)) { throw new RuntimeException('Private storage must be outside the document root'); }
    // Additional protection if a parent domain could otherwise serve this directory.
    if (file_put_contents($dir . '/.htaccess', "Require all denied\n", LOCK_EX) === false) { throw new RuntimeException('Storage protection unavailable'); }
    return $dir;
}
function housekeeping(string $dir): void {
    $days = max(1, (int)(getenv('ENQUIRY_RETENTION_DAYS') ?: 90));
    foreach (glob($dir . '/*.json') ?: [] as $file) {
        $name = basename($file);
        if (preg_match('/^[0-9a-f-]{36}\.json$/', $name) && filemtime($file) < time() - $days * 86400) { unlink($file); }
        if (preg_match('/^rate-[0-9a-f]{64}\.json$/', $name) && filemtime($file) < time() - 3600) { unlink($file); }
    }
}
function persist(string $filename, array $record): void {
    $json = json_encode($record, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT | JSON_THROW_ON_ERROR) . "\n";
    $temp = $filename . '.tmp-' . bin2hex(random_bytes(4));
    if (file_put_contents($temp, $json, LOCK_EX) !== strlen($json)) { throw new RuntimeException('Unable to save enquiry'); }
    chmod($temp, 0600);
    if (!rename($temp, $filename)) { throw new RuntimeException('Unable to finalise enquiry'); }
}
function notify(array $record): string {
    $key = getenv('RESEND_API_KEY'); $from = getenv('ENQUIRY_FROM');
    if (!$key || !$from) { return 'not-configured'; }
    if (!function_exists('curl_init')) { return 'failed'; }
    $text = "Reference: {$record['id']}\nName: {$record['name']}\nEmail: {$record['email']}\nPhone: {$record['phone']}\nService: {$record['service']}\n\n{$record['message']}";
    $curl = curl_init('https://api.resend.com/emails');
    curl_setopt_array($curl, [CURLOPT_POST => true, CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 10,
        CURLOPT_HTTPHEADER => ['Content-Type: application/json', 'Authorization: Bearer ' . $key, 'Idempotency-Key: ' . $record['id']],
        CURLOPT_POSTFIELDS => json_encode(['from' => $from, 'to' => [getenv('ENQUIRY_TO') ?: 'epcoispl@gmail.com'], 'reply_to' => $record['email'], 'subject' => 'EPCO enquiry: ' . $record['service'], 'text' => $text], JSON_THROW_ON_ERROR)]);
    $result = curl_exec($curl); $status = (int)curl_getinfo($curl, CURLINFO_RESPONSE_CODE); curl_close($curl);
    return $result !== false && $status >= 200 && $status < 300 ? 'sent' : 'failed';
}
try {
    if (PHP_SAPI === 'cli') {
        if (($argv[1] ?? '') !== '--cleanup') { fwrite(STDERR, "Use --cleanup for enquiry retention housekeeping.\n"); exit(1); }
        housekeeping(storage_dir()); echo "Enquiry housekeeping complete.\n"; exit;
    }
    if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') { header('Allow: POST'); reply(405, ['error' => 'Use the enquiry form to submit a request.']); }
    if (!preg_match('/^application\/json(?:;|$)/i', $_SERVER['CONTENT_TYPE'] ?? '')) { reply(415, ['error' => 'Please submit the website form.']); }
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    if ($origin !== '' && strtolower((string)parse_url($origin, PHP_URL_HOST)) !== strtolower(explode(':', $_SERVER['HTTP_HOST'] ?? '')[0])) { reply(403, ['error' => 'Submit the form from the EPCO website.']); }
    if (($_SERVER['HTTP_SEC_FETCH_SITE'] ?? '') === 'cross-site') { reply(403, ['error' => 'Cross-site submissions are not accepted.']); }
    $stream = fopen('php://input', 'rb'); $body = stream_get_contents($stream, 16385); fclose($stream);
    if ($body === false || strlen($body) > 16384) { reply(413, ['error' => 'The enquiry is too large.']); }
    try { $input = json_decode($body, true, 16, JSON_THROW_ON_ERROR); }
    catch (JsonException $error) { reply(400, ['error' => 'Invalid enquiry. Please reload and try again.']); }
    if (!is_array($input)) { reply(400, ['error' => 'Please complete the enquiry form.']); }
    $dir = storage_dir(); housekeeping($dir);
    // REMOTE_ADDR comes from the server, not an untrusted request header.
    $rateFile = $dir . '/rate-' . hash('sha256', $_SERVER['REMOTE_ADDR'] ?? 'unknown') . '.json';
    $lock = fopen($rateFile, 'c+');
    if (!$lock || !flock($lock, LOCK_EX)) { throw new RuntimeException('Rate limit unavailable'); }
    $rate = json_decode(stream_get_contents($lock) ?: '{}', true) ?: [];
    if (($rate['reset'] ?? 0) <= time()) { $rate = ['count' => 0, 'reset' => time() + 900]; }
    if ($rate['count'] >= 10) { flock($lock, LOCK_UN); fclose($lock); header('Retry-After: 900'); reply(429, ['error' => 'Too many attempts. Please try again later or call EPCO.']); }
    $rate['count']++; rewind($lock); ftruncate($lock, 0); $encodedRate = json_encode($rate);
    if (fwrite($lock, $encodedRate) !== strlen($encodedRate)) { throw new RuntimeException('Unable to update request limit'); }
    fflush($lock); flock($lock, LOCK_UN); fclose($lock); chmod($rateFile, 0600);
    $data = [];
    foreach (['name' => 100, 'email' => 120, 'phone' => 30, 'service' => 100, 'message' => 1200] as $key => $limit) {
        if (!isset($input[$key]) || !is_string($input[$key])) { reply(400, ['error' => 'Please complete all required fields.']); }
        $value = trim($input[$key]);
        $length = function_exists('mb_strlen') ? mb_strlen($value, 'UTF-8') : preg_match_all('/./us', $value);
        if ($length === false || $length > $limit || preg_match('/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/', $value)) { reply(400, ['error' => 'Please check the length and content of your enquiry.']); }
        $data[$key] = $value;
    }
    $services = __SERVICE_LIST__;
    if ($data['name'] === '' || $data['message'] === '' || !filter_var($data['email'], FILTER_VALIDATE_EMAIL) || strpbrk($data['email'], "\r\n") !== false || !in_array($data['service'], $services, true) || ($input['consent'] ?? false) !== true || !empty($input['website'])) { reply(400, ['error' => 'Please check your name, email, service, message and privacy acknowledgement.']); }
    $bytes = random_bytes(16); $bytes[6] = chr((ord($bytes[6]) & 15) | 64); $bytes[8] = chr((ord($bytes[8]) & 63) | 128); $hex = bin2hex($bytes);
    $id = substr($hex, 0, 8) . '-' . substr($hex, 8, 4) . '-' . substr($hex, 12, 4) . '-' . substr($hex, 16, 4) . '-' . substr($hex, 20);
    $record = ['id' => $id, 'createdAt' => gmdate('c')] + $data + ['privacyAcknowledged' => true, 'notification' => 'pending'];
    $filename = $dir . '/' . $id . '.json'; persist($filename, $record);
    try { $record['notification'] = notify($record); persist($filename, $record); }
    catch (Throwable $error) { error_log('EPCO enquiry saved; notification update could not be completed.'); }
    reply(201, ['ok' => true, 'reference' => $id, 'message' => 'Your enquiry has been received. Please keep this reference for follow-up.']);
} catch (Throwable $error) {
    error_log('EPCO enquiry processing failed.');
    if (PHP_SAPI === 'cli') { fwrite(STDERR, "Enquiry housekeeping could not be completed.\n"); exit(1); }
    reply(503, ['error' => 'We could not save your enquiry right now. Please try again or call +91 91674 85843.']);
}
