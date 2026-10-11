(() => {
  const element = id => document.getElementById(id);
  const easternToday = () => new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Toronto', year: 'numeric', month: '2-digit', day: '2-digit'
  }).format(new Date());
  let selectedDate = easternToday();
  let month = selectedDate.slice(0, 7);
  let events = [];
  let loaded = false;
  let generation = 0;
  const dateLabel = (date, options) => new Date(`${date}T12:00:00Z`).toLocaleDateString(undefined, { timeZone: 'UTC', ...options });
  const timeLabel = time => {
    const [hour, minute] = time.split(':').map(Number);
    return `${hour % 12 || 12}:${String(minute).padStart(2, '0')} ${hour < 12 ? 'AM' : 'PM'}`;
  };

  function renderDay() {
    element('selectedDayHeading').textContent = dateLabel(selectedDate, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    const entries = events.filter(event => event.date === selectedDate);
    const children = entries.map(event => {
      const article = document.createElement('article');
      article.className = 'event';
      const title = document.createElement('h3');
      title.textContent = event.title;
      article.appendChild(title);
      for (const text of [
        `${event.kind[0].toUpperCase()}${event.kind.slice(1)} | ${timeLabel(event.startTime)} - ${timeLabel(event.endTime)} Eastern Time`,
        event.location ? `Location: ${event.location}` : '', event.notes
      ].filter(Boolean)) {
        const paragraph = document.createElement('p');
        paragraph.textContent = text;
        article.appendChild(paragraph);
      }
      return article;
    });
    if (!children.length) {
      const message = document.createElement('p');
      message.textContent = loaded ? 'No Racquetball events scheduled for this date yet.' : 'Schedule unavailable until this month loads successfully.';
      children.push(message);
    }
    element('dayEvents').replaceChildren(...children);
  }

  function renderCalendar() {
    element('monthHeading').textContent = dateLabel(`${month}-01`, { month: 'long', year: 'numeric' });
    const first = new Date(`${month}-01T12:00:00Z`);
    const days = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
    const children = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(label => {
      const heading = document.createElement('div');
      heading.className = 'weekday';
      heading.textContent = label;
      return heading;
    });
    for (let index = 0; index < 42; index++) {
      const day = index - first.getUTCDay() + 1;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'day';
      if (day < 1 || day > days) {
        button.disabled = true;
        button.setAttribute('aria-hidden', 'true');
      } else {
        const date = `${month}-${String(day).padStart(2, '0')}`;
        const count = events.filter(event => event.date === date).length;
        button.textContent = String(day);
        button.setAttribute('aria-label', `${dateLabel(date, { month: 'long', day: 'numeric', year: 'numeric' })}${count ? `, ${count} scheduled ${count === 1 ? 'event' : 'events'}` : ''}`);
        button.setAttribute('aria-pressed', String(date === selectedDate));
        if (date === easternToday()) button.setAttribute('aria-current', 'date');
        if (count) {
          const badge = document.createElement('span');
          badge.className = 'event-count';
          badge.textContent = `${count} ${count === 1 ? 'event' : 'events'}`;
          button.appendChild(badge);
        }
        button.addEventListener('click', () => {
          selectedDate = date;
          for (const cell of element('calendar').querySelectorAll('[aria-pressed]')) cell.setAttribute('aria-pressed', String(cell === button));
          renderDay();
          void window.leaguePortal?.matchesForDate(date);
        });
      }
      children.push(button);
    }
    element('calendar').replaceChildren(...children);
    element('previousMonth').disabled = month === '2000-01';
    element('nextMonth').disabled = month === '2100-12';
    renderDay();
  }

  async function loadMonth() {
    const current = ++generation;
    events = [];
    loaded = false;
    renderCalendar();
    element('calendarStatus').textContent = 'Loading schedule...';
    try {
      const response = await fetch(`/api/racquetball/schedule?month=${month}`, { cache: 'no-store', signal: AbortSignal.timeout(15000) });
      const result = await response.json();
      if (current !== generation) return;
      if (!response.ok || !result.success || !Array.isArray(result.events)) throw new Error(result.error || 'Unable to load the schedule.');
      events = result.events;
      loaded = true;
      renderCalendar();
      element('calendarStatus').textContent = events.length ? `${events.length} ${events.length === 1 ? 'event' : 'events'} this month. Select a date for details.` : 'No events scheduled this month yet. Check back for the league schedule.';
    } catch (error) {
      if (current === generation) element('calendarStatus').textContent = `${error.message} Use Refresh to try again.`;
    }
  }

  function navigateMonth(change) {
    const [year, number] = month.split('-').map(Number);
    const date = new Date(Date.UTC(year, number - 1 + change, 1));
    month = date.toISOString().slice(0, 7);
    selectedDate = `${month}-01`;
    void loadMonth();
  }
  element('previousMonth').addEventListener('click', () => navigateMonth(-1));
  element('nextMonth').addEventListener('click', () => navigateMonth(1));
  element('today').addEventListener('click', () => { selectedDate = easternToday(); month = selectedDate.slice(0, 7); void loadMonth(); });
  element('refreshSchedule').addEventListener('click', loadMonth);
  document.addEventListener('league-calendar-refresh', loadMonth);
  document.addEventListener('league-select-date', event => {
    selectedDate = event.detail;
    month = selectedDate.slice(0, 7);
    void loadMonth();
  });
  void loadMonth();
})();
