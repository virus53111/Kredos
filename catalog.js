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
 unique(products) {
   const byCode = new Map();
   for (const p of products) {
     const code = this.code(p.code);
     if (code && !byCode.has(code)) byCode.set(code, {...p, code});
   }
   return [...byCode.values()];
 },
 seed() {
   return this.unique(invoiceProducts.map(([code,name,unit='pcs']) =>
     ({id:code,code,name,unit,url:''})));
 }
};
if (typeof module !== 'undefined') module.exports = Catalog;
