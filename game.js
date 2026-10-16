(() => {
  "use strict";

  const canvas = document.querySelector("#game");
  const ctx = canvas.getContext("2d");
  const soundButton = document.querySelector("#sound-button");
  const pauseButton = document.querySelector("#pause-button");
  const statusNode = document.querySelector("#game-status");

  const WIDTH = 420;
  const HEIGHT = 720;
  const FLOOR = 662;
  const STORAGE_KEY = "flappy-art-best-v1";

  const game = {
    mode: "ready",
    score: 0,
    best: readBest(),
    time: 0,
    spawnTimer: 0,
    lastTime: 0,
    deathTime: 0,
    muted: false,
    paused: false,
    shake: 0,
    pipes: [],
    particles: [],
  };

  const player = {
    x: 112,
    y: 318,
    vy: 0,
    radius: 20,
    flapPulse: 0,
    blink: 0,
  };

  const stars = Array.from({ length: 38 }, (_, index) => ({
    x: (index * 97 + 31) % WIDTH,
    y: 38 + ((index * 53) % 350),
    r: index % 7 === 0 ? 1.8 : index % 3 === 0 ? 1.2 : 0.7,
    phase: index * 0.7,
  }));

  const tents = Array.from({ length: 7 }, (_, index) => ({
    x: index * 72 - 20,
    width: 78,
    height: 72 + (index % 3) * 12,
    tone: index % 2,
  }));

  let audioContext = null;

  function readBest() {
    try {
      return Number.parseInt(localStorage.getItem(STORAGE_KEY) || "0", 10) || 0;
    } catch {
      return 0;
    }
  }

  function writeBest() {
    try {
      localStorage.setItem(STORAGE_KEY, String(game.best));
    } catch {
      // The game still works when storage is blocked.
    }
  }

  function resizeCanvas() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = WIDTH * dpr;
    canvas.height = HEIGHT * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function setStatus(message) {
    statusNode.textContent = message;
  }

  function ensureAudio() {
    if (!audioContext) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) audioContext = new AudioContext();
    }
    if (audioContext?.state === "suspended") audioContext.resume();
  }

  function tone(startFrequency, endFrequency, duration, volume = 0.045, type = "sine") {
    if (game.muted) return;
    ensureAudio();
    if (!audioContext) return;

    const now = audioContext.currentTime;
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(startFrequency, now);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, endFrequency), now + duration);
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    oscillator.connect(gain).connect(audioContext.destination);
    oscillator.start(now);
    oscillator.stop(now + duration);
  }

  function resetGame() {
    game.mode = "ready";
    game.score = 0;
    game.time = 0;
    game.spawnTimer = 0.35;
    game.deathTime = 0;
    game.shake = 0;
    game.pipes.length = 0;
    game.particles.length = 0;
    player.y = 318;
    player.vy = 0;
    player.flapPulse = 0;
    game.paused = false;
    updatePauseButton();
    setStatus("Game ready. Tap, click, or press Space to flap.");
  }

  function startGame() {
    game.mode = "playing";
    game.spawnTimer = 0.72;
    setStatus("Game started. Score zero.");
  }

  function flap() {
    if (game.paused) return;

    if (game.mode === "dead") {
      if (game.deathTime < 0.45) return;
      resetGame();
      startGame();
    } else if (game.mode === "ready") {
      startGame();
    }

    player.vy = -455;
    player.flapPulse = 1;
    spawnFlapParticles();
    tone(270, 520, 0.075, 0.035, "triangle");
  }

  function handleAction(event) {
    if (event) event.preventDefault();
    canvas.focus({ preventScroll: true });
    flap();
  }

  function spawnPipe() {
    const minGapCenter = 205;
    const maxGapCenter = 490;
    const gap = Math.max(158, 190 - Math.min(game.score, 16) * 1.5);
    const wave = Math.sin(game.time * 1.37) * 55;
    const random = (Math.random() - 0.5) * 125;
    const gapY = Math.max(minGapCenter, Math.min(maxGapCenter, 345 + wave + random));
    game.pipes.push({ x: WIDTH + 48, gapY, gap, width: 72, scored: false });
  }

  function spawnFlapParticles() {
    for (let index = 0; index < 5; index += 1) {
      game.particles.push({
        x: player.x - 18,
        y: player.y + (Math.random() - 0.5) * 18,
        vx: -55 - Math.random() * 70,
        vy: (Math.random() - 0.5) * 80,
        life: 0.45 + Math.random() * 0.25,
        maxLife: 0.7,
        size: 2 + Math.random() * 3,
        color: Math.random() > 0.5 ? "#f0c34a" : "#f7f1df",
      });
    }
  }

  function burst() {
    const colors = ["#d52b31", "#f0c34a", "#f7f1df", "#17171d"];
    for (let index = 0; index < 24; index += 1) {
      const angle = (Math.PI * 2 * index) / 24 + Math.random() * 0.3;
      const speed = 80 + Math.random() * 180;
      game.particles.push({
        x: player.x,
        y: player.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.65 + Math.random() * 0.45,
        maxLife: 1.1,
        size: 3 + Math.random() * 4,
        color: colors[index % colors.length],
      });
    }
  }

  function endGame() {
    if (game.mode !== "playing") return;
    game.mode = "dead";
    game.deathTime = 0;
    game.shake = 1;
    player.vy = Math.min(player.vy, 120);
    burst();
    tone(150, 52, 0.34, 0.06, "sawtooth");
    if (game.score > game.best) {
      game.best = game.score;
      writeBest();
    }
    setStatus(`Game over. Score ${game.score}. Best score ${game.best}. Tap to try again.`);
  }

  function collides(pipe) {
    const left = player.x - 16;
    const right = player.x + 16;
    const top = player.y - 24;
    const bottom = player.y + 25;
    const overlapsX = right > pipe.x && left < pipe.x + pipe.width;
    if (!overlapsX) return false;
    const gapTop = pipe.gapY - pipe.gap / 2;
    const gapBottom = pipe.gapY + pipe.gap / 2;
    return top < gapTop || bottom > gapBottom;
  }

  function updateParticles(dt) {
    for (const particle of game.particles) {
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.vy += 240 * dt;
      particle.life -= dt;
    }
    game.particles = game.particles.filter((particle) => particle.life > 0);
  }

  function update(dt) {
    if (game.paused) return;

    game.time += dt;
    player.flapPulse = Math.max(0, player.flapPulse - dt * 4.8);
    player.blink = (game.time % 4.7) > 4.55 ? 1 : 0;
    game.shake = Math.max(0, game.shake - dt * 3.2);
    updateParticles(dt);

    if (game.mode === "ready") {
      player.y = 318 + Math.sin(game.time * 2.8) * 8;
      return;
    }

    if (game.mode === "dead") {
      game.deathTime += dt;
      player.vy += 1120 * dt;
      player.y = Math.min(FLOOR - 24, player.y + player.vy * dt);
      return;
    }

    player.vy += 1220 * dt;
    player.y += player.vy * dt;

    const speed = 168 + Math.min(game.score, 20) * 2.4;
    game.spawnTimer -= dt;
    if (game.spawnTimer <= 0) {
      spawnPipe();
      game.spawnTimer = Math.max(1.12, 1.47 - game.score * 0.012);
    }

    for (const pipe of game.pipes) {
      pipe.x -= speed * dt;
      if (!pipe.scored && pipe.x + pipe.width < player.x) {
        pipe.scored = true;
        game.score += 1;
        tone(620, 840, 0.09, 0.035, "sine");
        setStatus(`Score ${game.score}. Best score ${game.best}.`);
      }
      if (collides(pipe)) endGame();
    }

    game.pipes = game.pipes.filter((pipe) => pipe.x + pipe.width > -30);
    if (player.y - 22 < 0 || player.y + 25 > FLOOR) endGame();
  }

  function roundRect(x, y, width, height, radius) {
    const r = Math.min(radius, width / 2, height / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + width, y, x + width, y + height, r);
    ctx.arcTo(x + width, y + height, x, y + height, r);
    ctx.arcTo(x, y + height, x, y, r);
    ctx.arcTo(x, y, x + width, y, r);
    ctx.closePath();
  }

  function drawBackground() {
    const sky = ctx.createLinearGradient(0, 0, 0, FLOOR);
    sky.addColorStop(0, "#10101a");
    sky.addColorStop(0.58, "#262036");
    sky.addColorStop(1, "#7a2630");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    const moonGlow = ctx.createRadialGradient(335, 108, 10, 335, 108, 86);
    moonGlow.addColorStop(0, "rgba(255, 244, 205, 0.28)");
    moonGlow.addColorStop(1, "rgba(255, 244, 205, 0)");
    ctx.fillStyle = moonGlow;
    ctx.beginPath();
    ctx.arc(335, 108, 86, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#f7e7ad";
    ctx.beginPath();
    ctx.arc(335, 108, 35, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#10101a";
    ctx.beginPath();
    ctx.arc(350, 96, 34, 0, Math.PI * 2);
    ctx.fill();

    for (const star of stars) {
      const alpha = 0.35 + (Math.sin(game.time * 1.8 + star.phase) + 1) * 0.22;
      ctx.fillStyle = `rgba(247, 241, 223, ${alpha})`;
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = "rgba(5, 5, 8, 0.58)";
    ctx.fillRect(0, 515, WIDTH, FLOOR - 515);

    for (const tent of tents) {
      const baseY = FLOOR;
      ctx.fillStyle = tent.tone ? "#17171c" : "#23151b";
      ctx.fillRect(tent.x, baseY - tent.height, tent.width, tent.height);
      ctx.beginPath();
      ctx.moveTo(tent.x - 7, baseY - tent.height);
      ctx.lineTo(tent.x + tent.width / 2, baseY - tent.height - 48);
      ctx.lineTo(tent.x + tent.width + 7, baseY - tent.height);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "rgba(213, 43, 49, 0.32)";
      ctx.lineWidth = 3;
      for (let stripe = 12; stripe < tent.width; stripe += 22) {
        ctx.beginPath();
        ctx.moveTo(tent.x + stripe, baseY - tent.height);
        ctx.lineTo(tent.x + tent.width / 2, baseY - tent.height - 47);
        ctx.stroke();
      }
    }

    ctx.fillStyle = "#09090b";
    ctx.fillRect(0, FLOOR, WIDTH, HEIGHT - FLOOR);
    ctx.fillStyle = "rgba(247, 241, 223, 0.12)";
    for (let x = -20; x < WIDTH + 40; x += 38) {
      ctx.beginPath();
      ctx.moveTo(x, FLOOR);
      ctx.lineTo(x + 18, FLOOR);
      ctx.lineTo(x - 6, HEIGHT);
      ctx.lineTo(x - 24, HEIGHT);
      ctx.closePath();
      ctx.fill();
    }
  }

  function drawPillar(pipe, top) {
    const gapTop = pipe.gapY - pipe.gap / 2;
    const gapBottom = pipe.gapY + pipe.gap / 2;
    const x = pipe.x;
    const width = pipe.width;
    const y = top ? -12 : gapBottom;
    const height = top ? gapTop + 12 : FLOOR - gapBottom;

    ctx.save();
    roundRect(x, y, width, height, 8);
    ctx.clip();
    ctx.fillStyle = "#e9e1d0";
    ctx.fillRect(x, y, width, height);
    ctx.fillStyle = "#17171c";
    for (let stripeY = y - width; stripeY < y + height + width; stripeY += 34) {
      ctx.beginPath();
      ctx.moveTo(x, stripeY);
      ctx.lineTo(x + width, stripeY + 23);
      ctx.lineTo(x + width, stripeY + 41);
      ctx.lineTo(x, stripeY + 18);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();

    ctx.strokeStyle = "#09090b";
    ctx.lineWidth = 4;
    roundRect(x, y, width, height, 8);
    ctx.stroke();

    const capY = top ? gapTop - 22 : gapBottom;
    ctx.fillStyle = "#b5202a";
    roundRect(x - 10, capY, width + 20, 24, 7);
    ctx.fill();
    ctx.strokeStyle = "#09090b";
    ctx.lineWidth = 4;
    ctx.stroke();

    ctx.fillStyle = "#f0c34a";
    for (let bulb = 0; bulb < 4; bulb += 1) {
      ctx.beginPath();
      ctx.arc(x + 9 + bulb * 18, capY + 12, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawPipes() {
    for (const pipe of game.pipes) {
      drawPillar(pipe, true);
      drawPillar(pipe, false);
    }
  }

  function limb(x1, y1, length, angle, sleeveColor, handAngle = 0) {
    const x2 = x1 + Math.cos(angle) * length;
    const y2 = y1 + Math.sin(angle) * length;
    ctx.strokeStyle = "#08080a";
    ctx.lineWidth = 15;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.strokeStyle = sleeveColor;
    ctx.lineWidth = 9;
    ctx.stroke();
    ctx.save();
    ctx.translate(x2, y2);
    ctx.rotate(handAngle);
    ctx.fillStyle = "#eee6d8";
    ctx.strokeStyle = "#08080a";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.ellipse(0, 0, 8, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    for (let finger = -1; finger <= 1; finger += 1) {
      ctx.beginPath();
      ctx.moveTo(5, finger * 3);
      ctx.lineTo(10, finger * 3.8);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawClown() {
    const dead = game.mode === "dead";
    const tilt = dead ? Math.min(0.82, game.deathTime * 0.7) : Math.max(-0.38, Math.min(0.5, player.vy / 850));
    const flap = player.flapPulse;
    const idleWave = Math.sin(game.time * 4.2) * 0.13;
    const armAngleLeft = dead ? 2.65 : 2.95 - flap * 1.65 + idleWave;
    const armAngleRight = dead ? 0.48 : 0.2 + flap * 1.65 - idleWave;

    ctx.save();
    ctx.translate(player.x, player.y);
    ctx.rotate(tilt);

    ctx.globalAlpha = 0.2;
    ctx.fillStyle = "#000";
    ctx.beginPath();
    ctx.ellipse(2, 31, 28, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    limb(-12, 5, 35, armAngleLeft, "#ece5d7", armAngleLeft);
    limb(12, 5, 35, armAngleRight, "#141418", armAngleRight);

    ctx.strokeStyle = "#08080a";
    ctx.lineWidth = 13;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(-8, 26);
    ctx.lineTo(-13, 45);
    ctx.moveTo(8, 26);
    ctx.lineTo(15, 45);
    ctx.stroke();
    ctx.strokeStyle = "#f1eadc";
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(-8, 26);
    ctx.lineTo(-13, 45);
    ctx.stroke();

    ctx.fillStyle = "#f0eadf";
    ctx.strokeStyle = "#08080a";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(0, 12, 17, 25, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(0, 12, 15.5, 23.5, 0, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = "#111115";
    ctx.fillRect(0, -14, 20, 54);
    ctx.restore();

    ctx.fillStyle = "#f3ecdf";
    ctx.strokeStyle = "#08080a";
    ctx.lineWidth = 2;
    for (let puff = -2; puff <= 2; puff += 1) {
      ctx.beginPath();
      ctx.arc(puff * 6, -5 + Math.abs(puff) * 1.6, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    ctx.fillStyle = "#f2eadc";
    ctx.strokeStyle = "#08080a";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(0, -25, 19, 22, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#121216";
    ctx.beginPath();
    ctx.moveTo(-17, -35);
    ctx.quadraticCurveTo(-8, -46, 0, -34);
    ctx.quadraticCurveTo(8, -46, 17, -35);
    ctx.lineTo(13, -24);
    ctx.quadraticCurveTo(6, -34, 0, -25);
    ctx.quadraticCurveTo(-6, -34, -13, -24);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = "#121216";
    ctx.lineWidth = player.blink ? 3 : 2;
    ctx.beginPath();
    if (player.blink) {
      ctx.moveTo(-11, -27);
      ctx.lineTo(-4, -27);
      ctx.moveTo(4, -27);
      ctx.lineTo(11, -27);
    } else {
      ctx.ellipse(-7, -28, 2.4, 5, 0, 0, Math.PI * 2);
      ctx.moveTo(9.4, -28);
      ctx.ellipse(7, -28, 2.4, 5, 0, 0, Math.PI * 2);
    }
    ctx.stroke();

    ctx.fillStyle = "#111115";
    ctx.beginPath();
    ctx.arc(0, -20, 3.8, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "#9d1823";
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    if (dead) {
      ctx.moveTo(-8, -13);
      ctx.quadraticCurveTo(0, -8, 9, -14);
    } else {
      ctx.moveTo(-8, -14);
      ctx.quadraticCurveTo(0, -7, 9, -15);
    }
    ctx.stroke();

    ctx.fillStyle = "#121216";
    ctx.fillRect(-12, -49, 24, 8);
    ctx.fillRect(-8, -61, 16, 14);
    ctx.strokeStyle = "#d52b31";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-8, -49);
    ctx.lineTo(8, -49);
    ctx.stroke();

    ctx.restore();
  }

  function drawParticles() {
    for (const particle of game.particles) {
      ctx.globalAlpha = Math.max(0, particle.life / particle.maxLife);
      ctx.fillStyle = particle.color;
      ctx.fillRect(particle.x, particle.y, particle.size, particle.size);
    }
    ctx.globalAlpha = 1;
  }

  function drawHud() {
    ctx.textAlign = "center";
    ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
    ctx.font = "900 56px ui-sans-serif, system-ui, sans-serif";
    ctx.fillText(String(game.score), WIDTH / 2 + 2, 79);
    ctx.fillStyle = "#f7f1df";
    ctx.fillText(String(game.score), WIDTH / 2, 76);

    ctx.textAlign = "left";
    ctx.font = "800 12px ui-sans-serif, system-ui, sans-serif";
    ctx.fillStyle = "rgba(247, 241, 223, 0.72)";
    ctx.fillText(`BEST ${game.best}`, 18, 29);
  }

  function panel(title, lines, action) {
    const boxWidth = 324;
    const boxHeight = action ? 178 : 150;
    const x = (WIDTH - boxWidth) / 2;
    const y = 208;
    ctx.fillStyle = "rgba(8, 8, 11, 0.88)";
    roundRect(x, y, boxWidth, boxHeight, 20);
    ctx.fill();
    ctx.strokeStyle = "rgba(247, 241, 223, 0.2)";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.textAlign = "center";
    ctx.fillStyle = "#f7f1df";
    ctx.font = "700 34px Georgia, serif";
    ctx.fillText(title, WIDTH / 2, y + 48);
    ctx.fillStyle = "#b7b1a5";
    ctx.font = "600 14px ui-sans-serif, system-ui, sans-serif";
    lines.forEach((line, index) => ctx.fillText(line, WIDTH / 2, y + 80 + index * 23));
    if (action) {
      ctx.fillStyle = "#d52b31";
      roundRect(x + 52, y + 128, boxWidth - 104, 36, 18);
      ctx.fill();
      ctx.fillStyle = "#fff7e8";
      ctx.font = "800 13px ui-sans-serif, system-ui, sans-serif";
      ctx.fillText(action, WIDTH / 2, y + 152);
    }
  }

  function drawOverlays() {
    if (game.paused) {
      ctx.fillStyle = "rgba(4, 4, 7, 0.6)";
      ctx.fillRect(0, 0, WIDTH, HEIGHT);
      panel("Intermission", ["The clown is judging you."], "TAP OR PRESS P TO RESUME");
      return;
    }

    if (game.mode === "ready") {
      panel("Ready to flap?", ["Space, click, or tap", "Thread the carnival gates"], "START FLAPPING");
    } else if (game.mode === "dead") {
      const result = game.score === game.best && game.score > 0 ? "A new personal best." : `Best score: ${game.best}`;
      panel("Silent judgment.", [`Score: ${game.score}`, result], "TAP TO TRY AGAIN");
    }
  }

  function draw() {
    ctx.save();
    if (game.shake > 0) {
      ctx.translate((Math.random() - 0.5) * 9 * game.shake, (Math.random() - 0.5) * 7 * game.shake);
    }
    drawBackground();
    drawPipes();
    drawParticles();
    drawClown();
    drawHud();
    drawOverlays();
    ctx.restore();
  }

  function frame(timestamp) {
    const dt = game.lastTime ? Math.min((timestamp - game.lastTime) / 1000, 0.034) : 0;
    game.lastTime = timestamp;
    update(dt);
    draw();
    requestAnimationFrame(frame);
  }

  function updateSoundButton() {
    soundButton.querySelector("span").textContent = game.muted ? "×" : "♪";
    soundButton.setAttribute("aria-label", game.muted ? "Unmute sound" : "Mute sound");
    soundButton.title = game.muted ? "Unmute sound" : "Mute sound";
  }

  function updatePauseButton() {
    pauseButton.querySelector("span").textContent = game.paused ? "▶" : "Ⅱ";
    pauseButton.setAttribute("aria-label", game.paused ? "Resume game" : "Pause game");
    pauseButton.title = game.paused ? "Resume game" : "Pause game";
  }

  function togglePause() {
    if (game.mode === "ready" || game.mode === "dead") return;
    game.paused = !game.paused;
    updatePauseButton();
    setStatus(game.paused ? "Game paused." : `Game resumed. Score ${game.score}.`);
  }

  canvas.addEventListener("pointerdown", handleAction);
  canvas.addEventListener("contextmenu", (event) => event.preventDefault());
  window.addEventListener("keydown", (event) => {
    if (["Space", "ArrowUp", "Enter"].includes(event.code)) handleAction(event);
    if (event.code === "KeyP" || event.code === "Escape") {
      event.preventDefault();
      togglePause();
    }
    if (event.code === "KeyM") {
      game.muted = !game.muted;
      updateSoundButton();
    }
  });

  soundButton.addEventListener("click", () => {
    game.muted = !game.muted;
    if (!game.muted) tone(360, 520, 0.08, 0.03, "triangle");
    updateSoundButton();
  });

  pauseButton.addEventListener("click", togglePause);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden && game.mode === "playing" && !game.paused) togglePause();
  });

  resizeCanvas();
  window.addEventListener("resize", resizeCanvas);
  resetGame();
  updateSoundButton();
  requestAnimationFrame(frame);
})();
