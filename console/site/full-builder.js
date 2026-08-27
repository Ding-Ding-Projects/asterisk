(() => {
  'use strict';
  const MAX_PATTERN_LENGTH = 256;
  window.DingSiteFullRegexBuilder = {
    schemaVersion: 1,
    maxPatternLength: MAX_PATTERN_LENGTH,
    flags: ['i', 'm', 'u'],
    open(target) {
      if (target && window.DingSiteRegex?.open) return window.DingSiteRegex.open(target);
      return false;
    },
    validate(pattern, flags = 'iu') {
      const value = String(pattern || '').slice(0, MAX_PATTERN_LENGTH);
      try { return { valid: true, source: new RegExp(value, flags).source, flags }; }
      catch (error) { return { valid: false, error: error.message, source: value, flags }; }
    },
  };
})();
