// True only when a non-empty candidate exactly equals the non-empty secret.
export function unlockOk(input, secret) {
  return !!input && !!secret && String(input) === String(secret);
}
