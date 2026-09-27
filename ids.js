// ids.js：空闲池取最小复用；池空时发从未用过的新编号并推进计数器
export function smallestFree(pool) {
  if (!Array.isArray(pool) || pool.length === 0) return 0;
  let min = pool[0];
  for (const candidate of pool) {
    if (candidate < min) min = candidate;
  }
  return min;
}

export function takeId(state) {
  if (Array.isArray(state.pool) && state.pool.length > 0) {
    const id = smallestFree(state.pool);
    const index = state.pool.indexOf(id);
    state.pool.splice(index, 1);
    return id;
  }
  const id = state.next;
  state.next += 1;
  return id;
}
