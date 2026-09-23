(function(){
  const {QUESTIONS, COUNTIES, FARM_TYPES, COLLECTORS, $, esc, client, toast, sward} = window.SURVEY;
  const sb = client();
  const table = window.SURVEY_CONFIG.table;
  const form = $("#survey"), status = $("#formStatus"), btn = $("#submitBtn");

  const tick = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8.5l3.2 3L13 4.5"/></svg>';
  const cross = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M4 4l8 8M12 4l-8 8"/></svg>';

  // Build selects
  $("#fType").innerHTML = '<option value="">Select…</option>' + FARM_TYPES.map(t => `<option>${esc(t)}</option>`).join("");
  $("#fCounty").innerHTML = '<option value="">Select county…</option>' + COUNTIES.map(c => `<option>${esc(c)}</option>`).join("");
  $("#fBy").innerHTML = COLLECTORS.map(c => `<option>${esc(c)}</option>`).join("");
  $("#fBy").value = "Self-completed";

  // Build questions
  $("#qlist").innerHTML = QUESTIONS.map((q,i) => `
    <fieldset class="q" id="row-${q.key}" style="border:0;margin:0;min-width:0">
      <legend class="sr-only">${i+1}. ${esc(q.text)}</legend>
      <div class="qn" aria-hidden="true">${i+1}</div>
      <div class="qt" aria-hidden="true">${esc(q.text)}</div>
      <div class="yn">
        <input type="radio" id="${q.key}-y" name="${q.key}" value="yes"><label for="${q.key}-y">${tick}Yes</label>
        <input type="radio" id="${q.key}-n" name="${q.key}" value="no"><label for="${q.key}-n">${cross}No</label>
      </div>
    </fieldset>`).join("");
  form.querySelectorAll(".yn input").forEach(r => r.addEventListener("change", e => e.target.closest(".q").classList.remove("missing")));
  $("#fType").addEventListener("change", e => e.target.style.borderColor = "");

  form.addEventListener("submit", async e => {
    e.preventDefault();
    const missing = QUESTIONS.filter(q => {
      const ok = form.querySelector(`input[name=${q.key}]:checked`);
      $("#row-"+q.key).classList.toggle("missing", !ok);
      return !ok;
    });
    const typeOk = !!form.farmType.value;
    form.farmType.style.borderColor = typeOk ? "" : "var(--no)";
    if (!typeOk || missing.length){
      const nums = missing.map(q => QUESTIONS.indexOf(q)+1).join(", ");
      status.textContent = !typeOk && missing.length ? "Choose the type of farm and answer every question."
        : !typeOk ? "Choose the type of farm." : `Answer question${missing.length > 1 ? "s" : ""} ${nums}.`;
      (typeOk ? $("#row-"+missing[0].key) : form.farmType).scrollIntoView({behavior:"smooth", block:"center"});
      return;
    }
    const by = form.collectedBy.value;
    // Spam trap filled in: act as if it worked, save nothing
    if (form.website.value){ showThanks(by); return; }
    if (!sb){ status.textContent = "The survey couldn't connect. Check your internet connection and reload the page."; return; }

    const row = {
      name: form.name.value.trim() || null,
      farm_type: form.farmType.value,
      county: form.county.value || null,
      collected_by: by
    };
    QUESTIONS.forEach(q => row[q.key] = form.querySelector(`input[name=${q.key}]:checked`).value === "yes");

    btn.disabled = true; btn.textContent = "Saving…"; status.textContent = "";
    try {
      // No .select() — anonymous visitors can add responses but not read them back
      let { error } = await sb.from(table).insert(row);
      if (error && /fetch|network/i.test(error.message || "")){
        await new Promise(r => setTimeout(r, 800));
        ({ error } = await sb.from(table).insert(row));
      }
      if (error) throw error;
      showThanks(by);
    } catch(err){
      console.error(err);
      status.textContent = "Couldn't save your response. Check your internet connection and try again.";
    } finally {
      btn.disabled = false; btn.textContent = "Submit response";
    }
  });

  function showThanks(by){
    form.reset();
    form.collectedBy.value = by;          // keep the student's name for the next interview
    form.hidden = true; $("#thanks").hidden = false;
    window.scrollTo({top:0, behavior:"smooth"});
    toast("Response saved — thank you!");
  }
  $("#againBtn").addEventListener("click", () => {
    $("#thanks").hidden = true; form.hidden = false; status.textContent = "";
    window.scrollTo({top:0, behavior:"smooth"});
  });

  sward();
})();
