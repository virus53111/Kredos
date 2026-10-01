// Product names and barcodes transcribed from the five September 2026 invoices.
// Service rows (tinting, cutting, delivery) are deliberately excluded.
const invoiceProducts = [
 ['4750614006238','Ģipša mašīnapmetums MP75 / Knauf 30kg'],
 ['5907591937607','Zīdaini matēta ūdens dispersijas krāsa iekšdarbiem / Caparol 1.25L'],
 ['5903518000591','Akrila hermētiķis / TYTAN 310ml Balts'],
 ['4750707022435','Divslāņu LDPE atkritumu maisi Clean / 75x115cm/150L/5gab. 55 mikr.'],
 ['5902120000401','Montāžas putas iestrādei ar pistoli / TYTAN 750ml PU-Gun-Foam'],
 ['5905061063948','Poliakrila-poliamīda veltnītis ProPlus / Hardy W250/D48/H9mm dub.dzelt.'],
 ['5905061063672','Veltnīši Eurofaza / Hardy Ø6/W100/H13mm 2gab.'],
 ['4820172660033','Automātiskais drošinātājs / E27 / 25A'],
 ['4750707006084','Stiklšķiedras lente / Spino 50mmx25m balta'],
 ['5905061984069','UV notur. krāsošanas līmlente īpaši precīzām līn. / 30mmx33m zila'],
 ['4743307161420','Montāžas līme SpeedFix Clear / PENOSIL 290ml caurspīdīga'],
 ['2000000008622','Tekstila maisi putekļsūcējam Karcher WD3 / 5gab./6.959-130.0 balti','pack'],
 ['2770060124333','Polipropilēna maiss / 50x85cm ar zaļu svītru'],
 ['6411512150208','Smalkgraudaina špakteļmasa LH, KIILTO 20kg smalka balta'],
 ['2770030043589','Universāla špakteļmasa, Masterline 27kg spainis'],
 ['3606481482297','1-vietīgs rāmis, Sedna Design balts'],
 ['3606481482303','2-vietīgs rāmis, Sedna Design balts'],
 ['3606481482310','3-vietīgs rāmis, Sedna Design balts'],
 ['3606481477934','K-ligzda ar zemējumu z/a, Sedna Design bez rāmja balta'],
 ['3606481478023','Slēdzis z/a, Sedna Design balts'],
 ['4006415030621','Alkīda emaljas krāsa betonam, Super Nova 750ml 7030'],
 ['5907591935054','Zīdaini matēta ūdens dispersijas krāsa iekšdarbiem, Caparol 10L Samtex 7 B1'],
 ['5907591935610','Zīdaini matēta krāsa sienām Samtex 10, Caparol 2.5L bāze 1'],
 ['5907697617335','Standarta ģipškartona plāksne SMART, 1200x2600x12.5mm'],
 ['4750614006153','Elastīga flīžu līme K4, Knauf 25kg Pelēka'],
 ['5902115731679','Iebūv. rāmis ar tualetes podu/skaloš. kasti Morena, Cersanit 3/6L'],
 ['4772034009255','Ūdens maisītājs vannai/dušai Uno, Rubineta 35mm melns'],
 ['4772034009309','Ūdens maisītājs vannasistabas izlietnei Uno, Rubineta 35mm melns'],
 ['5905952137093','Iekšējā PVC palodze, Vilo 350mm balta','m'],
 ['5902686957591','Salizt. akmens masas grīdas/sienas flīze Onyx, Ceramika Netto 600x1200mm Beige','m2'],
 ['5905061063948','Poliakrila-poliamīda veltnītis ProPlus / Hardy W250/D48/H9mm dub.dzelt.'],
 ['5902120010684','Montāžas putas iestrādei ar pistoli Hauser / 640ml PU-Gun-Foam STD'],
 ['4750707002833','Automašīnu krāsošanas līmlente / 7 dienas / Folsen 25mmx50m'],
 ['6942629257950','Miglotājs / YardSmith 5L'],
 ['4003982245694','Ģipša špakteļmasa Uniflott / Knauf 5kg'],
 ['4779033841152','Universālā dziļi nostiprinošā grunts Base Primer / Stimelit 20L'],
 ['5907536351536','Cinkota tērauda stūris, 23x23x2500mm cinkots']
];
// Exact barcode matches from the public DEPO catalogue, checked 2026-10-01.
const verifiedDepoProducts = {
  "4750614006238": {
    "url": "https://online.depo.lv/product/1418",
    "name": "Ģipša mašīnapmetums MP75 Knauf 30kg",
    "barcodes": "4750614006238"
  },
  "5907591937607": {
    "url": "https://online.depo.lv/product/37746",
    "name": "Zīdaini matēta ūdens dispersijas krāsa iekšdarbiem Caparol 1.25L Samtex 7 B1",
    "barcodes": "5907591935047,4002381708571,4002381860941,5907591937607"
  },
  "5903518000591": {
    "url": "https://online.depo.lv/product/64426",
    "name": "Akrila hermētiķis TYTAN 310ml Balts",
    "barcodes": "5903518000591,5903518900594"
  },
  "4750707022435": {
    "url": "https://online.depo.lv/product/118175",
    "name": "Divslāņu LDPE atkritumu maisi Klean 75x115cm/150L/5gab. 55 mikroni",
    "barcodes": "4750707022435"
  },
  "5902120000401": {
    "url": "https://online.depo.lv/product/64116",
    "name": "Montāžas putas iestrādei ar pistoli TYTAN 750 ml PU-Gun-Foam",
    "barcodes": "5902120000401,2770010029299,5903518044571,5903518058417,5903518051807,5902120000418"
  },
  "5905061063672": {
    "url": "https://online.depo.lv/product/215724",
    "name": "Veltnīši Eurofaza Hardy Ø6/W100/H13mm 2gab.",
    "barcodes": "5905061063672"
  },
  "4820172660033": {
    "url": "https://online.depo.lv/product/36251",
    "name": "Automātiskais drošinātājs/ E27 25A",
    "barcodes": "4750545410036,4820172660033"
  },
  "4750707006084": {
    "url": "https://online.depo.lv/product/2791",
    "name": "Stiklšķiedras lente Spino 50mmX25m balta",
    "barcodes": "4750707006084"
  },
  "5905061984069": {
    "url": "https://online.depo.lv/product/485904",
    "name": "UV notur.krāsošanas līmlente īpaši precīzām līn. 30mmx33m zila",
    "barcodes": "5905061984069"
  },
  "4743307161420": {
    "url": "https://online.depo.lv/product/64236",
    "name": "Montāžas līme SpeedFix Clear PENOSIL 290ml caurspīdīga",
    "barcodes": "4743307161420,4743307114174,4743307114037"
  },
  "2000000008622": {
    "url": "https://online.depo.lv/product/478578",
    "name": "Tekstila maisi putekļsūcējam Karcher WD3 5gab./6.959-130.0 balti",
    "barcodes": "2000000008622"
  },
  "2770060124333": {
    "url": "https://online.depo.lv/product/159238",
    "name": "Polipropilēna maiss 50x85cm ar zaļu svītru",
    "barcodes": "2770060124333"
  },
  "6411512150208": {
    "url": "https://online.depo.lv/product/1443",
    "name": "Smalkgraudaina špakteļmasa LH KIILTO 20kg smalka balta",
    "barcodes": "6411512150208,6411512401201"
  },
  "2770030043589": {
    "url": "https://online.depo.lv/product/146992",
    "name": "Universāla špakteļmasa Masterline 27 kg spainis",
    "barcodes": "2770030043589"
  },
  "3606481482297": {
    "url": "https://online.depo.lv/product/337131",
    "name": "1-vietīgs rāmis Sedna Design balts",
    "barcodes": "3606481482297"
  },
  "3606481482303": {
    "url": "https://online.depo.lv/product/337142",
    "name": "2-vietīgs rāmis Sedna Design balts",
    "barcodes": "3606481482303"
  },
  "3606481482310": {
    "url": "https://online.depo.lv/product/337145",
    "name": "3-vietīgs rāmis Sedna Design balts",
    "barcodes": "3606481482310"
  },
  "3606481477934": {
    "url": "https://online.depo.lv/product/337119",
    "name": "K-ligzda ar zemējumu z/a Sedna Design bez rāmja balta",
    "barcodes": "3606481477934"
  },
  "3606481478023": {
    "url": "https://online.depo.lv/product/337083",
    "name": "Slēdzis z/a Sedna Design balts",
    "barcodes": "3606481478023"
  },
  "4006415030621": {
    "url": "https://online.depo.lv/product/38305",
    "name": "Alkīda emaljas krāsa betonam Super Nova 750ml 7030",
    "barcodes": "4006415030621"
  },
  "5907591935054": {
    "url": "https://online.depo.lv/product/37745",
    "name": "Zīdaini matēta ūdens dispersijas krāsa iekšdarbiem Caparol 10l Samtex 7 B1",
    "barcodes": "5907591935054,4002381722867,4002381842275,5907591937539"
  },
  "5907591935610": {
    "url": "https://online.depo.lv/product/359856",
    "name": "Zīdaini matēta krāsa sienām Samtex 10 Caparol 2.5L bāze 1",
    "barcodes": "5907591935610"
  },
  "5907697617335": {
    "url": "https://online.depo.lv/product/580",
    "name": "Standarta ģipškartona plāksne SMART 1200x2600x12.5mm",
    "barcodes": "5907697617335,2770010055014,5907697607688,5907697607886,5907697605431,5907697617342,5907697646854,5907697646847"
  },
  "4750614006153": {
    "url": "https://online.depo.lv/product/1477",
    "name": "Elastīga flīžu līme K4 Knauf 25kg Pelēka",
    "barcodes": "4750614006153,4750614003053,4750614004661"
  },
  "5902115731679": {
    "url": "https://online.depo.lv/product/23299",
    "name": "Iebūv.rāmis ar tualetes podu/skaloš. kasti Morena Cersanit 3/6L",
    "barcodes": "5902115731679"
  },
  "4772034009255": {
    "url": "https://online.depo.lv/product/20602",
    "name": "Ūdens maisītājs vannai/dušai Uno Rubineta 35 mm melns",
    "barcodes": "4772034009255"
  },
  "4772034009309": {
    "url": "https://online.depo.lv/product/20809",
    "name": "Ūdens maisītājs vannasistabas izlietnei Uno Rubineta 35 mm melns",
    "barcodes": "4772034009309"
  },
  "5905952137093": {
    "url": "https://online.depo.lv/product/410964",
    "name": "Iekšējā PVC palodze Vilo 350mm balta",
    "barcodes": "5905952137093,5905952050118"
  },
  "5902120010684": {
    "url": "https://online.depo.lv/product/64118",
    "name": "Montāžas putas iestrādei ar pistoli Hauser 640ml PU-Gun-Foam STD B3",
    "barcodes": "5902120010684,2770010040126,5903518054167,5902120010691"
  },
  "4750707002833": {
    "url": "https://online.depo.lv/product/91383",
    "name": "Automašīnu krāsošanas līmlente/7 dienas Folsen 25mmx50m",
    "barcodes": "4750707002833"
  },
  "6942629257950": {
    "url": "https://online.depo.lv/product/75407",
    "name": "Miglotājs Yardsmith 5L",
    "barcodes": "6942629257950,26942629257954"
  },
  "4003982245694": {
    "url": "https://online.depo.lv/product/1426",
    "name": "Ģipša špakteļmasa Uniflott knauf 5 kg",
    "barcodes": "4003982245694,4003982162830,4003982200273,4006379019342"
  },
  "4779033841152": {
    "url": "https://online.depo.lv/product/40264",
    "name": "Universāla dziļi nostiprinoša grunts Base Primer Stimelit 20L",
    "barcodes": "4779033841152"
  },
  "5907536351536": {
    "url": "https://online.depo.lv/product/2746",
    "name": "Cinkota tērauda stūris 23x23x2500mm cinkots",
    "barcodes": "5907536351536,2770010006078,4750806001539"
  }
};
const Catalog = {
 code(value) { return String(value || '').replace(/\s+/g, '').toUpperCase(); },
 url(value) {
   if (!String(value || '').trim()) return '';
   try {
     const u = new URL(value);
     if (u.protocol !== 'https:' || u.hostname !== 'online.depo.lv' ||
         !/^\/product\/\d+\/?$/.test(u.pathname) || u.username || u.password) return null;
     u.search = ''; u.hash = '';
     return u.href;
   } catch { return null; }
 },
 link(product) {
   return this.url(product?.url) || verifiedDepoProducts[this.code(product?.code)]?.url || '';
 },
 unique(products) {
   const byCode = new Map();
   for (const p of products) {
     const code = this.code(p.code);
     if (code && !byCode.has(code)) byCode.set(code, {...p, code});
   }
   return [...byCode.values()];
 },
 restore(products) {
   return this.unique([...(Array.isArray(products) ? products : []), ...this.seed()]).map(p => ({...p, url:this.link(p)}));
 },
 seed() {
   return this.unique(invoiceProducts.map(([code,name,unit='pcs']) =>
     ({id:code,code,name,unit,url:verifiedDepoProducts[code]?.url||''})));
 }
};
if (typeof module !== 'undefined') module.exports = Catalog;
