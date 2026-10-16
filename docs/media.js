const yearFilter =
    document.getElementById("year-filter");

const monthFilter =
    document.getElementById("month-filter");

const typeFilter =
    document.getElementById("type-filter");

const completionFilter =
    document.getElementById("completion-filter");

const releaseFilter =
    document.getElementById("release-filter");

const genreFilter =
    document.getElementById("genre-filter");


const filterToggle =
    document.getElementById("filter-toggle");

const filterSection =
    document.getElementById("filter-section");

const filterClose =
    document.getElementById("filter-close");



/* ========================================== */
/* OPEN / CLOSE FILTER MENU                   */
/* ========================================== */

filterToggle.addEventListener("click", function () {

    filterSection.classList.toggle("hidden");

});


filterClose.addEventListener("click", function () {

    filterSection.classList.add("hidden");

});



/* ========================================== */
/* FILTER MEDIA                               */
/* ========================================== */

function filterMedia() {

    const selectedYear =
        yearFilter.value;

    const selectedMonth =
        monthFilter.value;

    const selectedType =
        typeFilter.value;

    const selectedCompletion =
        completionFilter.value;

    const selectedRelease =
        releaseFilter.value;

    const selectedGenre =
        genreFilter.value;


    const days =
        document.querySelectorAll(".day-entry");


    days.forEach(function (day) {

        const dayYear =
            day.dataset.year;

        const dayMonth =
            day.dataset.month;


        const yearMatches =
            selectedYear === "all" ||
            selectedYear === dayYear;


        const monthMatches =
            selectedMonth === "all" ||
            selectedMonth === dayMonth;


        let visibleMediaCount = 0;


        const mediaEntries =
            day.querySelectorAll(".media-entry");


        mediaEntries.forEach(function (entry) {

            const type =
                entry.dataset.type;

            const completion =
                entry.dataset.completion;

            const release =
                entry.dataset.release;

            const genre =
                entry.dataset.genre || "";


            const typeMatches =
                selectedType === "all" ||
                selectedType === type;


            const completionMatches =
                selectedCompletion === "all" ||
                selectedCompletion === completion;


            const releaseMatches =
                selectedRelease === "all" ||
                selectedRelease === release;


            const genreTags =
                genre.split(" ");


            const genreMatches =
                selectedGenre === "all" ||
                genreTags.includes(selectedGenre);


            const shouldShow =
                yearMatches &&
                monthMatches &&
                typeMatches &&
                completionMatches &&
                releaseMatches &&
                genreMatches;


            if (shouldShow) {

                entry.style.display = "";

                visibleMediaCount++;

            } else {

                entry.style.display = "none";

            }

        });


        if (visibleMediaCount > 0) {

            day.style.display = "";

        } else {

            day.style.display = "none";

        }

    });

}



/* ========================================== */
/* WATCH FILTER CHANGES                       */
/* ========================================== */

yearFilter.addEventListener(
    "change",
    filterMedia
);

monthFilter.addEventListener(
    "change",
    filterMedia
);

typeFilter.addEventListener(
    "change",
    filterMedia
);

completionFilter.addEventListener(
    "change",
    filterMedia
);

releaseFilter.addEventListener(
    "change",
    filterMedia
);

genreFilter.addEventListener(
    "change",
    filterMedia
);
