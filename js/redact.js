(function (global) {
  'use strict';

  var PSEUDO_PREFIX = {
    EMAIL: 'EMAIL',
    PHONE: 'PHONE',
    IPV4: 'IP',
    IPV6: 'IPV6',
    PAN: 'PAN',
    AADHAAR: 'AADHAAR',
    CREDIT_CARD: 'CARD'
  };

  function padTwo(n) {
    return n < 10 ? '0' + n : String(n);
  }

  function partialMaskDefault(value) {
    var chars = value.split('');
    var kept = 0;
    for (var i = chars.length - 1; i >= 0; i--) {
      if (/[A-Za-z0-9]/.test(chars[i])) {
        if (kept < 4) {
          kept++;
        } else {
          chars[i] = 'X';
        }
      }
    }
    return chars.join('');
  }

  function partialMask(type, value) {
    if (type === 'EMAIL') {
      var atIdx = value.indexOf('@');
      if (atIdx !== -1) {
        return value.charAt(0) + '***' + value.slice(atIdx);
      }
    }
    if (type === 'IPV4') {
      var octets = value.split('.');
      if (octets.length === 4) {
        return 'XXX.XXX.XXX.' + octets[3];
      }
    }
    if (type === 'IPV6') {
      var groups = value.split(':');
      for (var k = 0; k < groups.length - 1; k++) {
        if (groups[k] !== '') {
          groups[k] = 'XXXX';
        }
      }
      return groups.join(':');
    }
    return partialMaskDefault(value);
  }

  function normalizeValue(type, value) {
    if (type === 'EMAIL' || type === 'IPV6') {
      return value.toLowerCase();
    }
    if (type === 'PHONE') {
      var digits = value.replace(/\D/g, '');
      if (digits.length === 12 && digits.indexOf('91') === 0) {
        return digits.slice(2);
      }
      if (digits.length === 11 && digits.indexOf('0') === 0) {
        return digits.slice(1);
      }
      return digits;
    }
    if (type === 'CREDIT_CARD' || type === 'AADHAAR') {
      return value.replace(/\D/g, '');
    }
    return value;
  }

  function countByType(entities) {
    var counts = {};
    if (!Array.isArray(entities)) {
      return counts;
    }
    for (var i = 0; i < entities.length; i++) {
      var type = entities[i].type;
      counts[type] = (counts[type] || 0) + 1;
    }
    return counts;
  }

  function redactText(text, entities, mode) {
    var source = typeof text === 'string' ? text : '';
    var list = Array.isArray(entities) ? entities.slice().sort(function (a, b) {
      return a.start - b.start;
    }) : [];

    var segments = [];
    var mapping = [];
    var seen = {};
    var typeCounters = {};
    var cursor = 0;

    for (var i = 0; i < list.length; i++) {
      var entity = list[i];
      if (entity.start > cursor) {
        segments.push({ text: source.slice(cursor, entity.start), type: null });
      }

      var replacement;
      if (mode === 'full') {
        replacement = '[REDACTED]';
      } else if (mode === 'partial') {
        replacement = partialMask(entity.type, entity.value);
      } else if (mode === 'pseudo') {
        var norm = normalizeValue(entity.type, entity.value);
        var key = entity.type + ':' + norm;
        if (Object.prototype.hasOwnProperty.call(seen, key)) {
          replacement = seen[key];
        } else {
          var nextNum = (typeCounters[entity.type] || 0) + 1;
          typeCounters[entity.type] = nextNum;
          var prefix = PSEUDO_PREFIX[entity.type] || entity.type;
          replacement = prefix + '_' + padTwo(nextNum);
          seen[key] = replacement;
          mapping.push({
            placeholder: replacement,
            original: entity.value,
            type: entity.type
          });
        }
      } else {
        replacement = entity.value;
      }

      segments.push({ text: replacement, type: entity.type });
      cursor = entity.end;
    }

    if (cursor < source.length) {
      segments.push({ text: source.slice(cursor), type: null });
    }

    var outputParts = [];
    for (var j = 0; j < segments.length; j++) {
      outputParts.push(segments[j].text);
    }

    return {
      output: outputParts.join(''),
      segments: segments,
      mapping: mapping
    };
  }

  global.redactText = redactText;
  global.countByType = countByType;
})(window);
