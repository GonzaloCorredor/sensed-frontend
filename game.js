"use strict";
/* ============================================================
   SENSED.GG — game.js (ESTRUCTURA UNIFICADA Y CORREGIDA)
   ============================================================ */

// ─── 1. UTILIDADES Y GESTIÓN DE PANTALLAS ──────────────────────────────────
const $ = (id) => document.getElementById(id);

// Esta función apaga todas las pantallas y enciende solo la que le pidas
function showScreen(id) {
    document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
    const target = $(id);
    if (target) target.classList.add("active");
}

// Para compatibilidad con los botones de tu HTML
function cambiarPantalla(idPantallaDestino) {
    showScreen(idPantallaDestino);
}

const showToast = (msg, duration = 2200) => {
    const t = $("toast");
    if(t) {
        t.textContent = msg;
        t.classList.add("show");
        setTimeout(() => t.classList.remove("show"), duration);
    }
};

const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const updateNavScore = (pts) => { if($("nav-score")) $("nav-score").textContent = `${Math.round(pts)} pts`; };

// ─── 2. ESTADO GLOBAL ──────────────────────────────────────────────────────
const state = {
    // Color
    colors: [], currentColorIndex: 0, colorScores: [], totalColorScore: 0, timerTimeout: null,
};

// ─── 3. SISTEMA DE USUARIOS (LOGIN / REGISTRO) ─────────────────────────────
const authUsernameInput = $("auth-username");
const authPasswordInput = $("auth-password");
const btnAuthSubmit = $("btn-auth-submit");
const btnAuthToggle = $("btn-auth-toggle");
const authTitle = $("auth-title");
const authToggleText = $("auth-toggle-text");

let isLoginMode = true; // Estado inicial: Iniciar sesión

if (btnAuthToggle) {
    btnAuthToggle.addEventListener('click', (e) => {
        e.preventDefault();
        isLoginMode = !isLoginMode;
        
        if (isLoginMode) {
            authTitle.textContent = 'Iniciar Sesión';
            btnAuthSubmit.textContent = 'ENTRAR';
            authToggleText.textContent = '¿No tienes cuenta?';
            btnAuthToggle.textContent = 'Regístrate';
        } else {
            authTitle.textContent = 'Crear Cuenta';
            btnAuthSubmit.textContent = 'REGISTRARSE';
            authToggleText.textContent = '¿Ya tienes cuenta?';
            btnAuthToggle.textContent = 'Inicia sesión';
        }
    });
}

// Definimos la base de la API en producción
const baseUrl = "https://sensed-production.up.railway.app/api/auth";

// Asumo que tienes estas variables definidas arriba en tu código:
// const btnAuthSubmit = document.getElementById('btn-auth-submit');
// const authUsernameInput = document.getElementById('auth-username');
// const authPasswordInput = document.getElementById('auth-password');
// let isLoginMode = true; // O como gestiones tu modo de login

if (btnAuthSubmit) {
    btnAuthSubmit.addEventListener('click', async (e) => {
        e.preventDefault(); 

        const username = authUsernameInput.value.trim();
        const password = authPasswordInput.value.trim();

        if (!username || !password) {
            alert("Por favor, rellena todos los campos.");
            return;
        }

        const endpoint = isLoginMode ? `${baseUrl}/login` : `${baseUrl}/registro`;

        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    username: username,
                    password: password
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                alert("Error: " + (errorData.error || "Algo ha fallado en el servidor"));
                return;
            }

            const data = await response.json();
            
            if (isLoginMode) {
                console.log("¡Login exitoso!", data);
                alert("¡Bienvenido a Sensed!"); 
                
                // --- CAMBIO DE PANTALLA ---
                // Ocultamos el login
                const loginScreen = document.getElementById('screen-auth');
                if (loginScreen) loginScreen.style.display = 'none';
                
                // Mostramos el juego (asegúrate de que este ID existe en tu HTML)
                const gameContainer = document.getElementById('game-container'); 
                if (gameContainer) {
                    gameContainer.style.display = 'block';
                } else {
                    console.warn("No encuentro el contenedor del juego con id='game-container'");
                }

            } else {
                console.log("¡Registro exitoso!", data);
                alert("¡Cuenta creada! Ya puedes iniciar sesión.");
            }

        } catch (error) {
            console.error("Fallo de red:", error);
            alert("No se pudo conectar con el servidor. Revisa tu conexión o espera a que Railway termine de arrancar.");
        }
    });
}

// ─── 4. NAVEGACIÓN Y GESTIÓN DE EVENTOS ────────────────────────────────────
document.querySelectorAll(".nav-btn").forEach(btn => {
    btn.addEventListener("click", () => {
        document.querySelectorAll(".nav-btn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        
        // Resetear estados al cambiar de modo
        stopUserTone();
        if(typeof fishState !== "undefined" && fishState !== "idle") resetFishing();
        
        const mode = btn.dataset.mode;
        const screens = { 
            color: "screen-home", 
            sound: "screen-sound-home", 
            time: "screen-time-home",
            fishing: "screen-fishing-home"
        };
        showScreen(screens[mode] || "screen-home");
    });
});

const navLogo = $("nav-logo");
if (navLogo) {
    navLogo.addEventListener("click", (e) => {
        e.preventDefault();
        stopUserTone();
        if(typeof fishState !== "undefined" && fishState !== "idle") resetFishing();
        document.querySelectorAll(".nav-btn").forEach(b => b.classList.remove("active"));
        const colorBtn = document.querySelector('.nav-btn[data-mode="color"]');
        if (colorBtn) colorBtn.classList.add("active");
        showScreen("screen-home");
    });
}

// ─── 5. MODO COLOR (5 Rondas) ──────────────────────────────────────────────
function randomColor() { return { h: rand(0, 360), s: rand(30, 95), l: rand(25, 75) }; }
function hslStr({ h, s, l }) { return `hsl(${h}, ${s}%, ${l}%)`; }

function colorScore(orig, guess) {
    const dh = Math.min(Math.abs(orig.h - guess.h), 360 - Math.abs(orig.h - guess.h)) / 180;
    const ds = Math.abs(orig.s - guess.s) / 100;
    const dl = Math.abs(orig.l - guess.l) / 100;
    const dist = Math.sqrt((dh * dh * 4) + (ds * ds) + (dl * dl)); 
    const score = 10 - (dist * 7); 
    return Math.max(0, Math.round(score * 10) / 10);
}

const btnStartColor = $("btn-start");
if (btnStartColor) {
    btnStartColor.addEventListener("click", () => {
        state.colors = Array.from({ length: 5 }, randomColor);
        state.currentColorIndex = 0; 
        state.colorScores = []; 
        state.totalColorScore = 0;
        showNextColorMemorize();
    });
}

function showNextColorMemorize() {
    const idx = state.currentColorIndex;
    if (idx >= state.colors.length) { showColorFinal(); return; }
    
    $("color-round-num").textContent = idx + 1;
    $("color-display").style.backgroundColor = hslStr(state.colors[idx]);
    showScreen("screen-color-memorize");
    
    const bar = $("timer-bar");
    if (bar) {
        bar.style.transition = "none"; 
        bar.style.width = "100%";
        
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                bar.style.transition = `width 4000ms linear`; 
                bar.style.width = "0%";
            });
        });
    }
    
    clearTimeout(state.timerTimeout);
    state.timerTimeout = setTimeout(() => showColorGuess(idx), 4000);
}

function showColorGuess(idx) {
    $("color-guess-num").textContent = idx + 1;
    const startH = rand(0, 360), startS = rand(20, 80), startL = rand(30, 70);
    
    $("slider-h").value = startH; $("slider-s").value = startS; $("slider-l").value = startL;
    $("val-h").textContent = startH; $("val-s").textContent = startS; $("val-l").textContent = startL;
    
    updateColorPreview(); 
    showScreen("screen-color-guess");
}

function getGuessColor() { 
    return { h: parseInt($("slider-h").value), s: parseInt($("slider-s").value), l: parseInt($("slider-l").value) }; 
}
function updateColorPreview() { 
    const previewBox = $("color-preview-box");
    if (previewBox) previewBox.style.backgroundColor = hslStr(getGuessColor()); 
}

["slider-h", "slider-s", "slider-l"].forEach(id => {
    const slider = $(id);
    if (slider) {
        slider.addEventListener("input", () => {
            $("val-h").textContent = $("slider-h").value; 
            $("val-s").textContent = $("slider-s").value; 
            $("val-l").textContent = $("slider-l").value;
            updateColorPreview();
        });
    }
});

const btnColorConfirm = $("btn-color-confirm");
if (btnColorConfirm) {
    btnColorConfirm.addEventListener("click", () => {
        const orig = state.colors[state.currentColorIndex];
        const guess = getGuessColor();
        const sc = colorScore(orig, guess);
        
        state.colorScores.push({ orig, guess, sc }); 
        state.totalColorScore += sc; 
        updateNavScore(state.totalColorScore * 10);
        
        $("result-original").style.backgroundColor = hslStr(orig);
        $("result-guess").style.backgroundColor = hslStr(guess);
        $("result-score-big").textContent = sc.toFixed(1);
        $("result-comment").textContent = sc >= 8 ? "¡Muy bien! ⚡" : (sc >= 5 ? "Cerca... 🫤" : "Qué lejos 💀");
        
        showScreen("screen-color-result");
    });
}

const btnNextColor = $("btn-next-color");
if (btnNextColor) {
    btnNextColor.addEventListener("click", () => { 
        state.currentColorIndex++; 
        showNextColorMemorize(); 
    });
}

function showColorFinal() {
    const finalScore = state.totalColorScore * 10;
    $("final-score-big").textContent = finalScore.toFixed(0);
    $("final-grade").textContent = state.totalColorScore >= 40 ? "Ojo de artista 🎨" : "Buen intento 👍";
    
    const container = $("final-swatches"); 
    if(container) container.innerHTML = "";
    
    state.colorScores.forEach(({ orig, guess, sc }) => {
        const pair = document.createElement("div"); 
        pair.className = "swatch-pair";
        pair.innerHTML = `
            <div style="display:flex; justify-content:center; gap:0.5rem; align-items:center; margin-bottom: 0.5rem;">
                <div class="swatch-mini" style="background:${hslStr(orig)}; width:30px; height:30px; border-radius:4px;"></div>
                <div class="swatch-mini" style="background:${hslStr(guess)}; width:30px; height:30px; border-radius:4px;"></div>
                <span class="swatch-score" style="color:var(--text); font-weight:bold;">${sc.toFixed(1)}</span>
            </div>
        `;
        if(container) container.appendChild(pair);
    });
    showScreen("screen-final");
}

const btnPlayAgain = $("btn-play-again");
if (btnPlayAgain) {
    btnPlayAgain.addEventListener("click", () => { 
        updateNavScore(0); 
        showScreen("screen-home"); 
    });
}


// ─── 7. MODO SONIDO (Afinación de Instrumentos - 5 Rondas) ────────────────
let audioCtx = null, currentTargetFreq = 0, userOsc = null, userGain = null;
let soundRound = 0;
let soundTotalScore = 0;
let soundListens = 0;

const instruments = [
    { name: "Diapasón Clásico", icon: "🥢", type: "sine", min: 250, max: 500, desc: "Onda pura. Busca la claridad perfecta." },
    { name: "Bajo Eléctrico", icon: "🎸", type: "triangle", min: 80, max: 250, desc: "Frecuencias graves. Siente la vibración." },
    { name: "Saxofón Alto", icon: "🎷", type: "sawtooth", min: 200, max: 800, desc: "Ajusta la embocadura y la caña." },
    { name: "Sintetizador Analógico", icon: "🎹", type: "square", min: 300, max: 900, desc: "Sonido de 8-bits. Pura energía retro." },
    { name: "Flauta Travesera", icon: "🪈", type: "sine", min: 500, max: 1200, desc: "Sonido agudo y cristalino." }
];

function initAudio() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
}

const btnSoundStart = $("btn-sound-start");
if (btnSoundStart) {
    btnSoundStart.addEventListener("click", () => {
        showScreen("screen-sound-game");
        initSoundGame();
    });
}

function initSoundGame() {
    soundRound = 0;
    soundTotalScore = 0;
    loadSoundRound();
}

function loadSoundRound() {
    if (soundRound >= 5) {
        showToast(`¡Afinación completada! Puntos: ${soundTotalScore}`, 4000);
        updateNavScore(soundTotalScore);
        showScreen("screen-sound-home");
        return;
    }

    const inst = instruments[soundRound];
    $("sound-round-num").textContent = soundRound + 1;
    $("sound-icon").textContent = inst.icon;
    $("sound-name").textContent = inst.name;
    $("sound-desc").textContent = inst.desc;

    currentTargetFreq = 0; 
    soundListens = 0; 
    
    const playBtn = $("btn-sound-play");
    if (playBtn) {
        playBtn.textContent = "ESCUCHAR OBJETIVO (3/3)";
        playBtn.style.opacity = "1";
        playBtn.style.pointerEvents = "auto";
    }

    $("slider-hz").min = inst.min;
    $("slider-hz").max = inst.max;
    $("slider-hz").value = Math.floor((inst.min + inst.max) / 2);
    $("sound-val").textContent = $("slider-hz").value;

    stopUserTone();
}

function playTargetTone() {
    initAudio();
    const inst = instruments[soundRound];
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    
    osc.type = inst.type; 
    osc.frequency.value = currentTargetFreq;
    
    gain.gain.setValueAtTime(0, audioCtx.currentTime);
    gain.gain.linearRampToValueAtTime(0.1, audioCtx.currentTime + 0.05);
    gain.gain.setValueAtTime(0.1, audioCtx.currentTime + 1.0);
    gain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 1.2);
    
    osc.connect(gain); 
    gain.connect(audioCtx.destination);
    osc.start(); 
    osc.stop(audioCtx.currentTime + 1.2);
}

function startUserTone() {
    initAudio(); 
    if (userOsc) return; 
    
    const inst = instruments[soundRound];
    userOsc = audioCtx.createOscillator(); 
    userGain = audioCtx.createGain();
    
    userOsc.type = inst.type; 
    userOsc.frequency.value = $("slider-hz").value;
    userGain.gain.setValueAtTime(0.1, audioCtx.currentTime);
    
    userOsc.connect(userGain); 
    userGain.connect(audioCtx.destination); 
    userOsc.start();
}

function stopUserTone() { 
    if (userOsc) { 
        userOsc.stop(); 
        userOsc.disconnect(); 
        userOsc = null; 
    } 
}

const btnSoundPlay = $("btn-sound-play");
if (btnSoundPlay) {
    btnSoundPlay.addEventListener("click", () => {
        if (soundListens >= 3) {
            showToast("¡Ya has usado tus 3 oportunidades!");
            return;
        }

        const inst = instruments[soundRound];
        if (currentTargetFreq === 0) currentTargetFreq = Math.round(rand(inst.min, inst.max));
        
        playTargetTone(); 
        soundListens++; 
        
        const remaining = 3 - soundListens;
        const playBtn = $("btn-sound-play");
        
        if (remaining > 0) {
            playBtn.textContent = `ESCUCHAR OBJETIVO (${remaining}/3)`;
            showToast(`Escuchando... te quedan ${remaining}`);
        } else {
            playBtn.textContent = "SIN ESCUCHAS DISPONIBLES";
            playBtn.style.opacity = "0.5";
            playBtn.style.pointerEvents = "none"; 
            showToast("Última escucha. ¡Concéntrate!");
        }
    });
}

const sliderHz = $("slider-hz");
if (sliderHz) {
    sliderHz.addEventListener("input", (e) => {
        const freq = e.target.value; 
        $("sound-val").textContent = freq;
        if (!userOsc) startUserTone(); 
        if (userOsc) userOsc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    });

    ["change", "mouseup", "touchend"].forEach(evt => sliderHz.addEventListener(evt, stopUserTone));
}

const btnSoundConfirm = $("btn-sound-confirm");
if (btnSoundConfirm) {
    btnSoundConfirm.addEventListener("click", () => {
        if (currentTargetFreq === 0) return showToast("¡Primero escucha el objetivo!");
        
        const userFreq = parseInt($("slider-hz").value);
        const diff = Math.abs(currentTargetFreq - userFreq);
        let roundScore = 0;
        
        if (diff === 0) { roundScore = 20; showToast(`¡CLAVADO! ${currentTargetFreq} Hz 🔥`, 2500); }
        else if (diff <= 10) { roundScore = 10; showToast(`¡Casi! Era ${currentTargetFreq} Hz ⚡`, 2500); }
        else if (diff <= 30) { roundScore = 5; showToast(`Se fue un poco. Era ${currentTargetFreq} Hz 🫤`, 2500); }
        else { showToast(`Desafinado. Era ${currentTargetFreq} Hz 💀`, 2500); }
        
        soundTotalScore += roundScore;
        soundRound++;
        
        setTimeout(loadSoundRound, 2600);
    });
}

// ─── 8. MODO TIEMPO (Cronómetro de 5 Rondas) ───────────────────────────────
let timeTarget = 0, timeStart = 0, timeState = "waiting", timeTimeout; 
let timeRound = 0;
let timeTotalScore = 0;

const btnTimeStart = $("btn-time-start");
if (btnTimeStart) {
    btnTimeStart.addEventListener("click", () => {
        timeRound = 0;
        timeTotalScore = 0;
        showScreen("screen-time-game");
        initTimeRound();
    });
}

function initTimeRound() {
    if (timeRound >= 5) {
        showToast(`¡Cronómetro terminado! Puntos: ${timeTotalScore}`, 4000);
        updateNavScore(timeTotalScore);
        showScreen("screen-time-home"); 
        return;
    }

    $("time-round-num").textContent = timeRound + 1;
    clearTimeout(timeTimeout); 
    timeTarget = rand(1500, 5500);
    
    $("time-target").textContent = (timeTarget / 1000).toFixed(2) + "s";
    $("time-result-text").textContent = "";
    
    const btn = $("btn-time-action"); 
    btn.style.backgroundColor = "var(--accent)"; 
    btn.style.color = "#000";
    
    $("time-btn-title").textContent = "EMPEZAR"; 
    $("time-btn-sub").textContent = "Haz clic para iniciar";
    timeState = "waiting";
}

const btnTimeAction = $("btn-time-action");
if (btnTimeAction) {
    btnTimeAction.addEventListener("click", () => {
        const btn = $("btn-time-action"), resultText = $("time-result-text");
        
        if (timeState === "waiting") {
            timeStart = Date.now(); 
            timeState = "running";
            
            btn.style.backgroundColor = "var(--danger)"; 
            btn.style.color = "#fff";
            $("time-btn-title").textContent = "DETENER"; 
            $("time-btn-sub").textContent = "Haz clic para parar";
            
            resultText.textContent = "Contando..."; 
            resultText.style.color = "var(--text2)";
        } 
        else if (timeState === "running") {
            const elapsed = Date.now() - timeStart; 
            timeState = "result"; 
            
            const diff = elapsed - timeTarget, absDiff = Math.abs(diff);
            const diffStr = (diff > 0 ? "+" : "") + (diff / 1000).toFixed(2) + "s";
            
            btn.style.backgroundColor = "var(--bg3)"; 
            btn.style.color = "var(--text)";
            $("time-btn-title").textContent = (elapsed / 1000).toFixed(2) + "s"; 
            $("time-btn-sub").textContent = "Tu tiempo";
            
            if (absDiff <= 50) { 
                resultText.textContent = `¡PERFECTO! (${diffStr}) 🔥`; 
                resultText.style.color = "var(--success)"; 
                timeTotalScore += 20;
            } else if (absDiff <= 200) { 
                resultText.textContent = `¡Muy preciso! (${diffStr}) ⚡`; 
                resultText.style.color = "var(--accent)"; 
                timeTotalScore += 10;
            } else { 
                resultText.textContent = `Demasiado lejos (${diffStr}) 💀`; 
                resultText.style.color = "var(--danger)"; 
            }
            
            timeRound++;
            timeTimeout = setTimeout(initTimeRound, 2500);
        }
    });
}

// ─── 8.5 MODO PESCA (Jornada de 5 Lances) ──────────────────────────────────
let fishState = "idle";
let fishTimeout = null;
let biteStartTime = 0;
let fishRound = 0;
let fishTotalScore = 0;

const btnFishingStart = $("btn-fishing-start");
if (btnFishingStart) {
    btnFishingStart.addEventListener("click", () => {
        fishRound = 0;
        fishTotalScore = 0;
        showScreen("screen-fishing-game");
        resetFishing();
    });
}

function resetFishing() {
    if (fishRound >= 5) {
        showToast(`¡Jornada terminada! Puntos: ${fishTotalScore}`, 4000);
        updateNavScore(fishTotalScore);
        showScreen("screen-fishing-home"); 
        fishState = "idle";
        return;
    }

    $("fishing-round-num").textContent = fishRound + 1;
    clearTimeout(fishTimeout);
    const btn = $("btn-fish-action");
    
    if (btn) {
        btn.style.backgroundColor = "#3b82f6";
        btn.style.color = "#fff";
    }
    
    $("fish-btn-title").textContent = "LANZAR CAÑA";
    $("fish-btn-sub").textContent = "Haz clic para lanzar";
    $("fish-reaction-time").textContent = "-- ms";
    $("fish-result-text").textContent = "";
    fishState = "idle";
}

function getRandomCatch(reactionTime) {
    let tierMsg, tierColor, pool;
    if (reactionTime <= 260) {
        tierColor = "var(--success)"; 
        tierMsg = "¡CLAVADÓN PERFECTO! 🔥";
        pool = [
            { n: "Carpa Royal Monstruosa en la Laguna del Campillo", min: 15.0, max: 28.0 },
            { n: "Black Bass Récord (Montaje Texas)", min: 3.0, max: 4.8 },
            { n: "Barbo Común Enorme a Casting", min: 5.0, max: 8.5 },
            { n: "Lucio Trofeo a Jerkbait", min: 8.0, max: 16.0 },
            { n: "Siluro Gigante", min: 40.0, max: 95.0 }
        ];
    } else if (reactionTime <= 380) {
        tierColor = "var(--accent)"; 
        tierMsg = "¡Buena clavada! ⚡";
        pool = [
            { n: "Black Bass de Alcorlo", min: 1.2, max: 2.8 },
            { n: "Barbo a Spinning", min: 1.0, max: 3.5 },
            { n: "Carpa Común", min: 2.5, max: 9.0 },
            { n: "Lucioperca", min: 1.5, max: 4.0 },
            { n: "Trucha Arcoíris", min: 1.0, max: 3.0 }
        ];
    } else if (reactionTime <= 500) {
        tierColor = "var(--text)"; 
        tierMsg = "Por los pelos... 💧";
        pool = [
            { n: "Black Bass 'llavero'", min: 0.1, max: 0.5 },
            { n: "Alburno despistado", min: 0.02, max: 0.15 },
            { n: "Percasol (Pez Sol)", min: 0.1, max: 0.35 },
            { n: "Cangrejo señal enganchado del lomo", min: 0.05, max: 0.1 },
            { n: "Tronco enorme lleno de algas", min: 0, max: 0 },
            { n: "Señuelo enganchado en un carro de la compra", min: 0, max: 0 }
        ];
    } else { 
        return null; 
    }

    const fish = pool[Math.floor(Math.random() * pool.length)];
    if (fish.max === 0) return { name: `${tierMsg} Enganchaste: ${fish.n}.`, color: tierColor };
    const weight = (Math.random() * (fish.max - fish.min) + fish.min).toFixed(2);
    return { name: `${tierMsg} ${fish.n} (${weight}kg)`, color: tierColor };
}

const btnFishAction = $("btn-fish-action");
if (btnFishAction) {
    btnFishAction.addEventListener("click", () => {
        const btn = $("btn-fish-action");
        const resultText = $("fish-result-text");

        if (fishState === "idle") {
            fishState = "waiting";
            btn.style.backgroundColor = "var(--bg3)";
            btn.style.color = "var(--text)";
            $("fish-btn-title").textContent = "ESPERANDO...";
            $("fish-btn-sub").textContent = "Atento a la puntera...";
            resultText.textContent = "";

            const randomWait = rand(2000, 6000); 
            fishTimeout = setTimeout(() => {
                fishState = "bite";
                biteStartTime = Date.now();
                btn.style.backgroundColor = "var(--danger)";
                $("fish-btn-title").textContent = "¡CLAVA!";
                $("fish-btn-sub").textContent = "¡HAZ CLIC YA!";
            }, randomWait);

        } else if (fishState === "waiting") {
            clearTimeout(fishTimeout);
            resultText.textContent = "¡Has tirado antes de la picada! 💦";
            resultText.style.color = "var(--text3)";
            
            fishState = "result";
            btn.style.backgroundColor = "var(--bg3)";
            btn.style.color = "var(--text)";
            $("fish-btn-title").textContent = "FALLO";
            $("fish-btn-sub").textContent = "Recogiendo...";
            
            fishRound++; 
            setTimeout(resetFishing, 2000);

        } else if (fishState === "bite") {
            const reactionTime = Date.now() - biteStartTime;
            $("fish-reaction-time").textContent = reactionTime + " ms";
            
            const caughtFish = getRandomCatch(reactionTime);

            if (caughtFish) {
                resultText.textContent = caughtFish.name;
                resultText.style.color = caughtFish.color;
                
                if (reactionTime <= 260) fishTotalScore += 20;
                else if (reactionTime <= 380) fishTotalScore += 10;
                else if (reactionTime <= 500) fishTotalScore += 5;
            } else {
                resultText.textContent = "Has sido muy lento. Escupió el señuelo. 🐟";
                resultText.style.color = "var(--danger)";
            }
            
            fishState = "result";
            btn.style.backgroundColor = "var(--bg3)";
            btn.style.color = "var(--text)";
            $("fish-btn-title").textContent = "RECOGIENDO";
            $("fish-btn-sub").textContent = "Preparando lance...";
            
            fishRound++;
            setTimeout(resetFishing, 3000);
        }
    });
}

// ─── 9. ARRANQUE DE LA APLICACIÓN ──────────────────────────────────────────
window.onload = () => {
    // Al iniciar, mostramos obligatoriamente el login
    showScreen("screen-auth");
    console.log("Sistema cargado y optimizado. ¡Listo para jugar!");
};

// ─── 10. SOPORTE DE TECLADO (Barra Espaciadora) ──────────────────────────
window.addEventListener("keydown", (e) => {
    if (e.code === "Space") {
        const timeGame = $("screen-time-game");
        const fishingGame = $("screen-fishing-game");

        if (timeGame && timeGame.classList.contains("active")) {
            e.preventDefault(); 
            $("btn-time-action").click(); 
        }
        else if (fishingGame && fishingGame.classList.contains("active")) {
            e.preventDefault(); 
            $("btn-fish-action").click(); 
        }
    }
});