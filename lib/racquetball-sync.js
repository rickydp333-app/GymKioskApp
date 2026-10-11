'use strict';

function createRacquetballSync({ store, getDeviceKey, endpoint = 'https://app.rdpsplace.me/api/racquetball/players/sync', request = fetch, logger = console }) {
  let running = false;
  let timer = null;
  let status = 'waiting';

  async function flush() {
    if (running) return status;
    running = true;
    let players = [];
    try {
      players = store.pendingPlayers();
      if (!players.length) return (status = 'up-to-date');
      const key = getDeviceKey();
      if (!key) {
        if (status !== 'not-configured') logger.warn('Racquetball players queued: configure the hosted kiosk device key in Admin Settings.');
        return (status = 'not-configured');
      }
      const response = await request(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-gymkiosk-key': key },
        body: JSON.stringify({ players }),
        signal: AbortSignal.timeout(15000)
      });
      if (!response.ok) throw new Error(`Player sync returned HTTP ${response.status}`);
      const result = await response.json();
      const ids = players.map(player => player.id);
      if (!result.success || !Array.isArray(result.acceptedIds) ||
          result.acceptedIds.length !== ids.length || !ids.every(id => result.acceptedIds.includes(id))) {
        throw new Error('Player sync did not confirm all registrations.');
      }
      store.completePlayerSync(ids, players);
      status = 'up-to-date';
    } catch (error) {
      status = 'offline-queued';
      logger.error('Racquetball player sync failed; registrations remain queued:', error.message);
      if (players.length) store.failPlayerSync(players.map(player => player.id), error.message);
    } finally {
      running = false;
    }
    return status;
  }

  function flushSafely() {
    return flush().catch(error => {
      logger.error('Unable to update the Racquetball sync queue:', error.message);
      return 'offline-queued';
    });
  }

  return {
    flush: flushSafely,
    start() {
      if (timer) return;
      timer = setInterval(flushSafely, 60000);
      timer.unref();
      void flushSafely();
    },
    stop() { clearInterval(timer); timer = null; },
    status: () => status
  };
}

module.exports = { createRacquetballSync };
