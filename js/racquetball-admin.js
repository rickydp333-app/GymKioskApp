(() => {
  const element = id => document.getElementById(id);
  let sessionId = null;
  let players = [];
  let generation = 0;
  let editingId = null;
  let scheduleGeneration = 0;

  function clearSession() {
    generation++;
    sessionId = null;
    players = [];
    element('players').replaceChildren();
    element('count').textContent = '';
    element('search').value = '';
    element('playersPanel').hidden = true;
    element('loginPanel').hidden = false;
    element('password').value = '';
    scheduleGeneration++;
    element('schedulePanel').hidden = true;
    element('scheduleEntries').replaceChildren();
    element('scheduleStatus').textContent = '';
    element('adminMatchResults').replaceChildren();
    resetScheduleForm();
  }

  function renderPlayers() {
    const query = element('search').value.trim().toLowerCase();
    const filtered = players.filter(player => [player.fullName, player.email, player.phone].some(value => value.toLowerCase().includes(query)));
    const rows = filtered.map(player => {
      const row = document.createElement('tr');
      for (const value of [player.fullName, player.email, player.phone, new Date(player.createdAt).toLocaleString()]) {
        const cell = document.createElement('td');
        cell.textContent = value;
        row.appendChild(cell);
      }
      return row;
    });
    element('players').replaceChildren(...rows);
    element('count').textContent = `${filtered.length} of ${players.length} players`;
  }

  async function loadPlayers() {
    const currentGeneration = generation;
    element('refresh').disabled = true;
    element('status').textContent = 'Loading players...';
    try {
      const response = await fetch('/api/admin/racquetball/players', {
        headers: { Authorization: `Bearer ${sessionId}` }, cache: 'no-store',
        signal: AbortSignal.timeout(15000)
      });
      const result = await response.json();
      if (currentGeneration !== generation) return;
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) clearSession();
        throw new Error(result.error || `Unable to load players (HTTP ${response.status}).`);
      }
      if (!result.success || !Array.isArray(result.players)) throw new Error('The server returned an invalid player list.');
      players = result.players;
      for (const [id, label] of [['eventPlayer1', 'Choose player 1'], ['eventPlayer2', 'Choose player 2']]) {
        const selected = element(id).value;
        element(id).replaceChildren(new Option(label, ''));
        players.forEach(player => element(id).add(new Option(`${player.fullName} (${player.email})`, player.email)));
        element(id).value = selected;
      }
      element('loginPanel').hidden = true;
      element('playersPanel').hidden = false;
      if (element('schedulePanel').hidden) {
        element('schedulePanel').hidden = false;
        void loadSchedule();
        void loadResults();
      }
      renderPlayers();
      element('status').textContent = players.length ? 'Players updated.' : 'No players uploaded yet.';
    } catch (error) {
      if (currentGeneration === generation || !sessionId) element('status').textContent = error.message;
    } finally {
      element('refresh').disabled = false;
    }
  }

  element('loginForm').addEventListener('submit', async event => {
    event.preventDefault();
    const currentGeneration = ++generation;
    element('signIn').disabled = true;
    element('status').textContent = 'Signing in...';
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: element('email').value, password: element('password').value }),
        signal: AbortSignal.timeout(15000)
      });
      const result = await response.json();
      if (currentGeneration !== generation) return;
      if (!response.ok || !result.success || !result.sessionId) throw new Error(result.error || 'Sign in failed.');
      sessionId = result.sessionId;
      await loadPlayers();
    } catch (error) {
      if (currentGeneration === generation) element('status').textContent = error.message;
    } finally {
      element('password').value = '';
      element('signIn').disabled = false;
    }
  });
  element('refresh').addEventListener('click', loadPlayers);
  element('search').addEventListener('input', renderPlayers);
  element('logOut').addEventListener('click', () => { clearSession(); element('status').textContent = 'Logged out.'; });

  function resetScheduleForm() {
    editingId = null;
    element('scheduleForm').reset();
    element('saveEvent').textContent = 'Add Schedule Entry';
    element('cancelEdit').hidden = true;
    setPlayerRequirements();
  }

  async function scheduleRequest(url, options = {}) {
    const response = await fetch(url, {
      ...options, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sessionId}` },
      cache: 'no-store', signal: AbortSignal.timeout(15000)
    });
    const result = await response.json();
    if (!response.ok) {
      if (response.status === 401 || response.status === 403) clearSession();
      throw new Error(result.error || `Schedule request failed (HTTP ${response.status}).`);
    }
    return result;
  }

  async function loadSchedule() {
    const current = ++scheduleGeneration;
    const loginGeneration = generation;
    element('scheduleEntries').replaceChildren();
    element('scheduleStatus').textContent = 'Loading schedule...';
    const month = element('scheduleMonth').value;
    if (!month) { element('scheduleStatus').textContent = 'Choose a month.'; return; }
    try {
      const result = await scheduleRequest(`/api/admin/racquetball/schedule?month=${encodeURIComponent(month)}`);
      if (current !== scheduleGeneration || loginGeneration !== generation) return;
      const entries = result.events.map(event => {
        const article = document.createElement('article');
        article.className = 'schedule-entry';
        const heading = document.createElement('h3');
        heading.textContent = event.title;
        const details = document.createElement('p');
        details.textContent = `${event.date} | ${event.startTime} - ${event.endTime} Eastern | ${event.kind}\n${event.location}\n${event.notes}`;
        const controls = document.createElement('div');
        controls.className = 'toolbar';
        const edit = document.createElement('button');
        edit.type = 'button';
        edit.textContent = 'Edit';
        edit.setAttribute('aria-label', `Edit ${event.title}`);
        edit.addEventListener('click', () => {
          editingId = event.id;
          for (const [id, value] of [['eventTitle', event.title], ['eventKind', event.kind], ['eventDate', event.date],
            ['eventStart', event.startTime], ['eventEnd', event.endTime], ['eventLocation', event.location], ['eventNotes', event.notes],
            ['eventPlayer1', event.player1], ['eventPlayer2', event.player2]]) {
            element(id).value = value;
          }
          element('saveEvent').textContent = 'Save Changes';
          element('cancelEdit').hidden = false;
          setPlayerRequirements();
          element('eventTitle').focus();
        });
        const remove = document.createElement('button');
        remove.type = 'button';
        remove.textContent = 'Delete';
        remove.setAttribute('aria-label', `Delete ${event.title}`);
        remove.addEventListener('click', async () => {
          if (!confirm(`Delete "${event.title}" from the public schedule?`)) return;
          const currentLogin = generation;
          remove.disabled = true;
          try {
            await scheduleRequest(`/api/admin/racquetball/schedule/${event.id}`, { method: 'DELETE' });
            if (currentLogin !== generation) return;
            if (editingId === event.id) resetScheduleForm();
            await loadSchedule();
            await loadResults();
          } catch (error) {
            if (currentLogin === generation) element('scheduleStatus').textContent = error.message;
            else if (!sessionId) element('status').textContent = error.message;
          } finally { remove.disabled = false; }
        });
        controls.append(edit, remove);
        article.append(heading, details, controls);
        return article;
      });
      element('scheduleEntries').replaceChildren(...entries);
      element('scheduleStatus').textContent = entries.length ? `${entries.length} entries this month.` : 'No events scheduled this month yet.';
      return true;
    } catch (error) {
      if (current === scheduleGeneration && loginGeneration === generation) element('scheduleStatus').textContent = error.message;
    }
  }

  element('scheduleForm').addEventListener('submit', async event => {
    event.preventDefault();
    const current = generation;
    const payload = {
      title: element('eventTitle').value, kind: element('eventKind').value, date: element('eventDate').value,
      startTime: element('eventStart').value, endTime: element('eventEnd').value,
      location: element('eventLocation').value, notes: element('eventNotes').value,
      player1: element('eventPlayer1').value, player2: element('eventPlayer2').value
    };
    const id = editingId;
    element('saveEvent').disabled = true;
    element('scheduleStatus').textContent = 'Saving schedule entry...';
    try {
      await scheduleRequest(`/api/admin/racquetball/schedule${id ? `/${id}` : ''}`, {
        method: id ? 'PUT' : 'POST', body: JSON.stringify(payload)
      });
      if (current !== generation) return;
      resetScheduleForm();
      element('scheduleMonth').value = payload.date.slice(0, 7);
      if (await loadSchedule()) element('scheduleStatus').textContent = 'Schedule entry saved and published.';
      await loadResults();
    } catch (error) {
      if (current === generation) element('scheduleStatus').textContent = error.message;
      else if (!sessionId) element('status').textContent = error.message;
    } finally { element('saveEvent').disabled = false; }
  });
  element('scheduleMonth').value = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Toronto', year: 'numeric', month: '2-digit'
  }).format(new Date()).slice(0, 7);
  element('scheduleMonth').addEventListener('change', loadSchedule);
  element('refreshEvents').addEventListener('click', loadSchedule);
  element('cancelEdit').addEventListener('click', resetScheduleForm);
  function setPlayerRequirements() {
    for (const id of ['eventPlayer1', 'eventPlayer2']) element(id).required = element('eventKind').value === 'match';
  }
  element('eventKind').addEventListener('change', setPlayerRequirements);
  setPlayerRequirements();
  element('refreshResults').addEventListener('click', loadResults);

  async function loadResults() {
    const current = generation;
    try {
      const result = await scheduleRequest('/api/admin/racquetball/matches');
      if (current !== generation) return;
      const articles = result.matches.map(entry => {
        const article = document.createElement('article'); article.className = 'schedule-entry';
        const heading = document.createElement('h3'); heading.textContent = entry.title;
        const summary = document.createElement('p');
        summary.textContent = `${entry.date}: ${entry.player1Name || 'Unassigned'} vs ${entry.player2Name || 'Unassigned'} · ${entry.status}\n${entry.result ? JSON.stringify(entry.result.games) : ''}\n${entry.requests.map(request => `${request.type}: ${request.status} ${JSON.stringify(request.payload)}`).join('\n')}`;
        article.append(heading, summary);
        if (!entry.player1 || !entry.player2) return article;
        const form = document.createElement('form'), inputs = [];
        for (let index = 0; index < 6; index++) {
          const label = document.createElement('label');
          label.textContent = `Game ${Math.floor(index / 2) + 1} · ${index % 2 ? entry.player2Name : entry.player1Name}`;
          const input = document.createElement('input'); input.type = 'number'; input.min = '0'; input.max = '999'; input.step = '1';
          input.value = entry.result?.games[Math.floor(index / 2)]?.[index % 2] ?? '';
          label.appendChild(input); form.appendChild(label); inputs.push(input);
        }
        const forfeit = document.createElement('select');
        forfeit.add(new Option('Played games (no forfeit)', ''));
        forfeit.add(new Option(`Forfeit winner: ${entry.player1Name}`, '1'));
        forfeit.add(new Option(`Forfeit winner: ${entry.player2Name}`, '2'));
        if (entry.result?.forfeit) forfeit.value = String(entry.result.winner);
        const forfeitLabel = document.createElement('label'); forfeitLabel.textContent = 'Forfeit'; forfeitLabel.appendChild(forfeit); form.appendChild(forfeitLabel);
        const save = document.createElement('button'); save.type = 'submit'; save.textContent = 'Admin Confirm / Correct Result'; form.appendChild(save);
        form.addEventListener('submit', async event => {
          event.preventDefault();
          if (!confirm('Confirm this result immediately and update public standings?')) return;
          save.disabled = true;
          try {
            const games = [[0,1],[2,3],[4,5]].filter(pair => pair.some(index => inputs[index].value !== '')).map(pair => pair.map(index => inputs[index].value === '' ? null : Number(inputs[index].value)));
            await scheduleRequest(`/api/admin/racquetball/matches/${entry.id}/result`, {
              method: 'POST', body: JSON.stringify(forfeit.value ? { forfeit: true, winner: Number(forfeit.value) } : { games })
            });
            if (current === generation) { await loadResults(); element('scheduleStatus').textContent = 'Result confirmed. Standings updated.'; }
          } catch (error) { element('scheduleStatus').textContent = error.message; } finally { save.disabled = false; }
        });
        const clear = document.createElement('button'); clear.type = 'button'; clear.textContent = 'Clear Result / Reopen Match';
        clear.addEventListener('click', async () => {
          if (!confirm('Remove this result from standings and reopen the match?')) return;
          try {
            await scheduleRequest(`/api/admin/racquetball/matches/${entry.id}/result`, { method: 'POST', body: JSON.stringify({ clear: true }) });
            if (current === generation) await loadResults();
          } catch (error) { element('scheduleStatus').textContent = error.message; }
        });
        article.append(form, clear);
        return article;
      });
      element('adminMatchResults').replaceChildren(...articles);
    } catch (error) { if (current === generation) element('scheduleStatus').textContent = error.message; }
  }
})();
