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
 replaceChildren(...nodes){this.children=nodes} focus(){} scrollIntoView(){}
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
test('catalog CRUD, duplicate protection, persistent deletion and order merge',()=>{
 assert.equal(run('products.length'),36);
 els.catalogName.value='Test';els.catalogCode.value=' TEST ';submit(els.catalogForm);
 assert.equal(run('products.length'),37);
 els.catalogName.value='Duplicate';els.catalogCode.value='TEST';submit(els.catalogForm);
 assert.equal(run('products.length'),37);
 run("editProduct(products.find(p=>p.code==='TEST'))");els.catalogName.value='Edited';els.catalogUrl.value='https://online.depo.lv/product/123';submit(els.catalogForm);
 assert.equal(run("products.find(p=>p.code==='TEST').name"),'Edited');
 run("chooseProduct(products.find(p=>p.code==='TEST'))");els.itemQty.value='2';submit(els.itemForm);
 run("chooseProduct(products.find(p=>p.code==='TEST'))");els.itemQty.value='3';submit(els.itemForm);
 assert.equal(run('items.length'),1);assert.equal(run('items[0].qty'),5);
 assert.ok(run('orderText()').includes('https://online.depo.lv/product/123'));
 run('buildPrint()');assert.equal(els.printRows.children.length,1);
 els.catalogSearch.value='TEST';run('renderCatalog()');els.catalogList.children[0].children[1].children[2].onclick();
 assert.equal(run('products.length'),36);assert.equal(run('items.length'),1);
 assert.ok(!JSON.parse(storage.get('kredos_catalog_v1')).some(x=>x.code==='TEST'));
});
test('JSON import merges codes without overwriting edits and rejects unsafe links',async()=>{
 const importData=async data=>els.catalogImport.onchange({target:{files:[{size:100,text:async()=>JSON.stringify(data)}],value:'file'}});
 await importData({products:[{code:'4750614006238',name:'duplicate',unit:'pcs',url:''},{code:'NEW',name:'New product',unit:'pcs',url:''}]});
 assert.equal(run('products.length'),37);assert.ok(run("products.find(p=>p.code==='4750614006238').name").includes('MP75'));
 await importData({products:[{code:'BAD',name:'Unsafe',unit:'pcs',url:'javascript:alert(1)'}]});
 assert.equal(run('products.length'),37);
});
