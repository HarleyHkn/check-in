// App entry point: loads every data type once, then does the first render of
// each page. Runs last (after every other script has already defined its
// functions) so it never has to guess whether something it calls exists yet.

async function initPage() {
    await loadWeightLog();
    await loadStepsLog();
    await loadMeasurementTypes();
    await loadMeasurementValues(); // all data types need to be loaded before the calendar/week-strip tinting can be accurate
    await loadPhotoList();

    refreshHomeStats();
    displayDate();       // call the function to display the date
    renderWeekStrip();   // Draw the Mon-Sun strip
    refreshHomeEntryBox();
    calenderFunc();      // Re-render the calendar now that data has actually arrived
                          // (its own first render at the bottom of calender.js runs
                          // before this fetch finishes, so it starts out untinted)
}

initPage();
