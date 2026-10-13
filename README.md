# Countdown Timer

A fully customizable countdown timer web app: flexible time format, custom fonts/colors/positions for title and time, a flexible background (solid/cycling colors or an image+video playlist), and an end sequence (flickering colors + repeating beep + editable "time's up" message).

## Run it

This needs a PHP-capable server only for the **preset save/load** feature (it writes to `data/presets.json`). Everything else (the timer, styling, background, end sequence) runs entirely in the browser.

```bash
cd countdown-timer
php -S localhost:8000
# open http://localhost:8000
```

Or drop the folder into any Apache/Nginx+PHP host. Make sure these are writable by the web server user:

```bash
chmod 775 data data/presets.json uploads
```

`data/` stores presets; `uploads/` stores files you upload as backgrounds (`api/upload.php` validates the real MIME type server-side and caps uploads at 80MB — adjust `$maxBytes` in that file if you need more).

If you just open `index.php` as a static file (no PHP), the timer, styling, backgrounds and end sequence all still work — only "Save/Load preset" and file uploads will show "server unavailable" (you can still add background media by URL).

## Using it

- Click the gear icon (top right) to open settings.
- **Duration & format**: set Days/Hours/Min/Sec and pick `Auto` or a fixed display format (`SS`, `MM:SS`, `HH:MM:SS`, `DD:HH:MM:SS`). Toggle "show unit names" to print labels (e.g. `05 Min 12 Sec`) instead of colons.
- **Title text** / **Time display**: font family, size, bold/italic, color, and horizontal/vertical position — independently for the title and the countdown numbers.
- **When timer ends**: the message shown at zero, one or more flicker colors (cycled rapidly), optional time-left thresholds for starting warning beeps and blinking, a custom blink color, and a beep toggle. The beep is synthesized in-browser (Web Audio), so no sound file is required.
- **Background**: either a list of one or more colors (cross-fades between them on an interval you set) or a playlist of image/video items — add by pasting a URL, or click "Upload image / video…" to pick real files from your device (saved server-side into `uploads/`). Images advance on a timer, videos advance on `ended`; a single video simply loops. A dim overlay slider is available for media backgrounds.
- **Presets**: name and save the whole configuration to the server, then reload it later from the dropdown.

## Files

```
index.php            Page shell / controls markup
assets/css/style.css Fonts, layout, flicker animation, panel styling
assets/js/app.js     All timer/background/audio/preset logic
api/presets.php      JSON-file backed save/list/load/delete API
api/upload.php       Handles background image/video file uploads
data/presets.json    Preset storage (created empty)
uploads/             Uploaded background files land here
```
