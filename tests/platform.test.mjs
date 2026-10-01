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
  assert.match(workflow, /actions\/deploy-pages@/);
  assert.match(workflow, /pages: write/);
  assert.match(workflow, /id-token: write/);
});
