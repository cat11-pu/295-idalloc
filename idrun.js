// idrun.js：按整批共用的应用预算应用操作，用尽则连字段压账；收尾不限预算补账
import { takeId } from "./ids.js";

function cloneState(state) {
  return {
    next: state.next,
    pool: state.pool.slice(),
    allocated: state.allocated.slice(),
    ledger: state.ledger.map(function (entry) {
      const copy = entry.slice();
      copy.eid = entry.eid;
      return copy;
    }),
    applied: state.applied.slice()
  };
}

function fail(code, message) {
  const error = new Error(message);
  error.code = code;
  throw error;
}

function isEvent(event) {
  return event !== null && typeof event === "object"
    && (event.kind === "alloc" || event.kind === "free");
}

function validate(event, spec) {
  if (!isEvent(event)) {
    fail(spec.event_error_code || "E_BAD_EVENT", "事件不合法");
  }
  if (event.kind === "free") {
    if (typeof event.number !== "number" || !Number.isInteger(event.number) || event.number <= 0) {
      fail(spec.event_error_code || "E_BAD_EVENT", "事件不合法");
    }
  }
}

function toEntry(event) {
  const entry = event.kind === "alloc" ? ["alloc", 0] : ["free", event.number];
  entry.eid = event.id;
  return entry;
}

function markApplied(state, entry) {
  if (entry.eid !== undefined && state.applied.indexOf(entry.eid) === -1) {
    state.applied.push(entry.eid);
  }
}

function applyEntry(state, entry, spec) {
  if (entry[0] === "alloc") {
    const id = takeId(state);
    state.allocated.push(id);
  } else {
    const number = entry[1];
    if (state.allocated.indexOf(number) === -1) {
      fail(spec.id_error_code || "E_NOT_ALLOCATED", "回收的编号未在已分配集合中");
    }
    state.allocated.splice(state.allocated.indexOf(number), 1);
    state.pool.push(number);
    state.pool.sort(function (a, b) { return a - b; });
  }
  markApplied(state, entry);
}

export function step(spec) {
  const state = cloneState(spec.state);
  const events = Array.isArray(spec.events) ? spec.events : [];
  let remaining = Number.isFinite(spec.budget) ? Math.max(0, Math.trunc(spec.budget)) : 0;
  let appliedCount = 0;
  let judged = 0;

  for (const event of events) {
    if (event !== null && typeof event === "object"
        && event.id !== undefined && state.applied.indexOf(event.id) !== -1) {
      continue;
    }
    validate(event, spec);
    judged += 1;
    state.ledger.push(toEntry(event));
    while (remaining > 0 && state.ledger.length > 0) {
      const entry = state.ledger.shift();
      applyEntry(state, entry, spec);
      appliedCount += 1;
      remaining -= 1;
    }
  }

  return {
    state: state,
    applied: appliedCount,
    ledger_before: state.ledger.length,
    ledger: state.ledger.map(function (entry) { return entry.slice(); }),
    judged: judged,
    judged_bound: events.length
  };
}

export function close(spec) {
  const state = cloneState(spec.state);
  let catchup = 0;
  while (state.ledger.length > 0) {
    applyEntry(state, state.ledger.shift(), spec);
    catchup += 1;
  }
  return { state: state, catchup: catchup };
}
