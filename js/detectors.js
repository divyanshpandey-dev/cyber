(function (global) {
  'use strict';

  var PRIORITY = {
    CREDIT_CARD: 0,
    EMAIL: 1,
    PAN: 2,
    AADHAAR: 3,
    IPV4: 4,
    PHONE: 5
  };

  function luhnCheck(digits) {
    var clean = String(digits).replace(/[\s-]/g, '');
    if (!/^\d+$/.test(clean) || clean.length === 0) {
      return false;
    }
    var sum = 0;
    var shouldDouble = false;
    for (var i = clean.length - 1; i >= 0; i--) {
      var digit = clean.charCodeAt(i) - 48;
      if (shouldDouble) {
        digit *= 2;
        if (digit > 9) {
          digit -= 9;
        }
      }
      sum += digit;
      shouldDouble = !shouldDouble;
    }
    return sum % 10 === 0;
  }

  function isWordOrDigit(ch) {
    return ch !== '' && /[A-Za-z0-9]/.test(ch);
  }

  function isDigit(ch) {
    return ch !== '' && /\d/.test(ch);
  }

  function collectEmails(text, candidates) {
    var re = /[A-Za-z0-9._%+-]+@(?:[A-Za-z0-9-]+\.)+[A-Za-z]{2,}/gi;
    var match;
    while ((match = re.exec(text)) !== null) {
      var start = match.index;
      var value = match[0];
      var end = start + value.length;
      var prev = start > 0 ? text.charAt(start - 1) : '';
      var next = end < text.length ? text.charAt(end) : '';
      if (/[A-Za-z0-9._%+-]/.test(prev) || /[A-Za-z0-9]/.test(next)) {
        continue;
      }
      candidates.push({ type: 'EMAIL', start: start, end: end, value: value });
    }
  }

  function collectPhones(text, candidates) {
    // Indian mobiles: optional +91, 91, or 0 prefix, optional space/hyphen, 10 digits starting 6-9 (allowing optional spaces/hyphens inside)
    var indianRe = /(?:(?:\+?91|0)[ -]?)?[6-9](?:[ -]?\d){9}/g;
    var match;
    while ((match = indianRe.exec(text)) !== null) {
      var start = match.index;
      var value = match[0];
      var end = start + value.length;
      var prev = start > 0 ? text.charAt(start - 1) : '';
      var next = end < text.length ? text.charAt(end) : '';
      if (isDigit(prev) || prev === '+' || isDigit(next)) {
        continue;
      }
      candidates.push({ type: 'PHONE', start: start, end: end, value: value });
    }

    // International numbers starting with + and 8-15 digits
    var intlRe = /\+\d(?:[ -]?\d){7,14}/g;
    while ((match = intlRe.exec(text)) !== null) {
      var iStart = match.index;
      var iValue = match[0];
      var iEnd = iStart + iValue.length;
      var iPrev = iStart > 0 ? text.charAt(iStart - 1) : '';
      var iNext = iEnd < text.length ? text.charAt(iEnd) : '';
      if (isWordOrDigit(iPrev) || iPrev === '+' || isDigit(iNext)) {
        continue;
      }
      var digitCount = iValue.replace(/\D/g, '').length;
      if (digitCount >= 8 && digitCount <= 15) {
        candidates.push({ type: 'PHONE', start: iStart, end: iEnd, value: iValue });
      }
    }
  }

  function collectIPv4(text, candidates) {
    var re = /\d{1,3}(?:\.\d{1,3}){3}/g;
    var match;
    while ((match = re.exec(text)) !== null) {
      var start = match.index;
      var value = match[0];
      var end = start + value.length;
      var prev = start > 0 ? text.charAt(start - 1) : '';
      var next = end < text.length ? text.charAt(end) : '';
      if (isDigit(prev) || prev === '.' || isDigit(next) || next === '.') {
        continue;
      }
      var octets = value.split('.');
      var valid = true;
      for (var i = 0; i < octets.length; i++) {
        var n = Number(octets[i]);
        if (n < 0 || n > 255) {
          valid = false;
          break;
        }
      }
      if (valid) {
        candidates.push({ type: 'IPV4', start: start, end: end, value: value });
      }
    }
  }

  function collectPAN(text, candidates) {
    var re = /\b[A-Z]{3}[PCHFATBLJG][A-Z]\d{4}[A-Z]\b/g;
    var match;
    while ((match = re.exec(text)) !== null) {
      candidates.push({
        type: 'PAN',
        start: match.index,
        end: match.index + match[0].length,
        value: match[0]
      });
    }
  }

  function collectAadhaar(text, candidates) {
    var re = /[2-9]\d{3}(?:[ -]\d{4}){2}|[2-9]\d{11}/g;
    var match;
    while ((match = re.exec(text)) !== null) {
      var start = match.index;
      var value = match[0];
      var end = start + value.length;
      var prev = start > 0 ? text.charAt(start - 1) : '';
      var next = end < text.length ? text.charAt(end) : '';
      if (isDigit(prev) || isDigit(next)) {
        continue;
      }
      candidates.push({ type: 'AADHAAR', start: start, end: end, value: value });
    }
  }

  function collectCreditCards(text, candidates) {
    var re = /\d(?:[ -]?\d){12,18}/g;
    var match;
    while ((match = re.exec(text)) !== null) {
      var start = match.index;
      var value = match[0];
      var end = start + value.length;
      var prev = start > 0 ? text.charAt(start - 1) : '';
      var next = end < text.length ? text.charAt(end) : '';
      if (isDigit(prev) || isDigit(next)) {
        continue;
      }
      var digits = value.replace(/[ -]/g, '');
      if (digits.length >= 13 && digits.length <= 19 && luhnCheck(digits)) {
        candidates.push({ type: 'CREDIT_CARD', start: start, end: end, value: value });
      }
    }
  }

  function resolveOverlaps(candidates) {
    var sorted = candidates.slice().sort(function (a, b) {
      var lenDiff = (b.end - b.start) - (a.end - a.start);
      if (lenDiff !== 0) {
        return lenDiff;
      }
      var prioDiff = PRIORITY[a.type] - PRIORITY[b.type];
      if (prioDiff !== 0) {
        return prioDiff;
      }
      return a.start - b.start;
    });

    var kept = [];
    for (var i = 0; i < sorted.length; i++) {
      var cand = sorted[i];
      var overlaps = false;
      for (var j = 0; j < kept.length; j++) {
        if (cand.start < kept[j].end && cand.end > kept[j].start) {
          overlaps = true;
          break;
        }
      }
      if (!overlaps) {
        kept.push(cand);
      }
    }

    kept.sort(function (a, b) {
      return a.start - b.start;
    });
    return kept;
  }

  function detectAll(text) {
    if (typeof text !== 'string' || text.length === 0) {
      return [];
    }
    var candidates = [];
    collectCreditCards(text, candidates);
    collectEmails(text, candidates);
    collectPAN(text, candidates);
    collectAadhaar(text, candidates);
    collectIPv4(text, candidates);
    collectPhones(text, candidates);
    return resolveOverlaps(candidates);
  }

  global.luhnCheck = luhnCheck;
  global.detectAll = detectAll;
})(window);
