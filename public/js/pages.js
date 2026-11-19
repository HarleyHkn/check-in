// Switches between the "pages" (.page divs) using the bottom nav bar's 4 tabs.
// The floating Check-in button is NOT one of these tabs - it opens on top of
// whichever tab was active (see checkin-page.js's openCheckinPage()), so it's
// wired separately below instead of going through showPage().

import { renderOverview } from './overview.js';
import { renderCalendarPage } from './calendar.js';
import { renderGraphPage } from './graph-page.js';
import { renderPhotosPage } from './photos-page.js';
import { openCheckinPage } from './checkin-page.js';

export function showPage(pageId) {
    const pages = document.querySelectorAll('.page');
    for (let i = 0; i < pages.length; i++) {
        pages[i].classList.remove('active');
    }
    document.getElementById(pageId).classList.add('active');

    const navButtons = document.querySelectorAll('.nav-item');
    for (let i = 0; i < navButtons.length; i++) {
        navButtons[i].classList.remove('active');
    }
    document.querySelector('.nav-item[data-page="' + pageId + '"]').classList.add('active');

    if (pageId === 'overviewPage') {
        renderOverview();                    // refresh with the latest data every time this page is opened
    }
    if (pageId === 'calendarPage') {
        renderCalendarPage();                // refresh with the latest data every time this page is opened
    }
    if (pageId === 'graphPage') {
        renderGraphPage();                   // refresh with the latest data every time this page is opened
    }
    if (pageId === 'photosPage') {
        renderPhotosPage();                  // refresh with the latest data every time this page is opened
    }
}

const navButtons = document.querySelectorAll('.nav-item');
for (let i = 0; i < navButtons.length; i++) {
    navButtons[i].addEventListener('click', function () {
        showPage(this.dataset.page);
    });
}

document.getElementById('checkinFab').addEventListener('click', openCheckinPage);

showPage('overviewPage'); // start on the overview page
