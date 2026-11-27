(function () {
  'use strict';

  var ENTITY_TYPES = ['EMAIL', 'PHONE', 'IPV4', 'PAN', 'AADHAAR', 'CREDIT_CARD'];
  var MAX_FILE_BYTES = 5 * 1024 * 1024;
  var DEBOUNCE_MS = 150;

  var SAMPLE_TEXT = [
    'Customer: John.Doe@Example.com (backup: john.doe@example.com)',
    'Primary phone: +91 98765 43210 | Alt: 9876543210',
    'Card: 4111 1111 1111 1111 | Order ID: 1234 1111 1111 1112',
    'PAN: ABCPE1234F | Aadhaar: 2345 6789 0123',
    'Client IP: 192.168.1.20 | Invalid IP: 999.1.1.1'
  ].join('\n');

  var textarea = document.getElementById('source-text');
  var fileInput = document.getElementById('file-input');
  var fileWarning = document.getElementById('file-warning');
  var loadSampleBtn = document.getElementById('load-sample-btn');
  var clearBtn = document.getElementById('clear-btn');
  var downloadBtn = document.getElementById('download-btn');
  var modeRadios = document.querySelectorAll('input[name="redaction-mode"]');
  var countsList = document.getElementById('counts-list');
  var totalCountEl = document.getElementById('total-count');
  var originalView = document.getElementById('original-view');
  var sanitizedView = document.getElementById('sanitized-view');
  var mappingSection = document.getElementById('mapping-section');
  var mappingBody = document.getElementById('mapping-body');

  var uploadedFileName = null;
  var latestOutput = '';
  var debounceTimer = null;

  function getSelectedMode() {
    for (var i = 0; i < modeRadios.length; i++) {
      if (modeRadios[i].checked) {
        return modeRadios[i].value;
      }
    }
    return 'full';
  }

  function showWarning(message) {
    if (message) {
      fileWarning.textContent = message;
      fileWarning.classList.remove('hidden');
    } else {
      fileWarning.textContent = '';
      fileWarning.classList.add('hidden');
    }
  }

  function renderEmptyState(container, message) {
    var span = document.createElement('span');
    span.className = 'empty-state';
    span.textContent = message;
    container.replaceChildren(span);
  }

  function renderOriginal(text, entities) {
    if (!text) {
      renderEmptyState(originalView, 'Paste text or upload a .txt / .csv file to inspect detected PII.');
      return;
    }

    var frag = document.createDocumentFragment();
    var cursor = 0;

    for (var i = 0; i < entities.length; i++) {
      var entity = entities[i];
      if (entity.start > cursor) {
        frag.appendChild(document.createTextNode(text.slice(cursor, entity.start)));
      }
      var mark = document.createElement('mark');
      mark.className = 'hl hl-' + entity.type;
      mark.title = entity.type;
      mark.textContent = text.slice(entity.start, entity.end);
      frag.appendChild(mark);
      cursor = entity.end;
    }

    if (cursor < text.length) {
      frag.appendChild(document.createTextNode(text.slice(cursor)));
    }

    originalView.replaceChildren(frag);
  }

  function renderSanitized(text, segments) {
    if (!text) {
      renderEmptyState(sanitizedView, 'Sanitized output will appear here.');
      return;
    }

    var frag = document.createDocumentFragment();
    for (var i = 0; i < segments.length; i++) {
      var seg = segments[i];
      if (seg.type) {
        var mark = document.createElement('mark');
        mark.className = 'hl hl-' + seg.type;
        mark.title = seg.type;
        mark.textContent = seg.text;
        frag.appendChild(mark);
      } else {
        frag.appendChild(document.createTextNode(seg.text));
      }
    }

    sanitizedView.replaceChildren(frag);
  }

  function renderCounts(counts, total) {
    var frag = document.createDocumentFragment();
    for (var i = 0; i < ENTITY_TYPES.length; i++) {
      var type = ENTITY_TYPES[i];
      var chip = document.createElement('span');
      chip.className = 'count-chip';

      var dot = document.createElement('span');
      dot.className = 'legend-dot dot-' + type;

      var label = document.createElement('span');
      label.textContent = type + ': ' + (counts[type] || 0);

      chip.appendChild(dot);
      chip.appendChild(label);
      frag.appendChild(chip);
    }
    countsList.replaceChildren(frag);
    totalCountEl.textContent = String(total);
  }

  function renderMapping(mode, mapping) {
    if (mode !== 'pseudo') {
      mappingSection.classList.add('hidden');
      mappingBody.replaceChildren();
      return;
    }

    mappingSection.classList.remove('hidden');
    var frag = document.createDocumentFragment();

    if (mapping.length === 0) {
      var emptyRow = document.createElement('tr');
      var emptyCell = document.createElement('td');
      emptyCell.colSpan = 3;
      emptyCell.className = 'empty-state';
      emptyCell.textContent = 'No PII detected to map.';
      emptyRow.appendChild(emptyCell);
      frag.appendChild(emptyRow);
    } else {
      for (var i = 0; i < mapping.length; i++) {
        var entry = mapping[i];
        var tr = document.createElement('tr');

        var tdPlaceholder = document.createElement('td');
        tdPlaceholder.textContent = entry.placeholder;

        var tdOriginal = document.createElement('td');
        tdOriginal.textContent = entry.original;

        var tdType = document.createElement('td');
        tdType.textContent = entry.type;

        tr.appendChild(tdPlaceholder);
        tr.appendChild(tdOriginal);
        tr.appendChild(tdType);
        frag.appendChild(tr);
      }
    }

    mappingBody.replaceChildren(frag);
  }

  function update() {
    var text = textarea.value;
    var mode = getSelectedMode();
    var entities = detectAll(text);
    var counts = countByType(entities);
    var result = redactText(text, entities, mode);

    latestOutput = result.output;
    downloadBtn.disabled = text.length === 0;

    renderCounts(counts, entities.length);
    renderOriginal(text, entities);
    renderSanitized(text, result.segments);
    renderMapping(mode, result.mapping);
  }

  function scheduleUpdate() {
    if (debounceTimer !== null) {
      clearTimeout(debounceTimer);
    }
    debounceTimer = setTimeout(function () {
      debounceTimer = null;
      update();
    }, DEBOUNCE_MS);
  }

  textarea.addEventListener('input', scheduleUpdate);

  for (var i = 0; i < modeRadios.length; i++) {
    modeRadios[i].addEventListener('change', update);
  }

  loadSampleBtn.addEventListener('click', function () {
    showWarning('');
    uploadedFileName = null;
    textarea.value = SAMPLE_TEXT;
    update();
  });

  clearBtn.addEventListener('click', function () {
    showWarning('');
    uploadedFileName = null;
    fileInput.value = '';
    textarea.value = '';
    update();
  });

  fileInput.addEventListener('change', function () {
    var file = fileInput.files && fileInput.files[0];
    if (!file) {
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      showWarning('File exceeds 5 MB limit (' + (file.size / (1024 * 1024)).toFixed(2) + ' MB) and was not loaded.');
      fileInput.value = '';
      return;
    }

    showWarning('');
    var reader = new FileReader();
    reader.onload = function (e) {
      uploadedFileName = file.name;
      textarea.value = typeof e.target.result === 'string' ? e.target.result : '';
      update();
    };
    reader.onerror = function () {
      showWarning('Could not read the selected file.');
    };
    reader.readAsText(file);
  });

  downloadBtn.addEventListener('click', function () {
    if (!textarea.value) {
      return;
    }
    var filename = uploadedFileName ? 'sanitized_' + uploadedFileName : 'sanitized.txt';
    var blob = new Blob([latestOutput], { type: 'text/plain;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  });

  update();
})();
