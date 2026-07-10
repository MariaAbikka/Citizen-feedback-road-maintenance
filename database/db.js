// database/db.js
// Pure JSON file-based database — no native modules, works on all OS
'use strict';

const fs   = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const DB_FILE = path.join(__dirname, 'roadalert_data.json');

// ── Default empty schema ──────────────────────────────────────────────────────
const DEFAULT = {
  issues: [],
  votes: [],
  status_history: [],
  crew: [],
  feedback: [],
  users: []
};

// ── Load / Save ───────────────────────────────────────────────────────────────
function load() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, 'utf8');
      const data = JSON.parse(raw);
      // Merge with default to handle missing keys
      return { ...DEFAULT, ...data };
    }
  } catch (e) {
    console.warn('⚠️  Could not parse DB file, resetting:', e.message);
  }
  return JSON.parse(JSON.stringify(DEFAULT));
}

function save(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8');
}

// ── Seed data ─────────────────────────────────────────────────────────────────
function seed(data) {
  const now = new Date().toISOString();

  data.crew = [
    { id: 1, name: 'Team Alpha – Ramachandran & Co.',  ward: 'Ward 1 – Central',  phone: '9000000001' },
    { id: 2, name: 'Team Bravo – Selvan Unit',          ward: 'Ward 2 – North',    phone: '9000000002' },
    { id: 3, name: 'Team Charlie – K. Arasu',           ward: 'Ward 3 – South',    phone: '9000000003' },
    { id: 4, name: 'Team Delta – S. Murthy',            ward: 'Ward 4 – East',     phone: '9000000004' },
    { id: 5, name: 'Team Echo – Anand Group',           ward: 'Ward 5 – West',     phone: '9000000005' },
  ];

  const seedIssues = [
    { id:'RA-001', type:'Pothole',      severity:'high', status:'reviewing', street:'MG Road, Near Bus Stop 14',   ward:'Ward 1 – Central', description:'Large pothole 60cm wide. Vehicles swerving dangerously.',       reporter:'Priya Sharma', contact:'priya@email.com',   votes:18, lat:13.0827, lng:80.2707, assigned_to:'Team Alpha – Ramachandran & Co.',  photo:null, created_at:'2026-03-10T09:00:00.000Z', updated_at:'2026-03-10T09:00:00.000Z' },
    { id:'RA-002', type:'Broken Light', severity:'med',  status:'reported',  street:'Anna Nagar 2nd Avenue',       ward:'Ward 2 – North',   description:'Street light out for 3 days. Area is dark after 8pm.',          reporter:'Rajan Kumar',  contact:'9876543210',        votes:9,  lat:13.0900, lng:80.2100, assigned_to:null, photo:null, created_at:'2026-03-11T10:00:00.000Z', updated_at:'2026-03-11T10:00:00.000Z' },
    { id:'RA-003', type:'Flooding',     severity:'high', status:'reviewing', street:'T. Nagar Bus Terminus',       ward:'Ward 3 – South',   description:'2 feet of water after rain. Traffic completely blocked.',        reporter:'Meena Vijay',  contact:'meena@email.com',   votes:24, lat:13.0400, lng:80.2334, assigned_to:'Team Bravo – Selvan Unit', photo:null, created_at:'2026-03-12T08:00:00.000Z', updated_at:'2026-03-12T08:00:00.000Z' },
    { id:'RA-004', type:'Road Crack',   severity:'low',  status:'fixed',     street:'Adyar Bridge Approach',       ward:'Ward 4 – East',    description:'Crack on footpath near pedestrian crossing.',                   reporter:'Deepak Raj',   contact:'9123456780',        votes:4,  lat:13.0067, lng:80.2206, assigned_to:'Team Alpha – Ramachandran & Co.', photo:null, created_at:'2026-03-08T11:00:00.000Z', updated_at:'2026-03-09T14:00:00.000Z' },
    { id:'RA-005', type:'Damaged Sign', severity:'med',  status:'reported',  street:'Velachery Main Road',         ward:'Ward 5 – West',    description:'Stop sign knocked over. Risk to pedestrians at junction.',       reporter:'Kavitha Mani', contact:'kavitha@email.com', votes:7,  lat:12.9815, lng:80.2180, assigned_to:null, photo:null, created_at:'2026-03-13T07:00:00.000Z', updated_at:'2026-03-13T07:00:00.000Z' },
    { id:'RA-006', type:'Garbage',      severity:'low',  status:'fixed',     street:'Besant Nagar Beach Road',     ward:'Ward 4 – East',    description:'Garbage pile blocking the entire pedestrian footpath.',         reporter:'Suresh Patel', contact:'suresh@email.com',  votes:3,  lat:13.0002, lng:80.2710, assigned_to:'Team Charlie – K. Arasu', photo:null, created_at:'2026-03-09T12:00:00.000Z', updated_at:'2026-03-10T16:00:00.000Z' },
  ];

  data.issues = seedIssues;

  data.status_history = [
    { id:1,  issue_id:'RA-001', old_status:null,        new_status:'reported',  changed_by:'Priya Sharma',  note:'Issue first reported', created_at:'2026-03-10T09:00:00.000Z' },
    { id:2,  issue_id:'RA-001', old_status:'reported',  new_status:'reviewing', changed_by:'admin',         note:'Assigned for inspection', created_at:'2026-03-10T11:00:00.000Z' },
    { id:3,  issue_id:'RA-002', old_status:null,        new_status:'reported',  changed_by:'Rajan Kumar',   note:'Issue first reported', created_at:'2026-03-11T10:00:00.000Z' },
    { id:4,  issue_id:'RA-003', old_status:null,        new_status:'reported',  changed_by:'Meena Vijay',   note:'Issue first reported', created_at:'2026-03-12T08:00:00.000Z' },
    { id:5,  issue_id:'RA-003', old_status:'reported',  new_status:'reviewing', changed_by:'admin',         note:'Assigned for inspection', created_at:'2026-03-12T10:00:00.000Z' },
    { id:6,  issue_id:'RA-004', old_status:null,        new_status:'reported',  changed_by:'Deepak Raj',    note:'Issue first reported', created_at:'2026-03-08T11:00:00.000Z' },
    { id:7,  issue_id:'RA-004', old_status:'reported',  new_status:'reviewing', changed_by:'admin',         note:'Assigned for inspection', created_at:'2026-03-08T14:00:00.000Z' },
    { id:8,  issue_id:'RA-004', old_status:'reviewing', new_status:'fixed',     changed_by:'admin',         note:'Repair completed and verified', created_at:'2026-03-09T14:00:00.000Z' },
    { id:9,  issue_id:'RA-005', old_status:null,        new_status:'reported',  changed_by:'Kavitha Mani',  note:'Issue first reported', created_at:'2026-03-13T07:00:00.000Z' },
    { id:10, issue_id:'RA-006', old_status:null,        new_status:'reported',  changed_by:'Suresh Patel',  note:'Issue first reported', created_at:'2026-03-09T12:00:00.000Z' },
    { id:11, issue_id:'RA-006', old_status:'reported',  new_status:'reviewing', changed_by:'admin',         note:'Assigned for inspection', created_at:'2026-03-09T14:00:00.000Z' },
    { id:12, issue_id:'RA-006', old_status:'reviewing', new_status:'fixed',     changed_by:'admin',         note:'Repair completed and verified', created_at:'2026-03-10T16:00:00.000Z' },
  ];

  console.log('✅  Database seeded with sample data');
}

// ── Initialize ────────────────────────────────────────────────────────────────
function initDB() {
  let data = load();
  if (data.issues.length === 0) {
    seed(data);
    save(data);
  }
  console.log(`✅  Database loaded: ${data.issues.length} issues, ${data.crew.length} crews`);
  return {
    // ── ISSUES ──────────────────────────────────────────────────────────────
    getIssues(filters = {}) {
      let list = [...data.issues];
      if (filters.status   && filters.status   !== 'all') list = list.filter(i => i.status   === filters.status);
      if (filters.severity && filters.severity !== 'all') list = list.filter(i => i.severity === filters.severity);
      if (filters.ward     && filters.ward     !== 'all') list = list.filter(i => i.ward     === filters.ward);
      if (filters.username) list = list.filter(i => i.username === filters.username);
      if (filters.reporter) list = list.filter(i => i.reporter === filters.reporter);
      if (filters.search) {
        const q = filters.search.toLowerCase();
        list = list.filter(i =>
          i.street.toLowerCase().includes(q) ||
          i.type.toLowerCase().includes(q)   ||
          i.description.toLowerCase().includes(q)
        );
      }
      return list.sort((a, b) => {
        const sev = { high:0, med:1, low:2 };
        return sev[a.severity] - sev[b.severity] || new Date(b.created_at) - new Date(a.created_at);
      });
    },

    getIssue(id) {
      const issue = data.issues.find(i => i.id === id);
      if (!issue) return null;
      const history = data.status_history.filter(h => h.issue_id === id)
        .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
      return { ...issue, history };
    },

    nextID() {
      if (data.issues.length === 0) return 'RA-001';
      const nums = data.issues.map(i => parseInt(i.id.split('-')[1], 10));
      return 'RA-' + String(Math.max(...nums) + 1).padStart(3, '0');
    },

    createIssue(fields) {
      const issue = {
        id: this.nextID(),
        type: fields.type,
        severity: fields.severity,
        status: 'reported',
        street: fields.street,
        landmark: fields.landmark || null,
        ward: fields.ward,
        description: fields.description,
        reporter: fields.reporter,
        username: fields.username || '',
        contact: fields.contact || null,
        photo: fields.photo || null,
        votes: 0,
        assigned_to: null,
        lat: fields.lat,
        lng: fields.lng,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      data.issues.push(issue);
      data.status_history.push({
        id: data.status_history.length + 1,
        issue_id: issue.id,
        old_status: null,
        new_status: 'reported',
        changed_by: fields.reporter,
        note: 'Issue submitted by citizen',
        created_at: new Date().toISOString(),
      });
      save(data);
      return issue;
    },

    updateStatus(id, status, changed_by, note) {
      const issue = data.issues.find(i => i.id === id);
      if (!issue) return null;
      const old = issue.status;
      issue.status = status;
      issue.updated_at = new Date().toISOString();
      data.status_history.push({
        id: data.status_history.length + 1,
        issue_id: id,
        old_status: old,
        new_status: status,
        changed_by: changed_by || 'admin',
        note: note || null,
        created_at: new Date().toISOString(),
      });
      save(data);
      return issue;
    },

    assignCrew(id, assigned_to) {
      const issue = data.issues.find(i => i.id === id);
      if (!issue) return null;
      issue.assigned_to = assigned_to;
      issue.updated_at  = new Date().toISOString();
      save(data);
      return issue;
    },

    deleteIssue(id) {
      const idx = data.issues.findIndex(i => i.id === id);
      if (idx === -1) return false;
      data.issues.splice(idx, 1);
      data.status_history = data.status_history.filter(h => h.issue_id !== id);
      data.votes = data.votes.filter(v => v.issue_id !== id);
      save(data);
      return true;
    },

    // ── VOTES ────────────────────────────────────────────────────────────────
    hasVoted(issue_id, session_id) {
      return data.votes.some(v => v.issue_id === issue_id && v.session_id === session_id);
    },

    addVote(issue_id, session_id) {
      if (this.hasVoted(issue_id, session_id)) return null;
      data.votes.push({ issue_id, session_id, created_at: new Date().toISOString() });
      const issue = data.issues.find(i => i.id === issue_id);
      if (issue) issue.votes++;
      save(data);
      return issue ? issue.votes : 0;
    },

    // ── STATS ────────────────────────────────────────────────────────────────
    getStats() {
      const issues = data.issues;
      const total       = issues.length;
      const reported    = issues.filter(i => i.status === 'reported').length;
      const reviewing   = issues.filter(i => i.status === 'reviewing').length;
      const fixed       = issues.filter(i => i.status === 'fixed').length;
      const critical    = issues.filter(i => i.severity === 'high').length;
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const recentFixed = issues.filter(i => i.status === 'fixed' && i.updated_at >= thirtyDaysAgo).length;

      const typeMap = {};
      issues.forEach(i => { typeMap[i.type] = (typeMap[i.type] || 0) + 1; });
      const byType = Object.entries(typeMap).map(([type, count]) => ({ type, count })).sort((a,b) => b.count - a.count);

      const wardMap = {};
      issues.forEach(i => {
        if (!wardMap[i.ward]) wardMap[i.ward] = { ward: i.ward, total: 0, fixed: 0 };
        wardMap[i.ward].total++;
        if (i.status === 'fixed') wardMap[i.ward].fixed++;
      });
      const byWard = Object.values(wardMap);

      return { total, reported, reviewing, fixed, critical, recentFixed, byType, byWard };
    },

    // ── CREW ─────────────────────────────────────────────────────────────────
    getCrew() { return [...data.crew]; },

    // ── FEEDBACK ─────────────────────────────────────────────────────────────
    addFeedback(fields) {
      const fb = {
        id: data.feedback.length + 1,
        username: fields.username,
        name: fields.name,
        rating: fields.rating,
        category: fields.category,
        message: fields.message,
        created_at: new Date().toISOString(),
      };
      data.feedback.push(fb);
      save(data);
      return fb;
    },

    getFeedback() {
      return [...data.feedback].sort((a,b) => new Date(b.created_at) - new Date(a.created_at));
    },
  };
}

module.exports = { initDB };
