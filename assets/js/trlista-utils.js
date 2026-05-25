// assets/js/trlista-utils.js
(function (global) {
  'use strict';

  function getLocalDateString(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function htmlAttrEscape(value) {
    if (value === null || value === undefined) return '';
    return String(value).replace(/"/g, '&quot;');
  }

  function escapeHtml(value) {
    if (value === null || value === undefined) return '';
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function normalizeText(value) {
    return String(value || '').trim().toLowerCase();
  }

  function hasUsefulCode(value) {
    const normalized = normalizeText(value);
    return !!normalized
      && normalized !== 'n/a'
      && normalized !== 'na'
      && normalized !== 'sin código'
      && normalized !== 'sin codigo';
  }

  function setToggleState(button, shouldBeOn) {
    if (!button) return;
    button.classList.toggle('on', !!shouldBeOn);
    button.classList.toggle('off', !shouldBeOn);
  }

  function toggleButtonState(button) {
    if (!button) return;
    setToggleState(button, !button.classList.contains('on'));
  }

  function isCompactViewport(breakpoint = 767.98) {
    return global.matchMedia(`(max-width: ${breakpoint}px)`).matches;
  }

  global.TRUtils = {
    getLocalDateString,
    htmlAttrEscape,
    escapeHtml,
    normalizeText,
    hasUsefulCode,
    setToggleState,
    toggleButtonState,
    isCompactViewport
  };
})(window);
