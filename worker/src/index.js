const ALLOWED_ORIGIN = "https://gianlucaesposito2005.github.io";
const CACHE_SECONDS = 6 * 60 * 60;
const BROWSER_CACHE_SECONDS = 30 * 60;
const TMDB_API_BASE = "https://api.themoviedb.org/3";
const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p/w500";

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin") || "";

    if (request.method !== "GET") {
      return jsonResponse({ error: "Method not allowed" }, 405, origin, {
        Allow: "GET"
      });
    }

    if (url.pathname !== "/movie") {
      return jsonResponse({ error: "Not found" }, 404, origin);
    }

    if (origin && origin !== ALLOWED_ORIGIN) {
      return jsonResponse({ error: "Origin not allowed" }, 403, "");
    }

    const movieId = url.searchParams.get("id");
    if (!movieId || !/^\d{1,9}$/.test(movieId)) {
      return jsonResponse({ error: "Invalid movie ID" }, 400, origin);
    }

    const cache = caches.default;
    const cacheKey = new Request(`${url.origin}/__cache/movie/${movieId}`);
    const cachedResponse = await cache.match(cacheKey);

    if (cachedResponse) {
      const cachedData = await cachedResponse.json();
      return jsonResponse(cachedData, 200, origin);
    }

    const { success } = await env.UPSTREAM_RATE_LIMITER.limit({
      key: "tmdb-movie-upstream"
    });

    if (!success) {
      return jsonResponse(
        { error: "Movie service is temporarily busy. Please try again shortly." },
        429,
        origin,
        { "Retry-After": "60" }
      );
    }

    const tmdbUrl = new URL(`${TMDB_API_BASE}/movie/${movieId}`);
    tmdbUrl.searchParams.set("api_key", env.TMDB_API_KEY);
    tmdbUrl.searchParams.set("append_to_response", "release_dates");
    tmdbUrl.searchParams.set("language", "en-CA");

    let tmdbResponse;
    try {
      tmdbResponse = await fetch(tmdbUrl, {
        headers: { Accept: "application/json" }
      });
    } catch {
      return jsonResponse({ error: "Movie service is unavailable" }, 502, origin);
    }

    if (tmdbResponse.status === 404) {
      return jsonResponse({ error: "Movie not found" }, 404, origin);
    }

    if (!tmdbResponse.ok) {
      return jsonResponse({ error: "Movie service returned an error" }, 502, origin);
    }

    const tmdbMovie = await tmdbResponse.json();
    const movie = shapeMovieResponse(tmdbMovie);
    const cacheResponse = new Response(JSON.stringify(movie), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": `public, max-age=${CACHE_SECONDS}`
      }
    });

    ctx.waitUntil(cache.put(cacheKey, cacheResponse));
    return jsonResponse(movie, 200, origin);
  }
};

export function shapeMovieResponse(movie) {
  const certification = findCertification(movie.release_dates?.results);

  return {
    id: movie.id,
    title: movie.title || "Untitled",
    releaseYear: /^\d{4}/.test(movie.release_date || "")
      ? movie.release_date.slice(0, 4)
      : null,
    genres: Array.isArray(movie.genres)
      ? movie.genres.map((genre) => genre.name).filter(Boolean)
      : [],
    certification: certification?.value || null,
    certificationRegion: certification?.region || null,
    posterUrl: movie.poster_path ? `${TMDB_IMAGE_BASE}${movie.poster_path}` : null,
    voteAverage: Number.isFinite(movie.vote_average) ? movie.vote_average : null,
    voteCount: Number.isInteger(movie.vote_count) ? movie.vote_count : 0
  };
}

function findCertification(results = []) {
  for (const region of ["CA", "US"]) {
    const releaseGroup = results.find((item) => item.iso_3166_1 === region);
    const certification = releaseGroup?.release_dates
      ?.map((item) => item.certification?.trim())
      .find(Boolean);

    if (certification) {
      return { value: certification, region };
    }
  }

  return null;
}

function jsonResponse(data, status, origin, extraHeaders = {}) {
  const headers = new Headers({
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": `public, max-age=${BROWSER_CACHE_SECONDS}`,
    "X-Content-Type-Options": "nosniff",
    ...extraHeaders
  });

  if (origin === ALLOWED_ORIGIN) {
    headers.set("Access-Control-Allow-Origin", ALLOWED_ORIGIN);
    headers.set("Vary", "Origin");
  }

  return new Response(JSON.stringify(data), { status, headers });
}
