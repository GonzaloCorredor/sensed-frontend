"use strict";
const $ = id => document.getElementById(id);
const rand = (a,b) => Math.floor(Math.random()*(b-a+1))+a;
const showToast = (msg,d=2200) => {const t=$("toast");if(t){t.textContent=msg;t.classList.add("show");setTimeout(()=>t.classList.remove("show"),d);}};

let score = parseInt(localStorage.getItem('sensed_fish_score')||'0');
const updateScore=(add=0)=>{score+=add;localStorage.setItem('sensed_fish_score',score);if($("nav-score"))$("nav-score").textContent=score+" pts";};
updateScore();

function showScreen(id){document.querySelectorAll(".screen").forEach(s=>s.classList.remove("active"));const t=$(id);if(t)t.classList.add("active");}

let fishState="idle",fishTimeout=null,biteStart=0,fishRound=0,fishTotal=0;

$("btn-fishing-start").addEventListener("click",()=>{fishRound=0;fishTotal=0;showScreen("screen-fishing-game");resetLance();});

function resetLance(){
    if(fishRound>=5){showToast(`¡Jornada terminada! +${fishTotal} pts`,3000);updateScore(fishTotal);showScreen("screen-fishing-home");fishState="idle";return;}
    $("fishing-round-num").textContent=fishRound+1;
    clearTimeout(fishTimeout);
    const btn=$("btn-fish-action");
    if(btn){btn.style.backgroundColor="#3b82f6";btn.style.color="#fff";}
    $("fish-btn-title").textContent="LANZAR CAÑA";
    $("fish-btn-sub").textContent="Haz clic para lanzar";
    $("fish-reaction-time").textContent="-- ms";
    $("fish-result-text").textContent="";
    fishState="idle";
}

function getCatch(ms){
    if(ms<=260)return{msg:"¡CLAVADÓN PERFECTO! 🔥",color:"var(--success)",pts:20,pool:[
        {n:"Carpa Royal Monstruosa",min:15,max:28},{n:"Siluro Gigante",min:40,max:95},
        {n:"Lucio Trofeo",min:8,max:16},{n:"Black Bass Récord",min:3,max:4.8}]};
    if(ms<=380)return{msg:"¡Buena clavada! ⚡",color:"var(--accent)",pts:10,pool:[
        {n:"Black Bass",min:1.2,max:2.8},{n:"Barbo",min:1,max:3.5},
        {n:"Carpa Común",min:2.5,max:9},{n:"Trucha Arcoíris",min:1,max:3}]};
    if(ms<=500)return{msg:"Por los pelos... 💧",color:"var(--text)",pts:5,pool:[
        {n:"Alburno despistado",min:0.02,max:0.15},{n:"Percasol",min:0.1,max:0.35},
        {n:"Señuelo en un carro de la compra",min:0,max:0}]};
    return null;
}

$("btn-fish-action").addEventListener("click",()=>{
    const btn=$("btn-fish-action"),res=$("fish-result-text");
    if(fishState==="idle"){
        fishState="waiting";
        btn.style.backgroundColor="var(--bg3)";btn.style.color="var(--text)";
        $("fish-btn-title").textContent="ESPERANDO...";
        $("fish-btn-sub").textContent="Atento a la puntera...";
        res.textContent="";
        fishTimeout=setTimeout(()=>{
            fishState="bite";biteStart=Date.now();
            btn.style.backgroundColor="var(--danger)";
            $("fish-btn-title").textContent="¡CLAVA!";
            $("fish-btn-sub").textContent="¡HAZ CLIC YA!";
        },rand(2000,6000));
    }else if(fishState==="waiting"){
        clearTimeout(fishTimeout);
        res.textContent="¡Has tirado antes de la picada! 💦";res.style.color="var(--text3)";
        fishState="result";btn.style.backgroundColor="var(--bg3)";btn.style.color="var(--text)";
        $("fish-btn-title").textContent="FALLO";$("fish-btn-sub").textContent="Recogiendo...";
        fishRound++;setTimeout(resetLance,2000);
    }else if(fishState==="bite"){
        const ms=Date.now()-biteStart;
        $("fish-reaction-time").textContent=ms+" ms";
        const c=getCatch(ms);
        if(c){
            const fish=c.pool[Math.floor(Math.random()*c.pool.length)];
            const txt=fish.max===0?`${c.msg} Enganchaste: ${fish.n}.`:`${c.msg} ${fish.n} (${(Math.random()*(fish.max-fish.min)+fish.min).toFixed(2)}kg)`;
            res.textContent=txt;res.style.color=c.color;fishTotal+=c.pts;
        }else{res.textContent="Demasiado lento. El pez escapó. 🐟";res.style.color="var(--danger)";}
        fishState="result";btn.style.backgroundColor="var(--bg3)";btn.style.color="var(--text)";
        $("fish-btn-title").textContent="RECOGIENDO";$("fish-btn-sub").textContent="Preparando lance...";
        fishRound++;setTimeout(resetLance,3000);
    }
});

window.addEventListener("keydown",e=>{if(e.code==="Space"){e.preventDefault();$("btn-fish-action").click();}});
