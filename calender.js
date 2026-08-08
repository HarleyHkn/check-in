let currentDate = new Date();   // Current date

function buildDataDots(date) {          // A small dot per metric present that day: 1 for weight, 2 for weight+steps
    const hasWeight = getWeightForDate(date) !== null;
    const hasSteps = getStepsForDate(date) !== null;

    if (!hasWeight && !hasSteps) {
        return null;                    // nothing logged this day - no dots to show
    }

    const dotsWrap = document.createElement('span');
    dotsWrap.className = 'data-dots';

    if (hasWeight) {
        const dot = document.createElement('span');
        dot.className = 'data-dot';
        dotsWrap.appendChild(dot);
    }
    if (hasSteps) {
        const dot = document.createElement('span');
        dot.className = 'data-dot';
        dotsWrap.appendChild(dot);
    }

    return dotsWrap;
}

function isWeekFullyComplete(mondayDate) {  // true if the week has SOME weight, SOME steps, AND SOME measurement entry
    let hasWeight = false;
    let hasSteps = false;

    for (let i = 0; i < 7; i++) {
        const dayDate = new Date(mondayDate);
        dayDate.setDate(mondayDate.getDate() + i);
        if (getWeightForDate(dayDate) !== null) {
            hasWeight = true;
        }
        if (getStepsForDate(dayDate) !== null) {
            hasSteps = true;
        }
    }
    // Not "every day has both" - the weekly-average shortcut only ever writes to
    // Monday (see week-modal.js), so a week entered that way would never satisfy
    // an every-day check even though it's genuinely fully entered.

    let hasMeasurement = false;
    for (let i = 0; i < measurementTypes.length; i++) {
        // Measurements are always saved against the Monday of the week (see measurements-tab.js)
        if (measurementTypes[i].isActive && getMeasurementValue(mondayDate, measurementTypes[i].name) !== null) {
            hasMeasurement = true;
            break;
        }
    }

    return hasWeight && hasSteps && hasMeasurement;
}

function calenderFunc(){

    const clearBox = document.getElementById("dates");   // Cleans all previous entered boxes.
    clearBox.innerHTML = "";

    const monthYearElement = document.getElementById("monthYear");
    const datesElement = document.getElementById("dates");
    const prevButtonElement = document.getElementById("prevButton");
    const nextButtonElement = document.getElementById("nextButton");

    let month = currentDate.toLocaleDateString("en-us", {month:"long"});    // Month as string
    let year = currentDate.getFullYear();                                   // Year number

    let monthYear = [month + " " + year];                                   // Combined to put into box
    monthYearElement.textContent = monthYear;

    let currMonthDays = new Date(year, currentDate.getMonth() + 1, 0).getDate();  // Month days
    let firstDayMonth = currentDate.getDay(currentDate.setDate(1));               // First day of the month

    const box = document.getElementById("dates");                               // Get date box

    for(let i = 0; i < firstDayMonth-1; i++){

        const div = document.createElement("div");
        box.appendChild(div);
    }

    for(let j = 0; j < currMonthDays; j++){

        const div = document.createElement("div");
        div.textContent = j+1;

        const cellDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), j+1);
        div.addEventListener('click', () => openDayModal(cellDate));

        const dots = buildDataDots(cellDate);
        if (dots !== null) {
            div.appendChild(dots);
        }

        box.appendChild(div);


    }

    // Weeks

    let firstDay = getMondayDate(new Date(currentDate));

    const clearBoxWeeks = document.getElementById("weekButton");   // Cleans all previous entered boxes.
    clearBoxWeeks.innerHTML = "";

    const wbox = document.getElementById("weekButton");

    let totCells = (firstDayMonth -1 ) + currMonthDays;

    let numWeeks = Math.ceil(totCells/ 7);

    for(let w = 0; w < numWeeks; w++){

        const rowMonday = new Date(firstDay);              // clone so firstDay itself isn't mutated
        rowMonday.setDate(firstDay.getDate() + w * 7);      // Monday of this row's week

        const div = document.createElement("div");
        div.textContent = getWeekNumber(rowMonday);         // same function the popup title uses - one source of truth
        div.addEventListener('click', () => openWeekModal(rowMonday));

        if (isWeekFullyComplete(rowMonday)) {
            div.classList.add('has-full-entry'); // the neon border - only once the whole week is filled in
        }
        if (weekHasPhoto(rowMonday)) {
            div.classList.add('has-photo-entry'); // the teal ring - independent of has-full-entry above
        }

        wbox.appendChild(div);
    }
       
}
// Buttons to go forward and back 1 month, changes month then runs calender again.

function prevButton(){
    currentDate.setMonth(currentDate.getMonth() - 1);
    calenderFunc();
}
document.getElementById('prevButton').addEventListener('click', prevButton);        // add an event listener to the button

function nextButton(){
     currentDate.setMonth(currentDate.getMonth() + 1);
     calenderFunc();
}
document.getElementById('nextButton').addEventListener('click', nextButton);        // add an event listener to the button

calenderFunc();
