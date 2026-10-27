import { auth, storage } from "./firebase-config.js";
import { onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail, updateProfile, signOut, deleteUser } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";
import { ref as storageRef, uploadBytes, getDownloadURL, deleteObject } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-storage.js";

const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const state = { user:null, profile:null, selectedFeeling:"", selectedFriend:null, friends:[] };
const escapeText = (v) => String(v ?? "");
function toast(message, type="info") {
  const el=$("#toast"); if(!el){console.log(message);return;}
  el.textContent=message; el.dataset.type=type; el.hidden=false; el.classList.add("show");
  clearTimeout(toast.timer); toast.timer=setTimeout(()=>{el.classList.remove("show");el.hidden=true;},3500);
}
function message(id, text, type="error") { const el=typeof id==="string"?$(id):id; if(el){el.textContent=text;el.dataset.type=type;el.hidden=!text;} }
function node(tag, text, cls) { const el=document.createElement(tag); if(text!==undefined)el.textContent=escapeText(text); if(cls)el.className=cls; return el; }
function dateText(v) { try { const d=v?.toDate?v.toDate():(v?new Date(typeof v._seconds==="number"?v._seconds*1000:v):null); return d&&!isNaN(d)?d.toLocaleString():"Just now"; } catch{return "Just now";} }
async function api(path, options={}) {
  const user=auth.currentUser; if(!user) throw new Error("Please log in first.");
  const token=await user.getIdToken();
  const res=await fetch(`/api${path}`,{...options,headers:{"Content-Type":"application/json","Authorization":`Bearer ${token}`,...options.headers}});
  const data=await res.json().catch(()=>({error:"Server returned an invalid response."}));
  if(!res.ok) throw new Error(data.error||"Request failed.");
  return data;
}
function busy(form,on) { const b=form?.querySelector('[type="submit"]'); if(b){b.disabled=on;b.dataset.old ||= b.textContent;if(on)b.textContent="Please wait…";else b.textContent=b.dataset.old;} }
function setPage(page) {
  if(!state.user && page!=="auth") page="auth";
  const target=$("#"+CSS.escape(page)); if(!target){toast("Page not found.");return;}
  $$(".page").forEach(p=>{p.hidden=p.id!==page;p.classList.toggle("active",p.id===page);});
  $$("[data-page]").forEach(a=>a.classList.toggle("active",a.dataset.page===page));
  const title={home:"Your Feed",feelings:"Express Your Feelings",stories:"Stories",letters:"Letters",messages:"Messages",friends:"Friends",notifications:"Notifications",profile:"My Profile",terms:"Terms & Conditions",privacy:"Privacy Policy",auth:"Welcome"};
  if($("#pageHeading"))$("#pageHeading").textContent=title[page]||"Express Your Story";
  $("#sidebar") && ($("#sidebar").hidden=!state.user);
  $("#sidebar")?.classList.remove("open"); $("#sidebarBackdrop")?.classList.remove("show");
}
function showList(container, items, render, emptyText) {
  const el=typeof container==="string"?$(container):container; if(!el)return;
  el.replaceChildren();
  if(!items?.length){el.append(node("p",emptyText,"empty-state"));return;}
  items.forEach(item=>el.append(render(item)));
}
function itemCard(title, body, meta="", extra) {
  const card=node("article",undefined,"card post-card");
  const h=node("strong",title); const p=node("p",body,"post-content"); const small=node("small",meta);
  card.append(h,p,small); if(extra)card.append(extra); return card;
}
async function loadProfile() {
  const d=await api("/me/profile"); state.profile=d.profile;
  const p=state.profile, initial=(p.displayName||"U").charAt(0).toUpperCase();
  if($("#topAvatar"))$("#topAvatar").textContent=initial;
  if($("#composerAvatar"))$("#composerAvatar").textContent=initial;
  if($("#profileAvatar")) { $("#profileAvatar").textContent=initial; if(p.photoURL){$("#profileAvatar").style.backgroundImage=`url("${p.photoURL.replace(/["\\]/g,"")}")`;$("#profileAvatar").textContent="";} }
  if($("#profileName"))$("#profileName").value=p.displayName||"";
  if($("#profileBio"))$("#profileBio").value=p.bio||"";
  if($("#profileVisibility"))$("#profileVisibility").value=p.visibility||"private";
  if($("#profileDisplayName"))$("#profileDisplayName").textContent=p.displayName||"Your profile";
  if($("#profileBioPreview"))$("#profileBioPreview").textContent=p.bio||"";
  if($("#profileVisibilityPreview"))$("#profileVisibilityPreview").textContent=p.visibility||"private";
}
async function loadPosts() {
  const d=await api("/posts");
  showList("#feedList",d.items,(p)=>itemCard(p.authorName||"User",p.text,dateText(p.createdAt)), "No posts yet. Share your first story.");
}
async function loadFeelings() {
  const d=await api("/feelings");
  showList("#feelingsList",d.items,(p)=>itemCard(`${p.feeling||"Feeling"} · ${p.authorName||"You"}`,p.text,dateText(p.createdAt)),"No feelings shared yet.");
}
async function loadStories() {
  const d=await api("/stories");
  showList("#storyGallery",d.items,(p)=>{
    const c=itemCard(p.authorName||"Your story",p.text,dateText(p.createdAt));
    if(p.mediaURL){const m=p.mediaType?.startsWith("video")?node("video"):node("img");m.src=p.mediaURL;m.controls=p.mediaType?.startsWith("video")||false;m.alt="Story media";m.style.maxWidth="100%";m.style.borderRadius="12px";c.append(m);}
    return c;
  },"No stories yet.");
}
async function loadLetters() {
  const d=await api("/letters");
  showList("#lettersList",d.items,(p)=>itemCard(p.title||"Letter",p.body,`${p.authorId===state.user.uid?"To":"From"} ${p.authorId===state.user.uid?(p.recipientName||"recipient"):(p.authorName||"someone")} · ${dateText(p.createdAt)}`),"No letters yet.");
}
async function loadFriends() {
  const [friends,requests]=await Promise.all([api("/friends"),api("/friend-requests")]);
  state.friends=friends.items;
  showList("#friendsList",friends.items,(p)=>{
    const row=node("div",undefined,"card user-result"); row.append(node("strong",p.displayName));
    const b=node("button","Message","secondary-button");b.type="button";b.addEventListener("click",()=>{state.selectedFriend=p;$("#conversationHeader").textContent=p.displayName;$("#messageText").disabled=false;$("#sendMessageButton").disabled=false;loadMessages(p.uid);setPage("messages");});
    row.append(b);return row;
  },"No friends yet. Search for people to connect.");
  showList("#friendRequests",requests.items,(p)=>{
    const row=node("div",undefined,"card user-result");row.append(node("strong",p.displayName));
    const b=node("button","Accept request","primary-button");b.type="button";b.addEventListener("click",async()=>{try{await api(`/friend-requests/${encodeURIComponent(p.id)}/accept`,{method:"POST",body:"{}"});toast("Friend request accepted.","success");await loadFriends();}catch(e){toast(e.message,"error");}});
    row.append(b);return row;
  },"No pending friend requests.");
  const list=$("#conversationList"); if(list){list.replaceChildren();state.friends.forEach(p=>{const b=node("button",p.displayName,"conversation-button");b.type="button";b.addEventListener("click",()=>{state.selectedFriend=p;$("#conversationHeader").textContent=p.displayName;$("#messageText").disabled=false;$("#sendMessageButton").disabled=false;loadMessages(p.uid);});list.append(b);});}
}
async function loadMessages(uid) {
  try {const d=await api(`/messages/${encodeURIComponent(uid)}`);showList("#messageList",d.items,(m)=>itemCard(m.from===state.user.uid?"You":"Friend",m.text,dateText(m.createdAt)), "No messages yet.");}
  catch(e){message("#messageStatus",e.message);}
}
async function loadNotifications() {
  const d=await api("/notifications");
  showList("#notificationList",d.items,(n)=>itemCard(n.type||"Notification",n.text,dateText(n.createdAt)), "No notifications.");
  const unread=d.items.filter(n=>!n.read).length;if($("#notificationCount"))$("#notificationCount").textContent=unread?String(unread):"";
}
async function loadProfilePosts() {
  const d=await api("/posts");const own=d.items.filter(p=>p.authorId===state.user.uid);
  showList("#profilePosts",own,(p)=>itemCard("Your post",p.text,dateText(p.createdAt)),"You have not posted yet.");
}
async function refreshAll() { try{await loadProfile();await Promise.all([loadPosts(),loadFeelings(),loadStories(),loadLetters(),loadFriends(),loadNotifications(),loadProfilePosts()]);}catch(e){toast(e.message,"error");} }

$("#authForm")?.addEventListener("submit",async e=>{
  e.preventDefault();const form=e.currentTarget;busy(form,true);message("#authMessage","");
  try{
    const email=$("#authEmail").value.trim().toLowerCase(), password=$("#authPassword").value;
    if($("#authTitle").textContent.toLowerCase().includes("create")){
      const name=$("#authName").value.trim();if(name.length<2||name.length>60)throw Error("Name must be 2–60 characters.");
      if(password.length<8)throw Error("Password must contain at least 8 characters.");
      if(password!==$("#authConfirmPassword").value)throw Error("Passwords do not match.");
      const c=await createUserWithEmailAndPassword(auth,email,password);await updateProfile(c.user,{displayName:name});
      await api("/me/profile",{method:"PUT",body:JSON.stringify({displayName:name,bio:"",photoURL:"",visibility:"private"})});
    } else { await signInWithEmailAndPassword(auth,email,password); }
  }catch(e){message("#authMessage",e.message||"Authentication failed.");}finally{busy(form,false);}
});
$("#forgotPasswordButton")?.addEventListener("click",async()=>{const email=$("#authEmail").value.trim();if(!email){message("#authMessage","Enter your email first.");return;}try{await sendPasswordResetEmail(auth,email);message("#authMessage","If the account exists, a reset email has been sent.","success");}catch(e){message("#authMessage",e.message);}});
$$("[data-page]").forEach(a=>a.addEventListener("click",e=>{e.preventDefault();setPage(a.dataset.page);}));
$$("[data-auth-mode]").forEach(b=>b.addEventListener("click",()=>{
  const signup=b.dataset.authMode==="signup";
  $("#authTitle").textContent=signup?"Create your account":"Welcome back";
  $("#authDescription").textContent=signup?"Create a safe space to express your story.":"Continue your story.";
  $("#authSubmit").textContent=signup?"Create account":"Log in";
  $("#authName").hidden=!signup;$("#authName").required=signup;
  $("#authNameLabel").hidden=!signup;
  $("#authConfirmPassword").hidden=!signup;$("#authConfirmPassword").required=signup;
  $("#confirmPasswordLabel").hidden=!signup;
  $("#forgotPasswordButton").hidden=signup;
  $$("[data-auth-mode]").forEach(x=>x.classList.toggle("active",x===b));
  message("#authMessage","");
}));
$("#logoutButton")?.addEventListener("click",()=>signOut(auth));
$("#menuLogoutButton")?.addEventListener("click",()=>signOut(auth));
$("#moreButton")?.addEventListener("click",()=>$("#moreMenu")?.classList.toggle("show"));
$("#menuButton")?.addEventListener("click",()=>$("#sidebar")?.classList.toggle("open"));
$("#sidebarBackdrop")?.addEventListener("click",()=>{$("#sidebar")?.classList.remove("open");$("#sidebarBackdrop")?.classList.remove("show");});
$("#login-tab")?.addEventListener("click",()=>{if($("#authTitle"))$("#authTitle").textContent="Welcome back";if($("#authName"))$("#authName").hidden=true;if($("#authConfirmPassword"))$("#authConfirmPassword").hidden=true;});
$("#signup-tab")?.addEventListener("click",()=>{if($("#authTitle"))$("#authTitle").textContent="Create your account";if($("#authName"))$("#authName").hidden=false;if($("#authConfirmPassword"))$("#authConfirmPassword").hidden=false;});

$("#postForm")?.addEventListener("submit",async e=>{e.preventDefault();busy(e.currentTarget,true);try{await api("/posts",{method:"POST",body:JSON.stringify({text:$("#postText").value,visibility:"public"})});$("#postText").value="";message("#postMessage","Posted successfully.","success");await loadPosts();}catch(err){message("#postMessage",err.message);}finally{busy(e.currentTarget,false);}});
$("#feelingChoices")?.addEventListener("click",e=>{const b=e.target.closest("[data-feeling]");if(!b)return;state.selectedFeeling=b.dataset.feeling;$("#selectedFeeling").value=state.selectedFeeling;$$("[data-feeling]").forEach(x=>x.classList.toggle("selected",x===b));});
$("#feelingForm")?.addEventListener("submit",async e=>{e.preventDefault();busy(e.currentTarget,true);try{await api("/feelings",{method:"POST",body:JSON.stringify({feeling:state.selectedFeeling,text:$("#feelingText").value,visibility:$("#feelingVisibility").value})});$("#feelingText").value="";message("#feelingMessage","Feeling shared.","success");await loadFeelings();}catch(err){message("#feelingMessage",err.message);}finally{busy(e.currentTarget,false);}});
async function upload(file, folder) {
  if(!file)return ""; if(file.size>15*1024*1024)throw Error("File must be smaller than 15 MB.");
  const allowed=file.type.startsWith("image/")||["video/mp4","video/webm"].includes(file.type);
  if(!allowed)throw Error("Only images, MP4, or WebM videos are supported.");
  const safeName=file.name.replace(/[^a-zA-Z0-9._-]/g,"_").slice(-80);
  const path=`users/${state.user.uid}/${folder}/${Date.now()}-${crypto.randomUUID()}-${safeName}`;
  const r=storageRef(storage,path);await uploadBytes(r,file,{contentType:file.type});return await getDownloadURL(r);
}
$("#storyForm")?.addEventListener("submit",async e=>{e.preventDefault();busy(e.currentTarget,true);try{const f=$("#storyMedia").files[0];const mediaURL=await upload(f,"stories");await api("/stories",{method:"POST",body:JSON.stringify({text:$("#storyText").value.trim()||(f?"Shared a story":"") ,visibility:$("#storyVisibility").value,mediaURL,mediaType:f?.type||""})});$("#storyText").value="";$("#storyMedia").value="";message("#storyMessage","Story shared.","success");await loadStories();}catch(err){message("#storyMessage",err.message);}finally{busy(e.currentTarget,false);}});
$("#letterForm")?.addEventListener("submit",async e=>{e.preventDefault();busy(e.currentTarget,true);try{await api("/letters",{method:"POST",body:JSON.stringify({recipientId:$("#letterRecipient").value.trim(),title:$("#letterTitle").value,body:$("#letterBody").value,visibility:$("#letterVisibility").value})});$("#letterBody").value="";message("#letterMessage","Letter sent.","success");await loadLetters();}catch(err){message("#letterMessage",err.message);}finally{busy(e.currentTarget,false);}});
$("#userSearchForm")?.addEventListener("submit",async e=>{e.preventDefault();try{const d=await api(`/users/search?q=${encodeURIComponent($("#userSearch").value.trim())}`);showList("#searchResults",d.users,p=>{const row=node("div",undefined,"card user-result");row.append(node("strong",p.displayName),node("p",p.bio||""));const b=node("button","Add friend","primary-button");b.type="button";b.addEventListener("click",async()=>{try{await api(`/friend-requests/${encodeURIComponent(p.uid)}`,{method:"POST",body:"{}"});toast("Friend request sent.","success");b.disabled=true;}catch(err){toast(err.message,"error");}});row.append(b);return row;},"No public profiles found.");}catch(err){message("#searchResults",err.message);}});
$("#messageForm")?.addEventListener("submit",async e=>{e.preventDefault();if(!state.selectedFriend)return;busy(e.currentTarget,true);try{await api(`/messages/${encodeURIComponent(state.selectedFriend.uid)}`,{method:"POST",body:JSON.stringify({text:$("#messageText").value})});$("#messageText").value="";message("#messageStatus","Message sent.","success");await loadMessages(state.selectedFriend.uid);}catch(err){message("#messageStatus",err.message);}finally{busy(e.currentTarget,false);}});
$("#profileForm")?.addEventListener("submit",async e=>{e.preventDefault();busy(e.currentTarget,true);try{let photoURL=state.profile?.photoURL||"";const file=$("#profilePhoto").files[0];if(file)photoURL=await upload(file,"profile");const d=await api("/me/profile",{method:"PUT",body:JSON.stringify({displayName:$("#profileName").value,bio:$("#profileBio").value,photoURL,visibility:$("#profileVisibility").value})});state.profile=d.profile;message("#profileMessage","Profile saved.","success");await loadProfile();}catch(err){message("#profileMessage",err.message);}finally{busy(e.currentTarget,false);}});
$("#markNotificationsRead")?.addEventListener("click",async()=>{try{await api("/notifications/read",{method:"PATCH",body:"{}"});await loadNotifications();toast("Notifications marked as read.","success");}catch(e){toast(e.message,"error");}});
$("#deleteAccountButton")?.addEventListener("click",async()=>{if(!confirm("Permanently delete your account and associated data? This cannot be undone."))return;try{await api("/me",{method:"DELETE"});await signOut(auth);message("#accountMessage","Account deleted.","success");}catch(e){message("#accountMessage",e.message);}});

onAuthStateChanged(auth,async user=>{
  state.user=user;
  if($("#sidebar"))$("#sidebar").hidden=!user;
  if(user){try{await refreshAll();setPage("home");}catch(e){toast(e.message,"error");setPage("home");}}
  else {state.profile=null;setPage("auth");}
});
