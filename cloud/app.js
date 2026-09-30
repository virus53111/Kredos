import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendEmailVerification, sendPasswordResetEmail, signOut, reload, getIdToken } from 'firebase/auth';
import { getFirestore, collection, doc, getDoc, setDoc, addDoc, deleteDoc, onSnapshot, query, orderBy, limit, runTransaction, serverTimestamp } from 'firebase/firestore';
import access from './access.cjs';
import {labels} from './labels.js';
for(const language of Object.keys(labels))Object.assign(translations[language],labels[language]);
const config=window.KREDOS_FIREBASE_CONFIG;
const configured=!!(config?.apiKey && config?.authDomain && config?.projectId && config?.appId);
let auth,db,user=null,role='guest',cloudView=false,orders=[],moderators=[],selected=null,editing=null,epoch=0,activeUid=null;
let unsubOrders=null,unsubRole=null,unsubModerators=null;
function message(id,key){$(id).textContent=t(key);}
function errorKey(error,authentication=false){
 const code=error?.code;
 const mapping={'auth/popup-blocked':'popupBlocked','auth/email-already-in-use':'emailTaken','auth/weak-password':'weakPassword','auth/invalid-email':'invalidEmail','auth/too-many-requests':'rateLimit','permission-denied':'managerOnly'};
 if(mapping[code])return mapping[code];
 if(['invalidOrder','revisionConflict','orderMissing','duplicateCode','invalidUrl'].includes(error?.message))return error.message;
 return authentication?'authError':'cloudError';
}
function button(label,action,className='secondary'){
 const b=document.createElement('button');b.type='button';b.textContent=t(label);b.className=className;
 b.onclick=async()=>{b.disabled=true;try{await action();}catch(error){message('cloudStatus',errorKey(error));}finally{b.disabled=false;}};
 return b;
}
function stopSubscriptions(){for(const fn of [unsubOrders,unsubRole,unsubModerators])fn?.();unsubOrders=unsubRole=unsubModerators=null;}
function resetEditing(){editing=null;$('cloudEditingBanner').hidden=true;$('cloudOrderState').value='new';$('cloudSaveBtn').textContent=t('saveSharedOrder');}
function renderAccount(){
 $('accountBtn').textContent=user?t('account'):t('signIn');
 $('cloudConnection').textContent=t(configured?'cloudReady':'cloudNotConfigured');
 $('signedOutControls').hidden=!!user;$('signedInControls').hidden=!user;
 for(const id of ['googleSignIn','emailSignIn','emailSignUp','resetPassword'])$(id).disabled=!configured;
 $('accountIdentity').textContent=user?.email||'';
 $('accountRole').textContent=user?.emailVerified?t(role==='admin'?'roleAdmin':role==='moderator'?'roleModerator':'roleViewer'):'';
 $('verificationControls').hidden=!user||user.emailVerified;
 $('cloudSaveControls').hidden=!access.canManage(role);
 $('newCloudOrder').hidden=!access.canManage(role);
 $('adminPanel').hidden=role!=='admin';
 $('cloudSaveBtn').textContent=t(editing?'saveSharedChanges':'saveSharedOrder');
 if(!user || !user.emailVerified)message('cloudStatus',configured?'signInRequired':'cloudNotConfigured');
 renderOrders();renderModerators();
}
function showCloudView(){
 cloudView=true;
 for(const id of ['objectPanel','manualPanel','orderPanel','sendPanel'])$(id).hidden=true;
 document.querySelector('.catalog-panel').hidden=true;
 $('cloudPanel').hidden=false;
 $('screenTitle').textContent=t('sharedOrders');$('screenHelp').textContent=t('sharedHint');
 for(const id of ['orderViewBtn','catalogViewBtn']){$(id).className='view-tab';$(id).setAttribute('aria-pressed','false');}
 $('cloudViewBtn').className='view-tab active';$('cloudViewBtn').setAttribute('aria-pressed','true');
 renderAccount();
}
const baseSetView=setView;
setView=function(managing){cloudView=false;$('cloudPanel').hidden=true;document.querySelector('.catalog-panel').hidden=false;$('cloudViewBtn').className='view-tab';$('cloudViewBtn').setAttribute('aria-pressed','false');baseSetView(managing);};
const baseApplyLanguage=applyLanguage;
applyLanguage=function(){const wasCloud=cloudView;baseApplyLanguage();renderAccount();if(wasCloud)showCloudView();if(selected)renderDetail(selected);};
function showDetail(order){selected=order;renderDetail(order);$('cloudDetail').hidden=false;$('cloudDetail').scrollIntoView({behavior:'smooth',block:'center'});}
function renderDetail(order){
 $('cloudDetailName').textContent=order.name;
 $('cloudDetailAddress').textContent=t('address')+': '+(order.address||'—');
 $('cloudDetailItems').replaceChildren();
 for(const item of order.items){
  const row=document.createElement('div');row.className='shared-item';
  const name=document.createElement('strong');name.textContent=item.name;
  const code=document.createElement('small');code.textContent=item.code||'';
  const quantity=document.createElement('span');quantity.textContent=item.qty+' '+unitLabel(item.unit);
  const info=document.createElement('div');info.append(name,code);
  const url=Catalog.url(item.url);if(url){const a=document.createElement('a');a.href=url;a.target='_blank';a.rel='noopener';a.textContent='DEPO ↗';info.append(a);}
  row.append(info,quantity);$('cloudDetailItems').append(row);
 }
}
function renderOrders(){
 $('cloudOrders').replaceChildren();
 if(!user?.emailVerified)return;
 if(!orders.length){const p=document.createElement('p');p.textContent=t('noSharedOrders');$('cloudOrders').append(p);}
 for(const order of orders){
  const row=document.createElement('article');row.className='cloud-order';
  const info=document.createElement('div'),name=document.createElement('strong'),details=document.createElement('small');
  name.textContent=order.name;details.textContent=(order.address||'—')+' · '+order.items.length+' '+t('positions')+' · '+t(order.state==='new'?'stateNew':order.state==='completed'?'stateCompleted':'stateProgress');info.append(name,details);
  const actions=document.createElement('div');actions.className='cloud-order-actions';actions.append(button('viewOrder',()=>showDetail(order)));
  if(access.canManage(role))actions.append(button('edit',()=>{
   editing={id:order.id,revision:order.revision};items=clone(order.items);$('objectAddress').value=order.address;$('orderName').value=order.name;cancelEdit();renderItems();setView(false);$('cloudOrderState').value=order.state;$('cloudEditingBanner').hidden=false;$('cloudSaveBtn').textContent=t('saveSharedChanges');$('objectPanel').scrollIntoView({behavior:'smooth'});
  }));
  if(role==='admin')actions.append(button('remove',async()=>{
   if(!confirm(t('deleteOrderConfirm')+'\n'+order.name))return;
   await deleteDoc(doc(db,'orders',order.id));if(editing?.id===order.id)resetEditing();
  },'text-danger'));
  row.append(info,actions);$('cloudOrders').append(row);
 }
}
function renderModerators(){
 $('moderatorsList').replaceChildren();if(role!=='admin')return;
 if(!moderators.length){const p=document.createElement('p');p.textContent=t('noModerators');$('moderatorsList').append(p);}
 for(const mod of moderators){const row=document.createElement('div');row.className='template';const email=document.createElement('strong');email.textContent=mod.email;row.append(email,button('removeModerator',async()=>{if(confirm(t('removeModeratorConfirm')+'\n'+mod.email))await deleteDoc(doc(db,'moderators',mod.email));},'text-danger'));$('moderatorsList').append(row);}
}
async function handleUser(next){
 const current=++epoch;stopSubscriptions();user=next;role='guest';orders=[];moderators=[];selected=null;$('cloudDetail').hidden=true;resetEditing();
 if(activeUid!==(user?.uid||null)){switchAccountDraft(user?.uid||null,access.roleFor(user)==='admin');activeUid=user?.uid||null;}
 renderAccount();if(!user?.emailVerified)return;
 const email=user.email.toLowerCase();role=access.roleFor(user);renderAccount();message('cloudStatus','loading');
 unsubOrders=onSnapshot(query(collection(db,'orders'),orderBy('updatedAt','desc'),limit(100)),snapshot=>{
  if(current!==epoch)return;
  orders=snapshot.docs.map(d=>({id:d.id,...d.data()}));
  $('cloudStatus').textContent='';renderOrders();
  if(selected){const fresh=orders.find(x=>x.id===selected.id);if(fresh){selected=fresh;renderDetail(fresh);}else{selected=null;$('cloudDetail').hidden=true;}}
 },error=>{if(current===epoch)message('cloudStatus',errorKey(error));});
 if(role==='admin'){
  unsubModerators=onSnapshot(collection(db,'moderators'),snapshot=>{if(current!==epoch)return;moderators=snapshot.docs.map(d=>d.data());renderModerators();},error=>message('cloudStatus',errorKey(error)));
 }else{
  unsubRole=onSnapshot(doc(db,'moderators',email),snapshot=>{if(current!==epoch)return;role=access.roleFor(user,snapshot.exists());if(!access.canManage(role))resetEditing();renderAccount();},()=>{if(current!==epoch)return;role='viewer';resetEditing();renderAccount();});
 }
}
async function authAction(action){
 if(!configured)return message('authStatus','cloudNotConfigured');
 const buttons=['googleSignIn','emailSignIn','emailSignUp','resetPassword'];buttons.forEach(id=>$(id).disabled=true);
 $('authStatus').textContent='';
 try{await action();$('authPassword').value='';}catch(error){if(error.code!=='auth/popup-closed-by-user')message('authStatus',errorKey(error,true));}
 finally{buttons.forEach(id=>$(id).disabled=false);}
}
$('accountBtn').onclick=()=>{$('accountPanel').hidden=!$('accountPanel').hidden;if(!$('accountPanel').hidden)$('accountPanel').scrollIntoView({behavior:'smooth',block:'start'});};
$('accountClose').onclick=()=>{$('accountPanel').hidden=true;};
$('cloudViewBtn').onclick=showCloudView;
$('installGuideClose').onclick=()=>{$('installGuide').hidden=true;};
$('googleSignIn').onclick=()=>authAction(async()=>{await signInWithPopup(auth,new GoogleAuthProvider());$('accountPanel').hidden=true;});
$('emailAuthForm').onsubmit=event=>{event.preventDefault();authAction(()=>signInWithEmailAndPassword(auth,$('authEmail').value.trim(),$('authPassword').value));};
$('emailSignUp').onclick=()=>{if(!$('emailAuthForm').reportValidity())return;authAction(async()=>{const result=await createUserWithEmailAndPassword(auth,$('authEmail').value.trim(),$('authPassword').value);await sendEmailVerification(result.user);message('authStatus','verificationSent');});};
$('resetPassword').onclick=()=>{if(!$('authEmail').reportValidity())return;authAction(async()=>{await sendPasswordResetEmail(auth,$('authEmail').value.trim());message('authStatus','resetSent');});};
$('resendVerification').onclick=()=>authAction(async()=>{await sendEmailVerification(auth.currentUser);message('authStatus','verificationSent');});
$('checkVerification').onclick=()=>authAction(async()=>{await reload(auth.currentUser);await getIdToken(auth.currentUser,true);await handleUser(auth.currentUser);if(!auth.currentUser.emailVerified)message('authStatus','verifyPending');else $('accountPanel').hidden=true;});
$('signOut').onclick=()=>authAction(()=>signOut(auth));
$('newCloudOrder').onclick=()=>{if(!access.canManage(role))return;if(items.length&&!confirm(t('confirmClear')))return;items=[];$('objectAddress').value='';$('orderName').value='';cancelEdit();renderItems();resetEditing();setView(false);$('objectPanel').scrollIntoView({behavior:'smooth'});};
$('cancelCloudEdit').onclick=resetEditing;
$('cloudDetailClose').onclick=()=>{selected=null;$('cloudDetail').hidden=true;};
$('cloudDetailPdf').onclick=async()=>{
 if(!selected)return;const b=$('cloudDetailPdf');b.disabled=true;
 try{
  const data=clone(selected);const blob=await createOrderPdf(data,{locale:lang==='lv'?'lv-LV':lang==='uk'?'uk-UA':'ru-RU',order:t('order'),address:t('address'),material:t('material'),code:t('code'),quantity:t('quantity'),unit:unitLabel});
  const file=new File([blob],'KREDOS-materials.pdf',{type:'application/pdf'});
  if(navigator.share&&navigator.canShare?.({files:[file]}))await navigator.share({title:data.name,files:[file]});
  else{const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=file.name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
 }catch(error){if(error.name!=='AbortError')message('cloudStatus','cloudError');}finally{b.disabled=false;}
};
$('cloudSaveBtn').onclick=async()=>{
 if(!access.canManage(role))return message('cloudSaveStatus','managerOnly');
 const b=$('cloudSaveBtn');b.disabled=true;message('cloudSaveStatus','loading');const operationEpoch=epoch;
 try{
  const data=access.validateOrder({...draft(),name:$('orderName').value.trim()||t('order'),state:$('cloudOrderState').value});
  if(editing){const target={...editing};await runTransaction(db,async transaction=>{
   const ref=doc(db,'orders',target.id),snapshot=await transaction.get(ref);
   if(!snapshot.exists())throw Error('orderMissing');const old=snapshot.data();if(old.revision!==target.revision)throw Error('revisionConflict');
   transaction.update(ref,{...data,updatedAt:serverTimestamp(),revision:old.revision+1});
  });}
  else await addDoc(collection(db,'orders'),{...data,createdBy:user.uid,createdAt:serverTimestamp(),updatedAt:serverTimestamp(),revision:1});
  if(operationEpoch!==epoch)return;resetEditing();showCloudView();message('cloudStatus','orderSaved');
 }catch(error){if(operationEpoch===epoch)message('cloudSaveStatus',errorKey(error));}finally{b.disabled=false;}
};
$('moderatorForm').onsubmit=async event=>{
 event.preventDefault();if(role!=='admin')return message('cloudStatus','adminOnly');
 const email=$('moderatorEmail').value.trim().toLowerCase();if(email===access.ADMIN_EMAIL)return message('cloudStatus','noOwnModerator');
 const b=$('addModerator');b.disabled=true;
 try{const ref=doc(db,'moderators',email),existing=await getDoc(ref);if(!existing.exists())await setDoc(ref,{email,assignedBy:user.uid,createdAt:serverTimestamp()});$('moderatorForm').reset();message('cloudStatus','moderatorAdded');}catch(error){message('cloudStatus',errorKey(error));}finally{b.disabled=false;}
};
if(configured){try{const app=initializeApp(config);auth=getAuth(app);db=getFirestore(app);onAuthStateChanged(auth,handleUser,error=>message('authStatus',errorKey(error,true)));}catch{message('authStatus','cloudError');}}
applyLanguage();
