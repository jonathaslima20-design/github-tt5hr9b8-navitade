const SCROLL_RESTORATION_FLAG = '__scrollRestoring';
let autoClearTimeout: NodeJS.Timeout | null = null;

export const scrollCoordinator = {
  startScrollRestoration: () => {
    sessionStorage.setItem(SCROLL_RESTORATION_FLAG, 'true');

    // Auto-clear flag after 5 seconds as safety mechanism
    if (autoClearTimeout) clearTimeout(autoClearTimeout);
    autoClearTimeout = setTimeout(() => {
      sessionStorage.removeItem(SCROLL_RESTORATION_FLAG);
      autoClearTimeout = null;
    }, 5000);
  },

  isScrollRestorationInProgress: (): boolean => {
    return sessionStorage.getItem(SCROLL_RESTORATION_FLAG) === 'true';
  },

  endScrollRestoration: () => {
    if (autoClearTimeout) clearTimeout(autoClearTimeout);
    autoClearTimeout = null;
    sessionStorage.removeItem(SCROLL_RESTORATION_FLAG);
  },

  clearFlag: () => {
    if (autoClearTimeout) clearTimeout(autoClearTimeout);
    autoClearTimeout = null;
    sessionStorage.removeItem(SCROLL_RESTORATION_FLAG);
  },
};
