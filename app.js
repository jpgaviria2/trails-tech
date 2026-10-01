const repoUrl = 'https://github.com/jpgaviria2/trails-tech';
const stateKey = 'trails-tech-progress-v1';
const lessonList = document.querySelector('#lesson-list');
const lessonView = document.querySelector('#lesson-view');
const progress = document.querySelector('#progress');

const completed = new Set(JSON.parse(localStorage.getItem(stateKey) || '[]'));
const lessons = await fetch('./lessons.json').then((response) => {
  if (!response.ok) throw new Error(`Could not load lessons (${response.status})`);
  return response.json();
});

function saveProgress() {
  localStorage.setItem(stateKey, JSON.stringify([...completed]));
  progress.textContent = `${completed.size} of ${lessons.length} complete`;
}

function lessonNumberFromHash() {
  const match = location.hash.match(/^#lesson-(\d+)$/);
  const requested = match ? Number(match[1]) : 1;
  return Math.min(Math.max(requested, 1), lessons.length);
}

function renderList() {
  lessonList.innerHTML = lessons.map((lesson) => `
    <a class="lesson-card ${completed.has(lesson.id) ? 'is-complete' : ''}" href="#lesson-${lesson.day}" data-day="${lesson.day}">
      <span class="lesson-card__number">${String(lesson.day).padStart(2, '0')}</span>
      <span><small>Week ${lesson.week} · ${new Date(`${lesson.date}T12:00:00`).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })}</small><strong>${lesson.title}</strong></span>
      <span class="lesson-card__check" aria-label="${completed.has(lesson.id) ? 'Complete' : 'Not complete'}">${completed.has(lesson.id) ? '✓' : '→'}</span>
    </a>
  `).join('');
}

function speakLesson(lesson) {
  if (!('speechSynthesis' in window)) {
    alert('Audio playback is not supported by this browser.');
    return;
  }
  speechSynthesis.cancel();
  const words = [lesson.title, lesson.outcome, ...lesson.reading, `Exercise. ${lesson.exercise}`, `Discussion. ${lesson.discussion}`].join(' ');
  speechSynthesis.speak(new SpeechSynthesisUtterance(words));
}

function renderLesson() {
  const lesson = lessons[lessonNumberFromHash() - 1];
  document.querySelectorAll('.lesson-card').forEach((card) => card.toggleAttribute('aria-current', Number(card.dataset.day) === lesson.day));
  lessonView.innerHTML = `
    <p class="eyebrow">Day ${lesson.day} · Week ${lesson.week}</p>
    <h2>${lesson.title}</h2>
    <p class="outcome"><strong>What you’ll learn:</strong> ${lesson.outcome}</p>
    <div class="lesson-actions">
      <button class="button button--small" type="button" data-listen>Listen to this lesson</button>
      <a class="text-link" href="${repoUrl}/issues/new?title=Lesson%20${lesson.day}%20suggestion" target="_blank" rel="noreferrer">Suggest an improvement ↗</a>
    </div>
    <div class="reading">${lesson.reading.map((paragraph) => `<p>${paragraph}</p>`).join('')}</div>
    <section class="activity"><p class="eyebrow">Try it</p><h3>Exercise</h3><p>${lesson.exercise}</p></section>
    <section class="activity activity--discussion"><p class="eyebrow">Talk about it</p><h3>Discussion</h3><p>${lesson.discussion}</p></section>
    <section class="sources"><h3>Sources and further reading</h3><ul>${lesson.sources.map((source) => `<li><a href="${source.url}" target="_blank" rel="noreferrer">${source.label} ↗</a></li>`).join('')}</ul></section>
    <div class="completion">
      <label><input type="checkbox" data-complete ${completed.has(lesson.id) ? 'checked' : ''}> Mark lesson complete</label>
      ${lesson.day < lessons.length ? `<a class="button button--small" href="#lesson-${lesson.day + 1}">Next lesson →</a>` : '<strong>Ready for the meetup.</strong>'}
    </div>
  `;

  lessonView.querySelector('[data-listen]').addEventListener('click', () => speakLesson(lesson));
  lessonView.querySelector('[data-complete]').addEventListener('change', (event) => {
    event.target.checked ? completed.add(lesson.id) : completed.delete(lesson.id);
    saveProgress();
    renderList();
    document.querySelector(`[data-day="${lesson.day}"]`)?.setAttribute('aria-current', 'true');
  });
}

window.addEventListener('hashchange', renderLesson);
renderList();
saveProgress();
renderLesson();
