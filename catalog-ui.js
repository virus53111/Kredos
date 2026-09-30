Object.assign(translations.ru, {
 catalog:'Каталог DEPO', catalogNote:'Товары из накладных. Сверьте название и код перед заказом. Каталог сохраняется на этом устройстве.',
 searchCatalog:'Поиск по названию или коду', manageCatalog:'Добавить / изменить товар',
 depoUrl:'Точная ссылка на товар DEPO', invalidUrl:'Укажите ссылку https://online.depo.lv/product/…',
 noLink:'Ссылка DEPO ещё не указана', choose:'В заказ', duplicateCode:'Товар с таким кодом уже есть. Откройте его для редактирования.',
 deleteProduct:'Удалить товар из каталога? Текущий заказ сохранится.',
 catalogSaved:'Товар сохранён.', backup:'Скачать каталог', importCatalog:'Загрузить каталог JSON',
 importError:'Не удалось загрузить каталог. Проверьте формат, коды, единицы и ссылки.',
 imported:'Каталог загружен. Совпадающие коды пропущены.', share:'Поделиться PDF',
 copied:'Список скопирован. Можно вставить его в сообщение.', copyFailed:'Не удалось создать или отправить PDF. Используйте печать / PDF.',
 noResults:'Товары не найдены.'
});
Object.assign(translations.lv, {
 catalog:'DEPO katalogs', catalogNote:'Preces no pavadzīmēm. Pirms pasūtīšanas pārbaudiet nosaukumu un kodu. Katalogs glabājas šajā ierīcē.',
 searchCatalog:'Meklēt pēc nosaukuma vai koda', manageCatalog:'Pievienot / rediģēt preci',
 depoUrl:'Precīza DEPO preces saite', invalidUrl:'Norādiet saiti https://online.depo.lv/product/…',
 noLink:'DEPO saite vēl nav norādīta', choose:'Pasūtījumā', duplicateCode:'Prece ar šo kodu jau ir katalogā. Atveriet to rediģēšanai.',
 deleteProduct:'Dzēst preci no kataloga? Pašreizējais pasūtījums saglabāsies.',
 catalogSaved:'Prece saglabāta.', backup:'Lejupielādēt katalogu', importCatalog:'Ielādēt JSON katalogu',
 importError:'Neizdevās ielādēt katalogu. Pārbaudiet formātu, kodus, vienības un saites.',
 imported:'Katalogs ielādēts. Atkārtoti kodi izlaisti.', share:'Kopīgot PDF',
 copied:'Saraksts nokopēts. Ielīmējiet to ziņojumā.', copyFailed:'Neizdevās izveidot vai nosūtīt PDF. Izmantojiet druku / PDF.',
 noResults:'Preces nav atrastas.'
});
Object.assign(translations.uk, {
 catalog:'Каталог DEPO', catalogNote:'Товари з накладних. Звірте назву та код перед замовленням. Каталог зберігається на цьому пристрої.',
 searchCatalog:'Пошук за назвою або кодом', manageCatalog:'Додати / змінити товар',
 depoUrl:'Точне посилання на товар DEPO', invalidUrl:'Вкажіть посилання https://online.depo.lv/product/…',
 noLink:'Посилання DEPO ще не вказано', choose:'У замовлення', duplicateCode:'Товар із таким кодом уже є. Відкрийте його для редагування.',
 deleteProduct:'Видалити товар із каталогу? Поточне замовлення збережеться.',
 catalogSaved:'Товар збережено.', backup:'Завантажити каталог', importCatalog:'Імпортувати каталог JSON',
 importError:'Не вдалося імпортувати каталог. Перевірте формат, коди, одиниці та посилання.',
 imported:'Каталог імпортовано. Повторні коди пропущено.', share:'Поділитися PDF',
 copied:'Список скопійовано. Можна вставити його в повідомлення.', copyFailed:'Не вдалося створити або надіслати PDF. Скористайтеся друком / PDF.',
 noResults:'Товари не знайдено.'
});
const catalogKey = 'kredos_catalog_v1';
const catalogUnits = ['pcs','pack','m','m2','kg','l'];
let products;
try {
 const savedProducts = JSON.parse(localStorage.getItem(catalogKey) || 'null');
 products = Array.isArray(savedProducts) ? Catalog.unique(savedProducts) : Catalog.seed();
} catch { products = Catalog.seed(); }
let productEditId = null;
function saveProducts() { localStorage.setItem(catalogKey, JSON.stringify(products)); }
function catalogStatus(key) { $('catalogStatus').textContent = t(key); }
function resetProductForm() {
 productEditId = null; $('catalogForm').reset(); $('catalogStatus').textContent = '';
}
function editProduct(p) {
 productEditId = p.id;
 $('catalogName').value = p.name; $('catalogCode').value = p.code;
 $('catalogUnit').value = p.unit; $('catalogUrl').value = p.url || '';
 $('catalogEditor').open = true; $('catalogName').focus();
}
function chooseProduct(p) {
 cancelEdit();
 $('itemName').value = p.name; $('itemCode').value = p.code;
 $('itemUnit').value = p.unit; $('itemUrl').value = p.url || '';
 $('itemQty').focus(); $('itemForm').scrollIntoView({behavior:'smooth',block:'center'});
}
function renderCatalog() {
 const q = $('catalogSearch').value.trim().toLocaleLowerCase();
 const shown = products.filter(p => (p.name+' '+p.code).toLocaleLowerCase().includes(q));
 $('catalogCount').textContent = products.length;
 $('catalogList').replaceChildren();
 if (!shown.length) {
   const empty = document.createElement('p'); empty.textContent = t('noResults'); $('catalogList').appendChild(empty);
 }
 for (const p of shown) {
   const row = document.createElement('article'); row.className = 'catalog-product';
   const info = document.createElement('div');
   const name = document.createElement('strong'); name.textContent = p.name;
   const code = document.createElement('small'); code.textContent = p.code+' · '+unitLabel(p.unit);
   info.append(name,code);
   const url = Catalog.url(p.url);
   if (url) {
     const link = document.createElement('a'); link.href = url; link.target='_blank'; link.rel='noopener'; link.textContent='DEPO ↗'; info.appendChild(link);
   } else {
     const note = document.createElement('small'); note.className='missing-link'; note.textContent=t('noLink'); info.appendChild(note);
   }
   const actions = document.createElement('div'); actions.className='catalog-actions';
   for (const [label,cls,handler] of [
     ['choose','primary',()=>chooseProduct(p)],
     ['edit','secondary',()=>editProduct(p)],
     ['remove','text-danger',()=> {
       if (!confirm(t('deleteProduct'))) return;
       products = products.filter(x=>x.id!==p.id);
       if (productEditId===p.id) resetProductForm();
       saveProducts(); renderCatalog();
     }]
   ]) {
     const b = document.createElement('button'); b.type='button'; b.className=cls;
     b.textContent=t(label); b.onclick=handler; actions.appendChild(b);
   }
   row.append(info,actions); $('catalogList').appendChild(row);
 }
}
$('catalogForm').onsubmit = event => {
 event.preventDefault();
 const code = Catalog.code($('catalogCode').value), name=$('catalogName').value.trim();
 const url = Catalog.url($('catalogUrl').value), unit=$('catalogUnit').value;
 if (url===null) return catalogStatus('invalidUrl');
 if (!code || !name) return;
 if (products.some(x=>x.id!==productEditId && x.code===code)) return catalogStatus('duplicateCode');
 const product = {id:productEditId || crypto.randomUUID(),code,name,unit,url};
 const index=products.findIndex(x=>x.id===productEditId);
 if(index>=0) products[index]=product; else products.push(product);
 saveProducts(); resetProductForm(); renderCatalog(); catalogStatus('catalogSaved');
};
$('catalogCancel').onclick = resetProductForm;
$('catalogSearch').oninput = renderCatalog;
$('catalogExport').onclick = () => {
 const url = URL.createObjectURL(new Blob([JSON.stringify({version:1,products},null,2)],{type:'application/json'}));
 const a=document.createElement('a'); a.href=url; a.download='kredos-catalog.json'; a.click();
 setTimeout(()=>URL.revokeObjectURL(url),1000);
};
$('catalogImport').onchange = async event => {
 const file=event.target.files[0]; if(!file)return;
 try {
   if(file.size>2*1024*1024)throw new Error('size');
   const data=JSON.parse(await file.text()); const incoming=Array.isArray(data)?data:data.products;
   if(!Array.isArray(incoming) || incoming.length>5000)throw new Error('format');
   const checked=incoming.map(p=>{
     if(!p || typeof p.name!=='string' || !p.name.trim() || typeof p.code!=='string' ||
        !Catalog.code(p.code) || !catalogUnits.includes(p.unit) || Catalog.url(p.url)===null)throw new Error('product');
     return {id:crypto.randomUUID(),name:p.name.trim(),code:Catalog.code(p.code),unit:p.unit,url:Catalog.url(p.url)};
   });
   products=Catalog.unique([...products,...checked]); saveProducts(); renderCatalog(); catalogStatus('imported');
 } catch { catalogStatus('importError'); }
 event.target.value='';
};
$('shareBtn').onclick = async () => {
 if(!items.length)return status(t('needItems'));
 const button=$('shareBtn');button.disabled=true;
 try {
   const blob=await createOrderPdf(clone(draft()),{locale:lang==='lv'?'lv-LV':lang==='uk'?'uk-UA':'ru-RU',order:t('order'),address:t('address'),material:t('material'),code:t('code'),quantity:t('quantity'),unit:unitLabel});
   const file=new File([blob],'KREDOS-materials.pdf',{type:'application/pdf'});
   if(navigator.share && navigator.canShare && navigator.canShare({files:[file]})) {
     await navigator.share({title:'KREDOS',files:[file]});
   } else {
     const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=file.name;a.click();
     setTimeout(()=>URL.revokeObjectURL(url),1000);
   }
 } catch(e) { if(e.name!=='AbortError')status(t('copyFailed')); }
 finally {button.disabled=false;}
};
const originalApplyLanguage=applyLanguage;
applyLanguage=function(){originalApplyLanguage();renderCatalog();};
saveProducts(); applyLanguage();
