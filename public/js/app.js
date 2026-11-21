// App entry point - the only <script> tag in index.html. Loads every data type
// once, then does the first render of each page. Also the one file that pulls
// in pages.js purely for its side effects (registering the bottom-nav listeners
// and showing the overview page) - every other file's own top-level listeners get
// registered automatically as a side effect of the imports below, since loading
// a module always runs its whole file once, not just the specific export asked for.

import { loadWeightLog } from './weights-ui.js';
import { loadStepsLog } from './steps-ui.js';
import { loadMeasurementTypes, loadMeasurementValues } from './measurements-ui.js';
import { loadPhotoList } from './photos-ui.js';
import { renderCalendarPage } from './calendar.js';
import './week-picker.js';
import { markDataReady } from './data-ready.js';
import { renderOverview } from './overview.js';
import './pages.js'; // side effect: registers the bottom-nav listeners + shows the overview page

async function initPage() {
    // These five fetches don't depend on each other, so load them all at once
    // (Promise.all) instead of one after another - one after another was the
    // actual cause of a real bug: the Check-in page (open-able the instant the
    // app loads, via the floating "+") builds its Measurements section from
    // whatever's in measurementTypes/measurementValues right now, and those
    // two loaded last in the old sequential order, so weight/steps looked
    // filled in immediately while measurements stayed blank until they
    // happened to finish moments later. Loading in parallel shrinks that
    // window; markDataReady() below (checked by checkin-page.js) closes it
    // completely regardless of load order or speed.
    await Promise.all([
        loadWeightLog(),
        loadStepsLog(),
        loadMeasurementTypes(),
        loadMeasurementValues(),
        loadPhotoList()
    ]);

    markDataReady();

    renderCalendarPage(); // Re-render the calendar now that data has actually arrived
                          // (its own first render at the bottom of calendar.js runs
                          // before this fetch finishes, so it starts out empty)

    renderOverview();     // reloads weight data, to handle "No data" shown.
}

initPage();
