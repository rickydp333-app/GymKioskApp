(() => {
  const root = document.getElementById('leaguePortal');
  if (!root) return;
  const kiosk = root.dataset.kiosk === 'true';
  let token = null, member = null, generation = 0, selectedDate = null, cachedNotice = '';
  const el = id => root.querySelector(`#${id}`);
  root.innerHTML = `
    <div class="toolbar">
      <button id="leagueHome" type="button">League Home</button>
      <button id="leagueStandingsButton" type="button">Standings · 2026–27</button>
      <button id="leagueRulesButton" type="button" hidden>Rules of Racquetball in Canada</button>
      <button id="leagueMatchesButton" type="button" hidden>My Scheduled Games</button>
      ${kiosk ? '' : '<button id="leagueLoginButton" type="button">Player Sign In</button><button id="leagueLogoutButton" type="button" hidden>Player Log Out</button>'}
    </div>
    <p id="leagueStatus" role="status" aria-live="polite"></p>
    <section id="leaguePoints" class="league-panel">
      <h2>League Points · 2026–27</h2>
      <p>Best of three: first two games to 15, tiebreaker to 11. Every game must be won by two points.</p>
      <ul class="league-points">
        <li><strong>5 points:</strong> Winning in two consecutive games, or by opponent forfeit.</li>
        <li><strong>4 points:</strong> Winning in a three-game tiebreaker.</li>
        <li><strong>2 points:</strong> Losing in a three-game tiebreaker.</li>
        <li><strong>1 point:</strong> Losing in two games while scoring 20 or more total points.</li>
        <li><strong>0 points:</strong> Losing in two games with fewer than 20 total points, or forfeiting.</li>
      </ul>
      <p>Only opponent-confirmed or admin-resolved results count. Forfeits add no artificial game scores. Ranking: league points, matches won, then scored-point differential. Equal records share rank.</p>
    </section>
    <section id="leagueLogin" class="league-panel" hidden>
      <h2>Player Sign In</h2><p>Use the same email and four-digit PIN as your kiosk Racquetball registration. Online match actions require internet.</p>
      <form id="leagueLoginForm"><label>Email<input id="leagueEmail" type="email" maxlength="254" autocomplete="username" required></label>
      <label>4-digit PIN<input id="leaguePin" type="password" inputmode="numeric" pattern="[0-9]{4}" maxlength="4" autocomplete="current-password" required></label>
      <button type="submit">Sign In</button></form>
    </section>
    <section id="leagueStandings" class="league-panel" hidden><h2>Public Standings · 2026–27</h2><button id="leagueRefreshStandings" type="button">Refresh Standings</button><div id="leagueStandingsRows" class="league-table-wrap"></div></section>
    <section id="leagueRules" class="league-panel" hidden>
      <h2>Rules of Racquetball in Canada</h2>
      <p>Original plain-language guide, checked against Racquetball Canada and the IRF on October 10, 2026. This is a summary, not an official rulebook or substitute for a referee.</p>
      <h3>Official rules and our league format</h3>
      <p>Racquetball Canada follows International Racquetball Federation rules. IRF competition uses rally scoring, best of five games to 11, won by two. Canada’s introductory page also describes an older 15-point format; always check the current rulebook and event regulations.</p>
      <p><strong>Our league uses a different match format:</strong> best of three, first two games to 15 and the tiebreaker to 11, with a two-point winning margin in every game. The league points shown on this page are local standings rules, not Canadian federation ranking points.</p>
      <h3>Court, equipment, and safety</h3>
      <p>Standard indoor courts are 20 feet wide, 40 feet long, and 20 feet high. Wear approved protective eyewear and the racquet’s wrist tether. Give your opponent room to swing and access the ball; stop a rally rather than risk a collision or striking another player.</p>
      <h3>Serving</h3>
      <p>Serve from inside the service zone: bounce the ball, then strike it toward the front wall. A legal serve reaches the front wall first and lands beyond the short line before reaching the back wall. Short serves, ceiling serves, and serves reaching the back wall before the floor are faults. A serve striking another surface before the front wall is not legal. Receivers must respect the receiving/safety line restrictions.</p>
      <h3>Rallies and returns</h3>
      <p>Players alternate returns. Return the ball to the front wall before its second floor bounce; it must reach the front wall before touching the floor. Side walls, the back wall, and ceiling can be used during rallies. A skipped return or second bounce ends the rally. In rally scoring, each rally awards a point and the rally winner serves next.</p>
      <h3>Hinders, faults, and disputes</h3>
      <p>Interference that stops safe, fair play can lead to a replay; avoidable interference can cost the rally. Serving faults and out serves have different penalties under the rulebook. For disputed calls, pause play and consult the referee or league administrator rather than improvising a penalty.</p>
      <p><a href="https://racquetballcanada.ca/rules-officiating/" target="_blank" rel="noopener">Racquetball Canada rules and officiating</a> ·
      <a href="https://racquetballcanada.ca/getting-started/" target="_blank" rel="noopener">Racquetball Canada basics</a> ·
      <a href="https://www.internationalracquetball.com/wp-content/uploads/2026/06/1-irf-rulebook_mar26-1.pdf" target="_blank" rel="noopener">IRF 2026 rulebook (PDF)</a></p>
    </section>
    <section id="leagueMatches" class="league-panel" hidden><h2>My Scheduled Games</h2><button id="leagueRefreshMatches" type="button">Refresh My Games</button><div id="leagueMatchRows"></div></section>
    <section id="leagueAction" class="league-panel" hidden><h2 id="leagueActionTitle"></h2><div id="leagueActionContent"></div><button id="leagueCancelAction" type="button">Close Panel</button></section>
    <section id="leagueConfirmation" class="league-panel" hidden><h2>Opponent Confirmation</h2><div id="leagueConfirmationContent"></div></section>`;

  async function api(path, options = {}) {
    if (kiosk && window.electron?.leagueRequest) {
      const response = await window.electron.leagueRequest({ path, method: options.method || 'GET', body: options.body, token });
      if (!response.success) {
        if (response.status === 401 && token) logout(false);
        throw new Error(response.error || 'League service is unavailable.');
      }
      cachedNotice = response.cached ? `Offline: cached public data from ${new Date(response.cachedAt).toLocaleString()}.` : '';
      if (cachedNotice) status(cachedNotice);
      return response.data;
    }
    const response = await fetch(path, {
      method: options.method || 'GET', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      ...(options.body ? { body: JSON.stringify(options.body) } : {}), cache: 'no-store', signal: AbortSignal.timeout(15000)
    });
    const result = await response.json();
    if (!response.ok) {
      if (response.status === 401 && token) logout(false);
      throw new Error(result.error || `League request failed (HTTP ${response.status}).`);
    }
    return result;
  }
  function status(text) { el('leagueStatus').textContent = text; }
  function panel(id) {
    for (const name of ['leaguePoints', 'leagueLogin', 'leagueStandings', 'leagueRules', 'leagueMatches', 'leagueAction', 'leagueConfirmation']) el(name).hidden = name !== id;
  }
  function textNode(tag, text) { const node = document.createElement(tag); node.textContent = text; return node; }
  function button(text, action) {
    const node = textNode('button', text); node.type = 'button';
    node.addEventListener('click', async () => {
      node.disabled = true;
      try { await action(); } catch (error) { status(error.message); }
      finally { node.disabled = false; }
    });
    return node;
  }
  function signedIn(result) {
    generation++; token = result.token; member = result.member;
    el('leagueRulesButton').hidden = false; el('leagueMatchesButton').hidden = false;
    if (!kiosk) { el('leagueLoginButton').hidden = true; el('leagueLogoutButton').hidden = false; }
    status(`Welcome, ${member.fullName}. You are signed into the online league.`);
    panel('leaguePoints');
  }
  function logout(remote = true) {
    if (remote && token) void api('/api/racquetball/logout', { method: 'POST' }).catch(error => status(error.message));
    generation++; token = null; member = null; selectedDate = null;
    el('leagueRulesButton').hidden = true; el('leagueMatchesButton').hidden = true;
    el('leagueMatchRows').replaceChildren(); el('leagueActionContent').replaceChildren();
    if (!kiosk) { el('leagueLoginButton').hidden = false; el('leagueLogoutButton').hidden = true; el('leaguePin').value = ''; }
    panel('leaguePoints');
  }
  async function login(email, pin) {
    const current = generation;
    const result = await api('/api/racquetball/login', { method: 'POST', body: { email, pin } });
    if (current !== generation) return;
    signedIn(result);
  }
  async function standings() {
    panel('leagueStandings');
    status('Loading standings...');
    try {
      const result = await api('/api/racquetball/standings');
      const table = document.createElement('table'); table.className = 'league-table';
      const header = document.createElement('tr');
      for (const title of ['Rank', 'Player', 'Played', 'Won', 'Lost', 'Points', 'Scored', 'Conceded', '+/−']) header.appendChild(textNode('th', title));
      const head = document.createElement('thead'); head.appendChild(header); table.appendChild(head);
      const body = document.createElement('tbody');
      for (const row of result.standings) {
        const tr = document.createElement('tr');
        for (const value of [row.rank, row.name, row.played, row.wins, row.losses, row.points, row.scored, row.conceded, row.differential]) tr.appendChild(textNode('td', String(value)));
        body.appendChild(tr);
      }
      table.appendChild(body);
      el('leagueStandingsRows').replaceChildren(table);
      if (!result.standings.length) el('leagueStandingsRows').appendChild(textNode('p', 'No registered players yet.'));
      status(cachedNotice || 'Standings include confirmed matches only.');
    } catch (error) { status(error.message); }
  }
  function gameForm(container, entry, save) {
    const form = document.createElement('form');
    form.appendChild(textNode('p', `Enter scores in this order: ${entry.player1Name} (left), ${entry.player2Name} (right).`));
    const inputs = [];
    for (let game = 0; game < 3; game++) {
      const row = document.createElement('div'); row.className = 'league-game';
      for (let side = 0; side < 2; side++) {
        const label = textNode('label', `Game ${game + 1} · ${side === 0 ? entry.player1Name : entry.player2Name}${game === 2 ? ' (if needed)' : ''}`);
        const input = document.createElement('input'); input.type = 'text'; input.inputMode = 'numeric'; input.pattern = '[0-9]{1,3}'; input.maxLength = 3; input.required = game < 2;
        label.appendChild(input); row.appendChild(label); inputs.push(input);
      }
      form.appendChild(row);
    }
    const forfeitLabel = textNode('label', 'Forfeit winner (leave blank for played games)');
    const forfeit = document.createElement('select'); forfeit.add(new Option('No forfeit', ''));
    forfeit.add(new Option(entry.player1Name, '1')); forfeit.add(new Option(entry.player2Name, '2'));
    forfeitLabel.appendChild(forfeit); form.appendChild(forfeitLabel);
    forfeit.addEventListener('change', () => inputs.forEach((input, index) => { input.disabled = !!forfeit.value; input.required = !forfeit.value && index < 4; }));
    const submit = textNode('button', 'Submit Scores for Opponent Confirmation'); submit.type = 'submit'; form.appendChild(submit);
    form.addEventListener('submit', async event => {
      event.preventDefault(); submit.disabled = true;
      const games = [[0, 1], [2, 3], [4, 5]].filter(pair => pair.some(index => inputs[index].value !== '')).map(pair => pair.map(index => inputs[index].value === '' ? null : Number(inputs[index].value)));
      try { await save(forfeit.value ? { forfeit: true, winner: Number(forfeit.value) } : { games }); }
      catch (error) { status(error.message); } finally { submit.disabled = false; }
    });
    container.appendChild(form);
    if (kiosk) {
      let active = null;
      inputs.forEach(input => input.addEventListener('focus', () => { active = input; }));
      const keys = document.createElement('div'); keys.className = 'league-keypad';
      for (const key of ['1','2','3','4','5','6','7','8','9','0','Backspace','Next']) {
        const keyButton = button(key, () => {
          if (!active || active.disabled) return;
          if (key === 'Next') { const next = inputs[(inputs.indexOf(active) + 1) % inputs.length]; next.focus(); return; }
          const start = active.selectionStart ?? active.value.length, end = active.selectionEnd ?? start;
          const before = active.value.slice(0, start), after = active.value.slice(end);
          const value = key === 'Backspace' ? (start === end ? before.slice(0, -1) : before) + after : before + key + after;
          if (value.length > 3) return;
          const cursor = key === 'Backspace' ? Math.max(0, start - (start === end ? 1 : 0)) : start + 1;
          active.value = value; active.focus(); active.setSelectionRange(cursor, cursor);
        });
        keyButton.addEventListener('pointerdown', event => event.preventDefault()); keys.appendChild(keyButton);
      }
      container.appendChild(keys);
    }
  }
  function startAction(entry, type) {
    panel('leagueAction'); el('leagueActionContent').replaceChildren();
    el('leagueActionTitle').textContent = `${type === 'score' ? 'Enter Scores' : 'Suggest New Times'} · ${entry.title}`;
    const current = generation;
    if (type === 'score') gameForm(el('leagueActionContent'), entry, async payload => {
      const result = await api(`/api/racquetball/matches/${entry.id}/scores`, { method: 'POST', body: payload });
      if (current !== generation) return;
      await matches(); status(result.message);
    });
    else {
      const form = document.createElement('form'), rows = [];
      form.appendChild(textNode('p', 'Suggest up to three alternatives in Eastern Time. The opponent chooses one; acceptance updates both calendars.'));
      for (let index = 0; index < 3; index++) {
        const row = document.createElement('div'); row.className = 'league-slot'; const fields = {};
        for (const [key, label, type] of [['date', 'Date', 'date'], ['startTime', 'Start time', 'time'], ['endTime', 'End time', 'time']]) {
          const wrapper = textNode('label', `Option ${index + 1} · ${label}`);
          const input = document.createElement('input'); input.type = type; input.required = index === 0;
          if (type === 'date') { input.min = '2000-01-01'; input.max = '2100-12-31'; }
          fields[key] = input; wrapper.appendChild(input); row.appendChild(wrapper);
        }
        rows.push(fields); form.appendChild(row);
      }
      const submit = textNode('button', 'Send Alternatives to Opponent'); submit.type = 'submit'; form.appendChild(submit);
      form.addEventListener('submit', async event => {
        event.preventDefault(); submit.disabled = true;
        try {
          const options = rows.filter(row => Object.values(row).some(input => input.value)).map(row => Object.fromEntries(Object.entries(row).map(([key, input]) => [key, input.value])));
          const result = await api(`/api/racquetball/matches/${entry.id}/reschedule`, { method: 'POST', body: { options } });
          if (current !== generation) return;
          await matches(); status(result.message);
        } catch (error) { status(error.message); } finally { submit.disabled = false; }
      });
      el('leagueActionContent').appendChild(form);
    }
  }
  function confirmation(container, request, respond) {
    container.replaceChildren();
    container.appendChild(textNode('p', `${request.match.title} · ${request.match.player1Name} vs ${request.match.player2Name}`));
    let choice = null;
    if (request.type === 'score') {
      const payload = request.payload;
      container.appendChild(textNode('p', payload.forfeit ? `Forfeit winner: ${payload.winner === 1 ? request.match.player1Name : request.match.player2Name}` : payload.games.map((game, index) => `Game ${index + 1}: ${game[0]} - ${game[1]}`).join(' | ')));
    } else {
      choice = document.createElement('select');
      request.payload.options.forEach((slot, index) => choice.add(new Option(`${slot.date} · ${slot.startTime} - ${slot.endTime} Eastern`, String(index))));
      const label = textNode('label', 'Choose the time you accept'); label.appendChild(choice); container.appendChild(label);
    }
    container.append(button(request.type === 'score' ? 'Approve Score and Update Standings' : 'Accept Selected Time', () => respond('approve', choice ? Number(choice.value) : undefined)));
    container.append(button(request.type === 'score' ? 'Dispute Score' : 'Decline All Alternatives', () => respond('decline')));
  }
  async function matches() {
    if (!token) { status('Sign into the online league first.'); return; }
    panel('leagueMatches'); const current = generation; status('Loading your games...');
    try {
      const result = await api('/api/racquetball/my-matches');
      if (current !== generation) return;
      const articles = result.matches.filter(entry => !selectedDate || entry.date === selectedDate).map(entry => {
        const article = document.createElement('article'); article.className = 'league-match';
        article.append(textNode('h3', entry.title), textNode('p', `${entry.date} · ${entry.startTime} - ${entry.endTime} Eastern · ${entry.location}`),
          textNode('p', `${entry.player1Name} vs ${entry.player2Name} · ${entry.status}`));
        const dateButton = button('Select Match Date · Scores / Suggest Times', () => {
          document.dispatchEvent(new CustomEvent('league-select-date', { detail: entry.date }));
          status(`${entry.date} selected. Use the match controls below.`);
        });
        article.appendChild(dateButton);
        if (entry.status === 'scheduled' || entry.status === 'pending') article.appendChild(button('Enter Game Scores', () => startAction(entry, 'score')));
        if (entry.status === 'scheduled') article.appendChild(button('Suggest Other Dates / Times', () => startAction(entry, 'reschedule')));
        if (entry.result) article.appendChild(textNode('p', entry.result.forfeit ? 'Confirmed forfeit.' : `Confirmed scores: ${entry.result.games.map(game => game.join('–')).join(', ')}`));
        for (const request of entry.pending) {
          article.appendChild(textNode('p', `${request.type} request: ${request.status}`));
          if (request.canRespond) {
            const target = document.createElement('div');
            confirmation(target, { ...request, match: entry }, async (decision, option) => {
              const response = await api(`/api/racquetball/requests/${request.id}/respond`, { method: 'POST', body: { decision, option } });
              if (current !== generation) return;
              selectedDate = null;
              document.dispatchEvent(new CustomEvent('league-calendar-refresh'));
              await matches(); status(response.message);
            });
            article.appendChild(target);
          }
        }
        return article;
      });
      el('leagueMatchRows').replaceChildren(...articles);
      status(articles.length ? `Select your match${selectedDate ? ` on ${selectedDate}` : ''} to enter scores or suggest new times.` :
        selectedDate ? `You have no assigned matches on ${selectedDate}. Choose My Scheduled Games to see all dates.` : 'You have no assigned matches yet.');
    } catch (error) { status(error.message); }
  }
  el('leagueHome').addEventListener('click', () => panel('leaguePoints'));
  el('leagueStandingsButton').addEventListener('click', standings);
  el('leagueRefreshStandings').addEventListener('click', standings);
  el('leagueRulesButton').addEventListener('click', () => { if (member) panel('leagueRules'); });
  el('leagueMatchesButton').addEventListener('click', () => { selectedDate = null; void matches(); });
  el('leagueRefreshMatches').addEventListener('click', matches);
  el('leagueCancelAction').addEventListener('click', () => { el('leagueActionContent').replaceChildren(); void matches(); });
  if (!kiosk) {
    el('leagueLoginButton').addEventListener('click', () => panel('leagueLogin'));
    el('leagueLogoutButton').addEventListener('click', () => { logout(); status('Logged out.'); });
    el('leagueLoginForm').addEventListener('submit', async event => {
      event.preventDefault();
      const submit = event.submitter; submit.disabled = true;
      try { await login(el('leagueEmail').value, el('leaguePin').value); } catch (error) { status(error.message); }
      finally { el('leaguePin').value = ''; submit.disabled = false; }
    });
  }
  window.leaguePortal = {
    login, logout, api,
    localSignIn: localMember => {
      if (!kiosk) return;
      generation++; member = localMember;
      el('leagueRulesButton').hidden = false;
    },
    matchesForDate: async date => { if (token) { selectedDate = date; await matches(); } }
  };
  if (location.pathname.endsWith('/standings')) void standings();
  if (location.pathname.endsWith('/rules')) { panel('leagueLogin'); status('Sign in to view Rules of Racquetball in Canada.'); }
  if (location.pathname.endsWith('/confirm')) {
    panel('leagueConfirmation');
    const confirmationToken = location.hash.slice(1);
    history.replaceState(null, '', location.pathname);
    api('/api/racquetball/confirmation/review', { method: 'POST', body: { token: confirmationToken } }).then(request => {
      confirmation(el('leagueConfirmationContent'), request, async (decision, option) => {
        const response = await api('/api/racquetball/confirmation/respond', { method: 'POST', body: { token: confirmationToken, decision, option } });
        el('leagueConfirmationContent').replaceChildren(textNode('p', response.message));
        document.dispatchEvent(new CustomEvent('league-calendar-refresh'));
      });
    }).catch(error => status(error.message));
  }
})();
