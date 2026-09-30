const test=require('node:test');
const assert=require('node:assert/strict');
const {PDFDocument}=require('pdf-lib');
const {encodeOrderPdf}=require('../order-pdf.js');
test('PDF pages and links parse with correct xref offsets',async()=>{
 const pages=[{width:1240,height:1754,jpeg:new Uint8Array([255,216,255,217]),links:[{url:'https://online.depo.lv/product/123',rect:[135,350,100,28]}]},{width:1240,height:1754,jpeg:new Uint8Array([255,216,255,217]),links:[]}];
 const bytes=encodeOrderPdf(pages),pdf=await PDFDocument.load(bytes);
 assert.equal(pdf.getPageCount(),2);
 assert.equal(pdf.getPage(0).getWidth(),595.28);
 const annotations=pdf.getPage(0).node.Annots();assert.equal(annotations.size(),1);
 const {PDFName}=require('pdf-lib');const annot=pdf.context.lookup(annotations.get(0));
 const action=pdf.context.lookup(annot.get(PDFName.of('A')));
 assert.equal(action.get(PDFName.of('URI')).decodeText(),'https://online.depo.lv/product/123');
});
