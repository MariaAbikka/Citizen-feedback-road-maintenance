// frontend/js/app.js — RoadAlert Chennai v2.0
'use strict';

const API = '/api';

// ══════════════════════════════════════════════════════════════════════════════
// LEAFLET MAP  (OpenStreetMap — 100% free, no API key needed)
// ══════════════════════════════════════════════════════════════════════════════
let leafletMap     = null;   // L.Map instance
let leafletMarkers = [];     // active L.Marker array

// Severity → colors
const SEV_COLOR  = { high:'#EF4444', med:'#F59E0B', low:'#10B981' };
const SEV_SHADOW = { high:'rgba(220,38,38,0.35)', med:'rgba(217,119,6,0.3)', low:'rgba(5,150,105,0.3)' };

// Build a custom SVG pin icon for each severity
function makeLeafletIcon(severity) {
  const col = SEV_COLOR[severity]  || '#6b7280';
  const shd = SEV_SHADOW[severity] || 'rgba(107,114,128,0.3)';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="38" viewBox="0 0 28 38">
    <filter id="s"><feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="${shd}"/></filter>
    <g filter="url(#s)">
      <path d="M14 2C8.48 2 4 6.48 4 12c0 7.5 10 22 10 22S24 19.5 24 12c0-5.52-4.48-10-10-10z"
            fill="${col}" stroke="rgba(0,0,0,0.35)" stroke-width="1.5"/>
      <circle cx="14" cy="12" r="4" fill="rgba(255,255,255,0.9)"/>
    </g>
  </svg>`;
  return L.divIcon({
    html:      svg,
    className: '',
    iconSize:    [28, 38],
    iconAnchor:  [14, 38],
    popupAnchor: [0, -38],
  });
}

function renderLeafletMap(issues) {
  const container = document.getElementById('google-map');
  if (!container) return;

  // If Leaflet hasn't loaded yet, retry after a short delay
  if (typeof L === 'undefined') {
    setTimeout(() => renderLeafletMap(issues), 300);
    return;
  }

  // Clear old markers
  leafletMarkers.forEach(m => m.remove());
  leafletMarkers = [];

  // Destroy and recreate map if container was hidden (fixes blank tile bug)
  if (leafletMap) {
    leafletMap.remove();
    leafletMap = null;
  }

  leafletMap = L.map('google-map', {
    center:      [13.0600, 80.2300],
    zoom:        12,
    zoomControl: true,
    preferCanvas: true,
  });

  // Primary: CartoDB Dark Matter (best looking dark tiles, free)
  const darkTiles = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> &copy; <a href="https://carto.com/" target="_blank">CARTO</a>',
    subdomains:  'abcd',
    maxZoom:     19,
  });

  // Fallback: standard OpenStreetMap if CartoDB fails
  darkTiles.on('tileerror', () => {
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(leafletMap);
  });

  darkTiles.addTo(leafletMap);

  const issuesWithCoords = issues.filter(i => i.lat && i.lng);

  issuesWithCoords.forEach(issue => {
    const stLabel = { reported:'Reported', reviewing:'Under Review', fixed:'Fixed', rejected:'Rejected' };
    const svLabel = { high:'🔴 High', med:'🟡 Medium', low:'🟢 Low' };
    const stColor = { reported:'#A78BFA', reviewing:'#F59E0B', fixed:'#10B981', rejected:'#6b7280' };
    const sc = stColor[issue.status] || '#6b7280';

    const popupHTML = `
      <div style="background:#fff;color:#0F1E50;border-radius:8px;padding:14px 16px;min-width:230px;font-family:'Plus Jakarta Sans',system-ui,sans-serif;font-size:13px;line-height:1.6">
        <div style="font-weight:700;font-size:14px;margin-bottom:4px;color:#0F1E50">${EMOJI[issue.type]||'❓'} ${issue.type}</div>
        <div style="color:#8893B0;font-size:10px;margin-bottom:10px;font-family:monospace">${issue.id}</div>
        <div style="margin-bottom:4px;color:#4A5578">📍 <strong>${issue.street}</strong></div>
        <div style="margin-bottom:4px;color:#4A5578">🏛️ ${issue.ward}</div>
        <div style="margin-bottom:10px;color:#4A5578">👤 ${issue.reporter}</div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px">
          <span style="background:rgba(15,30,80,0.06);border:1px solid rgba(15,30,80,0.12);border-radius:20px;padding:2px 10px;font-size:10px;font-family:monospace;color:${sc}">${stLabel[issue.status]||issue.status}</span>
          <span style="background:rgba(15,30,80,0.06);border:1px solid rgba(15,30,80,0.12);border-radius:20px;padding:2px 10px;font-size:10px;font-family:monospace;color:#4A5578">${svLabel[issue.severity]||issue.severity}</span>
        </div>
        <button onclick="openModal('${issue.id}')" style="width:100%;padding:8px;background:#0F1E50;color:#fff;border:none;border-radius:5px;font-size:12px;font-weight:600;cursor:pointer;font-family:inherit">View Details →</button>
      </div>`;

    const marker = L.marker([issue.lat, issue.lng], { icon: makeLeafletIcon(issue.severity) })
      .addTo(leafletMap)
      .bindPopup(popupHTML, { maxWidth: 280, className: 'ra-popup', closeButton: true });

    leafletMarkers.push(marker);
  });

  // Fit map to all markers
  if (issuesWithCoords.length > 0) {
    const group = L.featureGroup(leafletMarkers);
    leafletMap.fitBounds(group.getBounds().pad(0.15));
    leafletMap.once('moveend', () => {
      if (leafletMap.getZoom() > 14) leafletMap.setZoom(14);
    });
  }

  // invalidateSize at multiple intervals to handle hidden-tab rendering
  [100, 300, 600, 1000].forEach(t => setTimeout(() => leafletMap && leafletMap.invalidateSize(), t));
}


// ══════════════════════════════════════════════════════════════════════════════
// AUTH
// ══════════════════════════════════════════════════════════════════════════════
const ADMIN_USER = 'admin';
const ADMIN_PASS = 'admin@1';

let currentUser = null;
try { currentUser = JSON.parse(sessionStorage.getItem('ra_user') || 'null'); } catch(e) {}

function getUsers() { try { return JSON.parse(localStorage.getItem('ra_users')||'[]'); } catch(e){ return []; } }
function saveUsers(u) { localStorage.setItem('ra_users', JSON.stringify(u)); }
function isAdmin() { return currentUser && currentUser.role === 'admin'; }

function doLogin() {
  const u = document.getElementById('login-user').value.trim();
  const p = document.getElementById('login-pass').value;
  const err = document.getElementById('login-err');
  err.textContent = '';
  if (!u || !p) { err.textContent = 'Please enter username and password.'; return; }
  if (u === ADMIN_USER && p === ADMIN_PASS) {
    loginSuccess({ username:'admin', name:'Admin — Chennai Municipal Corp', role:'admin' }); return;
  }
  const users = getUsers();
  const found = users.find(x => x.username === u && x.password === p);
  if (!found) { err.textContent = 'Invalid username or password.'; return; }
  loginSuccess({ username: found.username, name: found.name, role: 'user' });
}

function doSignup() {
  const name = document.getElementById('su-name').value.trim();
  const u    = document.getElementById('su-user').value.trim();
  const p    = document.getElementById('su-pass').value;
  const err  = document.getElementById('signup-err');
  err.textContent = '';
  if (!name || !u || !p)    { err.textContent = 'All fields are required.'; return; }
  if (p.length < 6)         { err.textContent = 'Password must be at least 6 characters.'; return; }
  if (u === ADMIN_USER)     { err.textContent = 'That username is reserved.'; return; }
  const users = getUsers();
  if (users.find(x => x.username === u)) { err.textContent = 'Username already taken.'; return; }
  users.push({ username: u, name, password: p });
  saveUsers(users);
  loginSuccess({ username: u, name, role: 'user' });
  showToast('✅ Account created! Welcome, ' + name);
}

function loginSuccess(user) {
  currentUser = user;
  sessionStorage.setItem('ra_user', JSON.stringify(user));
  document.getElementById('auth-screen').style.display = 'none';
  document.getElementById('app-shell').style.display   = 'block';
  buildNav();
  applyRoleUI();
  // Set the hidden username field so every report is tagged to this user
  const uField = document.getElementById('f-username');
  if (uField) uField.value = user.username;
  showPage(isAdmin() ? 'admin-dashboard' : 'home');
}

function doLogout() {
  currentUser = null;
  sessionStorage.removeItem('ra_user');
  document.getElementById('app-shell').style.display   = 'none';
  document.getElementById('auth-screen').style.display = 'flex';
  document.getElementById('login-user').value = '';
  document.getElementById('login-pass').value = '';
  document.getElementById('login-err').textContent = '';
  switchAuthTab('login');
}

function switchAuthTab(tab) {
  document.getElementById('form-login').classList.toggle('active',  tab==='login');
  document.getElementById('form-signup').classList.toggle('active', tab==='signup');
  document.querySelectorAll('.auth-tab').forEach((t,i) => t.classList.toggle('active', (i===0&&tab==='login')||(i===1&&tab==='signup')));
}

function applyRoleUI() {
  const badge = document.getElementById('nav-role-badge');
  document.getElementById('nav-username').textContent = currentUser.name || currentUser.username;
  if (isAdmin()) { badge.textContent = '👑 Admin'; badge.className = 'nav-role-badge admin'; }
  else           { badge.textContent = '👤 User';  badge.className = 'nav-role-badge user'; }
}

// ── Build nav based on role ───────────────────────────────────────────────────
function buildNav() {
  const container = document.getElementById('nav-tabs');
  container.innerHTML = '';
  const tabs = isAdmin()
    ? [
        { page:'admin-dashboard', label:'📊 Dashboard' },
        { page:'admin-issues',    label:'🗂️ Manage Issues' },
        { page:'admin-reports',   label:'📋 All Reports' },
      ]
    : [
        { page:'home',       label:'🏠 Home' },
        { page:'report',     label:'📝 Report Issue' },
        { page:'myreports',  label:'📋 My Reports' },
        { page:'feedback',   label:'💬 Feedback' },
      ];
  tabs.forEach(t => {
    const btn = document.createElement('button');
    btn.className   = 'nav-tab';
    btn.dataset.page = t.page;
    btn.textContent  = t.label;
    btn.addEventListener('click', () => showPage(t.page));
    container.appendChild(btn);
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// SLIDESHOWS
// ══════════════════════════════════════════════════════════════════════════════
function initAuthSlideshow() {
  const slides = document.querySelectorAll('.auth-slide');
  let cur = 0;
  setInterval(() => {
    slides[cur].classList.remove('active');
    cur = (cur+1) % slides.length;
    slides[cur].classList.add('active');
  }, 5000);
}

let heroIdx = 0, heroTimer;
function initHeroSlideshow() {
  const slides = document.querySelectorAll('.hero-slide');
  const dotsEl = document.getElementById('hero-dots');
  if (!dotsEl) return;
  dotsEl.innerHTML = '';
  slides.forEach((_, i) => {
    const d = document.createElement('button');
    d.className = 'hero-dot' + (i===0?' active':'');
    d.onclick = () => goHero(i);
    dotsEl.appendChild(d);
  });
  clearInterval(heroTimer);
  heroTimer = setInterval(() => changeHeroSlide(1), 4500);
}
function goHero(idx) {
  const slides = document.querySelectorAll('.hero-slide');
  const dots   = document.querySelectorAll('.hero-dot');
  slides[heroIdx].classList.remove('active');
  dots[heroIdx] && dots[heroIdx].classList.remove('active');
  heroIdx = (idx + slides.length) % slides.length;
  slides[heroIdx].classList.add('active');
  dots[heroIdx] && dots[heroIdx].classList.add('active');
}
function changeHeroSlide(d) { clearInterval(heroTimer); goHero(heroIdx+d); heroTimer = setInterval(()=>changeHeroSlide(1),4500); }

// ══════════════════════════════════════════════════════════════════════════════
// UTILITIES
// ══════════════════════════════════════════════════════════════════════════════
let SESSION_ID = sessionStorage.getItem('ra_sess');
if (!SESSION_ID) { SESSION_ID = 'sess_'+Math.random().toString(36).slice(2)+Date.now(); sessionStorage.setItem('ra_sess',SESSION_ID); }
let votedIssues = JSON.parse(sessionStorage.getItem('ra_votes')||'[]');

const EMOJI = { 'Pothole':'🕳️','Broken Light':'💡','Flooding':'🌊','Damaged Sign':'🚧','Fallen Tree':'🌳','Road Crack':'⚡','Garbage':'🗑️','Other':'❓' };
const TCOLORS = { 'Pothole':'#DC2626','Broken Light':'#D97706','Flooding':'#2563EB','Road Crack':'#16A34A','Damaged Sign':'#7C3AED','Garbage':'#0891B2','Fallen Tree':'#DB2777','Other':'#64748B' };
const SEVBG  = { high:'#FEF2F2', med:'#FFFBEB', low:'#F0FDF4' };

let allIssues=[], adminFilter='all', adminSearch='';

function showToast(msg, dur=2800) {
  const el = document.getElementById('toast');
  el.textContent = msg; el.classList.add('show');
  clearTimeout(el._t); el._t = setTimeout(()=>el.classList.remove('show'), dur);
}
function fmtDate(s) { if(!s) return '—'; return new Date(s).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'}); }
function sevLbl(s)  { return {high:'High',med:'Medium',low:'Low'}[s]||s; }
function stLbl(s)   { return {reported:'Reported',reviewing:'Under Review',fixed:'Fixed',rejected:'Rejected'}[s]||s; }


// ══════════════════════════════════════════════════════════════════════════════
// API
// ══════════════════════════════════════════════════════════════════════════════
async function apiFetch(path, opts={}) {
  const res  = await fetch(API+path, opts);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error||'Server error');
  return data;
}
async function loadIssues(params={}) {
  const qs = new URLSearchParams(params).toString();
  const d  = await apiFetch('/issues'+(qs?'?'+qs:''));
  allIssues = d.data; return d.data;
}

// ══════════════════════════════════════════════════════════════════════════════
// NAVIGATION
// ══════════════════════════════════════════════════════════════════════════════
function showPage(id) {
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.nav-tab').forEach(t=>t.classList.remove('active'));
  const pg = document.getElementById('page-'+id);
  if (!pg) return;
  pg.classList.add('active');
  document.querySelectorAll('.nav-tab').forEach(t=>{ if(t.dataset.page===id) t.classList.add('active'); });
  if (id==='home')            { initHome(); }
  if (id==='myreports')       { initMyReports(); }
  if (id==='feedback')        { initFeedbackPage(); }
  if (id==='admin-dashboard') { initAdminDashboard(); }
  if (id==='admin-issues')    { initAdminIssues(); }
  if (id==='admin-reports')   { initAdminReports(); }
}

// ══════════════════════════════════════════════════════════════════════════════
// HOME
// ══════════════════════════════════════════════════════════════════════════════
async function initHome() {
  initHeroSlideshow();
  try {
    const [stats, issues] = await Promise.all([apiFetch('/stats'), loadIssues()]);
    const s = stats.data;
    document.getElementById('s-total').textContent    = s.total;
    document.getElementById('s-review').textContent   = s.reviewing;
    document.getElementById('s-fixed').textContent    = s.recentFixed;
    document.getElementById('s-critical').textContent = s.critical;
    renderHomeRecent(issues.slice(0,5));
  } catch(e) { showToast('⚠️ Cannot connect to server. Run: npm start', 5000); }
}

function renderHomeRecent(issues) {
  const el = document.getElementById('home-recent-list');
  if (!issues.length) { el.innerHTML='<div class="loading-msg">No reports yet.</div>'; return; }
  el.innerHTML = issues.map(i=>`
    <div class="recent-row" onclick="openModal('${i.id}')">
      <div class="recent-icon">${EMOJI[i.type]||'❓'}</div>
      <div class="recent-body">
        <div class="recent-title">${i.type} — ${i.street}</div>
        <div class="recent-meta">📍 ${i.ward} · 👤 ${i.reporter} · 🗓️ ${fmtDate(i.created_at)}</div>
      </div>
      <span class="badge ${i.status}">${stLbl(i.status)}</span>
    </div>`).join('');
}

// ══════════════════════════════════════════════════════════════════════════════
// REPORT FORM
// ══════════════════════════════════════════════════════════════════════════════
function initReportForm() {
  document.querySelectorAll('#type-grid .type-btn').forEach(btn => {
    btn.addEventListener('click', ()=>{
      document.querySelectorAll('#type-grid .type-btn').forEach(b=>b.classList.remove('selected'));
      btn.classList.add('selected');
      document.getElementById('f-type').value = btn.dataset.value;
    });
  });
  document.querySelectorAll('.sev-btn').forEach(btn => {
    btn.addEventListener('click', ()=>{
      document.querySelectorAll('.sev-btn').forEach(b=>b.classList.remove('selected'));
      btn.classList.add('selected');
      document.getElementById('f-severity').value = btn.dataset.value;
    });
  });
  const fi = document.getElementById('f-photo');
  fi.addEventListener('change', ()=>{
    const file = fi.files[0]; if (!file) return;
    const r = new FileReader();
    r.onload = e => {
      document.getElementById('preview-img').src = e.target.result;
      document.getElementById('photo-preview').style.display = 'block';
      document.getElementById('pd-icon').textContent = '✅';
      document.getElementById('pd-text').textContent = file.name;
    };
    r.readAsDataURL(file);
  });
  const drop = document.getElementById('photo-drop');
  drop.addEventListener('dragover', e=>{e.preventDefault(); drop.style.borderColor='var(--blue)';});
  drop.addEventListener('dragleave', ()=>{ drop.style.borderColor=''; });
  drop.addEventListener('drop', e=>{
    e.preventDefault(); drop.style.borderColor='';
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      const dt = new DataTransfer(); dt.items.add(file); fi.files = dt.files;
      fi.dispatchEvent(new Event('change'));
    }
  });
  document.getElementById('report-form').addEventListener('submit', submitReport);
}

async function submitReport(e) {
  e.preventDefault();
  const btn = document.getElementById('submit-btn');
  btn.disabled = true; btn.textContent = 'Submitting…';
  try {
    const fd = new FormData(document.getElementById('report-form'));
    const res = await fetch(API+'/issues', { method:'POST', body:fd });
    const data = await res.json();
    if (!data.success) throw new Error(data.error);
    showToast('✅ '+data.message);
    // Reset form
    document.getElementById('report-form').reset();
    document.querySelectorAll('#type-grid .type-btn').forEach((b,i)=>b.classList.toggle('selected',i===0));
    document.getElementById('f-type').value = 'Pothole';
    document.querySelectorAll('.sev-btn').forEach(b=>{ b.classList.remove('selected'); if(b.dataset.value==='med') b.classList.add('selected'); });
    document.getElementById('f-severity').value = 'med';
    document.getElementById('pd-icon').textContent = '📷';
    document.getElementById('pd-text').textContent = 'Click to add a photo — helps the team verify faster (max 5 MB)';
    document.getElementById('photo-preview').style.display = 'none';
    setTimeout(()=>showPage('myreports'), 800);
  } catch(err) { showToast('❌ '+err.message, 4000); }
  finally { btn.disabled=false; btn.textContent='Submit to Chennai Municipal Corporation →'; }
}

// ══════════════════════════════════════════════════════════════════════════════
// MY REPORTS
// ══════════════════════════════════════════════════════════════════════════════
async function initMyReports() {
  const el = document.getElementById('my-reports-list');
  el.innerHTML = '<div class="loading-msg">Loading your reports…</div>';
  try {
    // Filter by username (account ID) — reliable even if reporter name differs
    const issues = await loadIssues({ username: currentUser.username });
    if (!issues.length) { el.innerHTML = '<div class="loading-msg">You have not submitted any reports yet.<br><br><button class="btn-primary" onclick="showPage(\'report\')" style="margin-top:8px">Report an Issue →</button></div>'; return; }
    el.innerHTML = issues.map(i => renderIssueCard(i)).join('');
  } catch(e) { el.innerHTML = '<div class="loading-msg">⚠️ Could not load reports. Is the server running?</div>'; }
}

// ══════════════════════════════════════════════════════════════════════════════
// FEEDBACK PAGE
// ══════════════════════════════════════════════════════════════════════════════
function initFeedbackPage() {
  let rating = 5;
  const stars = document.querySelectorAll('.star');
  stars.forEach((s, i) => {
    s.addEventListener('mouseover', () => stars.forEach((x,j) => x.classList.toggle('inactive', j>i)));
    s.addEventListener('mouseout',  () => stars.forEach((x,j) => x.classList.toggle('inactive', j>=rating)));
    s.addEventListener('click', () => {
      rating = i+1;
      document.getElementById('fb-rating').value = rating;
      stars.forEach((x,j) => x.classList.toggle('inactive', j>=rating));
    });
  });
}

async function submitFeedback() {
  const message  = document.getElementById('fb-message').value.trim();
  const rating   = document.getElementById('fb-rating').value;
  const category = document.getElementById('fb-category').value;
  if (!message) { showToast('⚠️ Please write your feedback first'); return; }
  try {
    const res = await fetch(API+'/feedback', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ username: currentUser.username, name: currentUser.name, rating, category, message })
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error);
    showToast('✅ Thank you for your feedback!');
    document.getElementById('fb-message').value = '';
  } catch(e) { showToast('❌ '+e.message); }
}

// ══════════════════════════════════════════════════════════════════════════════
// ISSUE CARD (shared)
// ══════════════════════════════════════════════════════════════════════════════
function renderIssueCard(i) {
  const voted = votedIssues.includes(i.id);
  return `<div class="issue-card" onclick="openModal('${i.id}')">
    <div class="issue-emoji" style="background:${SEVBG[i.severity]||'#f0f0f0'}">${EMOJI[i.type]||'❓'}</div>
    <div class="issue-content">
      <div class="issue-title">${i.type} — ${i.street}</div>
      <div class="issue-meta">📍 ${i.ward} · 👤 ${i.reporter} · 🗓️ ${fmtDate(i.created_at)}</div>
      <div class="issue-desc">${i.description}</div>
    </div>
    <div class="issue-right">
      <span class="badge ${i.status}">${stLbl(i.status)}</span>
      <span class="badge ${i.severity}">${sevLbl(i.severity)}</span>
      <button class="vote-btn ${voted?'voted':''}" onclick="event.stopPropagation();vote('${i.id}',this)" ${voted?'disabled':''}>
        👍 <span>${i.votes}</span>
      </button>
    </div>
  </div>`;
}

async function vote(id, btn) {
  if (votedIssues.includes(id)) return;
  try {
    const d = await apiFetch('/issues/'+id+'/vote',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({session_id:SESSION_ID})});
    votedIssues.push(id); sessionStorage.setItem('ra_votes',JSON.stringify(votedIssues));
    btn.querySelector('span').textContent = d.votes;
    btn.classList.add('voted'); btn.disabled=true;
    const iss=allIssues.find(x=>x.id===id); if(iss) iss.votes=d.votes;
    showToast('👍 Vote recorded!');
  } catch(e) { showToast(e.message==='Already voted'?'👍 Already voted!':'❌ Could not vote'); }
}

// ══════════════════════════════════════════════════════════════════════════════
// MODAL
// ══════════════════════════════════════════════════════════════════════════════
async function openModal(id) {
  document.getElementById('modal-title').textContent = 'Loading…';
  document.getElementById('modal-body').innerHTML = '<div style="text-align:center;padding:2rem;color:var(--text-muted)">Loading details…</div>';
  document.getElementById('modal-bg').classList.add('open');
  try {
    const iss = (await apiFetch('/issues/'+id)).data;
    document.getElementById('modal-title').textContent = iss.id+' — '+iss.type;
    const tl = (iss.history||[]).map(h=>`
      <div class="tl-item">
        <strong>${stLbl(h.new_status)}</strong>${h.note?`<div>${h.note}</div>`:''}
        <div class="tl-date">${fmtDate(h.created_at)} · ${h.changed_by}</div>
      </div>`).join('');
    const photo = iss.photo ? `<img src="${iss.photo}" class="modal-photo" onerror="this.style.display='none'"/>` : '';
    document.getElementById('modal-body').innerHTML = `
      <div class="modal-badges">
        <span class="badge ${iss.status}">${stLbl(iss.status)}</span>
        <span class="badge ${iss.severity}">${sevLbl(iss.severity)} Severity</span>
        <span class="badge reported">${iss.ward}</span>
      </div>
      ${photo}
      <div class="modal-field"><strong>Location</strong>${iss.street}${iss.landmark?' · '+iss.landmark:''}</div>
      <div class="modal-field"><strong>Description</strong>${iss.description}</div>
      <div class="modal-field"><strong>Reporter</strong>${iss.reporter}${iss.contact?' · '+iss.contact:''}</div>
      <div class="modal-field"><strong>Assigned To</strong>${iss.assigned_to||'Not yet assigned'}</div>
      <div class="modal-field" style="margin-top:1rem"><strong>Status Timeline</strong>
        <div class="timeline" style="margin-top:10px">${tl||'<div class="tl-item">No history</div>'}</div>
      </div>
      <div style="margin-top:1rem;display:flex;gap:8px">
        <button class="vote-btn ${votedIssues.includes(iss.id)?'voted':''}" onclick="vote('${iss.id}',this)" ${votedIssues.includes(iss.id)?'disabled':''}>👍 <span>${iss.votes}</span> votes</button>
      </div>`;
  } catch(e) { document.getElementById('modal-body').innerHTML='<div style="color:var(--red)">Could not load details.</div>'; }
}
function closeModal() { document.getElementById('modal-bg').classList.remove('open'); }

// ══════════════════════════════════════════════════════════════════════════════
// ADMIN — DASHBOARD
// ══════════════════════════════════════════════════════════════════════════════
async function initAdminDashboard() {
  try {
    const [statsRes, issues, fbRes, crew] = await Promise.all([
      apiFetch('/stats'), loadIssues(), apiFetch('/feedback'), apiFetch('/crew')
    ]);
    const s = statsRes.data;
    const items = [
      {n:s.total,    l:'Total Reports',   c:'var(--blue)'},
      {n:s.reported, l:'Open Reports',    c:'#7C3AED'},
      {n:s.reviewing,l:'Under Review',    c:'var(--amber)'},
      {n:s.fixed,    l:'Fixed',           c:'var(--green)'},
      {n:s.critical, l:'Critical',        c:'var(--red)'},
    ];
    document.getElementById('admin-stats-row').innerHTML = items.map(i=>
      `<div class="admin-stat"><div class="n" style="color:${i.c}">${i.n}</div><div class="l">${i.l}</div></div>`
    ).join('');

    // Type chart
    const maxT = Math.max(...s.byType.map(t=>t.count),1);
    document.getElementById('chart-type').innerHTML = s.byType.map(t=>
      `<div class="bar-row">
        <div class="bar-label">${EMOJI[t.type]||'❓'} ${t.type}</div>
        <div class="bar-track"><div class="bar-fill" style="width:${(t.count/maxT*100).toFixed(0)}%;background:${TCOLORS[t.type]||'#2563EB'}">${t.count}</div></div>
      </div>`).join('');

    // Ward chart
    document.getElementById('chart-ward').innerHTML = s.byWard.map(w=>{
      const pct = w.total ? Math.round(w.fixed/w.total*100) : 0;
      return `<div class="prog-item">
        <div class="prog-head"><span>${w.ward.split('–')[0].trim()}</span><span style="color:var(--text-muted)">${w.fixed}/${w.total} (${pct}%)</span></div>
        <div class="prog-track"><div class="prog-fill" style="width:${pct}%"></div></div>
      </div>`;
    }).join('');

    // Leaflet Map
    renderLeafletMap(issues);

    // Feedback
    const fb = fbRes.data;
    const fbEl = document.getElementById('admin-feedback-list');
    if (!fb.length) { fbEl.innerHTML='<div class="no-data">No feedback submitted yet.</div>'; }
    else fbEl.innerHTML = fb.slice(0,5).map(f=>`
      <div class="fb-card">
        <div class="fb-header">
          <span class="fb-name">${f.name||f.username}</span>
          <span class="fb-stars">${'★'.repeat(f.rating)}${'☆'.repeat(5-f.rating)}</span>
        </div>
        <span class="fb-cat">${f.category}</span>
        <div class="fb-msg">${f.message}</div>
        <div class="fb-date">${fmtDate(f.created_at)}</div>
      </div>`).join('');
  } catch(e) { showToast('⚠️ Could not load dashboard data', 4000); }
}

// ══════════════════════════════════════════════════════════════════════════════
// ADMIN — MANAGE ISSUES
// ══════════════════════════════════════════════════════════════════════════════
async function initAdminIssues() {
  try {
    const [issues, crewRes] = await Promise.all([loadIssues(), apiFetch('/crew')]);
    renderAdminTable(issues, crewRes.data);
    // filter chips
    document.querySelectorAll('#page-admin-issues .filter-chip').forEach(chip=>{
      chip.addEventListener('click', async ()=>{
        document.querySelectorAll('#page-admin-issues .filter-chip').forEach(c=>c.classList.remove('active'));
        chip.classList.add('active');
        adminFilter = chip.dataset.filter;
        const filtered = filterAdminIssues(allIssues);
        renderAdminTable(filtered, crewRes.data);
      });
    });
    const searchEl = document.getElementById('admin-issue-search');
    if (searchEl) {
      searchEl.addEventListener('input', ()=>{
        adminSearch = searchEl.value.toLowerCase();
        renderAdminTable(filterAdminIssues(allIssues), crewRes.data);
      });
    }
  } catch(e) { showToast('⚠️ Could not load issues', 4000); }
}

function filterAdminIssues(issues) {
  let list = [...issues];
  if (adminFilter.startsWith('status:'))   list = list.filter(i=>i.status===adminFilter.split(':')[1]);
  if (adminFilter.startsWith('severity:')) list = list.filter(i=>i.severity===adminFilter.split(':')[1]);
  if (adminSearch) list = list.filter(i=>
    i.street.toLowerCase().includes(adminSearch)||
    i.type.toLowerCase().includes(adminSearch)||
    i.reporter.toLowerCase().includes(adminSearch)
  );
  return list;
}

function renderAdminTable(issues, crew) {
  const opts = crew.map(c=>`<option value="${c.name}">${c.name}</option>`).join('');
  document.getElementById('admin-tbody').innerHTML = issues.map(i=>`
    <tr id="arow-${i.id}">
      <td style="font-weight:700;color:var(--blue-dark)">${i.id}</td>
      <td>${EMOJI[i.type]||'❓'} ${i.type}</td>
      <td style="max-width:150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${i.street}">${i.street}</td>
      <td><span class="badge ${i.severity}">${sevLbl(i.severity)}</span></td>
      <td>${i.reporter}</td>
      <td>👍 ${i.votes}</td>
      <td>
        <select class="status-select" onchange="adminSetStatus('${i.id}',this.value)">
          <option value="reported"  ${i.status==='reported' ?'selected':''}>Reported</option>
          <option value="reviewing" ${i.status==='reviewing'?'selected':''}>Reviewing</option>
          <option value="fixed"     ${i.status==='fixed'    ?'selected':''}>Fixed</option>
          <option value="rejected"  ${i.status==='rejected' ?'selected':''}>Rejected</option>
        </select>
      </td>
      <td>
        <select class="crew-select" onchange="adminAssign('${i.id}',this.value)">
          <option value="">— Assign Crew —</option>${opts}
        </select>
      </td>
      <td>
        <button class="del-btn" onclick="adminDelete('${i.id}')">🗑 Delete</button>
      </td>
    </tr>`).join('');

  // Pre-select assigned crew
  issues.forEach(i=>{
    if (i.assigned_to) {
      const sel = document.querySelector(`#arow-${i.id} .crew-select`);
      if (sel) for (const o of sel.options) if(o.value===i.assigned_to){o.selected=true;break;}
    }
  });
}

async function adminSetStatus(id, status) {
  try {
    await apiFetch('/issues/'+id+'/status',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({status,changed_by:'admin'})});
    showToast('✅ '+id+' → '+stLbl(status));
    const iss = allIssues.find(x=>x.id===id); if(iss) iss.status=status;
  } catch(e) { showToast('❌ '+e.message); }
}

async function adminAssign(id, crew) {
  if (!crew) return;
  try {
    await apiFetch('/issues/'+id+'/assign',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({assigned_to:crew})});
    showToast('👷 '+id+' assigned to '+crew);
    const iss=allIssues.find(x=>x.id===id); if(iss) iss.assigned_to=crew;
  } catch(e) { showToast('❌ '+e.message); }
}

async function adminDelete(id) {
  if (!confirm('Delete issue '+id+'? This cannot be undone.')) return;
  try {
    await apiFetch('/issues/'+id,{method:'DELETE'});
    document.getElementById('arow-'+id)?.remove();
    allIssues = allIssues.filter(i=>i.id!==id);
    showToast('🗑 Issue '+id+' deleted');
  } catch(e) { showToast('❌ '+e.message); }
}

// ══════════════════════════════════════════════════════════════════════════════
// ADMIN — ALL REPORTS
// ══════════════════════════════════════════════════════════════════════════════
async function initAdminReports() {
  const el = document.getElementById('admin-reports-list');
  el.innerHTML = '<div class="loading-msg">Loading…</div>';
  try {
    const issues = await loadIssues();
    if (!issues.length) { el.innerHTML='<div class="loading-msg">No issues found.</div>'; return; }
    el.innerHTML = issues.map(i=>renderIssueCard(i)).join('');
  } catch(e) { el.innerHTML='<div class="loading-msg">⚠️ Could not load reports.</div>'; }
}

// ══════════════════════════════════════════════════════════════════════════════
// BOOTSTRAP
// ══════════════════════════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', ()=>{
  initAuthSlideshow();

  // Enter key on auth fields
  ['login-user','login-pass'].forEach(id=>{
    document.getElementById(id).addEventListener('keydown',e=>{if(e.key==='Enter')doLogin();});
  });
  ['su-name','su-user','su-pass'].forEach(id=>{
    document.getElementById(id).addEventListener('keydown',e=>{if(e.key==='Enter')doSignup();});
  });

  // Restore session
  if (currentUser) {
    document.getElementById('auth-screen').style.display = 'none';
    document.getElementById('app-shell').style.display   = 'block';
    buildNav();
    applyRoleUI();
    // Re-stamp the hidden username field
    const uField = document.getElementById('f-username');
    if (uField) uField.value = currentUser.username;
    showPage(isAdmin() ? 'admin-dashboard' : 'home');
  }

  // Modal close
  document.getElementById('modal-bg').addEventListener('click', e=>{
    if(e.target===document.getElementById('modal-bg')) closeModal();
  });

  // Report form
  initReportForm();
});
