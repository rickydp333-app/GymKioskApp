console.log('RUNTIME-UTILS.JS LOADED');

(() => {
  let globalErrorBannerTimer = null;

  async function auditAdminAction(action, details = '') {
    try {
      if (window.electron && typeof window.electron.logAdminAction === 'function') {
        await window.electron.logAdminAction({ action, details, actor: 'admin' });
      }
    } catch (error) {
      console.warn('Admin audit log failed:', error.message);
    }
  }

  function showGlobalErrorBanner(message, timeoutMs = 6000) {
    const banner = document.getElementById('globalErrorBanner');
    if (!banner || !message) return;

    banner.textContent = `⚠ ${message}`;
    banner.classList.remove('hidden');

    if (globalErrorBannerTimer) {
      clearTimeout(globalErrorBannerTimer);
    }

    globalErrorBannerTimer = setTimeout(() => {
      banner.classList.add('hidden');
    }, timeoutMs);
  }

  function setupGlobalErrorHandlers() {
    window.addEventListener('error', (event) => {
      if (!event?.message) return;
      if (event.message.includes('ResizeObserver')) return;
      showGlobalErrorBanner(event.message);
    });

    window.addEventListener('unhandledrejection', (event) => {
      const reason = event?.reason;
      const message = typeof reason === 'string'
        ? reason
        : reason?.message || 'Unexpected app error occurred.';
      showGlobalErrorBanner(message);
    });
  }

  window.runtimeUtils = {
    auditAdminAction,
    showGlobalErrorBanner,
    setupGlobalErrorHandlers
  };

  window.notifyAppError = showGlobalErrorBanner;
})();
