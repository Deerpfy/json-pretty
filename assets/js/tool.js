/* ==========================================================================
   JSON Pretty-Print and Minify - tool logic
   Classic script. No modules, no imports, no exports. Functions and state
   live as window globals; wiring is done with addEventListener so the page
   works when opened directly from disk on the file:// protocol.
   Parsing and serialization use the native JSON API only.
   ========================================================================== */

/* Element references, resolved in init(). */
var inputEl;
var outputEl;
var indentEl;
var sortKeysEl;
var statusEl;
var statusIconEl;
var statusTextEl;

/* Status icons, one stroke family, swapped by state. Decorative (aria-hidden);
   the status text always carries the meaning. */
var ICONS = {
  neutral:
    '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"></circle><path d="M12 8h.01"></path><path d="M11 12h1v4h1"></path></svg>',
  success:
    '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"></circle><path d="m8.5 12.5 2.5 2.5 4.5-5"></path></svg>',
  error:
    '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M10.3 3.6 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.6a2 2 0 0 0-3.4 0Z"></path><path d="M12 9v4"></path><path d="M12 17h.01"></path></svg>'
};

/* Write a message and visual state to the status line. textContent is used so
   raw engine error messages can never inject markup. */
function setStatus(text, state) {
  var key = (state === 'success' || state === 'error') ? state : 'neutral';
  statusEl.setAttribute('data-state', key);
  statusIconEl.innerHTML = ICONS[key];
  statusTextEl.textContent = text;
}

/* Read the raw input, strip a single leading BOM, then trim surrounding
   whitespace. Returns the cleaned string ready for JSON.parse. */
function readInput() {
  var raw = inputEl.value;
  if (raw.charCodeAt(0) === 0xfeff) {
    raw = raw.slice(1);
  }
  return raw.trim();
}

/* The indent argument for JSON.stringify: a space count or a single tab. */
function getIndent() {
  var value = indentEl.value;
  if (value === 'tab') {
    return '\t';
  }
  if (value === '4') {
    return 4;
  }
  return 2;
}

/* Human-readable indent name for the status line. */
function getIndentLabel() {
  var value = indentEl.value;
  if (value === 'tab') {
    return 'tab indentation';
  }
  return value + '-space indentation';
}

/* Recursively sort object keys. Object keys are reordered; array order and all
   primitive values are preserved exactly. */
function sortKeysDeep(value) {
  if (Array.isArray(value)) {
    return value.map(sortKeysDeep);
  }
  if (value !== null && typeof value === 'object') {
    var sorted = {};
    Object.keys(value).sort().forEach(function (key) {
      sorted[key] = sortKeysDeep(value[key]);
    });
    return sorted;
  }
  return value;
}

/* Extract a 0-based character offset from an engine error message, if present
   (for example "... in JSON at position 42"). Returns -1 when absent. */
function positionFromError(message) {
  var match = /position\s+(\d+)/i.exec(message);
  return match ? parseInt(match[1], 10) : -1;
}

/* Convert a 0-based character offset into a 1-based line and column. */
function lineColFromPosition(text, position) {
  var line = 1;
  var column = 1;
  var limit = Math.min(position, text.length);
  for (var i = 0; i < limit; i++) {
    if (text.charCodeAt(i) === 10) {
      line++;
      column = 1;
    } else {
      column++;
    }
  }
  return { line: line, column: column };
}

/* Report a parse failure on the status line. Computes line and column when the
   engine exposes a character position. Does not touch the input or output. */
function reportParseError(error, text) {
  var message = (error && error.message) ? error.message : String(error);
  var detail = 'Invalid JSON: ' + message;
  var position = positionFromError(message);
  // When the engine exposes a character offset but not a line/column, derive
  // and append them. If the message already states a line/column (some engines
  // do), keep it as is rather than printing the same location twice.
  if (position >= 0 && !/line\s+\d+/i.test(message)) {
    var location = lineColFromPosition(text, position);
    detail += ' (line ' + location.line + ', column ' + location.column + ')';
  }
  setStatus(detail, 'error');
}

/* Show input and output character counts after a successful transform. */
function updateStats(prefix, inputLength, outputLength) {
  setStatus(
    prefix + ' Input ' + inputLength + ' characters, output ' + outputLength + ' characters.',
    'success'
  );
}

/* Shared transform core for beautify and minify. On a parse error the input
   and any previous output are left untouched. */
function runTransform(mode) {
  var text = readInput();

  if (text === '') {
    setStatus('Paste some JSON to begin.', 'neutral');
    return;
  }

  var parsed;
  try {
    parsed = JSON.parse(text);
  } catch (error) {
    reportParseError(error, text);
    return;
  }

  var value = sortKeysEl.checked ? sortKeysDeep(parsed) : parsed;
  var result;
  var prefix;

  if (mode === 'minify') {
    result = JSON.stringify(value);
    prefix = sortKeysEl.checked ? 'Minified with sorted keys.' : 'Minified.';
  } else {
    result = JSON.stringify(value, null, getIndent());
    prefix = 'Beautified with ' + getIndentLabel() +
      (sortKeysEl.checked ? ' and sorted keys.' : '.');
  }

  outputEl.value = result;
  updateStats(prefix, text.length, result.length);
}

/* Parse the input and write a pretty-printed result to the output. */
function beautify() {
  runTransform('beautify');
}

/* Parse the input and write a single-line minified result to the output. */
function minify() {
  runTransform('minify');
}

/* Copy the output to the clipboard. Prefers the async Clipboard API and falls
   back to execCommand so it still works under file:// where the async API may
   be blocked. */
function copyResult() {
  var text = outputEl.value;
  if (text === '') {
    setStatus('Nothing to copy yet. Beautify or minify some JSON first.', 'neutral');
    return;
  }

  if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
    navigator.clipboard.writeText(text).then(
      function () {
        setStatus('Copied ' + text.length + ' characters to the clipboard.', 'success');
      },
      function () {
        fallbackCopy(text);
      }
    );
  } else {
    fallbackCopy(text);
  }
}

/* Selection-based copy fallback for file:// and older browsers. */
function fallbackCopy(text) {
  try {
    outputEl.focus();
    outputEl.select();
    outputEl.setSelectionRange(0, text.length);
    var ok = document.execCommand('copy');
    if (ok) {
      setStatus('Copied ' + text.length + ' characters to the clipboard.', 'success');
    } else {
      setStatus('Could not copy automatically. The output is selected, so press Ctrl or Cmd plus C.', 'error');
    }
  } catch (error) {
    setStatus('Could not copy: ' + error.message + '. The output is selected, so press Ctrl or Cmd plus C.', 'error');
  }
}

/* Download the current output as formatted.json via a Blob object URL. */
function downloadResult() {
  var text = outputEl.value;
  if (text === '') {
    setStatus('Nothing to download yet. Beautify or minify some JSON first.', 'neutral');
    return;
  }

  var blob = new Blob([text], { type: 'application/json' });
  var url = URL.createObjectURL(blob);
  var link = document.createElement('a');
  link.href = url;
  link.download = 'formatted.json';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  setStatus('Downloaded formatted.json (' + text.length + ' characters).', 'success');
}

/* Resolve elements and wire up events. */
function init() {
  inputEl = document.getElementById('input');
  outputEl = document.getElementById('output');
  indentEl = document.getElementById('indent');
  sortKeysEl = document.getElementById('sortKeys');
  statusEl = document.getElementById('status');
  statusIconEl = statusEl.querySelector('.status__icon');
  statusTextEl = statusEl.querySelector('.status__text');

  document.getElementById('beautify').addEventListener('click', beautify);
  document.getElementById('minify').addEventListener('click', minify);
  document.getElementById('copy').addEventListener('click', copyResult);
  document.getElementById('download').addEventListener('click', downloadResult);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
