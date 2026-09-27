// idrun.js：按应用预算应用操作，用尽后连操作带字段压账；收尾不限预算补齐
import { takeId } from "./ids.js";

function errorWith(code, message) {
  const e = new Error(message);
  e.code = code;
  return e;
}

function codesOf(spec) {
  return {
    id: spec && spec.id_error_code ? spec.id_error_code : "E_NOT_ALLOCATED",
    ev: spec && spec.event_error_code ? spec.event_error_code : "E_BAD_EVENT"
  };
}

// 账内条目是富结构 {id, kind, number}；alloc 的 number 仅用于对外投影成 0。
function cloneState(source) {
  return {
    next: source.next,
    pool: source.pool.slice(),
    allocated: source.allocated.slice(),
    ledger: source.ledger.map(function (entry) {
      return { id: entry.id, kind: entry.kind, number: entry.number };
    }),
    applied: source.applied.slice()
  };
}

function normalizeEvent(ev, codes) {
  if (!ev || typeof ev !== "object") throw errorWith(codes.ev, "事件必须是对象");
  if (ev.kind === "alloc") return { id: ev.id, kind: "alloc", number: 0 };
  if (ev.kind === "free") {
    if (!Number.isInteger(ev.number)) throw errorWith(codes.ev, "free 事件缺整数 number");
    return { id: ev.id, kind: "free", number: ev.number };
  }
  throw errorWith(codes.ev, "未知事件类型: " + String(ev && ev.kind));
}

function applyEntry(state, entry, codes) {
  if (entry.kind === "alloc") {
    state.allocated.push(takeId(state));
    return;
  }
  const at = state.allocated.indexOf(entry.number);
  if (at < 0) throw errorWith(codes.id, "编号不在已分配集合里: " + entry.number);
  state.allocated.splice(at, 1);
  state.pool.push(entry.number);
}

function markApplied(state, entry) {
  if (entry.id != null && state.applied.indexOf(entry.id) < 0) state.applied.push(entry.id);
}

function project(ledger) {
  return ledger.map(function (entry) {
    return [entry.kind, entry.kind === "alloc" ? 0 : entry.number];
  });
}

export function step(spec) {
  const codes = codesOf(spec);
  const events = spec.events || [];
  const state = cloneState(spec.state);
  const capacity0 = Number.isFinite(spec.budget) ? spec.budget : 0;

  const normalized = events.map(function (ev) { return normalizeEvent(ev, codes); });

  // 先还旧账，再接本轮新事件；已处理集合里的事件重放时直接跳过。
  const work = state.ledger.map(function (entry) {
    return { entry: entry, carried: true };
  });
  state.ledger = [];
  normalized.forEach(function (entry) {
    if (entry.id != null && state.applied.indexOf(entry.id) >= 0) return;
    work.push({ entry: entry, carried: false });
  });

  let capacity = capacity0;
  let applied = 0;
  let judged = 0;
  work.forEach(function (item) {
    if (capacity <= 0) {
      state.ledger.push(item.entry);
      if (!item.carried) judged += 1;
      return;
    }
    applyEntry(state, item.entry, codes);
    capacity -= 1;
    applied += 1;
    markApplied(state, item.entry);
    if (!item.carried) judged += 1;
  });

  return {
    state: state,
    applied: applied,
    ledger_before: state.ledger.length,
    ledger: project(state.ledger),
    judged: judged,
    judged_bound: events.length
  };
}

export function close(spec) {
  const codes = codesOf(spec);
  const state = cloneState(spec.state);
  const pending = state.ledger;
  state.ledger = [];
  let catchup = 0;
  pending.forEach(function (entry) {
    applyEntry(state, entry, codes);
    markApplied(state, entry);
    catchup += 1;
  });
  return { state: state, catchup: catchup };
}
