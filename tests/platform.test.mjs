import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);

async function read(relativePath) {
  return readFile(new URL(relativePath, root), 'utf8');
}

test('curriculum contains 20 complete, uniquely dated lessons ending before the meetup', async () => {
  const lessons = JSON.parse(await read('lessons.json'));
  assert.equal(lessons.length, 20);
  assert.equal(new Set(lessons.map(({ id }) => id)).size, 20);
  assert.equal(new Set(lessons.map(({ date }) => date)).size, 20);
  assert.equal(lessons.at(-1).date, '2026-10-27');

  for (const lesson of lessons) {
    for (const field of ['id', 'day', 'week', 'date', 'title', 'outcome', 'reading', 'exercise', 'discussion', 'sources']) {
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
