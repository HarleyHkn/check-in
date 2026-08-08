// App entry point - the only <script> tag in index.html. Loads every data type
// once, then does the first render of each page. Also the one file that pulls
// in pages.js purely for its side effects (registering the bottom-nav listeners
// and showing the home page) - every other file's own top-level listeners get
// registered automatically as a side effect of the imports below, since loading
// a module always runs its whole file once, not just the specific export asked for.

import { loadWeightLog } from './weights-ui.js';
import { loadStepsLog } from './steps-ui.js';
import { loadMeasurementTypes, loadMeasurementValues } from './measurements-ui.js';
import { loadPhotoList } from './photos-ui.js';
import { refreshHomeStats, displayDate, renderWeekStrip, refreshHomeEntryBox } from './home-page.js';
import { calenderFunc } from './calender.js';
import './pages.js'; // side effect: registers the bottom-nav listeners + shows the home page

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
