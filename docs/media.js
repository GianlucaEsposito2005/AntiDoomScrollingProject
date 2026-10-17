/* ========================================== */
/* TMDB PROXY                                 */
/* ========================================== */

/* The Worker URL is public. The TMDB key stays in a Cloudflare Secret. */

const TMDB_PROXY_URL =
    "https://anti-doomscrolling-tmdb.anti-doomscrolling-tmdb.workers.dev/movie";



/* ========================================== */
/* FILTER ELEMENTS                            */
/* ========================================== */

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
/* OPEN / CLOSE FILTERS                       */
/* ========================================== */

filterToggle.addEventListener(
    "click",
    function () {

        filterSection.classList.toggle(
            "hidden"
        );

    }
);


filterClose.addEventListener(
    "click",
    function () {

        filterSection.classList.add(
            "hidden"
        );

    }
);



/* ========================================== */
/* TEXT -> FILTER VALUE                       */
/* ========================================== */

function slugify(text) {

    return text
        .toLowerCase()
        .trim()
        .replace(/&/g, "and")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");

}



/* ========================================== */
/* FORMAT NUMBERS                             */
/* ========================================== */

function formatNumber(number) {

    return new Intl.NumberFormat(
        "en-CA"
    ).format(number);

}



/* ========================================== */
/* FORMAT RUNTIME                             */
/* ========================================== */

function formatRuntime(minutes) {

    if (
        typeof minutes !== "number" ||
        minutes <= 0
    ) {

        return "Not available";

    }


    const hours =
        Math.floor(
            minutes / 60
        );


    const remainingMinutes =
        minutes % 60;


    if (hours === 0) {

        return `${remainingMinutes}m`;

    }


    if (remainingMinutes === 0) {

        return `${hours}h`;

    }


    return `${hours}h ${remainingMinutes}m`;

}



/* ========================================== */
/* ADD FILTER OPTION                          */
/* ========================================== */

function addSelectOption(
    select,
    value,
    label
) {

    const alreadyExists =
        Array.from(
            select.options
        ).some(
            option =>
                option.value === value
        );


    if (alreadyExists) {

        return;

    }


    const option =
        document.createElement(
            "option"
        );


    option.value =
        value;

    option.textContent =
        label;


    select.appendChild(
        option
    );

}



/* ========================================== */
/* REBUILD DYNAMIC FILTERS                    */
/* ========================================== */

function rebuildDynamicFilters() {

    const entries =
        document.querySelectorAll(
            ".media-entry"
        );


    const years =
        new Set();


    const genres =
        new Map();



    entries.forEach(function (entry) {

        const releaseYear =
            entry.dataset.release;


        if (releaseYear) {

            years.add(
                releaseYear
            );

        }



        const genreTags =
            entry.querySelectorAll(
                ".genre-tags .tag"
            );


        genreTags.forEach(function (tag) {

            const label =
                tag.textContent.trim();


            /*
                Ignore temporary loading/error
                messages.
            */

            if (
                !label ||
                label === "Loading..." ||
                label === "Unavailable" ||
                label === "Unknown"
            ) {

                return;

            }


            const value =
                slugify(label);


            genres.set(
                value,
                label
            );

        });

    });



    const currentRelease =
        releaseFilter.value;

    const currentGenre =
        genreFilter.value;



    releaseFilter.innerHTML =
        '<option value="all">All</option>';


    Array.from(years)
        .sort(
            (a, b) =>
                Number(b) - Number(a)
        )
        .forEach(function (year) {

            addSelectOption(
                releaseFilter,
                year,
                year
            );

        });



    genreFilter.innerHTML =
        '<option value="all">All</option>';


    Array.from(
        genres.entries()
    )
        .sort(
            (a, b) =>
                a[1].localeCompare(
                    b[1]
                )
        )
        .forEach(function (
            [value, label]
        ) {

            addSelectOption(
                genreFilter,
                value,
                label
            );

        });



    if (
        Array.from(
            releaseFilter.options
        ).some(
            option =>
                option.value === currentRelease
        )
    ) {

        releaseFilter.value =
            currentRelease;

    }



    if (
        Array.from(
            genreFilter.options
        ).some(
            option =>
                option.value === currentGenre
        )
    ) {

        genreFilter.value =
            currentGenre;

    }

}



/* ========================================== */
/* LOAD ALL TMDB MOVIES                       */
/* ========================================== */

async function loadTmdbMovieData() {

    const movieEntries =
        document.querySelectorAll(
            '.media-entry[data-type="movie"][data-tmdb-id]'
        );


    const requests =
        Array.from(
            movieEntries
        ).map(
            entry =>
                loadSingleTmdbMovie(
                    entry
                )
        );


    await Promise.allSettled(
        requests
    );


    rebuildDynamicFilters();

    filterMedia();

}



/* ========================================== */
/* LOAD ONE TMDB MOVIE                        */
/* ========================================== */

async function loadSingleTmdbMovie(
    entry
) {

    const tmdbId =
        entry.dataset.tmdbId;


    const titleElement =
        entry.querySelector(
            ".tmdb-title"
        );

    const poster =
        entry.querySelector(
            ".tmdb-poster"
        );

    const posterPlaceholder =
        entry.querySelector(
            ".tmdb-image-placeholder"
        );

    const yearElement =
        entry.querySelector(
            ".tmdb-year"
        );

    const runtimeElement =
        entry.querySelector(
            ".tmdb-runtime"
        );

    const certificationElement =
        entry.querySelector(
            ".tmdb-certification"
        );

    const genreContainer =
        entry.querySelector(
            ".tmdb-genres"
        );

    const ratingElement =
        entry.querySelector(
            ".tmdb-rating"
        );



    try {

        const requestUrl =
            `${TMDB_PROXY_URL}?id=${encodeURIComponent(tmdbId)}&v=2-runtime`;


        const response =
            await fetch(
                requestUrl
            );


        if (!response.ok) {

            throw new Error(
                `TMDB proxy returned ${response.status}`
            );

        }


        const movie =
            await response.json();



        /* ====================================== */
        /* TITLE                                  */
        /* ====================================== */

        if (movie.title) {

            titleElement.textContent =
                movie.title;

        }



        /* ====================================== */
        /* POSTER                                 */
        /* ====================================== */

        if (movie.posterUrl) {

            poster.src =
                movie.posterUrl;


            poster.alt =
                `${movie.title} movie poster`;


            poster.hidden =
                false;


            posterPlaceholder.hidden =
                true;

        }

        else {

            posterPlaceholder.textContent =
                "Poster unavailable";

        }



        /* ====================================== */
        /* RELEASE YEAR                           */
        /* ====================================== */

        if (movie.releaseYear) {

            yearElement.textContent =
                movie.releaseYear;


            entry.dataset.release =
                String(
                    movie.releaseYear
                );

        }

        else {

            yearElement.textContent =
                "Unknown";

        }



        /* ====================================== */
        /* RUNTIME                                */
        /* ====================================== */

        if (runtimeElement) {

            runtimeElement.textContent =
                formatRuntime(
                    movie.runtime
                );

        }



        /* ====================================== */
        /* MATURITY RATING                        */
        /* ====================================== */

        if (movie.certification) {

            certificationElement.textContent =
                movie.certificationRegion
                    ? `${movie.certification} (${movie.certificationRegion})`
                    : movie.certification;

        }

        else {

            certificationElement.textContent =
                "Not available";

        }



        /* ====================================== */
        /* TMDB RATING                            */
        /* ====================================== */

        if (
            typeof movie.voteAverage ===
            "number"
        ) {

            const roundedRating =
                movie.voteAverage.toFixed(
                    1
                );


            const voteText =
                movie.voteCount
                    ? ` (${formatNumber(movie.voteCount)} votes)`
                    : "";


            ratingElement.textContent =
                `${roundedRating} / 10${voteText}`;

        }

        else {

            ratingElement.textContent =
                "Not available";

        }



        /* ====================================== */
        /* GENRES                                 */
        /* ====================================== */

        genreContainer.innerHTML =
            "";


        const genreValues =
            [];


        if (
            Array.isArray(movie.genres) &&
            movie.genres.length > 0
        ) {

            movie.genres.forEach(
                function (genre) {

                    const tag =
                        document.createElement(
                            "span"
                        );


                    tag.className =
                        "tag";


                    tag.textContent =
                        genre;


                    genreContainer.appendChild(
                        tag
                    );


                    genreValues.push(
                        slugify(
                            genre
                        )
                    );

                }
            );


            entry.dataset.genre =
                genreValues.join(" ");

        }

        else {

            const tag =
                document.createElement(
                    "span"
                );


            tag.className =
                "tag";


            tag.textContent =
                "Unknown";


            genreContainer.appendChild(
                tag
            );

        }

    }

    catch (error) {

        console.error(
            "Could not load TMDB movie:",
            error
        );


        posterPlaceholder.textContent =
            "Poster unavailable";


        yearElement.textContent =
            "Unavailable";


        if (runtimeElement) {

            runtimeElement.textContent =
                "Unavailable";

        }


        certificationElement.textContent =
            "Unavailable";


        genreContainer.innerHTML =
            '<span class="tag">Unavailable</span>';


        ratingElement.textContent =
            "Unavailable";

    }

}



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
        document.querySelectorAll(
            ".day-entry"
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


        let visibleMediaCount =
            0;


        const mediaEntries =
            day.querySelectorAll(
                ".media-entry"
            );


        mediaEntries.forEach(
            function (entry) {

                const type =
                    entry.dataset.type;

                const completion =
                    entry.dataset.completion;

                const release =
                    entry.dataset.release;

                const genres =
                    (
                        entry.dataset.genre ||
                        ""
                    ).split(" ");


                const typeMatches =
                    selectedType === "all" ||
                    selectedType === type;


                const completionMatches =
                    selectedCompletion === "all" ||
                    selectedCompletion === completion;


                const releaseMatches =
                    selectedRelease === "all" ||
                    selectedRelease === release;


                const genreMatches =
                    selectedGenre === "all" ||
                    genres.includes(
                        selectedGenre
                    );


                const shouldShow =
                    yearMatches &&
                    monthMatches &&
                    typeMatches &&
                    completionMatches &&
                    releaseMatches &&
                    genreMatches;


                if (shouldShow) {

                    entry.style.display =
                        "";

                    visibleMediaCount++;

                }

                else {

                    entry.style.display =
                        "none";

                }

            }
        );


        if (visibleMediaCount > 0) {

            day.style.display =
                "";

        }

        else {

            day.style.display =
                "none";

        }

    });

}



/* ========================================== */
/* FILTER EVENT LISTENERS                     */
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



/* ========================================== */
/* INITIAL PAGE LOAD                          */
/* ========================================== */

rebuildDynamicFilters();

filterMedia();

loadTmdbMovieData();
