console.log('CALENDAR-MODULE.JS LOADED');

(() => {
  function getUserWorkoutDates(currentUser, workoutCalendarKey) {
    if (!currentUser) return [];
    const allData = JSON.parse(localStorage.getItem(workoutCalendarKey) || '{}');
    return allData[currentUser] || [];
  }

  function markWorkoutComplete(currentUser, workoutCalendarKey, date = new Date()) {
    if (!currentUser) return;

    const dateStr = date.toISOString().split('T')[0];
    const allData = JSON.parse(localStorage.getItem(workoutCalendarKey) || '{}');

    if (!allData[currentUser]) {
      allData[currentUser] = [];
    }

    if (!allData[currentUser].includes(dateStr)) {
      allData[currentUser].push(dateStr);
      localStorage.setItem(workoutCalendarKey, JSON.stringify(allData));
    }
  }

  function saveWorkoutToCalendarDate(currentUser, workoutCalendarKey, date, workoutData) {
    if (!currentUser) return;

    const dateStr = date.toISOString().split('T')[0];
    const key = `calendar_workouts_${currentUser}`;
    const allWorkouts = JSON.parse(localStorage.getItem(key) || '{}');

    allWorkouts[dateStr] = {
      ...workoutData,
      savedDate: new Date().toISOString()
    };

    localStorage.setItem(key, JSON.stringify(allWorkouts));
    markWorkoutComplete(currentUser, workoutCalendarKey, date);
  }

  function getWorkoutForDate(currentUser, dateStr) {
    if (!currentUser) return null;

    const key = `calendar_workouts_${currentUser}`;
    const allWorkouts = JSON.parse(localStorage.getItem(key) || '{}');
    return allWorkouts[dateStr] || null;
  }

  function saveMealPlanToCalendarDate(currentUser, date, mealPlanData) {
    if (!currentUser) return;

    const dateStr = date.toISOString().split('T')[0];
    const key = `calendar_meals_${currentUser}`;
    const allMeals = JSON.parse(localStorage.getItem(key) || '{}');

    allMeals[dateStr] = {
      ...mealPlanData,
      savedDate: new Date().toISOString()
    };

    localStorage.setItem(key, JSON.stringify(allMeals));
  }

  function getMealPlanForDate(currentUser, dateStr) {
    if (!currentUser) return null;

    const key = `calendar_meals_${currentUser}`;
    const allMeals = JSON.parse(localStorage.getItem(key) || '{}');
    return allMeals[dateStr] || null;
  }

  window.calendarModule = {
    getUserWorkoutDates,
    markWorkoutComplete,
    saveWorkoutToCalendarDate,
    getWorkoutForDate,
    saveMealPlanToCalendarDate,
    getMealPlanForDate
  };
})();
