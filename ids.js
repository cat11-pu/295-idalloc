// ids.js：取最小空闲与分配（空闲池优先复用，池空才发新编号）
export function smallestFree(pool) {
  let best = 0;
  for (const n of pool) {
    if (best === 0 || n < best) best = n;
  }
  return best;
}

export function takeId(state) {
  if (state.pool.length > 0) {
    let at = 0;
    for (let i = 1; i < state.pool.length; i += 1) {
      if (state.pool[i] < state.pool[at]) at = i;
    }
    return state.pool.splice(at, 1)[0];
  }
  const id = state.next;
  state.next += 1;
  return id;
}
