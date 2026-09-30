const test=require('node:test'),assert=require('node:assert/strict');
const {roleFor,canManage,validateOrder}=require('../cloud/access.cjs');
test('only the verified owner is admin; moderators cannot appoint or become admins',()=>{
 assert.equal(roleFor(null),'guest');assert.equal(roleFor({email:'dshtriters@gmail.com',emailVerified:false},true),'guest');
 assert.equal(roleFor({email:'dshtriters@gmail.com',emailVerified:true}),'admin');
 assert.equal(roleFor({email:'person@example.com',emailVerified:true}),'viewer');
 assert.equal(roleFor({email:'person@example.com',emailVerified:true},true),'moderator');
 assert.equal(roleFor({email:'person@example.com',emailVerified:true,role:'admin'}),'viewer');
 assert.equal(canManage('viewer'),false);assert.equal(canManage('moderator'),true);
});
test('shared order validation rejects bad quantities, duplicate codes and unsafe URLs',()=>{
 const base={name:'Object',address:'Riga',state:'new',items:[{name:'Knauf',qty:2,unit:'pcs',code:' 123 ',url:''}]};
 assert.equal(validateOrder(base).items[0].code,'123');
 for(const qty of [0,-1,NaN,Infinity,'2'])assert.throws(()=>validateOrder({...base,items:[{...base.items[0],qty}]}));
 assert.throws(()=>validateOrder({...base,items:[...base.items,...base.items]}));
 assert.throws(()=>validateOrder({...base,items:[{...base.items[0],url:'javascript:alert(1)'}]}));
 assert.throws(()=>validateOrder({...base,name:''}));assert.throws(()=>validateOrder({...base,state:'admin'}));
});
