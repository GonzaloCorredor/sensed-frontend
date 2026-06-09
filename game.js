"use strict";

/* ============================================================
   SENSED.GG — game.js (ESTRUCTURA UNIFICADA Y CORREGIDA)
   ============================================================ */

// 1. GESTIÓN DE PUNTUACIONES (PERSISTENTES HASTA CERRAR PESTAÑA)
let gameScores = JSON.parse(sessionStorage.getItem('sensedScores')) || {
    color: 0,
    sound: 0,
    time: 0,
    fishing: 0
};

function addPoints(mode, points) {
    gameScores[mode] += points;
    sessionStorage.setItem('sensedScores', JSON.stringify(gameScores));
    updateScoreUI(mode);
}

function updateScoreUI(mode) {
    const scoreElement = document.getElementById('nav-score');
    if (scoreElement) {
        scoreElement.innerText = `${Math.round(gameScores[mode])} pts`;
    }
}

// 2. UTILIDADES Y GESTIÓN DE PANTALLAS
const $ = (id) => document.getElementById(id);

function showScreen(id) {
    document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
    const target = $(id);
    if (target) target.classList.add("active");
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

// 3. ESTADO GLOBAL
const state = {
    colors: [], currentColorIndex: 0, colorScores: [], timerTimeout: null,
};

// 4. AUTENTICACIÓN
const authUsernameInput = $("auth-username");
const authPasswordInput = $("auth-password");
const btnAuthSubmit = $("btn-auth-submit");
const btnAuthToggle = $("btn-auth-toggle");
const authTitle = $("auth-title");
const authToggleText = $("auth-toggle-text");

let isLoginMode = true;

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

const baseUrl = "https://sensed-production.up.railway.app/api/auth";

if (btnAuthSubmit) {
    btnAuthSubmit.addEventListener('click', async (e) => {
        e.preventDefault();
        const username = authUsernameInput.value.trim();
        const password = authPasswordInput.value.trim();
        if (!username || !password) { alert("Rellena todos los campos."); return; }
        const endpoint = isLoginMode ? `${baseUrl}/login` : `${baseUrl}/registro`;
        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            if (response.ok) {
                document.getElementById('screen-auth').classList.remove('active');
                document.getElementById('screen-home').classList.add('active');
                document.getElementById('main-nav').style.display = 'flex';
                updateScoreUI('color'); // Inicializar con puntos de color
            } else {
                alert("Usuario o contraseña incorrectos.");
            }
        } catch (error) {
            alert("Error al conectar con el servidor.");
        }
    });
}

// 5. NAVEGACIÓN
document.querySelectorAll(".nav-btn").forEach(btn => {
    btn.addEventListener("click", () => {
        document.querySelectorAll(".nav-btn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        
        stopUserTone();
        if(typeof fishState !== "undefined" && fishState !== "idle") resetFishing();
        
        const mode = btn.dataset.mode;
        updateScoreUI(mode); // Actualizar score al cambiar modo
        
        const screens = { 
            color: "screen-home", 
            sound: "screen-sound-home", 
            time: "screen-time-home",
            fishing: "screen-fishing-home"
        };
        showScreen(screens[mode] || "screen-home");
    });
});

// 6. MODO COLOR
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
        showNextColorMemorize();
    });
}

function showNextColorMemorize() {
    const idx = state.currentColorIndex;
    if (idx >= state.colors.length) { showColorFinal(); return; }
    $("color-round-num").textContent = idx + 1;
    $("color-display").style.backgroundColor = hslStr(state.colors[idx]);
    showScreen("screen-color-memorize");
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

function updateColorPreview() { 
    const p = $("color-preview-box");
    if (p) p.style.backgroundColor = hslStr({ h: $("slider-h").value, s: $("slider-s").value, l: $("slider-l").value }); 
}

["slider-h", "slider-s", "slider-l"].forEach(id => {
    $(id)?.addEventListener("input", () => {
        $("val-h").textContent = $("slider-h").value; 
        $("val-s").textContent = $("slider-s").value; 
        $("val-l").textContent = $("slider-l").value;
        updateColorPreview();
    });
});

$("btn-color-confirm")?.addEventListener("click", () => {
    const sc = colorScore(state.colors[state.currentColorIndex], { h: $("slider-h").value, s: $("slider-s").value, l: $("slider-l").value });
    addPoints('color', sc * 10); // ACUMULACIÓN DE PUNTOS
    
    $("result-original").style.backgroundColor = hslStr(state.colors[state.currentColorIndex]);
    $("result-guess").style.backgroundColor = hslStr({ h: $("slider-h").value, s: $("slider-s").value, l: $("slider-l").value });
    $("result-score-big").textContent = sc.toFixed(1);
    showScreen("screen-color-result");
});

$("btn-next-color")?.addEventListener("click", () => { state.currentColorIndex++; showNextColorMemorize(); });

function showColorFinal() {
    showScreen("screen-final");
    $("final-score-big").textContent = gameScores.color.toFixed(0);
}

// 7. MODO SONIDO
let audioCtx, currentTargetFreq, userOsc, userGain, soundRound;
const instruments = [{ name: "Diapasón", icon: "🥢", type: "sine", min: 250, max: 500 }, { name: "Bajo", icon: "🎸", type: "triangle", min: 80, max: 250 }, { name: "Saxofón", icon: "🎷", type: "sawtooth", min: 200, max: 800 }, { name: "Sintetizador", icon: "🎹", type: "square", min: 300, max: 900 }, { name: "Flauta", icon: "🪈", type: "sine", min: 500, max: 1200 }];

function initAudio() { if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)(); }

$("btn-sound-start")?.addEventListener("click", () => { soundRound = 0; showScreen("screen-sound-game"); loadSoundRound(); });

function loadSoundRound() {
    if (soundRound >= 5) { showScreen("screen-sound-home"); return; }
    const inst = instruments[soundRound];
    $("sound-round-num").textContent = soundRound + 1;
    $("sound-name").textContent = inst.name;
    $("slider-hz").min = inst.min; $("slider-hz").max = inst.max;
    currentTargetFreq = Math.round(rand(inst.min, inst.max));
}

$("btn-sound-play")?.addEventListener("click", () => {
    initAudio();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = instruments[soundRound].type;
    osc.frequency.value = currentTargetFreq;
    osc.connect(gain); gain.connect(audioCtx.destination);
    osc.start(); osc.stop(audioCtx.currentTime + 1);
});

$("btn-sound-confirm")?.addEventListener("click", () => {
    const diff = Math.abs(currentTargetFreq - parseInt($("slider-hz").value));
    let pts = diff === 0 ? 20 : (diff <= 10 ? 10 : (diff <= 30 ? 5 : 0));
    addPoints('sound', pts); // ACUMULACIÓN DE PUNTOS
    soundRound++;
    loadSoundRound();
});

// 8. MODO TIEMPO
let timeTarget, timeStart, timeRound;
$("btn-time-start")?.addEventListener("click", () => { timeRound = 0; showScreen("screen-time-game"); nextTimeRound(); });

function nextTimeRound() {
    if (timeRound >= 5) { showScreen("screen-time-home"); return; }
    timeTarget = rand(1500, 5500);
    $("time-target").textContent = (timeTarget / 1000).toFixed(2) + "s";
    $("time-btn-title").textContent = "EMPEZAR";
    $("btn-time-action").dataset.state = "waiting";
}

$("btn-time-action")?.addEventListener("click", (e) => {
    const state = e.currentTarget.dataset.state;
    if (state === "waiting") {
        timeStart = Date.now();
        e.currentTarget.dataset.state = "running";
        $("time-btn-title").textContent = "DETENER";
    } else {
        const diff = Math.abs((Date.now() - timeStart) - timeTarget);
        let pts = diff <= 50 ? 20 : (diff <= 200 ? 10 : 0);
        addPoints('time', pts); // ACUMULACIÓN DE PUNTOS
        timeRound++;
        nextTimeRound();
    }
});

// 9. MODO PESCA
let fishRound, fishState = "idle", biteStartTime;
$("btn-fishing-start")?.addEventListener("click", () => { fishRound = 0; showScreen("screen-fishing-game"); resetFishing(); });

function resetFishing() {
    if (fishRound >= 5) { showScreen("screen-fishing-home"); return; }
    fishState = "idle";
    $("fish-btn-title").textContent = "LANZAR";
}

$("btn-fish-action")?.addEventListener("click", () => {
    if (fishState === "idle") {
        fishState = "waiting";
        $("fish-btn-title").textContent = "ESPERANDO...";
        setTimeout(() => { fishState = "bite"; biteStartTime = Date.now(); $("fish-btn-title").textContent = "¡CLAVA!"; }, rand(2000, 5000));
    } else if (fishState === "bite") {
        let pts = (Date.now() - biteStartTime) <= 300 ? 20 : 10;
        addPoints('fishing', pts); // ACUMULACIÓN DE PUNTOS
        fishRound++;
        resetFishing();
    }
});

window.onload = () => showScreen("screen-auth");

// ─── 10. GESTIÓN RESPONSIVE Y ORIENTACIÓN ──────────────────────────────────
// Esta función detecta si el usuario está en móvil y ajusta elementos dinámicamente
function checkResponsive() {
    const isMobile = window.innerWidth <= 768;
    
    // Si quieres hacer algo especial cuando es móvil
    if (isMobile) {
        // Ejemplo: Si el juego requiere pantalla horizontal, avisamos
        if (window.innerHeight > window.innerWidth) {
            // Podrías mostrar un toast avisando que giren el móvil
            // showToast("¡Gira el móvil para jugar mejor!");
        }
    }
}

// Escuchar cambios de tamaño de pantalla en tiempo real
window.addEventListener('resize', () => {
    checkResponsive();
});

// Ejecutar al cargar la página
window.addEventListener('DOMContentLoaded', checkResponsive);