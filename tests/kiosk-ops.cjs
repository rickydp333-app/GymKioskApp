const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');

function read(relPath) {
  return fs.readFileSync(path.join(ROOT, relPath), 'utf8');
}

function testSingleInstanceLock() {
  const mainCode = read('main.js');
  assert.ok(
    /requestSingleInstanceLock\(/.test(mainCode),
    'main.js should enforce single-instance lock with app.requestSingleInstanceLock()'
  );
}

function testDevtoolsGatedForProduction() {
  const mainCode = read('main.js');

  const hasDevtoolsFlag = /devTools\s*:\s*isDev/.test(mainCode);
  const hasOpenDevtoolsGate = /if\s*\(\s*autoOpenDevTools\s*\)\s*\{[\s\S]*openDevTools\(/.test(mainCode);

  assert.ok(hasDevtoolsFlag, 'main.js should gate BrowserWindow devTools by isDev');
  assert.ok(hasOpenDevtoolsGate, 'main.js should only auto-open DevTools when explicitly requested');
}

function testElectronSandboxAndAdminAuthorization() {
  const mainCode = read('main.js');
  const preloadCode = read('preload.js');
  assert.ok(/sandbox\s*:\s*true/.test(mainCode), 'main.js should enable the renderer sandbox');
  assert.ok(mainCode.includes("ipcMain.handle('admin-validate-pin'"), 'admin PIN must be validated in the main process');
  assert.ok(/invoke\('exit-app',\s*token\)/.test(preloadCode), 'exit must require an admin session token');
}

function testAdminPinHandlersRegisterBeforeStartupCleanup() {
  const uiCode = read('js/ui.js');
  const initializeStart = uiCode.indexOf('function initializeApp() {');
  const pinHandlers = uiCode.indexOf('window.adminModule?.setupAdminPinHandlers', initializeStart);
  const startupCleanup = uiCode.indexOf('removeDeprecatedBiometricData();', initializeStart);

  assert.ok(initializeStart >= 0, 'ui.js should define initializeApp');
  assert.ok(pinHandlers > initializeStart, 'administrator keypad and cancel handlers should be registered during initialization');
  assert.ok(startupCleanup > pinHandlers, 'administrator controls must be registered before startup cleanup can fail');
  assert.strictEqual(uiCode.indexOf('window.adminModule?.setupAdminPinHandlers', pinHandlers + 1), -1, 'administrator handlers should only be registered once');
}

function testScreensaverUsesSplitPanels() {
  const screensaver = read('screensaver-tutorial.html');
  const resetCode = read('js/reset.js');
  assert.ok(screensaver.includes('grid-template-rows: 35vh 25vh 40vh'), 'screensaver should have trainer, login leaderboard, and information bands');
  assert.ok(screensaver.includes('id="loginLeaderboardList"'), 'screensaver should display the top login-day users');
  assert.ok(screensaver.includes('<section class="trainer-panel"'), 'personal trainer message should occupy its own top panel');
  assert.ok(screensaver.includes('<main class="screensaver-container"'), 'existing screensaver carousel should occupy the separate lower panel');
  assert.ok(screensaver.includes('@keyframes trainerColorCycle'), 'personal trainer headline should animate through colors');
  assert.ok(screensaver.includes('id="total-slides">5<'), 'existing five-slide rotation should remain intact');
  assert.ok(!screensaver.includes('trainer-promo'), 'promotional headline should not be a rotating carousel slide');
  assert.ok(!resetCode.includes('assets/screensaver-tutorial.html'), 'idle rotation must not load the obsolete single-panel screensaver');
  assert.ok(resetCode.includes('function showScreensaverFallback()'), 'screensaver must show branded content while the tutorial loads or fails');
  assert.ok(resetCode.includes("event.data?.type !== 'gymkiosk-screensaver-ready'"), 'screensaver iframe should be revealed only after its ready handshake');
  assert.ok(screensaver.includes("type: 'gymkiosk-screensaver-ready'"), 'tutorial page should signal when its split layout is ready');
}

function testExerciseProgressAndPrLogging() {
  const uiCode = read('js/ui.js');
  const analyticsCode = read('js/analytics.js');
  assert.ok(uiCode.includes("completeExerciseBtn.innerHTML = 'Track Your Progress'"), 'exercise progress button should use the requested label');
  assert.ok(!uiCode.includes('completeExerciseBtn.disabled = true'), 'completed exercises should still allow progress and PR updates');
  assert.ok(uiCode.includes('id="completedDateInput" type="date"'), 'progress logger should collect a completion date');
  assert.ok(uiCode.includes('updatePersonalRecords(window.currentUser, exercise.name, filledSets, completionDate)'), 'PR history should use the selected completion date');
    assert.ok(uiCode.includes('saveCompletedExercise(muscle, exercise.name, completionDate)'), 'daily completion should be stored under the selected date');
  assert.ok(uiCode.includes('saveWorkoutToCalendarDate(completionDateValue'), 'calendar entry should use the selected completion date');
    assert.ok(uiCode.includes('createExerciseProgressButton(getExerciseProgressMuscle(ex, selectedMuscle), ex)'), 'single workout builder exercises should have progress actions');
    assert.ok(uiCode.includes('createExerciseProgressButton(getExerciseProgressMuscle(ex, weeklyPlan[day].muscle), ex)'), 'weekly plan exercises should have progress actions');
    assert.ok(uiCode.includes('itemDiv.appendChild(createExerciseProgressButton(ex.muscle, ex))'), 'full-body workout exercises should have progress actions');
  assert.ok(analyticsCode.includes('function recordWorkout(muscleGroups, exercises, durationMinutes, completionDate)'), 'workout analytics should accept the completion date');
}

function testMusclePersonalBests() {
  const source = read('js/ui.js');
  const html = read('index.html');
  assert.ok(!html.includes('id="myPRsBtn"'), 'the separate personal-records menu button should be removed');
  assert.ok(html.includes('id="musclePersonalBestsSection"'), 'analytics should have a personal-best section');
  assert.ok(source.includes('renderMusclePersonalBests(username);'), 'analytics should render personal bests');
  assert.ok(source.indexOf('progressActions.appendChild(createPersonalBestButton(muscle, ex))') < source.indexOf('progressActions.appendChild(completeExerciseBtn)'), 'personal best should appear above progress on muscle-group cards');
  const start = source.indexOf('function saveMusclePersonalBest(');
  const end = source.indexOf('\nfunction createPersonalBestButton(', start);
  const storage = { users: JSON.stringify([{ username: 'Rick', favorites: { exercises: ['Squat'] } }, { username: 'Other' }]) };
  let writes = 0;
  const context = {
    getUsers: () => JSON.parse(storage.users),
    saveUsers: users => { storage.users = JSON.stringify(users); writes++; }
  };
  vm.createContext(context);
  vm.runInContext(source.slice(start, end), context);
  const save = context.saveMusclePersonalBest;
  assert.strictEqual(save('Rick', 'chest', 'Bench Press', 135.5, 5, '2026-10-02'), true);
  let users = JSON.parse(storage.users);
  assert.deepStrictEqual(users[0].musclePersonalBests.chest, { exerciseName: 'Bench Press', weight: 135.5, reps: 5, date: '2026-10-02' });
  assert.deepStrictEqual(users[0].favorites.exercises, ['Squat']);
  assert.strictEqual(users[1].musclePersonalBests, undefined);
  assert.strictEqual(save('Rick', 'legs', 'Squat', 200, 3, '2026-10-01'), true);
  assert.strictEqual(save('Rick', 'chest', 'Bench Press', 140, 4, '2026-10-02'), true);
  users = JSON.parse(storage.users);
  assert.strictEqual(users[0].musclePersonalBests.legs.weight, 200);
  assert.strictEqual(users[0].musclePersonalBests.chest.weight, 140);
  const writesBeforeInvalid = writes;
  assert.strictEqual(save('guest', 'chest', 'Bench Press', 100, 5, '2026-10-02'), false);
  assert.strictEqual(save('Missing', 'chest', 'Bench Press', 100, 5, '2026-10-02'), false);
  assert.strictEqual(save('Rick', 'chest', 'Bench Press', -1, 5, '2026-10-02'), false);
  assert.strictEqual(save('Rick', 'chest', 'Bench Press', 100, 1.5, '2026-10-02'), false);
  assert.strictEqual(save('Rick', 'chest', 'Bench Press', 100, 5, '2026-02-30'), false);
  assert.strictEqual(writes, writesBeforeInvalid, 'invalid entries must not modify saved profiles');
}

function testMuscleWorkoutSelections() {
  const source = read('js/ui.js');
  const start = source.indexOf('const muscleWorkoutSelections = new Map();');
  const end = source.indexOf('\nfunction loadExercisesForMuscle(', start);
  const context = {
    window: { currentUser: 'Rick' },
    document: {
      createElement: () => ({
        children: [], listeners: {},
        append(...children) { this.children.push(...children); },
        addEventListener(type, handler) { this.listeners[type] = handler; }
      })
    }
  };
  vm.createContext(context);
  vm.runInContext(source.slice(start, end), context);
  const chest = context.createAddToWorkoutCheckbox('chest', { name: 'Bench Press', howTo: ['Press up'] });
  const legs = context.createAddToWorkoutCheckbox('legs', { name: 'Squat' });
  const chestCheckbox = chest.children[0];
  const legsCheckbox = legs.children[0];
  assert.strictEqual(chest.children[1].textContent, 'Add to workout');
  assert.strictEqual(chestCheckbox.checked, false, 'exercises should start unselected');
  chestCheckbox.checked = true;
  chestCheckbox.listeners.change();
  legsCheckbox.checked = true;
  legsCheckbox.listeners.change();
  assert.strictEqual(context.getMuscleWorkoutSelections().size, 2, 'selections should span muscle groups');
  assert.strictEqual(context.createAddToWorkoutCheckbox('chest', { name: 'Bench Press' }).children[0].checked, true, 'selections should survive card rerendering');
  assert.strictEqual(Array.from(context.getMuscleWorkoutSelections().values())[0].howTo[0], 'Press up', 'sharing should retain exercise instructions');
  chestCheckbox.checked = false;
  chestCheckbox.listeners.change();
  assert.strictEqual(context.getMuscleWorkoutSelections().size, 1, 'deselecting should remove the exercise');
  context.window.currentUser = 'Other';
  assert.strictEqual(context.getMuscleWorkoutSelections().size, 0, 'another user must not inherit selections');
  const renderStart = source.indexOf('function loadExercisesForMuscle(');
  const shareStart = source.indexOf('shareBtn.onclick = async () => {', renderStart);
  const shareEnd = source.indexOf('\n  displayList.forEach', shareStart);
  const handler = source.slice(shareStart, shareEnd);
  assert.ok(handler.includes('exercises: selectedExercises'), 'QR workout should only contain selected exercises');
  assert.ok(handler.includes('if (!selectedExercises.length)'), 'empty selection should not create a QR workout');
  assert.ok(handler.includes('if (!await saveWorkoutToServer(workoutId, workoutToShare))'), 'failed upload must not create a QR code');
  assert.ok(source.includes('window.currentUser = null;\n    getMuscleWorkoutSelections();'), 'logout should clear the workout selection');
}

function testAnalyticsExerciseProgressLog() {
  const source = read('js/ui.js');
  assert.ok(read('index.html').includes('id="exerciseProgressLogContainer"'), 'Analytics should contain an exercise progress log');
  assert.ok(source.includes('renderExerciseProgressLog(username);'), 'Analytics should render the signed-in user exercise log');
  const storage = { users: JSON.stringify([{ username: 'Rick', exerciseHistory: {} }, { username: 'Other', exerciseHistory: {} }]) };
  const context = {
    getUsers: () => JSON.parse(storage.users),
    saveUsers: users => { storage.users = JSON.stringify(users); },
    isPRSet: () => false,
    estimateOneRepMax: (weight, reps) => weight * (1 + reps / 30)
  };
  vm.createContext(context);
  const saveStart = source.indexOf('function updatePersonalRecords(');
  const saveEnd = source.indexOf('\n/**', saveStart);
  const readStart = source.indexOf('function getExerciseProgressLog(');
  const readEnd = source.indexOf('\nfunction renderExerciseProgressLog(', readStart);
  vm.runInContext(source.slice(saveStart, saveEnd) + '\n' + source.slice(readStart, readEnd), context);
  context.updatePersonalRecords('Rick', 'Bench Press', [{ weight: 135, reps: 5 }, { weight: 125, reps: 8 }], '2026-10-01');
  context.updatePersonalRecords('Rick', 'Squat', [{ weight: 200, reps: 3 }], '2026-10-02');
  const entries = JSON.parse(JSON.stringify(context.getExerciseProgressLog('Rick')));
  assert.deepStrictEqual(entries, [
    { exerciseName: 'Squat', date: '2026-10-02', setNumber: 1, weight: 200, reps: 3 },
    { exerciseName: 'Bench Press', date: '2026-10-01', setNumber: 1, weight: 135, reps: 5 },
    { exerciseName: 'Bench Press', date: '2026-10-01', setNumber: 2, weight: 125, reps: 8 }
  ]);
  assert.strictEqual(context.getExerciseProgressLog('Other').length, 0, 'other users should not see recorded sets');
  assert.strictEqual(context.getExerciseProgressLog('guest').length, 0, 'guests should not see recorded sets');
  assert.strictEqual(context.getExerciseProgressLog('Missing').length, 0);
  const storedBeforeRead = storage.users;
  context.getExerciseProgressLog('Rick');
  assert.strictEqual(storage.users, storedBeforeRead, 'rendering history must not create duplicate saved sets');
}

function testQrWorkoutAnalyticsMerge() {
  const source = read('js/ui.js');
  const start = source.indexOf('function mergeQrExerciseLogs(');
  const end = source.indexOf('\nconst qrAnalyticsSyncUsers', start);
  const storage = { users: JSON.stringify([
    { username: 'Rick', qrWorkoutExports: { 'qr-workout-one': { analyticsSyncToken: 'private' }, 'qr-workout-two': { analyticsSyncToken: 'other' } },
      exerciseHistory: { 'Bench Press': [{ date: '2026-10-01', sets: [{ weight: 100, reps: 5 }] }] } },
    { username: 'Other', exerciseHistory: {} }
  ]) };
  const context = {
    getUsers: () => JSON.parse(storage.users),
    saveUsers: users => { storage.users = JSON.stringify(users); }
  };
  vm.createContext(context);
  vm.runInContext(source.slice(start, end), context);
  const logs = [
    { id: 'set-one', exerciseName: 'Bench Press', date: '2026-10-02', weight: 135, reps: 5 },
    { id: 'set-two', exerciseName: 'Bench Press', date: '2026-10-02', weight: 125, reps: 8 }
  ];
  assert.strictEqual(context.mergeQrExerciseLogs('Rick', 'qr-workout-one', logs), true);
  assert.strictEqual(context.mergeQrExerciseLogs('Rick', 'qr-workout-one', logs), true);
  let saved = JSON.parse(storage.users)[0];
  assert.strictEqual(saved.exerciseHistory['Bench Press'].length, 2, 'refresh must not duplicate phone history');
  assert.deepStrictEqual(saved.exerciseHistory['Bench Press'][0].sets, [{ weight: 100, reps: 5 }], 'kiosk history should be preserved');
  assert.deepStrictEqual(saved.exerciseHistory['Bench Press'][1].sets, [{ weight: 135, reps: 5 }, { weight: 125, reps: 8 }]);
  assert.strictEqual(saved.exerciseHistory['Bench Press'][1].date, '2026-10-02');
  assert.strictEqual(context.mergeQrExerciseLogs('Other', 'qr-workout-one', logs), false, 'another user must not import this export');
  assert.strictEqual(context.mergeQrExerciseLogs('Rick', 'unknown-export', logs), false, 'unlinked exports must not import');
  assert.strictEqual(context.mergeQrExerciseLogs('Rick', 'qr-workout-one', null), false);
  context.mergeQrExerciseLogs('Rick', 'qr-workout-two', [{ ...logs[0], weight: 140 }]);
  context.mergeQrExerciseLogs('Rick', 'qr-workout-one', [{ ...logs[0], weight: 150 }]);
  saved = JSON.parse(storage.users)[0];
  assert.strictEqual(saved.exerciseHistory['Bench Press'].length, 3, 'distinct exports should remain separate');
  assert.strictEqual(saved.exerciseHistory['Bench Press'].find(entry => entry.sourceWorkoutId === 'qr-workout-one').sets[0].weight, 150, 'corrected phone entries should replace the old imported sets');
  assert.ok(source.includes('syncQrWorkoutAnalytics(username);'), 'opening Analytics should refresh phone entries');
  assert.ok(source.includes('crypto.getRandomValues(new Uint8Array(32))'), 'export credential should be cryptographically random');
  assert.ok(source.includes('window.currentUser !== username'), 'sync must check account changes while waiting');
}

function testQrAnalyticsAutoRefresh() {
  const source = read('js/ui.js');
  const start = source.indexOf('let qrAnalyticsRefreshTimer = null;');
  const end = source.indexOf('\nasync function syncQrWorkoutAnalytics(', start);
  let callback;
  let delay;
  let clears = 0;
  let syncs = 0;
  let hidden = false;
  const context = {
    window: { currentUser: 'Rick' },
    document: { getElementById: () => ({ classList: { contains: () => hidden } }) },
    setInterval: (handler, milliseconds) => { callback = handler; delay = milliseconds; return 1; },
    clearInterval: () => { clears++; },
    syncQrWorkoutAnalytics: username => { assert.strictEqual(username, 'Rick'); syncs++; }
  };
  vm.createContext(context);
  vm.runInContext(source.slice(start, end), context);
  context.startQrAnalyticsAutoRefresh('Rick');
  assert.strictEqual(delay, 15000, 'visible analytics should refresh every 15 seconds');
  callback();
  assert.strictEqual(syncs, 1);
  context.startQrAnalyticsAutoRefresh('Rick');
  assert.strictEqual(clears, 1, 'reopening analytics should replace the timer, not add another');
  hidden = true;
  callback();
  assert.strictEqual(syncs, 1, 'hidden analytics must not poll phone data');
  hidden = false;
  context.startQrAnalyticsAutoRefresh('Rick');
  context.window.currentUser = 'Other';
  callback();
  assert.strictEqual(syncs, 1, 'account changes must stop polling the prior account');
  assert.ok(source.includes('startQrAnalyticsAutoRefresh(username);'), 'Analytics should start its live refresh');
}

async function testClearUserAnalyticsData() {
  const source = read('js/ui.js');
  const resetStart = source.indexOf('function clearUserAnalyticsData(');
  const resetEnd = source.indexOf('\nasync function confirmClearUserAnalytics(', resetStart);
  const confirmEnd = source.indexOf('\nfunction renderAnalyticsScreen(', resetEnd);
  const originalUsers = [
    { username: 'Rick', pinHash: 'hash', pinSalt: 'salt', pinEncrypted: 'protected', icon: 'icon.svg', color: '#fff',
      workoutHistory: [{ date: '2026-10-02' }], exerciseHistory: { Squat: [{ sets: [{ weight: 185, reps: 8 }] }] },
      musclePersonalBests: { legs: { weight: 185 } }, qrWorkoutExports: { old: {} }, badges: [{ id: 'first' }], points: 30, currentStreak: 4 },
    { username: 'Rick_other', workoutHistory: [{ date: '2026-10-01' }], pinHash: 'other-hash' }
  ];
  const stored = new Map([
    ['users', JSON.stringify(originalUsers)],
    ['gymKiosk_workoutCalendar', JSON.stringify({ Rick: ['2026-10-02'], Rick_other: ['2026-10-01'] })],
    ['calendar_workouts_Rick', '{}'], ['calendar_meals_Rick', '{}'], ['calendar_completed_Rick', '[]'],
    ['completedExercises_Rick_2026-10-02', '{}'], ['workout_completion_Rick_2026-10-02', '{}'],
    ['completedExercises_Rick_other_2026-10-02', '{}'], ['calendar_workouts_Rick_other', '{}'],
    ['challenge_points_Rick', '30'], ['challenge_completions_Rick', '[]'], ['gymkiosk_server_base_url', 'https://app.rdpsplace.me']
  ]);
  const button = { disabled: false };
  let renders = 0;
  let confirmations = [];
  let answers = [];
  const selections = new Map([['exercise', {}]]);
  const context = {
    window: { currentUser: 'Rick', lastGeneratedPlan: {} }, currentWorkout: {}, muscleWorkoutSelections: selections,
    getUsers: () => JSON.parse(stored.get('users')),
    saveUsers: users => stored.set('users', JSON.stringify(users)),
    localStorage: {
      get length() { return stored.size; }, key: index => Array.from(stored.keys())[index],
      getItem: key => stored.get(key) ?? null, setItem: (key, value) => stored.set(key, value), removeItem: key => stored.delete(key)
    },
    document: { getElementById: () => button },
    showAnalyticsResetConfirmation: async (title, message) => { confirmations.push({ title, message }); return answers.shift(); },
    renderAnalyticsScreen: () => { renders++; }, showAlert: async () => { throw new Error('Unexpected reset error'); }
  };
  vm.createContext(context);
  vm.runInContext(source.slice(resetStart, confirmEnd), context);
  const before = stored.get('users');
  answers = [false];
  await context.confirmClearUserAnalytics();
  assert.strictEqual(stored.get('users'), before, 'Cancel on first confirmation must preserve data');
  assert.strictEqual(confirmations.length, 1);
  confirmations = [];
  answers = [true, false];
  await context.confirmClearUserAnalytics();
  assert.strictEqual(stored.get('users'), before, 'Cancel on second confirmation must preserve data');
  assert.strictEqual(confirmations[1].title, 'Are you sure?');
  answers = [true, true];
  await context.confirmClearUserAnalytics();
  const users = JSON.parse(stored.get('users'));
  assert.deepStrictEqual(users[1], originalUsers[1], 'other users must remain untouched');
  assert.strictEqual(users[0].pinHash, 'hash');
  assert.strictEqual(users[0].pinEncrypted, 'protected');
  assert.deepStrictEqual(users[0].workoutHistory, []);
  assert.deepStrictEqual(users[0].exerciseHistory, {});
  assert.deepStrictEqual(users[0].musclePersonalBests, {});
  assert.deepStrictEqual(users[0].qrWorkoutExports, {});
  assert.strictEqual(users[0].currentStreak, 0);
  assert.strictEqual(users[0].activityResetVersion, 1);
  assert.strictEqual(renders, 1);
  assert.strictEqual(button.disabled, false);
  assert.strictEqual(selections.size, 0);
  assert.deepStrictEqual(JSON.parse(stored.get('gymKiosk_workoutCalendar')), { Rick_other: ['2026-10-01'] });
  for (const key of ['calendar_workouts_Rick', 'calendar_meals_Rick', 'calendar_completed_Rick', 'completedExercises_Rick_2026-10-02', 'workout_completion_Rick_2026-10-02', 'challenge_points_Rick', 'challenge_completions_Rick']) assert.ok(!stored.has(key), `reset should clear ${key}`);
  assert.ok(stored.has('completedExercises_Rick_other_2026-10-02'), 'similar usernames must not collide');
  assert.ok(stored.has('calendar_workouts_Rick_other'));
  assert.ok(stored.has('gymkiosk_server_base_url'), 'shared kiosk settings must remain');
  context.window.currentUser = 'Other';
  assert.strictEqual(context.clearUserAnalyticsData('Rick'), false, 'reset must not act on a changed account');
}

function testDailyLoginLeaderboard() {
  const source = read('js/ui.js');
  const start = source.indexOf('function recordDailyLogin(');
  const end = source.indexOf('\nfunction getUsers(', start);
  let stored = JSON.stringify([
    { username: 'Rick', pinHash: 'hash' }, { username: 'Amy' }, { username: 'Bob' },
    { username: 'Chris' }, { username: 'Dana' }, { username: 'Eli' }, { username: 'guest' }, { username: 'admin' }
  ]);
  const context = { getUsers: () => JSON.parse(stored), saveUsers: users => { stored = JSON.stringify(users); }, getLocalDateString: () => '2026-10-02' };
  vm.createContext(context);
  vm.runInContext(source.slice(start, end), context);
  assert.strictEqual(context.recordDailyLogin('Rick'), true);
  assert.strictEqual(context.recordDailyLogin('Rick'), false, 'multiple logins on one day should count only once');
  assert.strictEqual(context.recordDailyLogin('Rick', '2026-10-03'), true, 'another calendar day should receive another credit');
  assert.strictEqual(context.recordDailyLogin('guest'), false);
  assert.strictEqual(context.recordDailyLogin('admin'), false);
  assert.strictEqual(context.recordDailyLogin('Missing'), false);
  assert.strictEqual(context.recordDailyLogin('Rick', 'invalid'), false);
  ['Amy', 'Bob', 'Chris', 'Dana', 'Eli'].forEach(name => context.recordDailyLogin(name));
  const leaders = JSON.parse(JSON.stringify(context.getLoginLeaderboard()));
  assert.deepStrictEqual(leaders, [
    { username: 'Rick', count: 2 }, { username: 'Amy', count: 1 }, { username: 'Bob', count: 1 },
    { username: 'Chris', count: 1 }, { username: 'Dana', count: 1 }
  ]);
  assert.strictEqual(JSON.parse(stored)[0].pinHash, 'hash', 'recording logins should preserve profile credentials');
  assert.strictEqual((source.match(/recordDailyLogin\((?:user\.username|window\.currentUser)\);/g) || []).length, 2, 'PIN and face login should each record successful daily logins');
  const screen = read('screensaver-tutorial.html');
  const html = read('index.html');
  assert.ok(!html.includes('Most Active This Week'), 'the main menu should no longer show the weekly activity panel');
  assert.ok(html.includes('id="mainLoginLeaderboardList"'), 'the main menu should show the same top-five login-day leaderboard');
  const renderStart = source.indexOf('function updateActivityLeaderboard()');
  const renderEnd = source.indexOf('\nfunction getSupplementSuggestions(', renderStart);
  assert.ok(source.slice(renderStart, renderEnd).includes('const leaders = getLoginLeaderboard();'), 'main menu and screensaver must use the same ranking');
  assert.ok(screen.indexOf('<section class="trainer-panel"') < screen.indexOf('<section class="login-leaderboard-panel"'));
  assert.ok(screen.indexOf('<section class="login-leaderboard-panel"') < screen.indexOf('<main class="screensaver-container"'), 'leaderboard should be between trainer and carousel');
  assert.ok(read('js/reset.js').includes("type: 'gymkiosk-login-leaderboard'"), 'parent should send only leaderboard data to the iframe');
}

function testPhoneWorkoutInstructionsAndLogging() {
  const viewer = read('mobile/viewer.html');
  const server = read('server.js');
  assert.ok(viewer.includes('How to perform:'), 'phone workout cards should show exercise instructions');
  assert.ok(viewer.includes('name="weight" type="number"'), 'phone exercise logs should collect weight');
  assert.ok(viewer.includes('name="reps" type="number"'), 'phone exercise logs should collect reps');
  assert.ok(viewer.includes('name="date" type="date"'), 'phone exercise logs should collect completion date');
  assert.ok(viewer.includes('exerciseLogs: exerciseLogEntries'), 'phone exercise logs should be included when syncing');
  assert.ok(server.includes('normalizeExerciseLogs(exerciseLogs)'), 'server should validate submitted exercise logs');
  assert.ok(server.includes('workout.userId === session.userId'), 'saved exercise logs should only be returned to the authenticated owner');
}

function testPostLoginActivityChoicesAndPanelTour() {
  const tutorial = read('js/kiosk-tutorial.js');
  const uiCode = read('js/ui.js');
  const adminCode = read('js/admin-module.js');
  const html = read('index.html');
  [
    'Continue on your own',
    'What would you like to do today?',
    'Guided tour',
    'Muscle Groups',
    'Full Body Workout',
    'Stretch',
    'Nutrition plan',
    'Challenge another user',
    'Create a personal workout plan'
  ].forEach(label => assert.ok(tutorial.includes(label), `post-login flow should include ${label}`));

  [
    'muscleGroupsBtn',
    'fullBodyGeneratorBtn',
    'stretchesBtn',
    'buildNutritionBtn',
    'dailyChallengeBtn',
    'interactiveCoachBtn',
    'muscleScreenHeading',
    'fullBodyGeneratorHeading',
    'stretchScreenHeading',
    'nutritionBuilderHeading',
    'challengeTitle',
    'coachScreenHeading',
    'shareWorkoutBtn'
  ].forEach(id => assert.ok(html.includes(`id="${id}"`), `guided route target ${id} should exist`));

  assert.ok(tutorial.includes('qrWalkthrough: true'), 'guided tour should end with a QR phone-sharing walkthrough');
  assert.ok(tutorial.includes("button(controls, 'Back', openTodayOptions)"), 'workout submenu should return to the previous choice screen');
  assert.ok(tutorial.includes("button(controls, 'Back', () => afterLogin({ adminMode: originUser === ADMIN_LOGIN_ORIGIN }))"), 'admin choices should return to the admin-specific login menu');
  assert.ok(tutorial.includes("const ADMIN_LOGIN_ORIGIN = '__admin_login__'"), 'admin choice flow should have a distinct return path');
  assert.ok(tutorial.includes("if (adminLogin) {\n      showScreen('adminPanel')"), 'Continue from admin choices should return to the admin panel');
  assert.ok(adminCode.includes('window.kioskTutorial?.afterLogin({ adminMode: true })'), 'successful admin PIN login should show the same three choices');
  assert.strictEqual((uiCode.match(/window\.kioskTutorial\?\.afterLogin\(\)/g) || []).length, 3, 'guest, PIN, and face login should all display the three post-login choices');
}

function testScreensaverAndHowToGuidanceIsCurrent() {
  const screensaver = read('screensaver-tutorial.html');
  const oldScreensaver = read('assets/screensaver-tutorial.html');
  const uiCode = read('js/ui.js');
  const guideStart = uiCode.indexOf('const HOW_TO_GUIDES = {');
  const guideEnd = uiCode.indexOf('\nfunction renderHowToDetail', guideStart);
  const guides = uiCode.slice(guideStart, guideEnd);
  const scriptStart = screensaver.indexOf('<script>');
  const scriptEnd = screensaver.indexOf('</script>', scriptStart);

  assert.ok(scriptStart >= 0 && scriptEnd > scriptStart, 'screensaver should include its navigation script');
  assert.doesNotThrow(() => new Function(screensaver.slice(scriptStart + 8, scriptEnd)), 'screensaver navigation script should compile');
  assert.ok(screensaver.includes('What would you like to do today?'), 'screensaver should explain the post-login activity choices');
  assert.ok(screensaver.includes('Track Your Progress'), 'screensaver should explain exercise progress and PR logging');
  assert.ok(screensaver.includes('Save Progress'), 'screensaver should explain syncing phone logs');
  assert.ok(oldScreensaver.includes("window.location.replace(`../screensaver-tutorial.html"), 'old screensaver path should redirect to the current tutorial');
  assert.ok(guides.includes('loginChoices:'), 'How To should explain the post-login choices');
  assert.ok(guides.includes('exerciseProgress:'), 'How To should explain weight, reps, dates, and PRs');
  assert.ok(guides.includes('phoneWorkout:'), 'How To should explain phone instructions and syncing');
  assert.ok(!guides.includes('Tap the "Complete" button'), 'How To must not reference the retired Complete action');
}

function testWorkoutQrButtonUsesCameraInstruction() {
  const label = 'Send your workout to your phone by scanning the QR code with your camera';
  const uiCode = read('js/ui.js');
  const html = read('index.html');
  const css = read('css/style.css');
  const tutorial = read('js/kiosk-tutorial.js');
  const screensaver = read('screensaver-tutorial.html');

  assert.ok(html.includes(label), 'exercise list QR button should tell users to scan with their camera');
  assert.ok(uiCode.includes(label), 'generated workout QR actions should use the same camera instruction');
  assert.ok(css.includes('.qr-workout-share-btn') && css.includes('animation: qrShareAttention'), 'workout QR buttons should use the attention style');
  assert.ok(tutorial.includes(label), 'guided tour should use the current workout QR label');
  assert.ok(screensaver.includes(label), 'screensaver tutorial should use the current workout QR label');
}

function testInstallSetCanReusePrebuiltKiosk() {
  const releaseScript = read('scripts/release-install-set.cjs');
  assert.ok(releaseScript.includes("process.env.GYMKIOSK_REUSE_PREBUILT_KIOSK === '1'"), 'install-set script should provide an opt-in prebuilt kiosk reuse mode');
  assert.ok(releaseScript.includes("process.env.GYMKIOSK_MOVE_INSTALLERS_TO_SET === '1'"), 'install-set script should support moving installer files to reduce peak space');
  assert.ok(releaseScript.includes('fs.renameSync(installerPath, copiedInstallerPath)'), 'installer move mode should avoid duplicate file storage');
  assert.ok(releaseScript.indexOf('const hash = computeSha256(installerPath)') < releaseScript.indexOf('fs.renameSync(installerPath, copiedInstallerPath)'), 'installer hash should be computed before moving the installer');
  assert.ok(releaseScript.includes('if (!reusePrebuiltKiosk || target.name !== \'kiosk\')'), 'prebuilt kiosk artifacts should be preserved during initial cleanup');
  assert.ok(releaseScript.includes('Reusing verified ${target.label} v${version} package'), 'release should verify and reuse the current kiosk package');
}

function testStartupLauncherSafetyFlags() {
  const launcherCode = read('scripts/start.cjs');

  assert.ok(
    launcherCode.includes('GYMKIOSK_SKIP_ELECTRON'),
    'scripts/start.cjs should support GYMKIOSK_SKIP_ELECTRON for non-UI testing'
  );
  assert.ok(
    launcherCode.includes('GYMKIOSK_TEST_MODE'),
    'scripts/start.cjs should support GYMKIOSK_TEST_MODE for controlled test shutdown'
  );
}

function testCreateUserKeyboardHandlers() {
  const uiCode = read('js/ui.js');

  assert.ok(
    uiCode.includes("document.querySelectorAll('.keyboard-key').forEach"),
    'Create User and search keyboard buttons should have click handlers'
  );
  assert.ok(
    uiCode.includes("input.id === 'newUserPin'") && uiCode.includes("!/^\\d$/.test(key)"),
    'Create User PIN keyboard input should accept digits only'
  );
  assert.ok(
    uiCode.includes('document.activeKeyboardInput = input'),
    'Create User keyboard should track the active username or PIN input'
  );
}

function testStretchQrSharing() {
  const uiCode = read('js/ui.js');
  const qrCode = read('js/qr.js');
  const serverCode = read('server.js');
  const viewerCode = read('mobile/viewer.html');

  assert.ok(uiCode.includes('Send your stretches to your phone by scanning the QR code with your camera'), 'stretch screen should expose the updated QR sharing action');
  assert.ok(uiCode.includes("displayQRCodeModal(stretchId, kioskIP, { type: 'stretch' })"), 'stretch sharing should open a stretch QR');
  assert.ok(qrCode.includes("contentType === 'stretch' ? 'stretch' : 'workout'"), 'stretch QR should use the stretch URL');
  assert.ok(serverCode.includes("app.get('/stretch/:workoutId'"), 'server should expose the stretch phone route');
  assert.ok(viewerCode.includes("workoutData?.type === 'stretch'"), 'phone viewer should render stretch-specific labels');
}

function testStretchImagesExist() {
  const context = { window: {} };
  vm.createContext(context);
  vm.runInContext(read('js/data/exercises.js'), context);

  const groups = context.window.LOCAL_EXERCISES?.stretchesByBodyPart || {};
  const missing = [];
  for (const [group, stretches] of Object.entries(groups)) {
    for (const stretch of stretches) {
      const relativePath = String(stretch.image || '').replaceAll('/', path.sep);
      const fullPath = path.join(ROOT, relativePath);
      if (!stretch.image || !fs.existsSync(fullPath) || !fs.statSync(fullPath).isFile()) {
        missing.push(`${group}: ${stretch.name} -> ${stretch.image || '(no image)'}`);
      }
    }
  }

  assert.ok(Object.keys(groups).length > 0, 'stretch exercise groups should be available');
  assert.deepStrictEqual(missing, [], `stretch images are missing:\n${missing.join('\n')}`);
}

function testStretchImagePathsPreserveExistingFilenames() {
  const uiCode = read('js/ui.js');
  const helperStart = uiCode.indexOf('function normalizeMediaPath');
  const helperEnd = uiCode.indexOf('function applyImageFallbacks');
  assert.ok(helperStart >= 0 && helperEnd > helperStart, 'media path helpers should be available');

  const sandbox = {};
  vm.createContext(sandbox);
  vm.runInContext(
    `${uiCode.slice(helperStart, helperEnd)}\nresult = getMediaPathCandidates('assets/stretches/back/Reverse Back Bend .png');`,
    sandbox
  );

  assert.strictEqual(
    sandbox.result[0],
    'assets/stretches/back/Reverse Back Bend .png',
    'the exact stored stretch image filename must be attempted before normalized fallbacks'
  );
}

function testMobileViewerScriptsCompile() {
  const viewerCode = read('mobile/viewer.html');
  const scripts = [...viewerCode.matchAll(/<script>([\s\S]*?)<\/script>/g)];
  assert.ok(scripts.length > 0, 'mobile viewer should contain executable JavaScript');
  scripts.forEach((match, index) => {
    assert.doesNotThrow(
      () => new Function(match[1]),
      `mobile viewer script ${index + 1} should compile`
    );
  });
}

async function run() {
  try {
    testSingleInstanceLock();
    testDevtoolsGatedForProduction();
    testElectronSandboxAndAdminAuthorization();
    testAdminPinHandlersRegisterBeforeStartupCleanup();
    testScreensaverUsesSplitPanels();
    testExerciseProgressAndPrLogging();
    testMusclePersonalBests();
    testMuscleWorkoutSelections();
    testAnalyticsExerciseProgressLog();
    testQrWorkoutAnalyticsMerge();
    testQrAnalyticsAutoRefresh();
    testDailyLoginLeaderboard();
    await testClearUserAnalyticsData();
    testPhoneWorkoutInstructionsAndLogging();
    testPostLoginActivityChoicesAndPanelTour();
    testScreensaverAndHowToGuidanceIsCurrent();
    testWorkoutQrButtonUsesCameraInstruction();
    testInstallSetCanReusePrebuiltKiosk();
    testStartupLauncherSafetyFlags();
    testCreateUserKeyboardHandlers();
    testStretchQrSharing();
    testStretchImagesExist();
    testStretchImagePathsPreserveExistingFilenames();
    testMobileViewerScriptsCompile();
    console.log('✅ Kiosk operational policy tests passed');
  } catch (error) {
    console.error('❌ Kiosk operational policy tests failed:', error.message);
    process.exitCode = 1;
  }
}

run();
