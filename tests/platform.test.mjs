import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);

async function read(relativePath) {
  return readFile(new URL(relativePath, root), 'utf8');
}

test('curriculum contains 20 complete lessons organized into four modules', async () => {
  const lessons = JSON.parse(await read('lessons.json'));
  assert.equal(lessons.length, 20);
  assert.equal(new Set(lessons.map(({ id }) => id)).size, 20);
  assert.deepEqual(lessons.map(({ day }) => day), Array.from({ length: 20 }, (_, index) => index + 1));
  assert.deepEqual([...new Set(lessons.map(({ week }) => week))], [1, 2, 3, 4]);

  for (const lesson of lessons) {
    for (const field of ['id', 'day', 'week', 'title', 'outcome', 'reading', 'exercise', 'discussion', 'sources']) {
      assert.ok(lesson[field], `lesson ${lesson.id ?? 'unknown'} is missing ${field}`);
    }
    assert.ok(Array.isArray(lesson.reading) && lesson.reading.length >= 2);
    assert.ok(Array.isArray(lesson.sources) && lesson.sources.length >= 1);
    for (const value of [lesson.title, lesson.outcome, lesson.exercise, lesson.discussion, ...lesson.reading]) {
      assert.doesNotMatch(value, /[<>]/, `lesson ${lesson.id} contains HTML markup`);
    }
    for (const source of lesson.sources) {
      assert.doesNotMatch(source.label, /[<>]/, `lesson ${lesson.id} source label contains HTML markup`);
      assert.equal(new URL(source.url).protocol, 'https:');
    }
  }
});

test('standalone page exposes learning and collaboration controls', async () => {
  const html = await read('index.html');
  for (const required of [
    'id="lesson-list"',
    'id="lesson-view"',
    'id="progress"',
    'Contribute on GitHub',
    'Licensed under the MIT License',
  ]) {
    assert.match(html, new RegExp(required));
  }
  assert.match(html, /Content-Security-Policy/);
  assert.match(html, /default-src 'self'/);
});

test('learning path copy and lesson labels remain reusable after the original meetup', async () => {
  const [html, app, readme] = await Promise.all([
    read('index.html'),
    read('app.js'),
    read('README.md'),
  ]);

  assert.doesNotMatch(`${html}\n${app}\n${readme}`, /October 28|ready for the meetup|followed by the Trails Tech meetup|4 weeks/i);
  assert.match(html, /<strong>4 modules<\/strong><span>20 lessons<\/span>/i);
  assert.doesNotMatch(app, /new Date\(`\$\{lesson\.date\}/);
  assert.match(app, /Module \$\{lesson\.week\} · Lesson \$\{lesson\.day\}/);
  assert.match(app, /Learning path complete\./);
  assert.match(html, /finish with a small, reviewable project you can keep improving and share with others/i);
});

test('client rendering avoids HTML injection and validates stored state and external URLs', async () => {
  const app = await read('app.js');
  assert.doesNotMatch(app, /\.innerHTML\s*=/);
  assert.match(app, /\.textContent\s*=/);
  assert.match(app, /function safeExternalUrl/);
  assert.match(app, /protocol !== 'https:'|protocol === 'https:'/);
  assert.match(app, /try\s*\{[\s\S]*JSON\.parse/);
  assert.match(app, /function removeStoredProgress/);
  assert.match(app, /function writeStoredProgress/);
  assert.match(app, /try\s*\{[\s\S]*localStorage\.removeItem/);
  assert.match(app, /try\s*\{[\s\S]*localStorage\.setItem/);
});

test('repository documents open collaboration under MIT', async () => {
  const [license, readme, contributing, codeOfConduct] = await Promise.all([
    read('LICENSE'),
    read('README.md'),
    read('CONTRIBUTING.md'),
    read('CODE_OF_CONDUCT.md'),
  ]);
  assert.match(license, /MIT License/);
  assert.match(readme, /GitHub Pages/);
  assert.match(readme, /MIT/);
  assert.match(contributing, /pull request/i);
  assert.match(contributing, /lesson/i);
  assert.match(codeOfConduct, /Contributor Covenant/);
});

test('GitHub Actions deploys the standalone site to Pages', async () => {
  const workflow = await read('.github/workflows/pages.yml');
  assert.match(workflow, /actions\/checkout@[a-f0-9]{40}/);
  assert.match(workflow, /actions\/setup-node@[a-f0-9]{40}/);
  assert.match(workflow, /actions\/deploy-pages@[a-f0-9]{40}/);
  assert.match(workflow, /test:[\s\S]*permissions:[\s\S]*contents: read/);
  assert.doesNotMatch(workflow.match(/test:[\s\S]*?\n\s{2}deploy:/)?.[0] ?? '', /pages: write|id-token: write/);
  assert.match(workflow, /deploy:[\s\S]*pages: write[\s\S]*id-token: write/);
  assert.match(workflow, /persist-credentials: false/);
  assert.match(workflow, /path: dist/);
});

test('build publishes only the explicit runtime allowlist', async () => {
  const build = await read('scripts/build.mjs');
  for (const filename of ['index.html', 'app.js', 'styles.css', 'lessons.json', 'LICENSE']) {
    assert.match(build, new RegExp(filename.replace('.', '\\.')));
  }
  assert.match(build, /rm\(dist/);
  assert.match(build, /copyFile/);
});
