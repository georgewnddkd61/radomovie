// ===============================
// 1) TMDb API Key (반드시 본인 키로 교체)
// ===============================
const API_KEY = "80aede23fdc39b16894bb91295abf604";

// ===============================
// 2) 페이지 로드 후 버튼 이벤트 등록
// ===============================
document.addEventListener("DOMContentLoaded", () => {
  // Start 버튼 클릭 시 getRandomMovie() 실행
  document.getElementById("startButton").addEventListener("click", function() {
    getRandomMovie();
  });
});

/*
  ===============================
  3) 랜덤 영화 + 상세 정보 + OTT 정보
  ===============================
  1. TMDb의 discover/movie로 여러 영화 중 랜덤 하나 선택
  2. 그 영화의 id로 "영화 상세 정보 API" 호출 → 장르, 러닝타임, 평점 등 얻음
  3. displayMovie()에서 OTT 정보도 가져와 표시 (watch providers)
  4. 유사한 영화 목록도 표시
*/
async function getRandomMovie() {
  try {
    // (A) 랜덤 페이지 (1~50)
    const randomPage = Math.floor(Math.random() * 50) + 1;
    const discoverUrl = `https://api.themoviedb.org/3/discover/movie?api_key=${API_KEY}&language=ko-KR&page=${randomPage}&include_adult=false`;

    // (B) discover/movie 호출
    const discoverRes = await fetch(discoverUrl);
    const discoverData = await discoverRes.json();

    const movies = discoverData.results;
    if (!movies || movies.length === 0) {
      console.error("영화 목록이 비어 있습니다.");
      return;
    }

    // (C) 목록 중 랜덤 하나 골라옴
    const randomIndex = Math.floor(Math.random() * movies.length);
    const pickedMovie = movies[randomIndex];

    // (D) 상세 정보 API 호출
    const detailUrl = `https://api.themoviedb.org/3/movie/${pickedMovie.id}?api_key=${API_KEY}&language=ko-KR`;
    const detailRes = await fetch(detailUrl);
    const detailData = await detailRes.json();

    // (E) 상세 정보 표시 (장르 이름, 러닝타임, 평점, OTT 등)
    displayMovie(detailData);

    // (F) 유사한 영화 목록
    getSimilarMovies(pickedMovie.id);

  } catch (error) {
    console.error("영화 정보를 가져오는 중 오류 발생:", error);
  }
}

/*
  ===============================
  4) OTT(Watch Providers) 정보 가져오기
  ===============================
  - TMDb API: /movie/{movie_id}/watch/providers
  - 한국(KR) 기준으로 "flatrate"(정액제), "rent"(대여), "buy"(구매) 목록이 들어옴
*/
async function getWatchProviders(movieId) {
  try {
    const providerUrl = `https://api.themoviedb.org/3/movie/${movieId}/watch/providers?api_key=${API_KEY}`;
    const res = await fetch(providerUrl);
    const data = await res.json();

    // data.results에 국가별 정보가 있음. KR만 뽑아내 보자.
    if (data.results && data.results.KR) {
      return data.results.KR;  // { flatrate: [...], rent: [...], buy: [...], link: "..." }
    } else {
      return null;
    }
  } catch (err) {
    console.error("Watch Providers API 호출 중 오류:", err);
    return null;
  }
}

/*
  ===============================
  5) 화면에 영화 상세 정보 표시
  ===============================
  - 포스터, 장르(문자), 러닝타임(분), 평점, 줄거리
  - OTT 정보 (넷플릭스, 디즈니+, 왓챠 등)
*/
async function displayMovie(movie) {
  // 포스터 경로 처리
  const posterUrl = movie.poster_path
    ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
    : "https://via.placeholder.com/200x300.png?text=No+Image";

  // 포스터 영역에 삽입
  document.getElementById("moviePoster").innerHTML = `
    <img src="${posterUrl}" width="200" alt="포스터">
  `;

  // 장르(문자 배열)
  const genreArray = movie.genres || [];  // [{id:28, name:"액션"}, ...]
  const genreNames = genreArray.map(g => g.name); // ["액션", "모험", ...]

  // 러닝타임
  const runtime = movie.runtime
    ? `${movie.runtime}분`
    : "러닝타임 정보 없음";

  // 기본 정보들
  const title = movie.title || "제목 없음";
  const releaseDate = movie.release_date || "개봉일 정보 없음";
  const overview = movie.overview || "줄거리 정보가 없습니다.";
  const voteAverage = movie.vote_average
    ? `${movie.vote_average} (TMDb)`
    : "평점 정보 없음";

  // (신규) Watch Providers API 호출 → OTT 정보
  const watchProviders = await getWatchProviders(movie.id);

  // flatrate(정액제), rent(대여), buy(구매) 각 배열에서 provider_name 추출
  let ottInfoHTML = "플랫폼 정보가 없습니다.";

  if (watchProviders) {
    // 구독형
    let flatrateNames = [];
    if (watchProviders.flatrate) {
      flatrateNames = watchProviders.flatrate.map(item => item.provider_name);
    }

    // 대여형
    let rentNames = [];
    if (watchProviders.rent) {
      rentNames = watchProviders.rent.map(item => item.provider_name);
    }

    // 구매형
    let buyNames = [];
    if (watchProviders.buy) {
      buyNames = watchProviders.buy.map(item => item.provider_name);
    }

    // 만약 3가지가 전부 비어있다면, OTT 정보가 없는 것
    if (
      flatrateNames.length === 0 &&
      rentNames.length === 0 &&
      buyNames.length === 0
    ) {
      ottInfoHTML = "해당 국가에서 제공 중인 OTT 정보가 없습니다.";
    } else {
      // 정보를 HTML 문자열로 구성
      const flatrateText = flatrateNames.length
        ? `정액제: ${flatrateNames.join(", ")}`
        : "";
      const rentText = rentNames.length
        ? `대여: ${rentNames.join(", ")}`
        : "";
      const buyText = buyNames.length
        ? `구매: ${buyNames.join(", ")}`
        : "";

      // 줄바꿈으로 구분
      ottInfoHTML = [flatrateText, rentText, buyText]
        .filter(x => x)       // 빈 문자열 제거
        .join("<br>");        // <br>로 구분
    }
  }

  // HTML로 출력
  document.getElementById("movieDetails").innerHTML = `
    <h2>${title}</h2>
    <p><strong>장르:</strong> ${genreNames.join(", ")}</p>
    <p><strong>개봉일:</strong> ${releaseDate}</p>
    <p><strong>러닝타임:</strong> ${runtime}</p>
    <p><strong>평점:</strong> ${voteAverage}</p>
    <p><strong>줄거리:</strong> ${overview}</p>
    <hr>
    <p><strong>OTT/플랫폼 정보:</strong><br>${ottInfoHTML}</p>
  `;
}

/*
  ===============================
  6) 유사한 영화 가져오기
  ===============================
  - TMDb /movie/{movie_id}/similar
  - 최대 5개 정도 카드 형태로 보여주기
*/
async function getSimilarMovies(movieId) {
  try {
    const similarUrl = `https://api.themoviedb.org/3/movie/${movieId}/similar?api_key=${API_KEY}&language=ko-KR&page=1`;
    const res = await fetch(similarUrl);
    const data = await res.json();

    displaySimilarMovies(data.results);
  } catch (error) {
    console.error("유사한 영화를 가져오는 중 오류 발생:", error);
  }
}

/*
  ===============================
  7) 유사한 영화들 화면에 표시
  ===============================
*/
function displaySimilarMovies(similarMovies) {
  const container = document.getElementById("similarMovies");
  container.innerHTML = "<h3>유사한 영화</h3>";

  // 5개만 표시
  const limited = similarMovies.slice(0, 5);

  limited.forEach(movie => {
    const posterUrl = movie.poster_path
      ? `https://image.tmdb.org/t/p/w200${movie.poster_path}`
      : "https://via.placeholder.com/200x300.png?text=No+Image";
    const title = movie.title || "제목 없음";

    const card = document.createElement("div");
    card.style.borderRadius = "8px";
    card.style.padding = "10px";
    card.style.textAlign = "center";

    card.innerHTML = `
      <img src="${posterUrl}" width="100" alt="poster"><br>
      <p>${title}</p>
    `;
    container.appendChild(card);
  });
}
