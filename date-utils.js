// Pure date helpers shared across the whole app - no data, no DOM, just date
// math. Loads first since almost every other file depends on these.

function formatDateKey(date) {      // Turns a real Date into a plain "YYYY-MM-DD" string, using LOCAL time
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return year + '-' + month + '-' + day;
}

function toDateKey(value) {         // Accepts either a Date object or an already-formatted "YYYY-MM-DD" string.
    if (typeof value === 'string') {
        return value;                    // already in the right format (this is how dates come back from the server)
    }
    return formatDateKey(value);         // a real Date object - format it ourselves (never parse date-only strings
                                          // with new Date(), that parses as UTC midnight and can shift the day)
}

function sameDay(a, b) {            // Check if same day
    return toDateKey(a) === toDateKey(b);
}

function getMondayDate (date = new Date()) {                 // Find mondays date

    const weekday = date.getDay(); // get the current day of the week (0-6, where 0 is Sunday

    let mondayDate; // variable to store the date of monday

    // To solve issue of starting at 0.
    if(weekday == 0) { // if its sunday, set the weekday to 6 ie monday
        mondayDate = 6;
    }else {
        mondayDate= weekday-1; // otherwise -1 will give correct day.
    }

    // Calculate when monday this week was ie the date of monday. To get week avergage.
    date.setDate(date.getDate() -mondayDate);

    return date;
}

function getWeekNumber(mondayDate) {         // Which week number of the year this Monday falls in
    const startYear = new Date(mondayDate.getFullYear(), 0, 1); // Jan 1st of that year
    const msPerDay = 86400000;
    const daysPassed = (mondayDate - startYear) / msPerDay;
    return Math.ceil((daysPassed + startYear.getDay() + 1) / 7);
}
