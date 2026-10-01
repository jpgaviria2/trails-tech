const repoUrl = 'https://github.com/jpgaviria2/trails-tech';
const stateKey = 'trails-tech-progress-v1';
const lessonList = document.querySelector('#lesson-list');
const lessonView = document.querySelector('#lesson-view');
const progress = document.querySelector('#progress');

function removeStoredProgress() {
  try {
    localStorage.removeItem(stateKey);
  } catch {
    // Progress persistence is optional.
  }
}

function writeStoredProgress(value) {
  try {
    localStorage.setItem(stateKey, value);
  } catch {
    // Progress persistence is optional.
  }
}

function readStoredProgress() {
  try {
    const value = JSON.parse(localStorage.getItem(stateKey) || '[]');
    return Array.isArray(value) ? value.filter((item) => typeof item === 'string') : [];
  } catch {
    removeStoredProgress();
    return [];
  }
}

function safeExternalUrl(value) {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password) return null;
    return url.href;
  } catch {
    return null;
  }
}

function createElement(tag, options = {}) {
  const node = document.createElement(tag);
  if (options.className) node.className = options.className;
  if (options.text !== undefined) node.textContent = String(options.text);
  for (const [name, value] of Object.entries(options.attributes || {})) {
    if (value !== undefined && value !== null) node.setAttribute(name, String(value));
  }
  return node;
}

const completed = new Set(readStoredProgress());
const lessons = await fetch('./lessons.json').then((response) => {
  if (!response.ok) throw new Error(`Could not load lessons (${response.status})`);
  return response.json();
});
const knownLessonIds = new Set(lessons.map(({ id }) => id));
for (const id of [...completed]) {
  if (!knownLessonIds.has(id)) completed.delete(id);
}

function saveProgress() {
  writeStoredProgress(JSON.stringify([...completed]));
  progress.textContent = `${completed.size} of ${lessons.length} complete`;
}

function lessonNumberFromHash() {
  const match = location.hash.match(/^#lesson-(\d+)$/);
  const requested = match ? Number(match[1]) : 1;
  return Math.min(Math.max(requested, 1), lessons.length);
}

function renderList() {
  const cards = lessons.map((lesson) => {
    const isComplete = completed.has(lesson.id);
    const card = createElement('a', {
      className: `lesson-card${isComplete ? ' is-complete' : ''}`,
      attributes: { href: `#lesson-${lesson.day}`, 'data-day': lesson.day },
    });
    card.append(createElement('span', { className: 'lesson-card__number', text: String(lesson.day).padStart(2, '0') }));

    const copy = createElement('span');
    const date = new Date(`${lesson.date}T12:00:00`).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' });
    copy.append(
      createElement('small', { text: `Week ${lesson.week} · ${date}` }),
      createElement('strong', { text: lesson.title }),
    );
    card.append(copy);

    card.append(createElement('span', {
      className: 'lesson-card__check',
      text: isComplete ? '✓' : '→',
      attributes: { 'aria-label': isComplete ? 'Complete' : 'Not complete' },
    }));
    return card;
  });
  lessonList.replaceChildren(...cards);
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

function makeActivity(label, title, text, extraClass = '') {
  const section = createElement('section', { className: `activity${extraClass}` });
  section.append(
    createElement('p', { className: 'eyebrow', text: label }),
    createElement('h3', { text: title }),
    createElement('p', { text }),
  );
  return section;
}

function renderLesson() {
  const lesson = lessons[lessonNumberFromHash() - 1];
  document.querySelectorAll('.lesson-card').forEach((card) => card.toggleAttribute('aria-current', Number(card.dataset.day) === lesson.day));

  const kicker = createElement('p', { className: 'eyebrow', text: `Day ${lesson.day} · Week ${lesson.week}` });
  const title = createElement('h2', { text: lesson.title });
  const outcome = createElement('p', { className: 'outcome' });
  outcome.append(createElement('strong', { text: 'What you’ll learn: ' }), document.createTextNode(lesson.outcome));

  const actions = createElement('div', { className: 'lesson-actions' });
  const listen = createElement('button', {
    className: 'button button--small',
    text: 'Listen to this lesson',
    attributes: { type: 'button' },
  });
  const suggestion = createElement('a', {
    className: 'text-link',
    text: 'Suggest an improvement ↗',
    attributes: {
      href: `${repoUrl}/issues/new?title=${encodeURIComponent(`Lesson ${lesson.day} suggestion`)}`,
      target: '_blank',
      rel: 'noopener noreferrer',
    },
  });
  actions.append(listen, suggestion);

  const reading = createElement('div', { className: 'reading' });
  reading.append(...lesson.reading.map((paragraph) => createElement('p', { text: paragraph })));

  const sources = createElement('section', { className: 'sources' });
  sources.append(createElement('h3', { text: 'Sources and further reading' }));
  const sourceList = createElement('ul');
  for (const source of lesson.sources) {
    const href = safeExternalUrl(source.url);
    if (!href) continue;
    const item = createElement('li');
    item.append(createElement('a', {
      text: `${source.label} ↗`,
      attributes: { href, target: '_blank', rel: 'noopener noreferrer' },
    }));
    sourceList.append(item);
  }
  sources.append(sourceList);

  const completion = createElement('div', { className: 'completion' });
  const label = createElement('label');
  const checkbox = createElement('input', { attributes: { type: 'checkbox' } });
  checkbox.checked = completed.has(lesson.id);
  label.append(checkbox, document.createTextNode(' Mark lesson complete'));
  completion.append(label);
  if (lesson.day < lessons.length) {
    completion.append(createElement('a', {
      className: 'button button--small',
      text: 'Next lesson →',
      attributes: { href: `#lesson-${lesson.day + 1}` },
    }));
  } else {
    completion.append(createElement('strong', { text: 'Ready for the meetup.' }));
  }

  lessonView.replaceChildren(
    kicker,
    title,
    outcome,
    actions,
    reading,
    makeActivity('Try it', 'Exercise', lesson.exercise),
    makeActivity('Talk about it', 'Discussion', lesson.discussion, ' activity--discussion'),
    sources,
    completion,
  );

  listen.addEventListener('click', () => speakLesson(lesson));
  checkbox.addEventListener('change', () => {
    checkbox.checked ? completed.add(lesson.id) : completed.delete(lesson.id);
    saveProgress();
    renderList();
    document.querySelector(`[data-day="${lesson.day}"]`)?.setAttribute('aria-current', 'true');
  });
}

window.addEventListener('hashchange', renderLesson);
renderList();
saveProgress();
renderLesson();
