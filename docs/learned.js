const learnedYearFilter =
    document.getElementById("learned-year-filter");

const learnedMonthFilter =
    document.getElementById("learned-month-filter");

const categoryFilter =
    document.getElementById("category-filter");

const learningTypeFilter =
    document.getElementById("learning-type-filter");


const learnedFilterToggle =
    document.getElementById("learned-filter-toggle");

const learnedFilterSection =
    document.getElementById("learned-filter-section");

const learnedFilterClose =
    document.getElementById("learned-filter-close");



/* ========================================== */
/* OPEN / CLOSE FILTERS                       */
/* ========================================== */

learnedFilterToggle.addEventListener(
    "click",
    function () {

        learnedFilterSection.classList.toggle(
            "hidden"
        );

    }
);


learnedFilterClose.addEventListener(
    "click",
    function () {

        learnedFilterSection.classList.add(
            "hidden"
        );

    }
);



/* ========================================== */
/* FILTER LEARNED ENTRIES                     */
/* ========================================== */

function filterLearned() {

    const selectedYear =
        learnedYearFilter.value;

    const selectedMonth =
        learnedMonthFilter.value;

    const selectedCategory =
        categoryFilter.value;

    const selectedLearningType =
        learningTypeFilter.value;


    const days =
        document.querySelectorAll(
            ".learned-day-entry"
        );


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


        let visibleEntries = 0;


        const entries =
            day.querySelectorAll(
                ".learned-entry"
            );


        entries.forEach(function (entry) {

            const category =
                entry.dataset.category;

            const learningType =
                entry.dataset.learningType;


            const categoryMatches =
                selectedCategory === "all" ||
                selectedCategory === category;


            const learningTypeMatches =
                selectedLearningType === "all" ||
                selectedLearningType === learningType;


            const shouldShow =
                yearMatches &&
                monthMatches &&
                categoryMatches &&
                learningTypeMatches;


            if (shouldShow) {

                entry.style.display = "";

                visibleEntries++;

            } else {

                entry.style.display = "none";

            }

        });


        if (visibleEntries > 0) {

            day.style.display = "";

        } else {

            day.style.display = "none";

        }

    });

}



/* ========================================== */
/* WATCH FILTER CHANGES                       */
/* ========================================== */

learnedYearFilter.addEventListener(
    "change",
    filterLearned
);

learnedMonthFilter.addEventListener(
    "change",
    filterLearned
);

categoryFilter.addEventListener(
    "change",
    filterLearned
);

learningTypeFilter.addEventListener(
    "change",
    filterLearned
);
