/* ============================================================
   Tempo — seed data & constants
   ============================================================ */

export const DAYS = [
  'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'
];
export const DAYS_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];
export const MONTHS_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

/** Colours are defined as CSS custom properties in tokens.css */
export const SUBJECTS = {
  'SE&PM':              { color: 'moss',   room: 'Room 204' },
  'RM&IPR':             { color: 'ocean',  room: 'Room 301' },
  'CV':                 { color: 'plum',   room: 'Lab A' },
  'CN':                 { color: 'clay',   room: 'Room 112' },
  'TOC':                { color: 'ochre',  room: 'Room 118' },
  'TC':                 { color: 'teal',   room: 'Room 210' },
  'DV':                 { color: 'wine',   room: 'Room 115' },
  'EVS':                { color: 'lime',   room: 'Room 105' },
  'Library':            { color: 'slate',  room: 'Central Library' },
  'NSS':                { color: 'indigo', room: 'Grounds' },
  'Mentoring':          { color: 'slate',  room: 'Room 204' },
  'Mini Project':       { color: 'indigo', room: 'Project Lab' },
  'Remedial':           { color: 'slate',  room: 'Room 112' },
  'Forum Activity':     { color: 'clay',   room: 'Auditorium' },
  'DV Lab(B2)/CN Lab(B1)': { color: 'wine', room: 'Lab B1 · B2', short: 'DV / CN Lab' },
  'Break':              { color: 'slate',  room: '' },
  'Lunch Break':        { color: 'slate',  room: '' }
};

export const KIND_LABEL = {
  class: 'Lecture',
  lab: 'Lab',
  break: 'Break',
  lunch: 'Lunch',
  activity: 'Activity'
};

let __id = 0;
export function uid(prefix = 'id') {
  __id += 1;
  return `${prefix}_${Date.now().toString(36)}_${__id}`;
}

/** Canonical 5th-semester timetable (day: 1 = Monday … 6 = Saturday) */
export const DEFAULT_PERIODS = [
  // Monday
  { id: 'm1', day: 1, start: '09:00', end: '10:00', subject: 'SE&PM', kind: 'class' },
  { id: 'm2', day: 1, start: '10:00', end: '10:30', subject: 'Break', kind: 'break' },
  { id: 'm3', day: 1, start: '10:30', end: '11:30', subject: 'Library', kind: 'class' },
  { id: 'm4', day: 1, start: '11:30', end: '12:30', subject: 'RM&IPR', kind: 'class' },
  { id: 'm5', day: 1, start: '12:30', end: '13:30', subject: 'Lunch Break', kind: 'lunch' },
  { id: 'm6', day: 1, start: '13:30', end: '14:30', subject: 'CV', kind: 'class' },
  { id: 'm7', day: 1, start: '14:30', end: '15:30', subject: 'Mentoring', kind: 'class' },
  { id: 'm8', day: 1, start: '15:30', end: '16:30', subject: 'NSS', kind: 'activity' },
  // Tuesday
  { id: 't1', day: 2, start: '09:00', end: '10:00', subject: 'RM&IPR', kind: 'class' },
  { id: 't2', day: 2, start: '10:00', end: '10:30', subject: 'Break', kind: 'break' },
  { id: 't3', day: 2, start: '10:30', end: '11:30', subject: 'TOC', kind: 'class' },
  { id: 't4', day: 2, start: '11:30', end: '12:30', subject: 'DV Lab(B2)/CN Lab(B1)', kind: 'lab' },
  { id: 't5', day: 2, start: '12:30', end: '13:30', subject: 'Lunch Break', kind: 'lunch' },
  { id: 't6', day: 2, start: '13:30', end: '14:30', subject: 'Mini Project', kind: 'class' },
  { id: 't7', day: 2, start: '14:30', end: '15:30', subject: 'NSS', kind: 'activity' },
  // Wednesday
  { id: 'w1', day: 3, start: '09:00', end: '10:00', subject: 'CN', kind: 'class' },
  { id: 'w2', day: 3, start: '10:00', end: '10:30', subject: 'Break', kind: 'break' },
  { id: 'w3', day: 3, start: '10:30', end: '11:30', subject: 'EVS', kind: 'class' },
  { id: 'w4', day: 3, start: '11:30', end: '12:30', subject: 'SE&PM', kind: 'class' },
  { id: 'w5', day: 3, start: '12:30', end: '13:30', subject: 'Lunch Break', kind: 'lunch' },
  { id: 'w6', day: 3, start: '13:30', end: '14:30', subject: 'TC', kind: 'class' },
  { id: 'w7', day: 3, start: '14:30', end: '15:30', subject: 'Remedial', kind: 'class' },
  { id: 'w8', day: 3, start: '15:30', end: '16:30', subject: 'Mini Project', kind: 'class' },
  // Thursday
  { id: 'h1', day: 4, start: '09:00', end: '10:00', subject: 'RM&IPR', kind: 'class' },
  { id: 'h2', day: 4, start: '10:00', end: '10:30', subject: 'Break', kind: 'break' },
  { id: 'h3', day: 4, start: '10:30', end: '11:30', subject: 'CV', kind: 'class' },
  { id: 'h4', day: 4, start: '11:30', end: '12:30', subject: 'CN', kind: 'class' },
  { id: 'h5', day: 4, start: '12:30', end: '13:30', subject: 'Lunch Break', kind: 'lunch' },
  { id: 'h6', day: 4, start: '13:30', end: '14:30', subject: 'SE&PM', kind: 'class' },
  { id: 'h7', day: 4, start: '14:30', end: '15:30', subject: 'TC', kind: 'class' },
  // Friday
  { id: 'f1', day: 5, start: '09:00', end: '10:00', subject: 'TC', kind: 'class' },
  { id: 'f2', day: 5, start: '10:00', end: '10:30', subject: 'Break', kind: 'break' },
  { id: 'f3', day: 5, start: '10:30', end: '11:30', subject: 'CN', kind: 'class' },
  { id: 'f4', day: 5, start: '11:30', end: '12:30', subject: 'SE&PM', kind: 'class' },
  { id: 'f5', day: 5, start: '12:30', end: '13:30', subject: 'Lunch Break', kind: 'lunch' },
  { id: 'f6', day: 5, start: '13:30', end: '14:30', subject: 'CV', kind: 'class' },
  { id: 'f7', day: 5, start: '14:30', end: '15:30', subject: 'Forum Activity', kind: 'activity' },
  // Saturday
  { id: 's1', day: 6, start: '09:00', end: '10:00', subject: 'DV', kind: 'class' },
  { id: 's2', day: 6, start: '10:00', end: '10:30', subject: 'Break', kind: 'break' },
  { id: 's3', day: 6, start: '10:30', end: '11:30', subject: 'RM&IPR', kind: 'class' },
  { id: 's4', day: 6, start: '11:30', end: '12:30', subject: 'TOC', kind: 'class' }
];

export const DEFAULT_SETTINGS = {
  name: '',
  theme: 'system',
  notify: true,
  lead: 10,
  weekMode: 'list',
  gcalAuto: true,   // auto-sync timetable changes to Google Calendar
  gcalEnd: ''       // semester end date (yyyy-mm-dd); '' = 16 weeks from now
};

/** Demo tasks, dated relative to first launch so the app feels alive */
export function seedTasks(now = new Date()) {
  const day = (offset) => {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    d.setDate(d.getDate() + offset);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  };
  return [
    {
      id: uid('task'),
      title: 'Submit the SRS document for SE&PM',
      subject: 'SE&PM',
      due: day(2),
      time: '23:59',
      priority: 'high',
      done: false,
      notes: 'Include the use-case diagrams and the revised scope statement.'
    },
    {
      id: uid('task'),
      title: 'TOC problem set 4 — decidability',
      subject: 'TOC',
      due: day(4),
      time: '09:00',
      priority: 'medium',
      done: false,
      notes: ''
    },
    {
      id: uid('task'),
      title: 'Draft the CV mini-project report',
      subject: 'CV',
      due: day(6),
      time: '18:00',
      priority: 'medium',
      done: false,
      notes: ''
    },
    {
      id: uid('task'),
      title: 'Return library books before the due date',
      subject: 'Library',
      due: day(0),
      time: '17:00',
      priority: 'low',
      done: false,
      notes: ''
    }
  ];
}

export function pad(n) { return String(n).padStart(2, '0'); }

export function colorOf(subject) {
  const meta = SUBJECTS[subject];
  return meta ? meta.color : 'slate';
}

export function shortName(subject) {
  const meta = SUBJECTS[subject];
  return meta && meta.short ? meta.short : subject;
}

export function roomOf(subject) {
  const meta = SUBJECTS[subject];
  return meta ? meta.room : '';
}
