// Tracks whether app.js's initial data load (weight/steps/measurements/photos)
// has finished. The Check-in page can be opened the instant the app loads (the
// floating "+" button is clickable immediately) - without this, opening it
// too early would build the Measurements section from the still-empty
// measurementTypes/measurementValues arrays, and nothing would ever re-render
// it once the real data actually arrived. Split into its own tiny file (not
// just a flag inside app.js) so checkin-page.js can import it without a
// circular import back to app.js (app.js -> pages.js -> checkin-page.js
// already exists, so checkin-page.js can't import app.js).

let resolveDataReady;
export const dataReady = new Promise(function (resolve) {
    resolveDataReady = resolve;
});

// Called once by app.js's initPage(), after every initial fetch has finished.
export function markDataReady() {
    resolveDataReady();
}
