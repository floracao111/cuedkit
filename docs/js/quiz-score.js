// quiz.html: shows the best score so far.
document.addEventListener('DOMContentLoaded', () => {
  const best = loadProgress().quizBest;
  if (best === null) return;
  const el = document.getElementById('best-score');
  el.hidden = false;
  const percent = Math.round(best * 100) + '%';
  el.innerHTML = '<span class="zh">最高分：' + percent + '</span><span class="en">Best score: ' + percent + '</span>';
});
