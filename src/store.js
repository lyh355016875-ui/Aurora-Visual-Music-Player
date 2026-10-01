export function createStore(initial) {
  let state = initial;
  const subs = new Set();
  return {
    get state() { return state; },
    set(patch) {
      state = Object.assign({}, state, patch);
      for (const fn of subs) fn(state);
    },
    subscribe(fn) { subs.add(fn); return () => subs.delete(fn); },
  };
}
