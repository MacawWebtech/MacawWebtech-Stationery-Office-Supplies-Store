/* Persistent light/dark mode and mirrored RTL layout. */
(() => {
  'use strict';

  const root = document.documentElement;
  const themeButton = document.getElementById('themeToggle');
  const rtlButton = document.getElementById('rtlToggle');

  const readStorage = (key) => {
    try {
      return window.localStorage.getItem(key);
    } catch (error) {
      return null;
    }
  };

  const writeStorage = (key, value) => {
    try {
      window.localStorage.setItem(key, value);
    } catch (error) {
      /* Theme and direction still apply to the current page without storage. */
    }
  };

  const savedTheme = readStorage('theme') || readStorage('penora-theme');
  const prefersDark = Boolean(window.matchMedia?.('(prefers-color-scheme: dark)').matches);

  const setTheme = (theme, persist = true) => {
    const normalizedTheme = theme === 'dark' ? 'dark' : 'light';
    root.dataset.theme = normalizedTheme;
    if (persist) writeStorage('theme', normalizedTheme);

    if (themeButton) {
      const nextTheme = normalizedTheme === 'dark' ? 'light' : 'dark';
      themeButton.setAttribute('aria-label', `Switch to ${nextTheme} mode`);
      themeButton.setAttribute('aria-pressed', String(normalizedTheme === 'dark'));
      themeButton.innerHTML = `<img src="assets/icons/svg/${normalizedTheme === 'dark' ? 'sun' : 'moon'}.svg" alt="" aria-hidden="true">`;
    }
  };

  setTheme(savedTheme || (prefersDark ? 'dark' : 'light'), false);
  if (themeButton) {
    themeButton.addEventListener('click', () => {
      setTheme(root.dataset.theme === 'dark' ? 'light' : 'dark');
    });
  }

  const storedDirection = readStorage('dir') || readStorage('penora-rtl');
  const isStoredRTL = storedDirection === 'rtl' || storedDirection === 'true';

  const setDirection = (enabled, persist = true) => {
    const direction = enabled ? 'rtl' : 'ltr';
    root.setAttribute('dir', direction);
    if (persist) writeStorage('dir', direction);
    if (rtlButton) rtlButton.setAttribute('aria-pressed', String(enabled));
  };

  setDirection(isStoredRTL, false);
  if (rtlButton) {
    rtlButton.addEventListener('click', () => {
      setDirection(root.getAttribute('dir') !== 'rtl');
    });
  }
})();
