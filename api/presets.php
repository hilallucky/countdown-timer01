<?php
/**
 * Preset store API.
 * Storage: ../data/presets.json  ->  { "preset name": { ...config }, ... }
 *
 * GET  ?action=list                         -> { presets: ["name", ...] }
 * GET  ?action=load&name=NAME                -> { ok:true, config:{...} } | { ok:false, error }
 * POST ?action=save   body: {name, config}   -> { ok:true } | { ok:false, error }
 * POST ?action=delete&name=NAME              -> { ok:true } | { ok:false, error }
 */

header("Content-Type: application/json");

$dataFile = __DIR__ . "/../data/presets.json";

function readStore($file) {
  if (!file_exists($file)) return [];
  $raw = file_get_contents($file);
  $data = json_decode($raw, true);
  return is_array($data) ? $data : [];
}

function writeStore($file, $data) {
  $fp = fopen($file, "c+");
  if (!$fp) return false;
  if (flock($fp, LOCK_EX)) {
    ftruncate($fp, 0);
    rewind($fp);
    fwrite($fp, json_encode($data, JSON_PRETTY_PRINT));
    fflush($fp);
    flock($fp, LOCK_UN);
  }
  fclose($fp);
  return true;
}

$action = $_GET["action"] ?? "";

switch ($action) {

  case "list": {
    $store = readStore($dataFile);
    echo json_encode(["presets" => array_keys($store)]);
    break;
  }

  case "load": {
    $name = $_GET["name"] ?? "";
    $store = readStore($dataFile);
    if ($name === "" || !array_key_exists($name, $store)) {
      echo json_encode(["ok" => false, "error" => "Preset not found."]);
      break;
    }
    echo json_encode(["ok" => true, "config" => $store[$name]]);
    break;
  }

  case "save": {
    $body = json_decode(file_get_contents("php://input"), true);
    $name = trim($body["name"] ?? "");
    $config = $body["config"] ?? null;
    if ($name === "" || $config === null) {
      echo json_encode(["ok" => false, "error" => "Missing name or config."]);
      break;
    }
    $store = readStore($dataFile);
    $store[$name] = $config;
    writeStore($dataFile, $store);
    echo json_encode(["ok" => true]);
    break;
  }

  case "delete": {
    $name = $_GET["name"] ?? "";
    $store = readStore($dataFile);
    if (!array_key_exists($name, $store)) {
      echo json_encode(["ok" => false, "error" => "Preset not found."]);
      break;
    }
    unset($store[$name]);
    writeStore($dataFile, $store);
    echo json_encode(["ok" => true]);
    break;
  }

  default:
    echo json_encode(["ok" => false, "error" => "Unknown action."]);
}
