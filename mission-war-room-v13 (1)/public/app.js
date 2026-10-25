(() => {
  'use strict';
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];
  const state = { tasks: [], goals: [], reflections: [], view: 'overview', filter: 'all', modal: null, busy: false };
  const escapeHTML = value => String(value ?? '').replace(/[&<>\"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));
  const dateISO = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };
  const prettyDate = value => { if (!value) return 'No date'; const d = new Date(`${String(value).slice(0,10)}T12:00:00`); return d.toLocaleDateString('en-IN',{day:'numeric',month:'short'}); };
  const toast = (message, error = false) => { const el = $('#toast'); el.textContent = message; el.style.borderColor = error ? '#8e5147' : ''; el.classList.add('show'); clearTimeout(toast.timer); toast.timer = setTimeout(() => el.classList.remove('show'), 3200); };
  const request = async (method, body) => {
    const options = { method, headers: { 'Content-Type': 'application/json' } };
    if (body) options.body = JSON.stringify(body);
    const response = await fetch('/api/mission-data', options);
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || `Request failed (${response.status})`);
    return data;
  };
  const taskRow = task => `<div class="task-row ${task.status === 'done' ? 'is-done' : ''}" data-task-id="${Number(task.id)}"><input class="task-check" type="checkbox" aria-label="Mark ${escapeHTML(task.title)} complete" data-task-toggle="${Number(task.id)}" ${task.status === 'done' ? 'checked' : ''}><div><div class="task-title">${escapeHTML(task.title)}</div><div class="task-meta"><span class="priority priority-${escapeHTML(task.priority)}">${escapeHTML(task.priority)}</span><span class="task-area">${escapeHTML(task.area)}</span>${task.due_date ? `<span class="task-area">· ${escapeHTML(prettyDate(task.due_date))}</span>` : ''}</div></div><div style="display:flex;align-items:flex-start;gap:7px"><span class="task-status">${task.status === 'done' ? 'CLOSED' : 'OPEN'}</span><button class="task-delete" data-task-delete="${Number(task.id)}" aria-label="Delete task">×</button></div></div>`;
  const goalRow = goal => `<div class="goal-row"><div class="goal-icon">${goal.status === 'active' ? '◎' : 'Ⅱ'}</div><div class="goal-copy"><strong>${escapeHTML(goal.title)}</strong><small>${escapeHTML(goal.area)} · ${escapeHTML(goal.status === 'active' ? 'ACTIVE' : 'PAUSED')}</small></div><span class="goal-horizon">${escapeHTML(goal.horizon)}</span><button class="goal-toggle" data-goal-toggle="${Number(goal.id)}" aria-label="Toggle objective">${goal.status === 'active' ? 'Ⅱ' : '▶'}</button></div>`;
  function renderTasks(target, mode = 'overview') {
    const list = mode === 'overview' ? $('#taskList') : $('#allTasks');
    if (!list) return;
    let tasks = [...state.tasks];
    if (state.filter === 'open') tasks = tasks.filter(t => t.status !== 'done');
    if (state.filter === 'done') tasks = tasks.filter(t => t.status === 'done');
    if (mode === 'overview') tasks = tasks.slice(0, 5);
    list.innerHTML = tasks.length ? tasks.map(taskRow).join('') : `<div class="empty-state"><strong>${state.filter === 'done' ? 'No completed tasks yet' : 'Your queue is clear'}</strong>${state.filter === 'done' ? 'Close a task when the work is actually done.' : 'Add one concrete next action to begin.'}</div>`;
  }
  function renderGoals() {
    const list = $('#goalList'); if (!list) return;
    const goals = [...state.goals];
    list.innerHTML = goals.length ? goals.slice(0,5).map(goalRow).join('') : '<div class="empty-state"><strong>No objectives defined</strong>Choose a direction before adding more activity.</div>';
  }
  function renderStats() {
    if (!$('#completionPercent')) return;
    const total = state.tasks.length, done = state.tasks.filter(t => t.status === 'done').length, open = total - done;
    const percent = total ? Math.round(done / total * 100) : 0;
    $('#completionPercent').textContent = `${percent}%`; $('#completionText').textContent = `${done} of ${total} tasks closed`; $('#completionBar').style.width = `${percent}%`;
    $('#priorityCount').textContent = open; $('#goalCount').textContent = state.goals.filter(g => g.status === 'active').length; $('#goalSubtext').textContent = 'active objectives'; $('#reflectionCount').textContent = state.reflections.length;
  }
  function renderReflections() {
    const list = $('#reflectionList'); if (!list) return;
    list.innerHTML = state.reflections.length ? state.reflections.map(r => `<article class="reflection-entry"><div class="reflection-date">${escapeHTML(prettyDate(r.reflection_date))} · FIELD NOTE</div><div class="reflection-label">WHAT I NOTICED</div><p>${escapeHTML(r.truth_observed)}</p>${r.action_taken ? `<div class="reflection-label">WHAT I DID</div><p>${escapeHTML(r.action_taken)}</p>` : ''}${r.next_step ? `<div class="reflection-label">NEXT HONEST STEP</div><p>${escapeHTML(r.next_step)}</p>` : ''}</article>`).join('') : '<div class="reflection-empty">No field notes yet. A short, honest observation is enough to begin.</div>';
  }
  async function loadData() {
    try {
      const data = await request('GET'); state.tasks = data.tasks || []; state.goals = data.goals || []; state.reflections = data.reflections || [];
      renderStats(); renderTasks(); renderGoals(); renderReflections();
      if (state.view === 'tasks') renderTasks(null, 'all');
    } catch (err) {
      $('#taskList').innerHTML = `<div class="empty-state"><strong>Could not load workspace data</strong>${escapeHTML(err.message)}<br><br>Check that the site is deployed and you are signed in as its owner.</div>`;
      $('#goalList').innerHTML = '<div class="empty-state">Objectives are unavailable until the database connection is ready.</div>';
      toast('Workspace data could not load. Check sign-in and deployment.', true);
    }
  }
  function showView(view) {
    state.view = view;
    $$('.nav-item').forEach(el => el.classList.toggle('active', el.dataset.view === view));
    $('#breadcrumbCurrent').textContent = ({overview:'OVERVIEW',tasks:'OPERATIONS QUEUE',goals:'STRATEGIC OBJECTIVES',reflection:'DAILY DEBRIEF'})[view] || 'OVERVIEW';
    $('#sidebar').classList.remove('open');
    if (view === 'overview') { $('#appContent').innerHTML = originalContent; bindDynamicEvents(); setRoom(activeRoom); renderTasks(); renderGoals(); renderStats(); }
    else if (view === 'tasks') renderTaskPage();
    else if (view === 'goals') renderGoalPage();
    else if (view === 'reflection') renderReflectionPage();
    window.scrollTo({top:0,behavior:'smooth'});
  }
  let activeRoom = 'training';
  function setRoom(room) {
    activeRoom = room === 'theatre' ? 'theatre' : 'training';
    $$('.room-tab').forEach(tab => { const active = tab.dataset.room === activeRoom; tab.classList.toggle('active', active); tab.setAttribute('aria-pressed', String(active)); });
    const theatre = $('#missionTheatreBoard'); if (theatre) theatre.hidden = activeRoom !== 'theatre';
    ['.hero-row','.signal-strip','.section-heading','.dashboard-grid','.systems-grid','.bottom-grid'].forEach(selector => $$(selector).forEach(el => el.hidden = activeRoom === 'theatre'));
    ['.kurukshetra-stage','.portrait-intel-grid','.gita-compass'].forEach(selector => $$(selector).forEach(el => el.hidden = false));
    const context = $('#roomContext');
    if (context) {
      if (activeRoom === 'training') {
        context.innerHTML = '<span class="room-context-mark">I</span><div><strong>प्रशिक्षण भूमि में प्रवेश</strong><p>क्षमता बनाओ। समझ को परखो। जो स्वयं नहीं समझा, उसे दुनिया तक पहुँचाने की जल्दी मत करो।</p></div>';
        $$('.training-zone').forEach(el => el.hidden = false);
        $$('.theatre-zone').forEach(el => el.hidden = true);
      } else {
        context.innerHTML = '<span class="room-context-mark">II</span><div><strong>मिशन थिएटर में प्रवेश</strong><p>व्यक्तियों को शत्रु घोषित नहीं करना। प्रमाण, सार्वजनिक रुझान, संदेश की पहुँच और वास्तविक परिणाम के आधार पर अवसर व जोखिम समझना।</p></div>';
        $$('.training-zone').forEach(el => el.hidden = true);
        $$('.theatre-zone').forEach(el => el.hidden = false);
      }
      context.scrollIntoView({behavior:'smooth',block:'nearest'});
    }
  }
  const originalContent = $('#appContent').innerHTML;
  function renderTaskPage() {
    $('#appContent').innerHTML = `<section class="view-page-head"><div class="eyebrow">02 / EXECUTION</div><h1>Operations queue</h1><p>Keep the list actionable. Close work when it is done; delete what no longer matters.</p></section><div class="view-toolbar"><p>${state.tasks.filter(t=>t.status!=='done').length} open · ${state.tasks.filter(t=>t.status==='done').length} completed</p><button class="button button-primary" data-action="open-task">＋ Add task</button></div><article class="panel full-list-panel"><div class="filter-row"><button class="filter-chip ${state.filter==='all'?'selected':''}" data-filter="all">All tasks</button><button class="filter-chip ${state.filter==='open'?'selected':''}" data-filter="open">Open</button><button class="filter-chip ${state.filter==='done'?'selected':''}" data-filter="done">Completed</button></div><div id="allTasks" class="task-list"></div></article>`;
    bindDynamicEvents(); renderTasks(null,'all');
  }
  function renderGoalPage() {
    $('#appContent').innerHTML = `<section class="view-page-head"><div class="eyebrow">03 / DIRECTION</div><h1>Strategic objectives</h1><p>A small number of meaningful directions. Review them; pause what has become noise.</p></section><div class="view-toolbar"><p>${state.goals.filter(g=>g.status==='active').length} active objectives</p><button class="button button-primary" data-action="open-goal">＋ Define objective</button></div><article class="panel full-list-panel"><div id="allGoals" class="goal-list"></div><div class="objective-note"><span>✳</span><p>Objectives here are personal working directions—not claims of official affiliation or authorization to represent any organisation.</p></div></article>`;
    bindDynamicEvents(); const list = $('#allGoals'); list.innerHTML = state.goals.length ? state.goals.map(goalRow).join('') : '<div class="empty-state"><strong>No objectives yet</strong>Start with one clear, testable direction.</div>';
  }
  function renderReflectionPage() {
    $('#appContent').innerHTML = `<section class="view-page-head"><div class="eyebrow">04 / SELF-OBSERVATION</div><h1>Daily debrief</h1><p>Not a scorecard for your worth. A record of what you noticed, did, and will do next.</p></section><article class="panel debrief-panel" style="margin-bottom:18px"><div class="panel-head"><div><div class="eyebrow">TODAY'S FIELD NOTE</div><h3>Look clearly. Record honestly.</h3><p>You do not need a perfect answer. Start with what is true.</p></div><div class="debrief-symbol">✳</div></div><div class="debrief-prompts"><div><span>01</span><p>What did I notice about my own mind or conduct today?</p></div><div><span>02</span><p>What did I actually do—not merely intend?</p></div><div><span>03</span><p>What is the next honest, useful action?</p></div></div><button class="button button-primary" data-action="open-reflection">＋ Write field note</button></article><section class="section-heading"><div><div class="eyebrow">RECENT RECORDS</div><h2>Field notes</h2></div></section><article class="panel full-list-panel"><div id="reflectionList"></div></article>`;
    bindDynamicEvents(); renderReflections();
  }
  function openModal(type) {
    state.modal = type;
    const fields = $('#modalFields');
    const configs = {
      task: { eyebrow:'OPERATIONS / NEW TASK', title:'Add a task', submit:'Save task', html:`<div class="form-field"><label for="taskTitle">TASK / NEXT ACTION</label><input id="taskTitle" name="title" maxlength="180" placeholder="One concrete action…" required autofocus></div><div class="form-grid"><div class="form-field"><label for="taskArea">WORKSTREAM</label><select id="taskArea" name="area"><option>Personal Discipline</option><option>Inner Work</option><option>Semester Study</option><option>Career & AI</option><option>AP Content Agent</option><option>World to Local</option><option>Community Contribution</option><option>Practice</option></select></div><div class="form-field"><label for="taskPriority">PRIORITY</label><select id="taskPriority" name="priority"><option value="P0">P0 · Must do</option><option value="P1" selected>P1 · Important</option><option value="P2">P2 · Later</option></select></div></div><div class="form-field"><label for="taskDue">DUE DATE (OPTIONAL)</label><input id="taskDue" name="due_date" type="date" min="${dateISO()}"></div>` },
      goal: { eyebrow:'STRATEGY / NEW OBJECTIVE', title:'Define an objective', submit:'Save objective', html:`<div class="form-field"><label for="goalTitle">OBJECTIVE</label><input id="goalTitle" name="title" maxlength="180" placeholder="What meaningful direction are you pursuing?" required autofocus></div><div class="form-grid"><div class="form-field"><label for="goalArea">WORKSTREAM</label><select id="goalArea" name="area"><option>Inner Work</option><option>Practice</option><option>AP Content Agent</option><option>World to Local</option><option>Semester Study</option><option>Career & AI</option><option>Community Contribution</option><option>Mission</option></select></div><div class="form-field"><label for="goalHorizon">TIME HORIZON</label><select id="goalHorizon" name="horizon"><option>Daily</option><option>7 days</option><option selected>30 days</option><option>90 days</option><option>Long term</option></select></div></div>` },
      reflection: { eyebrow:'FIELD NOTES / DAILY DEBRIEF', title:'Write an honest field note', submit:'Save reflection', html:`<div class="form-field"><label for="reflectionTruth">WHAT DID I NOTICE?</label><textarea id="reflectionTruth" name="truth_observed" maxlength="3000" placeholder="What was actually happening in my mind or conduct?" required></textarea></div><div class="form-field"><label for="reflectionAction">WHAT DID I ACTUALLY DO?</label><textarea id="reflectionAction" name="action_taken" maxlength="1500" placeholder="Actions taken, however small. (Optional)"></textarea></div><div class="form-field"><label for="reflectionNext">NEXT HONEST STEP</label><textarea id="reflectionNext" name="next_step" maxlength="1500" placeholder="One concrete next action. (Optional)"></textarea></div>` }
    };
    const config = configs[type]; if (!config) return;
    $('#modalEyebrow').textContent = config.eyebrow; $('#modalTitle').textContent = config.title; $('#modalSubmit').innerHTML = `${config.submit} <span>→</span>`; fields.innerHTML = config.html; $('#modalBackdrop').hidden = false; document.body.style.overflow='hidden';
    setTimeout(() => { const focus = fields.querySelector('input,textarea'); if (focus) focus.focus(); }, 30);
  }
  function closeModal() { $('#modalBackdrop').hidden = true; document.body.style.overflow=''; state.modal = null; }
  async function submitModal(event) {
    event.preventDefault(); if (state.busy) return;
    const form = new FormData(event.currentTarget); const values = Object.fromEntries(form.entries());
    const actionByType = {task:'createTask',goal:'createGoal',reflection:'saveReflection'};
    const body = { action: actionByType[state.modal], ...values };
    state.busy = true; $('#modalSubmit').disabled = true; $('#modalSubmit').textContent = 'Saving…';
    try {
      await request('POST', body); const type = state.modal; closeModal(); await loadData();
      if (type === 'task' && state.view !== 'overview') showView('tasks');
      if (type === 'goal' && state.view !== 'overview') showView('goals');
      if (type === 'reflection' && state.view !== 'overview') showView('reflection');
      toast(type === 'task' ? 'Task added to the operations queue.' : type === 'goal' ? 'Objective recorded.' : 'Field note saved.');
    } catch (err) { toast(err.message || 'Could not save entry.', true); }
    finally { state.busy = false; $('#modalSubmit').disabled = false; }
  }
  async function toggleTask(id) {
    try { await request('POST',{action:'toggleTask',id}); await loadData(); if (state.view==='tasks') renderTaskPage(); toast('Task status updated.'); }
    catch(err){toast(err.message,true);}
  }
  async function deleteTask(id) {
    if (!window.confirm('Delete this task permanently?')) return;
    try { await request('POST',{action:'deleteTask',id}); await loadData(); if(state.view==='tasks') renderTaskPage(); toast('Task deleted.'); }
    catch(err){toast(err.message,true);}
  }
  async function toggleGoal(id) {
    try { await request('POST',{action:'toggleGoal',id}); await loadData(); if(state.view==='goals') renderGoalPage(); toast('Objective status updated.'); }
    catch(err){toast(err.message,true);}
  }
  function setWorldUrl() {
    const current = localStorage.getItem('mission-world-url') || '';
    const value = window.prompt('Paste your existing World to Local Explorer URL (https://…):', current);
    if (value === null) return;
    const trimmed = value.trim();
    if (trimmed && !/^https:\/\//i.test(trimmed)) return toast('For safety, use a full HTTPS URL.', true);
    if (trimmed) localStorage.setItem('mission-world-url', trimmed); else localStorage.removeItem('mission-world-url');
    updateWorldLink(); toast(trimmed ? 'Project link saved in this browser.' : 'Project link cleared.');
  }
  function updateWorldLink() {
    const url = localStorage.getItem('mission-world-url');
    const cards = $$('.system-world');
    cards.forEach(card => {
      const pill = $('.status-config',card), cta = $('.system-cta',card), p = $('p',card);
      if (url) { pill.textContent='LINK SAVED'; pill.className='status-pill status-linked'; cta.textContent='Open World to Local Explorer ↗'; cta.onclick=()=>window.open(url,'_blank','noopener,noreferrer'); p.textContent='Open your existing explorer. This dashboard tracks the work around it; it does not replace the original project.'; }
      else { pill.textContent='URL NEEDED'; pill.className='status-pill status-config'; cta.innerHTML='Configure project link <span>↗</span>'; cta.onclick=setWorldUrl; }
    });
  }
  function renderRoomPage(room) {
    const training = room === 'training';
    state.view = training ? 'training' : 'theatre';
    $$('.nav-item').forEach(el => el.classList.toggle('active', el.dataset.view === 'overview'));
    $('#breadcrumbCurrent').textContent = training ? 'TRAINING GROUND' : 'MISSION THEATRE';
    $('#sidebar').classList.remove('open');
    $('#appContent').innerHTML = training ? `<section class="room-page-hero training-page-hero"><div class="room-page-kicker">ROOM 01 / PERSONAL PREPARATION</div><h1>प्रशिक्षण भूमि</h1><p>पहला मोर्चा स्वयं के भीतर है। अध्ययन, अनुशासन, आत्म-परीक्षण और कौशल—यहाँ तैयारी को वास्तविक कर्म में बदला जाता है।</p><div class="room-page-actions"><button class="button button-primary" data-go="tasks">आज के कर्तव्य खोलें ↗</button><button class="button button-secondary" data-go="reflection">आत्म-परीक्षण लिखें ↗</button><button class="button button-secondary" data-go="overview">कमांड केंद्र पर लौटें</button></div></section><section class="room-page-grid"><article class="room-page-card"><span>01 / अध्ययन</span><h2>ज्ञान और स्पष्टता</h2><p>पढ़ाई, गणित, AI/ML और मिशन से जुड़े विषयों के लिए एक स्पष्ट अगला कदम चुनो।</p><button class="text-action" data-go="tasks">कर्तव्य सूची खोलें →</button></article><article class="room-page-card"><span>02 / अनुशासन</span><h2>नियमित अभ्यास</h2><p>व्यस्तता नहीं—एक ऐसा काम पूरा करो जिसका परिणाम जाँचा जा सके।</p><button class="text-action" data-go="goals">दीर्घकालिक लक्ष्य →</button></article><article class="room-page-card"><span>03 / आत्म-परीक्षण</span><h2>ईमानदार समीक्षा</h2><p>आज क्या देखा, कहाँ भ्रम हुआ और अगला जिम्मेदार कदम क्या है?</p><button class="text-action" data-go="reflection">फील्ड नोट लिखें →</button></article></section>` : `<section class="room-page-hero theatre-page-hero"><div class="room-page-kicker">ROOM 02 / EVIDENCE-LED MISSION PLANNING</div><h1>मिशन थिएटर</h1><p>किसी व्यक्ति को शत्रु घोषित करना उद्देश्य नहीं। सार्वजनिक विमर्श, गलत दावों, अवसरों और अपने प्रयास के प्रभाव को प्रमाण के आधार पर समझना ही यहाँ का काम है।</p><div class="room-page-actions"><button class="button button-primary" data-go="goals">रणनीतिक लक्ष्य खोलें ↗</button><button class="button button-secondary" data-go="tasks">अगली कार्रवाई तय करें ↗</button><button class="button button-secondary" data-go="overview">कमांड केंद्र पर लौटें</button></div></section><section class="room-page-grid"><article class="room-page-card"><span>01 / SITUATION</span><h2>स्थिति का आकलन</h2><p>क्या ज्ञात है, किस स्रोत से ज्ञात है और क्या अभी अपुष्ट है—इनको अलग रखो।</p><button class="text-action" data-go="goals">प्राथमिकताएँ देखें →</button></article><article class="room-page-card"><span>02 / OPPORTUNITY</span><h2>जहाँ प्रयास असर करे</h2><p>ऐसा विषय चुनो जहाँ उपयोगी, स्रोत-आधारित सामग्री लोगों की समझ में मदद कर सके।</p><button class="text-action" data-go="tasks">अगला प्रयोग तय करें →</button></article><article class="room-page-card"><span>03 / REVIEW</span><h2>प्रभाव और सुधार</h2><p>पहुँच को प्रभाव न मानो। प्रतिक्रिया, समझ और वास्तविक परिणामों को अलग-अलग देखो।</p><button class="text-action" data-go="reflection">समीक्षा दर्ज करें →</button></article></section>`;
    bindDynamicEvents();
    window.scrollTo({top:0,behavior:'smooth'});
  }
  function bindDynamicEvents() {
    $$('.room-tab').forEach(el => el.onclick = () => renderRoomPage(el.dataset.room));
    $$('.nav-item').forEach(el => el.onclick = () => showView(el.dataset.view));
    $$('[data-go]').forEach(el => el.onclick = () => showView(el.dataset.go));
    $$('[data-action]').forEach(el => el.onclick = () => ({'open-task':()=>openModal('task'),'open-goal':()=>openModal('goal'),'open-reflection':()=>openModal('reflection'),'set-world-url':setWorldUrl}[el.dataset.action] || (()=>{}))());
    $$('[data-filter]').forEach(el => el.onclick = () => { state.filter=el.dataset.filter; $$('.filter-chip').forEach(chip=>chip.classList.toggle('selected',chip.dataset.filter===state.filter)); renderTasks(null,state.view==='overview'?'overview':'all'); });
    $$('[data-task-toggle]').forEach(el => el.onchange = () => toggleTask(Number(el.dataset.taskToggle)));
    $$('[data-task-delete]').forEach(el => el.onclick = () => deleteTask(Number(el.dataset.taskDelete)));
    $$('[data-goal-toggle]').forEach(el => el.onclick = () => toggleGoal(Number(el.dataset.goalToggle)));
    const world = $('[data-action="set-world-url"]'); if(world) world.onclick=setWorldUrl;
  }
  let ambientContext = null;
  let ambientNodes = [];
  function speakCharioteer() {
    if (!('speechSynthesis' in window)) { toast('इस browser में Hindi voice उपलब्ध नहीं है।', true); return; }
    const button = $('#stageVoice');
    if (window.speechSynthesis.speaking) { window.speechSynthesis.cancel(); button.classList.remove('is-speaking'); $('#voicePlayIcon').textContent='▶'; return; }
    const words = 'यह भगवद्गीता से प्रेरित विद्यार्थी-अभ्यास का स्थान है। आचार्य प्रशांत के विद्यार्थी के रूप में, प्रश्न केवल यह नहीं कि मैंने क्या सुना या सीखा; प्रश्न यह है कि मेरी दृष्टि, जीवन और कर्म में क्या बदला। कुरुक्षेत्र किसी मनुष्य के विरुद्ध युद्ध नहीं, अपने भीतर अज्ञान, भय, मोह और निष्क्रियता को पहचानने का रूपक है। गीता का स्मरण करो: कर्मण्येवाधिकारस्ते मा फलेषु कदाचन। आज का कर्तव्य स्पष्ट करो। अपने अध्ययन को ईमानदारी से करो। जो समझा है, उसे जीवन में परखो। और जहाँ संभव हो, वहाँ जिम्मेदारी से योगदान दो। कोई दिखावा नहीं, कोई जल्दबाजी नहीं—पहले स्पष्टता, फिर सार्थक कर्म।';
    const utterance = new SpeechSynthesisUtterance(words); utterance.lang='hi-IN'; utterance.rate=.88; utterance.pitch=.92;
    const voices = window.speechSynthesis.getVoices(); const hindi = voices.find(v=>/^hi(-|_)/i.test(v.lang)) || voices.find(v=>/hindi/i.test(v.name)); if(hindi) utterance.voice=hindi;
    utterance.onstart=()=>{button.classList.add('is-speaking');$('#voicePlayIcon').textContent='Ⅱ';};
    utterance.onend=utterance.onerror=()=>{button.classList.remove('is-speaking');$('#voicePlayIcon').textContent='▶';};
    window.speechSynthesis.cancel(); window.speechSynthesis.speak(utterance);
  }
  function toggleAmbient() {
    const button=$('#stageAmbient');
    if (ambientContext) { ambientNodes.forEach(node=>{try{node.stop?.();node.disconnect?.();}catch(_){}}); ambientNodes=[]; ambientContext.close(); ambientContext=null; button.setAttribute('aria-pressed','false'); $('#ambientIcon').textContent='♫'; $('#ambientLabel').textContent='ध्वनि दृश्य बंद'; return; }
    const AudioCtx=window.AudioContext||window.webkitAudioContext;
    if(!AudioCtx){toast('इस browser में ambient audio उपलब्ध नहीं है।',true);return;}
    try {
      ambientContext=new AudioCtx(); const master=ambientContext.createGain(); master.gain.value=.0001; master.connect(ambientContext.destination); master.gain.setTargetAtTime(.045,ambientContext.currentTime,1.4);
      const buffer=ambientContext.createBuffer(1,ambientContext.sampleRate*3,ambientContext.sampleRate); const channel=buffer.getChannelData(0); for(let i=0;i<channel.length;i++) channel[i]=(Math.random()*2-1)*.28;
      const noise=ambientContext.createBufferSource(); noise.buffer=buffer; noise.loop=true; const filter=ambientContext.createBiquadFilter(); filter.type='lowpass'; filter.frequency.value=360; const wind=ambientContext.createGain(); wind.gain.value=.65; noise.connect(filter);filter.connect(wind);wind.connect(master);noise.start();
      const drone=ambientContext.createOscillator(); drone.type='sine'; drone.frequency.value=73.4; const droneGain=ambientContext.createGain(); droneGain.gain.value=.12; drone.connect(droneGain);droneGain.connect(master);drone.start();
      ambientNodes=[noise,filter,wind,drone,droneGain,master]; button.setAttribute('aria-pressed','true'); $('#ambientIcon').textContent='♫'; $('#ambientLabel').textContent='ध्वनि दृश्य चालू';
    } catch(err) { ambientContext=null; toast('Ambient audio शुरू नहीं हो सका।',true); }
  }
  function init() {
    const now = new Date(); $('#todayDate').textContent = now.toLocaleDateString('en-IN',{weekday:'short',day:'2-digit',month:'short',year:'numeric'}).toUpperCase(); $('#dateDay').textContent = String(now.getDate()).padStart(2,'0'); $('#dateMonth').textContent = now.toLocaleDateString('en-IN',{month:'short',year:'numeric'}).toUpperCase();
    $('#mobileMenu').onclick = () => $('#sidebar').classList.toggle('open'); $('#modalClose').onclick=closeModal; $('#modalCancel').onclick=closeModal; $('#modalBackdrop').addEventListener('click',e=>{if(e.target===$('#modalBackdrop'))closeModal();}); $('#entryForm').addEventListener('submit',submitModal); document.addEventListener('keydown',e=>{if(e.key==='Escape'){closeModal();$('#sidebar').classList.remove('open');}});
    const voiceButton=$('#stageVoice'), ambientButton=$('#stageAmbient'); if(voiceButton) voiceButton.addEventListener('click',speakCharioteer); if(ambientButton) ambientButton.addEventListener('click',toggleAmbient);
    const savedSituation = (()=>{try{return JSON.parse(localStorage.getItem('gita-war-situation')||'null')}catch(_){return null}})();
    if(savedSituation){$('#situationLevel').value=savedSituation.level||'unassessed';$('#situationSource').value=savedSituation.source||'';$('#situationNotes').value=savedSituation.notes||'';$('#situationSaved').textContent='अंतिम स्थानीय रिपोर्ट: '+(savedSituation.savedAt||'समय अज्ञात');}
    const savedStrategies = (()=>{try{return JSON.parse(localStorage.getItem('gita-war-strategies')||'[]')}catch(_){return []}})();
    const renderStrategyLog = () => {const el=$('#strategyLog'); if(!el)return; el.innerHTML=savedStrategies.length?savedStrategies.slice(0,8).map((item,i)=>`<div class="strategy-entry"><span>${String(i+1).padStart(2,'0')}</span><div><strong>${escapeHTML(item.action)}</strong><p>${escapeHTML(item.outcome)} · <small>${escapeHTML(item.metric)}</small></p><time>${escapeHTML(item.savedAt)}</time></div></div>`).join(''):'अभी कोई रणनीति लॉग नहीं की गई।';};
    renderStrategyLog();
    $('#saveSituation')?.addEventListener('click',()=>{const report={level:$('#situationLevel').value,source:$('#situationSource').value.trim(),notes:$('#situationNotes').value.trim(),savedAt:new Date().toLocaleString('hi-IN')};if(report.source&&!/^https:\/\//i.test(report.source)){toast('स्रोत के लिए HTTPS URL इस्तेमाल करो।',true);return;}try{localStorage.setItem('gita-war-situation',JSON.stringify(report));$('#situationSaved').textContent='रिपोर्ट इसी browser में सुरक्षित: '+report.savedAt;toast('स्थिति रिपोर्ट सुरक्षित हुई।');}catch(_){toast('रिपोर्ट save नहीं हुई। Browser storage जाँचो।',true);}});
    $('#saveStrategy')?.addEventListener('click',()=>{const action=$('#strategyAction').value.trim(),outcome=$('#strategyOutcome').value.trim(),metric=$('#strategyMetric').value;if(!action||!outcome){toast('रणनीति और अपेक्षित परिणाम दोनों लिखो।',true);return;}savedStrategies.unshift({action,outcome,metric,savedAt:new Date().toLocaleString('hi-IN')});try{localStorage.setItem('gita-war-strategies',JSON.stringify(savedStrategies.slice(0,30)));$('#strategyAction').value='';$('#strategyOutcome').value='';renderStrategyLog();toast('रणनीति इसी browser में सुरक्षित हुई।');}catch(_){savedStrategies.shift();toast('रणनीति save नहीं हुई। Browser storage जाँचो।',true);}});
    window.addEventListener('pagehide',()=>{if('speechSynthesis' in window)window.speechSynthesis.cancel();if(ambientContext)ambientContext.close();});
    bindDynamicEvents(); updateWorldLink(); loadData();
  }
  init();
})();