// Saves how far each person has got, in this browser only (localStorage).
// { lessons: { 'hand-1': { done, best, attempts } }, xp, streak, lastDay, quizBest }

const PROGRESS_KEY = 'cuedkit.progress.v1';

function emptyProgress() {
  return { lessons: {}, xp: 0, streak: 0, lastDay: '', quizBest: null };
}

function loadProgress() {
  try {
    const saved = JSON.parse(localStorage.getItem(PROGRESS_KEY));
    if (saved && typeof saved === 'object') return Object.assign(emptyProgress(), saved);
  } catch (e) { /* no saved progress, or storage is blocked */ }
  return emptyProgress();
}

function saveProgress(progress) {
  try { localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress)); } catch (e) { /* storage blocked */ }
}

function dayString(date) {
  const pad = (n) => String(n).padStart(2, '0');
  return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate());
}

// One more day of practice: extends the streak if yesterday was a practice day too.
function touchStreak(progress) {
  const today = dayString(new Date());
  if (progress.lastDay === today) return;
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  progress.streak = progress.lastDay === dayString(yesterday) ? progress.streak + 1 : 1;
  progress.lastDay = today;
}

// Call when a lesson, practice round or quiz ends. Returns the xp earned.
function recordSession(kind, id, correct, asked) {
  const progress = loadProgress();
  const accuracy = asked > 0 ? correct / asked : 1;
  let xp = correct * 10;

  if (kind === 'lesson') {
    const previous = progress.lessons[id] || { done: false, best: 0, attempts: 0 };
    if (!previous.done) xp += 20;                       // first time through
    progress.lessons[id] = {
      done: true,
      best: Math.max(previous.best, accuracy),
      attempts: previous.attempts + 1,
    };
  } else if (kind === 'quiz') {
    progress.quizBest = Math.max(progress.quizBest || 0, accuracy);
  }

  progress.xp += xp;
  touchStreak(progress);
  saveProgress(progress);
  return { xp, accuracy, streak: progress.streak };
}
