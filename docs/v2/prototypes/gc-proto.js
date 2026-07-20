/* GreeCheck V2 prototype helpers — lab only, not production. */

/* Step router: show one .screen at a time */
function go(id){
  document.querySelectorAll(".screen").forEach(s=>{
    s.classList.remove("active","enter");
  });
  const el=document.getElementById(id);
  el.classList.add("active","enter");
  document.querySelectorAll(".steps button").forEach(b=>{
    b.classList.toggle("cur",b.dataset.step===id);
  });
  el.querySelectorAll("[data-countup]").forEach(runCount);
  el.querySelectorAll(".ring[data-score]").forEach(drawRing);
  el.querySelectorAll(".impact-bar i[data-w]").forEach(b=>{
    b.style.width="0"; requestAnimationFrame(()=>requestAnimationFrame(()=>b.style.width=b.dataset.w));
  });
}

const REDUCED=matchMedia("(prefers-reduced-motion: reduce)").matches;

/* Count-up numerals (skipped for low-confidence / reduced motion) */
function runCount(el){
  const to=+el.dataset.countup, from=+(el.dataset.from||0);
  if(REDUCED||el.dataset.noanim==="1"){el.textContent=to;return}
  const dur=Math.min(480,200+Math.abs(to-from)*6), t0=performance.now();
  (function tick(t){
    const p=Math.min(1,(t-t0)/dur), e=1-Math.pow(1-p,3);
    el.textContent=Math.round(from+(to-from)*e);
    if(p<1)requestAnimationFrame(tick);
  })(t0);
}

/* Score ring: SVG stroke draw */
const GRADE_COLOR={a:"#16A34A",b:"#84CC16",c:"#EAB308",d:"#F97316",e:"#EF4444"};
function drawRing(el){
  const score=+el.dataset.score, grade=el.dataset.grade,
        size=+(el.dataset.size||128), sw=Math.round(size*0.09),
        r=(size-sw)/2, c=2*Math.PI*r;
  el.innerHTML=
   `<svg width="${size}" height="${size}" aria-hidden="true">
      <circle class="track" cx="${size/2}" cy="${size/2}" r="${r}" fill="none" stroke-width="${sw}"/>
      <circle class="fill" cx="${size/2}" cy="${size/2}" r="${r}" fill="none"
        stroke="${GRADE_COLOR[grade]}" stroke-width="${sw}"
        stroke-dasharray="${c}" stroke-dashoffset="${c}"/>
    </svg>
    <div class="val"><b style="font-size:${size*0.3}px" data-countup="${score}" ${el.dataset.noanim?'data-noanim="1"':""}></b>
    <span>/100</span></div>`;
  const fill=el.querySelector(".fill");
  requestAnimationFrame(()=>requestAnimationFrame(()=>{
    fill.style.strokeDashoffset=REDUCED?c*(1-score/100):c*(1-score/100);
  }));
  runCount(el.querySelector("[data-countup]"));
}

/* Bottom sheet with natural drag gesture */
function sheetCtl(sheetId,scrimId){
  const sh=document.getElementById(sheetId), sc=document.getElementById(scrimId);
  let y0=0,dy=0,drag=false;
  const open=()=>{sh.classList.add("on");sc.classList.add("on");sh.style.transform=""};
  const close=()=>{sh.classList.remove("on","dragging");sc.classList.remove("on");sh.style.transform=""};
  sc.addEventListener("click",close);
  sh.addEventListener("pointerdown",e=>{
    if(sh.querySelector(".sheet-body").scrollTop>0&&e.target.closest(".sheet-body"))return;
    drag=true;y0=e.clientY;dy=0;sh.classList.add("dragging");sh.setPointerCapture(e.pointerId);
  });
  sh.addEventListener("pointermove",e=>{
    if(!drag)return; dy=Math.max(0,e.clientY-y0);
    sh.style.transform=`translateY(${dy}px)`;
  });
  const up=()=>{
    if(!drag)return; drag=false; sh.classList.remove("dragging");
    if(dy>110)close(); else sh.style.transform="";
  };
  sh.addEventListener("pointerup",up); sh.addEventListener("pointercancel",up);
  addEventListener("keydown",e=>{if(e.key==="Escape")close()});
  return{open,close};
}

/* Success beat: one glow pulse that decays */
function beat(el){
  if(REDUCED)return;
  el.classList.add("success-beat");
  setTimeout(()=>el.classList.remove("success-beat"),480);
}
