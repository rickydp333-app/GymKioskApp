'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const read = file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
function testRacquetballKeyboardEditing() {
  const nodes = new Map();
  const document = { readyState: 'loading', addEventListener() {}, getElementById: id => nodes.get(id) };
  function node() {
    return {
      children: [], handlers: {}, hidden: false,
      classList: { add() {}, remove() {} },
      appendChild(child) { this.children.push(child); },
      replaceChildren() { this.children = []; },
      addEventListener(type, handler) { this.handlers[type] = handler; },
      setAttribute() {}
    };
  }
  document.createElement = node;
  for (const id of ['racquetballKeyboard', 'racquetballKeyboardKeys', 'racquetballKeyboardLabel', 'racquetballMemberModal']) nodes.set(id, node());
  const context = { window: {}, document, Date, Event: class {}, requestAnimationFrame: callback => callback() };
  vm.createContext(context);
  const source = read('js/racquetball.js').replace(
    'window.racquetball = { logOut, calendarDays };',
    'window.racquetball = { logOut, calendarDays, showKeyboard };'
  );
  vm.runInContext(source, context);
  function input(inputMode, maxLength) {
    return {
      inputMode, maxLength, value: '', selectionStart: 0, selectionEnd: 0,
      closest: () => ({ childNodes: [{ textContent: 'Test field' }] }),
      scrollIntoView() {},
      dispatchEvent() { this.selectionStart = this.selectionEnd = 0; },
      focus() { document.activeElement = this; this.selectionStart = this.selectionEnd = 0; },
      setSelectionRange(start, end) { this.selectionStart = start; this.selectionEnd = end; }
    };
  }
  function press(key) {
    const button = nodes.get('racquetballKeyboardKeys').children.flatMap(row => row.children).find(button => button.title === key);
    assert(button, `keyboard must provide ${key}`);
    button.handlers.pointerdown({ preventDefault() {} });
    document.activeElement = button;
    // Model a touch keyboard losing the input caret before its click handler runs.
    field.selectionStart = field.selectionEnd = 0;
    button.handlers.click();
  }
  let field = input('text', 120);
  context.window.racquetball.showKeyboard(field);
  press('Shift');
  press('r');
  press('Shift');
  for (const key of ['i', 'c', 'k']) press(key);
  assert.equal(field.value, 'Rick', 'touch keys must append in the typed order');
  assert.equal(field.selectionStart, 4);
  assert.equal(document.activeElement, field, 'typing must restore input focus');
  field.setSelectionRange(1, 3);
  press('o');
  assert.equal(field.value, 'Rok', 'typing must replace the selected text');
  press('Backspace');
  assert.equal(field.value, 'Rk', 'backspace must delete before the caret');
  field.setSelectionRange(0, 0);
  press('Backspace');
  assert.equal(field.value, 'Rk', 'backspace at the start must not remove text');
  press('Clear');
  assert.equal(field.value, '');
  assert.equal(field.selectionStart, 0);

  for (const [mode, maxLength, value] of [
    ['email', 254, 'rick@example.com'], ['tel', 40, '5195550123'], ['numeric', 4, '0042']
  ]) {
    field = input(mode, maxLength);
    context.window.racquetball.showKeyboard(field);
    for (const key of value) press(key);
    assert.equal(field.value, value, `${mode} keys must retain their entry order`);
    assert.equal(field.selectionStart, value.length);
  }
  press('1');
  assert.equal(field.value, '0042', 'PIN entry must retain its four-digit limit');
  field.setSelectionRange(1, 3);
  press('Backspace');
  assert.equal(field.value, '02', 'backspace must delete the selection');

  const css = read('css/racquetball.css');
  const keyboardRule = css.match(/\.racquetball-keyboard \{([^}]+)\}/)[1];
  assert(!/position:\s*(fixed|absolute)/.test(keyboardRule), 'keyboard must remain below the form in normal layout');
  const html = read('index.html');
  const formEnd = html.indexOf('</form>', html.indexOf('id="racquetballMemberForm"'));
  assert(formEnd < html.indexOf('id="racquetballKeyboard"'), 'keyboard must follow the entry form');
}

testRacquetballKeyboardEditing();
console.log('PASS: touch name/email/phone/PIN caret and keyboard below form');
