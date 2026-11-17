(() => {
  const stage = document.querySelector(".stage");
  const video = stage.querySelector(".page-video");
  const youtubeLayer = stage.querySelector(".crt-youtube-layer");
  const youtubeFrame = stage.querySelector(".crt-youtube-frame");
  const cdSelector = stage.querySelector(".cd-selector");
  const cdTrack = cdSelector.querySelector(".cd-selector__track");
  let selectedChoice = cdTrack.querySelector('.cd-selector__choice[aria-pressed="true"]');

  const statusMessage = stage.querySelector(".media-status");
  const crtInterface = stage.querySelector(".crt-interface");
  const powerButton = crtInterface.querySelector(".crt-power");
  const startupZap = crtInterface.querySelector(".crt-startup-zap");
  const referenceVideoWidth = 1904;
  const referenceVideoHeight = 1440;
  let soundContext;
  let soundErrorShown = false;

  function reportSoundError(error) {
    console.error("Impossible de jouer l’effet sonore.", error);
    if (soundErrorShown) return;
    statusMessage.textContent = "Les effets sonores ne sont pas disponibles dans ce navigateur.";
    statusMessage.hidden = false;
    soundErrorShown = true;
  }

  function playSweep(context, type, startFrequency, endFrequency, duration, volume) {
    const now = context.currentTime;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(startFrequency, now);
    oscillator.frequency.exponentialRampToValueAtTime(endFrequency, now + duration);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(volume, now + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(now);
    oscillator.stop(now + duration);
  }

  function playInterfaceSound(sound) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) {
      reportSoundError(new Error("Web Audio API is not supported."));
      return;
    }

    try {
      soundContext ??= new AudioContextClass();
    } catch (error) {
      reportSoundError(error);
      return;
    }

    const play = () => {
      if (sound === "crt") {
        playSweep(soundContext, "square", 52, 34, 0.46, 0.08);
        playSweep(soundContext, "sawtooth", 38, 190, 0.24, 0.065);
        playSweep(soundContext, "sawtooth", 440, 58, 0.36, 0.04);
        playSweep(soundContext, "triangle", 1700, 240, 0.22, 0.02);
      } else {
        playSweep(soundContext, "triangle", 260, 72, 0.32, 0.07);
        playSweep(soundContext, "sine", 1150, 360, 0.16, 0.025);
        playSweep(soundContext, "square", 1200, 900, 0.03, 0.008);
      }
    };

    if (soundContext.state === "suspended") {
      soundContext.resume()
        .then(() => {
          if (soundContext.state !== "running") {
            reportSoundError(new Error("AudioContext did not start."));
            return;
          }
          play();
        })
        .catch(reportSoundError);
      return;
    }

    if (soundContext.state !== "running") {
      reportSoundError(new Error(`AudioContext is ${soundContext.state}.`));
      return;
    }
    play();
  }

  function updateCrtInterfacePosition() {
    const stageBounds = stage.getBoundingClientRect();
    const videoWidth = video.videoWidth || referenceVideoWidth;
    const videoHeight = video.videoHeight || referenceVideoHeight;
    const scale = Math.min(stageBounds.width / videoWidth, stageBounds.height / videoHeight);
    const renderedWidth = videoWidth * scale;
    const renderedHeight = videoHeight * scale;
    cdSelector.style.setProperty(
      "--player-bottom-gap",
      `${(stageBounds.height - renderedHeight) / 2}px`
    );

    for (const layer of [crtInterface, youtubeLayer]) {
      layer.style.width = `${renderedWidth}px`;
      layer.style.height = `${renderedHeight}px`;
      layer.style.left = `${(stageBounds.width - renderedWidth) / 2}px`;
      layer.style.top = `${(stageBounds.height - renderedHeight) / 2}px`;
    }
  }

  function finishCrtStartup() {
    crtInterface.classList.remove("is-starting", "is-collapsing");
    crtInterface.classList.add("is-screen-removed");
    video.classList.add("is-screen-removed");
    youtubeLayer.classList.add("is-interactive");
    cdSelector.classList.add("is-visible");
    powerButton.setAttribute("aria-label", "Écran du téléviseur retiré");
    powerButton.setAttribute("aria-pressed", "true");
  }

  function handleCrtZapAnimationEnd(event) {
    if (event.target !== startupZap) return;

    if (event.animationName === "crt-zap-expand") {
      video.classList.add("is-screen-removed");
      youtubeLayer.classList.add("is-interactive");
      cdSelector.classList.add("is-visible");
      crtInterface.classList.remove("is-starting");
      crtInterface.classList.add("is-collapsing");
      return;
    }

    if (event.animationName === "crt-zap-collapse") {
      startupZap.removeEventListener("animationend", handleCrtZapAnimationEnd);
      finishCrtStartup();
    }
  }

  updateCrtInterfacePosition();
  video.addEventListener("loadedmetadata", updateCrtInterfacePosition);
  if (window.ResizeObserver) {
    new ResizeObserver(updateCrtInterfacePosition).observe(stage);
  } else {
    window.addEventListener("resize", updateCrtInterfacePosition);
  }

  function selectCd(choice) {
    const videoId = choice.dataset.videoId;
    const startTime = Number.parseInt(choice.dataset.start, 10);
    if (!/^[\w-]{11}$/.test(videoId) || !Number.isInteger(startTime) || startTime < 0) {
      console.error("Impossible de charger ce CD : identifiant YouTube ou point de départ invalide.");
      return false;
    }

    const playerUrl = new URL(`https://www.youtube-nocookie.com/embed/${videoId}`);
    playerUrl.searchParams.set("start", String(startTime));
    playerUrl.searchParams.set("rel", "0");
    if (youtubeFrame.src !== playerUrl.href) youtubeFrame.src = playerUrl.href;
    playInterfaceSound("cd");

    if (choice === selectedChoice) return true;
    if (selectedChoice) selectedChoice.setAttribute("aria-pressed", "false");
    selectedChoice = choice;
    selectedChoice.setAttribute("aria-pressed", "true");
    return true;
  }

  cdTrack.addEventListener("click", event => {
    if (!window.matchMedia("(max-width: 640px)").matches) return;
    const choice = event.target instanceof Element
      ? event.target.closest(".cd-selector__choice")
      : null;
    if (!choice) cdTrack.classList.toggle("is-open");
  });

  cdSelector.addEventListener("click", event => {
    const choice = event.target instanceof Element
      ? event.target.closest(".cd-selector__choice")
      : null;
    if (!choice || !cdSelector.contains(choice)) return;
    if (selectCd(choice) && window.matchMedia("(max-width: 640px)").matches) {
      cdTrack.classList.remove("is-open");
    }
  });

  powerButton.addEventListener("click", () => {
    if (powerButton.disabled) return;
    powerButton.disabled = true;
    playInterfaceSound("crt");

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      finishCrtStartup();
      return;
    }

    startupZap.addEventListener("animationend", handleCrtZapAnimationEnd);
    crtInterface.classList.add("is-starting");
  });
})();
