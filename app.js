const stage = document.querySelector(".stage");
const statusMessage = document.querySelector(".media-status");
const videos = [...document.querySelectorAll("video[data-video]")];
const hotspotVideos = [...document.querySelectorAll(".hotspot-video")];
const hotspotLabels = [...document.querySelectorAll(".hotspot-label[data-video]")];
const hotspotLabelAnchors = {
  contact: { x: 0.17, y: 0.41 },
  agenda: { x: 0.75, y: 0.19 },
  "dj-sets": { x: 0.435, y: 0.23 }
};

document.addEventListener("dragstart", (event) => {
  if (event.target instanceof HTMLImageElement) event.preventDefault();
});

hotspotLabels.forEach((label, index) => {
  const angle = Math.random() * 16 - 8;
  const phase = (index * 0.2) / hotspotLabels.length;
  label.style.setProperty("--hotspot-angle", `${angle.toFixed(1)}deg`);
  label.style.animationDelay = `${(-phase).toFixed(3)}s`;
});

function addVideoFilters() {
  const filterSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  filterSvg.setAttribute("aria-hidden", "true");
  filterSvg.setAttribute("focusable", "false");

  const definitions = document.createElement("div");
  definitions.className = "video-filter-definitions";
  definitions.append(filterSvg);

  const filter = document.createElementNS("http://www.w3.org/2000/svg", "filter");
  filter.id = "video-gamma-filter";
  filter.setAttribute("color-interpolation-filters", "sRGB");

  const transfer = document.createElementNS("http://www.w3.org/2000/svg", "feComponentTransfer");
  for (const channel of ["R", "G", "B"]) {
    const gammaFunction = document.createElementNS("http://www.w3.org/2000/svg", `feFunc${channel}`);
    gammaFunction.setAttribute("type", "gamma");
    gammaFunction.setAttribute("amplitude", "1");
    gammaFunction.setAttribute("offset", "0");
    gammaFunction.setAttribute("exponent", "1");
    transfer.append(gammaFunction);
  }

  filter.append(transfer);
  filterSvg.append(filter);

  const posterizeFilter = document.createElementNS("http://www.w3.org/2000/svg", "filter");
  posterizeFilter.id = "site-posterize-filter";
  posterizeFilter.setAttribute("color-interpolation-filters", "sRGB");

  const posterizeTransfer = document.createElementNS("http://www.w3.org/2000/svg", "feComponentTransfer");
  for (const channel of ["R", "G", "B"]) {
    const posterizeFunction = document.createElementNS("http://www.w3.org/2000/svg", `feFunc${channel}`);
    posterizeFunction.setAttribute("type", "discrete");
    posterizeFunction.setAttribute("tableValues", "0 0.16 0.32 0.52 0.76 1");
    posterizeTransfer.append(posterizeFunction);
  }

  posterizeFilter.append(posterizeTransfer);
  filterSvg.append(posterizeFilter);
  document.body.append(definitions);
}

addVideoFilters();

function addScrollingCamouflage() {
  if (!stage) return () => {};

  const camouflage = document.createElement("div");
  camouflage.className = "stage-camouflage";
  camouflage.setAttribute("aria-hidden", "true");
  stage.prepend(camouflage);

  let previousColumns = 0;
  let previousRows = 0;
  let previousOrientation = "";
  function layoutCamouflage(horizontal) {
    const tileWidth = horizontal ? 464 : 240;
    const tileHeight = horizontal ? 240 : 464;
    const loopDistance = tileHeight * 2;
    const columns = Math.ceil(stage.clientWidth / tileWidth) + 1;
    const rows = Math.ceil((stage.clientHeight + loopDistance * 2) / tileHeight);
    const orientation = horizontal ? "horizontal" : "vertical";
    if (columns === previousColumns && rows === previousRows && orientation === previousOrientation) return;
    previousColumns = columns;
    previousRows = rows;
    previousOrientation = orientation;

    camouflage.style.setProperty("--camo-loop-distance", `${loopDistance}px`);
    camouflage.style.top = `-${loopDistance}px`;
    camouflage.style.width = `${columns * tileWidth}px`;
    camouflage.style.height = `${rows * tileHeight}px`;
    camouflage.style.gridTemplateColumns = `repeat(${columns}, ${tileWidth}px)`;
    camouflage.style.gridAutoRows = `${tileHeight}px`;
    camouflage.replaceChildren();

    for (let row = 0; row < rows; row += 1) {
      for (let column = 0; column < columns; column += 1) {
        const tile = document.createElement("div");
        tile.className = "stage-camouflage__tile";
        tile.style.transform = `scale(${column % 2 ? -1 : 1}, ${row % 2 ? -1 : 1})`;
        camouflage.append(tile);
      }
    }
  }

  return layoutCamouflage;
}

const layoutCamouflage = addScrollingCamouflage();

function addScrollingEdgeText() {
  if (!stage) return null;

  const ticker = document.createElement("div");
  ticker.className = "stage-edge-text";
  ticker.setAttribute("aria-hidden", "true");

  for (const edge of ["left", "right", "top", "bottom"]) {
    const lane = document.createElement("div");
    lane.className = `stage-edge-text__lane stage-edge-text__lane--${edge}`;

    const track = document.createElement("div");
    track.className = "stage-edge-text__track";
    for (let copyIndex = 0; copyIndex < 3; copyIndex += 1) {
      const copy = document.createElement("span");
      copy.className = "stage-edge-text__copy";
      copy.textContent = "krapularchive.fr";
      track.append(copy);
    }

    lane.append(track);
    ticker.append(lane);
  }

  stage.prepend(ticker);
  return ticker;
}

const edgeText = addScrollingEdgeText();

function updateStageDecorations() {
  if (!stage) return;

  const stageWidth = stage.clientWidth;
  const stageHeight = stage.clientHeight;
  if (!stageWidth || !stageHeight) return;

  const visibleVideo = videos.find((video) =>
    video.videoWidth &&
    video.videoHeight &&
    (!video.classList.contains("hotspot-video") || video.classList.contains("is-active"))
  );
  const videoAspectRatio = visibleVideo
    ? visibleVideo.videoWidth / visibleVideo.videoHeight
    : 1904 / 1440;
  const stageAspectRatio = stageWidth / stageHeight;
  const videoWidth = videoAspectRatio > stageAspectRatio ? stageWidth : stageHeight * videoAspectRatio;
  const videoHeight = videoAspectRatio > stageAspectRatio ? stageWidth / videoAspectRatio : stageHeight;
  const videoLeft = (stageWidth - videoWidth) / 2;
  const videoTop = (stageHeight - videoHeight) / 2;
  const sideGap = Math.max(0, (stageWidth - videoWidth) / 2);
  const topGap = Math.max(0, (stageHeight - videoHeight) / 2);
  const horizontalLayout = topGap >= 16 && topGap >= sideGap;
  const bottomGap = Math.max(0, stageHeight - videoTop - videoHeight);
  const frameHorizontal = topGap > sideGap && topGap > 0;
  const textHorizontal = topGap >= sideGap && topGap > 0;
  const textSpace = textHorizontal ? Math.min(topGap, bottomGap) : sideGap;
  const textSize = Math.min(stageWidth <= 640 ? 30 : 72, Math.max(12, textSpace * 0.48));
  const textStroke = Math.min(9, textSize * 0.12);
  const textInset = Math.min(
    textSpace / 2,
    Math.max(textSize / 2 + textStroke + textSpace * 0.08, textSpace * 0.25)
  );
  const frameLeftOverlap = videoHeight * (54 / 1080) + 2;
  const frameRightOverlap = videoHeight * (25 / 1080) + 2;
  const frameTopOverlap = topGap * (54 / 275) + 2;
  const frameBottomOverlap = bottomGap * (25 / 267) + 2;

  stage.dataset.archiveLayout = horizontalLayout ? "horizontal" : "vertical";
  stage.dataset.frameLayout = frameHorizontal ? "horizontal" : "vertical";
  stage.style.setProperty("--video-top", `${videoTop}px`);
  stage.style.setProperty("--video-left", `${videoLeft}px`);
  stage.style.setProperty("--video-width", `${videoWidth}px`);
  stage.style.setProperty("--video-right-gap", `${Math.max(0, stageWidth - videoLeft - videoWidth)}px`);
  stage.style.setProperty("--video-height", `${videoHeight}px`);
  stage.style.setProperty("--video-bottom-gap", `${bottomGap}px`);
  stage.style.setProperty("--frame-left-overlap", `${frameLeftOverlap}px`);
  stage.style.setProperty("--frame-right-overlap", `${frameRightOverlap}px`);
  const sideFrameWidths = frameHorizontal || sideGap === 0
    ? [0, 0]
    : [videoHeight * (329 / 1080), videoHeight * (292 / 1080)];
  stage.style.setProperty("--frame-left-width", `${sideFrameWidths[0]}px`);
  stage.style.setProperty("--frame-right-width", `${sideFrameWidths[1]}px`);
  stage.style.setProperty("--frame-band-top-size", `${topGap + frameTopOverlap}px`);
  stage.style.setProperty("--frame-band-bottom-size", `${bottomGap + frameBottomOverlap}px`);
  stage.style.setProperty("--frame-band-top", `${(topGap + frameTopOverlap) / 2}px`);
  stage.style.setProperty("--frame-band-bottom", `${videoTop + videoHeight + (bottomGap - frameBottomOverlap) / 2}px`);
  if (edgeText) {
    edgeText.dataset.layout = textHorizontal ? "horizontal" : "vertical";
    edgeText.hidden = textSpace < 15;
    edgeText.style.setProperty("--edge-text-size", `${textSize}px`);
    edgeText.style.setProperty("--edge-text-stroke", `${textStroke}px`);
    edgeText.style.setProperty("--edge-text-inset", `${textInset}px`);
    if (!edgeText.hidden) {
      const activeLane = edgeText.querySelector(
        textHorizontal ? ".stage-edge-text__lane--top" : ".stage-edge-text__lane--left"
      );
      const measureCopy = activeLane.querySelector(".stage-edge-text__copy");
      measureCopy.textContent = "krapularchive.fr";
      const phraseWidth = measureCopy.offsetWidth;
      const tickerLength = textHorizontal ? videoWidth : videoHeight;
      const repeatCount = Math.ceil(tickerLength / phraseWidth) + 1;
      const repeatedText = Array(repeatCount).fill("krapularchive.fr").join("  ") + "  ";
      for (const copy of edgeText.querySelectorAll(".stage-edge-text__copy")) copy.textContent = repeatedText;
    }
  }

  for (const label of hotspotLabels) {
    const anchor = hotspotLabelAnchors[label.dataset.video];
    if (!anchor) continue;
    label.style.left = `${videoLeft + videoWidth * anchor.x}px`;
    const verticalOffset = label.dataset.video === "contact" ? 110 : 80;
    label.style.top = `${videoTop + videoHeight * anchor.y + verticalOffset}px`;
  }

  layoutCamouflage(horizontalLayout);
}

updateStageDecorations();
window.addEventListener("resize", updateStageDecorations);
for (const video of videos) {
  video.addEventListener("loadedmetadata", updateStageDecorations);
}

if (stage && window.ResizeObserver) {
  new ResizeObserver(updateStageDecorations).observe(stage);
}

function showStatus(message) {
  if (!statusMessage) return;
  statusMessage.textContent = message;
  statusMessage.hidden = false;
}

let hoverAudioContext;
let audioSupportMessageShown = false;
let hoveredLink;

function canPlayHoverSoundOn(link) {
  if (!link) return false;
  if (document.body.dataset.page === "home") return link.matches(".hotspot-label");
  return document.body.dataset.page === "contact" && link.matches(".phone-menu__contact");
}

function unlockHoverAudio() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) {
    if (!audioSupportMessageShown) {
      showStatus("Le navigateur ne prend pas en charge les effets sonores.");
      audioSupportMessageShown = true;
    }
    return;
  }

  try {
    hoverAudioContext ??= new AudioContextClass();
    if (hoverAudioContext.state === "suspended") {
      return hoverAudioContext.resume()
        .then(() => hoverAudioContext.state === "running")
        .catch(() => {
          showStatus("Le navigateur bloque les effets sonores. Clique ou appuie sur une touche pour les activer.");
          return false;
        });
    }
    return Promise.resolve(true);
  } catch {
    showStatus("Impossible d’activer les effets sonores dans ce navigateur.");
    return Promise.resolve(false);
  }
}

function playHoverSound() {
  if (!hoverAudioContext || hoverAudioContext.state !== "running") return;

  const now = hoverAudioContext.currentTime;
  const isContactPage = document.body.dataset.page === "contact";
  const volumeScale = isContactPage ? 0.35 : 1;
  const shaper = hoverAudioContext.createWaveShaper();
  const curve = new Float32Array(256);

  for (let index = 0; index < curve.length; index += 1) {
    const sample = (index * 2) / (curve.length - 1) - 1;
    curve[index] = Math.tanh(sample * 4);
  }

  shaper.curve = curve;
  shaper.oversample = "2x";

  const output = hoverAudioContext.createGain();
  output.gain.setValueAtTime(0.55 * volumeScale, now);
  output.connect(hoverAudioContext.destination);
  shaper.connect(output);

  const lowTone = hoverAudioContext.createOscillator();
  const lowVolume = hoverAudioContext.createGain();
  lowTone.type = "sawtooth";
  lowTone.frequency.setValueAtTime(480, now);
  lowTone.frequency.exponentialRampToValueAtTime(170, now + 0.085);
  lowVolume.gain.setValueAtTime(0.0001, now);
  lowVolume.gain.exponentialRampToValueAtTime(0.095 * volumeScale, now + 0.004);
  lowVolume.gain.exponentialRampToValueAtTime(0.0001, now + 0.09);
  lowTone.connect(lowVolume);
  lowVolume.connect(shaper);
  lowTone.start(now);
  lowTone.stop(now + 0.095);

  const highTone = hoverAudioContext.createOscillator();
  const highVolume = hoverAudioContext.createGain();
  highTone.type = "square";
  highTone.frequency.setValueAtTime(1480, now + 0.008);
  highTone.frequency.exponentialRampToValueAtTime(710, now + 0.062);
  highVolume.gain.setValueAtTime(0.0001, now + 0.008);
  highVolume.gain.exponentialRampToValueAtTime(0.028 * volumeScale, now + 0.014);
  highVolume.gain.exponentialRampToValueAtTime(0.0001, now + 0.068);
  highTone.connect(highVolume);
  highVolume.connect(shaper);
  highTone.start(now + 0.008);
  highTone.stop(now + 0.072);

}

function playNavigationClickSound() {
  if (!hoverAudioContext || hoverAudioContext.state !== "running") return;

  const now = hoverAudioContext.currentTime;
  const click = hoverAudioContext.createOscillator();
  const volume = hoverAudioContext.createGain();
  click.type = "square";
  click.frequency.setValueAtTime(980, now);
  click.frequency.exponentialRampToValueAtTime(210, now + 0.035);
  volume.gain.setValueAtTime(0.0001, now);
  volume.gain.exponentialRampToValueAtTime(0.045, now + 0.002);
  volume.gain.exponentialRampToValueAtTime(0.0001, now + 0.04);
  click.connect(volume);
  volume.connect(hoverAudioContext.destination);
  click.start(now);
  click.stop(now + 0.042);
}

function playLinkHoverSound(link) {
  if (document.body.dataset.page === "home" && link.matches(".hotspot-label")) {
    playNavigationClickSound();
    return;
  }
  if (document.body.dataset.page !== "home") playHoverSound();
}

document.addEventListener("pointerdown", (event) => {
  const link = event.target instanceof Element ? event.target.closest("a[href], button") : null;
  if (link && canPlayHoverSoundOn(link) && link === hoveredLink && hoverAudioContext?.state !== "running") {
    unlockHoverAudio().then((ready) => {
      if (ready && hoverAudioContext.state === "running") playLinkHoverSound(link);
    });
    return;
  }
  unlockHoverAudio();
}, true);
document.addEventListener("keydown", () => {
  unlockHoverAudio();
}, true);
document.addEventListener("pointerover", (event) => {
  const link = event.target instanceof Element ? event.target.closest("a[href], button") : null;
  if (!canPlayHoverSoundOn(link) || link === hoveredLink) return;
  hoveredLink = link;
  if (hoverAudioContext?.state === "running") {
    playLinkHoverSound(link);
  } else {
    unlockHoverAudio().then((ready) => {
      if (ready && hoveredLink === link) playLinkHoverSound(link);
    });
  }
}, true);
document.addEventListener("pointerout", (event) => {
  if (!(event.target instanceof Element)) return;
  const link = event.target.closest("a[href], button");
  const remainsInsideLink = event.relatedTarget instanceof Node && link?.contains(event.relatedTarget);
  if (link === hoveredLink && !remainsInsideLink) {
    hoveredLink = null;
  }
}, true);

for (const video of videos) {
  video.addEventListener("error", () => {
    showStatus(`Impossible de lire « ${video.dataset.video} ». Vérifie que le fichier vidéo est présent dans le dossier vidéos et que son format est compatible avec ce navigateur.`);
  });

  const playback = video.play();
  if (playback) {
    playback.catch(() => {
      showStatus("La lecture automatique a été bloquée. Autorise la lecture vidéo dans ton navigateur, puis recharge la page.");
    });
  }
}

const lobby = document.querySelector(".lobby-video");

if (stage && lobby && hotspotVideos.length) {
  const pixelContexts = new Map(
    hotspotVideos.map((video) => {
      const canvas = document.createElement("canvas");
      canvas.width = 1;
      canvas.height = 1;
      return [video, canvas.getContext("2d", { willReadFrequently: true })];
    })
  );
  const alphaContexts = new Map(
    hotspotVideos.map((video) => {
      const canvas = document.createElement("canvas");
      canvas.width = 64;
      canvas.height = 64;
      return [video, canvas.getContext("2d", { willReadFrequently: true })];
    })
  );
  let activeVideo = null;
  let animationFrame = 0;

  function updateVideoTransparency(video) {
    if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return;

    const context = alphaContexts.get(video);
    if (!context) {
      showStatus("Impossible de vérifier la transparence d'une vidéo dans ce navigateur.");
      return;
    }

    try {
      context.clearRect(0, 0, 64, 64);
      context.drawImage(video, 0, 0, 64, 64);
      const pixels = context.getImageData(0, 0, 64, 64).data;
      let hasTransparency = false;
      for (let index = 3; index < pixels.length; index += 4) {
        if (pixels[index] < 250) {
          hasTransparency = true;
          break;
        }
      }
      video.classList.toggle("has-black-matte", !hasTransparency);
    } catch {
      showStatus("Impossible de vérifier la transparence des vidéos. Vérifie que le site est servi depuis la même origine et que le navigateur autorise l’accès aux pixels.");
    }
  }

  for (const video of hotspotVideos) {
    video.classList.add("has-black-matte");
    video.addEventListener("loadeddata", () => updateVideoTransparency(video));
    updateVideoTransparency(video);
  }

  function syncMatchedHotspotState(video) {
    for (const label of hotspotLabels) {
      const isCurrent = !!video && label.dataset.video === video.dataset.video;
      label.classList.toggle("is-active", isCurrent);
      label.classList.toggle("is-hovered", isCurrent);
    }
  }

  function getVideoPixel(video, clientX, clientY) {
    if (!video.videoWidth || !video.videoHeight || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
      return false;
    }

    const bounds = stage.getBoundingClientRect();
    const scale = Math.min(bounds.width / video.videoWidth, bounds.height / video.videoHeight);
    const imageWidth = video.videoWidth * scale;
    const imageHeight = video.videoHeight * scale;
    const imageLeft = bounds.left + (bounds.width - imageWidth) / 2;
    const imageTop = bounds.top + (bounds.height - imageHeight) / 2;
    const x = Math.floor((clientX - imageLeft) / scale);
    const y = Math.floor((clientY - imageTop) / scale);

    if (x < 0 || y < 0 || x >= video.videoWidth || y >= video.videoHeight) {
      return false;
    }

    const context = pixelContexts.get(video);
    if (!context) {
      showStatus("Impossible d'analyser les zones visibles des vidéos de survol dans ce navigateur.");
      return false;
    }

    try {
      context.clearRect(0, 0, 1, 1);
      context.drawImage(video, x, y, 1, 1, 0, 0, 1, 1);
      const pixel = context.getImageData(0, 0, 1, 1).data;
      return video.classList.contains("has-black-matte")
        ? pixel[0] + pixel[1] + pixel[2] > 48
        : pixel[3] > 16;
    } catch {
      showStatus("Impossible de lire les pixels des vidéos de survol. Vérifie que les fichiers sont servis depuis le même site et que le navigateur autorise leur lecture.");
      return false;
    }
  }

  function setActiveVideo(video) {
    if (activeVideo === video) return;
    activeVideo?.classList.remove("is-active");
    activeVideo = video;
    activeVideo?.classList.add("is-active");
    syncMatchedHotspotState(activeVideo);
    stage.style.cursor = activeVideo ? "pointer" : "";
    updateStageDecorations();
    if (activeVideo) {
      const playback = activeVideo.play();
      if (playback) {
        playback.catch(() => {
          if (activeVideo === video) {
            showStatus(`La lecture de « ${video.dataset.video} » est bloquée. Autorise la lecture vidéo dans ton navigateur, puis recharge la page.`);
          }
        });
      }
      if (document.body.dataset.page !== "home") playHoverSound();
    }
  }

  function activateLabelVideo(label) {
    const matchingVideo = hotspotVideos.find((video) => video.dataset.video === label.dataset.video);
    if (matchingVideo) setActiveVideo(matchingVideo);
  }

  for (const label of hotspotLabels) {
    label.addEventListener("pointerenter", () => activateLabelVideo(label));
    label.addEventListener("pointerover", () => activateLabelVideo(label));
    label.addEventListener("pointerleave", () => {
      if (activeVideo && activeVideo.dataset.video === label.dataset.video) {
        setActiveVideo(null);
      }
    });
  }

  function updateHotspot(event) {
    const hoveredLabel = event.target instanceof Element ? event.target.closest(".hotspot-label") : null;
    if (hoveredLabel) {
      activateLabelVideo(hoveredLabel);
      return;
    }

    const hitVideo = [...hotspotVideos].reverse().find((video) => getVideoPixel(video, event.clientX, event.clientY));
    setActiveVideo(hitVideo ?? null);
  }

  stage.addEventListener("pointermove", updateHotspot);
  stage.addEventListener("pointerdown", updateHotspot);
  stage.addEventListener("pointerleave", () => setActiveVideo(null));
  stage.addEventListener("click", (event) => {
    if (event.target instanceof Element && event.target.closest(".hotspot-label")) return;
    if (activeVideo) {
      window.location.href = `${activeVideo.dataset.video}.html`;
    }
  });

  function synchronizeOverlays() {
    if (lobby.readyState >= HTMLMediaElement.HAVE_METADATA && Number.isFinite(lobby.duration) && lobby.duration > 0) {
      for (const video of hotspotVideos) {
        if (video.readyState < HTMLMediaElement.HAVE_METADATA || !Number.isFinite(video.duration) || video.duration <= 0) continue;
        const targetTime = lobby.currentTime % video.duration;
        if (Math.abs(video.currentTime - targetTime) > 0.08) {
          video.currentTime = targetTime;
        }
      }
    }
    animationFrame = window.requestAnimationFrame(synchronizeOverlays);
  }

  if (lobby.readyState >= HTMLMediaElement.HAVE_METADATA) {
    synchronizeOverlays();
  } else {
    lobby.addEventListener("loadedmetadata", synchronizeOverlays, { once: true });
  }

  window.addEventListener("pagehide", () => window.cancelAnimationFrame(animationFrame), { once: true });
}
