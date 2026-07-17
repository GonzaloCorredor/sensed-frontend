"use strict";
const $ = id => document.getElementById(id);
const rand = (a,b) => Math.floor(Math.random()*(b-a+1))+a;
const showToast = (msg, d=2200) => { const t=$("toast"); if(t){t.textContent=msg;t.classList.add("show");setTimeout(()=>t.classList.remove("show"),d);} };

// Puntuación local
let score = parseInt(localStorage.getItem('sensed_color_score')||'0');
const updateScore = (add=0) => { score+=add; localStorage.setItem('sensed_color_score',score); if($("nav-score")) $("nav-score").textContent=score+" pts"; };
updateScore();

// Auth
const baseUrl = "https://sensed-production.up.railway.app/api/auth";
let isLoginMode = true;
let currentUser = null;

function showScreen(id) {
    document.querySelectorAll(".screen").forEach(s=>s.classList.remove("active"));
    const t=$(id); if(t) t.classList.add("active");
}

// Detectar si hay sesión guardada
const saved = localStorage.getItem('sensed_user');
if(saved) { currentUser = JSON.parse(saved); showScreen("screen-home"); }

const btnToggle = $("btn-auth-toggle");
if(btnToggle) btnToggle.addEventListener("click", e => {
    e.preventDefault(); isLoginMode=!isLoginMode;
    $("auth-title") && ($("auth-title").textContent = isLoginMode?"Iniciar Sesión":"Crear Cuenta");
    $("btn-auth-submit").textContent = isLoginMode?"ENTRAR":"REGISTRARSE";
    $("auth-toggle-text").textContent = isLoginMode?"¿No tienes cuenta?":"¿Ya tienes cuenta?";
    btnToggle.textContent = isLoginMode?"Regístrate":"Inicia sesión";
});

const btnSubmit = $("btn-auth-submit");
if(btnSubmit) btnSubmit.addEventListener("click", async e => {
    e.preventDefault();
    const u=$("auth-username").value.trim(), p=$("auth-password").value.trim();
    if(!u||!p){alert("Rellena todos los campos.");return;}
    try{
        const r=await fetch(`${baseUrl}/${isLoginMode?"login":"registro"}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({username:u,password:p})});
        if(r.ok){currentUser={username:u,isGuest:false};localStorage.setItem('sensed_user',JSON.stringify(currentUser));showScreen("screen-home");}
        else alert("Usuario o contraseña incorrectos.");
    }catch{alert("Error de conexión.");}
});

const btnGuest = $("btn-guest");
if(btnGuest) btnGuest.addEventListener("click",()=>{
    currentUser={username:"Invitado_"+rand(1000,9999),isGuest:true};
    showScreen("screen-home");
});

// Juego
const state={colors:[],idx:0,scores:[],total:0,timer:null};
function randomColor(){return{h:rand(0,360),s:rand(30,95),l:rand(25,75)};}
function hsl({h,s,l}){return `hsl(${h},${s}%,${l}%)`;}
function colorScore(o,g){
    const dh=Math.min(Math.abs(o.h-g.h),360-Math.abs(o.h-g.h))/180;
    const ds=Math.abs(o.s-g.s)/100, dl=Math.abs(o.l-g.l)/100;
    return Math.max(0,Math.round((10-Math.sqrt(dh*dh*4+ds*ds+dl*dl)*7)*10)/10);
}
function updatePreview(){const b=$("color-preview-box");if(b)b.style.backgroundColor=hsl(getGuess());}
function getGuess(){return{h:+$("slider-h").value,s:+$("slider-s").value,l:+$("slider-l").value};}

$("btn-start").addEventListener("click",()=>{
    if(!currentUser){showScreen("screen-auth");return;}
    state.colors=Array.from({length:5},randomColor);
    state.idx=0;state.scores=[];state.total=0;
    doMemorize();
});

function doMemorize(){
    if(state.idx>=5){doFinal();return;}
    $("color-round-num").textContent=state.idx+1;
    $("color-display").style.backgroundColor=hsl(state.colors[state.idx]);
    showScreen("screen-color-memorize");
    const bar=$("timer-bar");
    if(bar){bar.style.transition="none";bar.style.width="100%";requestAnimationFrame(()=>requestAnimationFrame(()=>{bar.style.transition="width 4000ms linear";bar.style.width="0%";}));}
    clearTimeout(state.timer);
    state.timer=setTimeout(()=>doGuess(state.idx),4000);
}
function doGuess(idx){
    $("color-guess-num").textContent=idx+1;
    const h=rand(0,360),s=rand(20,80),l=rand(30,70);
    $("slider-h").value=h;$("slider-s").value=s;$("slider-l").value=l;
    $("val-h").textContent=h;$("val-s").textContent=s;$("val-l").textContent=l;
    updatePreview();showScreen("screen-color-guess");
}
["slider-h","slider-s","slider-l"].forEach(id=>{const el=$(id);if(el)el.addEventListener("input",()=>{$("val-h").textContent=$("slider-h").value;$("val-s").textContent=$("slider-s").value;$("val-l").textContent=$("slider-l").value;updatePreview();});});

$("btn-color-confirm").addEventListener("click",()=>{
    const orig=state.colors[state.idx], guess=getGuess(), sc=colorScore(orig,guess);
    state.scores.push({orig,guess,sc});state.total+=sc;
    updateScore(Math.round(sc*10));
    $("result-original").style.backgroundColor=hsl(orig);
    $("result-guess").style.backgroundColor=hsl(guess);
    $("result-score-big").textContent=sc.toFixed(1);
    $("result-comment").textContent=sc>=8?"¡Muy bien! ⚡":sc>=5?"Cerca... 🫤":"Qué lejos 💀";
    showScreen("screen-color-result");
});
$("btn-next-color").addEventListener("click",()=>{state.idx++;doMemorize();});

function doFinal(){
    $("final-score-big").textContent=(state.total*10).toFixed(0);
    $("final-grade").textContent=state.total>=40?"Ojo de artista 🎨":"Buen intento 👍";
    const c=$("final-swatches");if(c)c.innerHTML="";
    state.scores.forEach(({orig,guess,sc})=>{
        const d=document.createElement("div");
        d.innerHTML=`<div style="display:flex;justify-content:center;gap:.5rem;align-items:center;margin-bottom:.5rem;"><div style="background:${hsl(orig)};width:30px;height:30px;border-radius:4px;"></div><div style="background:${hsl(guess)};width:30px;height:30px;border-radius:4px;"></div><span style="color:var(--text);font-weight:700;">${sc.toFixed(1)}</span></div>`;
        if(c)c.appendChild(d);
    });
    showScreen("screen-final");
}
$("btn-play-again").addEventListener("click",()=>showScreen("screen-home"));
