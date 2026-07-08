// Undo/redo over immutable JSON snapshots (strings). commit(next) records a new
// state and clears the redo future; undo()/redo() return the snapshot to restore
// or null at the ends. Unlimited by default, optionally capped.
export function makeHistory(initial, cap = 200) {
  let past = [];
  let present = initial;
  let future = [];
  return {
    commit(next) {
      if (next === present) return;
      past.push(present);
      if (past.length > cap) past.shift();
      present = next;
      future = [];
    },
    undo() {
      if (!past.length) return null;
      future.push(present);
      present = past.pop();
      return present;
    },
    redo() {
      if (!future.length) return null;
      past.push(present);
      present = future.pop();
      return present;
    },
    canUndo() { return past.length > 0; },
    canRedo() { return future.length > 0; },
    reset(snap) { past = []; present = snap; future = []; },
  };
}
