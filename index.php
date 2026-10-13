<?php
// Countdown Timer — main shell. All rendering happens client-side (app.js);
// PHP is used only to serve the page and to back the preset save/load API
// in api/presets.php (reads/writes data/presets.json).
?>
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Countdown Timer</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;700&family=JetBrains+Mono:wght@400;500;700&family=Inter:wght@400;500;600;700&family=Playfair+Display:wght@600;700&display=swap" rel="stylesheet">
<script src="https://cdn.tailwindcss.com"></script>
<link rel="stylesheet" href="assets/css/style.css?v=<?= filemtime(__DIR__ . '/assets/css/style.css') ?>">
</head>
<body class="bg-[#0F1115] text-[#EDEDEF] font-ui overflow-hidden h-screen w-screen">

<!-- ============ STAGE ============ -->
<div id="stage" class="relative w-screen h-screen overflow-hidden select-none">

  <!-- Background layers -->
  <div id="bg-color-a" class="bg-layer absolute inset-0"></div>
  <div id="bg-color-b" class="bg-layer absolute inset-0 opacity-0"></div>
  <div id="bg-media-wrap" class="absolute inset-0 hidden"></div>
  <div class="absolute inset-0 bg-black/0" id="bg-dim"></div>

  <!-- Timer content -->
  <div id="content-grid" class="absolute inset-0 grid grid-rows-3 grid-cols-3 p-6 md:p-12">
    <div id="title-slot" class="flex col-span-3"><div id="title-text" class="timer-title" contenteditable="false">Title/Session</div></div>
    <div id="time-slot" class="flex col-span-3 row-span-1" style="grid-column:1/4; grid-row:2/3;">
      <div id="time-wrap" class="w-full flex">
        <div id="time-text" class="timer-time">00:00</div>
        <!-- <div id="end-info-text" hidden style="font-size: 24px; text-align: center; margin-bottom: 12px;"></div> -->
         <div id="end-info-text" hidden style="position:absolute; top:25%; left:0; right:0; z-index:2; text-align:center; pointer-events:none;"></div>
      </div>
    </div>
  </div>

  <!-- Panel toggle -->
  <button id="panel-toggle" aria-label="Toggle settings"
    class="fixed top-4 right-4 z-30 w-11 h-11 rounded-full bg-[#1B1E25]/90 border border-white/10 flex items-center justify-center hover:bg-[#242832] transition-colors">
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
  </button>

  <!-- Run controls -->
  <div class="fixed bottom-5 left-1/2 -translate-x-1/2 z-30 flex gap-2">
    <button id="btn-start" class="run-btn bg-[#3DDC97] text-[#0F1115]">Start</button>
    <button id="btn-pause" class="run-btn bg-[#F2C14E] text-[#0F1115]" disabled>Pause</button>
    <button id="btn-reset" class="run-btn bg-[#3A3F4B] text-[#EDEDEF]">Reset</button>
  </div>
</div>

<!-- ============ SETTINGS PANEL ============ -->
<aside id="panel" class="fixed top-0 right-0 h-full w-[380px] max-w-[92vw] bg-[#151821] border-l border-white/10 z-40 translate-x-full transition-transform duration-300 overflow-y-auto">
  <div class="p-5 space-y-8 pb-24">
    <div class="flex items-center justify-between">
      <h1 class="font-display text-lg tracking-tight">Timer settings</h1>
      <button id="panel-close" class="text-white/50 hover:text-white text-xl leading-none">&times;</button>
    </div>

    <!-- Duration -->
    <section>
      <h2 class="panel-h">Duration & format</h2>
      <div class="grid grid-cols-4 gap-2">
        <label class="field"><span>Days</span><input id="d-days" type="number" min="0" value="0" class="num"></label>
        <label class="field"><span>Hrs</span><input id="d-hours" type="number" min="0" max="23" value="0" class="num"></label>
        <label class="field"><span>Min</span><input id="d-mins" type="number" min="0" max="59" value="0" class="num"></label>
        <label class="field"><span>Sec</span><input id="d-secs" type="number" min="0" max="59" value="10" class="num"></label>
      </div>
      <label class="field mt-3"><span>Display format</span>
        <select id="f-format" class="sel">
          <option value="auto">Auto (fits duration)</option>
          <option value="ss">SS</option>
          <option value="mmss">MM:SS</option>
          <option value="hhmmss" selected>HH:MM:SS</option>
          <option value="ddhhmmss">DD:HH:MM:SS</option>
        </select>
      </label>
      <label class="chk mt-2"><input id="f-unitnames" type="checkbox" checked> Show unit names (e.g. 05 Min 12 Sec)</label>
      <label class="chk mt-2"><input id="f-keep-negative" type="checkbox"> Keep counting below zero</label>
    </section>

    <!-- Title -->
    <section>
      <h2 class="panel-h">Title text</h2>
      <label class="field"><span>Text</span><textarea id="t-text" rows="3" class="txt w-full">Title/Session</textarea></label>
      <div class="grid grid-cols-2 gap-2 mt-2">
        <label class="field"><span>Font</span>
          <select id="t-font" class="sel">
            <option value="'Space Grotesk',sans-serif">Space Grotesk</option>
            <option value="'Inter',sans-serif" selected>Inter</option>
            <option value="'JetBrains Mono',monospace">JetBrains Mono</option>
            <option value="'Playfair Display',serif">Playfair Display</option>
            <option value="Georgia,serif">Georgia</option>
          </select>
        </label>
        <label class="field"><span>Size (px)</span><input id="t-size" type="number" min="10" max="200" value="40" class="num"></label>
      </div>
      <div class="grid grid-cols-3 gap-2 mt-2">
        <label class="chk"><input id="t-bold" type="checkbox" checked> Bold</label>
        <label class="chk"><input id="t-italic" type="checkbox"> Italic</label>
        <label class="field !flex-row items-center gap-2"><span>Color</span><input id="t-color" type="color" value="#EDEDEF" class="swatch"></label>
      </div>
      <div class="grid grid-cols-2 gap-2 mt-2">
        <label class="field"><span>Horizontal</span>
          <select id="t-h" class="sel"><option value="start">Left</option><option value="center" selected>Center</option><option value="end">Right</option></select>
        </label>
        <label class="field"><span>Vertical</span>
          <select id="t-v" class="sel"><option value="start" selected>Top</option><option value="center">Middle</option><option value="end">Bottom</option></select>
        </label>
      </div>
    </section>

    <!-- Time -->
    <section>
      <h2 class="panel-h">Time display</h2>
      <div class="grid grid-cols-2 gap-2">
        <label class="field"><span>Font</span>
          <select id="c-font" class="sel">
            <option value="'Space Grotesk',sans-serif" selected>Space Grotesk</option>
            <option value="'Inter',sans-serif">Inter</option>
            <option value="'JetBrains Mono',monospace">JetBrains Mono</option>
            <option value="'Playfair Display',serif">Playfair Display</option>
            <option value="Georgia,serif">Georgia</option>
          </select>
        </label>
        <label class="field"><span>Size (px)</span><input id="c-size" type="number" min="20" max="400" value="120" class="num"></label>
      </div>
      <div class="grid grid-cols-3 gap-2 mt-2">
        <label class="chk"><input id="c-bold" type="checkbox" checked> Bold</label>
        <label class="chk"><input id="c-italic" type="checkbox"> Italic</label>
        <label class="field !flex-row items-center gap-2"><span>Color</span><input id="c-color" type="color" value="#3DDC97" class="swatch"></label>
      </div>
      <div class="grid grid-cols-2 gap-2 mt-2">
        <label class="field"><span>Horizontal</span>
          <select id="c-h" class="sel"><option value="start">Left</option><option value="center" selected>Center</option><option value="end">Right</option></select>
        </label>
        <label class="field"><span>Vertical</span>
          <select id="c-v" class="sel"><option value="start">Top</option><option value="center" selected>Middle</option><option value="end">Bottom</option></select>
        </label>
      </div>
    </section>

    <!-- End state -->
    <section>
      <h2 class="panel-h">When timer ends</h2>
      <label class="field mt-2">
        <span>Text above end message</span>
        <input id="e-info-text" type="text" value="Your time is up!" class="txt">
      </label>

      <div class="grid grid-cols-3 gap-2 mt-2">
        <label class="field">
          <span>Font</span>
          <select id="e-info-font" class="sel">
            <option value="Inter, sans-serif">Inter</option>
            <option value="Arial, sans-serif">Arial</option>
            <option value="Georgia, serif">Georgia</option>
            <option value="'JetBrains Mono', monospace">JetBrains Mono</option>
          </select>
        </label>
        <label class="field">
          <span>Size (px)</span>
          <input id="e-info-size" type="number" min="10" max="120" value="40" class="num">
        </label>
        <label class="field !flex-row items-center gap-2">
          <span>Color</span>
          <input id="e-info-color" type="color" value="#EDEDEF" class="swatch">
        </label>
      </div>

      <label class="field mt-2">
        <span>Position</span>
        <select id="e-info-position" class="sel">
          <option value="top">Top, centered</option>
          <option value="left">Left</option>
          <option value="right">Right</option>
        </select>
      </label>

      <label class="field"><span>End message</span><input id="e-text" type="text" value="Time's up!" class="txt"></label>
      <label class="field mt-2"><span>Flicker colors</span></label>
      <div id="e-colors" class="flex flex-wrap gap-2 items-center"></div>
      <button id="e-color-add" class="mini-btn mt-2">+ Add color</button>
      <label class="field mt-3"><span>Flicker speed (ms per color/beep step)</span>
        <input id="e-speed" type="range" min="80" max="3500" step="10" value="500">
        <span id="e-speed-val" class="text-xs text-white/40">500 ms</span>
      </label>
      <label class="field mt-3"><span>Start beeping with this much time left</span>
        <div class="grid grid-cols-2 gap-2">
          <label class="field"><span>Min</span><input id="e-beep-mins" type="number" min="0" value="0" class="num"></label>
          <label class="field"><span>Sec</span><input id="e-beep-secs" type="number" min="0" max="59" value="0" class="num"></label>
        </div>
      </label>
      <label class="field mt-3"><span>Start blinking with this much time left</span>
        <div class="grid grid-cols-2 gap-2">
          <label class="field"><span>Min</span><input id="e-blink-mins" type="number" min="0" value="0" class="num"></label>
          <label class="field"><span>Sec</span><input id="e-blink-secs" type="number" min="0" max="59" value="0" class="num"></label>
        </div>
      </label>
      <label class="field mt-2 !flex-row items-center gap-2"><span>Blink color</span>
        <input id="e-blink-color" type="color" value="#F2C14E" class="swatch">
      </label>
      <label class="chk mt-3"><input id="e-beep" type="checkbox" checked> Enable beeping</label>
    </section>

    <!-- Background -->
    <section>
      <h2 class="panel-h">Background</h2>
      <label class="field"><span>Mode</span>
        <select id="bg-mode" class="sel">
          <option value="color">Color(s)</option>
          <option value="media">Image / video playlist</option>
        </select>
      </label>

      <div id="bg-color-panel" class="mt-2">
        <div id="bg-colors" class="flex flex-wrap gap-2 items-center"></div>
        <button id="bg-color-add" class="mini-btn mt-2">+ Add color</button>
        <label class="field mt-2"><span>Cycle every (sec, if 2+)</span><input id="bg-color-interval" type="number" min="1" value="6" class="num"></label>
      </div>

      <div id="bg-media-panel" class="mt-2 hidden">
        <div id="bg-media-list" class="space-y-2"></div>

        <div class="flex gap-2 mt-2">
          <input id="bg-media-url" type="text" placeholder="Image or video URL" class="txt flex-1">
          <button id="bg-media-add" class="mini-btn">Add</button>
        </div>

        <div class="mt-2">
          <label for="bg-media-file" class="mini-btn block text-center cursor-pointer">
            Upload image / video…
          </label>
          <input id="bg-media-file" type="file" accept="image/*,video/*" multiple class="hidden">
          <p id="bg-upload-status" class="text-xs text-white/40 mt-1"></p>
        </div>

        <label class="field mt-2"><span>Image duration (sec)</span><input id="bg-media-interval" type="number" min="1" value="8" class="num"></label>
        <label class="field mt-2"><span>Dim overlay (0–80%)</span><input id="bg-dim-range" type="range" min="0" max="80" value="0"></label>
      </div>
    </section>

    <!-- Presets -->
    <section>
      <h2 class="panel-h">Presets</h2>
      <div class="flex gap-2">
        <input id="preset-name" type="text" placeholder="Preset name" class="txt flex-1">
        <button id="preset-save" class="mini-btn">Save</button>
      </div>
      <div class="flex gap-2 mt-2">
        <select id="preset-select" class="sel flex-1"><option value="">Saved presets…</option></select>
        <button id="preset-load" class="mini-btn">Load</button>
        <button id="preset-delete" class="mini-btn danger">Del</button>
      </div>
      <p id="preset-status" class="text-xs text-white/40 mt-1"></p>
    </section>
  </div>
</aside>

<audio id="noop" hidden></audio>
<script src="assets/js/app.js?v=<?= filemtime(__DIR__ . '/assets/js/app.js') ?>"></script>
</body>
</html>
