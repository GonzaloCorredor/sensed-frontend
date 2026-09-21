"use strict";
const $ = id => document.getElementById(id);
const rand = (a,b) => Math.floor(Math.random()*(b-a+1))+a;
const showToast = (msg,d=2200) => {const t=$("toast");if(t){t.textContent=msg;t.classList.add("show");setTimeout(()=>t.classList.remove("show"),d);}};

let score = parseInt(localStorage.getItem('sensed_time_score')||'0');
const updateScore=(add=0)=>{score+=add;localStorage.setItem('sensed_time_score',score);if($("nav-score"))$("nav-score").textContent=score+" pts";};
updateScore();

function showScreen(id){document.querySelectorAll(".screen").forEach(s=>s.classList.remove("active"));const t=$(id);if(t)t.classList.add("active");}

// ── AUTH ──────────────────────────────────────────────
const baseUrl = "https://sensed-production.up.railway.app/api/auth";
let isLoginMode = true;
let currentUser = null;
const saved = localStorage.getItem("sensed_user");
if (saved) { currentUser = JSON.parse(saved); }

function showAuthIfNeeded(onSuccess) {
    if (currentUser) { onSuccess(); return; }
    showScreen("screen-auth");
    window._authCallback = onSuccess;
}

const btnToggle = $("btn-auth-toggle");
if (btnToggle) btnToggle.addEventListener("click", e => {
    e.preventDefault(); isLoginMode = !isLoginMode;
    $("auth-title") && ($("auth-title").textContent = isLoginMode ? "Iniciar Sesión" : "Crear Cuenta");
    $("btn-auth-submit").textContent = isLoginMode ? "ENTRAR" : "REGISTRARSE";
    $("auth-toggle-text").textContent = isLoginMode ? "¿No tienes cuenta?" : "¿Ya tienes cuenta?";
    btnToggle.textContent = isLoginMode ? "Regístrate" : "Inicia sesión";
});

const btnSubmit = $("btn-auth-submit");
if (btnSubmit) btnSubmit.addEventListener("click", async e => {
    e.preventDefault();
    const u = $("auth-username").value.trim(), p = $("auth-password").value.trim();
    if (!u || !p) { alert("Rellena todos los campos."); return; }
    try {
        const r = await fetch(`${baseUrl}/${isLoginMode ? "login" : "registro"}`, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username: u, password: p })
        });
        if (r.ok) {
            currentUser = { username: u, isGuest: false };
            localStorage.setItem("sensed_user", JSON.stringify(currentUser));
            showScreen("screen-time-home");
            if (window._authCallback) { window._authCallback(); window._authCallback = null; }
        } else { alert("Usuario o contraseña incorrectos."); }
    } catch { alert("Error de conexión."); }
});

const btnGuest = $("btn-guest");
if (btnGuest) btnGuest.addEventListener("click", () => {
    currentUser = { username: "Invitado_" + rand(1000, 9999), isGuest: true };
    showScreen("screen-time-home");
    if (window._authCallback) { window._authCallback(); window._authCallback = null; }
});
// ── FIN AUTH ──────────────────────────────────────────

let timeTarget=0,timeStart=0,timeState="waiting",timeTimeout,timeRound=0,timeTotal=0;

$("btn-time-start").addEventListener("click",()=>{
    showAuthIfNeeded(() => {
        timeRound=0;timeTotal=0;showScreen("screen-time-game");initRound();
    });
});

function initRound(){
    if(timeRound>=5){showToast(`¡Terminado! +${timeTotal} pts`,3000);updateScore(timeTotal);showScreen("screen-time-home");return;}
    $("time-round-num").textContent=timeRound+1;
    clearTimeout(timeTimeout);
    timeTarget=rand(1500,5500);
    $("time-target").textContent=(timeTarget/1000).toFixed(2)+"s";
    $("time-result-text").textContent="";
    const btn=$("btn-time-action");
    btn.style.backgroundColor="var(--accent)";btn.style.color="#000";
    $("time-btn-title").textContent="EMPEZAR";
    $("time-btn-sub").textContent="Haz clic para iniciar";
    timeState="waiting";
}

$("btn-time-action").addEventListener("click",()=>{
    const btn=$("btn-time-action"),res=$("time-result-text");
    if(timeState==="waiting"){
        timeStart=Date.now();timeState="running";
        btn.style.backgroundColor="var(--danger)";btn.style.color="#fff";
        $("time-btn-title").textContent="DETENER";
        $("time-btn-sub").textContent="Haz clic para parar";
        res.textContent="Contando...";res.style.color="var(--text2)";
    }else if(timeState==="running"){
        const elapsed=Date.now()-timeStart;timeState="result";
        const diff=elapsed-timeTarget,abs=Math.abs(diff);
        const str=(diff>0?"+":"")+(diff/1000).toFixed(2)+"s";
        btn.style.backgroundColor="var(--bg3)";btn.style.color="var(--text)";
        $("time-btn-title").textContent=(elapsed/1000).toFixed(2)+"s";
        $("time-btn-sub").textContent="Tu tiempo";
        let pts=0;
        if(abs<=50){res.textContent=`¡PERFECTO! (${str}) 🔥`;res.style.color="var(--success)";pts=20;}
        else if(abs<=200){res.textContent=`¡Muy preciso! (${str}) ⚡`;res.style.color="var(--accent)";pts=10;}
        else{res.textContent=`Demasiado lejos (${str}) 💀`;res.style.color="var(--danger)";}
        timeTotal+=pts;timeRound++;
        timeTimeout=setTimeout(initRound,2500);
    }
});

window.addEventListener("keydown",e=>{if(e.code==="Space"){e.preventDefault();$("btn-time-action").click();}});
