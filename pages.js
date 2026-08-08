// Switches between the "pages" (.page divs) using the bottom nav bar.

function showPage(pageId) {
    const pages = document.querySelectorAll('.page');
    for (let i = 0; i < pages.length; i++) {
        pages[i].classList.remove('active');
    }
    document.getElementById(pageId).classList.add('active');

    const navButtons = document.querySelectorAll('.page-nav-button');
    for (let i = 0; i < navButtons.length; i++) {
        navButtons[i].classList.remove('active');
    }
    document.querySelector('.page-nav-button[data-page="' + pageId + '"]').classList.add('active');

    if (pageId === 'overviewPage') {
        renderOverview();                    // refresh with the latest data every time this page is opened
    }
    if (pageId === 'photosPage') {
        renderPhotosPage();                  // refresh with the latest data every time this page is opened
    }
    if (pageId === 'weeklyPage') {
        renderWeeklyPage();                  // refresh with the latest data every time this page is opened
    }
}

const navButtons = document.querySelectorAll('.page-nav-button');
for (let i = 0; i < navButtons.length; i++) {
    navButtons[i].addEventListener('click', function () {
        showPage(this.dataset.page);
    });
}

showPage('homePage'); // start on the home page
