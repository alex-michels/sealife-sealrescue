// core/input.js
export function attachPointer(canvas, onMove, onDown, onUp) {
  const rectOf = () => canvas.getBoundingClientRect();
  const getPoint = (e) => {
    const r = rectOf();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  // enable unified pointer events
  canvas.style.touchAction = 'none';

  let isDown = false;

  const down = (e) => { isDown = true; onDown(getPoint(e)); };
  const move = (e) => { if (!isDown && e.pointerType === 'mouse' && e.buttons === 0) return;
                         onMove(getPoint(e)); };
  const up   = () => { if (!isDown) return; isDown = false; onUp(); };

  canvas.addEventListener('pointerdown', down, { passive: true });
  canvas.addEventListener('pointermove', move, { passive: true });
  window.addEventListener('pointerup',    up,   { passive: true });

  // capture lost pointer (e.g., alt-tab)
  window.addEventListener('pointercancel', up, { passive: true });
}

// ————————————————————————————————————————————————
// Keyboard input (normalized to up/down/left/right booleans)
// Exports a small controller with .state and .destroy()

export const DEFAULT_KEYS = {
  left:  ['ArrowLeft', 'a', 'A'],
  right: ['ArrowRight','d', 'D'],
  up:    ['ArrowUp',   'w', 'W'],
  down:  ['ArrowDown', 's', 'S'],
};

function _matches(key, list){ return list.includes(key); }

export function attachKeyboard(target = window, keymap = DEFAULT_KEYS) {
  const state = { left:false, right:false, up:false, down:false };
  const set = (key, val) => {
    if (_matches(key, keymap.left))  state.left  = val;
    if (_matches(key, keymap.right)) state.right = val;
    if (_matches(key, keymap.up))    state.up    = val;
    if (_matches(key, keymap.down))  state.down  = val;
  };

  const onKeyDown = (e) => { set(e.key, true);  /* do not preventDefault here */ };
  const onKeyUp   = (e) => { set(e.key, false); };

  target.addEventListener('keydown', onKeyDown);
  target.addEventListener('keyup',   onKeyUp);

  return {
    state, keymap,
    destroy(){
      target.removeEventListener('keydown', onKeyDown);
      target.removeEventListener('keyup',   onKeyUp);
    }
  };
}