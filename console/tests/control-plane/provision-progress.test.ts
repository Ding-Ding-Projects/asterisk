/**
 * Provisioning emits each step as it happens.
 *
 * `provision()` used to collect every step and return the lot when it finished, so a
 * renderer could not learn how far along a deploy was -- it waited for one response and
 * showed a toast. These tests are about the live view being COMPLETE and HONEST, because
 * a partial one is worse than none:
 *
 *  - The first conversion of this code emitted only the success paths and silently
 *    skipped every failure, so a live view would have shown a deploy going fine and then
 *    simply stopping. The parity test below is what catches that.
 *  - A step must be emitted after its work, never before, or the view reports progress
 *    for something still in flight.
 */
import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { WslProvisioning, type ProvisionStep } from "../../control-plane/wsl-provisioning.js";
import type { ProcessExecutor } from "../../control-plane/contracts.js";

/** An executor that fails everything, so the failure paths are the ones exercised. */
const failingExecutor = (): ProcessExecutor => ({
  run: async () => ({ stdout: "", stderr: "not available", exitCode: 1, timedOut: false }),
});

/** An executor whose WSL calls succeed enough to get past the early gates. */
const listingExecutor = (distributions: string): ProcessExecutor => ({
  run: async () => ({ stdout: distributions, stderr: "", exitCode: 0, timedOut: false }),
});

const provisioningWith = (executor: ProcessExecutor, onStep?: (step: ProvisionStep) => void) =>
  new WslProvisioning({
    executor,
    rootfsPath: "C:/nonexistent/rootfs.tar",
    installDirectory: "C:/nonexistent/install",
    onStep,
    now: () => new Date(0),
  });

test("every step in the outcome was also emitted live", () => {
  /* The parity assertion, and the one that matters. A conversion that wires only some
   * call sites leaves a live view that agrees with the result right up until it does
   * not -- and the sites most likely to be missed are the failure paths, because they
   * sit inside conditionals at a different indentation. */
  const emitted: ProvisionStep[] = [];
  const provisioning = provisioningWith(failingExecutor(), (step) => emitted.push(step));
  return provisioning.provision(false).then((outcome) => {
    assert.ok(outcome.steps.length > 0, "the run reported no steps at all, so this proves nothing");
    assert.deepEqual(
      emitted.map((step) => step.name),
      outcome.steps.map((step) => step.name),
      "the live view and the final outcome disagree about which steps happened",
    );
  });
});

test("a failing step is emitted, not only the successful ones", () => {
  /* The specific defect the first version of this shipped. */
  const emitted: ProvisionStep[] = [];
  const provisioning = provisioningWith(failingExecutor(), (step) => emitted.push(step));
  return provisioning.provision(false).then(() => {
    assert.ok(emitted.some((step) => !step.ok), "no failing step reached the live view");
  });
});

test("steps arrive in the order they happened", () => {
  const emitted: ProvisionStep[] = [];
  const provisioning = provisioningWith(listingExecutor(""), (step) => emitted.push(step));
  return provisioning.provision(true).then((outcome) => {
    assert.deepEqual(emitted, [...outcome.steps]);
  });
});

test("every emitted step carries a name and a detail worth showing", () => {
  /* A live view rendering an unnamed step or an empty detail is a progress line that
   * tells somebody nothing, which is barely better than the spinner it replaced. */
  const emitted: ProvisionStep[] = [];
  const provisioning = provisioningWith(failingExecutor(), (step) => emitted.push(step));
  return provisioning.provision(false).then(() => {
    for (const step of emitted) {
      assert.ok(step.name.trim() !== "", "a step was emitted with no name");
      assert.ok(step.detail.trim() !== "", `${step.name} was emitted with no detail`);
      assert.equal(typeof step.ok, "boolean");
    }
  });
});

test("passing no callback behaves exactly as before", () => {
  /* The whole point of the option being optional: every existing caller is untouched,
   * so this adds a live view without changing a path that already works. */
  const withCallback = provisioningWith(failingExecutor(), () => {});
  const without = provisioningWith(failingExecutor());
  return Promise.all([withCallback.provision(false), without.provision(false)])
    .then(([a, b]) => {
      assert.deepEqual(a.steps, b.steps);
      assert.deepEqual(a.status.state, b.status.state);
    });
});

test("a callback that throws does not take the provisioning run down with it", () => {
  /* A listener is somebody else's code. A deploy failing because a progress line could
   * not be rendered would be the observation destroying the thing observed. */
  const provisioning = provisioningWith(failingExecutor(), () => {
    throw new Error("a listener blew up");
  });
  return provisioning.provision(false).then(
    (outcome) => {
      assert.ok(outcome.steps.length > 0, "the run completed but reported nothing");
    },
    (error: unknown) => {
      assert.fail(`a throwing listener aborted the provisioning run: ${String(error)}`);
    },
  );
});

test("no step inside provision() is collected without also being emitted", () => {
  /* A structural check, and it exists because the behavioural parity test above is not
   * enough: that test only covers the paths its executor fixture happens to reach, so
   * converting a branch back to a bare steps.push left it green. The sites most likely
   * to be missed are the failure paths, which sit inside conditionals a fixture reaches
   * only in the specific way that made them fail.
   *
   * So this reads the source and asserts the shape directly: inside provision(), the only
   * bare steps.push is the recorder's own. Everything else goes through record(), which
   * both collects and emits. */
  const source = readFileSync(
    fileURLToPath(new URL("../../control-plane/wsl-provisioning.ts", import.meta.url)),
    "utf8",
  );
  const start = source.indexOf("  async provision(");
  const end = source.indexOf("\n  async #import(", start);
  assert.ok(start > 0 && end > start, "provision() could not be located, so this checks nothing");
  const body = source.slice(start, end);

  const bare = body
    .split("\n")
    .filter((line) => line.includes("steps.push("))
    .map((line) => line.trim());
  assert.deepEqual(bare, ["steps.push(step);"],
    "a step is collected without being emitted, so a live view would skip it silently");
  assert.ok(body.includes("record("), "nothing goes through the recorder at all");
});
