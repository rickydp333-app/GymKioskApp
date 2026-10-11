(() => {
  const element = id => document.getElementById(id);
  let displayedMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  let selectedDate = new Date();
  let formMode = 'signup';
  let resetMemberId = null;
  let activeInput = null;
  let uppercase = false;
  let pending = false;
  let formGeneration = 0;
  let returnFocus = null;
  let leagueEvents = [];
  let calendarGeneration = 0;
  document.addEventListener('league-calendar-refresh', () => void loadLeagueCalendar());

  function calendarDays(year, month) {
    const first = new Date(year, month, 1);
    const count = new Date(year, month + 1, 0).getDate();
    return Array.from({ length: 42 }, (_, index) => {
      const day = index - first.getDay() + 1;
      return day >= 1 && day <= count ? day : null;
    });
  }

  function renderCalendar() {
    const calendar = element('racquetballCalendar');
    calendar.replaceChildren();
    element('racquetballMonthHeading').textContent = displayedMonth.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
    ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].forEach(label => {
      const heading = document.createElement('div');
      heading.className = 'racquetball-weekday';
      heading.textContent = label;
      calendar.appendChild(heading);
    });
    const today = new Date();
    calendarDays(displayedMonth.getFullYear(), displayedMonth.getMonth()).forEach(day => {
      const cell = document.createElement('button');
      cell.type = 'button';
      cell.className = 'racquetball-day';
      cell.disabled = day === null;
      if (day !== null) {
        const date = new Date(displayedMonth.getFullYear(), displayedMonth.getMonth(), day);
        const events = leagueEvents.filter(entry => entry.date === `${displayedMonth.getFullYear()}-${String(displayedMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`);
        cell.textContent = `${day}${events.length ? ` · ${events.length}` : ''}`;
        cell.setAttribute('aria-label', date.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }));
        if (date.toDateString() === today.toDateString()) {
          cell.classList.add('is-today');
          cell.setAttribute('aria-current', 'date');
        }
        const selected = date.toDateString() === selectedDate.toDateString();
        cell.classList.toggle('is-selected', selected);
        cell.setAttribute('aria-pressed', String(selected));
        cell.addEventListener('click', () => {
          selectedDate = date; renderCalendar();
          const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
          void window.leaguePortal?.matchesForDate(key);
        });
      } else {
        cell.setAttribute('aria-hidden', 'true');
      }
      calendar.appendChild(cell);
    });
    element('racquetballSelectedDate').textContent = selectedDate.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const dateKey = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`;
    const selected = leagueEvents.filter(entry => entry.date === dateKey);
    element('racquetballScheduleEmpty').textContent = selected.length
      ? selected.map(entry => `${entry.title}: ${entry.startTime}–${entry.endTime} Eastern · ${entry.location}`).join(' | ')
      : 'No league events loaded for this date.';
  }

  async function loadLeagueCalendar() {
    const current = ++calendarGeneration;
    const month = `${displayedMonth.getFullYear()}-${String(displayedMonth.getMonth() + 1).padStart(2, '0')}`;
    leagueEvents = [];
    renderCalendar();
    element('racquetballScheduleEmpty').textContent = 'Loading shared league schedule...';
    try {
      const result = await window.leaguePortal.api(`/api/racquetball/schedule?month=${month}`);
      if (current !== calendarGeneration) return;
      leagueEvents = result.events;
      renderCalendar();
    } catch (error) { if (current === calendarGeneration) element('racquetballScheduleEmpty').textContent = error.message; }
  }

  function closeForm() {
    formGeneration++;
    element('racquetballMemberModal').classList.add('hidden');
    element('racquetballMemberForm').reset();
    element('racquetballKeyboard').hidden = true;
    element('racquetballMemberModal').classList.remove('keyboard-open');
    element('racquetballKeyboardKeys').replaceChildren();
    activeInput = null;
    pending = false;
    element('racquetballSaveMemberBtn').disabled = false;
    if (returnFocus?.isConnected) returnFocus.focus();
  }

  function logOut() {
    window.leaguePortal?.logout();
    element('racquetballSignedIn').hidden = true;
    element('racquetballAuthActions').hidden = false;
    element('racquetballMemberName').textContent = '';
    element('racquetballStatus').textContent = '';
    if (!element('racquetballMemberModal').classList.contains('hidden')) closeForm();
  }

  function openForm(mode, memberId = null) {
    formGeneration++;
    returnFocus = document.activeElement;
    formMode = mode;
    resetMemberId = memberId;
    pending = false;
    uppercase = false;
    const signup = mode === 'signup';
    const resetting = mode === 'reset';
    element('racquetballMemberForm').reset();
    element('racquetballFormError').textContent = '';
    element('racquetballFormHeading').textContent = signup ? 'Racquetball Sign Up' : resetting ? 'Reset Racquetball PIN' : 'Racquetball Log In';
    element('racquetballSaveMemberBtn').textContent = signup ? 'Save Registration' : resetting ? 'Save New PIN' : 'Log In';
    element('racquetballSaveMemberBtn').disabled = false;
    for (const [labelId, inputId, visible] of [
      ['racquetballFullNameLabel', 'racquetballFullName', signup],
      ['racquetballPhoneLabel', 'racquetballPhone', signup],
      ['racquetballEmailLabel', 'racquetballEmail', !resetting],
      ['racquetballConfirmPinLabel', 'racquetballConfirmPin', signup || resetting]
    ]) {
      element(labelId).hidden = !visible;
      element(inputId).required = visible;
      element(inputId).disabled = !visible;
    }
    element('racquetballMemberModal').classList.remove('hidden');
    const firstInput = element(signup ? 'racquetballFullName' : resetting ? 'racquetballPin' : 'racquetballEmail');
    firstInput.focus();
    showKeyboard(firstInput);
  }

  function editInput(key, selection) {
    if (!activeInput) return;
    const input = activeInput;
    const start = selection?.start ?? input.selectionStart ?? input.value.length;
    const end = selection?.end ?? input.selectionEnd ?? start;
    const before = activeInput.value.slice(0, start);
    const after = activeInput.value.slice(end);
    let nextValue;
    let caret;
    if (key === 'Backspace') {
      nextValue = start === end ? before.slice(0, -1) + after : before + after;
      caret = start === end ? Math.max(0, start - 1) : start;
    } else {
      const text = key === 'Space' ? ' ' : uppercase ? key.toUpperCase() : key;
      nextValue = before + text + after;
      caret = start + text.length;
    }
    if (activeInput.maxLength > 0 && nextValue.length > activeInput.maxLength) return;
    input.value = nextValue;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.focus({ preventScroll: true });
    input.setSelectionRange(caret, caret);
  }

  function showKeyboard(input) {
    activeInput = input;
    const numeric = input.inputMode === 'numeric' || input.inputMode === 'tel';
    const rows = numeric
      ? [['1', '2', '3'], ['4', '5', '6'], ['7', '8', '9'], input.inputMode === 'tel' ? ['+', '0', '-'] : ['0']]
      : ['1234567890'.split(''), 'qwertyuiop'.split(''), 'asdfghjkl'.split(''), 'zxcvbnm'.split(''), ['@', '.', '-', '_', "'"]];
    rows.push(numeric ? ['Backspace', 'Clear', 'Next', 'Done'] : ['Shift', 'Space', 'Backspace', 'Clear', 'Next', 'Done']);
    element('racquetballKeyboardLabel').textContent = input.closest('label').childNodes[0].textContent.trim();
    const keys = element('racquetballKeyboardKeys');
    keys.replaceChildren();
    rows.forEach(row => {
      const line = document.createElement('div');
      line.className = row.some(key => key.length > 1) ? 'racquetball-keyboard-row racquetball-command-row' : 'racquetball-keyboard-row';
      row.forEach(key => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = `racquetball-key${key.length > 1 ? ' is-command' : ''}`;
        button.textContent = key === 'Backspace' ? '\u232b' : key.length === 1 && uppercase ? key.toUpperCase() : key;
        button.setAttribute('aria-label', key === 'Backspace' ? 'Delete previous character' : key);
        button.title = key;
        let selection = null;
        button.addEventListener('pointerdown', event => {
          selection = { start: input.selectionStart, end: input.selectionEnd };
          event.preventDefault();
        });
        button.addEventListener('click', () => {
          const keySelection = selection || { start: input.selectionStart, end: input.selectionEnd };
          selection = null;
          if (key === 'Shift') {
            uppercase = !uppercase;
            showKeyboard(input);
            input.focus({ preventScroll: true });
            input.setSelectionRange(keySelection.start, keySelection.end);
          }
          else if (key === 'Clear') {
            input.value = '';
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.focus({ preventScroll: true });
            input.setSelectionRange(0, 0);
          }
          else if (key === 'Done') {
            element('racquetballKeyboard').hidden = true;
            element('racquetballMemberModal').classList.remove('keyboard-open');
            element('racquetballSaveMemberBtn').focus();
          }
          else if (key === 'Next') {
            const fields = [...element('racquetballMemberForm').querySelectorAll('input')].filter(field => !field.disabled);
            const nextInput = fields[(fields.indexOf(input) + 1) % fields.length];
            nextInput.focus();
            showKeyboard(nextInput);
          } else editInput(key, keySelection);
        });
        line.appendChild(button);
      });
      keys.appendChild(line);
    });
    element('racquetballKeyboard').hidden = false;
    element('racquetballMemberModal').classList.add('keyboard-open');
    requestAnimationFrame(() => {
      if (activeInput === input && !element('racquetballKeyboard').hidden) {
        input.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    });
  }

  async function submitForm(event) {
    event.preventDefault();
    const form = element('racquetballMemberForm');
    if (pending || !form.reportValidity()) return;
    const pin = element('racquetballPin').value;
    if (formMode !== 'login' && pin !== element('racquetballConfirmPin').value) {
      element('racquetballFormError').textContent = 'The PINs do not match.';
      return;
    }
    const operation = formMode === 'signup' ? 'racquetballSignUp' : formMode === 'reset' ? 'racquetballResetPin' : 'racquetballLogIn';
    if (typeof window.electron?.[operation] !== 'function') {
      element('racquetballFormError').textContent = 'League registration and login require the installed kiosk app.';
      return;
    }
    const payload = formMode === 'reset'
      ? { memberId: resetMemberId, pin, token: window.getAdminSessionToken?.() }
      : { fullName: element('racquetballFullName').value, email: element('racquetballEmail').value, phone: element('racquetballPhone').value, pin };
    const generation = formGeneration;
    const mode = formMode;
    pending = true;
    element('racquetballSaveMemberBtn').disabled = true;
    element('racquetballFormError').textContent = '';
    try {
      const result = await window.electron[operation](payload);
      if (generation !== formGeneration) return;
      if (!result?.success) { element('racquetballFormError').textContent = result?.error || 'Your request could not be saved.'; return; }
      closeForm();
      if (mode === 'reset') {
        element('racquetballRecoveryStatus').textContent = 'Member PIN reset. Give the new PIN privately to the member.';
      } else {
        element('racquetballAuthActions').hidden = true;
        element('racquetballSignedIn').hidden = false;
        element('racquetballMemberName').textContent = result.member.fullName;
        element('racquetballStatus').textContent = mode === 'signup'
          ? 'Registration saved on this kiosk. Website upload is queued and will retry automatically. You are logged in.'
          : 'You are logged in.';
        try {
          window.leaguePortal?.localSignIn(result.member);
          await window.leaguePortal?.login(payload.email, pin);
        } catch (error) {
          if (generation + 1 === formGeneration) element('racquetballStatus').textContent += ` Online league: ${error.message}`;
        }
      }
    } catch (_error) {
      if (generation === formGeneration) element('racquetballFormError').textContent = 'Unable to reach league storage. Please try again.';
    } finally {
      if (generation === formGeneration) { pending = false; element('racquetballSaveMemberBtn').disabled = false; }
    }
  }

  function initialize() {
    if (!element('openRacquetballBtn')) return;
    element('openRacquetballBtn').addEventListener('click', () => { logOut(); void loadLeagueCalendar(); window.showScreen('racquetballScreen'); });
    element('racquetballBackBtn').addEventListener('click', () => { logOut(); window.showScreen('userScreen'); });
    element('racquetballSignUpBtn').addEventListener('click', () => openForm('signup'));
    element('racquetballLogInBtn').addEventListener('click', () => openForm('login'));
    element('racquetballLogOutBtn').addEventListener('click', logOut);
    element('racquetballCancelMemberBtn').addEventListener('click', closeForm);
    element('racquetballMemberForm').addEventListener('submit', submitForm);
    element('racquetballMemberForm').querySelectorAll('input').forEach(input => {
      input.addEventListener('focus', () => {
        if (activeInput !== input || element('racquetballKeyboard').hidden) showKeyboard(input);
      });
      input.addEventListener('click', () => showKeyboard(input));
    });
    element('racquetballPreviousMonth').addEventListener('click', () => { displayedMonth = new Date(displayedMonth.getFullYear(), displayedMonth.getMonth() - 1, 1); void loadLeagueCalendar(); });
    element('racquetballNextMonth').addEventListener('click', () => { displayedMonth = new Date(displayedMonth.getFullYear(), displayedMonth.getMonth() + 1, 1); void loadLeagueCalendar(); });
    element('racquetballTodayBtn').addEventListener('click', () => { selectedDate = new Date(); displayedMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1); void loadLeagueCalendar(); });
    document.addEventListener('league-select-date', event => {
      selectedDate = new Date(`${event.detail}T12:00:00`);
      displayedMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
      void loadLeagueCalendar();
    });
    element('racquetballMemberModal').addEventListener('keydown', event => {
      if (event.key === 'Escape') { event.preventDefault(); closeForm(); }
      if (event.key === 'Tab') {
        const fields = [...element('racquetballMemberModal').querySelectorAll('input,button')].filter(field => !field.disabled && field.offsetParent !== null);
        const first = fields[0], last = fields[fields.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }
    });
    element('racquetballLoadMembersBtn').addEventListener('click', async () => {
      const status = element('racquetballRecoveryStatus');
      const select = element('racquetballResetMember');
      select.replaceChildren(new Option('Select a member', ''));
      status.textContent = 'Loading league members...';
      try {
        const result = await window.electron?.racquetballListMembers?.({ token: window.getAdminSessionToken?.() });
        if (!result?.success) { status.textContent = result?.error || 'Open Admin in the installed kiosk app to reset league PINs.'; return; }
        result.members.forEach(member => select.add(new Option(`${member.fullName} - ${member.email}`, member.id)));
        status.textContent = result.members.length ? 'Select a member to reset their PIN.' : 'No league members registered yet.';
      } catch (_error) { status.textContent = 'Unable to load league members.'; }
    });
    element('racquetballResetPinBtn').addEventListener('click', () => {
      const memberId = element('racquetballResetMember').value;
      if (!memberId) { element('racquetballRecoveryStatus').textContent = 'Load and select a league member first.'; return; }
      openForm('reset', memberId);
    });
    const screenObserver = new MutationObserver(records => {
      if (records.some(record => record.target === element('racquetballScreen')) && element('racquetballScreen').classList.contains('hidden')) logOut();
      if (records.some(record => record.target === element('adminPanel')) && element('adminPanel').classList.contains('hidden')) {
        element('racquetballResetMember').replaceChildren(new Option('Select a member', ''));
        if (formMode === 'reset' && !element('racquetballMemberModal').classList.contains('hidden')) closeForm();
      }
    });
    screenObserver.observe(element('racquetballScreen'), { attributes: true, attributeFilter: ['class'] });
    screenObserver.observe(element('adminPanel'), { attributes: true, attributeFilter: ['class'] });
    renderCalendar();
  }

  window.racquetball = { logOut, calendarDays };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialize);
  else initialize();
})();