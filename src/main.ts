import './styles.css';
import { api, auth } from '@appdeploy/client';

type Role = 'renter' | 'host';
type Profile = { role: Role; referralCode: string; email?: string };
type Device = {
  id: string;
  model: string;
  country: string;
  androidVersion: string;
  carrier: string;
  network: string;
  status: string;
};

const words: Record<string, Record<string, string>> = {
  ru: {
    signIn: 'Войти',
    signOut: 'Выйти',
    heroTitle: 'Арендуй настоящий телефон за $1 в час.',
    heroText:
      'Для тестирования приложений и QA на реальных устройствах. Или подключи свой Android и получай $0.50 за каждый оплаченный час.',
    rent: 'Арендовать телефон',
    host: 'Сдать свой телефон',
    available: 'Свободен',
    choose: 'Выбери реальный Android',
    billing: 'Плати только за нужное время',
    needRole: 'Выбери тип аккаунта',
    roleText: 'Это определит твой кабинет.',
    renter: 'Арендатор',
    renterText: 'Хочу арендовать реальные телефоны',
    owner: 'Владелец телефона',
    ownerText: 'Хочу сдавать свой Android',
    renterTitle: 'Кабинет арендатора',
    hostTitle: 'Твои телефоны и заработок',
    balance: 'Баланс',
    sessions: 'Активные сессии',
    hours: 'Часы',
    earnings: 'Заработано',
    phones: 'Телефоны',
    add: 'Добавить телефон',
    model: 'Модель',
    country: 'Страна',
    android: 'Версия Android',
    carrier: 'Оператор',
    network: 'Интернет',
    save: 'Сохранить телефон',
    myPhones: 'Мои телефоны',
    noPhones: 'Телефонов пока нет',
    pending: 'Ожидает подключения',
    ref: 'Реферальный код',
    copy: 'Копировать',
    copied: 'Скопировано',
    saved: 'Телефон сохранён',
    error: 'Ошибка. Попробуй ещё раз.',
    legal:
      'Только законное использование для тестирования, QA и совместимых задач.',
  },
  en: {
    signIn: 'Sign in',
    signOut: 'Sign out',
    heroTitle: 'Rent a real phone for $1 an hour.',
    heroText:
      'For app testing and QA on real devices. Or connect your Android and earn $0.50 for every paid rental hour.',
    rent: 'Rent a phone',
    host: 'List my phone',
    available: 'Available',
    choose: 'Choose a real Android',
    billing: 'Pay only for the time you need',
    needRole: 'Choose account type',
    roleText: 'This determines your dashboard.',
    renter: 'Renter',
    renterText: 'I want to rent real phones',
    owner: 'Phone owner',
    ownerText: 'I want to list my Android',
    renterTitle: 'Renter dashboard',
    hostTitle: 'Your phones and earnings',
    balance: 'Balance',
    sessions: 'Active sessions',
    hours: 'Hours',
    earnings: 'Earnings',
    phones: 'Phones',
    add: 'Add phone',
    model: 'Model',
    country: 'Country',
    android: 'Android version',
    carrier: 'Carrier',
    network: 'Internet',
    save: 'Save phone',
    myPhones: 'My phones',
    noPhones: 'No phones yet',
    pending: 'Pending connection',
    ref: 'Referral code',
    copy: 'Copy',
    copied: 'Copied',
    saved: 'Phone saved',
    error: 'Something went wrong. Try again.',
    legal: 'Lawful use only for testing, QA and compatible tasks.',
  },
  lv: {
    signIn: 'Ieiet',
    signOut: 'Iziet',
    heroTitle: 'Nomā īstu tālruni par $1 stundā.',
    heroText:
      'Lietotņu testēšanai un QA reālās ierīcēs. Vai pieslēdz savu Android un saņem $0.50 par katru apmaksāto stundu.',
    rent: 'Nomāt tālruni',
    host: 'Iznomāt savu tālruni',
    available: 'Pieejams',
    choose: 'Izvēlies īstu Android',
    billing: 'Maksā tikai par vajadzīgo laiku',
    needRole: 'Izvēlies konta tipu',
    roleText: 'Tas noteiks tavu kabinetu.',
    renter: 'Nomnieks',
    renterText: 'Vēlos nomāt reālus tālruņus',
    owner: 'Tālruņa īpašnieks',
    ownerText: 'Vēlos iznomāt savu Android',
    renterTitle: 'Nomnieka kabinets',
    hostTitle: 'Tavi tālruņi un ienākumi',
    balance: 'Bilance',
    sessions: 'Aktīvās sesijas',
    hours: 'Stundas',
    earnings: 'Nopelnīts',
    phones: 'Tālruņi',
    add: 'Pievienot tālruni',
    model: 'Modelis',
    country: 'Valsts',
    android: 'Android versija',
    carrier: 'Operators',
    network: 'Internets',
    save: 'Saglabāt tālruni',
    myPhones: 'Mani tālruņi',
    noPhones: 'Tālruņu vēl nav',
    pending: 'Gaida pieslēgumu',
    ref: 'Ieteikuma kods',
    copy: 'Kopēt',
    copied: 'Nokopēts',
    saved: 'Tālrunis saglabāts',
    error: 'Kļūda. Mēģini vēlreiz.',
    legal: 'Tikai likumīgai testēšanai un QA.',
  },
  et: {
    signIn: 'Logi sisse',
    signOut: 'Logi välja',
    heroTitle: 'Rendi päris telefon hinnaga $1 tunnis.',
    heroText:
      'Rakenduste testimiseks ja QA-ks päris seadmetel. Või ühenda oma Android ja teeni $0.50 iga tasulise tunni eest.',
    rent: 'Rendi telefon',
    host: 'Anna telefon rendile',
    available: 'Vaba',
    choose: 'Vali päris Android',
    billing: 'Maksa ainult vajaliku aja eest',
    needRole: 'Vali konto tüüp',
    roleText: 'See määrab sinu töölaua.',
    renter: 'Rentnik',
    renterText: 'Soovin rentida päris telefone',
    owner: 'Telefoni omanik',
    ownerText: 'Soovin anda oma Androidi rendile',
    renterTitle: 'Rentniku töölaud',
    hostTitle: 'Sinu telefonid ja tulu',
    balance: 'Saldo',
    sessions: 'Aktiivsed seansid',
    hours: 'Tunnid',
    earnings: 'Teenitud',
    phones: 'Telefonid',
    add: 'Lisa telefon',
    model: 'Mudel',
    country: 'Riik',
    android: 'Androidi versioon',
    carrier: 'Operaator',
    network: 'Internet',
    save: 'Salvesta telefon',
    myPhones: 'Minu telefonid',
    noPhones: 'Telefone veel pole',
    pending: 'Ootab ühendust',
    ref: 'Soovituskood',
    copy: 'Kopeeri',
    copied: 'Kopeeritud',
    saved: 'Telefon salvestatud',
    error: 'Viga. Proovi uuesti.',
    legal: 'Ainult seaduslikuks testimiseks ja QA-ks.',
  },
  lt: {
    signIn: 'Prisijungti',
    signOut: 'Atsijungti',
    heroTitle: 'Nuomok tikrą telefoną už $1 per valandą.',
    heroText:
      'Programėlių testavimui ir QA realiuose įrenginiuose. Arba prijunk savo Android ir gauk $0.50 už kiekvieną apmokėtą valandą.',
    rent: 'Nuomoti telefoną',
    host: 'Išnuomoti savo telefoną',
    available: 'Laisvas',
    choose: 'Pasirink tikrą Android',
    billing: 'Mokėk tik už reikiamą laiką',
    needRole: 'Pasirink paskyros tipą',
    roleText: 'Tai nustatys tavo paskyros režimą.',
    renter: 'Nuomininkas',
    renterText: 'Noriu nuomoti realius telefonus',
    owner: 'Telefono savininkas',
    ownerText: 'Noriu išnuomoti savo Android',
    renterTitle: 'Nuomininko paskyra',
    hostTitle: 'Tavo telefonai ir pajamos',
    balance: 'Balansas',
    sessions: 'Aktyvios sesijos',
    hours: 'Valandos',
    earnings: 'Uždirbta',
    phones: 'Telefonai',
    add: 'Pridėti telefoną',
    model: 'Modelis',
    country: 'Šalis',
    android: 'Android versija',
    carrier: 'Operatorius',
    network: 'Internetas',
    save: 'Išsaugoti telefoną',
    myPhones: 'Mano telefonai',
    noPhones: 'Telefonų dar nėra',
    pending: 'Laukia prijungimo',
    ref: 'Rekomendacijos kodas',
    copy: 'Kopijuoti',
    copied: 'Nukopijuota',
    saved: 'Telefonas išsaugotas',
    error: 'Klaida. Bandyk dar kartą.',
    legal: 'Tik teisėtam testavimui ir QA.',
  },
  uk: {
    signIn: 'Увійти',
    signOut: 'Вийти',
    heroTitle: 'Орендуй справжній телефон за $1 на годину.',
    heroText:
      'Для тестування застосунків і QA на реальних пристроях. Або підключи свій Android і отримуй $0.50 за кожну оплачену годину.',
    rent: 'Орендувати телефон',
    host: 'Здати свій телефон',
    available: 'Вільний',
    choose: 'Обери реальний Android',
    billing: 'Плати лише за потрібний час',
    needRole: 'Обери тип акаунта',
    roleText: 'Це визначить твій кабінет.',
    renter: 'Орендар',
    renterText: 'Хочу орендувати реальні телефони',
    owner: 'Власник телефона',
    ownerText: 'Хочу здавати свій Android',
    renterTitle: 'Кабінет орендаря',
    hostTitle: 'Твої телефони та заробіток',
    balance: 'Баланс',
    sessions: 'Активні сесії',
    hours: 'Години',
    earnings: 'Зароблено',
    phones: 'Телефони',
    add: 'Додати телефон',
    model: 'Модель',
    country: 'Країна',
    android: 'Версія Android',
    carrier: 'Оператор',
    network: 'Інтернет',
    save: 'Зберегти телефон',
    myPhones: 'Мої телефони',
    noPhones: 'Телефонів ще немає',
    pending: 'Очікує підключення',
    ref: 'Реферальний код',
    copy: 'Копіювати',
    copied: 'Скопійовано',
    saved: 'Телефон збережено',
    error: 'Помилка. Спробуй ще раз.',
    legal: 'Лише законне використання для тестування та QA.',
  },
};

const root = document.querySelector<HTMLDivElement>('#app')!;
let lang = localStorage.getItem('pb_language') || 'ru';
let user: Awaited<ReturnType<typeof auth.getUser>> = null;
let profile: Profile | null = null;
let devices: Device[] = [];
let formOpen = false;
let message = '';

function t(key: string): string {
  return words[lang]?.[key] || words.en[key] || key;
}
function esc(v: string): string {
  return v.replace(
    /[&<>"']/g,
    c =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        c
      ] || c
  );
}

function header(): string {
  return `<header class="header shell"><a class="brand" href="#" data-action="landing"><span class="logo">PB</span><span>PhoneBridge</span></a><div class="header-actions"><select id="language" class="select" aria-label="Language"><option value="ru" ${lang === 'ru' ? 'selected' : ''}>RU</option><option value="en" ${lang === 'en' ? 'selected' : ''}>EN</option><option value="lv" ${lang === 'lv' ? 'selected' : ''}>LV</option><option value="et" ${lang === 'et' ? 'selected' : ''}>ET</option><option value="lt" ${lang === 'lt' ? 'selected' : ''}>LT</option><option value="uk" ${lang === 'uk' ? 'selected' : ''}>UA</option></select>${user ? `<span class="user-email">${esc(user.email || '')}</span><button class="btn ghost" data-action="signout">${t('signOut')}</button>` : `<button class="btn ghost" data-action="signin">${t('signIn')}</button>`}</div></header>`;
}

function landing(): string {
  return `${header()}<main><section class="hero shell"><div><div class="eyebrow">REAL ANDROID · REAL SIM · REMOTE ACCESS</div><h1>${t('heroTitle')}</h1><p>${t('heroText')}</p><div class="hero-actions"><button class="btn primary" data-action="renter-start">${t('rent')}</button><button class="btn secondary" data-action="host-start">${t('host')}</button></div><div class="metrics"><span><b>6</b><small>languages</small></span><span><b>$1</b><small>/ h</small></span><span><b>$10</b><small>/ 24 h</small></span><span><b>50%</b><small>host share</small></span></div></div><div class="visual"><div class="phone"><div class="phone-ui"><span class="pill">● ONLINE</span><h3>Samsung A54</h3><small>Android 14 · 5G · Latvia</small><div class="phone-price">$1.00</div></div></div><div class="float one"><b>Remote session</b><small>00:42:16</small></div><div class="float two"><b>Host earned</b><small>$0.35</small></div></div></section><section class="section shell"><div class="section-head"><div><div class="eyebrow">DEVICES</div><h2>${t('choose')}</h2></div></div><div class="cards">${card('🇱🇻 Latvia', 'Samsung A54', 'Android 14 · 5G · Tele2')}${card('🇪🇪 Estonia', 'Xiaomi 13 Lite', 'Android 14 · 5G · Elisa')}${card('🇱🇹 Lithuania', 'Pixel 7a', 'Android 15 · 5G · Telia')}</div><div class="banner"><div><b>$1 / hour · $10 / 24h</b><p>${t('billing')}</p></div><div class="banner-rates"><span><b>$0.50</b><small>host / h</small></span></div></div></section><section class="section shell"><div class="notice">${t('legal')}</div></section></main><footer class="footer shell"><div class="brand"><span class="logo">PB</span><span>PhoneBridge</span></div><span>Stage 3 · managed backend</span></footer>`;
}
function card(country: string, model: string, meta: string): string {
  return `<article class="card"><div class="card-top"><span>${country}</span><span class="online">● ${t('available')}</span></div><div class="device-art">${model}</div><h3>${model}</h3><p>${meta}</p><div class="price-row"><b>$1.00</b><button class="btn primary small" data-action="renter-start">${t('rent')}</button></div></article>`;
}
function chooseRole(): string {
  return `${header()}<main class="dashboard shell"><div class="eyebrow">PhoneBridge</div><h1>${t('needRole')}</h1><p style="color:var(--muted)">${t('roleText')}</p><div class="role-grid" style="margin-top:24px"><button class="role" data-action="choose-renter"><b>${t('renter')}</b><small>${t('renterText')}</small></button><button class="role" data-action="choose-host"><b>${t('owner')}</b><small>${t('ownerText')}</small></button></div><div class="error">${message ? esc(message) : ''}</div></main>`;
}
function dash(): string {
  if (!profile) return chooseRole();
  const host = profile.role === 'host';
  return `${header()}<main class="dashboard shell"><div class="dash-head"><div><div class="eyebrow">${host ? 'HOST' : 'RENTER'}</div><h1>${t(host ? 'hostTitle' : 'renterTitle')}</h1><p>${host ? '$0.50 / paid hour' : '$1 / hour · $10 / 24h'}</p></div>${host ? `<button class="btn primary" data-action="toggle-form">${t('add')}</button>` : ''}</div><div class="stats"><div class="stat"><small>${t(host ? 'earnings' : 'balance')}</small><strong>$0.00</strong></div><div class="stat"><small>${t(host ? 'phones' : 'sessions')}</small><strong>${host ? devices.length : 0}</strong></div><div class="stat"><small>${t('hours')}</small><strong>0.0</strong></div></div>${host ? hostBody() : renterBody()}<section class="panel" style="margin-top:16px"><h2>${t('ref')}</h2><div class="refbox"><div class="refcode">${esc(profile.referralCode)}</div><button class="btn secondary small" data-action="copy-ref">${t('copy')}</button></div></section></main>`;
}
function renterBody(): string {
  return `<div class="grid"><section class="panel"><h2>Rentals</h2><div class="empty"><b>0</b><span>Remote sessions arrive in Stage 5.</span></div></section><aside class="panel"><h2>Plan</h2><div class="row"><span>1 hour</span><b>$1</b></div><div class="row"><span>24 hours</span><b>$10</b></div></aside></div>`;
}
function hostBody(): string {
  return `${formOpen ? phoneForm() : ''}<div class="grid"><section class="panel"><h2>${t('myPhones')}</h2>${deviceList()}</section><aside class="panel"><h2>Host</h2><div class="row"><span>Rate</span><b>$0.50 / h</b></div><div class="row"><span>Status</span><b>Stage 3</b></div></aside></div>`;
}
function phoneForm(): string {
  return `<section class="panel" style="margin-bottom:16px"><h2>${t('add')}</h2><form id="phone-form" class="form-grid"><div class="field"><label>${t('model')}</label><input class="input" name="model" required placeholder="Samsung Galaxy A54"></div><div class="field"><label>${t('country')}</label><input class="input" name="country" required placeholder="Latvia"></div><div class="field"><label>${t('android')}</label><input class="input" name="androidVersion" required placeholder="Android 14"></div><div class="field"><label>${t('carrier')}</label><input class="input" name="carrier" placeholder="Tele2"></div><div class="field"><label>${t('network')}</label><select class="select" name="network"><option>5G</option><option>LTE</option><option>Wi-Fi</option></select></div><div class="field"><label>&nbsp;</label><button class="btn primary" type="submit">${t('save')}</button></div></form><div class="error ${message === t('saved') ? 'success' : ''}">${message ? esc(message) : ''}</div></section>`;
}
function deviceList(): string {
  if (!devices.length)
    return `<div class="empty"><b>${t('noPhones')}</b><span>${t('add')}</span></div>`;
  return devices
    .map(
      d =>
        `<div class="device-item"><div><b>${esc(d.model)}</b><small>${esc(d.country)} · ${esc(d.androidVersion)}${d.carrier ? ' · ' + esc(d.carrier) : ''}</small></div><span class="status">${t('pending')}</span></div>`
    )
    .join('');
}
function render(): void {
  root.innerHTML = user ? dash() : landing();
  bind();
}
function bind(): void {
  document
    .querySelector<HTMLSelectElement>('#language')
    ?.addEventListener('change', e => {
      lang = (e.target as HTMLSelectElement).value;
      localStorage.setItem('pb_language', lang);
      render();
    });
  document.querySelectorAll<HTMLElement>('[data-action]').forEach(el =>
    el.addEventListener('click', async () => {
      const a = el.dataset.action;
      if (a === 'landing') {
        if (user) {
          profile = null;
          user = null;
          await auth.signOut();
        }
        render();
      }
      if (a === 'signin' || a === 'renter-start' || a === 'host-start')
        await start(
          a === 'host-start' ? 'host' : a === 'renter-start' ? 'renter' : null
        );
      if (a === 'signout') {
        await auth.signOut();
        user = null;
        profile = null;
        devices = [];
        render();
      }
      if (a === 'choose-renter') await saveRole('renter');
      if (a === 'choose-host') await saveRole('host');
      if (a === 'toggle-form') {
        formOpen = !formOpen;
        message = '';
        render();
      }
      if (a === 'copy-ref' && profile) {
        await navigator.clipboard.writeText(profile.referralCode);
        el.textContent = t('copied');
      }
    })
  );
  document
    .querySelector<HTMLFormElement>('#phone-form')
    ?.addEventListener('submit', submitPhone);
}
async function start(preferred: Role | null): Promise<void> {
  try {
    if (!auth.isSignedIn())
      await auth.signIn({ scope: 'openid email profile offline_access' });
    user = await auth.getUser();
    await loadProfile();
    if (!profile && preferred) await saveRole(preferred);
    else render();
  } catch (e) {
    console.error(e);
    message = t('error');
    render();
  }
}
async function loadProfile(): Promise<void> {
  try {
    const r = await api.get('/api/profile');
    profile = r.data.profile || null;
    if (profile?.role === 'host') await loadDevices();
  } catch (e) {
    console.error(e);
    profile = null;
  }
}
async function saveRole(role: Role): Promise<void> {
  try {
    const r = await api.post('/api/profile', { role });
    profile = r.data.profile;
    if (role === 'host') await loadDevices();
    message = '';
    render();
  } catch (e) {
    console.error(e);
    message = t('error');
    render();
  }
}
async function loadDevices(): Promise<void> {
  const r = await api.get('/api/devices');
  devices = r.data.devices || [];
}
async function submitPhone(e: Event): Promise<void> {
  e.preventDefault();
  const f = e.currentTarget as HTMLFormElement;
  const d = new FormData(f);
  const payload = {
    model: String(d.get('model') || '').trim(),
    country: String(d.get('country') || '').trim(),
    androidVersion: String(d.get('androidVersion') || '').trim(),
    carrier: String(d.get('carrier') || '').trim(),
    network: String(d.get('network') || '').trim(),
  };
  try {
    await api.post('/api/devices', payload);
    await loadDevices();
    message = t('saved');
    formOpen = true;
    render();
  } catch (err) {
    console.error(err);
    message = t('error');
    render();
  }
}
async function boot(): Promise<void> {
  user = await auth.getUser();
  if (user) await loadProfile();
  render();
}
void boot();
