console.log('CHALLENGES-MODULE.JS LOADED');

(() => {
  function isChallengeCompletedToday(currentUser) {
    if (!currentUser) return false;

    const today = new Date().toISOString().split('T')[0];
    const key = `challenge_completions_${currentUser}`;
    const completions = JSON.parse(localStorage.getItem(key) || '[]');

    return completions.includes(today);
  }

  function getChallengeStats(currentUser) {
    if (!currentUser) return { total: 0, streak: 0, points: 0 };

    const completions = JSON.parse(localStorage.getItem(`challenge_completions_${currentUser}`) || '[]');
    const points = parseInt(localStorage.getItem(`challenge_points_${currentUser}`) || '0');

    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const sortedDates = completions.map(d => new Date(d)).sort((a, b) => b - a);

    let checkDate = new Date(today);
    for (const completionDate of sortedDates) {
      const cDate = new Date(completionDate);
      cDate.setHours(0, 0, 0, 0);

      const diffDays = Math.floor((checkDate - cDate) / (1000 * 60 * 60 * 24));

      if (diffDays === 0 || diffDays === 1) {
        streak++;
        checkDate = new Date(cDate);
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }

    return {
      total: completions.length,
      streak,
      points
    };
  }

  function markChallengeComplete({
    currentUser,
    getTodaysChallenge,
    saveWorkoutToCalendarDate,
    recordWorkout,
    showDailyChallengeScreen,
    alertFn
  }) {
    if (!currentUser) {
      alertFn('Please select a user first.');
      return;
    }

    const today = new Date().toISOString().split('T')[0];
    const key = `challenge_completions_${currentUser}`;
    const completions = JSON.parse(localStorage.getItem(key) || '[]');

    if (completions.includes(today)) {
      alertFn('You already completed today\'s challenge! 🎉');
      return;
    }

    completions.push(today);
    localStorage.setItem(key, JSON.stringify(completions));

    const challenge = getTodaysChallenge();
    const pointsKey = `challenge_points_${currentUser}`;
    const currentPoints = parseInt(localStorage.getItem(pointsKey) || '0');
    localStorage.setItem(pointsKey, (currentPoints + challenge.points).toString());

    const date = new Date();
    saveWorkoutToCalendarDate(date, {
      exercises: challenge.exercises.map(ex => ({ name: ex.name })),
      difficulty: challenge.difficulty,
      focusMuscle: challenge.name + ' (Daily Challenge)',
      type: 'challenge'
    });

    if (typeof recordWorkout === 'function') {
      const exerciseNames = challenge.exercises?.map(e => e.name || e) || [];
      recordWorkout([challenge.name.split(' ')[0]], exerciseNames, 15);
    }

    showDailyChallengeScreen();

    alertFn(`🎉 Challenge Complete! You earned ${challenge.points} points!`);
  }

  function getFriendChallengeHistory(historyKey) {
    return JSON.parse(localStorage.getItem(historyKey) || '[]');
  }

  async function loadFriendChallengeHistoryFromServer({ historyKey, baseUrl = 'http://localhost:3001' }) {
    try {
      const response = await fetch(`${baseUrl}/api/friend-challenges`);
      if (!response.ok) {
        throw new Error('Failed to load friend challenges');
      }
      const data = await response.json();
      const challenges = Array.isArray(data.challenges) ? data.challenges : [];
      localStorage.setItem(historyKey, JSON.stringify(challenges));
      return challenges;
    } catch (error) {
      console.warn('UI.JS: Unable to load friend challenges from server:', error);
      return getFriendChallengeHistory(historyKey);
    }
  }

  function saveFriendChallengeToHistory({ historyKey, entry, limit = 20 }) {
    const history = getFriendChallengeHistory(historyKey);
    history.unshift(entry);
    localStorage.setItem(historyKey, JSON.stringify(history.slice(0, limit)));
  }

  async function saveFriendChallengeToServer({ entry, baseUrl = 'http://localhost:3001' }) {
    try {
      const response = await fetch(`${baseUrl}/api/friend-challenges`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ challenge: entry })
      });

      if (!response.ok) {
        throw new Error('Failed to save friend challenge');
      }

      const data = await response.json();
      return data.challenge || entry;
    } catch (error) {
      console.warn('UI.JS: Unable to save friend challenge to server:', error);
      return entry;
    }
  }

  window.challengesModule = {
    isChallengeCompletedToday,
    getChallengeStats,
    markChallengeComplete,
    getFriendChallengeHistory,
    loadFriendChallengeHistoryFromServer,
    saveFriendChallengeToHistory,
    saveFriendChallengeToServer
  };
})();
