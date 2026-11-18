
const $=s=>document.querySelector(s);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const euro=v=>Number(v).toLocaleString('en-GB',{style:'currency',currency:'EUR'});
const n=v=>Number(String(v??'').replace(',','.'));
const round=v=>Math.round((v+Number.EPSILON)*100)/100;
const mat=()=>({Nome:'PLA',Grammi:0,Extra:0,Prezzo:0,Bobina:''});
const part=()=>({Origine:'',Minuti:0,Pezzi:1,Ripetizioni:1,Materiali:[mat()]});
const fresh=()=>({...part(),Titolo:'',Cliente:'',Profilo:'Bambu Lab A1',ProdottiFiniti:1,StampeAggiuntive:[],Componenti:[],Watt:0,WattAms:0,Tariffa:0,Acquisto:0,Vita:3000,Lavoro:0,Paga:0,PostMinuti:0,PostTariffa:0,Altro:0,Ricarico:0,Iva:0});
const blank=()=>({prossimo:1,bobine:[],preventivi:[],profili:['Bambu Lab A1','Bambu Lab X2D'].map(nome=>({nome,Watt:0,WattAms:0,Vita:3000,Acquisto:0}))});
let data=blank(),tab='quote',q=fresh(),active=false,initialSync=true;
const id=v=>String(v).padStart(4,'0');
const value=(path)=>path.split('.').reduce((o,k)=>o[k],q);
function set(path,v){const a=path.split('.');const key=a.pop();a.reduce((o,k)=>o[k],q)[key]=v}
let msgTimer,originalQuote=null;
function msg(s){$('#message').textContent=s;clearTimeout(msgTimer);msgTimer=setTimeout(()=>$('#message').textContent='',7500)}
const storageKey='calcolo-stampa-3d.archivio.v1';
function sync(){
 try{
  const raw=localStorage.getItem(storageKey);
  data=raw?JSON.parse(raw):blank();
  active=true;
  if(initialSync){const m=data.profili.find(p=>p.nome===q.Profilo);if(m)applyProfile(m);initialSync=false}
  $('#sync').textContent='Archive on this device';render();
 }catch(e){active=false;$('#sync').textContent='Archive unavailable';msg(e.message)}
}
async function save(change){
 if(!active)throw Error('Local archive unavailable.');
 const current=localStorage.getItem(storageKey);
 const next=current?JSON.parse(current):blank();
 change(next);
 localStorage.setItem(storageKey,JSON.stringify(next));
 data=next;
}
function input(label,path,type='number'){return '<label>'+label+'<input data-bind="'+path+'" type="'+type+'" '+(type==='number'?'min="0" step="any" inputmode="decimal"':'')+' value="'+esc(value(path))+'"></label>'}
const fields=items=>'<div class="fields">'+items.join('')+'</div>';
const btn=(label,action,primary=false)=>'<button type="button" data-action="'+action+'" '+(primary?'class="primary"':'')+'>'+label+'</button>';
function select(label,path,options){return '<label>'+label+'<select data-bind="'+path+'">'+options.map(([v,name])=>'<option value="'+esc(v)+'" '+(String(v)===String(value(path))?'selected':'')+'>'+esc(name)+'</option>').join('')+'</select></label>'}
const machine=[['Average power (W)','Watt'],['Additional AMS (W)','WattAms'],['Printer purchase price (€)','Acquisto'],['Useful life (h)','Vita']];
function maintenance(m){
 const ricambi=(m.Usura??[]).reduce((total,r)=>total+n(r.prezzo)/n(r.ore),0);
 return ricambi+(n(m.BudgetOre)>0?n(m.BudgetRiparazioni)/n(m.BudgetOre):0);
}
function ammortamento(m){
 if(n(m.OreResidue)>0)return (n(m.ValoreResiduo)+n(m.Migliorie))/n(m.OreResidue);
 return n(m.Acquisto)/n(m.Vita);
}
const numeroPreventivo=v=>Number.isSafeInteger(v)&&v>0?'No. '+String(v).padStart(4,'0'):'Number assigned on save';
function assegnaNumeri(archivio){
 let prossimo=Math.max(1,n(archivio.prossimoPreventivo),...archivio.preventivi.map(p=>n(p.Numero)+1));
 for(const p of [...archivio.preventivi].reverse()){
  if(!Number.isSafeInteger(p.Numero)||p.Numero<=0)p.Numero=prossimo++;
 }
 archivio.prossimoPreventivo=prossimo;
}
function fotoHtml(img,nome){
 return typeof img==='string'&&/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(img)
  ?'<img class="foto-parte" src="'+img+'" alt="'+esc(nome||'Part photo')+'">' : '';
}
async function preparaFoto(file){
 if(!file.type.startsWith('image/'))throw Error('Choose a photo.');
 const url=URL.createObjectURL(file),img=new Image();
 try{
  img.src=url;await img.decode();
  const canvas=document.createElement('canvas');
  let lato=480;
  while(lato>=120){
   const scale=Math.min(1,lato/Math.max(img.width,img.height));
   canvas.width=Math.max(1,Math.round(img.width*scale));canvas.height=Math.max(1,Math.round(img.height*scale));
   const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);
   ctx.drawImage(img,0,0,canvas.width,canvas.height);
   const foto=canvas.toDataURL('image/jpeg',0.68);
   if(foto.length<=26000)return foto;
   lato=Math.floor(lato*0.75);
  }
  throw Error('Photo too large. Choose a simpler image.');
 }finally{URL.revokeObjectURL(url)}
}
function datiStampante(p){
 const m=p.Macchina??q;
 return esc(m.nome??q.Profilo)+' · '+esc(m.Watt)+' W (printer) · '+esc(m.WattAms)+' W (AMS) · '+euro(m.Acquisto)+' (purchase) · '+esc(m.Vita)+' h · '+esc(m.Tariffa??q.Tariffa)+' €/kWh';
}
function printEditor(p,j){
 const prefix=j===q.StampeAggiuntive.length?'':'StampeAggiuntive.'+j+'.';
 const machines=[['','Quote’s default printer'],...data.profili.map(m=>[m.nome,m.nome])];
 if(p.Macchina&&!machines.some(([v])=>v===p.Macchina.nome))machines.push([p.Macchina.nome,p.Macchina.nome+' (from archive)']);
 const machineSelect='<label>Printer for this part<select data-machine="'+j+'">'+machines.map(([v,l])=>'<option value="'+esc(v)+'" '+(v===(p.Macchina?.nome??'')?'selected':'')+'>'+esc(l)+'</option>').join('')+'</select></label>';
 const materials=p.Materiali.map((m,i)=>{
  const k=prefix+'Materiali.'+i+'.';
  const options=[['','No spool'],...data.bobine.map(b=>[id(b.Id),id(b.Id)+' · '+b.Materiale+' · '+b.Colore+(b.Codice?' · '+b.Codice:'')+' · '+(n(b.Lordo)-n(b.Tara))+' g'])];
  if(m.Bobina&&!options.some(([v])=>v===m.Bobina))options.push([m.Bobina,'Spool '+m.Bobina+' rimossa']);
  return '<div class="row">'+fields([input('Filament',k+'Nome','text'),input('Grams',k+'Grams'),input('Additional AMS (g)',k+'Extra'),input('€/kg',k+'Prezzo'),select('Spool',k+'Bobina',options)])+btn('Remove filament','rmMat:'+j+':'+i)+'</div>';
 }).join('');
 return '<fieldset><legend>Part '+(j+1)+'</legend>'+fields([input('Name or file',prefix+'Origine','text'),input('Duration (min)',prefix+'Minuti'),input('Pieces per run',prefix+'Pezzi'),input('Runs',prefix+'Ripetizioni'),machineSelect])+'<p data-printer-summary="'+j+'"><strong>Printer used for this part:</strong> <span>'+datiStampante(p)+'</span></p><div class="foto-controllo">'+fotoHtml(p.Foto,p.Origine)+'<label>Part photo<input type="file" accept="image/*" data-photo="'+j+'"></label>'+(p.Foto?btn('Remove photo','rmPhoto:'+j):'')+'</div>'+materials+'<div class="actions">'+btn('Add filament','mat:'+j)+btn('Record usage','consume:'+j)+(prefix?btn('Remove part','rmPart:'+j):'')+'</div></fieldset>';
}
function quote(){
 const profiles=data.profili.map(p=>[p.nome,p.nome]);if(!profiles.some(([v])=>v===q.Profilo))profiles.push([q.Profilo,q.Profilo]);
 return '<section class="card"><h2>Quote · '+numeroPreventivo(q.Numero)+'</h2>'+fields([input('Product name','Titolo','text'),input('Customer','Cliente','text'),input('Finished products','ProdottiFiniti'),select('Default printer','Profilo',profiles)])+'<div class="actions">'+btn('Manage printers','managePrinters')+'</div>'+'<div class="import-panel"><label for="files"><strong>Import print files</strong><span>Select one or more sliced G-code or 3MF files.</span></label><input id="files" type="file" multiple accept=".gcode,.3mf"></div></section>'+
  [...q.StampeAggiuntive,q].map(printEditor).join('')+btn('Add part','part')+
  '<fieldset><legend>Extra components</legend>'+q.Componenti.map((c,i)=>fields([input('Component','Componenti.'+i+'.Nome','text'),input('Item code','Componenti.'+i+'.Codice','text'),input('Supplier','Componenti.'+i+'.Fornitore','text'),input('Quantity','Componenti.'+i+'.Quantita'),input('Unit price (€)','Componenti.'+i+'.Prezzo')])+btn('Remove component','rmComp:'+i)).join('')+btn('Add component','comp')+'</fieldset>'+
  '<fieldset><legend>Default printer costs and labour</legend>'+fields([...machine,['Electricity (€/kWh)','Tariffa'],['Setup (min)','Lavoro'],['Setup (€/h)','Paga'],['Cleaning and finishing (min)','PostMinuti'],['Post-processing (€/h)','PostTariffa'],['Other costs (€)','Altro'],['Markup (%)','Ricarico'],['VAT (%)','Iva']].map(([a,b])=>input(a,b)))+'</fieldset>'+
  '<section class="card"><h2>Summary</h2><div id="total"></div><div class="actions">'+btn('Calculate','calc')+btn('Save quote','save',true)+btn(q.Numero?'Export quote':'Save and export','export')+btn('New quote','new')+'</div></section>';
}
function costs(check=true){
 if(check&&(!q.Titolo.trim()||!Number.isInteger(n(q.ProdottiFiniti))||n(q.ProdottiFiniti)<1||n(q.Vita)<=0))throw Error('Check the product name, finished product count and printer useful life.');
 const lines=[...q.StampeAggiuntive,q].map((p,i)=>{
  const time=n(p.Minuti),rep=n(p.Ripetizioni??1),pieces=n(p.Pezzi);
  if(check&&(!(time>0)||!(rep>0)||!(pieces>0)||!Number.isInteger(rep)||!Number.isInteger(pieces)||!p.Materiali.some(m=>n(m.Grammi)>0)))throw Error('Check duration, quantity and filament grams for part '+(i+1)+'.');
  const film=p.Materiali.reduce((s,m)=>s+(n(m.Grammi)+n(m.Extra))*n(m.Prezzo)/1000,0);
  const m=p.Macchina??q, tariffa=m.Tariffa??q.Tariffa;
  const ore=rep*time/60;
  const quotaAcquisto=n(m.Acquisto)/n(m.Vita);
  const stampa=rep*film+ore*((n(m.Watt)+n(m.WattAms))*n(tariffa)/1000+quotaAcquisto);
  const costiInterni=ore*(maintenance(m)+ammortamento(m)-quotaAcquisto);
  return [(p.Origine||'Part '+(i+1))+' · '+(m.nome??q.Profilo),pieces*rep,stampa,p.Foto,costiInterni];
 });
 const costoEsercizio=lines.reduce((s,r)=>s+r[4],0);
 for(const c of q.Componenti)lines.push([c.Nome+(c.Codice?' · Code '+c.Codice:''),n(c.Quantita),n(c.Prezzo)*n(c.Quantita)]);
 if(n(q.Lavoro))lines.push(['Setup',q.Lavoro+' min',n(q.Lavoro)*n(q.Paga)/60]);
 if(n(q.PostMinuti))lines.push(['Cleaning and finishing',q.PostMinuti+' min',n(q.PostMinuti)*n(q.PostTariffa)/60]);
 if(n(q.Altro))lines.push(['Other costs','',n(q.Altro)]);
 if(lines.some(x=>!Number.isFinite(x[2])||x[2]<0))throw Error('Enter valid numeric values.');
 let acc=0,net=0;const rows=lines.map(([name,qty,price,foto])=>{acc+=price*(1+n(q.Ricarico)/100);const next=round(acc), amount=round(next-net);net=next;return [name,qty,amount,foto]});
 net=round(acc+costoEsercizio*(1+n(q.Ricarico)/100));
 const tax=round(net*n(q.Iva)/100),total=round(net+tax);
 return {rows,net,tax,total,unit:total/n(q.ProdottiFiniti)};
}
function showTotal(x){
 $('#total').innerHTML='<div class="total">'+euro(x.total)+'</div><p>'+euro(x.unit)+' per finished product · VAT '+euro(x.tax)+'</p>'+x.rows.map(([a,b,c])=>'<div class="row">'+esc(a)+' · '+esc(b)+' · '+euro(c)+'</div>').join('');
}
function spools(){
 return '<section class="card"><h2>Spools</h2>'+btn('New spool','spool')+data.bobine.map(b=>'<div class="row"><strong>#'+id(b.Id)+' '+esc(b.Materiale+' · '+b.Colore)+'</strong><p>'+esc(b.Produttore)+(b.Codice?' · Code '+esc(b.Codice):'')+' · '+(n(b.Lordo)-n(b.Tara)).toLocaleString('en-GB')+' g remaining · '+euro(n(b.Prezzo)*1000/n(b.Acquistato))+'/kg</p>'+btn('Edit','spool:'+b.Id)+btn('Delete','rmSpool:'+b.Id)+'</div>').join('')+'</section>';
}
function archive(){return '<section class="card"><h2>Saved quotes</h2>'+data.preventivi.map((p,i)=>'<div class="row"><strong>'+numeroPreventivo(p.Numero)+' · '+esc(p.Titolo)+'</strong><p>'+esc(p.Cliente)+' · '+esc(p.Data)+' · '+euro(p.Esito?.Totale??0)+'</p>'+btn('Open','open:'+i)+'</div>').join('')+'</section>'}
const printerFields=[...machine,['Electricity rate (€/kWh)','Tariffa']];
const costFields=[
 ['Repair budget (€)','BudgetRiparazioni'],['Hours covered by budget','BudgetOre'],
 ['Book value before improvements (€)','ValoreResiduo'],['Capitalisable improvement cost (€)','Migliorie'],['Remaining useful life (hours)','OreResidue']
];
function applyProfile(profile){
 for(const [,key] of machine)q[key]=profile[key];
 if(profile.Tariffa!=null)q.Tariffa=profile.Tariffa;
 q.Usura=structuredClone(profile.Usura??[]);
 for(const [,key] of costFields)q[key]=profile[key]??0;
}
function printerForm(existing){
 const dialog=document.createElement('dialog');
 dialog.innerHTML='<form class="card"><h2>'+(existing?'Edit printer':'Add printer')+'</h2>'+fields([
  '<label>Printer name<input name="nome" required maxlength="100" value="'+esc(existing?.nome??'')+'"></label>',
  ...printerFields.map(([label,key])=>'<label>'+label+'<input type="number" inputmode="decimal" min="'+(key==='Vita'?1:0)+'" step="any" name="'+key+'" required value="'+esc(existing?.[key]??(key==='Vita'?3000:0))+'"></label>')
 ])+'<fieldset><legend>Repair budget and depreciation</legend>'+fields(costFields.map(([label,key])=>'<label>'+label+'<input type="number" min="0" step="any" required name="'+key+'" value="'+esc(existing?.[key]??0)+'"></label>'))+'<p>Use the repair budget for work not covered by the parts listed below. Enter book value, improvements and remaining hours to recalculate depreciation.</p></fieldset><fieldset><legend>Maintenance and spare parts</legend><div data-usura></div><button type="button" data-add-usura>Add part or service</button><p><output></output> maintenance per print hour</p></fieldset><p>Use average power during printing. Enter additional AMS power only if measured separately.</p><p role="alert"></p><div class="actions"><button class="primary">Save printer</button><button type="button">Cancel</button></div></form>';
 document.body.append(dialog);
 const form=dialog.querySelector('form');
 const usura=form.querySelector('[data-usura]');
 const leggiUsura=()=>Array.from(usura.children,row=>({nome:row.querySelector('[data-nome]').value.trim(),codice:row.querySelector('[data-codice]').value.trim(),prezzo:n(row.querySelector('[data-prezzo]').value),ore:n(row.querySelector('[data-ore]').value)}));
 const aggiornaUsura=()=>{
  const righe=leggiUsura().filter(r=>r.ore>0);
  form.querySelector('output').textContent=euro(maintenance({Usura:righe,BudgetRiparazioni:form.elements.BudgetRiparazioni.value,BudgetOre:form.elements.BudgetOre.value}));
 };
 function aggiungiUsura(r={}){
  const row=document.createElement('div');row.className='row';
  row.innerHTML=fields([
   '<label>Part or service<input required data-nome value="'+esc(r.nome??'')+'"></label>',
   '<label>Item code<input data-codice value="'+esc(r.codice??'')+'"></label>',
   '<label>Cost (€)<input type="number" min="0" step="any" required data-prezzo value="'+esc(r.prezzo??'')+'"></label>',
   '<label>Interval (hours)<input type="number" min="0.01" step="any" required data-ore value="'+esc(r.ore??'')+'"></label>'
  ])+'<button type="button">Remove spare part</button>';
  row.querySelector('button').onclick=()=>{row.remove();aggiornaUsura()};
  usura.append(row);aggiornaUsura();
 }
 form.querySelector('[data-add-usura]').onclick=()=>aggiungiUsura();
 form.addEventListener('input',aggiornaUsura);
 for(const r of existing?.Usura??[])aggiungiUsura(r);
 aggiornaUsura();
 dialog.querySelector('.actions button[type=button]').onclick=()=>dialog.close();
 dialog.addEventListener('close',()=>dialog.remove());
 form.onsubmit=async e=>{
  e.preventDefault();
  const values=Object.fromEntries(new FormData(form));
  const nome=values.nome.trim();
  const profile={nome,Usura:leggiUsura(),...Object.fromEntries([...printerFields,...costFields].map(([,k])=>[k,n(values[k])]))};
  try{
   if(!nome)throw Error('Enter the printer name.');
   if(profile.BudgetRiparazioni>0&&profile.BudgetOre<=0)throw Error('Enter the hours covered by the repair budget.');
   if((profile.Migliorie>0||profile.ValoreResiduo>0)&&profile.OreResidue<=0)throw Error('Enter the remaining useful life in hours.');
   if(profile.Usura.some(r=>!r.nome||!(r.ore>0)))throw Error('Check the name and interval of each spare part.');
   await save(d=>{
    if(d.profili.some(p=>p.nome!==existing?.nome&&p.nome.toLocaleLowerCase('it')===nome.toLocaleLowerCase('it')))throw Error('A printer with that name already exists.');
    if(existing)d.profili=d.profili.filter(p=>p.nome!==existing.nome);
    d.profili.push(profile);
   });
   q.Profilo=nome;applyProfile(profile);dialog.close();render();msg('Profile saved and selected in the quote.');
  }catch(err){dialog.querySelector('[role=alert]').textContent=err.message}
 };
 dialog.showModal();
}
function settings(){return '<section class="card"><h2>Printers</h2>'+btn('Add printer','printer',true)+data.profili.map((p,i)=>'<div class="row"><strong>'+esc(p.nome)+'</strong><p>'+esc(p.Watt)+' W printer · '+esc(p.WattAms)+' W Additional AMS · '+euro(p.Acquisto)+' purchase · '+esc(p.Vita)+' hours of useful life · '+euro(maintenance(p))+'/h maintenance'+(p.Tariffa==null?'':' · '+esc(p.Tariffa)+' €/kWh')+'</p>'+btn('Edit printer','printer:'+i)+btn('Delete profile','rmPrinter:'+i)+'</div>').join('')+'</section><section class="card"><h2>Backup and data transfer</h2> <p>'+btn('Download backup','backup')+'</p><label>Restore a backup<input id="restore" type="file" accept=".json"></label><label>Select bobine.json, profili.json and quote JSON files<input id="legacy" type="file" multiple accept=".json"></label><p>Windows data is in the folder %LOCALAPPDATA%\\CalcoloStampa3D.</p></section>'}
function render(){
 $('#view').innerHTML={quote,spools,archive,settings}[tab]();
 for(const b of document.querySelectorAll('[data-tab]')){if(b.dataset.tab===tab)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current')}
}
function spoolForm(existing){
 const dialog=document.createElement('dialog');
 const props=[['Produttore','Brand'],['Materiale','Filament type'],['Colore','Colour'],['Fornitore','Supplier'],['Diametro','Diameter (mm)'],['Codice','Item code'],['Lotto','Batch'],['Data','Purchase date'],['Acquistato','Purchased net weight (g)'],['Lordo','Current gross weight (g)'],['Tara','Tare (g)'],['Prezzo','Price per spool (€)'],['Note','Notes']];
 const numeric=['Acquistato','Lordo','Tara','Prezzo','Diametro'];
 dialog.innerHTML='<form class="card"><h2>'+(existing?'Edit spool':'New spool')+'</h2>'+fields(props.map(([k,l])=>{
  const options=['Produttore','Materiale','Fornitore'].includes(k)?[...new Set([...(k==='Materiale'?['PLA','PETG','TPU','ASA','ABS']:[]),...data.bobine.map(b=>b[k]).filter(Boolean)])]:[];
  return '<label>'+l+'<input name="'+k+'" value="'+esc(existing?.[k]??(k==='Diametro'?1.75:''))+'" '+(numeric.includes(k)?'type="number" min="0" step="any" required':(['Produttore','Materiale','Colore'].includes(k)?'required':''))+(options.length?' list="opt'+k+'"':'')+'>'+ (options.length?'<datalist id="opt'+k+'">'+options.map(o=>'<option value="'+esc(o)+'">').join('')+'</datalist>':'')+'</label>';
 }))+(existing?'':'<label>Identical spools<input name="quantita" type="number" min="1" max="999" value="1" required></label>')+'<p>Remaining net weight: <output></output></p><p class="error" role="alert"></p><div class="actions"><button class="primary">Save</button><button type="button">Cancel</button></div></form>';
 document.body.append(dialog);const form=dialog.querySelector('form');
 const update=()=>dialog.querySelector('output').textContent=(n(form.Lordo.value)-n(form.Tara.value)).toLocaleString('en-GB')+' g';
 form.addEventListener('input',update);update();
 dialog.querySelector('button[type=button]').onclick=()=>dialog.close();
 dialog.addEventListener('close',()=>dialog.remove());
 form.onsubmit=async e=>{
  e.preventDefault();const b=Object.fromEntries(new FormData(form)),qty=n(b.quantita||1);delete b.quantita;
  numeric.forEach(k=>b[k]=n(b[k]));
  try{
   if(b.Lordo<b.Tara||b.Acquistato<=0||b.Diametro<=0)throw Error('Check gross weight, tare, purchased weight and diameter.');
   await save(d=>{if(existing){const i=d.bobine.findIndex(x=>x.Id===existing.Id);if(i<0)throw Error('Spool removed.');d.bobine[i]={...b,Id:existing.Id}}else for(let i=0;i<qty;i++)d.bobine.push({...b,Id:d.prossimo++})});
   dialog.close();render();msg('Spools saved.');
  }catch(err){dialog.querySelector('.error').textContent=err.message}
 };
 dialog.showModal();
}
async function salvaPreventivo(x){
    const preventivo={...structuredClone(q),Data:new Date().toLocaleString('en-GB'),Esito:{Totale:x.total}};
    await save(d=>{
     const i=d.preventivi.findIndex(p=>preventivo.Numero?p.Numero===preventivo.Numero:
      originalQuote&&p.Titolo===originalQuote.Titolo&&p.Data===originalQuote.Data);
     if(preventivo.Numero&&i<0)throw Error('Quote not found in the archive.');
     if(i>=0)d.preventivi[i]=preventivo;else d.preventivi.unshift(preventivo);
     assegnaNumeri(d);
    });
    q.Numero=preventivo.Numero;originalQuote=null;
}
function exportQuote(x){
 const doc='<!doctype html><html lang="en"><meta charset="utf-8"><title>'+esc(q.Titolo)+'</title><style>body{font:16px system-ui;max-width:850px;margin:40px auto;padding:20px;color:#14243C}table{border-collapse:collapse;width:100%}th,td{padding:12px;text-align:left;border-bottom:1px solid #CBD7EA}td{vertical-align:middle}.foto-parte{display:block;max-width:120px;max-height:92px;margin-bottom:6px}tr{break-inside:avoid}</style><h1>'+numeroPreventivo(q.Numero)+' · '+esc(q.Titolo)+'</h1><p>3D printing quote · '+esc(q.Cliente)+'</p><table><thead><tr><th>Item</th><th>Quantity</th><th>Including markup, excluding VAT</th></tr></thead><tbody>'+x.rows.map(([a,b,c,foto])=>'<tr><td>'+fotoHtml(foto,a)+esc(a)+'</td><td>'+esc(b)+'</td><td>'+euro(c)+'</td></tr>').join('')+'</tbody></table><p >Subtotal '+euro(x.net)+' · VAT '+euro(x.tax)+'</p><h2 >Total '+euro(x.total)+'</h2><p>'+euro(x.unit)+' per finished product</p></html>';
 const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([doc],{type:'text/html'}));a.download='Quote '+q.Titolo+'.html';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);
}
function gcode(text,name){
 const time=text.match(/total estimated time\s*:\s*([^;\r\n]+)/i)?.[1]??text.match(/^;\s*estimated printing time(?: \(normal mode\))?\s*[:=]\s*([^;\r\n]+)/im)?.[1]??'';
 const seconds=[...time.matchAll(/(\d+(?:\.\d+)?)\s*([dhms])/gi)].reduce((s,m)=>s+n(m[1])*({d:86400,h:3600,m:60,s:1}[m[2].toLowerCase()]),0);
 const types=(text.match(/^;\s*filament_type\s*=\s*([^\r\n]+)/im)?.[1]??'').split(';');
 const weights=(text.match(/^;\s*(?:total )?filament used \[g\]\s*[:=]\s*([\d., ]+)/im)?.[1]??'').split(',').map(n);
 const total=n(text.match(/^;\s*total filament weight \[g\]\s*[:=]\s*([\d.]+)/im)?.[1]);
 let material=weights.map((w,i)=>({...mat(),Nome:types[i]?.trim()||'Filament '+(i+1),Grammi:w})).filter(m=>m.Grammi>0);
 if(total>0&&Math.abs(total-material.reduce((s,m)=>s+m.Grammi,0))>.05)material=[{...mat(),Nome:types.length===1&&types[0].trim()||'Exported total',Grammi:total}];
 return {...part(),Origine:name,Minuti:seconds/60,Materiali:material.length?material:[mat()]};
}
async function zipEntries(file){
 const v=new DataView(await file.arrayBuffer()), decoder=new TextDecoder();let end=v.byteLength-22;
 while(end>=Math.max(0,v.byteLength-65557)&&v.getUint32(end,true)!==0x06054b50)end--;
 if(end<0||v.getUint32(end,true)!==0x06054b50)throw Error('Invalid 3MF archive.');
 let p=v.getUint32(end+16,true);const entries=new Map();
 for(let i=0;i<v.getUint16(end+10,true);i++){
  if(v.getUint32(p,true)!==0x02014b50)throw Error('Invalid 3MF archive.');
  const size=v.getUint32(p+20,true),plain=v.getUint32(p+24,true),l=v.getUint16(p+28,true),method=v.getUint16(p+10,true),offset=v.getUint32(p+42,true);
  const name=decoder.decode(new Uint8Array(v.buffer,p+46,l));
  if(/^Metadata\/(?:slice_info\.config|plate_\d+\.gcode)$/i.test(name))entries.set(name,async()=>{
   if(plain>256e6)throw Error('Build plate is too large.');
   const pos=offset+30+v.getUint16(offset+26,true)+v.getUint16(offset+28,true);
   const bytes=new Uint8Array(v.buffer,pos,size);
   if(method===0)return decoder.decode(bytes);
   if(method!==8)throw Error('Unsupported 3MF compression.');
   return new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).text();
  });
  p+=46+l+v.getUint16(p+30,true)+v.getUint16(p+32,true);
 }
 return entries;
}
async function readFile(file){
 if(!file.name.toLowerCase().endsWith('.3mf'))return [gcode(await file.text(),file.name)];
 const entries=await zipEntries(file),parts=new Map();
 if(entries.has('Metadata/slice_info.config')){
  const xml=new DOMParser().parseFromString(await entries.get('Metadata/slice_info.config')(),'application/xml');
  for(const p of xml.querySelectorAll('plate')){
   const get=k=>p.querySelector('metadata[key="'+k+'"]')?.getAttribute('value');
   const idx=get('index');if(!idx)continue;
   const materials=[...p.querySelectorAll('filament')].map(f=>({...mat(),Nome:[f.getAttribute('type'),f.getAttribute('color')].filter(Boolean).join(' ')||'Filament',Grammi:n(f.getAttribute('used_g'))})).filter(m=>m.Grammi>0);
   if(!materials.length&&n(get('weight'))>0)materials.push({...mat(),Nome:'Exported total',Grammi:n(get('weight'))});
   parts.set(idx,{...part(),Origine:file.name+' · Plate '+idx,Minuti:n(get('prediction'))/60,Materiali:materials});
  }
 }
 for(const [name,read] of entries){
  const idx=name.match(/plate_(\d+)\.gcode$/i)?.[1];if(!idx)continue;
  const p=parts.get(idx);if(p?.Minuti&&p.Materiali.length)continue;
  const found=gcode(await read(),file.name+' · Plate '+idx);
  if(!p)parts.set(idx,found);else {p.Minuti ||= found.Minuti;if(!p.Materiali.length)p.Materiali=found.Materiali}
 }
 if(!parts.size)throw Error('The 3MF contains no sliced plates.');
 return [...parts.values()].map(p=>p.Materiali.length?p:{...p,Materiali:[mat()]});
}
async function legacy(files){
 const values=await Promise.all(Array.from(files,async f=>[f.name,JSON.parse((await f.text()).replace(/^\uFEFF/,''))]));
 await save(d=>{
  for(const [name,j] of values){
   if(Array.isArray(j.Bobine)){
    if(d.bobine.length)throw Error('Import Windows spools into an empty spool inventory to preserve their IDs.');
    d.bobine=j.Bobine;d.prossimo=Math.max(n(j.Prossimo),1,...j.Bobine.map(b=>n(b.Id)+1));
   }else if(name.toLowerCase()==='profili.json'){
    for(const [nome,p] of Object.entries(j)){if(!Array.isArray(p)||p.length!==4)throw Error('Invalid Windows printer profile.');
     d.profili=d.profili.filter(x=>x.nome!==nome);d.profili.push({nome,Watt:n(p[0]),WattAms:n(p[1]),Vita:n(p[2]),Acquisto:n(p[3])})}
   }else if(j.Titolo&&Array.isArray(j.Materiali)){
    const normalized={...fresh(),...j,ProdottiFiniti:j.ProdottiFiniti??j.Esito?.PezziTotali??j.Pezzi};
    if(!d.preventivi.some(p=>p.Titolo===j.Titolo&&p.Data===j.Data))d.preventivi.unshift(normalized);
   }else throw Error('Unrecognised Windows file: '+name);
  }
 });
}
$('#view').addEventListener('input',e=>{const el=e.target,p=el.dataset.bind;if(p&&el.tagName!=='SELECT'){
 set(p,el.value);
 if(['Watt','WattAms','Acquisto','Vita','Tariffa'].includes(p)){
  for(const el of document.querySelectorAll('[data-printer-summary]'))el.querySelector('span').innerHTML=datiStampante([...q.StampeAggiuntive,q][n(el.dataset.printerSummary)]);
 }
}});
$('#view').addEventListener('change',async e=>{
 const el=e.target,p=el.dataset.bind;
 try{
  if(el.dataset.machine!==undefined){
   const parte=[...q.StampeAggiuntive,q][n(el.dataset.machine)];
   const profilo=data.profili.find(m=>m.nome===el.value);
   if(profilo)parte.Macchina=structuredClone(profilo);else if(!el.value)delete parte.Macchina;
   render();return;
  }
  if(p&&el.tagName==='SELECT'){
   set(p,el.value);
   if(p==='Profilo'){const m=data.profili.find(x=>x.nome===el.value);if(m)applyProfile(m)}
   if(p.endsWith('.Bobina')){const b=data.bobine.find(x=>id(x.Id)===el.value);if(b){const key=p.slice(0,-6);set(key+'Nome',b.Materiale+' · '+b.Colore);set(key+'Prezzo',n(b.Prezzo)*1000/n(b.Acquistato))}}
   render();
  }
  if(el.dataset.photo!==undefined&&el.files.length){
   const parte=[...q.StampeAggiuntive,q][n(el.dataset.photo)];
   parte.Foto=await preparaFoto(el.files[0]);render();return;
  }
  if(el.id==='files'){
   const parts=(await Promise.all(Array.from(el.files,readFile))).flat();if(!parts.length)return;
   if(!q.StampeAggiuntive.length&&!q.Origine&&!n(q.Minuti)){Object.assign(q,parts.shift())}
   q.StampeAggiuntive.push(...parts);render();msg('Print files imported. Check weights and prices.');
  }
  if(el.id==='restore'&&el.files.length){
   const backup=JSON.parse(await el.files[0].text());
   if(!Array.isArray(backup?.bobine)||!Array.isArray(backup?.preventivi)||!Array.isArray(backup?.profili)||!Number.isSafeInteger(backup?.prossimo))throw Error('Invalid backup.');
   if(confirm('Replace the data on this device with the backup?')){
    await save(d=>Object.assign(d,backup));q=fresh();originalQuote=null;render();msg('Backup restored.');
   }
  }
  if(el.id==='legacy'){await legacy(el.files);render();msg('Windows data imported.')}
 }catch(err){msg(err.message)}
});
$('#view').addEventListener('click',async e=>{
 const a=e.target.closest('[data-action]')?.dataset.action;if(!a)return;
 const [action,i,j]=a.split(':'),p=[...q.StampeAggiuntive,q][n(i)];
 try{
  switch(action){
   case 'backup':{
    const a=document.createElement('a');
    a.href=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));
    a.download='calcolo-stampa-3d-backup.json';a.click();
    setTimeout(()=>URL.revokeObjectURL(a.href),1000);return;
   }
   case 'calc':showTotal(costs());return;
   case 'export':{const x=costs();if(!q.Numero){await salvaPreventivo(x);render();showTotal(x)}exportQuote(x);return}
   case 'save':{
    const x=costs();await salvaPreventivo(x);
    render();showTotal(x);msg('Quote '+numeroPreventivo(q.Numero)+' saved.');return;
   }
   case 'new':if(confirm('Start a new quote?')){q=fresh();originalQuote=null;const m=data.profili.find(x=>x.nome===q.Profilo)??data.profili[0];if(m){q.Profilo=m.nome;applyProfile(m)}else q.Profilo='Manual printer settings'}break;
   case 'part':q.StampeAggiuntive.push(part());break;
   case 'rmPart':q.StampeAggiuntive.splice(n(i),1);break;
   case 'mat':p.Materiali.push(mat());break;
   case 'rmPhoto':delete p.Foto;break;
   case 'rmMat':p.Materiali.splice(n(j),1);break;
   case 'comp':q.Componenti.push({Nome:'',Quantita:1,Prezzo:0});break;
   case 'rmComp':q.Componenti.splice(n(i),1);break;
   case 'open':originalQuote=data.preventivi[n(i)];q={...fresh(),...structuredClone(originalQuote)};tab='quote';break;
   case 'spool':spoolForm(data.bobine.find(b=>b.Id===n(i)));return;
   case 'rmSpool':if(confirm('Delete spool '+id(i)+'?'))await save(d=>d.bobine=d.bobine.filter(b=>b.Id!==n(i)));break;
   case 'rmPrinter':{
    const nome=data.profili[n(i)]?.nome;
    if(!nome||!confirm('Delete the profile '+nome+'?'))return;
    await save(d=>d.profili=d.profili.filter(p=>p.nome!==nome));
    if(q.Profilo===nome&&data.profili.length){q.Profilo=data.profili[0].nome;applyProfile(data.profili[0])}
    else if(q.Profilo===nome)q.Profilo='Manual printer settings';
    msg('Profile deleted.');break;
   }
   case 'managePrinters':tab='settings';break;
   case 'printer':printerForm(i===undefined?undefined:data.profili[n(i)]);return;
   case 'consume':{
    const used=new Map();for(const m of p.Materiali){const g=n(m.Grammi)+n(m.Extra);if(!g)continue;if(!m.Bobina)throw Error('Select all the spools used.');used.set(m.Bobina,(used.get(m.Bobina)??0)+g)}
    if(!used.size)throw Error('Enter filament usage in grams.');
    if(!confirm('Record filament used in a completed print?\n'+[...used].map(([b,g])=>b+': '+g+' g').join('\n')))return;
    await save(d=>{for(const [key,g] of used){const b=d.bobine.find(x=>id(x.Id)===key);if(!b||!(g>0)||n(b.Lordo)-n(b.Tara)<g)throw Error('Spool '+key+' is missing or has insufficient filament.');b.Lordo=n(b.Lordo)-g}});msg('Usage recorded.');break;
   }
  }
  render();
 }catch(err){msg(err.message)}
});
$('nav').onclick=e=>{const t=e.target.dataset.tab;if(t){tab=t;render()}};
$('#reload').onclick=sync;
document.addEventListener('visibilitychange',()=>{if(!document.hidden)sync()});
render();sync();
if('serviceWorker' in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{});
