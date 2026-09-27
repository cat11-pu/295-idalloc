import assert from "node:assert";
import { smallestFree, takeId } from "../ids.js";
import { step, close } from "../idrun.js";
import { render } from "../app.js";

const base = {
  budget: 2,
  state: { next: 1, pool: [], allocated: [], ledger: [], applied: [] },
  events: [],
  id_error_code: "E_NOT_ALLOCATED", event_error_code: "E_BAD_EVENT"
};

let failed = 0;
function check(name, fn) {
  try { fn(); console.log("ok " + name); } catch (e) { failed += 1; console.log("FAIL " + name + " :: " + e.message); }
}

check("smallestFree returns a number", () => {
  assert.strictEqual(typeof smallestFree([]), "number");
});

check("takeId returns a number", () => {
  assert.strictEqual(typeof takeId(base.state), "number");
});

check("step returns a state", () => {
  assert.strictEqual(typeof step(base).state, "object");
});

check("close returns a state", () => {
  assert.strictEqual(typeof close(base).state, "object");
});

check("render counts events", () => {
  assert.strictEqual(typeof render(base).count, "number");
});

console.log("5 cases, " + failed + " failed");
process.exit(failed === 0 ? 0 : 1);
