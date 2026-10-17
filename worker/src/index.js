const ALLOWED_ORIGIN =
  "https://gianlucaesposito2005.github.io";

const CACHE_SECONDS =
  6 * 60 * 60;

const BROWSER_CACHE_SECONDS =
  30 * 60;

const TMDB_API_BASE =
  "https://api.themoviedb.org/3";

const TMDB_IMAGE_BASE =
  "https://image.tmdb.org/t/p/w500";


export default {

  async fetch(request, env, ctx) {

    const url =
      new URL(request.url);

    const origin =
      request.headers.get("Origin") || "";


    /* ========================================== */
    /* ONLY ALLOW GET                            */
    /* ========================================== */

    if (request.method !== "GET") {

      return jsonResponse(
        {
          error: "Method not allowed"
        },
        405,
        origin,
        {
          Allow: "GET"
        }
      );

    }


    /* ========================================== */
    /* ONLY ALLOW /movie                         */
    /* ========================================== */

    if (url.pathname !== "/movie") {

      return jsonResponse(
        {
          error: "Not found"
        },
        404,
        origin
      );

    }


    /* ========================================== */
    /* CHECK BROWSER ORIGIN                      */
    /* ========================================== */

    if (
      origin &&
      origin !== ALLOWED_ORIGIN
    ) {

      return jsonResponse(
        {
          error: "Origin not allowed"
        },
        403,
        ""
      );

    }


    /* ========================================== */
    /* VALIDATE MOVIE ID                         */
    /* ========================================== */

    const movieId =
      url.searchParams.get("id");


    if (
      !movieId ||
      !/^\d{1,9}$/.test(movieId)
    ) {

      return jsonResponse(
        {
          error: "Invalid movie ID"
        },
        400,
        origin
      );

    }


    /* ========================================== */
    /* CHECK CLOUDFLARE CACHE                    */
    /* ========================================== */

    const cache =
      caches.default;


    const cacheKey =
      new Request(
        `${url.origin}/__cache/movie/${movieId}`
      );


    const cachedResponse =
      await cache.match(cacheKey);


    if (cachedResponse) {

      const cachedData =
        await cachedResponse.json();


      return jsonResponse(
        cachedData,
        200,
        origin,
        {},
        BROWSER_CACHE_SECONDS
      );

    }


    /* ========================================== */
    /* OVERALL TMDB RATE LIMIT                   */
    /* ========================================== */

    const { success } =
      await env.UPSTREAM_RATE_LIMITER.limit({
        key: "tmdb-movie-upstream"
      });


    if (!success) {

      return jsonResponse(
        {
          error:
            "Movie service is temporarily busy. Please try again shortly."
        },
        429,
        origin,
        {
          "Retry-After": "60"
        }
      );

    }


    /* ========================================== */
    /* BUILD TMDB REQUEST                        */
    /* ========================================== */

    const tmdbUrl =
      new URL(
        `${TMDB_API_BASE}/movie/${movieId}`
      );


    tmdbUrl.searchParams.set(
      "api_key",
      env.TMDB_API_KEY
    );


    tmdbUrl.searchParams.set(
      "append_to_response",
      "release_dates"
    );


    tmdbUrl.searchParams.set(
      "language",
      "en-CA"
    );


    /* ========================================== */
    /* CALL TMDB                                 */
    /* ========================================== */

    let tmdbResponse;


    try {

      tmdbResponse =
        await fetch(
          tmdbUrl,
          {
            headers: {
              Accept: "application/json"
            }
          }
        );

    }

    catch {

      return jsonResponse(
        {
          error:
            "Movie service is unavailable"
        },
        502,
        origin
      );

    }


    /* ========================================== */
    /* TMDB ERROR HANDLING                      */
    /* ========================================== */

    if (tmdbResponse.status === 404) {

      return jsonResponse(
        {
          error: "Movie not found"
        },
        404,
        origin
      );

    }


    if (!tmdbResponse.ok) {

      return jsonResponse(
        {
          error:
            "Movie service returned an error"
        },
        502,
        origin
      );

    }


    /* ========================================== */
    /* FORMAT RESPONSE                           */
    /* ========================================== */

    const tmdbMovie =
      await tmdbResponse.json();


    const movie =
      shapeMovieResponse(
        tmdbMovie
      );


    /* ========================================== */
    /* CACHE AT CLOUDFLARE                       */
    /* ========================================== */

    const cacheResponse =
      new Response(
        JSON.stringify(movie),
        {
          headers: {

            "Content-Type":
              "application/json; charset=utf-8",

            "Cache-Control":
              `public, max-age=${CACHE_SECONDS}`

          }
        }
      );


    ctx.waitUntil(
      cache.put(
        cacheKey,
        cacheResponse
      )
    );


    /* ========================================== */
    /* RETURN TO WEBSITE                         */
    /* ========================================== */

    return jsonResponse(
      movie,
      200,
      origin,
      {},
      BROWSER_CACHE_SECONDS
    );

  }

};



/* ========================================== */
/* SHAPE TMDB RESPONSE                        */
/* ========================================== */

export function shapeMovieResponse(movie) {

  const certification =
    findCertification(
      movie.release_dates?.results
    );


  return {

    id:
      movie.id,


    title:
      movie.title ||
      "Untitled",


    releaseYear:
      /^\d{4}/.test(
        movie.release_date || ""
      )
        ? movie.release_date.slice(
            0,
            4
          )
        : null,


    /* NEW: RUNTIME IN MINUTES */

    runtime:
      Number.isInteger(
        movie.runtime
      ) &&
      movie.runtime > 0
        ? movie.runtime
        : null,


    genres:
      Array.isArray(
        movie.genres
      )
        ? movie.genres
            .map(
              genre =>
                genre.name
            )
            .filter(Boolean)
        : [],


    certification:
      certification?.value ||
      null,


    certificationRegion:
      certification?.region ||
      null,


    posterUrl:
      movie.poster_path
        ? `${TMDB_IMAGE_BASE}${movie.poster_path}`
        : null,


    voteAverage:
      Number.isFinite(
        movie.vote_average
      )
        ? movie.vote_average
        : null,


    voteCount:
      Number.isInteger(
        movie.vote_count
      )
        ? movie.vote_count
        : 0

  };

}



/* ========================================== */
/* FIND MATURITY CERTIFICATION                */
/* ========================================== */

function findCertification(
  results = []
) {

  /*
    Prefer Canada first.

    If Canada has no rating,
    fall back to the United States.
  */

  for (
    const regionCode
    of ["CA", "US"]
  ) {

    const releaseGroup =
      results.find(
        item =>
          item.iso_3166_1 ===
          regionCode
      );


    const certification =
      findCertificationInRegion(
        releaseGroup
      );


    if (certification) {

      return {

        value:
          certification,

        region:
          regionCode

      };

    }

  }


  /*
    If CA and US have nothing,
    use another available region.
  */

  for (
    const releaseGroup
    of results
  ) {

    const certification =
      findCertificationInRegion(
        releaseGroup
      );


    if (certification) {

      return {

        value:
          certification,

        region:
          releaseGroup.iso_3166_1

      };

    }

  }


  return null;

}



/* ========================================== */
/* FIND BEST CERTIFICATION IN REGION          */
/* ========================================== */

function findCertificationInRegion(
  releaseGroup
) {

  if (
    !releaseGroup ||
    !Array.isArray(
      releaseGroup.release_dates
    )
  ) {

    return null;

  }


  /*
    TMDB release types:

    1 = Premiere
    2 = Limited theatrical
    3 = Theatrical
    4 = Digital
    5 = Physical
    6 = TV

    Prefer normal theatrical ratings.
  */

  const preferredTypes = [
    3,
    2,
    1,
    4,
    5,
    6
  ];


  for (
    const type
    of preferredTypes
  ) {

    const release =
      releaseGroup.release_dates.find(
        item =>
          item.type === type &&
          item.certification &&
          item.certification.trim()
      );


    if (release) {

      return (
        release.certification.trim()
      );

    }

  }


  return null;

}



/* ========================================== */
/* JSON RESPONSE                              */
/* ========================================== */

function jsonResponse(
  data,
  status,
  origin,
  extraHeaders = {},
  cacheSeconds = 0
) {

  const headers =
    new Headers({

      "Content-Type":
        "application/json; charset=utf-8",

      "X-Content-Type-Options":
        "nosniff",

      ...extraHeaders

    });


  /*
    Successful movie responses can
    be cached by the browser.

    Errors use no-store.
  */

  if (cacheSeconds > 0) {

    headers.set(
      "Cache-Control",
      `public, max-age=${cacheSeconds}`
    );

  }

  else {

    headers.set(
      "Cache-Control",
      "no-store"
    );

  }


  /* ======================================== */
  /* CORS                                     */
  /* ======================================== */

  if (
    origin ===
    ALLOWED_ORIGIN
  ) {

    headers.set(
      "Access-Control-Allow-Origin",
      ALLOWED_ORIGIN
    );


    headers.set(
      "Vary",
      "Origin"
    );

  }


  return new Response(
    JSON.stringify(data),
    {
      status,
      headers
    }
  );

}
