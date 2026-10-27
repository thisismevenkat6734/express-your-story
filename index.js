const express = require("express");
const admin = require("firebase-admin");
const { onRequest } = require("firebase-functions/v2/https");
const { setGlobalOptions } = require("firebase-functions/v2");
const crypto = require("node:crypto");

admin.initializeApp();
setGlobalOptions({ region: "asia-south1", maxInstances: 10, timeoutSeconds: 60 });
const db = admin.firestore();
const authAdmin = admin.auth();
const app = express();
app.use(express.json({ limit: "256kb" }));
app.disable("x-powered-by");

const fail = (status, message) => Object.assign(new Error(message), { status });
const clean = (s, max=2000) => typeof s === "string" ? s.trim().slice(0,max) : "";
const uidOf = req => req.user.uid;
async function requireAuth(req,res,next) {
  try {
    const match = /^Bearer (.+)$/.exec(req.get("authorization") || "");
    if (!match) throw fail(401, "Sign in is required.");
    req.user = await authAdmin.verifyIdToken(match[1], true);
    next();
  } catch (e) { next(e.status ? e : fail(401, "Invalid or expired session.")); }
}
app.get("/health", (_req,res) => res.json({ok:true, service:"express-your-story-api"}));
const api = express.Router();
api.use(requireAuth);

const profileRef = uid => db.collection("users").doc(uid);
const userPublic = d => ({ uid:d.uid, displayName:d.displayName || "User", bio:d.bio || "", photoURL:d.photoURL || "", visibility:d.visibility || "private", createdAt:d.createdAt || null });
async function getProfile(uid) {
  const s=await profileRef(uid).get();
  if(!s.exists) return null;
  return s.data();
}
async function ensureProfile(uid, token) {
  let p=await getProfile(uid);
  if(!p) {
    p={uid,displayName:clean(token.name || token.email?.split("@")[0] || "User",60),email:token.email || "",bio:"",photoURL:"",visibility:"private",createdAt:admin.firestore.FieldValue.serverTimestamp(),updatedAt:admin.firestore.FieldValue.serverTimestamp()};
    await profileRef(uid).set(p);
  }
  return p;
}
async function notify(to, from, type, text, extra={}) {
  if(!to || to===from) return;
  await db.collection("notifications").add({to,from,type,text:clean(text,240),read:false,createdAt:admin.firestore.FieldValue.serverTimestamp(),...extra});
}
async function areFriends(a,b) {
  const id=[a,b].sort().join("_");
  const s=await db.collection("friendships").doc(id).get();
  return s.exists && s.data().status==="accepted";
}
function safeDoc(s) { const d=s.data(); return {id:s.id,...d}; }
function limitN(n, fallback=30, max=50) { const x=Number(n); return Number.isInteger(x)&&x>0?Math.min(x,max):fallback; }

api.get("/me/profile", async (req,res,next)=>{try{
 const p=await ensureProfile(uidOf(req),req.user); res.json({profile:userPublic(p)});
}catch(e){next(e)}});
api.put("/me/profile", async(req,res,next)=>{try{
 const uid=uidOf(req), old=await ensureProfile(uid,req.user);
 const displayName=clean(req.body.displayName,60), bio=clean(req.body.bio,500), photoURL=clean(req.body.photoURL,2048), visibility=req.body.visibility;
 if(displayName.length<2) throw fail(400,"Display name must contain 2–60 characters.");
 if(!["private","friends","public"].includes(visibility)) throw fail(400,"Invalid profile visibility.");
 if(photoURL && !photoURL.startsWith("https://")) throw fail(400,"Photo URL must use HTTPS.");
 const update={uid,displayName,bio,photoURL,visibility,email:old.email || req.user.email || "",createdAt:old.createdAt || admin.firestore.FieldValue.serverTimestamp(),updatedAt:admin.firestore.FieldValue.serverTimestamp()};
 await profileRef(uid).set(update,{merge:true});
 await authAdmin.updateUser(uid,{displayName, ...(photoURL?{photoURL}:{})});
 res.json({profile:userPublic(update)});
}catch(e){next(e)}});

api.get("/users/search", async(req,res,next)=>{try{
 const term=clean(req.query.q,60).toLocaleLowerCase();
 if(term.length<2) throw fail(400,"Enter at least 2 characters.");
 const snap=await db.collection("users").limit(200).get();
 const result=snap.docs.map(s=>s.data()).filter(p=>p.uid!==uidOf(req) && p.visibility==="public" && (p.displayName||"").toLocaleLowerCase().includes(term)).slice(0,20).map(userPublic);
 res.json({users:result});
}catch(e){next(e)}});

api.get("/posts", async(req,res,next)=>{try{
 const uid=uidOf(req), n=limitN(req.query.limit);
 const [pub,own]=await Promise.all([
   db.collection("posts").where("visibility","==","public").orderBy("createdAt","desc").limit(n).get(),
   db.collection("posts").where("authorId","==",uid).orderBy("createdAt","desc").limit(n).get()
 ]);
 const m=new Map(); [...pub.docs,...own.docs].forEach(s=>m.set(s.id,safeDoc(s)));
 res.json({items:[...m.values()].sort((a,b)=>(b.createdAt?.toMillis?.()||0)-(a.createdAt?.toMillis?.()||0))});
}catch(e){next(e)}});
api.post("/posts", async(req,res,next)=>{try{
 const uid=uidOf(req), p=await ensureProfile(uid,req.user), text=clean(req.body.text,2000), visibility=req.body.visibility||"public";
 if(!text) throw fail(400,"Post text is required.");
 if(!["public","private"].includes(visibility)) throw fail(400,"Invalid visibility.");
 const ref=await db.collection("posts").add({authorId:uid,authorName:p.displayName,text,visibility,createdAt:admin.firestore.FieldValue.serverTimestamp()});
 res.status(201).json({item:{id:ref.id,authorId:uid,authorName:p.displayName,text,visibility}});
}catch(e){next(e)}});

for (const [path, maxText] of [["feelings",500],["stories",500]]) {
 app.get(`/api/${path}`, async(req,res,next)=>{try{
  const uid=uidOf(req), snap=await db.collection(path).where("authorId","==",uid).orderBy("createdAt","desc").limit(limitN(req.query.limit)).get();
  res.json({items:snap.docs.map(safeDoc)});
 }catch(e){next(e)}});
 app.post(`/api/${path}`, async(req,res,next)=>{try{
  const uid=uidOf(req), p=await ensureProfile(uid,req.user), text=clean(req.body.text,maxText), visibility=req.body.visibility||"private";
  if(!text) throw fail(400,"Text is required.");
  if(!["public","friends","private"].includes(visibility)) throw fail(400,"Invalid visibility.");
  const data={authorId:uid,authorName:p.displayName,text,visibility,createdAt:admin.firestore.FieldValue.serverTimestamp()};
  if(path==="feelings") { data.feeling=clean(req.body.feeling,40); if(!data.feeling) throw fail(400,"Choose a feeling."); }
  if(path==="stories") {
    data.mediaURL=clean(req.body.mediaURL,2048);
    data.mediaType=clean(req.body.mediaType,30);
    if(data.mediaURL && !data.mediaURL.startsWith("https://")) throw fail(400,"Media URL must use HTTPS.");
    data.expiresAt=admin.firestore.Timestamp.fromMillis(Date.now()+24*60*60*1000);
  }
  const ref=await db.collection(path).add(data);
  res.status(201).json({item:{id:ref.id,...data}});
 }catch(e){next(e)}});
}

api.get("/letters",async(req,res,next)=>{try{
 const uid=uidOf(req);
 const snap=await db.collection("letters").where("recipientId","==",uid).orderBy("createdAt","desc").limit(limitN(req.query.limit)).get();
 const own=await db.collection("letters").where("authorId","==",uid).orderBy("createdAt","desc").limit(limitN(req.query.limit)).get();
 const m=new Map(); [...snap.docs,...own.docs].forEach(s=>m.set(s.id,safeDoc(s)));
 res.json({items:[...m.values()].sort((a,b)=>(b.createdAt?.toMillis?.()||0)-(a.createdAt?.toMillis?.()||0))});
}catch(e){next(e)}});
api.post("/letters",async(req,res,next)=>{try{
 const uid=uidOf(req), p=await ensureProfile(uid,req.user), recipientInput=clean(req.body.recipientId,254), title=clean(req.body.title,120), body=clean(req.body.body,10000), visibility=req.body.visibility||"private";
 let recipientId=recipientInput;
 if(recipientInput.includes("@")) {
   const found=await db.collection("users").where("email","==",recipientInput.toLowerCase()).limit(1).get();
   recipientId=found.empty?"":found.docs[0].id;
 }
 if(!recipientId || recipientId===uid || body.length<1) throw fail(400,"Choose a registered recipient and write a letter.");
 if(!["private","public"].includes(visibility)) throw fail(400,"Invalid visibility.");
 const recipient=await getProfile(recipientId); if(!recipient) throw fail(404,"Recipient not found.");
 const ref=await db.collection("letters").add({authorId:uid,authorName:p.displayName,recipientId,recipientName:recipient.displayName,title,body,visibility,createdAt:admin.firestore.FieldValue.serverTimestamp()});
 await notify(recipientId,uid,"letter",`${p.displayName} sent you a letter.`,{itemId:ref.id});
 res.status(201).json({item:{id:ref.id,title,body,recipientId,recipientName:recipient.displayName}});
}catch(e){next(e)}});

api.get("/friend-requests",async(req,res,next)=>{try{
 const uid=uidOf(req), snap=await db.collection("friendRequests").where("to","==",uid).where("status","==","pending").limit(50).get();
 const items=await Promise.all(snap.docs.map(async s=>{const d=s.data(),p=await getProfile(d.from);return {id:s.id,from:d.from,displayName:p?.displayName||"User",photoURL:p?.photoURL||""}}));
 res.json({items});
}catch(e){next(e)}});
api.get("/friends",async(req,res,next)=>{try{
 const uid=uidOf(req), snap=await db.collection("friendships").where("members","array-contains",uid).where("status","==","accepted").limit(100).get();
 const items=await Promise.all(snap.docs.map(async s=>{const other=s.data().members.find(x=>x!==uid),p=await getProfile(other);return p?userPublic(p):null}));
 res.json({items:items.filter(Boolean)});
}catch(e){next(e)}});
api.post("/friend-requests/:to",async(req,res,next)=>{try{
 const from=uidOf(req),to=clean(req.params.to,128); if(!to||to===from) throw fail(400,"Invalid recipient.");
 if(!await getProfile(to)) throw fail(404,"User not found.");
 if(await areFriends(from,to)) throw fail(409,"You are already friends.");
 const prior=await db.collection("friendRequests").where("from","==",from).where("to","==",to).where("status","==","pending").limit(1).get();
 if(!prior.empty) throw fail(409,"Request already sent.");
 const ref=await db.collection("friendRequests").add({from,to,status:"pending",createdAt:admin.firestore.FieldValue.serverTimestamp()});
 await notify(to,from,"friend_request","You received a friend request.",{itemId:ref.id});
 res.status(201).json({id:ref.id});
}catch(e){next(e)}});
api.post("/friend-requests/:id/accept",async(req,res,next)=>{try{
 const uid=uidOf(req), ref=db.collection("friendRequests").doc(clean(req.params.id,128)), snap=await ref.get();
 if(!snap.exists||snap.data().to!==uid||snap.data().status!=="pending") throw fail(404,"Pending request not found.");
 const d=snap.data(), id=[d.from,d.to].sort().join("_");
 const batch=db.batch(); batch.update(ref,{status:"accepted",respondedAt:admin.firestore.FieldValue.serverTimestamp()});
 batch.set(db.collection("friendships").doc(id),{members:[d.from,d.to].sort(),status:"accepted",createdAt:admin.firestore.FieldValue.serverTimestamp()});
 await batch.commit(); await notify(d.from,uid,"friend_accepted","Your friend request was accepted.");
 res.json({ok:true});
}catch(e){next(e)}});

api.get("/messages/:other",async(req,res,next)=>{try{
 const uid=uidOf(req), other=clean(req.params.other,128);
 if(uid===other||!await areFriends(uid,other)) throw fail(403,"Messaging is available to accepted friends only.");
 const conversationId=[uid,other].sort().join("_");
 const snap=await db.collection("conversations").doc(conversationId).collection("messages").orderBy("createdAt","asc").limit(100).get();
 res.json({conversationId,items:snap.docs.map(safeDoc)});
}catch(e){next(e)}});
api.post("/messages/:other",async(req,res,next)=>{try{
 const uid=uidOf(req), other=clean(req.params.other,128), text=clean(req.body.text,2000);
 if(!text) throw fail(400,"Message text is required.");
 if(uid===other||!await areFriends(uid,other)) throw fail(403,"Messaging is available to accepted friends only.");
 const conversationId=[uid,other].sort().join("_"), convRef=db.collection("conversations").doc(conversationId), ref=convRef.collection("messages").doc();
 await convRef.set({members:[uid,other].sort(),updatedAt:admin.firestore.FieldValue.serverTimestamp()},{merge:true});
 const data={id:ref.id,from:uid,to:other,text,createdAt:admin.firestore.FieldValue.serverTimestamp()};
 await ref.set(data); await notify(other,uid,"message","You received a new message.",{conversationId,itemId:ref.id});
 res.status(201).json({item:data});
}catch(e){next(e)}});

api.get("/notifications",async(req,res,next)=>{try{
 const snap=await db.collection("notifications").where("to","==",uidOf(req)).orderBy("createdAt","desc").limit(limitN(req.query.limit,30,50)).get();
 res.json({items:snap.docs.map(safeDoc)});
}catch(e){next(e)}});
api.patch("/notifications/read",async(req,res,next)=>{try{
 const uid=uidOf(req), snap=await db.collection("notifications").where("to","==",uid).where("read","==",false).limit(200).get(), batch=db.batch();
 snap.docs.forEach(s=>batch.update(s.ref,{read:true}));
 await batch.commit(); res.json({updated:snap.size});
}catch(e){next(e)}});

api.delete("/me",async(req,res,next)=>{try{
 const uid=uidOf(req);
 if(!req.user.auth_time || Date.now()/1000-req.user.auth_time>300) throw fail(401,"For security, sign in again before deleting your account.");
 // Delete only documents owned by this user. Large accounts should use a queued cleanup job.
 const ownedQueries=[
  ["users","uid",uid],["posts","authorId",uid],["feelings","authorId",uid],["stories","authorId",uid],
  ["letters","authorId",uid],["letters","recipientId",uid],["notifications","to",uid],["notifications","from",uid],
  ["friendRequests","from",uid],["friendRequests","to",uid]
 ];
 for(const [col,field,value] of ownedQueries) {
  while(true) {
   const snap=await db.collection(col).where(field,"==",value).limit(400).get();
   if(snap.empty) break;
   const batch=db.batch(); snap.docs.forEach(s=>batch.delete(s.ref)); await batch.commit();
   if(snap.size<400) break;
  }
 }
 const conv=await db.collection("friendships").where("members","array-contains",uid).get();
 for(const s of conv.docs) await s.ref.delete();
 const conversations=await db.collection("conversations").where("members","array-contains",uid).get();
 for(const c of conversations.docs){const msgs=await c.ref.collection("messages").limit(400).get();const b=db.batch();msgs.docs.forEach(m=>b.delete(m.ref));await b.commit();await c.ref.delete();}
 try { await admin.storage().bucket().deleteFiles({prefix:`users/${uid}/`}); } catch(storageError) { console.error("Storage cleanup failed",storageError); }
 await authAdmin.deleteUser(uid);
 res.json({ok:true});
}catch(e){next(e)}});

app.use((err,req,res,_next)=>{
 const status=Number.isInteger(err.status)?err.status:500;
 if(status>=500) console.error("API error",err);
 res.status(status).json({error:status>=500?"Internal server error.":err.message});
});
app.use("/api", api);
exports.api=onRequest({cors:true,invoker:"public"},app);
