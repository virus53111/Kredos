const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const Catalog=require('../catalog.js');
test('invoice seed preserves 36 unique product codes and excludes services',()=>{
 const products=Catalog.seed();assert.equal(products.length,36);
 assert.equal(new Set(products.map(x=>x.code)).size,36);
 for(const code of ['1007','1010','1810'])assert.ok(!products.some(x=>x.code===code));
 assert.equal(products.find(x=>x.code==='5902686957591').unit,'m2');
});
test('deduplication keeps existing edited products; links must be DEPO product cards',()=>{
 assert.equal(Catalog.unique([{code:' 123 ',name:'edited'},{code:'123',name:'invoice'}])[0].name,'edited');
 assert.equal(Catalog.url('https://online.depo.lv/product/123?utm_source=test'),'https://online.depo.lv/product/123');
 for(const url of ['javascript:alert(1)','https://online.depo.lv.evil.com/product/1','http://online.depo.lv/product/1','https://online.depo.lv/search?q=123','https://user@online.depo.lv/product/1'])assert.equal(Catalog.url(url),null);
});
// Exercise the actual browser scripts against a small DOM adapter.
class Element{
 constructor(){this.value='';this.children=[];this.dataset={};this.hidden=false;this.className='';}
 append(...nodes){this.children.push(...nodes)} appendChild(x){this.append(x);return x}
 replaceChildren(...nodes){this.children=nodes} focus(){} scrollIntoView(){} setAttribute(key,value){this[key]=value} reportValidity(){return Number(this.value)>0}
 set innerHTML(value){this.children=[];this.selectors={};if(value.includes('item-name')){const first=new Element();this.appendChild(first);for(const key of ['.item-name','.item-code','.item-qty','.item-unit','.edit','.delete'])this.selectors[key]=new Element();}}
 querySelector(s){return this.selectors[s]}
 get firstElementChild(){return this.children[0]}
 reset(){for(const id of this.resetIds||[])els[id].value='';if(this===els.itemForm){els.itemQty.value='1';els.itemUnit.value='pcs';}if(this===els.catalogForm)els.catalogUnit.value='pcs';}
}
const els={};for(const id of fs.readFileSync(require.resolve('../index.html'),'utf8').matchAll(/id="([^"]+)"/g))els[id[1]]=new Element();
els.itemQty.value='1';els.itemUnit.value='pcs';els.catalogUnit.value='pcs';
els.itemForm.resetIds=['itemName','itemCode','itemUrl'];els.catalogForm.resetIds=['catalogName','catalogCode','catalogUrl'];
const storage=new Map();const context=vm.createContext({console,URL,Blob,crypto:require('node:crypto').webcrypto,setTimeout:()=>{},confirm:()=>true,alert:()=>{},navigator:{},localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},document:{getElementById:id=>els[id],querySelectorAll:()=>[],documentElement:{},createElement:()=>new Element()},window:{addEventListener:()=>{}}});
for(const file of ['catalog.js','app.js','catalog-ui.js'])vm.runInContext(fs.readFileSync(require.resolve('../'+file),'utf8'),context);
const run=s=>vm.runInContext(s,context);
const submit=el=>el.onsubmit({preventDefault(){}});
test('catalog only adds products, blocks duplicates and merges quantities',()=>{
 assert.equal(run('products.length'),36);
 els.catalogName.value='Test';els.catalogCode.value=' TEST ';els.catalogUrl.value='https://online.depo.lv/product/123';submit(els.catalogForm);
 assert.equal(run('products.length'),37);
 els.catalogName.value='Duplicate';els.catalogCode.value='TEST';submit(els.catalogForm);
 assert.equal(run('products.length'),37);
 assert.equal(run("products.find(p=>p.code==='TEST').name"),'Test');
 run("chooseProduct(products.find(p=>p.code==='TEST'),2)");
 run("chooseProduct(products.find(p=>p.code==='TEST'),3)");
 assert.equal(run('items.length'),1);assert.equal(run('items[0].qty'),5);
 assert.ok(run('orderText()').includes('https://online.depo.lv/product/123'));
 run('buildPrint()');assert.equal(els.printRows.children.length,1);
 els.catalogSearch.value='TEST';run('setView(true)');
 assert.equal(els.catalogList.children[0].children[1].children.length,0);
 assert.ok(JSON.parse(storage.get('kredos_catalog_v1')).some(x=>x.code==='TEST'));
});
test('JSON import merges codes without overwriting edits and rejects unsafe links',async()=>{
 const importData=async data=>els.catalogImport.onchange({target:{files:[{size:100,text:async()=>JSON.stringify(data)}],value:'file'}});
 await importData({products:[{code:'4750614006238',name:'duplicate',unit:'pcs',url:''},{code:'NEW',name:'New product',unit:'pcs',url:''}]});
 assert.equal(run('products.length'),38);assert.ok(run("products.find(p=>p.code==='4750614006238').name").includes('MP75'));
 await importData({products:[{code:'BAD',name:'Unsafe',unit:'pcs',url:'javascript:alert(1)'}]});
 assert.equal(run('products.length'),38);
});

test('simple order view separates catalogue management and preserves order',()=>{
 run('setView(false)');
 assert.equal(els.catalogEditor.hidden,true);assert.equal(els.catalogBackups.hidden,true);
 assert.equal(els.objectPanel.hidden,false);assert.equal(els.orderPanel.hidden,false);
 assert.equal(els.orderViewBtn['aria-pressed'],'true');
 els.catalogSearch.value='NEW';run('renderCatalog()');
 const actions=els.catalogList.children[0].children[1];
 assert.equal(actions.children.length,2);assert.equal(actions.children[1].textContent,'Добавить');
 actions.children[0].children[1].value='4';actions.children[1].onclick();
 assert.equal(run("items.find(x=>x.code==='NEW').qty"),4);
 run('setView(true)');
 assert.equal(els.catalogEditor.hidden,false);assert.equal(els.objectPanel.hidden,true);
 assert.equal(els.catalogList.children[0].children[1].children.length,0);
 run('setView(false)');assert.equal(run("items.find(x=>x.code==='NEW').qty"),4);
});

test('empty or partial catalogues recover all invoice materials without losing custom data',()=>{
 assert.equal(Catalog.restore([]).length,36);
 const first={...Catalog.seed()[0],name:'Existing name',url:'https://online.depo.lv/product/123'};
 const custom={id:'custom',code:'CUSTOM',name:'Custom material',unit:'pcs',url:''};
 const restored=Catalog.restore([first,custom]);
 assert.equal(restored.length,37);assert.equal(restored.find(x=>x.code===first.code).name,'Existing name');
 assert.equal(restored.find(x=>x.code===first.code).url,first.url);
 assert.ok(restored.some(x=>x.code==='CUSTOM'));
 assert.equal(Catalog.restore(restored).length,37);
});
