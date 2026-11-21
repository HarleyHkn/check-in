// Full-screen view of one photo. Opened by tapping a photo in the carousel or
// in Compare; closed by tapping anywhere, the X button, or Escape.

const viewer = document.getElementById('photoViewer');
const viewerImg = document.getElementById('photoViewerImg');

export function openPhotoViewer(src) {
    viewerImg.src = src;
    viewer.classList.add('open');
}

function closePhotoViewer() {
    viewer.classList.remove('open');
}

viewer.addEventListener('click', closePhotoViewer); // the X button sits inside, so its click lands here too
document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') {
        closePhotoViewer();
    }
});
