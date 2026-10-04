import './styles.css';
import { api, auth } from '@appdeploy/client';

type Role = 'renter' | 'host';
type View = 'home' | 'dashboard' | 'catalog';

type Profile = {
  role: Role;
  referralCode: string;
  email?: string;
};

type Device = {
  id: string;
  model: string;
  country: string;
  androidVersion: string;
  carrier: string;
  network: string;
  status: string;
  connectionStatus: 'pending' | 'online' | 'offline';
  lastSeenAt?: string;
  pairedAt?: string;
};

type CatalogDevice = {
  id: string;
  ownerDeviceId: string;
  model: string;
  country: string;
  androidVersion: string;
  carrier: string;
  network: string;
  hourlyRate: number;
  connectionStatus: 'online' | 'offline';
  lastSeenAt?: string | null;
  available: boolean;
};

type PairingInfo = {
  pairingId: string;
  code: string;
  pairingString: string;
  expiresAt: string;
};

type PhoneDraft = {
  model: string;
  country: string;
  androidVersion: string;
  carrier: string;
  network: string;
};

const words: Record<string, Record<string, string>> = {
  ru: {
    signIn: 'Войти',
    signOut: 'Выйти',
    dashboard: 'Кабинет',
    catalog: 'Каталог',
    heroTitle: 'Арендуй настоящий телефон за $1 в час.',
    heroText:
      'Для тестирования приложений и QA на реальных устройствах. Или подключи свой Android и получай $0.50 за каждый оплаченный час.',
    rent: 'Арендовать телефон',
    host: 'Сдать свой телефон',
    available: 'Свободен',
    choose: 'Реальные телефоны в каталоге',
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
    noCatalog: 'В каталоге пока нет подключённых телефонов',
    noCatalogText:
      'Телефон появится здесь автоматически после подключения Android Agent и первого heartbeat.',
    pending: 'Ожидает подключения',
    online: 'Онлайн',
    offline: 'Офлайн',
    connect: 'Подключить',
    ref: 'Реферальный код',
    copy: 'Копировать',
    copied: 'Скопировано',
    saved: 'Телефон сохранён',
    error: 'Ошибка. Попробуй ещё раз.',
    legal:
      'Только законное использование для тестирования, QA и совместимых задач.',
    pairTitle: 'Код привязки телефона',
    pairHelp:
      'Открой PhoneBridge Agent на Android и вставь этот код. Код действует 10 минут и используется один раз.',
    copyPair: 'Копировать код',
    downloadAgent: 'Скачать Android Agent',
    lastSeen: 'Последний heartbeat',
    never: 'ещё не было',
    stage: 'Этап 4: реальное подключение Android',
    catalogTitle: 'Каталог телефонов',
    catalogText:
      'Здесь показываются реальные устройства владельцев. Онлайн-телефоны будут доступны для аренды после подключения сессий.',
    rentSoon: 'Бронирование и удалённая сессия подключаются на этапе 5.',
    viewCatalog: 'Смотреть каталог',
  },
  en: {
    signIn: 'Sign in',
    signOut: 'Sign out',
    dashboard: 'Dashboard',
    catalog: 'Catalog',
    heroTitle: 'Rent a real phone for $1 an hour.',
    heroText:
      'For app testing and QA on real devices. Or connect your Android and earn $0.50 for every paid rental hour.',
    rent: 'Rent a phone',
    host: 'List my phone',
    available: 'Available',
    choose: 'Real phones in the catalog',
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
    noCatalog: 'No connected phones are listed yet',
    noCatalogText:
      'A phone appears here automatically after Android Agent connects and sends its first heartbeat.',
    pending: 'Pending connection',
    online: 'Online',
    offline: 'Offline',
    connect: 'Connect',
    ref: 'Referral code',
    copy: 'Copy',
    copied: 'Copied',
    saved: 'Phone saved',
    error: 'Something went wrong. Try again.',
    legal: 'Lawful use only for testing, QA and compatible tasks.',
    pairTitle: 'Phone pairing code',
    pairHelp:
      'Open PhoneBridge Agent on Android and paste this code. It expires in 10 minutes and works once.',
    copyPair: 'Copy pairing code',
    downloadAgent: 'Download Android Agent',
    lastSeen: 'Last heartbeat',
    never: 'never',
    stage: 'Stage 4: real Android connection',
    catalogTitle: 'Phone catalog',
    catalogText:
      'These are real host devices. Online phones will become rentable when remote sessions are enabled.',
    rentSoon: 'Booking and remote sessions are being connected in Stage 5.',
    viewCatalog: 'View catalog',
  },
  lv: {
    signIn: 'Ieiet',
    signOut: 'Iziet',
    dashboard: 'Kabinets',
    catalog: 'Katalogs',
    heroTitle: 'Nomā īstu tālruni par $1 stundā.',
    heroText:
      'Lietotņu testēšanai un QA reālās ierīcēs. Vai pieslēdz savu Android un saņem $0.50 par katru apmaksāto stundu.',
    rent: 'Nomāt tālruni',
    host: 'Iznomāt savu tālruni',
    available: 'Pieejams',
    choose: 'Reāli tālruņi katalogā',
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
    noCatalog: 'Katalogā vēl nav pieslēgtu tālruņu',
    noCatalogText: 'Tālrunis parādīsies pēc Agent savienojuma un heartbeat.',
    pending: 'Gaida pieslēgumu',
    online: 'Tiešsaistē',
    offline: 'Bezsaistē',
    connect: 'Pieslēgt',
    ref: 'Ieteikuma kods',
    copy: 'Kopēt',
    copied: 'Nokopēts',
    saved: 'Tālrunis saglabāts',
    error: 'Kļūda. Mēģini vēlreiz.',
    legal: 'Tikai likumīgai testēšanai un QA.',
    pairTitle: 'Tālruņa savienošanas kods',
    pairHelp:
      'Atver PhoneBridge Agent Android ierīcē un ievadi šo kodu. Tas darbojas 10 minūtes un vienu reizi.',
    copyPair: 'Kopēt kodu',
    downloadAgent: 'Lejupielādēt Android Agent',
    lastSeen: 'Pēdējais heartbeat',
    never: 'nav bijis',
    stage: '4. posms: reāls Android savienojums',
    catalogTitle: 'Tālruņu katalogs',
    catalogText: 'Šeit redzamas reālas īpašnieku ierīces.',
    rentSoon: 'Rezervēšana un attālinātās sesijas būs 5. posmā.',
    viewCatalog: 'Skatīt katalogu',
  },
  et: {
    signIn: 'Logi sisse',
    signOut: 'Logi välja',
    dashboard: 'Töölaud',
    catalog: 'Kataloog',
    heroTitle: 'Rendi päris telefon hinnaga $1 tunnis.',
    heroText:
      'Rakenduste testimiseks ja QA-ks päris seadmetel. Või ühenda oma Android ja teeni $0.50 iga tasulise tunni eest.',
    rent: 'Rendi telefon',
    host: 'Anna telefon rendile',
    available: 'Vaba',
    choose: 'Päris telefonid kataloogis',
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
    noCatalog: 'Kataloogis pole veel ühendatud telefone',
    noCatalogText: 'Telefon ilmub pärast Agenti ühendamist ja heartbeat-i.',
    pending: 'Ootab ühendust',
    online: 'Online',
    offline: 'Võrguta',
    connect: 'Ühenda',
    ref: 'Soovituskood',
    copy: 'Kopeeri',
    copied: 'Kopeeritud',
    saved: 'Telefon salvestatud',
    error: 'Viga. Proovi uuesti.',
    legal: 'Ainult seaduslikuks testimiseks ja QA-ks.',
    pairTitle: 'Telefoni sidumiskood',
    pairHelp:
      'Ava Androidis PhoneBridge Agent ja sisesta see kood. Kood aegub 10 minutiga ja töötab ühe korra.',
    copyPair: 'Kopeeri kood',
    downloadAgent: 'Laadi Android Agent',
    lastSeen: 'Viimane heartbeat',
    never: 'pole olnud',
    stage: '4. etapp: päris Androidi ühendus',
    catalogTitle: 'Telefonide kataloog',
    catalogText: 'Siin kuvatakse päris omanike seadmed.',
    rentSoon: 'Broneerimine ja kaugseansid tulevad 5. etapis.',
    viewCatalog: 'Vaata kataloogi',
  },
  lt: {
    signIn: 'Prisijungti',
    signOut: 'Atsijungti',
    dashboard: 'Paskyra',
    catalog: 'Katalogas',
    heroTitle: 'Nuomok tikrą telefoną už $1 per valandą.',
    heroText:
      'Programėlių testavimui ir QA realiuose įrenginiuose. Arba prijunk savo Android ir gauk $0.50 už kiekvieną apmokėtą valandą.',
    rent: 'Nuomoti telefoną',
    host: 'Išnuomoti savo telefoną',
    available: 'Laisvas',
    choose: 'Tikri telefonai kataloge',
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
    noCatalog: 'Kataloge dar nėra prijungtų telefonų',
    noCatalogText: 'Telefonas pasirodys po Agent prisijungimo ir heartbeat.',
    pending: 'Laukia prijungimo',
    online: 'Prisijungęs',
    offline: 'Neprisijungęs',
    connect: 'Prijungti',
    ref: 'Rekomendacijos kodas',
    copy: 'Kopijuoti',
    copied: 'Nukopijuota',
    saved: 'Telefonas išsaugotas',
    error: 'Klaida. Bandyk dar kartą.',
    legal: 'Tik teisėtam testavimui ir QA.',
    pairTitle: 'Telefono susiejimo kodas',
    pairHelp:
      'Atidaryk PhoneBridge Agent Android telefone ir įklijuok šį kodą. Jis galioja 10 minučių ir vieną kartą.',
    copyPair: 'Kopijuoti kodą',
    downloadAgent: 'Atsisiųsti Android Agent',
    lastSeen: 'Paskutinis heartbeat',
    never: 'dar nebuvo',
    stage: '4 etapas: tikras Android ryšys',
    catalogTitle: 'Telefonų katalogas',
    catalogText: 'Čia rodomi tikri savininkų įrenginiai.',
    rentSoon: 'Rezervavimas ir nuotolinės sesijos bus 5 etape.',
    viewCatalog: 'Žiūrėti katalogą',
  },
  uk: {
    signIn: 'Увійти',
    signOut: 'Вийти',
    dashboard: 'Кабінет',
    catalog: 'Каталог',
    heroTitle: 'Орендуй справжній телефон за $1 на годину.',
    heroText:
      'Для тестування застосунків і QA на реальних пристроях. Або підключи свій Android і отримуй $0.50 за кожну оплачену годину.',
    rent: 'Орендувати телефон',
    host: 'Здати свій телефон',
    available: 'Вільний',
    choose: 'Реальні телефони в каталозі',
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
    noCatalog: 'У каталозі ще немає підключених телефонів',
    noCatalogText: 'Телефон з’явиться після підключення Agent і heartbeat.',
    pending: 'Очікує підключення',
    online: 'Онлайн',
    offline: 'Офлайн',
    connect: 'Підключити',
    ref: 'Реферальний код',
    copy: 'Копіювати',
    copied: 'Скопійовано',
    saved: 'Телефон збережено',
    error: 'Помилка. Спробуй ще раз.',
    legal: 'Лише законне використання для тестування та QA.',
    pairTitle: 'Код прив’язки телефона',
    pairHelp:
      'Відкрий PhoneBridge Agent на Android і встав цей код. Він діє 10 хвилин і лише один раз.',
    copyPair: 'Копіювати код',
    downloadAgent: 'Завантажити Android Agent',
    lastSeen: 'Останній heartbeat',
    never: 'ще не було',
    stage: 'Етап 4: реальне підключення Android',
    catalogTitle: 'Каталог телефонів',
    catalogText: 'Тут показуються реальні пристрої власників.',
    rentSoon: 'Бронювання та віддалені сесії будуть на етапі 5.',
    viewCatalog: 'Дивитися каталог',
  },
};

const root = document.querySelector<HTMLDivElement>('#app')!;

let lang = localStorage.getItem('pb_language') || 'ru';
let user: Awaited<ReturnType<typeof auth.getUser>> = null;
let profile: Profile | null = null;
let devices: Device[] = [];
let catalogDevices: CatalogDevice[] = [];
let currentView: View = 'home';
let formOpen = false;
let message = '';
let catalogMessage = '';
let refreshTimer: number | null = null;

let phoneDraft: PhoneDraft = {
  model: '',
  country: '',
  androidVersion: '',
  carrier: '',
  network: '5G',
};

const pairings = new Map<string, PairingInfo>();

function t(key: string): string {
  return words[lang]?.[key] || words.en[key] || key;
}

function esc(value: string): string {
  return value.replace(
    /[&<>"']/g,
    char =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      })[char] || char
  );
}

function header(): string {
  return `
    <header class="header shell">
      <a class="brand" href="#" data-action="home">
        <span class="logo">PB</span>
        <span>PhoneBridge</span>
      </a>

      <div class="header-actions">
        <select id="language" class="select" aria-label="Language">
          <option value="ru" ${lang === 'ru' ? 'selected' : ''}>RU</option>
          <option value="en" ${lang === 'en' ? 'selected' : ''}>EN</option>
          <option value="lv" ${lang === 'lv' ? 'selected' : ''}>LV</option>
          <option value="et" ${lang === 'et' ? 'selected' : ''}>ET</option>
          <option value="lt" ${lang === 'lt' ? 'selected' : ''}>LT</option>
          <option value="uk" ${lang === 'uk' ? 'selected' : ''}>UA</option>
        </select>

        <button class="btn ghost small" data-action="catalog">
          ${t('catalog')}
        </button>

        ${user ? `
          <button class="btn ghost small" data-action="dashboard">
            ${t('dashboard')}
          </button>
          <span class="user-email">${esc(user.email || '')}</span>
          <button class="btn ghost small" data-action="signout">
            ${t('signOut')}
          </button>
        ` : `
          <button class="btn ghost small" data-action="signin">
            ${t('signIn')}
          </button>
        `}
      </div>
    </header>
  `;
}

function landing(): string {
  return `
    ${header()}
    <main>
      <section class="hero shell">
        <div>
          <div class="eyebrow">REAL ANDROID · REAL SIM · REMOTE ACCESS</div>
          <h1>${t('heroTitle')}</h1>
          <p>${t('heroText')}</p>

          <div class="hero-actions">
            <button class="btn primary" data-action="catalog">
              ${t('rent')}
            </button>
            <button class="btn secondary" data-action="host-start">
              ${t('host')}
            </button>
          </div>

          <div class="metrics">
            <span><b>6</b><small>languages</small></span>
            <span><b>$1</b><small>/ h</small></span>
            <span><b>$10</b><small>/ 24 h</small></span>
            <span><b>50%</b><small>host share</small></span>
          </div>
        </div>

        <div class="visual">
          <div class="phone">
            <div class="phone-ui">
              <span class="pill">● ONLINE</span>
              <h3>PhoneBridge</h3>
              <small>Real Android · Remote testing</small>
              <div class="phone-price">$1.00</div>
            </div>
          </div>
          <div class="float one"><b>Remote device</b><small>Android</small></div>
          <div class="float two"><b>Host share</b><small>$0.50 / h</small></div>
        </div>
      </section>

      <section class="section shell">
        <div class="section-head">
          <div>
            <div class="eyebrow">LIVE CATALOG</div>
            <h2>${t('choose')}</h2>
          </div>
          <button class="btn secondary" data-action="catalog">
            ${t('viewCatalog')}
          </button>
        </div>

        ${catalogCards(true)}
      </section>

      <section class="section shell">
        <div class="notice">${t('legal')}</div>
      </section>
    </main>

    <footer class="footer shell">
      <div class="brand">
        <span class="logo">PB</span>
        <span>PhoneBridge</span>
      </div>
      <span>Stage 4 · shared catalog</span>
    </footer>
  `;
}

function catalogView(): string {
  return `
    ${header()}
    <main class="dashboard shell">
      <div class="eyebrow">PHONEBRIDGE MARKETPLACE</div>
      <h1>${t('catalogTitle')}</h1>
      <p style="color:var(--muted);max-width:760px">
        ${t('catalogText')}
      </p>

      ${catalogMessage ? `
        <div class="notice" style="margin-top:18px">
          ${esc(catalogMessage)}
        </div>
      ` : ''}

      <div style="margin-top:28px">
        ${catalogCards(false)}
      </div>
    </main>
  `;
}

function catalogCards(preview: boolean): string {
  const list = preview ? catalogDevices.slice(0, 3) : catalogDevices;

  if (!list.length) {
    return `
      <div class="empty">
        <b>${t('noCatalog')}</b>
        <span>${t('noCatalogText')}</span>
      </div>
    `;
  }

  return `
    <div class="cards">
      ${list.map(catalogCard).join('')}
    </div>
  `;
}

function catalogCard(device: CatalogDevice): string {
  const isOnline = device.connectionStatus === 'online';
  const meta = [
    device.androidVersion,
    device.network,
    device.carrier,
  ].filter(Boolean).join(' · ');

  return `
    <article class="card">
      <div class="card-top">
        <span>${esc(device.country)}</span>
        <span class="${isOnline ? 'online' : ''}">
          ● ${t(device.connectionStatus)}
        </span>
      </div>

      <div class="device-art">${esc(device.model)}</div>
      <h3>${esc(device.model)}</h3>
      <p>${esc(meta)}</p>

      <div class="price-row">
        <b>$${Number(device.hourlyRate || 1).toFixed(2)}</b>
        <button
          class="btn ${isOnline ? 'primary' : 'ghost'} small"
          data-action="rent-device"
          data-device-id="${esc(device.id)}"
          ${isOnline ? '' : 'disabled'}
        >
          ${isOnline ? t('rent') : t('offline')}
        </button>
      </div>
    </article>
  `;
}

function chooseRole(): string {
  return `
    ${header()}
    <main class="dashboard shell">
      <div class="eyebrow">PhoneBridge</div>
      <h1>${t('needRole')}</h1>
      <p style="color:var(--muted)">${t('roleText')}</p>

      <div class="role-grid" style="margin-top:24px">
        <button class="role" data-action="choose-renter">
          <b>${t('renter')}</b>
          <small>${t('renterText')}</small>
        </button>

        <button class="role" data-action="choose-host">
          <b>${t('owner')}</b>
          <small>${t('ownerText')}</small>
        </button>
      </div>

      <div class="error">${message ? esc(message) : ''}</div>
    </main>
  `;
}

function dashboard(): string {
  if (!profile) return chooseRole();

  const isHost = profile.role === 'host';

  return `
    ${header()}
    <main class="dashboard shell">
      <div class="notice">${t('stage')}</div>

      <div class="dash-head">
        <div>
          <div class="eyebrow">${isHost ? 'HOST' : 'RENTER'}</div>
          <h1>${t(isHost ? 'hostTitle' : 'renterTitle')}</h1>
          <p>${isHost ? '$0.50 / paid hour' : '$1 / hour · $10 / 24h'}</p>
        </div>

        ${isHost ? `
          <button class="btn primary" data-action="toggle-form">
            ${t('add')}
          </button>
        ` : `
          <button class="btn primary" data-action="catalog">
            ${t('catalog')}
          </button>
        `}
      </div>

      <div class="stats">
        <div class="stat">
          <small>${t(isHost ? 'earnings' : 'balance')}</small>
          <strong>$0.00</strong>
        </div>
        <div class="stat">
          <small>${t(isHost ? 'phones' : 'sessions')}</small>
          <strong>${isHost ? devices.length : 0}</strong>
        </div>
        <div class="stat">
          <small>${t('hours')}</small>
          <strong>0.0</strong>
        </div>
      </div>

      ${isHost ? hostBody() : renterBody()}

      <section class="panel" style="margin-top:16px">
        <h2>${t('ref')}</h2>
        <div class="refbox">
          <div class="refcode">${esc(profile.referralCode)}</div>
          <button class="btn secondary small" data-action="copy-ref">
            ${t('copy')}
          </button>
        </div>
      </section>
    </main>
  `;
}

function renterBody(): string {
  return `
    <div class="grid">
      <section class="panel">
        <h2>${t('catalog')}</h2>
        <div class="empty">
          <b>${catalogDevices.length}</b>
          <span>${t('choose')}</span>
        </div>
      </section>

      <aside class="panel">
        <h2>Plan</h2>
        <div class="row"><span>1 hour</span><b>$1</b></div>
        <div class="row"><span>24 hours</span><b>$10</b></div>
      </aside>
    </div>
  `;
}

function hostBody(): string {
  return `
    ${formOpen ? phoneForm() : ''}

    <div class="grid">
      <section class="panel">
        <h2>${t('myPhones')}</h2>
        ${deviceList()}
      </section>

      <aside class="panel">
        <h2>Connection</h2>
        <div class="row"><span>Heartbeat</span><b>60 sec</b></div>
        <div class="row"><span>Online window</span><b>120 sec</b></div>
        <div class="row"><span>Catalog</span><b>Auto</b></div>
      </aside>
    </div>
  `;
}

function phoneForm(): string {
  return `
    <section class="panel" style="margin-bottom:16px">
      <h2>${t('add')}</h2>

      <form id="phone-form" class="form-grid">
        <div class="field">
          <label>${t('model')}</label>
          <input
            class="input"
            name="model"
            required
            placeholder="Samsung Galaxy A54"
            value="${esc(phoneDraft.model)}"
          >
        </div>

        <div class="field">
          <label>${t('country')}</label>
          <input
            class="input"
            name="country"
            required
            placeholder="Latvia"
            value="${esc(phoneDraft.country)}"
          >
        </div>

        <div class="field">
          <label>${t('android')}</label>
          <input
            class="input"
            name="androidVersion"
            required
            placeholder="Android 14"
            value="${esc(phoneDraft.androidVersion)}"
          >
        </div>

        <div class="field">
          <label>${t('carrier')}</label>
          <input
            class="input"
            name="carrier"
            placeholder="Tele2"
            value="${esc(phoneDraft.carrier)}"
          >
        </div>

        <div class="field">
          <label>${t('network')}</label>
          <select class="select" name="network">
            <option ${phoneDraft.network === '5G' ? 'selected' : ''}>5G</option>
            <option ${phoneDraft.network === 'LTE' ? 'selected' : ''}>LTE</option>
            <option ${phoneDraft.network === 'Wi-Fi' ? 'selected' : ''}>Wi-Fi</option>
          </select>
        </div>

        <div class="field">
          <label>&nbsp;</label>
          <button class="btn primary" type="submit">${t('save')}</button>
        </div>
      </form>

      <div class="error ${message === t('saved') ? 'success' : ''}">
        ${message ? esc(message) : ''}
      </div>
    </section>
  `;
}

function statusLabel(status: Device['connectionStatus']): string {
  return t(status);
}

function formatLastSeen(value?: string): string {
  if (!value) return t('never');

  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

function deviceList(): string {
  if (!devices.length) {
    return `
      <div class="empty">
        <b>${t('noPhones')}</b>
        <span>${t('add')}</span>
      </div>
    `;
  }

  return devices
    .map(device => {
      const pairing = pairings.get(device.id);

      return `
        <div class="device-wrap">
          <div class="device-item">
            <div>
              <b>${esc(device.model)}</b>
              <small>
                ${esc(device.country)} ·
                ${esc(device.androidVersion)}
                ${device.carrier ? ' · ' + esc(device.carrier) : ''}
              </small>
              <small>
                ${t('lastSeen')}: ${esc(formatLastSeen(device.lastSeenAt))}
              </small>
            </div>

            <div class="device-actions">
              <span class="status ${esc(device.connectionStatus)}">
                ${statusLabel(device.connectionStatus)}
              </span>

              ${device.connectionStatus === 'pending' ? `
                <button
                  class="btn secondary small"
                  data-action="pair-device"
                  data-device-id="${esc(device.id)}"
                >
                  ${t('connect')}
                </button>
              ` : ''}
            </div>
          </div>

          ${pairing ? pairingBox(device.id, pairing) : ''}
        </div>
      `;
    })
    .join('');
}

function pairingBox(deviceId: string, pairing: PairingInfo): string {
  return `
    <div class="pair-box">
      <div>
        <small>${t('pairTitle')}</small>
        <div class="pair-code">${esc(pairing.pairingString)}</div>
        <p>${t('pairHelp')}</p>
      </div>

      <div class="device-actions">
        <a
          class="btn secondary small"
          href="https://github.com/virus53111/Kredos/releases/download/agent-build-5/PhoneBridge-Agent.apk"
          target="_blank"
          rel="noopener"
        >
          ${t('downloadAgent')}
        </a>

        <button
          class="btn primary small"
          data-action="copy-pair"
          data-device-id="${esc(deviceId)}"
        >
          ${t('copyPair')}
        </button>
      </div>
    </div>
  `;
}

function render(): void {
  if (currentView === 'catalog') {
    root.innerHTML = catalogView();
  } else if (currentView === 'home') {
    root.innerHTML = landing();
  } else if (user) {
    root.innerHTML = dashboard();
  } else {
    currentView = 'home';
    root.innerHTML = landing();
  }

  bind();
}

function bind(): void {
  document
    .querySelector<HTMLSelectElement>('#language')
    ?.addEventListener('change', event => {
      lang = (event.target as HTMLSelectElement).value;
      localStorage.setItem('pb_language', lang);
      render();
    });

  document.querySelectorAll<HTMLElement>('[data-action]').forEach(element => {
    element.addEventListener('click', async event => {
      event.preventDefault();
      const action = element.dataset.action;

      if (action === 'home') {
        currentView = 'home';
        catalogMessage = '';
        startRefresh();
        render();
      }

      if (action === 'catalog') {
        await openCatalog();
      }

      if (action === 'dashboard') {
        if (!user) {
          await start(null);
          return;
        }

        currentView = 'dashboard';
        catalogMessage = '';

        if (profile?.role === 'host') {
          await loadDevices();
        }

        startRefresh();
        render();
      }

      if (action === 'signin') {
        await start(null);
      }

      if (action === 'host-start') {
        if (user && profile) {
          currentView = 'dashboard';
          if (profile.role === 'host') await loadDevices();
          startRefresh();
          render();
        } else {
          await start('host');
        }
      }

      if (action === 'signout') {
        await auth.signOut();
        user = null;
        profile = null;
        devices = [];
        pairings.clear();
        currentView = 'home';
        stopRefresh();
        await loadCatalog();
        render();
      }

      if (action === 'choose-renter') {
        await saveRole('renter');
        currentView = 'catalog';
        await loadCatalog();
        startRefresh();
        render();
      }

      if (action === 'choose-host') {
        await saveRole('host');
        currentView = 'dashboard';
        await loadDevices();
        startRefresh();
        render();
      }

      if (action === 'toggle-form') {
        formOpen = !formOpen;
        message = '';
        render();
      }

      if (action === 'copy-ref' && profile) {
        await navigator.clipboard.writeText(profile.referralCode);
        element.textContent = t('copied');
      }

      if (action === 'pair-device' && element.dataset.deviceId) {
        await createPairing(element.dataset.deviceId);
      }

      if (action === 'copy-pair' && element.dataset.deviceId) {
        const pairing = pairings.get(element.dataset.deviceId);

        if (pairing) {
          await navigator.clipboard.writeText(pairing.pairingString);
          element.textContent = t('copied');
        }
      }

      if (action === 'rent-device') {
        if (!user) {
          await start('renter');
          currentView = 'catalog';
          await loadCatalog();
        }

        catalogMessage = t('rentSoon');
        currentView = 'catalog';
        startRefresh();
        render();
      }
    });
  });

  const phoneFormElement =
    document.querySelector<HTMLFormElement>('#phone-form');

  phoneFormElement?.addEventListener('submit', submitPhone);

  phoneFormElement?.addEventListener('input', event => {
    const field = event.target as HTMLInputElement | HTMLSelectElement;
    const key = field.name as keyof PhoneDraft;

    if (key && key in phoneDraft) {
      phoneDraft[key] = field.value;
    }
  });

  phoneFormElement?.addEventListener('change', event => {
    const field = event.target as HTMLInputElement | HTMLSelectElement;
    const key = field.name as keyof PhoneDraft;

    if (key && key in phoneDraft) {
      phoneDraft[key] = field.value;
    }
  });
}

async function start(preferred: Role | null): Promise<void> {
  try {
    if (!auth.isSignedIn()) {
      await auth.signIn({
        scope: 'openid email profile offline_access',
      });
    }

    user = await auth.getUser();
    await loadProfile();

    if (!profile && preferred) {
      await saveRole(preferred);
    }

    if (preferred === 'renter') {
      currentView = 'catalog';
      await loadCatalog();
    } else {
      currentView = 'dashboard';
      if (profile?.role === 'host') {
        await loadDevices();
      }
    }

    startRefresh();
    render();
  } catch (error) {
    console.error(error);
    message = t('error');
    render();
  }
}

async function loadProfile(): Promise<void> {
  try {
    const response = await api.get('/api/profile');
    profile = response.data.profile || null;

    if (profile?.role === 'host') {
      await loadDevices();
    }
  } catch (error) {
    console.error(error);
    profile = null;
  }
}

async function saveRole(role: Role): Promise<void> {
  try {
    const response = await api.post('/api/profile', { role });
    profile = response.data.profile;
    message = '';
  } catch (error) {
    console.error(error);
    message = t('error');
  }
}

async function loadDevices(): Promise<void> {
  const response = await api.get('/api/devices');
  devices = response.data.devices || [];

  // Host device sync also creates/repairs the shared catalog entry.
  await loadCatalog();
}

async function loadCatalog(): Promise<void> {
  try {
    const response = await api.get('/api/catalog');
    catalogDevices = response.data.devices || [];
  } catch (error) {
    console.error(error);
    catalogDevices = [];
  }
}

async function openCatalog(): Promise<void> {
  currentView = 'catalog';
  catalogMessage = '';
  await loadCatalog();
  startRefresh();
  render();
}

function startRefresh(): void {
  stopRefresh();

  refreshTimer = window.setInterval(async () => {
    try {
      if (currentView === 'dashboard' && user && profile?.role === 'host') {
        await loadDevices();
      } else if (currentView === 'catalog' || currentView === 'home') {
        await loadCatalog();
      }

      render();
    } catch (error) {
      console.error(error);
    }
  }, 30_000);
}

function stopRefresh(): void {
  if (refreshTimer !== null) {
    window.clearInterval(refreshTimer);
    refreshTimer = null;
  }
}

async function createPairing(deviceId: string): Promise<void> {
  try {
    const response = await api.post(
      '/api/devices/' + encodeURIComponent(deviceId) + '/pair',
      {}
    );

    pairings.set(deviceId, response.data.pairing);
    message = '';
    render();
  } catch (error) {
    console.error(error);
    message = t('error');
    render();
  }
}

async function submitPhone(event: Event): Promise<void> {
  event.preventDefault();

  const form = event.currentTarget as HTMLFormElement;
  const data = new FormData(form);

  const payload = {
    model: String(data.get('model') || '').trim(),
    country: String(data.get('country') || '').trim(),
    androidVersion: String(data.get('androidVersion') || '').trim(),
    carrier: String(data.get('carrier') || '').trim(),
    network: String(data.get('network') || '').trim(),
  };

  try {
    await api.post('/api/devices', payload);
    await loadDevices();

    phoneDraft = {
      model: '',
      country: '',
      androidVersion: '',
      carrier: '',
      network: '5G',
    };

    message = t('saved');
    formOpen = true;
    render();
  } catch (error) {
    console.error(error);
    message = t('error');
    render();
  }
}

async function boot(): Promise<void> {
  user = await auth.getUser();

  if (user) {
    await loadProfile();
    currentView = 'dashboard';
  } else {
    currentView = 'home';
  }

  await loadCatalog();
  startRefresh();
  render();
}

void boot();
