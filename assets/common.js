window.SURVEY = (function(){
  const QUESTIONS = [
    {key:"q1", text:"Have you ever heard about multispecies grass mixes before?", short:"Heard of multispecies"},
    {key:"q2", text:"Have you ever sown multispecies grass on your farm?", short:"Have sown it"},
    {key:"q3", text:"Are you planning on sowing multispecies grass in the near future?", short:"Planning to sow"},
    {key:"q4", text:"Would government grants make you more likely to sow multispecies grass?", short:"Grants would help"},
    {key:"q5", text:"Do you believe sowing multispecies grass could benefit grass farmers' productivity and sustainability?", short:"Believe it benefits"}
  ];
  // All 32 counties on the island of Ireland (must match the database check constraint)
  const COUNTIES = ["Antrim","Armagh","Carlow","Cavan","Clare","Cork","Derry","Donegal","Down","Dublin",
    "Fermanagh","Galway","Kerry","Kildare","Kilkenny","Laois","Leitrim","Limerick","Longford","Louth",
    "Mayo","Meath","Monaghan","Offaly","Roscommon","Sligo","Tipperary","Tyrone","Waterford","Westmeath",
    "Wexford","Wicklow"];
  const FARM_TYPES = ["Suckler beef","Beef finishing","Dairy","Sheep","Mixed livestock","Tillage","Other"];
  const COLLECTORS = ["Self-completed","Sean Monahan","Eamon Gill","Micheal Glennon","Charlie Minnock"];

  const $ = s => document.querySelector(s);
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));

  function client(){
    const c = window.SURVEY_CONFIG;
    if (!window.supabase || !c) return null;
    return window.supabase.createClient(c.supabaseUrl, c.supabaseKey, {auth:{persistSession:true, autoRefreshToken:true}});
  }

  function toast(msg){
    const t = $("#toast"); if (!t) return;
    t.textContent = msg; t.classList.add("show");
    clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove("show"), 2800);
  }

  // Decorative grass sward along the bottom of the masthead
  function sward(){
    const c = $("#sward"); if (!c) return;
    const ctx = c.getContext("2d");
    function draw(){
      const w = c.clientWidth, h = c.clientHeight, dpr = window.devicePixelRatio || 1;
      c.width = w*dpr; c.height = h*dpr; ctx.setTransform(dpr,0,0,dpr,0,0);
      const ground = getComputedStyle(document.body).backgroundColor;
      let s = 3; const r = () => (s = (s*16807) % 2147483647) / 2147483647;
      for (let i = 0, n = Math.floor(w/3.2); i < n; i++){
        const x = r()*w, bh = 14 + r()*30, lean = (r()-.5)*14;
        ctx.strokeStyle = ["#6FA23F","#8DBB57","#4F7F2C","#A8C96E"][Math.floor(r()*4)];
        ctx.globalAlpha = .55 + r()*.45; ctx.lineWidth = 1.2 + r()*1.3;
        ctx.beginPath(); ctx.moveTo(x,h); ctx.quadraticCurveTo(x+lean*.3,h-bh*.6,x+lean,h-bh); ctx.stroke();
        if (r() < .05){ ctx.globalAlpha = .9; ctx.fillStyle = r() < .5 ? "#F2F0E4" : "#D98AA8"; ctx.beginPath(); ctx.arc(x+lean,h-bh,2.4,0,7); ctx.fill(); }
      }
      ctx.globalAlpha = 1; ctx.fillStyle = ground; ctx.fillRect(0,h-6,w,6);
    }
    draw(); let t; addEventListener("resize", () => { clearTimeout(t); t = setTimeout(draw,150); });
    matchMedia("(prefers-color-scheme: dark)").addEventListener?.("change", draw);
  }

  return {QUESTIONS, COUNTIES, FARM_TYPES, COLLECTORS, $, esc, client, toast, sward};
})();
