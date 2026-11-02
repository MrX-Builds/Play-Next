'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const pluginPath = path.join(__dirname, '..', 'PlayNext', 'PlayNext.js');
const source = fs.readFileSync(pluginPath, 'utf8');
const patches = [];
const documentListeners = [];
const documentHandlers = {};
const storage = new Map();
let lastNavigatedUrl = null;

function element() {
  const classes = new Set();
  return {
    className: '',
    hidden: false,
    style: {},
    classList: {
      toggle() {},
      add(value) { classes.add(value); },
      remove(value) { classes.delete(value); },
      contains(value) { return classes.has(value); }
    },
    setAttribute() {},
    appendChild() {},
    closest() { return null; },
    querySelector() { return null; },
    querySelectorAll() { return []; }
  };
}

const document = {
  head: { appendChild() {} },
  body: { appendChild() {} },
  createElement: element,
  getElementById() { return null; },
  addEventListener(type, handler) { documentListeners.push(type); documentHandlers[type] = handler; },
  querySelector() { return null; },
  contains() { return true; }
};

const localStorage = {
  getItem(key) { return storage.has(key) ? storage.get(key) : null; },
  setItem(key, value) { storage.set(key, String(value)); },
  removeItem(key) { storage.delete(key); }
};

const windowObject = {
  PluginApi: {
    React: {
      createElement(type, props, ...children) {
        const combined = Object.assign({}, props || {});
        if (children.length === 1) combined.children = children[0];
        else if (children.length > 1) combined.children = children;
        return typeof type === 'function' ? type(combined) : { type, props: combined };
      },
      useState(value) { return [value, function () {}]; },
      useEffect() {},
      Fragment: 'fragment'
    },
    patch: {
      instead(name, fn) { patches.push({ name, fn }); }
    }
  },
  addEventListener() {},
  dispatchEvent() {},
  history: { replaceState(state, _title, url) { this.state = state; lastNavigatedUrl = url; }, state: null },
  location: null
};

const context = {
  window: windowObject,
  document,
  localStorage,
  location: {
    origin: 'http://127.0.0.1:9980',
    href: 'http://127.0.0.1:9980/scenes/10?qfp=1',
    pathname: '/scenes/10',
    search: '?qfp=1',
    hash: ''
  },
  history: windowObject.history,
  URL,
  URLSearchParams,
  CustomEvent: function CustomEvent(type) { this.type = type; },
  PopStateEvent: function PopStateEvent(type, init) { this.type = type; this.state = init && init.state; },
  crypto: { randomUUID() { return 'test-owner'; } },
  console,
  fetch() { throw new Error('fetch should not run during plugin load'); },
  setInterval() { return 1; },
  clearInterval() {},
  setTimeout() { return 1; },
  clearTimeout() {}
};
windowObject.location = context.location;

vm.runInNewContext(source, context, { filename: pluginPath });

assert.deepEqual(patches.map((patch) => patch.name), [
  'ScenePlayer',
  'ScenePage',
  'ScenePage.TabContent'
]);
assert.deepEqual(documentListeners, ['pointerover', 'pointerout', 'keydown']);
assert.doesNotMatch(source, /addEventListener\(['"](?:click|mousedown|mouseup|dblclick|contextmenu)['"]/);
assert.match(source, /event\.shiftKey/);
assert.match(source, /phase: 'queued'/);
assert.match(source, /phase: 'playing'/);
assert.match(source, /items: \[scene\]/);
assert.match(source, /currentIndex/);
assert.match(source, /Play Next #/);
assert.match(source, /returnUrl/);
assert.match(source, /application\/graphql-response\+json/);

const similarAnchor = element();
similarAnchor.getAttribute = function (name) { return name === 'href' ? '/scenes/42' : null; };
const similarTile = element();
const similarChild = element();
similarTile.parentElement = document.body;
similarChild.parentElement = similarTile;
similarChild.closest = function () { return null; };
similarTile.querySelectorAll = function () { return [similarAnchor]; };
documentHandlers.pointerover({ target: similarChild });
assert.equal(similarTile.classList.contains('play-next-hover-target'), true);

(async function transitionChecks() {
  const scenePageNext = function (props) { return props; };
  const pageProps = {
    scene: { id: '10' },
    queueScenes: [{ id: '10', title: 'Source' }, { id: '11', title: 'Original next' }],
    continuePlaylist: true,
    queueHasMoreScenes: false,
    onQueueNext() {},
    onQueuePrevious() {},
    onQueueSceneClicked() {}
  };
  localStorage.setItem('PlayNext.override.v1', JSON.stringify({
    version: 2,
    phase: 'queued',
    ownerId: 'test-owner',
    currentIndex: -1,
    items: [{ id: '20', title: 'Override A' }, { id: '21', title: 'Override B' }]
  }));

  const patchedPage = patches[1].fn(pageProps, scenePageNext);
  assert.deepEqual(patchedPage.queueScenes.map((scene) => scene.id), ['10', '20', '21', '11']);

  const playerNext = function (props) { return props; };
  const playerProps = { scene: { id: '10' }, onNext() {}, onPrevious() {}, onComplete() {} };
  let patchedPlayer = patches[0].fn(playerProps, playerNext);
  patchedPlayer.onNext();
  await new Promise((resolve) => setImmediate(resolve));
  let state = JSON.parse(localStorage.getItem('PlayNext.override.v1'));
  assert.equal(state.phase, 'playing');
  assert.equal(state.currentIndex, 0);
  assert.match(lastNavigatedUrl, /^\/scenes\/20\?/);

  patchedPlayer = patches[0].fn(playerProps, playerNext);
  patchedPlayer.onNext();
  state = JSON.parse(localStorage.getItem('PlayNext.override.v1'));
  assert.equal(state.currentIndex, 1);
  assert.match(lastNavigatedUrl, /^\/scenes\/21\?/);

  patchedPlayer = patches[0].fn(playerProps, playerNext);
  patchedPlayer.onComplete();
  assert.equal(localStorage.getItem('PlayNext.override.v1'), null);
  assert.match(lastNavigatedUrl, /^\/scenes\/11\?/);

  console.log('Play Next smoke and ordered-transition checks passed.');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

