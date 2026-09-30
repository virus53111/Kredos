const ADMIN_EMAIL='dshtriters@gmail.com';
function roleFor(user,isModerator=false){
 if(!user || user.emailVerified!==true)return 'guest';
 if(String(user.email||'').trim().toLowerCase()===ADMIN_EMAIL)return 'admin';
 return isModerator?'moderator':'viewer';
}
function canManage(role){return role==='admin'||role==='moderator';}
function validateOrder(order){
 if(!order || typeof order.name!=='string' || !order.name.trim() || order.name.length>200 || typeof order.address!=='string' || order.address.length>500)throw Error('invalidOrder');
 if(!Array.isArray(order.items)||!order.items.length||order.items.length>300)throw Error('invalidOrder');
 const keys=new Set();
 const items=order.items.map(x=>{
  if(!x || typeof x.name!=='string' || !x.name.trim() || x.name.length>1000 || !Number.isFinite(x.qty)||x.qty<=0||x.qty>1000000 || !['pcs','pack','m','m2','kg','l'].includes(x.unit))throw Error('invalidOrder');
  const code=String(x.code||'').replace(/\s+/g,'').toUpperCase();if(code.length>100)throw Error('invalidOrder');
  if(code){const key=code+'|'+x.unit;if(keys.has(key))throw Error('duplicateCode');keys.add(key);}
  let url='';if(x.url){const u=new URL(x.url);if(u.protocol!=='https:'||u.hostname!=='online.depo.lv'||!/^\/product\/\d+\/?$/.test(u.pathname)||u.username||u.password)throw Error('invalidUrl');u.search='';u.hash='';url=u.href;}
  return {name:x.name.trim(),qty:x.qty,unit:x.unit,code,url};
 });
 if(!['new','in_progress','completed'].includes(order.state))throw Error('invalidOrder');
 return {name:order.name.trim(),address:order.address.trim(),items,state:order.state};
}
module.exports={ADMIN_EMAIL,roleFor,canManage,validateOrder};
