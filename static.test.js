const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
const read = p => fs.readFileSync(path.join(root,p),"utf8");

test("Firebase hosting routes API to asia-south1 function", () => {
  const c=JSON.parse(read("firebase.json"));
  assert.equal(c.hosting.rewrites[0].source,"/api/**");
  assert.equal(c.hosting.rewrites[0].function.region,"asia-south1");
});
test("Firestore rules deny direct client access", () => {
  assert.match(read("firestore.rules"),/allow read, write: if false/);
});
test("API verifies Firebase ID tokens and mounts routes under /api", () => {
  const api=read("functions/index.js");
  assert.match(api,/authAdmin\.verifyIdToken/);
  assert.match(api,/const api = express\.Router\(\)/);
  assert.match(api,/app\.use\("\/api", api\)/);
});
test("Private messaging checks accepted friendship", () => {
  const api=read("functions/index.js");
  assert.match(api,/Messaging is available to accepted friends only/);
  assert.match(api,/areFriends\(uid,other\)/);
});
test("Sensitive deletion requires recent authentication", () => {
  assert.match(read("functions/index.js"),/sign in again before deleting your account/);
});
test("frontend uses textContent and bearer authentication", () => {
  const js=read("script.js");
  assert.match(js,/el\.textContent=escapeText\(text\)/);
  assert.match(js,/Authorization.*Bearer/);
});
test("frontend API paths align with router-mounted backend paths", () => {
  const frontend=read("script.js"), backend=read("functions/index.js");
  assert.match(frontend,/fetch\(`\/api\$\{path\}`/);
  assert.match(backend,/api\.get\("\/me\/profile"/);
  assert.doesNotMatch(backend,/api\.(?:get|post|put|patch|delete)\("\/api\//);
});

test("backend registers all primary content resources", () => {
  const api=read("functions/index.js");
  for (const resource of ["posts","feelings","stories","letters","friendRequests","friendships","conversations","notifications"]) {
    assert.ok(api.includes(`"${resource}"`) || api.includes(`'${resource}'`), `missing resource ${resource}`);
  }
  assert.match(api,/for \(const \[path, maxText\] of \[\["feelings",500\],\["stories",500\]\]\)/);
});
