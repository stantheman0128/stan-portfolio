// Exact-match an inbound IP against a comma-separated allow-list.
// The list comes from the CREATOR_IP secret; never hard-code it here.
export function isCreatorIp(ip, allowed) {
  if (!ip || !allowed) return false;
  const want = String(ip).trim();
  return String(allowed)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .includes(want);
}
