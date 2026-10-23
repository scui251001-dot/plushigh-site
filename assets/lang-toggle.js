// 言語切替・メールコピー（CSP 対応で外部化）
(function(){
  const r=document.documentElement,lj=document.getElementById("lj"),le=document.getElementById("le");
  function set(l){r.classList.toggle("en",l==="en");r.lang=l==="en"?"en":"ja";lj.setAttribute("aria-pressed",l!=="en");le.setAttribute("aria-pressed",l==="en");try{localStorage.setItem("ph-lang",l)}catch(_){}}
  let s="ja";try{s=localStorage.getItem("ph-lang")||"ja"}catch(_){}
  set(s);lj.onclick=()=>set("ja");le.onclick=()=>set("en");
  const cp=document.getElementById("cp");
  cp.onclick=()=>{const t=document.getElementById("mail").textContent;
    navigator.clipboard?.writeText(t).then(()=>{cp.textContent="Copied"},()=>{const g=document.createRange();g.selectNodeContents(document.getElementById("mail"));const sl=getSelection();sl.removeAllRanges();sl.addRange(g)});};
})();
