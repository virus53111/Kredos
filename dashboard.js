import {
  currentAccount,
  logoutAccount,
  addDevice,
  listMyDevices,
  firebaseErrorCode
} from "./firebase-client.js";

const dashText={
ru:{logout:"Выйти",renterEyebrow:"Кабинет арендатора",renterTitle:"Готов к следующей сессии?",renterText:"Выбирай реальные Android и контролируй баланс и историю аренды.",hostEyebrow:"Кабинет владельца",hostTitle:"Твои устройства и заработок.",hostText:"Добавляй Android в серверную базу. Реальное онлайн-подключение будет на этапе 4.",browse:"Выбрать телефон",addPhone:"Добавить телефон",balance:"Баланс",activeSessions:"Активные сессии",hoursUsed:"Использовано часов",recentRentals:"Последние аренды",noRentals:"Аренд пока нет",noRentalsText:"Выбери устройство в каталоге. Реальные сессии подключим на этапе 5.",account:"Аккаунт",role:"Роль",renter:"Арендатор",rate:"Тариф",dayRate:"24 часа",earnings:"Заработано",devices:"Телефоны",paidHours:"Оплаченных часов",myDevices:"Мои телефоны",noDevices:"Телефонов пока нет",noDevicesText:"Добавь первый телефон — он сохранится в Firestore.",payout:"Выплаты",hostRate:"Ставка владельца",available:"Доступно к выводу",payoutStatus:"Статус",notConnected:"Не подключено",referral:"Реферальная ссылка",yourCode:"Твой код",copy:"Копировать",copied:"Скопировано",stage3:"Этап 3",addPhoneTitle:"Добавить телефон",close:"Закрыть",model:"Модель",country:"Страна",android:"Версия Android",carrier:"Оператор",network:"Интернет",savePhone:"Сохранить телефон",pendingText:"После добавления телефон получает статус Pending. Реальное подключение Android-клиента будет на этапе 4.",refresh:"Обновить",pending:"Ожидает подключения",offline:"Офлайн",availableStatus:"Свободен",saved:"Телефон сохранён в Firestore.",permission:"Firestore пока не принял запись. Нужно опубликовать новые правила базы.",serverIssue:"Не удалось получить данные из Firestore.",loading:"Загрузка…"},
en:{logout:"Log out",renterEyebrow:"Renter dashboard",renterTitle:"Ready for the next session?",renterText:"Choose real Android devices and track balance and rental history.",hostEyebrow:"Host dashboard",hostTitle:"Your devices and earnings.",hostText:"Add Android devices to the server database. Real device connectivity arrives in Stage 4.",browse:"Browse phones",addPhone:"Add phone",balance:"Balance",activeSessions:"Active sessions",hoursUsed:"Hours used",recentRentals:"Recent rentals",noRentals:"No rentals yet",noRentalsText:"Choose a device in the catalog. Real sessions arrive in Stage 5.",account:"Account",role:"Role",renter:"Renter",rate:"Rate",dayRate:"24 hours",earnings:"Earnings",devices:"Phones",paidHours:"Paid hours",myDevices:"My phones",noDevices:"No phones yet",noDevicesText:"Add your first phone — it will be stored in Firestore.",payout:"Payouts",hostRate:"Host rate",available:"Available to withdraw",payoutStatus:"Status",notConnected:"Not connected",referral:"Referral link",yourCode:"Your code",copy:"Copy",copied:"Copied",stage3:"Stage 3",addPhoneTitle:"Add phone",close:"Close",model:"Model",country:"Country",android:"Android version",carrier:"Carrier",network:"Internet",savePhone:"Save phone",pendingText:"After adding, the phone gets Pending status. Real Android client connectivity arrives in Stage 4.",refresh:"Refresh",pending:"Pending connection",offline:"Offline",availableStatus:"Available",saved:"Phone saved to Firestore.",permission:"Firestore rejected the write. The new database rules still need to be published.",serverIssue:"Could not load data from Firestore.",loading:"Loading…"},
lv:{logout:"Iziet",renterEyebrow:"Nomnieka kabinets",renterTitle:"Gatavs nākamajai sesijai?",renterText:"Izvēlies reālus Android un seko bilancei un nomas vēsturei.",hostEyebrow:"Īpašnieka kabinets",hostTitle:"Tavas ierīces un ienākumi.",hostText:"Pievieno Android servera datubāzei. Reāls ierīces savienojums būs 4. posmā.",browse:"Izvēlēties tālruni",addPhone:"Pievienot tālruni",balance:"Bilance",activeSessions:"Aktīvās sesijas",hoursUsed:"Izmantotās stundas",recentRentals:"Pēdējās nomas",noRentals:"Nomas vēl nav",noRentalsText:"Izvēlies ierīci katalogā. Reālās sesijas būs 5. posmā.",account:"Konts",role:"Loma",renter:"Nomnieks",rate:"Tarifs",dayRate:"24 stundas",earnings:"Nopelnīts",devices:"Tālruņi",paidHours:"Apmaksātās stundas",myDevices:"Mani tālruņi",noDevices:"Tālruņu vēl nav",noDevicesText:"Pievieno pirmo tālruni — tas tiks saglabāts Firestore.",payout:"Izmaksas",hostRate:"Īpašnieka likme",available:"Pieejams izmaksai",payoutStatus:"Statuss",notConnected:"Nav pieslēgts",referral:"Ieteikumu saite",yourCode:"Tavs kods",copy:"Kopēt",copied:"Nokopēts",stage3:"3. posms",addPhoneTitle:"Pievienot tālruni",close:"Aizvērt",model:"Modelis",country:"Valsts",android:"Android versija",carrier:"Operators",network:"Internets",savePhone:"Saglabāt tālruni",pendingText:"Pēc pievienošanas tālrunim ir Pending statuss. Android klienta pieslēgums būs 4. posmā.",refresh:"Atjaunot",pending:"Gaida pieslēgumu",offline:"Bezsaistē",availableStatus:"Pieejams",saved:"Tālrunis saglabāts Firestore.",permission:"Firestore noraidīja ierakstu. Jāpublicē jaunie datubāzes noteikumi.",serverIssue:"Neizdevās ielādēt Firestore datus.",loading:"Ielāde…"},
et:{logout:"Logi välja",renterEyebrow:"Rentniku töölaud",renterTitle:"Valmis järgmiseks seansiks?",renterText:"Vali päris Androidid ning jälgi saldot ja rendiajalugu.",hostEyebrow:"Omaniku töölaud",hostTitle:"Sinu seadmed ja tulu.",hostText:"Lisa Androidid serveriandmebaasi. Päris seadmeühendus tuleb 4. etapis.",browse:"Vali telefon",addPhone:"Lisa telefon",balance:"Saldo",activeSessions:"Aktiivsed seansid",hoursUsed:"Kasutatud tunnid",recentRentals:"Viimased rendid",noRentals:"Rente veel pole",noRentalsText:"Vali seade kataloogist. Päris seansid tulevad 5. etapis.",account:"Konto",role:"Roll",renter:"Rentnik",rate:"Hind",dayRate:"24 tundi",earnings:"Teenitud",devices:"Telefonid",paidHours:"Tasulised tunnid",myDevices:"Minu telefonid",noDevices:"Telefone veel pole",noDevicesText:"Lisa esimene telefon — see salvestatakse Firestore'i.",payout:"Väljamaksed",hostRate:"Omaniku määr",available:"Väljamakseks saadaval",payoutStatus:"Olek",notConnected:"Pole ühendatud",referral:"Soovituslink",yourCode:"Sinu kood",copy:"Kopeeri",copied:"Kopeeritud",stage3:"3. etapp",addPhoneTitle:"Lisa telefon",close:"Sulge",model:"Mudel",country:"Riik",android:"Androidi versioon",carrier:"Operaator",network:"Internet",savePhone:"Salvesta telefon",pendingText:"Pärast lisamist saab telefon Pending oleku. Android-kliendi päris ühendus tuleb 4. etapis.",refresh:"Värskenda",pending:"Ootab ühendust",offline:"Võrguta",availableStatus:"Saadaval",saved:"Telefon salvestati Firestore'i.",permission:"Firestore keeldus kirjutamisest. Uued andmebaasireeglid tuleb veel avaldada.",serverIssue:"Firestore'i andmete laadimine ebaõnnestus.",loading:"Laadimine…"},
lt:{logout:"Atsijungti",renterEyebrow:"Nuomininko paskyra",renterTitle:"Pasiruošęs kitai sesijai?",renterText:"Rinkis realius Android ir stebėk balansą bei nuomos istoriją.",hostEyebrow:"Savininko paskyra",hostTitle:"Tavo įrenginiai ir pajamos.",hostText:"Pridėk Android į serverio duomenų bazę. Tikras įrenginio ryšys bus 4 etape.",browse:"Rinktis telefoną",addPhone:"Pridėti telefoną",balance:"Balansas",activeSessions:"Aktyvios sesijos",hoursUsed:"Naudotos valandos",recentRentals:"Paskutinės nuomos",noRentals:"Nuomų dar nėra",noRentalsText:"Pasirink įrenginį kataloge. Realios sesijos bus 5 etape.",account:"Paskyra",role:"Rolė",renter:"Nuomininkas",rate:"Tarifas",dayRate:"24 valandos",earnings:"Uždirbta",devices:"Telefonai",paidHours:"Apmokėtos valandos",myDevices:"Mano telefonai",noDevices:"Telefonų dar nėra",noDevicesText:"Pridėk pirmą telefoną — jis bus išsaugotas Firestore.",payout:"Išmokos",hostRate:"Savininko tarifas",available:"Galima išsiimti",payoutStatus:"Būsena",notConnected:"Neprijungta",referral:"Rekomendacijos nuoroda",yourCode:"Tavo kodas",copy:"Kopijuoti",copied:"Nukopijuota",stage3:"3 etapas",addPhoneTitle:"Pridėti telefoną",close:"Uždaryti",model:"Modelis",country:"Šalis",android:"Android versija",carrier:"Operatorius",network:"Internetas",savePhone:"Išsaugoti telefoną",pendingText:"Pridėjus telefonas gauna Pending būseną. Tikras Android kliento ryšys bus 4 etape.",refresh:"Atnaujinti",pending:"Laukia prijungimo",offline:"Neprisijungęs",availableStatus:"Laisvas",saved:"Telefonas išsaugotas Firestore.",permission:"Firestore atmetė įrašą. Dar reikia paskelbti naujas duomenų bazės taisykles.",serverIssue:"Nepavyko įkelti Firestore duomenų.",loading:"Kraunama…"},
uk:{logout:"Вийти",renterEyebrow:"Кабінет орендаря",renterTitle:"Готовий до наступної сесії?",renterText:"Обирай реальні Android і контролюй баланс та історію оренд.",hostEyebrow:"Кабінет власника",hostTitle:"Твої пристрої та заробіток.",hostText:"Додавай Android у серверну базу. Реальне підключення пристрою буде на етапі 4.",browse:"Обрати телефон",addPhone:"Додати телефон",balance:"Баланс",activeSessions:"Активні сесії",hoursUsed:"Використано годин",recentRentals:"Останні оренди",noRentals:"Оренд ще немає",noRentalsText:"Обери пристрій у каталозі. Реальні сесії підключимо на етапі 5.",account:"Акаунт",role:"Роль",renter:"Орендар",rate:"Тариф",dayRate:"24 години",earnings:"Зароблено",devices:"Телефони",paidHours:"Оплачених годин",myDevices:"Мої телефони",noDevices:"Телефонів ще немає",noDevicesText:"Додай перший телефон — він збережеться у Firestore.",payout:"Виплати",hostRate:"Ставка власника",available:"Доступно до виводу",payoutStatus:"Статус",notConnected:"Не підключено",referral:"Реферальне посилання",yourCode:"Твій код",copy:"Копіювати",copied:"Скопійовано",stage3:"Етап 3",addPhoneTitle:"Додати телефон",close:"Закрити",model:"Модель",country:"Країна",android:"Версія Android",carrier:"Оператор",network:"Інтернет",savePhone:"Зберегти телефон",pendingText:"Після додавання телефон отримує статус Pending. Реальне підключення Android-клієнта буде на етапі 4.",refresh:"Оновити",pending:"Очікує підключення",offline:"Офлайн",availableStatus:"Вільний",saved:"Телефон збережено у Firestore.",permission:"Firestore відхилив запис. Потрібно опублікувати нові правила бази.",serverIssue:"Не вдалося завантажити дані Firestore.",loading:"Завантаження…"}
};

const languageSelect=document.getElementById("languageSelect");
let lang=localStorage.getItem("pb-language")||"ru";
const t=k=>(dashText[lang]||dashText.en)[k]||k;
let user=null;
let devices=[];

function showServerState(message,kind="warning"){
  const el=document.getElementById("serverState");
  el.textContent=message;
  el.className="server-state "+kind;
}

function hideServerState(){
  document.getElementById("serverState").className="server-state hidden";
}

function renderDevices(){
  const box=document.getElementById("deviceList");
  if(!box)return;
  document.getElementById("deviceCount").textContent=String(devices.length);
  if(!devices.length){
    box.innerHTML='<div class="empty-box"><b>'+t("noDevices")+'</b><span>'+t("noDevicesText")+'</span></div>';
    return;
  }
  box.innerHTML=devices.map(d=>{
    const statusKey=d.status==="available"?"availableStatus":d.status==="offline"?"offline":"pending";
    return '<div class="saved-device">'+
      '<div><b>'+escapeHtml(d.model)+'</b><small>'+escapeHtml(d.country)+' · '+escapeHtml(d.androidVersion)+(d.carrier?' · '+escapeHtml(d.carrier):'')+'</small></div>'+
      '<span class="device-status '+escapeHtml(d.status||"pending")+'">'+t(statusKey)+'</span>'+
    '</div>';
  }).join("");
}

function escapeHtml(value){
  return String(value??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
}

function render(){
  document.documentElement.lang=lang;
  languageSelect.value=lang;
  document.querySelectorAll("[data-t]").forEach(el=>el.textContent=t(el.dataset.t));
  document.getElementById("userEmail").textContent=user.email;
  document.getElementById("refCode").textContent=user.referralCode;
  const isHost=user.role==="host";
  document.getElementById("hostDashboard").classList.toggle("hidden",!isHost);
  document.getElementById("renterDashboard").classList.toggle("hidden",isHost);
  document.getElementById("roleEyebrow").textContent=t(isHost?"hostEyebrow":"renterEyebrow");
  document.getElementById("dashTitle").textContent=t(isHost?"hostTitle":"renterTitle");
  document.getElementById("dashText").textContent=t(isHost?"hostText":"renterText");
  const action=document.getElementById("primaryAction");
  action.textContent=t(isHost?"addPhone":"browse");
  action.href=isHost?"#addDevicePanel":"index.html#devices";
  if(isHost)renderDevices();
}

async function loadDevices(){
  if(user.role!=="host")return;
  hideServerState();
  const box=document.getElementById("deviceList");
  box.innerHTML='<div class="empty-box">'+t("loading")+'</div>';
  try{
    devices=await listMyDevices();
    renderDevices();
  }catch(error){
    console.error(error);
    showServerState(firebaseErrorCode(error).includes("permission-denied")?t("permission"):t("serverIssue"),"warning");
    devices=[];
    renderDevices();
  }
}

user=await currentAccount();
if(!user){
  location.replace("auth.html?mode=login");
  throw new Error("AUTH_REQUIRED");
}

languageSelect.addEventListener("change",e=>{
  lang=e.target.value;
  localStorage.setItem("pb-language",lang);
  render();
});

document.getElementById("logoutBtn").onclick=async()=>{
  await logoutAccount();
  location.href="index.html";
};

document.getElementById("copyRef").onclick=async()=>{
  const value=location.origin+location.pathname.replace(/dashboard\.html$/,"auth.html")+"?mode=register&ref="+encodeURIComponent(user.referralCode);
  try{
    await navigator.clipboard.writeText(value);
    document.getElementById("copyRef").textContent=t("copied");
    setTimeout(()=>render(),1200);
  }catch{
    prompt("Referral link",value);
  }
};

document.getElementById("primaryAction").addEventListener("click",e=>{
  if(user.role!=="host")return;
  e.preventDefault();
  document.getElementById("addDevicePanel").classList.remove("hidden");
  document.getElementById("addDevicePanel").scrollIntoView({behavior:"smooth",block:"start"});
});

document.getElementById("closeDeviceForm").onclick=()=>document.getElementById("addDevicePanel").classList.add("hidden");
document.getElementById("refreshDevices").onclick=()=>loadDevices();

document.getElementById("deviceForm").addEventListener("submit",async e=>{
  e.preventDefault();
  const msg=document.getElementById("deviceFormMessage");
  msg.textContent="";
  try{
    await addDevice({
      model:document.getElementById("deviceModel").value,
      country:document.getElementById("deviceCountry").value,
      androidVersion:document.getElementById("deviceAndroid").value,
      carrier:document.getElementById("deviceCarrier").value,
      network:document.getElementById("deviceNetwork").value
    });
    e.currentTarget.reset();
    document.getElementById("deviceNetwork").value="5G";
    msg.className="auth-error auth-success";
    msg.textContent=t("saved");
    await loadDevices();
  }catch(error){
    console.error(error);
    msg.className="auth-error";
    msg.textContent=firebaseErrorCode(error).includes("permission-denied")?t("permission"):t("serverIssue");
  }
});

render();
await loadDevices();
