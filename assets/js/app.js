(() => {
  "use strict";

  /* ---------------------------------------------------------------- */
  /* Shorthand + refs                                                   */
  /* ---------------------------------------------------------------- */
  const $ = (id) => document.getElementById(id);

  const el = {
    panel: $("panel"), panelToggle: $("panel-toggle"), panelClose: $("panel-close"),
    stage: $("stage"),
    eInfoText: $("e-info-text"),
    eInfoFont: $("e-info-font"),
    eInfoSize: $("e-info-size"),
    eInfoColor: $("e-info-color"),
    eInfoPosition: $("e-info-position"),
    endInfoText: $("end-info-text"),
    titleText: $("title-text"), titleSlot: $("title-slot"),
    timeText: $("time-text"), timeWrap: $("time-wrap"),
    contentGrid: $("content-grid"),
    btnStart: $("btn-start"), btnPause: $("btn-pause"), btnReset: $("btn-reset"),
    bgColorA: $("bg-color-a"), bgColorB: $("bg-color-b"), bgMediaWrap: $("bg-media-wrap"),
    bgDim: $("bg-dim"),
    // duration/format
    dDays: $("d-days"), dHours: $("d-hours"), dMins: $("d-mins"), dSecs: $("d-secs"),
    // fFormat: $("f-format"), fUnitNames: $("f-unitnames"),
    // In the duration/format refs:
    fFormat: $("f-format"), fUnitNames: $("f-unitnames"), fKeepNegative: $("f-keep-negative"),
    // title style
    tText: $("t-text"), tFont: $("t-font"), tSize: $("t-size"), tBold: $("t-bold"),
    tItalic: $("t-italic"), tColor: $("t-color"), tH: $("t-h"), tV: $("t-v"),
    // time style
    cFont: $("c-font"), cSize: $("c-size"), cBold: $("c-bold"), cItalic: $("c-italic"),
    cColor: $("c-color"), cH: $("c-h"), cV: $("c-v"),
    // end state
    eText: $("e-text"), eColors: $("e-colors"), eColorAdd: $("e-color-add"), eBeep: $("e-beep"),
    eBeepMins: $("e-beep-mins"), eBeepSecs: $("e-beep-secs"),
    eBlinkMins: $("e-blink-mins"), eBlinkSecs: $("e-blink-secs"), eBlinkColor: $("e-blink-color"),
    eSpeed: $("e-speed"), eSpeedVal: $("e-speed-val"),
    // background
    bgMode: $("bg-mode"), bgColorPanel: $("bg-color-panel"), bgMediaPanel: $("bg-media-panel"),
    bgColors: $("bg-colors"), bgColorAdd: $("bg-color-add"), bgColorInterval: $("bg-color-interval"),
    bgMediaList: $("bg-media-list"), bgMediaUrl: $("bg-media-url"), bgMediaAdd: $("bg-media-add"),
    bgMediaFile: $("bg-media-file"), bgUploadStatus: $("bg-upload-status"),
    bgMediaInterval: $("bg-media-interval"), bgDimRange: $("bg-dim-range"),
    // presets
    presetName: $("preset-name"), presetSave: $("preset-save"), presetSelect: $("preset-select"),
    presetLoad: $("preset-load"), presetDelete: $("preset-delete"), presetStatus: $("preset-status"),
  };

  /* ---------------------------------------------------------------- */
  /* State                                                              */
  /* ---------------------------------------------------------------- */
  let totalSeconds = 300;
  let remaining = 300;
  let running = false;
  let tickHandle = null;
  let startTimestamp = null;
  let elapsedMs = 0;
  let resolvedFormat = "mmss"; // resolved once at start when "auto" is chosen
  let ended = false;
  let overtimeHandle = null;
  let overtimeMessageVisible = false;
  let overtimeColorIdx = 0;

  let flickerHandle = null;
  let flickerColors = ["#ff3b3b", "#ffffff"];
  let flickerIdx = 0;

  let bgColors = ["#0F1115"];
  let bgColorTimer = null;
  let bgColorIdx = 0;

  let mediaList = []; // {type:'image'|'video', url}
  let mediaIdx = 0;
  let mediaTimer = null;

  let audioCtx = null;
  let beepTimer = null;
  let warningBeepTimer = null;

  /* ---------------------------------------------------------------- */
  /* Small color-chip / list helpers                                   */
  /* ---------------------------------------------------------------- */
  function buildColorChips(container, colors, onChange) {
    container.innerHTML = "";
    colors.forEach((c, i) => {
      const chip = document.createElement("div");
      chip.className = "color-chip";
      chip.innerHTML = `<input type="color" value="${c}">` +
        (colors.length > 1 ? `<span class="rm">&times;</span>` : "");
      chip.querySelector("input").addEventListener("input", (e) => {
        colors[i] = e.target.value; onChange();
      });
      const rm = chip.querySelector(".rm");
      if (rm) rm.addEventListener("click", () => { colors.splice(i, 1); buildColorChips(container, colors, onChange); onChange(); });
      container.appendChild(chip);
    });
  }

  function guessMediaType(url) {
    return /\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(url) ? "video" : "image";
  }

  function renderMediaList() {
    el.bgMediaList.innerHTML = "";
    mediaList.forEach((m, i) => {
      const row = document.createElement("div");
      row.className = "media-row";
      row.innerHTML = `<span class="type">${m.type}</span><span class="url">${m.url}</span><span class="rm">&times;</span>`;
      row.querySelector(".rm").addEventListener("click", () => {
        mediaList.splice(i, 1); renderMediaList(); setupBackgroundEngine();
      });
      el.bgMediaList.appendChild(row);
    });
  }

  /* ---------------------------------------------------------------- */
  /* Style application                                                  */
  /* ---------------------------------------------------------------- */
  function posClasses(h, v) {
    // returns tailwind-ish justify/align styles applied directly (avoids
    // needing to purge/whitelist dynamic classes with the Tailwind CDN build)
    const justify = { start: "flex-start", center: "center", end: "flex-end" }[h];
    const align = { start: "flex-start", center: "center", end: "flex-end" }[v];
    return { justify, align };
  }

  function applyTitleStyle() {
    el.titleText.textContent = el.tText.value;
    el.titleText.style.fontFamily = el.tFont.value;
    el.titleText.style.fontSize = el.tSize.value + "px";
    el.titleText.style.fontWeight = el.tBold.checked ? "700" : "400";
    el.titleText.style.fontStyle = el.tItalic.checked ? "italic" : "normal";
    el.titleText.style.color = el.tColor.value;
    el.titleText.style.textAlign = el.tH.value === "start" ? "left" : el.tH.value === "end" ? "right" : "center";
    const p = posClasses(el.tH.value, el.tV.value);
    el.titleSlot.style.justifyContent = p.justify;
    el.titleSlot.style.alignItems = p.align;
  }

  function applyTimeStyle() {
    el.timeText.style.fontFamily = el.cFont.value;
    el.timeText.style.fontSize = el.cSize.value + "px";
    el.timeText.style.fontWeight = el.cBold.checked ? "700" : "400";
    el.timeText.style.fontStyle = el.cItalic.checked ? "italic" : "normal";
    el.timeText.style.color = ended ? "" : el.cColor.value;
    el.timeText.style.textAlign = el.cH.value === "start" ? "left" : el.cH.value === "end" ? "right" : "center";
    const p = posClasses(el.cH.value, el.cV.value);
    el.timeWrap.style.justifyContent = p.justify;
    el.timeWrap.style.alignItems = p.align;
  }

  function applyEndInfoStyle() {
    const info = el.endInfoText;
    info.style.position = "absolute";
    info.style.zIndex = "2";
    info.style.pointerEvents = "none";
    info.style.fontFamily = el.eInfoFont.value;
    info.style.fontSize = `${Number(el.eInfoSize.value) || 40}px`;
    info.style.color = el.eInfoColor.value;
    info.style.transform = "";

    if (el.eInfoPosition.value === "left") {
      info.style.top = "50%";
      info.style.left = "5%";
      info.style.right = "auto";
      info.style.textAlign = "left";
      info.style.transform = "translateY(-50%)";
    } else if (el.eInfoPosition.value === "right") {
      info.style.top = "50%";
      info.style.left = "auto";
      info.style.right = "5%";
      info.style.textAlign = "right";
      info.style.transform = "translateY(-50%)";
    } else {
      info.style.top = "25%";
      info.style.left = "0";
      info.style.right = "0";
      info.style.textAlign = "center";
    }
  }

  /* ---------------------------------------------------------------- */
  /* Formatting                                                         */
  /* ---------------------------------------------------------------- */
  function pad(n) { return String(n).padStart(2, "0"); }

  function breakdown(totalSec) {
    const days = Math.floor(totalSec / 86400);
    const hours = Math.floor((totalSec % 86400) / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = Math.floor(totalSec % 60);
    return { days, hours, mins, secs };
  }

  function pickAutoFormat(totalSec) {
    if (totalSec < 60) return "ss";
    if (totalSec < 3600) return "mmss";
    if (totalSec < 86400) return "hhmmss";
    return "ddhhmmss";
  }

  function renderTime(sec) {
    const sign = sec < 0 ? "-" : "";
    const absoluteSec = Math.abs(sec);
    const b = breakdown(absoluteSec);
    const fmt = resolvedFormat;
    const showNames = el.fUnitNames.checked;

    let parts = [];
    if (fmt === "ss") parts = [["sec", absoluteSec]];
    if (fmt === "mmss") parts = [["min", Math.floor(absoluteSec / 60)], ["sec", b.secs]];
    if (fmt === "hhmmss") parts = [["hr", Math.floor(absoluteSec / 3600)], ["min", b.mins], ["sec", b.secs]];
    if (fmt === "ddhhmmss") parts = [["day", b.days], ["hr", b.hours], ["min", b.mins], ["sec", b.secs]];

    const labels = { day: "Days", hr: "Hours", min: "Min", sec: "Sec" };

    if (showNames) {
      el.timeText.innerHTML = sign + parts.map(([k, v]) =>
        `<span class="unit"><span class="num">${pad(v)}</span><span class="lbl">${labels[k]}</span></span>`
      ).join("");
    } else {
      el.timeText.textContent = sign + parts.map(([, v]) => pad(v)).join(":");
    }
  }

  function startOvertimeSequence() {
    if (overtimeHandle !== null) return;

    overtimeMessageVisible = false;
    overtimeColorIdx = 0;
    // el.stage.classList.add("flickering");
    showEndInfoText();

    const speed = Math.max(80, parseInt(el.eSpeed.value || "350", 10));
    overtimeHandle = setInterval(() => {
      const color = flickerColors[overtimeColorIdx] || "#ff3b3b";

      document.documentElement.style.setProperty("--flicker-color", color);
      el.timeText.style.color = color;

      overtimeMessageVisible = !overtimeMessageVisible;
      if (overtimeMessageVisible) {
        el.timeText.textContent = el.eText.value || ""; // || "Time's up!";
      } else {
        renderTime(remaining);
      }

      overtimeColorIdx = (overtimeColorIdx + 1) % Math.max(1, flickerColors.length);
    }, speed);
  }


  /* ---------------------------------------------------------------- */
  /* Background engine                                                  */
  /* ---------------------------------------------------------------- */
  function setupBackgroundEngine() {
    clearInterval(bgColorTimer); bgColorTimer = null;
    clearInterval(mediaTimer); mediaTimer = null;
    el.bgMediaWrap.innerHTML = "";

    const mode = el.bgMode.value;
    if (mode === "color") {
      el.bgMediaWrap.classList.add("hidden");
      el.bgColorA.style.display = "";
      el.bgColorB.style.display = "";
      bgColorIdx = 0;
      el.bgColorA.style.background = bgColors[0] || "#0F1115";
      el.bgColorB.style.opacity = 0;
      if (bgColors.length > 1) {
        const interval = Math.max(1, parseInt(el.bgColorInterval.value || "6", 10)) * 1000;
        bgColorTimer = setInterval(() => {
          const next = (bgColorIdx + 1) % bgColors.length;
          el.bgColorB.style.background = bgColors[next];
          el.bgColorB.style.opacity = 1;
          setTimeout(() => {
            el.bgColorA.style.background = bgColors[next];
            el.bgColorB.style.opacity = 0;
            bgColorIdx = next;
          }, 1200);
        }, interval);
      }
    } else {
      el.bgColorA.style.display = "none";
      el.bgColorB.style.display = "none";
      el.bgMediaWrap.classList.remove("hidden");
      mediaIdx = 0;
      if (!mediaList.length) return;
      mediaList.forEach((m) => {
        const node = document.createElement(m.type === "video" ? "video" : "img");
        node.src = m.url;
        if (m.type === "video") { node.muted = true; node.playsInline = true; node.loop = mediaList.length === 1; }
        el.bgMediaWrap.appendChild(node);
      });
      showMedia(0);
    }
  }

  function showMedia(i) {
    const nodes = [...el.bgMediaWrap.children];
    nodes.forEach((n, idx) => {
      n.classList.toggle("active", idx === i);
      if (n.tagName === "VIDEO") { idx === i ? n.play().catch(() => {}) : n.pause(); }
    });
    mediaIdx = i;
    clearInterval(mediaTimer); mediaTimer = null;
    clearMediaAdvance();
    const current = mediaList[i];
    if (!current) return;
    if (current.type === "video" && mediaList.length > 1) {
      const vid = nodes[i];
      vid.onended = () => showMedia((i + 1) % mediaList.length);
    } else if (current.type === "image") {
      const secs = Math.max(1, parseInt(el.bgMediaInterval.value || "8", 10));
      mediaTimer = setTimeout(() => showMedia((i + 1) % mediaList.length), secs * 1000);
    }
  }
  function clearMediaAdvance() { /* onended handlers self-clear via re-assignment */ }

  /* ---------------------------------------------------------------- */
  /* Background media uploads (real files, saved server-side)          */
  /* ---------------------------------------------------------------- */
  async function uploadFiles(fileList) {
    const files = [...fileList];
    for (const file of files) {
      el.bgUploadStatus.textContent = `Uploading ${file.name}…`;
      try {
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch("api/upload.php", { method: "POST", body: fd });
        const data = await res.json();
        if (data.ok) {
          mediaList.push({ type: data.type, url: data.url });
          renderMediaList();
          setupBackgroundEngine();
          el.bgUploadStatus.textContent = `Added ${file.name}.`;
        } else {
          el.bgUploadStatus.textContent = data.error || `Could not upload ${file.name}.`;
        }
      } catch (e) {
        el.bgUploadStatus.textContent = "Server unavailable — file upload needs this app running on a PHP server.";
      }
    }
  }

  /* ---------------------------------------------------------------- */
  /* Audio (Web Audio beep — no external sound file required)          */
  /* ---------------------------------------------------------------- */
  function ensureAudio() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === "suspended") audioCtx.resume();
  }
  function beep(freq = 880, dur = 0.15) {
    if (!el.eBeep.checked) return;
    ensureAudio();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = "square"; osc.frequency.value = freq;
    gain.gain.value = 0.06;
    osc.connect(gain).connect(audioCtx.destination);
    osc.start();
    gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + dur);
    osc.stop(audioCtx.currentTime + dur + 0.02);
  }

  /* ---------------------------------------------------------------- */
  /* Timer loop                                                         */
  /* ---------------------------------------------------------------- */
  function readDuration() {
    const d = parseInt(el.dDays.value || 0, 10);
    const h = parseInt(el.dHours.value || 0, 10);
    const m = parseInt(el.dMins.value || 0, 10);
    const s = parseInt(el.dSecs.value || 0, 10);
    return d * 86400 + h * 3600 + m * 60 + s;
  }

  function resetTimer(fullReset = true) {
    stopEndSequence();
    stopWarningBeep();
    ended = false;
    running = false;
    clearInterval(tickHandle); tickHandle = null;
    elapsedMs = 0; startTimestamp = null;
    el.stage.classList.remove("flickering");
    applyTimeStyle();
    totalSeconds = Math.max(0, readDuration());
    remaining = totalSeconds;
    resolvedFormat = el.fFormat.value === "auto" ? pickAutoFormat(totalSeconds) : el.fFormat.value;
    if (fullReset) el.timeText.innerHTML = "";
    renderTime(remaining);
    syncWarningBlink();
    el.endInfoText.hidden = true;
    el.btnStart.disabled = false; el.btnPause.disabled = true; el.btnPause.textContent = "Pause";
  }

  function startTimer() {
    if (ended) resetTimer(false);
    if (remaining <= 0 && !el.fKeepNegative.checked) startOvertimeSequence();
    running = true;
    el.btnStart.disabled = true; el.btnPause.disabled = false;
    startTimestamp = Date.now();
    syncWarningBlink();
    syncWarningBeep();
    clearInterval(tickHandle);
    tickHandle = setInterval(() => {
      const now = Date.now();
      const totalElapsedMs = elapsedMs + (now - startTimestamp);
      const newRemaining = totalSeconds - Math.floor(totalElapsedMs / 1000);
      if (newRemaining !== remaining) {
        remaining = newRemaining;

        if (remaining <= 0 && el.fKeepNegative.checked) {
          startOvertimeSequence();
        }

        if (!overtimeMessageVisible) renderTime(remaining);
        syncWarningBlink();
        syncWarningBeep();
        if (remaining <= 0 && !el.fKeepNegative.checked) endTimer();
      }
    }, 200);
  }

  function pauseTimer() {
    if (running && startTimestamp) elapsedMs += Date.now() - startTimestamp;
    running = false;
    clearInterval(tickHandle); tickHandle = null;
    syncWarningBlink();
    stopWarningBeep();
    el.btnStart.disabled = false; el.btnPause.disabled = true;
  }

  function endTimer() {
    running = false;
    ended = true;
    syncWarningBlink();
    clearInterval(tickHandle); tickHandle = null;
    stopWarningBeep();
    el.btnStart.disabled = true; el.btnPause.disabled = true;
    el.endInfoText.textContent = el.eInfoText.value;
    el.endInfoText.hidden = !el.eInfoText.value.trim();
    el.timeText.innerHTML = "";
    el.timeText.textContent = el.eText.value || ""; // || "Time's up!";
    startEndSequence();
  }

  function startEndSequence() {
    flickerIdx = 0;
    const speed = Math.max(80, parseInt(el.eSpeed.value || "500", 10));
    clearInterval(flickerHandle);

    const updateColor = () => {
      const colors = flickerColors.length ? flickerColors : ["#ff3b3b"];
      el.timeText.style.color = colors[flickerIdx % colors.length];
      flickerIdx++;
    };

    updateColor();
    flickerHandle = setInterval(updateColor, speed);

    clearInterval(beepTimer);
    beep(880, Math.min(0.18, speed / 1000));
    beepTimer = setInterval(() => beep(880, Math.min(0.18, speed / 1000)), speed * 2);
  }

  function showEndInfoText() {
    el.endInfoText.textContent = el.eInfoText.value.trim();
    applyEndInfoStyle();
    el.endInfoText.hidden = !el.endInfoText.textContent;
  }

  function warningThresholdSeconds() {
    return thresholdSeconds(el.eBeepMins, el.eBeepSecs);
  }

  function thresholdSeconds(minsInput, secsInput) {
    const mins = Math.max(0, parseInt(minsInput.value || "0", 10));
    const secs = Math.min(59, Math.max(0, parseInt(secsInput.value || "0", 10)));
    return mins * 60 + secs;
  }

  function syncWarningBlink() {
    const threshold = thresholdSeconds(el.eBlinkMins, el.eBlinkSecs);
    const shouldBlink = running && !ended && remaining > 0 && threshold > 0 && remaining <= threshold;
    el.stage.classList.toggle("warning-blinking", shouldBlink);
  }

  function applyWarningBlinkColor() {
    document.documentElement.style.setProperty("--warning-blink-color", el.eBlinkColor.value || "#F2C14E");
  }

  function syncWarningBeep() {
    const shouldBeep = running && el.eBeep.checked && warningThresholdSeconds() > 0 &&
      remaining > 0 && remaining <= warningThresholdSeconds();
    if (shouldBeep && warningBeepTimer === null) {
      const speed = Math.max(80, parseInt(el.eSpeed.value || "350", 10));
      beep(880, Math.min(0.18, speed / 1000));
      warningBeepTimer = setInterval(() => beep(880, Math.min(0.18, speed / 1000)), speed * 2);
    } else if (!shouldBeep) {
      stopWarningBeep();
    }
  }

  function stopWarningBeep() {
    clearInterval(warningBeepTimer); warningBeepTimer = null;
  }

  function stopEndSequence() {
    clearInterval(overtimeHandle);
    overtimeHandle = null;
    overtimeMessageVisible = false;
    clearInterval(flickerHandle); 
    flickerHandle = null;
    clearInterval(beepTimer); 
    beepTimer = null;
    el.stage.classList.remove("flickering");
  }

  /* ---------------------------------------------------------------- */
  /* Config gather / apply (used by presets)                           */
  /* ---------------------------------------------------------------- */
  function gatherConfig() {
    return {
      duration: { d: el.dDays.value, h: el.dHours.value, m: el.dMins.value, s: el.dSecs.value },
      format: el.fFormat.value, unitNames: el.fUnitNames.checked,
      title: {
        text: el.tText.value, font: el.tFont.value, size: el.tSize.value,
        bold: el.tBold.checked, italic: el.tItalic.checked, color: el.tColor.value,
        h: el.tH.value, v: el.tV.value,
      },
      time: {
        font: el.cFont.value, size: el.cSize.value, bold: el.cBold.checked,
        italic: el.cItalic.checked, color: el.cColor.value, h: el.cH.value, v: el.cV.value,
      },
      end: {
        text: el.eText.value, colors: flickerColors, beep: el.eBeep.checked, speed: el.eSpeed.value,
        beepMins: el.eBeepMins.value, beepSecs: el.eBeepSecs.value,
        blinkMins: el.eBlinkMins.value, blinkSecs: el.eBlinkSecs.value, blinkColor: el.eBlinkColor.value,
      },
      background: {
        mode: el.bgMode.value, colors: bgColors, colorInterval: el.bgColorInterval.value,
        media: mediaList, mediaInterval: el.bgMediaInterval.value, dim: el.bgDimRange.value,
      },
    };
  }

  function applyConfig(cfg) {
    if (!cfg) return;
    el.dDays.value = cfg.duration.d; el.dHours.value = cfg.duration.h;
    el.dMins.value = cfg.duration.m; el.dSecs.value = cfg.duration.s;
    el.fFormat.value = cfg.format; el.fUnitNames.checked = cfg.unitNames;

    el.tText.value = cfg.title.text; el.tFont.value = cfg.title.font; el.tSize.value = cfg.title.size;
    el.tBold.checked = cfg.title.bold; el.tItalic.checked = cfg.title.italic; el.tColor.value = cfg.title.color;
    el.tH.value = cfg.title.h; el.tV.value = cfg.title.v;

    el.cFont.value = cfg.time.font; el.cSize.value = cfg.time.size; el.cBold.checked = cfg.time.bold;
    el.cItalic.checked = cfg.time.italic; el.cColor.value = cfg.time.color; el.cH.value = cfg.time.h; el.cV.value = cfg.time.v;

    el.eText.value = cfg.end.text; flickerColors = cfg.end.colors.slice(); el.eBeep.checked = cfg.end.beep;
    el.eSpeed.value = cfg.end.speed || 350; el.eSpeedVal.textContent = el.eSpeed.value + " ms";
    el.eBeepMins.value = cfg.end.beepMins || "0"; el.eBeepSecs.value = cfg.end.beepSecs || "0";
    el.eBlinkMins.value = cfg.end.blinkMins || "0"; el.eBlinkSecs.value = cfg.end.blinkSecs || "0";
    el.eBlinkColor.value = cfg.end.blinkColor || "#F2C14E";
    applyWarningBlinkColor();
    buildColorChips(el.eColors, flickerColors, () => {});

    el.bgMode.value = cfg.background.mode; bgColors = cfg.background.colors.slice();
    el.bgColorInterval.value = cfg.background.colorInterval; mediaList = cfg.background.media.slice();
    el.bgMediaInterval.value = cfg.background.mediaInterval; el.bgDimRange.value = cfg.background.dim;

    buildColorChips(el.bgColors, bgColors, setupBackgroundEngine);
    renderMediaList();
    toggleBgPanels();
    applyDim();
    applyTitleStyle(); applyTimeStyle();
    setupBackgroundEngine();
    resetTimer();
  }

  function applyDim() { el.bgDim.style.background = `rgba(0,0,0,${el.bgDimRange.value / 100})`; }
  function toggleBgPanels() {
    const mediaMode = el.bgMode.value === "media";
    el.bgColorPanel.classList.toggle("hidden", mediaMode);
    el.bgMediaPanel.classList.toggle("hidden", !mediaMode);
  }

  /* ---------------------------------------------------------------- */
  /* Presets via PHP API                                                */
  /* ---------------------------------------------------------------- */
  async function refreshPresetList() {
    try {
      const res = await fetch("api/presets.php?action=list");
      const data = await res.json();
      el.presetSelect.innerHTML = `<option value="">Saved presets…</option>` +
        (data.presets || []).map((p) => `<option value="${p}">${p}</option>`).join("");
    } catch (e) { /* server not available (e.g. static preview) — presets simply won't list */ }
  }

  async function savePreset() {
    const name = el.presetName.value.trim();
    if (!name) { el.presetStatus.textContent = "Enter a preset name first."; return; }
    try {
      const res = await fetch("api/presets.php?action=save", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, config: gatherConfig() }),
      });
      const data = await res.json();
      el.presetStatus.textContent = data.ok ? `Saved "${name}".` : (data.error || "Could not save.");
      refreshPresetList();
    } catch (e) { el.presetStatus.textContent = "Server unavailable — run this on a PHP server to save presets."; }
  }

  async function loadPreset() {
    const name = el.presetSelect.value;
    if (!name) return;
    try {
      const res = await fetch("api/presets.php?action=load&name=" + encodeURIComponent(name));
      const data = await res.json();
      if (data.ok) { applyConfig(data.config); el.presetStatus.textContent = `Loaded "${name}".`; }
      else el.presetStatus.textContent = data.error || "Could not load.";
    } catch (e) { el.presetStatus.textContent = "Server unavailable."; }
  }

  async function deletePreset() {
    const name = el.presetSelect.value;
    if (!name) return;
    try {
      const res = await fetch("api/presets.php?action=delete&name=" + encodeURIComponent(name), { method: "POST" });
      const data = await res.json();
      el.presetStatus.textContent = data.ok ? `Deleted "${name}".` : (data.error || "Could not delete.");
      refreshPresetList();
    } catch (e) { el.presetStatus.textContent = "Server unavailable."; }
  }

  /* ---------------------------------------------------------------- */
  /* Wire up events                                                     */
  /* ---------------------------------------------------------------- */
  function bindEvents() {
    el.panelToggle.addEventListener("click", () => el.panel.classList.add("open"));
    el.panelClose.addEventListener("click", () => el.panel.classList.remove("open"));

    [el.eInfoFont, el.eInfoSize, el.eInfoColor, el.eInfoPosition].forEach((control) => {
      control.addEventListener("input", applyEndInfoStyle);
      control.addEventListener("change", applyEndInfoStyle);
    });

    [el.tText, el.tFont, el.tSize, el.tBold, el.tItalic, el.tColor, el.tH, el.tV]
      .forEach((n) => n.addEventListener("input", applyTitleStyle));
    [el.cFont, el.cSize, el.cBold, el.cItalic, el.cColor, el.cH, el.cV]
      .forEach((n) => n.addEventListener("input", applyTimeStyle));

    [el.dDays, el.dHours, el.dMins, el.dSecs, el.fFormat, el.fUnitNames]
      .forEach((n) => n.addEventListener("change", () => resetTimer()));

    el.btnStart.addEventListener("click", startTimer);
    el.btnPause.addEventListener("click", pauseTimer);
    el.btnReset.addEventListener("click", () => resetTimer());

    el.eColorAdd.addEventListener("click", () => {
      flickerColors.push("#ffffff"); buildColorChips(el.eColors, flickerColors, () => {});
    });
    el.eSpeed.addEventListener("input", () => {
      el.eSpeedVal.textContent = `${el.eSpeed.value} ms`; //el.eSpeed.value + " ms";
      if (ended) startEndSequence(); // live-apply new tempo while already flickering
    });
    [el.eBeepMins, el.eBeepSecs, el.eBeep].forEach((n) => n.addEventListener("input", syncWarningBeep));
    [el.eBlinkMins, el.eBlinkSecs].forEach((n) => n.addEventListener("input", syncWarningBlink));
    el.eBlinkColor.addEventListener("input", applyWarningBlinkColor);

    el.bgMode.addEventListener("change", () => { toggleBgPanels(); setupBackgroundEngine(); });
    el.bgColorAdd.addEventListener("click", () => {
      bgColors.push("#222222"); buildColorChips(el.bgColors, bgColors, setupBackgroundEngine); setupBackgroundEngine();
    });
    el.bgColorInterval.addEventListener("change", setupBackgroundEngine);
    el.bgMediaAdd.addEventListener("click", () => {
      const url = el.bgMediaUrl.value.trim();
      if (!url) return;
      mediaList.push({ type: guessMediaType(url), url });
      el.bgMediaUrl.value = "";
      renderMediaList(); setupBackgroundEngine();
    });
    el.bgMediaFile.addEventListener("change", (e) => {
      if (e.target.files.length) uploadFiles(e.target.files);
      e.target.value = ""; // allow re-selecting the same file later
    });
    el.bgMediaInterval.addEventListener("change", setupBackgroundEngine);
    el.bgDimRange.addEventListener("input", applyDim);

    el.presetSave.addEventListener("click", savePreset);
    el.presetLoad.addEventListener("click", loadPreset);
    el.presetDelete.addEventListener("click", deletePreset);
  }

  /* ---------------------------------------------------------------- */
  /* Init                                                               */
  /* ---------------------------------------------------------------- */
  function init() {
    buildColorChips(el.eColors, flickerColors, () => {});
    buildColorChips(el.bgColors, bgColors, setupBackgroundEngine);
    renderMediaList();
    toggleBgPanels();
    applyDim();
    applyTitleStyle();
    applyTimeStyle();
    applyEndInfoStyle();
    applyWarningBlinkColor();
    setupBackgroundEngine();
    resetTimer();
    bindEvents();
    refreshPresetList();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
