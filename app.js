// app.js：渲染结果
import { smallestFree, takeId } from "./ids.js";
import { step, close } from "./idrun.js";

export function render(spec) {
  const events = spec.events || [];
  const half = Math.ceil(events.length / 2);
  const first = step(spec);
  const closed = close(Object.assign({}, spec, { state: first.state }));
  const r1 = step(Object.assign({}, spec, { events: events.slice(0, half) }));
  const r2 = step(Object.assign({}, spec, { state: r1.state, events: events.slice(half) }));
  const closedTwo = close(Object.assign({}, spec, { state: r2.state }));
  const replay = step(Object.assign({}, spec, { state: closed.state }));
  const wide = step(Object.assign({}, spec, { budget: spec.budget + 2 }));
  const full = step(Object.assign({}, spec, { events: events, budget: events.length + 2 }));
  const fullClosed = close(Object.assign({}, spec, { state: full.state }));
  const fingerprint = function (state) {
    return JSON.stringify({
      next: state.next, pool: state.pool, allocated: state.allocated.slice().sort(),
      ledger: state.ledger, applied: state.applied.length
    });
  };
  return { allocated: closed.state.allocated.slice().sort(),
           pool: closed.state.pool.slice().sort(function (a, b) { return a - b; }),
           next: closed.state.next,
           applied_first: first.applied, applied_wide: wide.applied,
           pair_differs: first.applied !== wide.applied,
           ledger_before: first.ledger_before, ledger: first.ledger,
           catchup: closed.catchup, ledger_after: closed.state.ledger.length,
           mid_differs: fingerprint(r2.state) !== fingerprint(first.state),
           closed_equal: fingerprint(closedTwo.state) === fingerprint(closed.state),
           replay_new: replay.applied, judged: first.judged, judged_bound: first.judged_bound,
           full_diff: fingerprint(closed.state) === fingerprint(fullClosed.state) ? 0 : 1,
           count: events.length,
           tail: smallestFree([]) + takeId({ next: 1, pool: [], allocated: [] }) };
}
