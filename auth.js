import {
  registerAccount,
  loginAccount,
  waitForAuth,
  firebaseErrorCode
} from "./firebase-client.js";

const authText={
ru:{back:"На главную",eyebrow:"Один аккаунт — два сценария",introTitle:"Арендуй телефон или зарабатывай на своём.",introText:"Аккаунт теперь хранится в Firebase и работает на разных устройствах.",b1:"Оплата по времени",b1s:"$1/час, $10/24 часа",b2:"50% владельцу",b2s:"$0.50 за каждый оплаченный час",b3:"Реферальная система",b3s:"У каждого аккаунта свой код приглашения",login:"Вход",register:"Регистрация",email:"Email",password:"Пароль",signIn:"Войти в кабинет",repeatPassword:"Повтори пароль",chooseRole:"Как будешь использовать PhoneBridge?",renter:"Арендатор",renterText:"Хочу арендовать реальные телефоны",host:"Владелец",hostText:"Хочу сдавать свой Android",terms:"Я согласен с правилами платформы и законным использованием устройств.",create:"Создать аккаунт",prototypeNote:"Этап 3: используется настоящая Firebase Authentication. Профили и телефоны сохраняются в Firestore после публикации новых правил базы.",exists:"Такой email уже зарегистрирован.",bad:"Неверный email или пароль.",weak:"Пароль должен быть не короче 8 символов.",mismatch:"Пароли не совпадают.",generic:"Не удалось выполнить операцию."},
en:{back:"Home",eyebrow:"One account — two paths",introTitle:"Rent a phone or earn from yours.",introText:"Accounts now live in Firebase and work across devices.",b1:"Time-based billing",b1s:"$1/hour, $10/24 hours",b2:"50% to the host",b2s:"$0.50 for every paid hour",b3:"Referral program",b3s:"Every account gets an invite code",login:"Sign in",register:"Register",email:"Email",password:"Password",signIn:"Open dashboard",repeatPassword:"Repeat password",chooseRole:"How will you use PhoneBridge?",renter:"Renter",renterText:"I want to rent real phones",host:"Host",hostText:"I want to list my Android",terms:"I agree to the platform rules and lawful device use.",create:"Create account",prototypeNote:"Stage 3 uses real Firebase Authentication. Profiles and phones are stored in Firestore after the new database rules are published.",exists:"This email is already registered.",bad:"Incorrect email or password.",weak:"Password must be at least 8 characters.",mismatch:"Passwords do not match.",generic:"The operation failed."},
lv:{back:"Sākums",eyebrow:"Viens konts — divi veidi",introTitle:"Nomā tālruni vai pelni ar savu.",introText:"Konts tagad glabājas Firebase un darbojas dažādās ierīcēs.",b1:"Apmaksa par laiku",b1s:"$1/stundā, $10/24 h",b2:"50% īpašniekam",b2s:"$0.50 par katru apmaksātu stundu",b3:"Ieteikumu programma",b3s:"Katram kontam ir ielūguma kods",login:"Ieiet",register:"Reģistrēties",email:"Email",password:"Parole",signIn:"Atvērt kabinetu",repeatPassword:"Atkārto paroli",chooseRole:"Kā izmantosi PhoneBridge?",renter:"Nomnieks",renterText:"Vēlos nomāt reālus tālruņus",host:"Īpašnieks",hostText:"Vēlos iznomāt savu Android",terms:"Piekrītu platformas noteikumiem un likumīgai ierīču izmantošanai.",create:"Izveidot kontu",prototypeNote:"3. posmā tiek izmantota īsta Firebase Authentication. Profili un tālruņi tiek glabāti Firestore pēc jauno noteikumu publicēšanas.",exists:"Šis e-pasts jau ir reģistrēts.",bad:"Nepareizs e-pasts vai parole.",weak:"Parolei jābūt vismaz 8 rakstzīmēm.",mismatch:"Paroles nesakrīt.",generic:"Darbību neizdevās izpildīt."},
et:{back:"Avaleht",eyebrow:"Üks konto — kaks võimalust",introTitle:"Rendi telefon või teeni enda omaga.",introText:"Konto on nüüd Firebase'is ja töötab eri seadmetes.",b1:"Ajapõhine arveldus",b1s:"$1/tund, $10/24 h",b2:"50% omanikule",b2s:"$0.50 iga tasulise tunni eest",b3:"Soovitusprogramm",b3s:"Igal kontol on kutsekood",login:"Logi sisse",register:"Registreeru",email:"Email",password:"Parool",signIn:"Ava töölaud",repeatPassword:"Korda parooli",chooseRole:"Kuidas kasutad PhoneBridge'i?",renter:"Rentnik",renterText:"Soovin rentida päris telefone",host:"Omanik",hostText:"Soovin anda oma Androidi rendile",terms:"Nõustun platvormi reeglite ja seadusliku kasutusega.",create:"Loo konto",prototypeNote:"3. etapp kasutab päris Firebase Authenticationit. Profiilid ja telefonid salvestatakse Firestore'i pärast uute reeglite avaldamist.",exists:"See e-post on juba registreeritud.",bad:"Vale e-post või parool.",weak:"Parool peab olema vähemalt 8 tähemärki.",mismatch:"Paroolid ei ühti.",generic:"Toiming ebaõnnestus."},
lt:{back:"Pradžia",eyebrow:"Viena paskyra — du keliai",introTitle:"Nuomok telefoną arba uždirbk iš savojo.",introText:"Paskyra dabar saugoma Firebase ir veikia skirtinguose įrenginiuose.",b1:"Mokėjimas pagal laiką",b1s:"$1/val., $10/24 val.",b2:"50% savininkui",b2s:"$0.50 už kiekvieną apmokėtą valandą",b3:"Rekomendacijų programa",b3s:"Kiekviena paskyra turi kvietimo kodą",login:"Prisijungti",register:"Registruotis",email:"Email",password:"Slaptažodis",signIn:"Atidaryti paskyrą",repeatPassword:"Pakartok slaptažodį",chooseRole:"Kaip naudosi PhoneBridge?",renter:"Nuomininkas",renterText:"Noriu nuomoti realius telefonus",host:"Savininkas",hostText:"Noriu išnuomoti savo Android",terms:"Sutinku su platformos taisyklėmis ir teisėtu įrenginių naudojimu.",create:"Sukurti paskyrą",prototypeNote:"3 etapas naudoja tikrą Firebase Authentication. Profiliai ir telefonai saugomi Firestore paskelbus naujas taisykles.",exists:"Šis el. paštas jau registruotas.",bad:"Neteisingas el. paštas arba slaptažodis.",weak:"Slaptažodis turi būti bent 8 simbolių.",mismatch:"Slaptažodžiai nesutampa.",generic:"Operacijos atlikti nepavyko."},
uk:{back:"На головну",eyebrow:"Один акаунт — два сценарії",introTitle:"Орендуй телефон або заробляй на своєму.",introText:"Акаунт тепер зберігається у Firebase і працює на різних пристроях.",b1:"Оплата за часом",b1s:"$1/год, $10/24 години",b2:"50% власнику",b2s:"$0.50 за кожну оплачену годину",b3:"Реферальна система",b3s:"Кожен акаунт має код запрошення",login:"Вхід",register:"Реєстрація",email:"Email",password:"Пароль",signIn:"Увійти в кабінет",repeatPassword:"Повтори пароль",chooseRole:"Як використовуватимеш PhoneBridge?",renter:"Орендар",renterText:"Хочу орендувати реальні телефони",host:"Власник",hostText:"Хочу здавати свій Android",terms:"Я погоджуюся з правилами платформи та законним використанням пристроїв.",create:"Створити акаунт",prototypeNote:"Етап 3 використовує справжню Firebase Authentication. Профілі й телефони зберігаються у Firestore після публікації нових правил.",exists:"Такий email уже зареєстровано.",bad:"Невірний email або пароль.",weak:"Пароль має містити щонайменше 8 символів.",mismatch:"Паролі не збігаються.",generic:"Не вдалося виконати операцію."}
};

const qs=new URLSearchParams(location.search);
const langSelect=document.getElementById("languageSelect");
let lang=localStorage.getItem("pb-language")||"ru";
const t=key=>(authText[lang]||authText.en)[key]||key;

function applyLanguage(){
  document.documentElement.lang=lang;
  langSelect.value=lang;
  document.querySelectorAll("[data-t]").forEach(el=>{el.textContent=t(el.dataset.t)});
}

function setMode(mode){
  const register=mode==="register";
  document.getElementById("loginForm").classList.toggle("hidden",register);
  document.getElementById("registerForm").classList.toggle("hidden",!register);
  document.getElementById("loginTab").classList.toggle("active",!register);
  document.getElementById("registerTab").classList.toggle("active",register);
  const next=new URL(location.href);
  next.searchParams.set("mode",register?"register":"login");
  history.replaceState(null,"",next);
}

function errorText(error){
  const code=firebaseErrorCode(error);
  if(code.includes("email-already-in-use"))return t("exists");
  if(code.includes("invalid-credential")||code.includes("wrong-password")||code.includes("user-not-found"))return t("bad");
  if(code.includes("weak-password"))return t("weak");
  return t("generic");
}

const existing=await waitForAuth();
if(existing) location.replace("dashboard.html");

langSelect.addEventListener("change",e=>{lang=e.target.value;localStorage.setItem("pb-language",lang);applyLanguage()});
document.getElementById("loginTab").onclick=()=>setMode("login");
document.getElementById("registerTab").onclick=()=>setMode("register");

document.getElementById("loginForm").addEventListener("submit",async e=>{
  e.preventDefault();
  const box=document.getElementById("loginError");
  box.textContent="";
  try{
    await loginAccount(document.getElementById("loginEmail").value,document.getElementById("loginPassword").value);
    location.href="dashboard.html";
  }catch(error){box.textContent=errorText(error)}
});

document.getElementById("registerForm").addEventListener("submit",async e=>{
  e.preventDefault();
  const box=document.getElementById("registerError");
  box.textContent="";
  const p1=document.getElementById("registerPassword").value;
  const p2=document.getElementById("registerPassword2").value;
  if(p1!==p2){box.textContent=t("mismatch");return}
  const role=document.querySelector('input[name="role"]:checked').value;
  try{
    await registerAccount({
      email:document.getElementById("registerEmail").value,
      password:p1,
      role
    });
    location.href="dashboard.html";
  }catch(error){box.textContent=errorText(error)}
});

const wantedRole=qs.get("role");
if(wantedRole==="host")document.getElementById("roleHost").checked=true;
if(wantedRole==="renter")document.getElementById("roleRenter").checked=true;
setMode(qs.get("mode")==="register"?"register":"login");
applyLanguage();
