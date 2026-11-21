// Pure date helpers shared across the whole app - no data, no DOM, just date
// math. Every other file that needs a date helper imports it from here.

// Turns a real Date into a plain "YYYY-MM-DD" string, using LOCAL time.
export function formatDateKey(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return year + '-' + month + '-' + day;
}

// Accepts either a Date object or an already-formatted "YYYY-MM-DD" string,
// and always returns a "YYYY-MM-DD" string.
export function toDateKey(value) {
    if (typeof value === 'string') {
        return value;                    // already in the right format (this is how dates come back from the server)
    }
    return formatDateKey(value);         // a real Date object - format it ourselves (never parse date-only strings
                                          // with new Date(), that parses as UTC midnight and can shift the day)
}

// Check if two dates (Date objects or "YYYY-MM-DD" strings, mixed is fine) are the same day.
export function sameDay(a, b) {
    return toDateKey(a) === toDateKey(b);
}

// Finds the Monday of the week a date falls in. Mutates and returns the same
// Date object that was passed in (or a fresh "today" Date if none was given).
export function getMondayDate(date = new Date()) {

    const weekday = date.getDay(); // get the current day of the week (0-6, where 0 is Sunday)

    let mondayDate; // variable to store the date of monday

    // To solve issue of starting at 0.
    if (weekday == 0) { // if its sunday, set the weekday to 6 ie monday
        mondayDate = 6;
    } else {
        mondayDate = weekday - 1; // otherwise -1 will give correct day.
    }

    // Calculate when monday this week was ie the date of monday. To get week avergage.
    date.setDate(date.getDate() - mondayDate);

    return date;
}

// Which week number of the year this Monday falls in.
export function getWeekNumber(mondayDate) {
    const startYear = new Date(mondayDate.getFullYear(), 0, 1); // Jan 1st of that year
    const msPerDay = 86400000;
    const daysPassed = (mondayDate - startYear) / msPerDay;
    return Math.ceil((daysPassed + startYear.getDay() + 1) / 7);
}

// "YYYY-MM-DD" -> local Date. Splitting it ourselves avoids the UTC-midnight
// shift that new Date("YYYY-MM-DD") causes. The reverse of formatDateKey.
// Used by both the Photos page and the Weekly page.
export function parseDateKey(dateKey) {
    const parts = dateKey.split('-');
    return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
}

// Finds the Monday for a given week number in the given year, by walking forward
// from Jan 1st one week at a time until getWeekNumber() agrees - simplest way to
// reverse that function without duplicating its date math. Returns null if the
// week number doesn't exist (e.g. typed 99). Used by the Calendar page's
// "Check in for another week" box (week-picker.js).
export function findMondayForWeekNumber(weekNumber, year) {
    let monday = getMondayDate(new Date(year, 0, 1));
    for (let i = 0; i < 53; i++) {
        // getWeekNumber() counts from the Monday's own year, so the Monday must be
        // in `year` - otherwise "2026, week 53" matched Dec 29 2025 first.
        if (getWeekNumber(monday) === weekNumber && monday.getFullYear() === year) {
            return monday;
        }
        const nextMonday = new Date(monday);
        nextMonday.setDate(monday.getDate() + 7);
        monday = nextMonday;
    }
    return null;
}
