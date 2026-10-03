/* Guided orientation: navigates screens without generating or saving user data. */
(() => {
  const steps = [
    { buttonId: null, screen: 'mainActionsScreen', target: 'muscleGroupsBtn', title: 'Your main menu', text: 'Choose a workout, stretch, nutrition plan, challenge, or personal workout plan. You can return to this menu anytime.', hint: 'Next, we will visit each panel without changing or saving your workout data.' },
    { buttonId: 'muscleGroupsBtn', screen: 'muscleScreen', target: 'muscleScreenHeading', title: 'Muscle groups', text: 'Choose a body area to browse exercises, instructions, training info, and favorites.', hint: 'Each exercise can record weight, reps, and the date completed with Track Your Progress.' },
    { buttonId: 'fullBodyGeneratorBtn', screen: 'fullBodyGeneratorScreen', target: 'fullBodyGeneratorHeading', title: 'Full-body workout', text: 'Choose how many exercises and a difficulty level to build a balanced full-body session.', hint: 'Generated exercises also have Track Your Progress for recording your sets.' },
    { buttonId: 'stretchesBtn', screen: 'stretchScreen', target: 'stretchScreenHeading', title: 'Stretch panel', text: 'Choose a body area to browse guided stretches and mobility routines.', hint: 'Stretch routines can also be shared to your phone with a QR code.' },
    { buttonId: 'buildNutritionBtn', screen: 'nutritionBuilderScreen', target: 'nutritionBuilderHeading', title: 'Training nutrition and fuel guide', text: 'Choose a single-day or weekly plan and a goal to generate meal suggestions that support training.', hint: 'Nutrition plans can be shared to your phone with a QR code.' },
    { buttonId: 'dailyChallengeBtn', screen: 'dailyChallengeScreen', target: 'challengeTitle', title: 'Daily challenge or challenge a friend', text: 'Try the daily challenge or invite another user to take it with you.', hint: 'Challenge results can be completed and shared from this panel.' },
    { buttonId: 'interactiveCoachBtn', screen: 'interactiveCoachScreen', target: 'coachScreenHeading', title: 'Personal workout plan', text: 'The Interactive Coach uses your goals, schedule, and experience to help shape a personal training plan.', hint: 'Review the generated plan and share it to your phone when you are ready.' },
    { qrWalkthrough: true, screen: 'exerciseScreen', target: 'shareWorkoutBtn', title: 'Scan your workout to your phone', text: 'Tap “Send your workout to your phone by scanning the QR code with your camera”. Open your phone camera, scan the code, and tap the link. Each shared exercise includes its instructions and a form to record weight, reps, and completion date.', hint: 'This tour opens an example exercise list only. It does not create a workout, mark exercises complete, or display a real QR code.', phone: true },
    { buttonId: null, screen: 'mainActionsScreen', target: null, title: 'Ready to begin?', text: 'Choose what you want to do today, or explore on your own. Your selected workout results can follow you to your phone by QR code.', hint: 'The tour is complete. Your data has not been changed.', phone: true }
  ];
  let overlay = null;
  let highlighted = null;
  let index = 0;
  let inertElements = [];
  let originUser = null;
  const ADMIN_LOGIN_ORIGIN = '__admin_login__';
  let spacer = null;
  let frame = null;

  function positionHighlight() {
    if (!highlighted || !frame) return;
    const rect = highlighted.getBoundingClientRect();
    Object.assign(frame.style, { left: `${rect.left - 7}px`, top: `${rect.top - 7}px`, width: `${rect.width + 14}px`, height: `${rect.height + 14}px` });
  }

  function close() {
    highlighted?.classList.remove('kiosk-tour-highlight');
    highlighted = null;
    spacer?.remove();
    spacer = null;
    frame = null;
    overlay?.remove();
    overlay = null;
    inertElements.forEach(([element, previous]) => { element.inert = previous; });
    inertElements = [];
  }

  function createPanel(title) {
    close();
    document.querySelectorAll('.screen, #topControlsBar').forEach(element => {
      inertElements.push([element, element.inert]);
      element.inert = true;
    });
    overlay = document.createElement('div');
    overlay.className = 'kiosk-tour-overlay';
    const panel = document.createElement('section');
    panel.className = 'kiosk-tour-panel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true');
    panel.setAttribute('aria-labelledby', 'kiosk-tour-title');
    const heading = document.createElement('h2');
    heading.id = 'kiosk-tour-title';
    heading.textContent = title;
    panel.appendChild(heading);
    overlay.appendChild(panel);
    document.body.appendChild(overlay);
    overlay.addEventListener('keydown', event => {
      if (event.key === 'Escape') { event.preventDefault(); finish(); }
      if (event.key === 'Tab') {
        const buttons = [...overlay.querySelectorAll('button:not(:disabled)')];
        const first = buttons[0], last = buttons[buttons.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    });
    return panel;
  }

  function paragraph(panel, text, className) {
    const p = document.createElement('p');
    p.className = className || 'kiosk-tour-copy';
    p.textContent = text;
    panel.appendChild(p);
  }

  function button(container, label, action, primary = false) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = label;
    b.className = primary ? 'kiosk-tour-primary' : 'kiosk-tour-secondary';
    b.addEventListener('click', action);
    container.appendChild(b);
    return b;
  }

  function menuChoice(container, title, description, action, primary = false) {
    const choice = document.createElement('button');
    choice.type = 'button';
    choice.className = `kiosk-choice-button${primary ? ' kiosk-choice-primary' : ''}`;
    const label = document.createElement('strong');
    label.textContent = title;
    const detail = document.createElement('span');
    detail.textContent = description;
    choice.append(label, detail);
    choice.addEventListener('click', action);
    container.appendChild(choice);
    return choice;
  }

  function finish() {
    const adminLogin = originUser === ADMIN_LOGIN_ORIGIN;
    close();
    if (adminLogin) {
      showScreen('adminPanel');
      return;
    }
    if (window.currentUser && window.currentUser === originUser) {
      showMainActionsScreen();
      document.getElementById('startKioskTutorial')?.focus();
    }
  }

  function openMainAction(buttonId) {
    close();
    document.getElementById(buttonId)?.click();
  }

  function openWorkoutOptions() {
    const panel = createPanel('Work out');
    overlay.classList.add('kiosk-tour-centered');
    paragraph(panel, 'Choose how you want to train.');
    const choices = document.createElement('div');
    choices.className = 'kiosk-choice-grid kiosk-workout-choices';
    panel.appendChild(choices);
    menuChoice(choices, 'Muscle Groups', 'Browse exercises by body area.', () => openMainAction('muscleGroupsBtn'), true);
    menuChoice(choices, 'Full Body Workout', 'Build a session that works your whole body.', () => openMainAction('fullBodyGeneratorBtn'));
    const controls = document.createElement('div');
    controls.className = 'kiosk-tour-controls';
    panel.appendChild(controls);
    button(controls, 'Back', openTodayOptions);
    button(controls, 'Cancel', finish);
    choices.querySelector('button')?.focus();
  }

  function openTodayOptions() {
    const panel = createPanel('What would you like to do today?');
    overlay.classList.add('kiosk-tour-centered');
    paragraph(panel, 'Choose a starting point. You can return to the main menu at any time.');
    const choices = document.createElement('div');
    choices.className = 'kiosk-choice-grid';
    panel.appendChild(choices);
    menuChoice(choices, 'Work out', 'Choose muscle groups or a full-body workout.', openWorkoutOptions, true);
    menuChoice(choices, 'Stretch', 'Browse guided stretches by body area.', () => openMainAction('stretchesBtn'));
    menuChoice(choices, 'Nutrition plan', 'Build a training nutrition and fuel plan.', () => openMainAction('buildNutritionBtn'));
    menuChoice(choices, 'Challenge another user', 'Open the daily challenge and friend challenge panel.', () => openMainAction('dailyChallengeBtn'));
    menuChoice(choices, 'Create a personal workout plan', 'Get a plan tailored by the Interactive Coach.', () => openMainAction('interactiveCoachBtn'));
    const controls = document.createElement('div');
    controls.className = 'kiosk-tour-controls';
    panel.appendChild(controls);
    button(controls, 'Back', () => afterLogin({ adminMode: originUser === ADMIN_LOGIN_ORIGIN }));
    button(controls, 'Continue on your own', finish, true);
    choices.querySelector('button')?.focus();
  }

  function navigateToStep(step) {
    if (step.qrWalkthrough) {
      document.getElementById('muscleGroupsBtn')?.click();
      document.querySelector('#muscleScreen .muscle[data-muscle="chest"]')?.click();
      return;
    }
    if (step.buttonId) {
      document.getElementById(step.buttonId)?.click();
      return;
    }
    showScreen(step.screen, { skipHistory: true });
  }

  function renderStep() {
    const adminLogin = originUser === ADMIN_LOGIN_ORIGIN;
    if (!adminLogin && (!window.currentUser || window.currentUser !== originUser)) { close(); return; }
    close();
    const step = steps[index];
    navigateToStep(step);
    const panel = createPanel(step.title);
    overlay.classList.add(step.phone ? 'kiosk-tour-centered' : 'kiosk-tour-guided');
    const progress = document.createElement('div');
    progress.className = 'kiosk-tour-progress';
    progress.textContent = `Step ${index + 1} of ${steps.length}${step.phone ? ' · QR sharing to your phone' : ''}`;
    panel.prepend(progress);
    paragraph(panel, step.text);
    paragraph(panel, step.hint, 'kiosk-tour-hint');
    const controls = document.createElement('div');
    controls.className = 'kiosk-tour-controls';
    panel.appendChild(controls);
    button(controls, 'Skip tutorial', finish);
    if (index > 0) button(controls, 'Back', () => { index--; renderStep(); });
    const next = button(controls, index === steps.length - 1 ? 'Continue to app' : 'Next', () => {
      if (index === steps.length - 1) finish();
      else { index++; renderStep(); }
    }, true);
    highlighted = step.target ? document.getElementById(step.target) : null;
    if (highlighted && !highlighted.getClientRects().length) highlighted = document.getElementById('builderWorkoutTypeGrid');
    if (highlighted) {
      highlighted.classList.add('kiosk-tour-highlight');
      spacer = document.createElement('div');
      spacer.style.height = `${panel.offsetHeight + 180}px`;
      document.getElementById(step.screen).appendChild(spacer);
      highlighted.scrollIntoView({ block: 'start', behavior: 'instant' });
      window.scrollBy(0, -110);
      frame = document.createElement('div');
      frame.className = 'kiosk-tour-frame';
      frame.setAttribute('aria-hidden', 'true');
      overlay.prepend(frame);
      positionHighlight();
    }
    next.focus({ preventScroll: true });
  }

  function start() {
    if (!window.currentUser && originUser !== ADMIN_LOGIN_ORIGIN) return;
    if (originUser !== ADMIN_LOGIN_ORIGIN) originUser = window.currentUser;
    index = 0;
    renderStep();
  }

  function afterLogin({ adminMode = false } = {}) {
    if (!adminMode && (!window.currentUser || window.currentUser === 'admin')) return;
    originUser = adminMode ? ADMIN_LOGIN_ORIGIN : window.currentUser;
    const panel = createPanel(adminMode ? 'Welcome, Administrator' : `Welcome, ${window.currentUser}`);
    overlay.classList.add('kiosk-tour-centered');
    paragraph(panel, 'How would you like to get started?');
    const choices = document.createElement('div');
    choices.className = 'kiosk-choice-grid kiosk-login-choices';
    panel.appendChild(choices);
    menuChoice(choices, 'Continue on your own', 'Go to the main kiosk menu.', finish, true);
    menuChoice(choices, 'What would you like to do today?', 'Choose a workout, stretch, nutrition plan, challenge, or personal plan.', openTodayOptions);
    menuChoice(choices, 'Guided tour', 'See what each panel does and how to scan a workout to your phone.', start);
    choices.querySelector('button')?.focus();
  }

  document.getElementById('startKioskTutorial')?.addEventListener('click', start);
  window.addEventListener('resize', positionHighlight);
  window.addEventListener('scroll', positionHighlight, true);
  window.kioskTutorial = { afterLogin, start, close };
})();
