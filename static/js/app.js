"use strict";

const $ = (sel, ctx) => (ctx || document).querySelector(sel);
const $$ = (sel, ctx) => Array.from((ctx || document).querySelectorAll(sel));

const content = $("#content");
const topbarTitle = $("#topbar-title");
const btnBack = $("#btn-back");
const btnRefresh = $("#btn-refresh");
const toastEl = $("#toast");

let toastTimer = 0;

function showToast(msg) {
  toastEl.textContent = msg;
  toastEl.classList.remove("hidden");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.add("hidden"), 2000);
}

async function api(path) {
  const res = await fetch(path);
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `HTTP ${res.status}`);
  }
  return res.json();
}

function encode(s) { return encodeURIComponent(s); }

/* Router */

let currentView = null;
let currentParams = null;

function navigate(hash) {
  location.hash = hash;
}

function onRoute() {
  const raw = location.hash.replace(/^#\/?/, "");
  const parts = raw.split("/").filter(Boolean);

  if (parts.length === 0) {
    showComicGrid();
    return;
  }

  if (parts[0] === "comic" && parts.length >= 2) {
    const comicName = decodeURIComponent(parts[1]);
    const versionName = parts.length >= 3 ? decodeURIComponent(parts[2]) : null;
    const chapterName = parts.length >= 4 ? decodeURIComponent(parts[3]) : null;

    if (chapterName) {
      showReader(comicName, versionName, chapterName);
    } else if (versionName) {
      showChapterList(comicName, versionName);
    } else {
      showVersionList(comicName);
    }
    return;
  }

  showComicGrid();
}

window.addEventListener("hashchange", onRoute);

/* Back button */
btnBack.addEventListener("click", () => {
  const raw = location.hash.replace(/^#\/?/, "");
  const parts = raw.split("/").filter(Boolean);
  if (parts.length >= 4) {
    navigate(`/comic/${parts[1]}/${parts[2]}`);
  } else if (parts.length >= 3) {
    navigate("/comic/" + parts[1]);
  } else {
    navigate("/");
  }
});

/* Refresh */
btnRefresh.addEventListener("click", async () => {
  try {
    btnRefresh.style.transform = "rotate(360deg)";
    btnRefresh.style.transition = "transform .5s";
    await fetch("/api/refresh", { method: "POST" });
    showToast("Catalog refreshed");
    if (currentView) currentView(currentParams);
  } catch (e) {
    showToast("Refresh failed: " + e.message);
  } finally {
    btnRefresh.style.transform = "";
  }
});

/* Comic Grid */

async function showComicGrid() {
  currentView = showComicGrid;
  currentParams = null;
  topbarTitle.textContent = "ComicView";
  btnBack.style.visibility = "hidden";
  content.innerHTML = '<div class="loading">Loading...</div>';

  let data;
  try {
    data = await api("/api/comics");
  } catch (e) {
    content.innerHTML = `<div class="error">Failed to load: ${e.message}</div>`;
    return;
  }

  if (data.length === 0) {
    content.innerHTML = '<div class="empty"><div class="empty-icon">📚</div><p>No comics found</p></div>';
    return;
  }

  let html = '<div class="comic-grid">';
  for (const c of data) {
    const coverHtml = c.has_cover
      ? `<img loading="lazy" src="/api/cover/${encode(c.name)}" alt="">`
      : `<span class="placeholder">${escHtml(c.name)}</span>`;
    html += `
      <a class="comic-card" href="#/comic/${encode(c.name)}" data-comic="${escAttr(c.name)}">
        <div class="cover-wrap">${coverHtml}</div>
        <div class="card-title">${escHtml(c.name)}</div>
      </a>`;
  }
  html += "</div>";
  content.innerHTML = html;
}

/* Version List */

async function showVersionList(comicName) {
  currentView = showVersionList;
  currentParams = comicName;
  topbarTitle.textContent = comicName;
  btnBack.style.visibility = "visible";
  content.innerHTML = '<div class="loading">Loading...</div>';

  let versions;
  try {
    versions = await api(`/api/comics/${encode(comicName)}/versions`);
  } catch (e) {
    content.innerHTML = `<div class="error">Failed to load: ${e.message}</div>`;
    return;
  }

  const hasCover = await checkCover(comicName);
  let html = '<div class="version-list">';
  html += '<div class="comic-info">';
  html += '<div class="cover-preview">';
  if (hasCover) {
    html += `<img src="/api/cover/${encode(comicName)}" alt="">`;
  } else {
    html += `<span class="placeholder">${escHtml(comicName)}</span>`;
  }
  html += '</div>';
  html += '<div class="comic-meta">';
  html += `<h2>${escHtml(comicName)}</h2>`;
  html += `<span class="stat">${versions.length} version(s)</span>`;
  html += '</div></div>';

  for (const v of versions) {
    html += `
      <a class="version-card" href="#/comic/${encode(comicName)}/${encode(v.name)}">
        <span class="ver-icon">📖</span>
        <span class="ver-info">
          <span class="ver-name">${escHtml(v.name)}</span>
          <span class="ver-count">${v.chapter_count} chapter(s)</span>
        </span>
        <span class="ver-arrow">›</span>
      </a>`;
  }
  html += "</div>";
  content.innerHTML = html;
}

async function checkCover(comicName) {
  try {
    const res = await fetch(`/api/cover/${encode(comicName)}`);
    return res.ok;
  } catch (e) {
    return false;
  }
}

/* Chapter List */

async function showChapterList(comicName, versionName) {
  currentView = showChapterList;
  currentParams = { comicName, versionName };
  topbarTitle.textContent = versionName;
  btnBack.style.visibility = "visible";
  content.innerHTML = '<div class="loading">Loading...</div>';

  let chapters;
  try {
    chapters = await api(`/api/comics/${encode(comicName)}/versions/${encode(versionName)}/chapters`);
  } catch (e) {
    content.innerHTML = `<div class="error">Failed to load: ${e.message}</div>`;
    return;
  }

  let html = `<div class="chapter-list-header">${chapters.length} chapter(s)</div>`;
  html += '<div class="chapter-list">';
  for (const ch of chapters) {
    html += `
      <a class="chapter-row" href="#/comic/${encode(comicName)}/${encode(versionName)}/${encode(ch.name)}">
        <span class="ch-name">${escHtml(ch.name)}</span>
        <span class="ch-count">${ch.image_count} pages</span>
      </a>`;
  }
  html += "</div>";
  content.innerHTML = html;
}

/* Reader */

let readerMode = "scroll";

async function showReader(comicName, versionName, chapterName) {
  currentView = showReader;
  currentParams = { comicName, versionName, chapterName };
  topbarTitle.textContent = chapterName;
  btnBack.style.visibility = "visible";
  content.innerHTML = '<div class="loading">Loading...</div>';

  let data;
  try {
    data = await api(
      `/api/comics/${encode(comicName)}/versions/${encode(versionName)}/chapters/${encode(chapterName)}/images`
    );
  } catch (e) {
    content.innerHTML = `<div class="error">Failed to load: ${e.message}</div>`;
    return;
  }

  renderReader(comicName, versionName, chapterName, data);
}

function renderReader(comicName, versionName, chapterName, data) {
  const baseUrl = `/api/image/${encode(comicName)}/${encode(versionName)}/${encode(chapterName)}/`;

  let html = '<div class="reader-toolbar">';
  html += `<span class="ch-title">${escHtml(chapterName)}</span>`;
  html += `<span>${data.images.length} pages</span>`;
  html += `<button id="btn-mode">${readerMode === "scroll" ? "Scroll" : "Single"}</button>`;
  html += "</div>";

  html += '<div class="reader-images" id="reader-container">';
  for (const img of data.images) {
    html += `<img loading="lazy" src="${baseUrl}${encode(img)}" data-src="${baseUrl}${encode(img)}" alt="${escAttr(img)}">`;
  }
  html += "</div>";

  html += '<div class="chapter-nav">';
  if (data.prev_chapter) {
    html += `<button class="btn-prev-ch" data-ch="${escAttr(data.prev_chapter)}">← ${escHtml(data.prev_chapter)}</button>`;
  }
  if (data.next_chapter) {
    html += `<button class="btn-next-ch" data-ch="${escAttr(data.next_chapter)}">${escHtml(data.next_chapter)} →</button>`;
  }
  html += "</div>";

  content.innerHTML = html;

  // Mode toggle
  const btnMode = $("#btn-mode");
  const readerContainer = $("#reader-container");

  btnMode.addEventListener("click", () => {
    readerMode = readerMode === "scroll" ? "single" : "scroll";
    btnMode.textContent = readerMode === "scroll" ? "Scroll" : "Single";
    applyReaderMode(readerContainer, data.images, baseUrl);
  });

  // Chapter navigation
  $(".btn-prev-ch")?.addEventListener("click", () => {
    navigate(`/comic/${encode(comicName)}/${encode(versionName)}/${encode(data.prev_chapter)}`);
  });
  $(".btn-next-ch")?.addEventListener("click", () => {
    navigate(`/comic/${encode(comicName)}/${encode(versionName)}/${encode(data.next_chapter)}`);
  });

  applyReaderMode(readerContainer, data.images, baseUrl);
  setupKeyboard(comicName, versionName, data);
  prefetchNext(comicName, versionName, data);
}

let singleIdx = 0;
let singleImages = [];
let singleBaseUrl = "";

function applyReaderMode(container, images, baseUrl) {
  if (readerMode === "single") {
    singleImages = images;
    singleBaseUrl = baseUrl;
    singleIdx = 0;
    renderSinglePage(container);
  } else {
    container.className = "reader-images";
    container.innerHTML = images
      .map((img) => `<img loading="lazy" src="${baseUrl}${encode(img)}" alt="">`)
      .join("");
  }
}

function renderSinglePage(container) {
  container.className = "reader-single";
  container.innerHTML = `
    <div class="touch-zone left"></div>
    <img src="${singleBaseUrl}${encode(singleImages[singleIdx])}" alt="">
    <div class="touch-zone right"></div>
    <span style="position:absolute;bottom:8px;right:12px;font-size:.8rem;color:var(--text-muted);background:rgba(0,0,0,.6);padding:2px 8px;border-radius:10px;">${singleIdx + 1} / ${singleImages.length}</span>
  `;
  container.querySelector(".touch-zone.left").addEventListener("click", () => {
    if (singleIdx > 0) { singleIdx--; renderSinglePage(container); }
  });
  container.querySelector(".touch-zone.right").addEventListener("click", () => {
    if (singleIdx < singleImages.length - 1) { singleIdx++; renderSinglePage(container); }
  });
}

function setupKeyboard(comicName, versionName, data) {
  const handler = (e) => {
    if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;

    if (readerMode === "single") {
      if (e.key === "ArrowRight" || e.key === "d") {
        e.preventDefault();
        if (singleIdx < singleImages.length - 1) {
          singleIdx++;
          renderSinglePage($("#reader-container"));
        }
      } else if (e.key === "ArrowLeft" || e.key === "a") {
        e.preventDefault();
        if (singleIdx > 0) {
          singleIdx--;
          renderSinglePage($("#reader-container"));
        }
      }
    }

    if (e.key === "[" || e.key === "p") {
      e.preventDefault();
      if (data.prev_chapter) {
        navigate(`/comic/${encode(comicName)}/${encode(versionName)}/${encode(data.prev_chapter)}`);
      }
    } else if (e.key === "]" || e.key === "n") {
      e.preventDefault();
      if (data.next_chapter) {
        navigate(`/comic/${encode(comicName)}/${encode(versionName)}/${encode(data.next_chapter)}`);
      }
    } else if (e.key === "f") {
      e.preventDefault();
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        document.documentElement.requestFullscreen();
      }
    }
  };

  document.addEventListener("keydown", handler);
  // Clean up on next navigation
  const cleanup = () => {
    document.removeEventListener("keydown", handler);
    window.removeEventListener("hashchange", cleanup);
  };
  window.addEventListener("hashchange", cleanup, { once: true });
}

function prefetchNext(comicName, versionName, data) {
  if (!data.next_chapter) return;
  const nextCh = data.next_chapter;
  api(
    `/api/comics/${encode(comicName)}/versions/${encode(versionName)}/chapters/${encode(nextCh)}/images`
  ).then((nextData) => {
    const base = `/api/image/${encode(comicName)}/${encode(versionName)}/${encode(nextCh)}/`;
    const limit = Math.min(3, nextData.images.length);
    for (let i = 0; i < limit; i++) {
      const link = document.createElement("link");
      link.rel = "prefetch";
      link.as = "image";
      link.href = base + encode(nextData.images[i]);
      document.head.appendChild(link);
    }
  }).catch(() => {});
}

function escHtml(s) {
  const div = document.createElement("div");
  div.textContent = s;
  return div.innerHTML;
}

function escAttr(s) {
  return s.replace(/"/g, "&quot;").replace(/&/g, "&amp;").replace(/</g, "&lt;");
}

/* Init */
onRoute();
