// Commit a JSON object to a file in a GitHub repo via the Contents API. Used by the
// publish endpoint with a fine-grained token (Contents: read+write on one repo).
// fetchImpl is injectable so the logic is unit-testable without hitting GitHub.
export async function putJsonFile({ token, owner, repo, branch, path, obj, message, fetchImpl }) {
  const doFetch = fetchImpl || fetch;
  const api = "https://api.github.com/repos/" + owner + "/" + repo + "/contents/" + path;
  const headers = {
    authorization: "Bearer " + token,
    accept: "application/vnd.github+json",
    "user-agent": "stan-portfolio-publisher",
    "content-type": "application/json",
  };
  // Need the current blob sha to update an existing file; 404 means create fresh.
  let sha;
  const getRes = await doFetch(api + "?ref=" + encodeURIComponent(branch), { headers });
  if (getRes.status === 200) {
    sha = (await getRes.json()).sha;
  } else if (getRes.status !== 404) {
    throw new Error("GitHub GET " + getRes.status);
  }
  const body = {
    message: message,
    content: b64(JSON.stringify(obj, null, 2) + "\n"),
    branch: branch,
  };
  if (sha) body.sha = sha;
  const putRes = await doFetch(api, { method: "PUT", headers, body: JSON.stringify(body) });
  if (putRes.status < 200 || putRes.status >= 300) {
    throw new Error("GitHub PUT " + putRes.status + ": " + (await putRes.text()));
  }
  return await putRes.json();
}

// Commit multiple files atomically via the Git Data API (blobs -> tree -> commit
// -> move ref). Each file: { path, content, encoding: "utf-8" | "base64" }.
export async function commitTree({ token, owner, repo, branch, files, message, fetchImpl }) {
  const doFetch = fetchImpl || fetch;
  const base = "https://api.github.com/repos/" + owner + "/" + repo;
  const headers = {
    authorization: "Bearer " + token,
    accept: "application/vnd.github+json",
    "user-agent": "stan-portfolio-publisher",
    "content-type": "application/json",
  };
  const gh = async (path, method, payload) => {
    const res = await doFetch(base + path, {
      method: method || "GET",
      headers,
      body: payload ? JSON.stringify(payload) : undefined,
    });
    if (res.status < 200 || res.status >= 300) {
      throw new Error("GitHub " + (method || "GET") + " " + path + " -> " + res.status);
    }
    return res.json();
  };

  const ref = await gh("/git/refs/heads/" + branch);
  const oldCommitSha = ref.object.sha;
  const oldCommit = await gh("/git/commits/" + oldCommitSha);
  const baseTree = oldCommit.tree.sha;

  const tree = [];
  for (const f of files) {
    const blob = await gh("/git/blobs", "POST", { content: f.content, encoding: f.encoding });
    tree.push({ path: f.path, mode: "100644", type: "blob", sha: blob.sha });
  }
  const newTree = await gh("/git/trees", "POST", { base_tree: baseTree, tree });
  const commit = await gh("/git/commits", "POST", {
    message, tree: newTree.sha, parents: [oldCommitSha],
  });
  await gh("/git/refs/heads/" + branch, "PATCH", { sha: commit.sha });
  return commit.sha;
}

// base64 of a UTF-8 string. btoa is latin1-only, so encode to bytes first.
export function b64(str) {
  const bytes = new TextEncoder().encode(str);
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}
