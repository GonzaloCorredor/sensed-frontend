"use strict";
const $ = id => document.getElementById(id);
const rand = (a,b) => Math.floor(Math.random()*(b-a+1))+a;
const showToast = (msg,d=2200) => {const t=$("toast");if(t){t.textContent=msg;t.classList.add("show");setTimeout(()=>t.classList.remove("show"),d);}};

let score = parseInt(localStorage.getItem('sensed_sound_score')||'0');
const updateScore=(add=0)=>{score+=add;localStorage.setItem('sensed_sound_score',score);if($("nav-score"))$("nav-score").textContent=score+" pts";};
updateScore();

function showScreen(id){document.querySelectorAll(".screen").forEach(s=>s.classList.remove("active"));const t=$(id);if(t)t.classList.add("active");}

let audioCtx=null,userOsc=null,currentTargetFreq=0,soundRound=0,soundTotal=0,soundListens=0;
const instruments=[
    {name:"Diapasón Clásico",icon:"🥢",type:"sine",min:250,max:500,desc:"Onda pura. Busca la claridad perfecta."},
    {name:"Bajo Eléctrico",icon:"🎸",type:"triangle",min:80,max:250,desc:"Frecuencias graves. Siente la vibración."},
    {name:"Saxofón Alto",icon:"🎷",type:"sawtooth",min:200,max:800,desc:"Ajusta la embocadura y la caña."},
    {name:"Sintetizador Analógico",icon:"🎹",type:"square",min:300,max:900,desc:"Sonido de 8-bits. Pura energía retro."},
    {name:"Flauta Travesera",icon:"🪈",type:"sine",min:500,max:1200,desc:"Sonido agudo y cristalino."}
];

function initAudio(){if(!audioCtx)audioCtx=new(window.AudioContext||window.webkitAudioContext)();if(audioCtx.state==="suspended")audioCtx.resume();}
function stopUserTone(){if(userOsc){userOsc.stop();userOsc.disconnect();userOsc=null;}}

$("btn-sound-start").addEventListener("click",()=>{soundRound=0;soundTotal=0;showScreen("screen-sound-game");loadRound();});

function loadRound(){
    if(soundRound>=5){showToast(`¡Terminado! +${soundTotal} pts`,3000);updateScore(soundTotal);showScreen("screen-sound-home");return;}
    const inst=instruments[soundRound];
    $("sound-round-num").textContent=soundRound+1;
    $("sound-icon").textContent=inst.icon;
    $("sound-name").textContent=inst.name;
    $("sound-desc").textContent=inst.desc;
    currentTargetFreq=0;soundListens=0;
    const pb=$("btn-sound-play");
    if(pb){pb.textContent="ESCUCHAR OBJETIVO (3/3)";pb.style.opacity="1";pb.style.pointerEvents="auto";}
    $("slider-hz").min=inst.min;$("slider-hz").max=inst.max;
    $("slider-hz").value=Math.floor((inst.min+inst.max)/2);
    $("sound-val").textContent=$("slider-hz").value;
    stopUserTone();
}

$("btn-sound-play").addEventListener("click",()=>{
    if(soundListens>=3){showToast("¡Sin escuchas disponibles!");return;}
    const inst=instruments[soundRound];
    if(!currentTargetFreq)currentTargetFreq=Math.round(rand(inst.min,inst.max));
    initAudio();
    const osc=audioCtx.createOscillator(),gain=audioCtx.createGain();
    osc.type=inst.type;osc.frequency.value=currentTargetFreq;
    gain.gain.setValueAtTime(0,audioCtx.currentTime);
    gain.gain.linearRampToValueAtTime(0.1,audioCtx.currentTime+0.05);
    gain.gain.setValueAtTime(0.1,audioCtx.currentTime+1.0);
    gain.gain.linearRampToValueAtTime(0,audioCtx.currentTime+1.2);
    osc.connect(gain);gain.connect(audioCtx.destination);osc.start();osc.stop(audioCtx.currentTime+1.2);
    soundListens++;
    const rem=3-soundListens;
    const pb=$("btn-sound-play");
    if(rem>0){pb.textContent=`ESCUCHAR OBJETIVO (${rem}/3)`;showToast(`Te quedan ${rem} escuchas`);}
    else{pb.textContent="SIN ESCUCHAS DISPONIBLES";pb.style.opacity="0.5";pb.style.pointerEvents="none";showToast("Última escucha. ¡Concéntrate!");}
});

$("slider-hz").addEventListener("input",e=>{
    const freq=e.target.value;$("sound-val").textContent=freq;
    initAudio();
    if(!userOsc){const inst=instruments[soundRound];userOsc=audioCtx.createOscillator();const g=audioCtx.createGain();userOsc.type=inst.type;userOsc.frequency.value=freq;g.gain.setValueAtTime(0.1,audioCtx.currentTime);userOsc.connect(g);g.connect(audioCtx.destination);userOsc.start();}
    else userOsc.frequency.setValueAtTime(freq,audioCtx.currentTime);
});
["change","mouseup","touchend"].forEach(ev=>$("slider-hz").addEventListener(ev,stopUserTone));

$("btn-sound-confirm").addEventListener("click",()=>{
    if(!currentTargetFreq)return showToast("¡Primero escucha el objetivo!");
    const diff=Math.abs(currentTargetFreq-parseInt($("slider-hz").value));
    let pts=0;
    if(diff===0){pts=20;showToast(`¡CLAVADO! ${currentTargetFreq} Hz 🔥`,2500);}
    else if(diff<=10){pts=10;showToast(`¡Casi! Era ${currentTargetFreq} Hz ⚡`,2500);}
    else if(diff<=30){pts=5;showToast(`Se fue. Era ${currentTargetFreq} Hz 🫤`,2500);}
    else showToast(`Desafinado. Era ${currentTargetFreq} Hz 💀`,2500);
    soundTotal+=pts;soundRound++;
    setTimeout(loadRound,2600);
});
