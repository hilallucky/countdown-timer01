<?php
/**
 * File upload endpoint for background media.
 * POST multipart/form-data, field name "file".
 * Saves into ../uploads/ under a random-safe name and returns its public URL.
 *
 * Response: { ok:true, url, type } | { ok:false, error }
 */

header("Content-Type: application/json");

$uploadDir = __DIR__ . "/../uploads/";
$publicBase = "uploads/"; // relative to index.php, used to build the URL the browser loads

$maxBytes = 80 * 1024 * 1024; // 80MB ceiling

$allowed = [
  "image/jpeg" => "jpg", "image/png" => "png", "image/gif" => "gif",
  "image/webp" => "webp",
  "video/mp4" => "mp4", "video/webm" => "webm", "video/ogg" => "ogv",
  "video/quicktime" => "mov",
];

function fail($msg) { echo json_encode(["ok" => false, "error" => $msg]); exit; }

if ($_SERVER["REQUEST_METHOD"] !== "POST" || empty($_FILES["file"])) {
  fail("No file received.");
}

$file = $_FILES["file"];

if ($file["error"] !== UPLOAD_ERR_OK) {
  fail("Upload failed (code " . $file["error"] . ").");
}
if ($file["size"] > $maxBytes) {
  fail("File is too large (max " . ($maxBytes / 1024 / 1024) . "MB).");
}

// Detect real MIME type server-side rather than trusting the client.
$finfo = finfo_open(FILEINFO_MIME_TYPE);
$mime = finfo_file($finfo, $file["tmp_name"]);
finfo_close($finfo);

if (!isset($allowed[$mime])) {
  fail("Unsupported file type: " . $mime);
}

if (!is_dir($uploadDir)) {
  mkdir($uploadDir, 0775, true);
}

$ext = $allowed[$mime];
$name = bin2hex(random_bytes(8)) . "." . $ext;
$dest = $uploadDir . $name;

if (!move_uploaded_file($file["tmp_name"], $dest)) {
  fail("Could not save file to server.");
}

$type = (strpos($mime, "video/") === 0) ? "video" : "image";

echo json_encode([
  "ok" => true,
  "url" => $publicBase . $name,
  "type" => $type,
]);
