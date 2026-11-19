
const $=s=>document.querySelector(s);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const euro=v=>Number(v).toLocaleString('en-GB',{style:'currency',currency:'EUR'});
const n=v=>Number(String(v??'').replace(',','.'));
const round=v=>Math.round((v+Number.EPSILON)*100)/100;
const mat=()=>({Nome:'PLA',Grammi:0,Extra:0,Prezzo:0,Bobina:'',Alimentazione:''});
const part=()=>({Origine:'',Minuti:0,Pezzi:1,Ripetizioni:1,Materiali:[mat()]});
const fresh=()=>({...part(),Titolo:'',Cliente:'',Profilo:'Bambu Lab A1',ProdottiFiniti:1,StampeAggiuntive:[],Componenti:[],Watt:0,WattAms:0,Tariffa:0,Acquisto:0,Vita:3000,Lavoro:0,Paga:0,PostMinuti:0,PostTariffa:0,Altro:0,Ricarico:0,Iva:0});
const blank=()=>({prossimo:1,bobine:[],preventivi:[],profili:[]});
let data=blank(),tab='quote',q=fresh(),active=false,initialSync=true;
const id=v=>String(v).padStart(4,'0');
const value=(path)=>path.split('.').reduce((o,k)=>o[k],q);
function set(path,v){const a=path.split('.');const key=a.pop();a.reduce((o,k)=>o[k],q)[key]=v}
let msgTimer,originalQuote=null;
function msg(s){$('#message').textContent=s;clearTimeout(msgTimer);msgTimer=setTimeout(()=>$('#message').textContent='',7500)}
const storageKey='calcolo-stampa-3d.pubblico.v1';
function emptyArchive(){return {prossimo:1,bobine:[],preventivi:[],profili:[]};}
function sync(){
 try{
  const raw=localStorage.getItem(storageKey);
  data=raw?JSON.parse(raw):emptyArchive();
  active=true;
  if(initialSync){const m=data.profili.find(p=>p.nome===q.Profilo);if(m)applyProfile(m);else if(!data.profili.length)q.Profilo='Manual printer settings';initialSync=false}
  $('#sync').textContent='Archive on this device';render();
 }catch(e){active=false;$('#sync').textContent='Archive unavailable';msg(e.message)}
}
async function save(change){
 if(!active)throw Error('Local archive unavailable.');
 const current=localStorage.getItem(storageKey);
 const next=current?JSON.parse(current):emptyArchive();
 change(next);
 localStorage.setItem(storageKey,JSON.stringify(next));
 data=next;
}

function stileColore(value){
 let hex=String(value??'').trim();
 if(/^#[0-9a-f]{3}$/i.test(hex))hex='#'+[...hex.slice(1)].map(c=>c+c).join('');
 if(!/^#[0-9a-f]{6}$/i.test(hex))return '';
 const channels=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255).map(c=>c<=0.04045?c/12.92:Math.pow((c+0.055)/1.055,2.4));
 const luminance=channels[0]*0.2126+channels[1]*0.7152+channels[2]*0.0722;
 return 'background-color:'+hex+';color:'+(luminance>0.179?'#000000':'#FFFFFF')+';font-weight:600';
}


const campiDueDecimali=new Set(['Minuti','Grammi','Extra','Prezzo','Acquistato','Lordo','Tara','Tariffa','Acquisto','Paga','PostTariffa','Altro','BudgetRiparazioni','ValoreResiduo','Migliorie']);
function formattaNumero(value){return Number.isFinite(n(value))?n(value).toFixed(2):value}
function formattaCampi(root){
 for(const el of root.querySelectorAll('input')){
  const path=el.dataset.bind,key=path?.split('.').at(-1)??el.name;
  const prezzoRicambio=el.hasAttribute('data-prezzo');
  if((campiDueDecimali.has(key)||prezzoRicambio)&&el.value.trim()!==''){
   el.value=formattaNumero(el.value);el.step='0.01';
   if(path)set(path,el.value);
  }
 }
}

function input(label,path,type='number'){return '<label'+(path.split('.').at(-1)==='Origine'?' class="nome-file-esteso"':'')+'>'+label+'<input data-bind="'+path+'" style="'+(path.endsWith('.Colore')?stileColore(value(path)):'')+'" type="'+type+'" '+(path.endsWith('.Fornitore')?'list="fornitori" ':'')+' '+(type==='number'?'min="0" step="any" inputmode="decimal"':'')+' value="'+esc(campiDueDecimali.has(path.split('.').at(-1))?formattaNumero(value(path)):value(path))+'"></label>'}
const fields=items=>'<div class="fields">'+items.join('')+'</div>';
const btn=(label,action,primary=false)=>'<button type="button" data-action="'+action+'" '+(primary?'class="primary"':'')+'>'+label+'</button>';
function select(label,path,options){return '<label>'+label+'<select data-bind="'+path+'">'+options.map(([v,name])=>'<option value="'+esc(v)+'" '+(String(v)===String(value(path)??(path.endsWith('.PrezzoIvato')?false:''))?'selected':'')+'>'+esc(name)+'</option>').join('')+'</select></label>'}
const machine=[['Average power (W)','Watt'],['Additional AMS (W)','WattAms'],['Printer purchase price (€)','Acquisto'],['Useful life (h)','Vita']];
function maintenance(m){
 const ricambi=(m.Usura??[]).reduce((total,r)=>total+prezzoNetto(r.prezzo,r.iva,r.prezzoIvato===true||r.prezzoIvato==='true')/n(r.ore),0);
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

function prezzoNetto(prezzo,iva,inclusa){return n(prezzo)/(inclusa?1+n(iva)/100:1)}
const tipiFilamento=['PLA','PLA+','PLA Matte','PLA Silk','PLA-CF','PETG','PETG HF','PETG-CF','TPU 95A','TPU 85A','TPE','ABS','ABS+','ASA','ASA-CF','PA6','PA12','PA-CF','PA-GF','PC','PC-ABS','PCTG','PET','PVA','BVOH','HIPS','PP','PEI','PEEK'];
function articoli(tipo){
 const items=[...(data.catalogo??[]).filter(x=>x.tipo===tipo)];
 if(tipo==='componente')for(const p of data.preventivi)for(const c of p.Componenti??[])items.push({tipo,Nome:c.Nome,Codice:c.Codice??'',Fornitore:c.Fornitore??'',DataAcquisto:c.DataAcquisto??'',Prezzo:c.Prezzo,Iva:c.Iva??0,PrezzoIvato:c.PrezzoIvato??false});
 if(tipo==='ricambio')for(const p of data.profili)for(const r of p.Usura??[])items.push({tipo,Nome:r.nome,Codice:r.codice??'',Fornitore:r.fornitore??'',DataAcquisto:r.dataAcquisto??'',Prezzo:r.prezzo,Iva:r.iva??0,PrezzoIvato:r.prezzoIvato??false,Ore:r.ore});
 const unique=new Map();for(const x of items)if(x.Nome)unique.set([x.Nome,x.Codice,x.Fornitore].join('|'),x);
 return [...unique.values()];
}
function fornitori(){
 return [...new Set([...data.bobine.map(b=>b.Fornitore),...articoli('componente').map(c=>c.Fornitore),...articoli('ricambio').map(c=>c.Fornitore)].filter(Boolean))].sort();
}
function suggerimenti(id,values){return '<datalist id="'+id+'">'+values.map(v=>'<option value="'+esc(v)+'">').join('')+'</datalist>'}
function menuArticoli(tipo,attribute){
 return '<label>Recall item<select '+attribute+'><option value="">Choose a saved item</option>'+articoli(tipo).map((a,i)=>'<option value="'+i+'">'+esc([a.Nome,a.Codice,a.Fornitore].filter(Boolean).join(' · '))+'</option>').join('')+'</select></label>';
}
function memorizzaArticolo(d,a){
 d.catalogo??=[];const key=x=>[x.tipo,x.Nome,x.Codice??'',x.Fornitore??''].join('|');
 d.catalogo=d.catalogo.filter(x=>key(x)!==key(a));d.catalogo.push(a);
}

function printEditor(p,j){
 const prefix=j===q.StampeAggiuntive.length?'':'StampeAggiuntive.'+j+'.';
 const machines=[['','Quote’s default printer'],...data.profili.map(m=>[m.nome,m.nome])];
 if(p.Macchina&&!machines.some(([v])=>v===p.Macchina.nome))machines.push([p.Macchina.nome,p.Macchina.nome+' (from archive)']);
 const machineSelect='<label>Printer for this part<select data-machine="'+j+'">'+machines.map(([v,l])=>'<option value="'+esc(v)+'" '+(v===(p.Macchina?.nome??'')?'selected':'')+'>'+esc(l)+'</option>').join('')+'</select></label>';
 const prefissoMacchina=p.Macchina?prefix+'Macchina.':'';
 const parametriMacchina='<details class="parametri-stampante"><summary>Printer parameters</summary>'+fields([...machine,['Electricity (€/kWh)','Tariffa']].map(([label,key])=>input(label,prefissoMacchina+key)))+'</details>';
 const materials=p.Materiali.map((m,i)=>{
  const k=prefix+'Materiali.'+i+'.';
  const options=[['','No spool'],...data.bobine.filter(b=>!nascondiEsaurite||residuo(b)>0||id(b.Id)===m.Bobina).map(b=>[id(b.Id),id(b.Id)+' · '+b.Materiale+' · '+b.Colore+(b.Codice?' · '+b.Codice:'')+' · '+(n(b.Lordo)-n(b.Tara)).toFixed(2)+' g'])];
  if(m.Bobina&&!options.some(([v])=>v===m.Bobina))options.push([m.Bobina,'Spool '+m.Bobina+' rimossa']);
  const primary=data.bobine.find(b=>id(b.Id)===m.Bobina);
  const reserves=[['','No backup'],...data.bobine.filter(b=>stessaBobina(primary,b)&&residuo(b)>0).map(b=>[id(b.Id),id(b.Id)+' · '+b.Materiale+' · '+b.Colore+' · '+residuo(b).toFixed(2)+' g'])];
  if(m.Riserva&&!reserves.some(([v])=>v===m.Riserva))reserves.push([m.Riserva,'Check backup '+m.Riserva]);
  return '<div class="row">'+(m.Slot?'<strong>Filament slot '+esc(m.Slot)+'</strong>':'')+fields([input('Filament',k+'Nome','text'),input('Colour / HEX',k+'Colore','text'),input('Grams',k+'Grammi'),input('Additional waste (g)',k+'Extra'),input('€/kg',k+'Prezzo'),select('Spool',k+'Bobina',options),select('Filament feed',k+'Alimentazione',[['','Not specified'],['AMS','AMS'],['EXT','External spool (EXT)']]),...(m.Alimentazione==='AMS'?[select('Identical AMS backup spool',k+'Riserva',reserves)]:[])])+(m.Alimentazione==='AMS'?'<small>The backup is used for availability and consumption tracking. Enable automatic filament backup on the printer and check AMS compatibility.</small>':'')+btn('Remove filament','rmMat:'+j+':'+i)+'</div>';
 }).join('');
 return '<fieldset class="parte-stampa"><legend>Part '+(j+1)+'</legend>'+fields([input('Name or file',prefix+'Origine','text'),input('Duration (min)',prefix+'Minuti'),input('Pieces per run',prefix+'Pezzi'),input('Runs',prefix+'Ripetizioni'),machineSelect])+(p.AvvisoImportazione?'<p role="alert">'+esc(p.AvvisoImportazione)+'</p>':'')+'<p data-printer-summary="'+j+'"><strong>Printer used for this part:</strong> <span>'+datiStampante(p)+'</span></p>'+parametriMacchina+'<div class="foto-controllo">'+fotoHtml(p.Foto,p.Origine)+'<label>Part photo<input type="file" accept="image/*" data-photo="'+j+'"></label>'+(p.Foto?btn('Remove photo','rmPhoto:'+j):'')+'</div>'+materials+'<div class="actions">'+btn('Add filament','mat:'+j)+btn('Record usage','consume:'+j)+btn('Delete part','rmPart:'+j)+'</div></fieldset>';
}
function quote(){
 const profiles=data.profili.map(p=>[p.nome,p.nome]);if(!profiles.some(([v])=>v===q.Profilo))profiles.push([q.Profilo,q.Profilo]);
 return '<section class="card"><h2>Quote · '+numeroPreventivo(q.Numero)+'</h2>'+fields([input('Product name','Titolo','text'),input('Customer','Cliente','text'),input('Finished products','ProdottiFiniti'),select('Default printer','Profilo',profiles)])+'<div class="actions">'+btn('Manage printers','managePrinters')+'</div>'+'<div class="import-panel"><label for="files"><strong>Import print files</strong><span>Select one or more sliced G-code or 3MF files.</span></label><input id="files" type="file" multiple accept=".gcode,.3mf"></div></section>'+
  [...q.StampeAggiuntive,q].map(printEditor).join('')+btn('Add part','part')+
  '<fieldset class="settore-extra"><legend>Extra materials</legend><p>New purchases default to VAT included. Set the VAT rate or choose VAT excluded. Previous entries keep their original net price.</p>'+q.Componenti.map((c,i)=>'<div class="row">'+menuArticoli('componente','data-component="'+i+'"')+fields([input('Component','Componenti.'+i+'.Nome','text'),input('Item code','Componenti.'+i+'.Codice','text'),input('Supplier','Componenti.'+i+'.Fornitore','text'),input('Purchase date','Componenti.'+i+'.DataAcquisto','date'),input('Purchase VAT (%)','Componenti.'+i+'.Iva'),select('Price type','Componenti.'+i+'.PrezzoIvato',[['true','VAT included'],['false','VAT excluded']]),input('Quantity','Componenti.'+i+'.Quantita'),input('Unit price (€)','Componenti.'+i+'.Prezzo')])+btn('Save item','remember:'+i)+btn('Remove component','rmComp:'+i)+'</div>').join('')+btn('Add component','comp')+'</fieldset>'+
  '<fieldset class="settore-lavorazioni"><legend>Labour and pricing</legend>'+fields([['Setup (min)','Lavoro'],['Setup (€/h)','Paga'],['Cleaning and finishing (min)','PostMinuti'],['Post-processing (€/h)','PostTariffa'],['Other costs (€)','Altro'],['Markup (%)','Ricarico'],['VAT (%)','Iva']].map(([a,b])=>input(a,b)))+'</fieldset>'+
  '<section class="card"><h2>Summary</h2><div id="total"></div><div class="actions">'+btn('Calculate','calc')+btn('Save quote','save',true)+btn(q.Numero?'Export quote':'Save and export','export')+btn('Print / PDF','pdf',true)+btn('New quote','new')+'</div></section>';
}

function eliminaParte(index){
 if(index<q.StampeAggiuntive.length){q.StampeAggiuntive.splice(index,1);return}
 if(index!==q.StampeAggiuntive.length)return;
 const sostituta=q.StampeAggiuntive.pop()??part();
 for(const key of ['Origine','Minuti','Pezzi','Ripetizioni','Materiali','Foto','Macchina','AvvisoImportazione']){
  if(Object.prototype.hasOwnProperty.call(sostituta,key))q[key]=sostituta[key];else delete q[key];
 }
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
  const materialiUsati=p.Materiali.filter(f=>n(f.Grammi)+n(f.Extra)>0);
  const soloEsterno=materialiUsati.length>0&&materialiUsati.every(f=>f.Alimentazione==='EXT');
  const potenzaAms=soloEsterno?0:n(m.WattAms);
  const stampa=rep*film+ore*((n(m.Watt)+potenzaAms)*n(tariffa)/1000+quotaAcquisto);
  const costiInterni=ore*(maintenance(m)+ammortamento(m)-quotaAcquisto);
  return [(p.Origine||'Part '+(i+1))+' · '+(m.nome??q.Profilo),pieces*rep,stampa,p.Foto,costiInterni];
 });
 const costoEsercizio=lines.reduce((s,r)=>s+r[4],0);
 for(const c of q.Componenti)lines.push([c.Nome+(c.Codice?' · Code '+c.Codice:''),n(c.Quantita),prezzoNetto(c.Prezzo,c.Iva,c.PrezzoIvato===true||c.PrezzoIvato==='true')*n(c.Quantita)]);
 if(n(q.Lavoro))lines.push(['Setup',q.Lavoro+' min',n(q.Lavoro)*n(q.Paga)/60]);
 if(n(q.PostMinuti))lines.push(['Cleaning and finishing',q.PostMinuti+' min',n(q.PostMinuti)*n(q.PostTariffa)/60]);
 if(n(q.Altro))lines.push(['Other costs','',n(q.Altro)]);
 if(lines.some(x=>!Number.isFinite(x[2])||x[2]<0))throw Error('Enter valid numeric values.');
 let acc=0,net=0;const rows=lines.map(([name,qty,price,foto])=>{acc+=price*(1+n(q.Ricarico)/100);const next=round(acc), amount=round(next-net);net=next;return [name,qty,amount,foto]});
 net=round(acc+costoEsercizio*(1+n(q.Ricarico)/100));
 const tax=round(net*n(q.Iva)/100),total=round(net+tax);
 const productionCost=lines.reduce((sum,row)=>sum+row[2],costoEsercizio);
 return {rows,net,tax,total,unit:total/n(q.ProdottiFiniti),productionCost,productionUnit:productionCost/n(q.ProdottiFiniti)};
}
function showTotal(x){
 const verifica=pianoConsumi([...q.StampeAggiuntive,q]);
 $('#total').innerHTML='<p><strong>Production cost: '+euro(x.productionCost)+'</strong> · '+euro(x.productionUnit)+' per finished product<br><small>Internal use, before markup and VAT</small></p><div class="total">'+euro(x.total)+'</div><p>'+euro(x.unit)+' per finished product · VAT '+euro(x.tax)+'</p>'+x.rows.map(([a,b,c])=>'<div class="row">'+esc(a)+' · '+esc(b)+' · '+euro(c)+'</div>').join('');
 if(verifica.warnings.length)$('#total').insertAdjacentHTML('afterbegin','<div role="alert" style="padding:14px;border:2px solid #b84e25;background:#fff3e9;margin-bottom:16px"><strong>Check filament availability</strong><ul>'+verifica.warnings.map(w=>'<li>'+esc(w)+'</li>').join('')+'</ul></div>');
}

let nascondiEsaurite=false;
const residuo=b=>Math.max(0,n(b.Lordo)-n(b.Tara));
function stessaBobina(a,b){
 const norm=v=>String(v??'').trim().toLocaleLowerCase();
 return !!a&&!!b&&a.Id!==b.Id&&['Produttore','Materiale','Colore','Diametro'].every(k=>norm(a[k])!==''&&norm(a[k])===norm(b[k]))&&
  ((!a.Codice&&!b.Codice)||norm(a.Codice)===norm(b.Codice));
}
function pianoConsumi(stampe,db=data,ripetute=true){
 const available=new Map(db.bobine.map(b=>[id(b.Id),residuo(b)])),used=new Map(),warnings=[];
 for(const [i,p] of stampe.entries())for(const m of p.Materiali){
  let g=(n(m.Grammi)+n(m.Extra))*(ripetute?n(p.Ripetizioni??1):1);
  if(!(g>0))continue;
  const first=db.bobine.find(b=>id(b.Id)===m.Bobina);
  if(!first){warnings.push('Part '+(i+1)+' · '+m.Nome+': assign a spool to check availability');continue}
  const ids=[m.Bobina];
  if(m.Riserva){
   const backup=db.bobine.find(b=>id(b.Id)===m.Riserva);
   if(m.Alimentazione!=='AMS'||!stessaBobina(first,backup))warnings.push('Invalid AMS backup for '+m.Nome);
   else ids.push(m.Riserva);
  }
  for(const key of ids){
   const amount=Math.min(g,available.get(key)??0);
   if(amount>0){available.set(key,available.get(key)-amount);used.set(key,(used.get(key)??0)+amount);g-=amount}
  }
  if(g>0.000001)warnings.push('Insufficient filament: '+m.Nome+' · missing '+g.toFixed(2)+' g');
 }
 return {used,warnings};
}
function csvCell(value){
 let text=String(value??'');
 if(/^[\s]*[=+@-]/.test(text))text="'"+text;
 return '"'+text.replace(/"/g,'""')+'"';
}
function esportaCsv(tipo){
 const bobine=tipo==='bobine',headers=bobine?['ID','Brand','Filament type','Colour','Code','Supplier','Purchase date','Purchased net g','Gross g','Tare g','Remaining g','Density g/cm3','Purchase price EUR','IVA %','VAT included']:
 ['Item','Code','Supplier','Purchase date','Unit price EUR','IVA %','VAT included'];
 const rows=bobine?data.bobine.filter(b=>!nascondiEsaurite||residuo(b)>0).map(b=>[id(b.Id),b.Produttore,b.Materiale,b.Colore,b.Codice,b.Fornitore,b.Data,n(b.Acquistato).toFixed(2),n(b.Lordo).toFixed(2),n(b.Tara).toFixed(2),residuo(b).toFixed(2),b.Densita??'',n(b.Prezzo).toFixed(2),b.Iva??0,b.PrezzoIvato===true]):
 articoli(tipo).map(a=>[a.Nome,a.Codice,a.Fornitore,a.DataAcquisto,n(a.Prezzo).toFixed(2),a.Iva??0,a.PrezzoIvato===true]);
 const csv='\ufeff'+[headers,...rows].map(row=>row.map(csvCell).join(';')).join('\r\n');
 const link=document.createElement('a'),url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));
 link.href=url;link.download=(bobine?'filamenti':tipo==='ricambio'?'ricambi':'materiale-extra')+'.csv';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}

function spools(){
 return '<section class="card"><h2>Spools</h2>'+btn('New spool','spool')+btn('Print spool inventory','print:bobine')+btn('CSV filaments','csv:bobine')+btn(nascondiEsaurite?'Show empty spools':'Hide empty spools','toggleEmpty')+data.bobine.filter(b=>!nascondiEsaurite||residuo(b)>0).map(b=>'<div class="row"><strong>#'+id(b.Id)+' '+esc(b.Materiale+' · '+b.Colore)+'</strong><p>'+esc(b.Produttore)+(b.Codice?' · Code '+esc(b.Codice):'')+' · '+(n(b.Lordo)-n(b.Tara)).toLocaleString('en-GB',{minimumFractionDigits:2,maximumFractionDigits:2})+' g remaining · '+euro(prezzoNetto(b.Prezzo,b.Iva,b.PrezzoIvato===true)*1000/n(b.Acquistato))+'/kg</p>'+btn('Edit','spool:'+b.Id)+btn('Delete','rmSpool:'+b.Id)+'</div>').join('')+'</section>';
}
function archive(){return '<section class="card"><h2>Saved quotes</h2>'+btn('Print quote list','print:preventivi')+data.preventivi.map((p,i)=>'<div class="row"><strong>'+numeroPreventivo(p.Numero)+' · '+esc(p.Titolo)+'</strong><p>'+esc(p.Cliente)+' · '+esc(p.Data)+' · '+euro(p.Esito?.Totale??0)+'</p>'+btn('Open','open:'+i)+'</div>').join('')+'</section>'}
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
 const usura=form.querySelector('[data-usura]');form.insertAdjacentHTML('beforeend',suggerimenti('fornitori-ricambi',fornitori()));
 const leggiUsura=()=>Array.from(usura.children,row=>({fornitore:row.querySelector('[data-fornitore]').value.trim(),dataAcquisto:row.querySelector('[data-data]').value,iva:n(row.querySelector('[data-iva]').value),nome:row.querySelector('[data-nome]').value.trim(),codice:row.querySelector('[data-codice]').value.trim(),prezzoIvato:row.querySelector('[data-prezzo-ivato]').value==='true',prezzo:n(row.querySelector('[data-prezzo]').value),ore:n(row.querySelector('[data-ore]').value)}));
 const aggiornaUsura=()=>{
  const righe=leggiUsura().filter(r=>r.ore>0);
  form.querySelector('output').textContent=euro(maintenance({Usura:righe,BudgetRiparazioni:form.elements.BudgetRiparazioni.value,BudgetOre:form.elements.BudgetOre.value}));
 };
 function aggiungiUsura(r={}){
  const row=document.createElement('div');row.className='row';
  row.innerHTML=menuArticoli('ricambio','data-recall')+fields([
   '<label>Part or service<input required data-nome value="'+esc(r.nome??'')+'"></label>',
   '<label>Item code<input data-codice value="'+esc(r.codice??'')+'"></label>',
   '<label>Supplier<input data-fornitore list="fornitori-ricambi" value="'+esc(r.fornitore??'')+'"></label>',
   '<label>Purchase date<input data-data type="date" value="'+esc(r.dataAcquisto??'')+'"></label>',
   '<label>Purchase VAT (%)<input data-iva type="number" min="0" max="100" step="any" value="'+esc(r.iva??22)+'"></label>',
   '<label>Price type<select data-prezzo-ivato><option value="true" '+(r.prezzoIvato!==false?'selected':'')+'>VAT included</option><option value="false" '+(r.prezzoIvato===false?'selected':'')+'>VAT excluded</option></select></label>',
   '<label>Cost (€)<input type="number" min="0" step="any" required data-prezzo value="'+esc(r.prezzo??'')+'"></label>',
   '<label>Interval (hours)<input type="number" min="0.01" step="any" required data-ore value="'+esc(r.ore??'')+'"></label>'
  ])+'<button type="button">Remove spare part</button>';
  row.querySelector('[data-recall]').onchange=e=>{
   const a=articoli('ricambio')[n(e.target.value)];if(e.target.value===''||!a)return;
   for(const [key,v] of Object.entries({nome:a.Nome,codice:a.Codice,fornitore:a.Fornitore,prezzo:a.Prezzo,ore:a.Ore,iva:a.Iva??0,'prezzo-ivato':String(a.PrezzoIvato??false)}))row.querySelector('[data-'+key+']').value=v??'';
   row.querySelector('[data-data]').value='';aggiornaUsura();
  };
  row.querySelector('button').onclick=()=>{row.remove();aggiornaUsura()};
  usura.append(row);aggiornaUsura();
 }
 form.querySelector('[data-add-usura]').onclick=()=>aggiungiUsura();
 form.addEventListener('input',aggiornaUsura);
 for(const r of existing?.Usura??[])aggiungiUsura({...r,prezzoIvato:r.prezzoIvato??false});
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
    for(const r of profile.Usura)memorizzaArticolo(d,{tipo:'ricambio',Nome:r.nome,Codice:r.codice,Fornitore:r.fornitore,Prezzo:r.prezzo,Iva:r.iva,PrezzoIvato:r.prezzoIvato,Ore:r.ore});
   });
   q.Profilo=nome;applyProfile(profile);dialog.close();render();msg('Profile saved and selected in the quote.');
  }catch(err){dialog.querySelector('[role=alert]').textContent=err.message}
 };
 formattaCampi(dialog);
 dialog.showModal();
}

function stampaElenco(tipo){
 const preventivi=tipo==='preventivi';
 const bobine=tipo==='bobine',titolo=preventivi?'Quote list':bobine?'Spool inventory':tipo==='ricambio'?'Spare parts list':'Extra materials list';
 const headers=preventivi?['Number','Date','Product','Customer','Total (€)']:bobine?['ID','Brand','Filament','Colour','Code','Supplier','Purchase date','Gross g','Tare g','Net g','Purchase price','IVA %','Price type']:['Item','Code','Supplier','Purchase date','Unit price','IVA %','Price type'];
 const tipoPrezzo=v=>v?'VAT included':'VAT excluded';
 const rows=preventivi?data.preventivi.map(p=>[numeroPreventivo(p.Numero),p.Data,p.Titolo,p.Cliente,euro(p.Esito?.Totale??0)]):bobine?data.bobine.map(b=>[id(b.Id),b.Produttore,b.Materiale,b.Colore,b.Codice,b.Fornitore,b.Data,formattaNumero(b.Lordo),formattaNumero(b.Tara),formattaNumero(n(b.Lordo)-n(b.Tara)),euro(b.Prezzo),b.Iva??0,tipoPrezzo(b.PrezzoIvato===true)]):articoli(tipo).map(a=>[a.Nome,a.Codice,a.Fornitore,a.DataAcquisto,euro(a.Prezzo),a.Iva??0,tipoPrezzo(a.PrezzoIvato===true)]);
 const html='<!doctype html><html lang="en"><meta charset="utf-8"><title>'+titolo+'</title><style>body{font:13px system-ui;color:#14243c;margin:24px}table{width:100%;border-collapse:collapse}th,td{padding:7px;text-align:left;border-bottom:1px solid #ccd5e2}th{background:#edf2fa}button{padding:10px}@media print{button{display:none}@page{size:landscape;margin:12mm}thead{display:table-header-group}tr{break-inside:avoid}}</style><h1>'+titolo+'</h1><p>'+new Date().toLocaleDateString('en-GB')+' · '+rows.length+' items</p><button onclick="window.print()">Print / Save PDF</button><table><thead><tr>'+headers.map(h=>'<th>'+esc(h)+'</th>').join('')+'</tr></thead><tbody>'+rows.map(row=>'<tr>'+row.map(v=>'<td>'+esc(v??'')+'</td>').join('')+'</tr>').join('')+'</tbody></table></html>';
 const page=window.open('','_blank');if(!page)throw Error('Allow the print window to open in your browser.');
 page.document.open();page.document.write(html);page.document.close();
}

function settings(){return '<section class="card"><h2>CSV export</h2><div class="actions">'+btn('Filaments','csv:bobine')+btn('Spare parts','csv:ricambio')+btn('Extra materials','csv:componente')+'</div></section>'+ '<section class="card"><h2>Printable lists</h2><div class="actions">'+btn('Spools','print:bobine')+btn('Spare parts','print:ricambio')+btn('Extra materials','print:componente')+'</div></section>'+ '<section class="card"><h2>Printers</h2>'+btn('Add printer','printer',true)+data.profili.map((p,i)=>'<div class="row"><strong>'+esc(p.nome)+'</strong><p>'+esc(p.Watt)+' W printer · '+esc(p.WattAms)+' W Additional AMS · '+euro(p.Acquisto)+' purchase · '+esc(p.Vita)+' hours of useful life · '+euro(maintenance(p))+'/h maintenance'+(p.Tariffa==null?'':' · '+esc(p.Tariffa)+' €/kWh')+'</p>'+btn('Edit printer','printer:'+i)+btn('Delete profile','rmPrinter:'+i)+'</div>').join('')+'</section><section class="card"><h2>Backup and data transfer</h2> <p>'+btn('Download backup','backup')+'</p><label>Restore a backup<input id="restore" type="file" accept=".json"></label><label>Select bobine.json, profili.json and quote JSON files<input id="legacy" type="file" multiple accept=".json"></label><p>Windows data is in the folder %LOCALAPPDATA%\\CalcoloStampa3D.</p></section>'}
function render(){
 $('#view').innerHTML={quote,spools,archive,settings}[tab]()+suggerimenti('fornitori',fornitori());
 formattaCampi($('#view'));
 for(const b of document.querySelectorAll('[data-tab]')){if(b.dataset.tab===tab)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current')}
}
function dataCalendario(value){
 const s=String(value??'').trim();
 if(/^\d{4}-\d{2}-\d{2}$/.test(s))return s;
 const match=s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
 return match?match[3]+'-'+match[2].padStart(2,'0')+'-'+match[1].padStart(2,'0'):'';
}
function spoolForm(existing){
 const dialog=document.createElement('dialog');
 const props=[['Produttore','Brand'],['Materiale','Filament type'],['Colore','Colour'],['Fornitore','Supplier'],['Diametro','Diameter (mm)'],['Densita','Density (g/cm³, optional)'],['Codice','Item code'],['Lotto','Batch'],['Data','Purchase date'],['Acquistato','Purchased net weight (g)'],['Lordo','Current gross weight (g)'],['Tara','Tare (g)'],['Prezzo','Price per spool (€)'],['Iva','Purchase VAT (%)'],['Note','Notes']];
 const numeric=['Acquistato','Lordo','Tara','Prezzo','Diametro','Iva'];
 dialog.innerHTML='<form class="card"><h2>'+(existing?'Edit spool':'New spool')+'</h2>'+fields(props.map(([k,l])=>{
  const options=['Produttore','Materiale','Fornitore'].includes(k)?[...new Set([...(k==='Materiale'?tipiFilamento:[]),...(k==='Fornitore'?fornitori():data.bobine.map(b=>b[k]).filter(Boolean))])]:[];
  return '<label>'+l+'<input name="'+k+'" value="'+esc(k==='Data'?dataCalendario(existing?.[k]):existing?.[k]??(k==='Diametro'?1.75:''))+'" '+(k==='Data'?'type="date"':k==='Densita'?'type="number" min="0.001" step="any" inputmode="decimal"':numeric.includes(k)?'type="number" min="0" step="any" required':(['Produttore','Materiale','Colore'].includes(k)?'required':''))+(options.length?' list="opt'+k+'"':'')+'>'+ (options.length?'<datalist id="opt'+k+'">'+options.map(o=>'<option value="'+esc(o)+'">').join('')+'</datalist>':'')+'</label>';
 }))+'<label>Price type<select name="PrezzoIvato"><option value="true" '+(!existing||existing.PrezzoIvato===true?'selected':'')+'>VAT included</option><option value="false" '+(existing&&existing.PrezzoIvato!==true?'selected':'')+'>VAT excluded</option></select></label>'+(existing?'':'<label>Identical spools<input name="quantita" type="number" min="1" max="999" value="1" required></label>')+'<p>Remaining net weight: <output></output></p><p class="error" role="alert"></p><div class="actions"><button class="primary">Save</button><button type="button">Cancel</button></div></form>';
 document.body.append(dialog);const form=dialog.querySelector('form');
 
 let pesoAcquistatoManuale=!!existing;
 form.elements.Acquistato.addEventListener('input',()=>{pesoAcquistatoManuale=true});
 const nettoOutput=dialog.querySelector('output');
 nettoOutput.style.cssText='display:block;font-size:1.3rem;font-weight:700;padding:10px;background:#eaf1fc;border-radius:8px';
 const update=()=>{
  const lordo=form.elements.Lordo,tara=form.elements.Tara;
  const completo=lordo.value.trim()!==''&&tara.value.trim()!=='';
  const netto=n(lordo.value)-n(tara.value);
  lordo.setCustomValidity(completo&&netto<0?'Gross weight must be at least equal to tare.':'');
  nettoOutput.textContent=completo&&netto>=0?netto.toLocaleString('en-GB',{minimumFractionDigits:2,maximumFractionDigits:2})+' g':'—';
  if(completo&&netto>=0&&!pesoAcquistatoManuale)form.elements.Acquistato.value=Number(netto.toFixed(6));
 };

 form.addEventListener('input',update);update();
 dialog.querySelector('button[type=button]').onclick=()=>dialog.close();
 dialog.addEventListener('close',()=>dialog.remove());
 form.onsubmit=async e=>{
  e.preventDefault();const b=Object.fromEntries(new FormData(form)),qty=n(b.quantita||1);delete b.quantita;
  b.Densita=b.Densita.trim()===''?null:n(b.Densita);
  numeric.forEach(k=>b[k]=n(b[k]));b.PrezzoIvato=b.PrezzoIvato==='true';
  try{
   if(b.Densita!==null&&(!Number.isFinite(b.Densita)||b.Densita<=0))throw Error('Enter a positive density or leave it empty.');
   if(b.Lordo<b.Tara||b.Acquistato<=0||b.Diametro<=0)throw Error('Check gross weight, tare, purchased weight and diameter.');
   await save(d=>{if(existing){const i=d.bobine.findIndex(x=>x.Id===existing.Id);if(i<0)throw Error('Spool removed.');d.bobine[i]={...b,Id:existing.Id}}else for(let i=0;i<qty;i++)d.bobine.push({...b,Id:d.prossimo++})});
   dialog.close();render();msg('Spools saved.');
  }catch(err){dialog.querySelector('.error').textContent=err.message}
 };

 if(!existing&&data.bobine.length){
  const label=document.createElement('label');label.innerHTML='Recall a purchased filament<select><option value="">New item</option>'+data.bobine.map((b,i)=>'<option value="'+i+'">'+esc([b.Produttore,b.Materiale,b.Colore,b.Codice].filter(Boolean).join(' · '))+'</option>').join('')+'</select>';
  form.prepend(label);
  label.querySelector('select').onchange=e=>{
   if(e.target.value==='')return;const b=data.bobine[n(e.target.value)];
   for(const k of ['Produttore','Materiale','Colore','Fornitore','Diametro','Densita','Codice','Acquistato','Tara','Prezzo','Iva','Note'])if(form.elements[k])form.elements[k].value=b[k]??'';
   form.elements.Lordo.value=n(b.Acquistato)+n(b.Tara);form.elements.Data.value='';
   form.elements.PrezzoIvato.value=String(b.PrezzoIvato===true);pesoAcquistatoManuale=false;update();
  };
 }
 dialog.showModal();
}
async function salvaPreventivo(x){
    const preventivo={...structuredClone(q),Data:q.Data||new Date().toLocaleString('en-GB'),Esito:{Totale:x.total}};
    await save(d=>{
     const i=d.preventivi.findIndex(p=>preventivo.Numero?p.Numero===preventivo.Numero:
      originalQuote&&p.Titolo===originalQuote.Titolo&&p.Data===originalQuote.Data);
     if(preventivo.Numero&&i<0)throw Error('Quote not found in the archive.');
     if(i>=0)d.preventivi[i]=preventivo;else d.preventivi.unshift(preventivo);
     assegnaNumeri(d);
    });
    q.Numero=preventivo.Numero;q.Data=preventivo.Data;originalQuote=null;
}
function dataPreventivo(value){
 const text=String(value??'').trim();
 const iso=text.match(/^(\d{4})-(\d{2})-(\d{2})/);
 if(iso)return iso[3]+'/'+iso[2]+'/'+iso[1];
 const local=text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
 if(local)return local[1].padStart(2,'0')+'/'+local[2].padStart(2,'0')+'/'+local[3];
 return text;
}
function documentoPreventivo(x){
 return '<!doctype html><html lang="en"><meta charset="utf-8"><title>'+esc(q.Titolo)+'</title><style>body{font:17px system-ui;max-width:1000px;margin:40px auto;padding:20px;color:#14243C}table{border-collapse:collapse;width:100%}th,td{padding:12px;text-align:left;border-bottom:1px solid #CBD7EA}td{vertical-align:middle}.foto-parte{display:block;max-width:120px;max-height:92px;margin-bottom:6px}tr{break-inside:avoid}thead th{font-size:16px;background:#e5edf9;border-bottom:2px solid #2857a5}tbody td{padding:15px 12px}tbody tr:nth-child(even){background:#f3f6fb}h1{padding-bottom:14px;border-bottom:3px solid #2857a5}h2{margin-top:28px;border-top:3px solid #2857a5;padding-top:16px}@media print{body{margin:0;max-width:none;padding:0}button{display:none}thead{display:table-header-group}@page{size:A4;margin:14mm}}</style><button onclick="window.print()" style="padding:10px 16px;margin-bottom:20px">Print / Save PDF</button><h1>'+numeroPreventivo(q.Numero)+' · '+esc(q.Titolo)+'</h1><p><strong>Date:</strong> '+esc(dataPreventivo(q.Data))+'</p><p>3D printing quote · '+esc(q.Cliente)+'</p><table><thead><tr><th>Item</th><th>Quantity</th><th>Amount (€)</th></tr></thead><tbody>'+x.rows.map(([a,b,c,foto])=>'<tr><td>'+fotoHtml(foto,a)+esc(a)+'</td><td>'+esc(b)+'</td><td>'+euro(c)+'</td></tr>').join('')+'</tbody></table><p >Subtotal '+euro(x.net)+' · VAT '+euro(x.tax)+'</p><h2 >Total '+euro(x.total)+'</h2><p>'+euro(x.unit)+' per finished product</p></html>';
}
function exportQuote(x){
 const doc=documentoPreventivo(x);
 const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([doc],{type:'text/html'}));a.download='Quote '+q.Titolo+'.html';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);

}
function gcode(text,name){
 const time=text.match(/total estimated time\s*:\s*([^;\r\n]+)/i)?.[1]??text.match(/^;\s*estimated printing time(?: \(normal mode\))?\s*[:=]\s*([^;\r\n]+)/im)?.[1]??'';
 const seconds=[...time.matchAll(/(\d+(?:\.\d+)?)\s*([dhms])/gi)].reduce((sum,m)=>sum+n(m[1])*({d:86400,h:3600,m:60,s:1}[m[2].toLowerCase()]),0);
 const list=key=>{
  const match=text.match(new RegExp('^;\\s*'+key+'\\s*[:=]\\s*([^\\r\\n]+)','im'));
  return match?match[1].split(/[;,]/).map(v=>v.trim().replace(/^"|"$/g,'')):[];
 };
 const types=list('filament_type'),colors=list('filament_colou?r'),density=list('filament_density').map(n);
 const weights=list('(?:total )?filament used \\[g\\]').map(n);
 const totalWeights=list('total filament weight \\[g\\]').map(n);
 const perFilament=weights.length?weights:totalWeights.length>1?totalWeights:[];
 const total=totalWeights.length===1?totalWeights[0]:totalWeights.reduce((a,b)=>a+b,0);
 let material=perFilament.map((g,i)=>({...mat(),Nome:types[i]||'Filament '+(i+1),Grammi:g,Slot:i+1,Colore:colors[i]??'',Densita:density[i]??null})).filter(m=>m.Grammi>0);
 let warning='';
 if(!material.length&&total>0){
  material=[{...mat(),Nome:types.length===1?types[0]:'Exported total',Grammi:total,Slot:types.length===1?1:null,Colore:types.length===1?colors[0]??'':'',Densita:types.length===1?density[0]??null:null}];
  if(types.length>1||colors.length>1)warning='The G-code contains only total weight. For automatic colour weights import the sliced 3MF, or split the total into colour rows manually.';
 }else if(material.length&&total>0){
  const sum=material.reduce((a,m)=>a+m.Grammi,0);
  if(Math.abs(total-sum)>Math.max(0.1,material.length*0.02))warning='Per-filament weights differ from the exported total. Check all colour weights in the slicer before calculating or recording usage.';
 }
 return {...part(),Origine:name,Minuti:seconds/60,Materiali:material.length?material:[mat()],AvvisoImportazione:warning};
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
   const materials=[...p.querySelectorAll('filament')].map(f=>({...mat(),Nome:[f.getAttribute('type'),f.getAttribute('color')].filter(Boolean).join(' ')||'Filament',Slot:n(f.getAttribute('id')),Colore:f.getAttribute('color')??'',Grammi:n(f.getAttribute('used_g'))})).filter(m=>m.Grammi>0);
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
 if(p.endsWith('.Colore'))el.style.cssText=stileColore(el.value);
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
   if(p.endsWith('.Bobina')||p.endsWith('.Alimentazione')){const prefix=p.slice(0,p.lastIndexOf('.')+1);set(prefix+'Riserva','')}
   if(p==='Profilo'){const m=data.profili.find(x=>x.nome===el.value);if(m)applyProfile(m)}
   if(p.endsWith('.Bobina')){const b=data.bobine.find(x=>id(x.Id)===el.value);if(b){const key=p.slice(0,-6);set(key+'Nome',b.Materiale+' · '+b.Colore);set(key+'Prezzo',n(b.Prezzo)*1000/n(b.Acquistato))}}
   render();
  }
  if(el.dataset.component!==undefined&&el.value!==''){
   const a=articoli('componente')[n(el.value)];
   Object.assign(q.Componenti[n(el.dataset.component)],{Nome:a.Nome,Codice:a.Codice,Fornitore:a.Fornitore,Prezzo:a.Prezzo,Iva:a.Iva??0,PrezzoIvato:a.PrezzoIvato??false,DataAcquisto:''});render();return;
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
   case 'csv':esportaCsv(i);return;
   case 'toggleEmpty':nascondiEsaurite=!nascondiEsaurite;break;
   case 'print':stampaElenco(i);return;
   case 'calc':showTotal(costs());return;
   case 'pdf':{
    const x=costs(),page=window.open('','_blank');
    if(!page)throw Error('Allow the browser to open the print window.');
    try{
     if(!q.Numero){await salvaPreventivo(x);render();showTotal(x)}
     page.document.open();page.document.write(documentoPreventivo(x));page.document.close();
     Promise.all(Array.from(page.document.images,img=>img.complete?Promise.resolve():new Promise(resolve=>{img.onload=resolve;img.onerror=resolve})))
      .then(()=>{if(!page.closed){page.focus();page.print()}});
    }catch(err){page.close();throw err}
    return;
   }
   case 'export':{const x=costs();if(!q.Numero){await salvaPreventivo(x);render();showTotal(x)}exportQuote(x);return}
   case 'save':{
    const x=costs();await salvaPreventivo(x);
    render();showTotal(x);msg('Quote '+numeroPreventivo(q.Numero)+' saved.');return;
   }
   case 'new':if(confirm('Start a new quote?')){q=fresh();originalQuote=null;const m=data.profili.find(x=>x.nome===q.Profilo)??data.profili[0];if(m){q.Profilo=m.nome;applyProfile(m)}else q.Profilo='Manual printer settings'}break;
   case 'part':q.StampeAggiuntive.push(part());break;
   case 'rmPart':{
    if(!confirm('Delete this printed part from the quote?'))return;
    eliminaParte(n(i));break;
   }
   case 'mat':p.Materiali.push(mat());break;
   case 'rmPhoto':delete p.Foto;break;
   case 'rmMat':p.Materiali.splice(n(j),1);break;
   case 'remember':{
    const c=q.Componenti[n(i)];
    if(!c.Nome?.trim()||!Number.isFinite(n(c.Prezzo))||n(c.Prezzo)<0||n(c.Iva)<0||n(c.Iva)>100)throw Error('Check item name, price and purchase VAT.');
    await save(d=>memorizzaArticolo(d,{tipo:'componente',Nome:c.Nome,Codice:c.Codice??'',Fornitore:c.Fornitore??'',DataAcquisto:c.DataAcquisto??'',Prezzo:n(c.Prezzo),Iva:n(c.Iva??0),PrezzoIvato:c.PrezzoIvato===true||c.PrezzoIvato==='true'}));
    msg('Item saved to the menu.');break;
   }
   case 'comp':q.Componenti.push({Nome:'',Quantita:1,Prezzo:0,Iva:22,PrezzoIvato:true,DataAcquisto:'',Fornitore:'',Codice:''});break;
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
    const plan=pianoConsumi([p],data,false);
    if(plan.warnings.length)throw Error(plan.warnings.join('\n'));
    if(!plan.used.size)throw Error('Enter filament usage in grams.');
    if(!confirm('Record usage of one completed print?\n'+[...plan.used].map(([b,g])=>b+': '+g.toFixed(2)+' g').join('\n')))return;
    await save(db=>{
     const current=pianoConsumi([p],db,false);
     if(current.warnings.length)throw Error(current.warnings.join('\n'));
     for(const [key,g] of current.used){const bobina=db.bobine.find(b=>id(b.Id)===key);bobina.Lordo=n(bobina.Lordo)-g}
    });msg('Usage recorded.');break;
   }
  }
  render();
 }catch(err){msg(err.message)}
});
$('nav').onclick=e=>{const t=e.target.dataset.tab;if(t){tab=t;render()}};
$('#reload').onclick=sync;
document.addEventListener('visibilitychange',()=>{if(!document.hidden)sync()});
document.addEventListener('focusout',e=>{
 const el=e.target;
 if(el.tagName!=='INPUT')return;
 const key=el.dataset.bind?.split('.').at(-1)??el.name;
 if((campiDueDecimali.has(key)||el.hasAttribute('data-prezzo'))&&el.value.trim()!==''&&Number.isFinite(n(el.value))){
  el.value=formattaNumero(el.value);
  if(el.dataset.bind)set(el.dataset.bind,el.value);
  el.dispatchEvent(new Event('input',{bubbles:true}));
 }
});
render();sync();
if('serviceWorker' in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{});
