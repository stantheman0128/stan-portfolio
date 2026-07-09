// Build a Cloudflare Analytics Engine data point from a RUM beacon body and the
// request's Cloudflare geo (request.cf). Kept pure so the strict write-API shape
// (blobs = strings, doubles = numbers, exactly one index <= 96 bytes) is unit-tested.
//
// Column map (for the SQL API): blob1=colo blob2=country blob3=path blob4=conn;
// double1=ttfb double2=fcp double3=dcl double4=load double5=rtt; index1=country.
export function buildRumDataPoint(body, cf) {
  const b = body || {};
  const c = cf || {};
  const str = (v, max) => String(v == null ? "" : v).slice(0, max);
  const num = (v) => (typeof v === "number" && isFinite(v) && v >= 0 ? v : 0);

  const country = str(c.country, 8) || "unknown";
  return {
    blobs: [str(c.colo, 8), country, str(b.path, 256), str(b.conn, 12)],
    doubles: [num(b.ttfb), num(b.fcp), num(b.dcl), num(b.load), num(b.rtt)],
    indexes: [country.slice(0, 96)],
  };
}
