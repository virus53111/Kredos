import { watchAuth } from "./firebase-client.js";

const labels={
  ru:{in:"Войти",dash:"Кабинет"},
  en:{in:"Sign in",dash:"Dashboard"},
  lv:{in:"Ieiet",dash:"Kabinets"},
  et:{in:"Logi sisse",dash:"Töölaud"},
  lt:{in:"Prisijungti",dash:"Paskyra"},
  uk:{in:"Увійти",dash:"Кабінет"}
};

let currentUser=null;
const link=document.getElementById("accountLink");
const select=document.getElementById("languageSelect");

function paint(){
  if(!link)return;
  const lang=localStorage.getItem("pb-language")||"ru";
  const copy=labels[lang]||labels.en;
  link.removeAttribute("data-i18n");
  link.textContent=currentUser?copy.dash:copy.in;
  link.href=currentUser?"dashboard.html":"auth.html?mode=login";
}

watchAuth(user=>{currentUser=user;paint()});
select?.addEventListener("change",()=>setTimeout(paint,0));
