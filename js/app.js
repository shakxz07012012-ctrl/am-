import { initializeApp } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js";
import {
  getAuth, onAuthStateChanged, signInWithEmailAndPassword,
  createUserWithEmailAndPassword, updateProfile, signInWithPopup,
  GoogleAuthProvider, signOut
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";
import {
  getFirestore, collection, addDoc, deleteDoc, doc,
  onSnapshot, query, orderBy, serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";

/* =========================================================
   1) TEMPEL CONFIG FIREBASE KAMU DI SINI
   Firebase Console -> Project settings -> Your apps -> Web app
   ========================================================= */
const firebaseConfig = {
  apiKey: "AIzaSyDk6DVOc5vDHtbUAiy-b_XNo_DHh1Cu908",
  authDomain: "am-prem-24cc0.firebaseapp.com",
  projectId: "am-prem-24cc0",
  storageBucket: "am-prem-24cc0.firebasestorage.app",
  messagingSenderId: "1088396122381",
  appId: "1:1088396122381:web:4b993d0eaad8812e6fb844",
  measurementId: "G-PWZGQ10784"
};

const configured = !firebaseConfig.apiKey.startsWith("ISI_") &&
                   !firebaseConfig.projectId.startsWith("ISI_");

let auth, db, googleProvider;
if (configured) {
  const app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  googleProvider = new GoogleAuthProvider();
} else {
  console.warn("Firebase belum dikonfigurasi. Isi firebaseConfig di js/app.js.");
}

const $ = id => document.getElementById(id);
const authView=$("authView"), appView=$("appView"), status=$("status");
let mode="login", unsubscribeNotes=null;

function msg(text, error=false){status.textContent=text;status.style.color=error?"#ff7887":"#9299a8"}

document.querySelectorAll(".tab").forEach(btn=>btn.onclick=()=>{
  document.querySelectorAll(".tab").forEach(x=>x.classList.remove("active"));
  btn.classList.add("active"); mode=btn.dataset.mode;
  $("authTitle").textContent=mode==="login"?"Selamat datang":"Buat akun baru";
  $("authSub").textContent=mode==="login"?"Masuk dengan email dan password.":"Daftar untuk membuat akun.";
  $("submitBtn").textContent=mode==="login"?"Masuk":"Daftar";
  $("nameWrap").classList.toggle("hidden",mode==="login"); msg("");
});

$("authForm").onsubmit=async e=>{
  e.preventDefault();
  if(!configured) return msg("Isi firebaseConfig terlebih dahulu.",true);
  try{
    msg("Memproses...");
    const email=$("email").value.trim(), pass=$("password").value;
    if(mode==="login") await signInWithEmailAndPassword(auth,email,pass);
    else{
      const cred=await createUserWithEmailAndPassword(auth,email,pass);
      const name=$("displayName").value.trim();
      if(name) await updateProfile(cred.user,{displayName:name});
    }
  }catch(err){msg(err.message,true)}
};

$("googleBtn").onclick=async()=>{
  if(!configured) return msg("Isi firebaseConfig terlebih dahulu.",true);
  try{await signInWithPopup(auth,googleProvider)}catch(err){msg(err.message,true)}
};
$("logoutBtn").onclick=()=>auth&&signOut(auth);

$("themeBtn").onclick=()=>{
  document.body.classList.toggle("light");
  localStorage.theme=document.body.classList.contains("light")?"light":"dark";
};
if(localStorage.theme==="light")document.body.classList.add("light");

function renderUser(user){
  const name=user.displayName||user.email?.split("@")[0]||"User";
  $("userName").textContent=name;$("accountEmail").textContent=user.email||"—";
  $("profileName").textContent=name;$("profileEmail").textContent=user.email||"—";
  $("avatar").textContent=name[0].toUpperCase();$("profileAvatar").textContent=name[0].toUpperCase();
}

function notesListener(user){
  if(unsubscribeNotes) unsubscribeNotes();
  const q=query(collection(db,"users",user.uid,"notes"),orderBy("createdAt","desc"));
  unsubscribeNotes=onSnapshot(q,snap=>{
    $("noteCount").textContent=snap.size;
    $("notes").innerHTML="";
    snap.forEach(d=>{
      const el=document.createElement("div"); el.className="note";
      const span=document.createElement("span"); span.textContent=d.data().text;
      const del=document.createElement("button"); del.className="delete"; del.textContent="Hapus";
      del.onclick=()=>deleteDoc(doc(db,"users",user.uid,"notes",d.id));
      el.append(span,del); $("notes").appendChild(el);
    });
  });
}
$("noteForm").onsubmit=async e=>{
  e.preventDefault();
  const user=auth?.currentUser, input=$("noteInput");
  if(!user||!input.value.trim())return;
  await addDoc(collection(db,"users",user.uid,"notes"),{text:input.value.trim(),createdAt:serverTimestamp()});
  input.value="";
};

if(configured) onAuthStateChanged(auth,user=>{
  const logged=!!user;
  authView.classList.toggle("hidden",logged);
  appView.classList.toggle("hidden",!logged);
  $("logoutBtn").classList.toggle("hidden",!logged);
  if(user){renderUser(user);notesListener(user)}
  else if(unsubscribeNotes){unsubscribeNotes();unsubscribeNotes=null}
});
