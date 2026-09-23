(function(){
  const {QUESTIONS, $, esc, client, toast, sward} = window.SURVEY;
  const sb = client();
  const table = window.SURVEY_CONFIG.table;
  let responses = [], refreshTimer = null;

  sward();
  if (!sb){ $("#pageStatus").textContent = "Couldn't load the database library. Check your connection and reload."; return; }

  /* ---------- Auth ---------- */
  async function start(){
    const { data:{ session } } = await sb.auth.getSession();
    session ? enter(session) : showLogin();
  }
  function showLogin(){ $("#loginView").hidden = false; $("#dashView").hidden = true; stopTimer(); }

  $("#loginForm").addEventListener("submit", async e => {
    e.preventDefault();
    const email = $("#lEmail").value.trim(), password = $("#lPass").value;
    const err = $("#loginErr"), b = $("#loginBtn");
    if (!email || !password){ err.textContent = "Enter your email and password."; return; }
    b.disabled = true; b.textContent = "Signing in…"; err.textContent = "";
    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    b.disabled = false; b.textContent = "Sign in";
    if (error){ err.textContent = /invalid/i.test(error.message) ? "That email and password don't match. Try again." : error.message; return; }
    enter(data.session);
  });

  async function enter(session){
    const email = (session.user.email || "").toLowerCase();
    const { data, error } = await sb.from("grass_survey_admins").select("email").eq("email", email).maybeSingle();
    if (error || !data){
      await sb.auth.signOut();
      showLogin();
      $("#loginErr").textContent = `${email} isn't on the survey team list. Ask James to add it.`;
      return;
    }
    $("#loginView").hidden = true; $("#dashView").hidden = false;
    $("#who").textContent = "Signed in as " + email;
    await load();
    stopTimer();
    refreshTimer = setInterval(() => { if (document.visibilityState === "visible") load(true); }, 30000);
  }
  function stopTimer(){ if (refreshTimer) clearInterval(refreshTimer); refreshTimer = null; }

  $("#logoutBtn").addEventListener("click", async () => { await sb.auth.signOut(); responses = []; showLogin(); });
  $("#refreshBtn").addEventListener("click", () => load());
  sb.auth.onAuthStateChange((evt) => { if (evt === "SIGNED_OUT") showLogin(); });

  /* ---------- Data ---------- */
  async function load(quiet){
    const rows = [];
    for (let from = 0; ; from += 1000){
      const { data, error } = await sb.from(table).select("*").order("created_at", {ascending:false}).range(from, from+999);
      if (error){ if (!quiet) toast("Couldn't load responses"); console.error(error); return; }
      rows.push(...data);
      if (data.length < 1000) break;
    }
    responses = rows.map(r => ({
      id:r.id, createdAt:r.created_at, name:r.name || "", farmType:r.farm_type, county:r.county || "",
      collectedBy:r.collected_by, q1:yn(r.q1), q2:yn(r.q2), q3:yn(r.q3), q4:yn(r.q4), q5:yn(r.q5)
    }));
    render();
    if (!quiet) toast(`Loaded ${responses.length} response${responses.length === 1 ? "" : "s"}`);
  }
  const yn = b => b ? "yes" : "no";

  /* ---------- Sample data (only while there are no real responses) ---------- */
  const SAMPLE = (function(){
    const types = ["Suckler beef","Suckler beef","Beef finishing","Dairy","Dairy","Sheep","Mixed livestock","Tillage"];
    const who = ["Self-completed","Self-completed","Sean Monahan","Eamon Gill","Micheal Glennon","Charlie Minnock"];
    const counties = ["Offaly","Offaly","Offaly","Kildare","Westmeath","Laois","Meath","Kerry",""];
    let seed = 7; const rnd = () => (seed = (seed*9301+49297) % 233280) / 233280;
    const out = [];
    for (let i = 0; i < 36; i++){
      const t = types[Math.floor(rnd()*types.length)];
      const heard = rnd() < (t === "Dairy" ? .9 : .72), sown = heard && rnd() < .3;
      const plan = sown ? rnd() < .8 : heard ? rnd() < .45 : rnd() < .15;
      const d = new Date(); d.setDate(d.getDate() - Math.floor(rnd()*13)); d.setHours(9 + Math.floor(rnd()*9));
      out.push({id:"s"+i, name:"", farmType:t, county:counties[Math.floor(rnd()*counties.length)], collectedBy:who[i % who.length],
        createdAt:d.toISOString(), q1:yn(heard), q2:yn(sown), q3:yn(plan), q4:yn(rnd() < .74), q5:yn(rnd() < (heard ? .85 : .55))});
    }
    return out;
  })();

  /* ---------- Analytics ---------- */
  const pct = (a,b) => b ? Math.round(a/b*100) : 0;
  const yesCount = (rows,k) => rows.filter(r => r[k] === "yes").length;
  function barList(el, counts, color){
    const entries = Object.entries(counts).sort((a,b) => b[1]-a[1]);
    const max = Math.max(1, ...entries.map(e => e[1]));
    el.innerHTML = entries.length ? entries.map(([k,v]) =>
      `<div class="bar-row"><div class="bar-label"><b>${esc(k)}</b><span>${v}</span></div><div class="track"><div class="y" style="width:${v/max*100}%;background:${color}"></div></div></div>`).join("")
      : `<p class="empty">Nothing yet.</p>`;
  }

  function render(){
    const real = responses.length > 0, rows = real ? responses : SAMPLE, n = rows.length;
    $("#sampleBanner").hidden = real;
    $("#exportBtn").disabled = !real;

    const heard = yesCount(rows,"q1"), sown = yesCount(rows,"q2"), plan = yesCount(rows,"q3"), believe = yesCount(rows,"q5");
    $("#kpis").innerHTML = [
      [n, "Farmers surveyed"], [pct(heard,n)+"%", "Have heard of multispecies"],
      [pct(sown,n)+"%", "Have already sown it"], [pct(believe,n)+"%", "Believe it benefits farming"]
    ].map(([v,l]) => `<div class="kpi"><div class="v">${v}</div><div class="l">${l}</div></div>`).join("");

    $("#qbars").innerHTML = QUESTIONS.map((q,i) => {
      const y = yesCount(rows,q.key), p = pct(y,n), np = 100 - p;
      return `<div class="bar-row"><div class="bar-label"><b title="${esc(q.text)}">${i+1}. ${esc(q.short)}</b><span>${y} yes · ${n-y} no</span></div>
        <div class="track" role="img" aria-label="${p}% yes, ${np}% no">
          ${p ? `<div class="y" style="width:${p}%">${p >= 12 ? p+"%" : ""}</div>` : ""}${np ? `<div class="n" style="width:${np}%">${np >= 12 ? np+"%" : ""}</div>` : ""}
        </div></div>`;
    }).join("");

    $("#funnel").innerHTML = [["Heard of it",heard],["Planning to sow",plan],["Already sown",sown]]
      .map(([l,v]) => `<div class="fstep"><span>${l}</span><div class="ft"><i style="width:${pct(v,n)}%"></i></div><span class="pct">${pct(v,n)}%</span></div>`).join("");

    const notPlan = rows.filter(r => r.q3 === "no"), persuadable = notPlan.filter(r => r.q4 === "yes").length;
    const aware = rows.filter(r => r.q1 === "yes"), unaware = rows.filter(r => r.q1 === "no");
    const neverSown = rows.filter(r => r.q2 === "no");
    const ins = [];
    if (notPlan.length) ins.push(`<b>${pct(persuadable,notPlan.length)}%</b> of farmers not planning to sow say a government grant would make them more likely to — ${persuadable} of ${notPlan.length}.`);
    if (aware.length && unaware.length) ins.push(`Awareness matters: <b>${pct(yesCount(aware,"q3"),aware.length)}%</b> of farmers who had heard of multispecies plan to sow it, against <b>${pct(yesCount(unaware,"q3"),unaware.length)}%</b> of those who hadn't.`);
    if (neverSown.length) ins.push(`<b>${pct(yesCount(neverSown,"q5"),neverSown.length)}%</b> of farmers who have never sown multispecies still believe it could benefit productivity and sustainability.`);
    $("#insights").innerHTML = ins.length ? ins.map(t => `<li>${t}</li>`).join("") : `<li class="empty">Findings appear once responses come in.</li>`;

    const groups = {};
    rows.forEach(r => (groups[r.farmType] ||= []).push(r));
    const order = Object.keys(groups).sort((a,b) => groups[b].length - groups[a].length);
    $("#byType").innerHTML = `<thead><tr><th>Farm type</th><th>n</th>${QUESTIONS.map((q,i) => `<th title="${esc(q.text)}">Q${i+1}</th>`).join("")}</tr></thead><tbody>` +
      order.map(t => { const g = groups[t];
        return `<tr><td>${esc(t)}</td><td>${g.length}</td>${QUESTIONS.map(q => { const p = pct(yesCount(g,q.key), g.length);
          return `<td class="heat" style="background:color-mix(in srgb, var(--yes) ${Math.round(p*.55)}%, transparent);color:${p > 60 ? "var(--surface)" : "var(--ink)"}">${p}%</td>`; }).join("")}</tr>`; }).join("") + `</tbody>`;

    const byCounty = {}; rows.forEach(r => { if (r.county) byCounty[r.county] = (byCounty[r.county] || 0) + 1; });
    barList($("#byCounty"), byCounty, "var(--hay)");
    const byC = {}; rows.forEach(r => byC[r.collectedBy || "—"] = (byC[r.collectedBy || "—"] || 0) + 1);
    barList($("#byCollector"), byC, "var(--grass)");

    const days = [], today = new Date(); today.setHours(0,0,0,0);
    for (let i = 13; i >= 0; i--){ const d = new Date(today); d.setDate(d.getDate()-i); days.push({d, c:0}); }
    rows.forEach(r => { const d = new Date(r.createdAt); d.setHours(0,0,0,0); const hit = days.find(x => x.d.getTime() === d.getTime()); if (hit) hit.c++; });
    const max = Math.max(1, ...days.map(x => x.c));
    $("#days").innerHTML = days.map((x,i) => `<div class="d" style="height:${x.c/max*100}%" title="${x.d.toLocaleDateString('en-IE')}: ${x.c}">${x.c ? `<em>${x.c}</em>` : ""}${i % 2 === 1 || i === 13 ? `<span>${x.d.getDate()}/${x.d.getMonth()+1}</span>` : ""}</div>`).join("");

    const sorted = [...rows].sort((a,b) => String(b.createdAt).localeCompare(String(a.createdAt)));
    $("#rtable").innerHTML = `<thead><tr><th>Date</th><th>Name</th><th>Farm type</th><th>County</th>${QUESTIONS.map((_,i) => `<th>Q${i+1}</th>`).join("")}<th>Surveyed by</th>${real ? "<th></th>" : ""}</tr></thead><tbody>` +
      sorted.map(r => `<tr><td>${new Date(r.createdAt).toLocaleString('en-IE',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}</td><td>${esc(r.name) || '<span style="color:var(--ink-3)">Anonymous</span>'}</td><td>${esc(r.farmType)}</td><td>${esc(r.county) || "—"}</td>${QUESTIONS.map(q => `<td><span class="dot ${r[q.key] === "yes" ? "y" : "n"}">${r[q.key] === "yes" ? "Y" : "N"}</span></td>`).join("")}<td>${esc(r.collectedBy)}</td>${real ? `<td><button class="del" data-id="${esc(r.id)}" type="button">Delete</button></td>` : ""}</tr>`).join("") + `</tbody>`;
  }

  /* Delete with in-page confirmation */
  $("#rtable").addEventListener("click", async e => {
    const b = e.target.closest(".del"); if (!b) return;
    if (!b.classList.contains("confirm")){
      b.classList.add("confirm"); b.textContent = "Confirm";
      setTimeout(() => { if (b.isConnected){ b.classList.remove("confirm"); b.textContent = "Delete"; } }, 3500);
      return;
    }
    b.disabled = true;
    const { error } = await sb.from(table).delete().eq("id", b.dataset.id);
    if (error){ toast("Couldn't delete that response"); b.disabled = false; return; }
    responses = responses.filter(r => r.id !== b.dataset.id); render(); toast("Response deleted");
  });

  /* CSV export */
  $("#exportBtn").addEventListener("click", () => {
    if (!responses.length) return;
    const head = ["Date","Name","Farm type","County","Surveyed by", ...QUESTIONS.map((q,i) => `Q${i+1} ${q.text}`)];
    const q = v => `"${String(v ?? "").replace(/"/g,'""')}"`;
    const lines = [head.map(q).join(","), ...responses.map(r => [r.createdAt, r.name, r.farmType, r.county, r.collectedBy, ...QUESTIONS.map(x => r[x.key])].map(q).join(","))];
    const blob = new Blob(["﻿" + lines.join("\r\n")], {type:"text/csv;charset=utf-8"});
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `multispecies-survey-${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  });

  start();
})();
