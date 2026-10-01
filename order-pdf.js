// A4 PDF with rasterized text preserves Latvian and Cyrillic without external fonts.
// Images are JPEG; product links remain clickable PDF annotations.
function encodeOrderPdf(pages) {
 const encoder=new TextEncoder(), chunks=[], offsets=[0]; let length=0;
 const push=value=>{const bytes=typeof value==='string'?encoder.encode(value):value;chunks.push(bytes);length+=bytes.length;};
 const count=2+pages.reduce((n,p)=>n+3+p.links.length,0);
 const object=(id,content)=>{offsets[id]=length;push(id+' 0 obj\n');push(content);push('\nendobj\n');};
 let next=3; const ids=pages.map(p=>{const page=next++,image=next++,stream=next++;return {page,image,stream,links:p.links.map(()=>next++)};});
 push('%PDF-1.4\n');
 object(1,'<< /Type /Catalog /Pages 2 0 R >>');
 object(2,'<< /Type /Pages /Count '+pages.length+' /Kids ['+ids.map(x=>x.page+' 0 R').join(' ')+'] >>');
 pages.forEach((p,i)=>{
   const id=ids[i];
   object(id.page,'<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Resources << /XObject << /Im0 '+id.image+' 0 R >> >> /Contents '+id.stream+' 0 R /Annots ['+id.links.map(x=>x+' 0 R').join(' ')+'] >>');
   offsets[id.image]=length;push(id.image+' 0 obj\n<< /Type /XObject /Subtype /Image /Width '+p.width+' /Height '+p.height+' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length '+p.jpeg.length+' >>\nstream\n');
   push(p.jpeg);push('\nendstream\nendobj\n');
   const commands='q\n595.28 0 0 841.89 0 0 cm\n/Im0 Do\nQ\n';
   object(id.stream,'<< /Length '+encoder.encode(commands).length+' >>\nstream\n'+commands+'endstream');
   p.links.forEach((link,j)=>{
     const [x,y,w,h]=link.rect, sx=595.28/p.width, sy=841.89/p.height;
     const rect=[x*sx,841.89-(y+h)*sy,(x+w)*sx,841.89-y*sy].map(v=>v.toFixed(2)).join(' ');
     const url=link.url.replace(/([\\()])/g,'\\$1');
     object(id.links[j],'<< /Type /Annot /Subtype /Link /Rect ['+rect+'] /Border [0 0 0] /A << /S /URI /URI ('+url+') >> >>');
   });
 });
 const xref=length;
 push('xref\n0 '+(count+1)+'\n0000000000 65535 f \n');
 for(let i=1;i<=count;i++)push(String(offsets[i]).padStart(10,'0')+' 00000 n \n');
 push('trailer\n<< /Size '+(count+1)+' /Root 1 0 R >>\nstartxref\n'+xref+'\n%%EOF\n');
 const result=new Uint8Array(length);let position=0;for(const c of chunks){result.set(c,position);position+=c.length;}return result;
}
async function createOrderPdf(order,labels) {
 const width=1240,height=1754,margin=70,pages=[];let canvas,ctx,y,links;
 const font=(size,bold=false)=>ctx.font=(bold?'bold ':'')+size+'px Arial, sans-serif';
 function wrap(text,maxWidth){
   const lines=[];let line='';
   for(const word of String(text).split(/\s+/)){
     if(ctx.measureText(line+(line?' ':'')+word).width<=maxWidth){line+=(line?' ':'')+word;continue;}
     if(line){lines.push(line);line='';}
     for(const char of word){if(ctx.measureText(line+char).width>maxWidth&&line){lines.push(line);line='';}line+=char;}
   }
   if(line)lines.push(line);return lines.length?lines:[''];
 }
 function startPage(){
   canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;ctx=canvas.getContext('2d');links=[];
   ctx.fillStyle='#fff';ctx.fillRect(0,0,width,height);ctx.fillStyle='#173b34';font(42,true);ctx.fillText('KREDOS',margin,105);
   font(22);ctx.fillText(new Date().toLocaleDateString(labels.locale),850,100);
   ctx.fillRect(margin,125,width-margin*2,5);ctx.fillStyle='#13221f';font(30,true);y=185;
   for(const line of wrap(order.name||labels.order,width-margin*2)){ctx.fillText(line,margin,y);y+=38;}
   font(24);for(const line of wrap(labels.address+': '+(order.address||'—'),width-margin*2)){ctx.fillText(line,margin,y);y+=31;}
   y+=20;ctx.fillStyle='#173b34';ctx.fillRect(margin,y,width-margin*2,50);ctx.fillStyle='#fff';font(20,true);
   ctx.fillText('№',margin+12,y+32);ctx.fillText(labels.material,margin+65,y+32);ctx.fillText(labels.code,740,y+32);ctx.fillText(labels.quantity,980,y+32);y+=65;
 }
 async function finishPage(){
   ctx.fillStyle='#65736f';font(20);ctx.fillText('KREDOS · '+(pages.length+1),margin,height-55);
   const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',.94));
   pages.push({width,height,jpeg:new Uint8Array(await blob.arrayBuffer()),links});
 }
 startPage();
 for(let i=0;i<order.items.length;i++){
   const item=order.items[i];font(24);const lines=wrap(item.name,570);
   const url=Catalog.link(item);const rowHeight=Math.max(65,lines.length*30+25+(url?30:0));
   if(y+rowHeight>height-110){await finishPage();startPage();}
   ctx.fillStyle='#13221f';font(22);ctx.fillText(String(i+1),margin+12,y+24);
   font(24);lines.forEach((line,n)=>ctx.fillText(line,margin+65,y+24+n*30));
   font(21,true);ctx.fillText(item.code||'—',740,y+24);
   const qty=wrap(item.qty+' '+labels.unit(item.unit),175);qty.forEach((line,n)=>ctx.fillText(line,980,y+24+n*27));
   if(url){ctx.fillStyle='#173b34';font(20,true);const ly=y+24+lines.length*30;ctx.fillText('DEPO ↗',margin+65,ly);links.push({url,rect:[margin+65,ly-23,100,28]});}
   ctx.strokeStyle='#d9dfdc';ctx.beginPath();ctx.moveTo(margin,y+rowHeight-8);ctx.lineTo(width-margin,y+rowHeight-8);ctx.stroke();y+=rowHeight;
 }
 await finishPage();return new Blob([encodeOrderPdf(pages)],{type:'application/pdf'});
}
if(typeof module!=='undefined')module.exports={encodeOrderPdf};
