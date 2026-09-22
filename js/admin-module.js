console.log('ADMIN-MODULE.JS LOADED');

(() => {
  function populateAdminStatsUserSelect({ getUsers }) {
    const select = document.getElementById('adminStatsUserSelect');
    if (!select) return;

    select.innerHTML = '<option value="">Select a user...</option>';

    getUsers().forEach(user => {
      if (user.username !== 'admin' && user.username !== 'guest') {
        const option = document.createElement('option');
        option.value = user.username;
        option.textContent = user.username;
        select.appendChild(option);
      }
    });
  }

  function populateAdminUserList(deps) {
    const list = document.getElementById('adminUserList');
    if (!list) {
      console.warn('adminUserList not found');
      return;
    }

    list.innerHTML = '';

    const users = deps.getUsers().filter(
      u => u.username !== 'admin' && u.username !== 'guest'
    );

    if (!users.length) {
      list.innerHTML = '<p>No users available</p>';
      return;
    }

    users.forEach(user => {
      const row = document.createElement('div');
      row.className = 'admin-user-row';

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.className = 'user-select-checkbox';
      checkbox.checked = deps.getSelectedAdminUser() === user.username;

      row.appendChild(checkbox);

      const span = document.createElement('span');
      span.className = 'admin-user-name';
      span.textContent = user.username;
      row.appendChild(span);

      const pinInput = document.createElement('input');
      pinInput.type = 'text';
      pinInput.inputMode = 'numeric';
      pinInput.className = 'admin-pin-input';
      pinInput.placeholder = user.pin ? '••••' : 'No PIN';
      pinInput.maxLength = 4;
      pinInput.value = '';
      row.appendChild(pinInput);

      const savePinBtn = document.createElement('button');
      savePinBtn.className = 'admin-save-pin-btn';
      savePinBtn.textContent = '💾 Save PIN';
      savePinBtn.addEventListener('click', async () => {
        const newPin = pinInput.value.trim();
        if (newPin && !/^\d{4}$/.test(newPin)) {
          await deps.showAlert('Invalid PIN', 'PIN must be 4 digits');
          pinInput.focus();
          return;
        }

        const allUsers = deps.getUsers();
        const target = allUsers.find(u => u.username === user.username);
        if (!target) return;

        delete target.pin;
        delete target.pinHash;
        delete target.pinSalt;
        if (newPin) Object.assign(target, await deps.hashUserPin(newPin));
        deps.saveUsers(allUsers);
        deps.populateAdminUserList();
        await deps.showAlert('Success', `PIN updated for ${user.username}`);
      });
      row.appendChild(savePinBtn);

      const btn = document.createElement('button');
      btn.className = 'admin-delete-btn';
      btn.textContent = '🗑 Delete';

      btn.addEventListener('click', async () => {
        const confirmed = await deps.showConfirmDialog(
          'Delete User',
          `Are you sure you want to delete user "${user.username}"?`
        );
        if (!confirmed) return;

        const nextUsers = deps.getUsers().filter(u => u.username !== user.username);
        deps.saveUsers(nextUsers);
        deps.setSelectedAdminUser(null);
        deps.populateAdminUserList();
        await deps.showAlert('Success', `User "${user.username}" deleted`);
      });

      checkbox.addEventListener('change', () => {
        if (checkbox.checked) {
          document.querySelectorAll('.user-select-checkbox').forEach(cb => {
            if (cb !== checkbox) cb.checked = false;
          });
          deps.setSelectedAdminUser(user.username);
          console.log('Selected user for deletion:', deps.getSelectedAdminUser());
        } else {
          deps.setSelectedAdminUser(null);
          console.log('Deselected user');
        }
      });

      row.appendChild(btn);
      list.appendChild(row);
    });
  }

  async function handleResetUserStats({ showAlert, showConfirmDialog, resetUserStats }) {
    const select = document.getElementById('adminStatsUserSelect');
    const username = select?.value;

    if (!username) {
      await showAlert('Error', 'Please select a user');
      return;
    }

    const confirmed = await showConfirmDialog(
      'Reset Stats?',
      `Are you sure you want to reset all stats for ${username}? This will clear workout history, streaks, badges, and completed exercises.`
    );

    if (confirmed) {
      resetUserStats(username);
      console.log(`Stats reset for user: ${username}`);
      await showAlert('Success', `Stats reset for ${username}`);
    }
  }

  function resetAllUserStats({ getUsers, resetUserStats }) {
    const targetUsers = getUsers()
      .map(u => u.username)
      .filter(name => name && name !== 'admin' && name !== 'guest');

    targetUsers.forEach((username) => resetUserStats(username));
    return targetUsers.length;
  }

  function removeLocalStorageKeysByPrefixes(prefixes = []) {
    const keys = [];
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (key && prefixes.some((prefix) => key.startsWith(prefix))) keys.push(key);
    }
    keys.forEach((key) => localStorage.removeItem(key));
    return keys.length;
  }

  function clearCalendarDataForAllUsers(calendarKey = 'gymKiosk_workoutCalendar') {
    return removeLocalStorageKeysByPrefixes([
      calendarKey,
      'calendar_workouts_',
      'calendar_meals_',
      'workout_calendar_'
    ]);
  }

  function clearChallengeDataForAllUsers() {
    return removeLocalStorageKeysByPrefixes([
      'challenge_',
      'dailyChallenge_',
      'friendChallenge_',
      'gymKiosk_activity'
    ]);
  }

  function resetUserStats(username, { getUsers, saveUsers }) {
    const normalized = String(username || '');
    removeLocalStorageKeysByPrefixes([
      `completedExercises_${normalized}_`,
      `challenge_completions_${normalized}`,
      `challenge_accepted_${normalized}`,
      `favorites_${normalized}`,
      `workoutHistory_${normalized}`
    ]);
    const users = getUsers();
    const user = users.find((entry) => entry.username === normalized);
    if (user) {
      user.personalRecords = {};
      user.exerciseHistory = {};
      user.badges = [];
      user.points = 0;
      saveUsers(users);
    }
  }

  function setupAdminPinHandlers(deps) {
    document
      .querySelectorAll('#adminPinModal button[data-key]')
      .forEach(btn => {
        btn.addEventListener('click', async () => {
          const key = btn.dataset.key;

          if (key === 'clear') {
            deps.setEnteredAdminPin('');
            deps.updateAdminPinDisplay();
            return;
          }

          if (key === 'ok') {
            const enteredAdminPin = deps.getEnteredAdminPin();
            const isValidAdminPin = typeof deps.validateAdminCode === 'function'
              ? await deps.validateAdminCode(enteredAdminPin)
              : false;

            if (isValidAdminPin) {
              deps.setEnteredAdminPin('');
              document.getElementById('adminPinModal')?.classList.add('hidden');
              deps.showScreen('adminPanel');
              deps.populateAdminUserList();
              deps.populateAdminStatsUserSelect();
              deps.updateAdminAutoLogoutButtonLabel();
              deps.updateAdminQrModeButtonLabel?.();
              deps.updateAdminFaceDetectionThresholdUI?.();
              deps.updateAdminAmbientSilentHoursUI?.();
              deps.auditAdminAction('admin_login_success', 'Admin PIN accepted and panel opened');
            } else {
              alert('Incorrect admin PIN');
              deps.setEnteredAdminPin('');
              deps.updateAdminPinDisplay();
            }
            return;
          }

          const currentPin = deps.getEnteredAdminPin();
          if (/^\d$/.test(key) && currentPin.length < 4) {
            deps.setEnteredAdminPin(currentPin + key);
            deps.updateAdminPinDisplay();
          }
        });
      });

    document.getElementById('cancelAdminPin')?.addEventListener('click', () => {
      console.log('UI.JS: Cancel admin PIN pressed');
      deps.setEnteredAdminPin('');
      const modal = document.getElementById('adminPinModal');
      if (modal) {
        modal.classList.add('hidden');
      }
      deps.updateAdminPinDisplay();
      deps.showScreen('mainActionsScreen');
    });
  }

  function setupAdminPinEditorHandlers(deps) {
    document.querySelectorAll('.admin-pin-key').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.preventDefault();
        const input = document.adminPinInput;
        if (!input) return;

        const key = btn.dataset.key;

        if (key === 'clear') {
          input.value = '';
        } else if (key === 'save') {
          const newPin = input.value.trim();
          if (newPin && !/^\d{4}$/.test(newPin)) {
            await deps.showAlert('Invalid PIN', 'PIN must be exactly 4 digits');
            input.focus();
            return;
          }

          const users = deps.getUsers();
          const userName = input.dataset.username;
          if (userName) {
            const user = users.find(u => u.username === userName);
            if (user) {
              user.pin = newPin ? newPin : null;
              deps.saveUsers(users);
              await deps.showAlert('Success', `PIN updated for ${userName}`);
            }
          }

          document.getElementById('adminPinKeypadModal')?.classList.add('hidden');
          document.adminPinInput = null;
          deps.populateAdminUserList();
        } else if (key) {
          if (input.value.length < 4) {
            input.value += key;
          }
        }

        input.focus();
      });
    });
  }

  function setupAdminPanelHandlers(deps) {
    const adminPanel = document.getElementById('adminPanel');
    if (!adminPanel) return;

    adminPanel.addEventListener('click', async (e) => {
      if (e.target.closest('#adminClearUsers') || e.target.closest('#clearUserData')) {
        const confirmed = await deps.showConfirmDialog(
          'Clear All Data',
          'Are you sure you want to delete ALL users and data? This cannot be undone!'
        );
        if (!confirmed) return;
        localStorage.removeItem('users');
        deps.resetToStart();
        await deps.auditAdminAction('clear_all_users', 'All users removed from localStorage key "users"');
        await deps.showAlert('Success', 'All user data cleared');
      }

      if (e.target.closest('#adminResetSession') || e.target.closest('#resetApp')) {
        await deps.auditAdminAction('reset_app_session', 'App session reset to profile screen');
        deps.resetToStart();
      }

      if (e.target.closest('#adminClearCalendarData')) {
        const confirmed = await deps.showConfirmDialog(
          'Clear Calendar Data',
          'Clear all workout calendar, meal planner, and completion data for all users?'
        );
        if (!confirmed) return;

        const removedCount = deps.clearCalendarDataForAllUsers();
        await deps.auditAdminAction('clear_calendar_data', `Calendar data cleared, removed keys: ${removedCount}`);
        await deps.showAlert('Calendar Data Cleared', `Calendar-related storage reset complete (${removedCount} keys removed).`);
      }

      if (e.target.closest('#adminClearChallengeData')) {
        const confirmed = await deps.showConfirmDialog(
          'Clear Challenge Data',
          'Clear all challenge completions, points, accepted flags, and friend challenge history for all users?'
        );
        if (!confirmed) return;

        const removedCount = deps.clearChallengeDataForAllUsers();
        await deps.auditAdminAction('clear_challenge_data', `Challenge data cleared, removed keys: ${removedCount}`);
        await deps.showAlert('Challenge Data Cleared', `Challenge-related storage reset complete (${removedCount} keys removed).`);
      }

      if (e.target.closest('#adminResetActivityStats')) {
        const confirmed = await deps.showConfirmDialog(
          'Reset Activity Leaderboard',
          'Reset the weekly and daily activity leaderboard data for all users?'
        );
        if (!confirmed) return;

        localStorage.removeItem(deps.activityStorageKey);
        deps.updateActivityLeaderboard();
        await deps.auditAdminAction('reset_activity_leaderboard', 'Activity leaderboard data removed');
        await deps.showAlert('Activity Reset', 'Activity leaderboard data has been reset.');
      }

      if (e.target.closest('#adminResetAllUserStats')) {
        const confirmed = await deps.showConfirmDialog(
          'Reset All User Stats',
          'Reset stats for all non-admin users? This clears workout history, streaks, badges, and completed exercise keys.'
        );
        if (!confirmed) return;

        const affectedUsers = deps.resetAllUserStats();
        deps.populateAdminStatsUserSelect();
        await deps.auditAdminAction('reset_all_user_stats', `Reset all stats for ${affectedUsers} users`);
        await deps.showAlert('All User Stats Reset', `Reset complete for ${affectedUsers} user(s).`);
      }

      if (e.target.closest('#adminResetDisclaimer')) {
        localStorage.removeItem(deps.disclaimerAcceptanceKey);
        await deps.auditAdminAction('reset_disclaimer', 'Disclaimer acceptance key removed');
        await deps.showAlert('Disclaimer Reset', 'Disclaimer acceptance has been reset. It will show again on the next return to the profile screen.');
      }

      if (e.target.closest('#adminToggleAutoLogout')) {
        const nextEnabled = !deps.isScreensaverAutoLogoutEnabled();
        deps.setScreensaverAutoLogoutEnabled(nextEnabled);
        deps.updateAdminAutoLogoutButtonLabel();
        await deps.auditAdminAction('toggle_screensaver_auto_logout', `Screensaver auto-logout set to ${nextEnabled ? 'ON' : 'OFF'}`);
        await deps.showAlert(
          'Auto-Logout Updated',
          nextEnabled
            ? 'Screensaver auto-logout is now ON. Users will be logged out when inactivity starts screensaver mode.'
            : 'Screensaver auto-logout is now OFF. Inactivity will start screensaver mode without logging out the current user.'
        );
      }

      if (e.target.closest('#adminToggleQrMode')) {
        const nextPublicMode = !deps.isPublicQrModeEnabled();
        deps.setPublicQrModeEnabled(nextPublicMode);
        deps.updateAdminQrModeButtonLabel();
        await deps.auditAdminAction('toggle_qr_mode', `QR mode set to ${nextPublicMode ? 'PUBLIC' : 'LOCAL'}`);
        await deps.showAlert(
          'QR Mode Updated',
          nextPublicMode
            ? 'QR mode is now PUBLIC. New QR codes will use the live hosted URL.'
            : 'QR mode is now LOCAL. New QR codes will use your local kiosk server URL.'
        );
      }

      if (e.target.closest('#adminSaveFaceDetectionThreshold')) {
        const input = document.getElementById('adminFaceDetectionThreshold');
        const rawValue = input?.value;
        const parsed = Number.parseInt(rawValue, 10);

        if (Number.isNaN(parsed)) {
          await deps.showAlert('Invalid Value', 'Please enter a whole number between 3 and 20.');
          deps.updateAdminFaceDetectionThresholdUI?.();
          return;
        }

        const saved = deps.setFaceDetectionStableFrameThreshold(parsed);
        deps.updateAdminFaceDetectionThresholdUI?.();
        await deps.auditAdminAction('set_face_detection_threshold', `Face detection stable frame threshold set to ${saved}`);
        await deps.showAlert('Face Detection Updated', `Stable frame threshold is now ${saved}. Lower is faster, higher is stricter.`);
      }

      if (e.target.closest('#adminToggleAmbientSilentHours')) {
        const nextEnabled = !deps.isAmbientGreetingSilentHoursEnabled();
        deps.setAmbientGreetingSilentHoursEnabled(nextEnabled);
        deps.updateAdminAmbientSilentHoursUI?.();
        await deps.auditAdminAction('toggle_ambient_silent_hours', `Ambient greeting silent hours set to ${nextEnabled ? 'ON' : 'OFF'}`);
        await deps.showAlert(
          'Ambient Silent Hours Updated',
          nextEnabled
            ? 'Ambient greeting silent hours are now ON. Greeting audio will be muted during the configured time window.'
            : 'Ambient greeting silent hours are now OFF. Greeting audio will play whenever a face is detected.'
        );
      }

      if (e.target.closest('#adminSaveAmbientSilentHours')) {
        const startInput = document.getElementById('adminAmbientSilentStart');
        const endInput = document.getElementById('adminAmbientSilentEnd');
        const start = startInput?.value;
        const end = endInput?.value;

        if (!start || !end) {
          await deps.showAlert('Invalid Time', 'Please provide both start and end times for silent hours.');
          deps.updateAdminAmbientSilentHoursUI?.();
          return;
        }

        const saved = deps.setAmbientGreetingSilentHoursWindow(start, end);
        deps.updateAdminAmbientSilentHoursUI?.();
        await deps.auditAdminAction('set_ambient_silent_window', `Ambient silent hours set to ${saved.start} -> ${saved.end}`);
        await deps.showAlert('Silent Hours Saved', `Ambient greeting silent hours window saved: ${saved.start} to ${saved.end}.`);
      }

      if (e.target.closest('#adminAddUser')) {
        const input = document.getElementById('newUsernameInput');
        if (input) input.value = '';
        const pinInput = document.getElementById('newUserPin');
        if (pinInput) pinInput.value = '';
        document.getElementById('createUserModal')?.classList.remove('hidden');
        setTimeout(() => input?.focus(), 50);
      }

      if (e.target.closest('#adminDeleteUser')) {
        const selectedAdminUser = deps.getSelectedAdminUser();
        if (!selectedAdminUser) {
          await deps.showAlert('Selection Required', 'Please select a user to delete');
          return;
        }

        const userToDelete = selectedAdminUser;
        const confirmed = await deps.showConfirmDialog(
          'Delete User',
          `Are you sure you want to delete user "${userToDelete}"?`
        );
        if (!confirmed) return;

        const users = deps.getUsers().filter(u => u.username !== userToDelete);
        deps.saveUsers(users);
        deps.setSelectedAdminUser(null);
        deps.populateAdminUserList();
        deps.populateAdminStatsUserSelect();
        await deps.auditAdminAction('delete_user', `Deleted user: ${userToDelete}`);
        await deps.showAlert('Success', `User "${userToDelete}" deleted`);
      }

      if (e.target.closest('#exitAdmin')) {
        deps.showScreen('userScreen');
      }
    });

    document.addEventListener('click', (e) => {
      if (e.target.closest('#resetUserStatsBtn')) {
        deps.handleResetUserStats();
      }
    });
  }

  window.adminModule = {
    setupAdminPinHandlers,
    setupAdminPinEditorHandlers,
    setupAdminPanelHandlers,
    populateAdminUserList,
    populateAdminStatsUserSelect,
    handleResetUserStats,
    removeLocalStorageKeysByPrefixes,
    clearCalendarDataForAllUsers,
    clearChallengeDataForAllUsers,
    resetUserStats,
    resetAllUserStats
  };
})();
