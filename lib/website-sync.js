'use strict';

function createWebsiteSync(options = {}) {
  const store = options.store;
  const apiKey = String(options.apiKey || process.env.GYMKIOSK_SYNC_KEY || '').trim();
  const endpoint = String(
    options.endpoint ||
    process.env.GYMKIOSK_SYNC_URL ||
    (apiKey ? 'https://api.rdpsstrengthandconditioning.ca/api/kiosk-sync' : '')
  ).trim();
  const kioskId = String(options.kioskId || process.env.GYMKIOSK_KIOSK_ID || 'rdps-main-kiosk');
  let running = false;
  let timer = null;
  let lastResult = { configured: !!endpoint, status: endpoint ? 'waiting' : 'not-configured' };

  async function flush() {
    if (running || !endpoint) return lastResult;
    const events = store.pendingSync(50);
    if (!events.length) {
      lastResult = { configured: true, status: 'idle', pending: 0, checkedAt: new Date().toISOString() };
      return lastResult;
    }

    running = true;
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {})
        },
        body: JSON.stringify({
          version: 1,
          kioskId,
          sentAt: new Date().toISOString(),
          events
        }),
        signal: AbortSignal.timeout(15_000)
      });
      if (!response.ok) throw new Error(`Website sync returned HTTP ${response.status}`);
      store.completeSync(events.map((event) => event.id));
      lastResult = {
        configured: true,
        status: 'online',
        synced: events.length,
        pending: store.pendingSync(1).length,
        checkedAt: new Date().toISOString()
      };
    } catch (error) {
      store.failSync(events.map((event) => event.id), error.message);
      lastResult = {
        configured: true,
        status: 'offline-queued',
        pending: store.pendingSync(200).length,
        error: error.message,
        checkedAt: new Date().toISOString()
      };
    } finally {
      running = false;
    }
    return lastResult;
  }

  function start() {
    if (timer) return;
    timer = setInterval(() => flush().catch(() => {}), 60_000);
    timer.unref();
    setTimeout(() => flush().catch(() => {}), 3_000).unref();
  }

  function stop() {
    if (timer) clearInterval(timer);
    timer = null;
  }

  return {
    enqueue(eventType, payload) {
      store.enqueueSync(eventType, payload);
      setTimeout(() => flush().catch(() => {}), 100).unref();
    },
    flush,
    start,
    stop,
    status() {
      return { ...lastResult, endpoint: endpoint ? new URL(endpoint).origin : null };
    }
  };
}

module.exports = { createWebsiteSync };

