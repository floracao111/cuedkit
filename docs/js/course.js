// use.html (the course home): the units and lessons in order, which ones are done, and a
// button that continues with the next lesson.

function courseNode(tag, className, text) {
  const n = document.createElement(tag);
  if (className) n.className = className;
  if (text !== undefined) n.textContent = text;
  return n;
}

function courseBilingual(text, className) {
  const wrap = courseNode('div', className);
  wrap.appendChild(courseNode('span', 'zh', text.zh));
  wrap.appendChild(courseNode('span', 'en', text.en));
  return wrap;
}

function renderCourse() {
  const progress = loadProgress();
  const done = LESSONS.filter((l) => progress.lessons[l.id] && progress.lessons[l.id].done).length;
  const nextLesson = LESSONS.find((l) => !(progress.lessons[l.id] && progress.lessons[l.id].done));

  const card = document.getElementById('continue-card');
  if (nextLesson && done > 0) {
    card.hidden = false;
    card.href = 'lesson.html?lesson=' + nextLesson.id;
    document.getElementById('continue-zh').textContent = '继续：' + nextLesson.title.zh;
    document.getElementById('continue-en').textContent = 'Continue: ' + nextLesson.title.en;
  }

  const unitsEl = document.getElementById('units');
  UNITS.forEach((unit) => {
    const unitEl = courseNode('section', 'unit');

    const head = courseNode('div', 'unit-head');
    head.appendChild(courseBilingual(unit.title, 'unit-title'));
    unitEl.appendChild(head);

    const list = courseNode('div', 'lesson-list');
    LESSONS.filter((l) => l.unit === unit.id).forEach((lesson) => {
      const saved = progress.lessons[lesson.id];
      const isDone = Boolean(saved && saved.done);
      const link = courseNode('a', 'lesson-link' + (isDone ? ' done' : '') + (nextLesson && nextLesson.id === lesson.id ? ' next' : ''));
      link.href = 'lesson.html?lesson=' + lesson.id;
      link.appendChild(courseNode('span', 'lesson-mark', isDone ? '✓' : String(LESSONS.indexOf(lesson) + 1)));
      link.appendChild(courseBilingual(lesson.title, 'lesson-name'));
      if (isDone) link.appendChild(courseNode('span', 'lesson-score', Math.round(saved.best * 100) + '%'));
      list.appendChild(link);
    });
    unitEl.appendChild(list);
    unitsEl.appendChild(unitEl);
  });
}

document.addEventListener('DOMContentLoaded', renderCourse);
