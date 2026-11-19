
const $=s=>document.querySelector(s);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const euro=v=>Number(v).toLocaleString('it-IT',{style:'currency',currency:'EUR'});
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
  if(initialSync){const m=data.profili.find(p=>p.nome===q.Profilo);if(m)applyProfile(m);else if(!data.profili.length)q.Profilo='Stampante manuale';initialSync=false}
  $('#sync').textContent='Archivio su questo dispositivo';render();
 }catch(e){active=false;$('#sync').textContent='Archivio non disponibile';msg(e.message)}
}
async function save(change){
 if(!active)throw Error('Archivio locale non disponibile.');
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

function input(label,path,type='number'){return '<label>'+label+'<input data-bind="'+path+'" style="'+(path.endsWith('.Colore')?stileColore(value(path)):'')+'" type="'+type+'" '+(path.endsWith('.Fornitore')?'list="fornitori" ':'')+' '+(type==='number'?'min="0" step="any" inputmode="decimal"':'')+' value="'+esc(campiDueDecimali.has(path.split('.').at(-1))?formattaNumero(value(path)):value(path))+'"></label>'}
const fields=items=>'<div class="fields">'+items.join('')+'</div>';
const btn=(label,action,primary=false)=>'<button type="button" data-action="'+action+'" '+(primary?'class="primary"':'')+'>'+label+'</button>';
function select(label,path,options){return '<label>'+label+'<select data-bind="'+path+'">'+options.map(([v,name])=>'<option value="'+esc(v)+'" '+(String(v)===String(value(path)??(path.endsWith('.PrezzoIvato')?false:''))?'selected':'')+'>'+esc(name)+'</option>').join('')+'</select></label>'}
const machine=[['Potenza media (W)','Watt'],['AMS extra (W)','WattAms'],['Costo macchina (€)','Acquisto'],['Vita utile (h)','Vita']];
function maintenance(m){
 const ricambi=(m.Usura??[]).reduce((total,r)=>total+prezzoNetto(r.prezzo,r.iva,r.prezzoIvato===true||r.prezzoIvato==='true')/n(r.ore),0);
 return ricambi+(n(m.BudgetOre)>0?n(m.BudgetRiparazioni)/n(m.BudgetOre):0);
}
function ammortamento(m){
 if(n(m.OreResidue)>0)return (n(m.ValoreResiduo)+n(m.Migliorie))/n(m.OreResidue);
 return n(m.Acquisto)/n(m.Vita);
}
const numeroPreventivo=v=>Number.isSafeInteger(v)&&v>0?'N. '+String(v).padStart(4,'0'):'Numero assegnato al salvataggio';
function assegnaNumeri(archivio){
 let prossimo=Math.max(1,n(archivio.prossimoPreventivo),...archivio.preventivi.map(p=>n(p.Numero)+1));
 for(const p of [...archivio.preventivi].reverse()){
  if(!Number.isSafeInteger(p.Numero)||p.Numero<=0)p.Numero=prossimo++;
 }
 archivio.prossimoPreventivo=prossimo;
}
function fotoHtml(img,nome){
 return typeof img==='string'&&/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(img)
  ?'<img class="foto-parte" src="'+img+'" alt="'+esc(nome||'Foto del pezzo')+'">' : '';
}
async function preparaFoto(file){
 if(!file.type.startsWith('image/'))throw Error('Seleziona una foto.');
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
  throw Error('Foto troppo grande. Scegli un’immagine con meno dettagli.');
 }finally{URL.revokeObjectURL(url)}
}
function datiStampante(p){
 const m=p.Macchina??q;
 return esc(m.nome??q.Profilo)+' · '+esc(m.Watt)+' W (stampante) · '+esc(m.WattAms)+' W (AMS) · '+euro(m.Acquisto)+' (acquisto) · '+esc(m.Vita)+' h · '+esc(m.Tariffa??q.Tariffa)+' €/kWh';
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
 return '<label>Richiama articolo<select '+attribute+'><option value="">Scegli un articolo salvato</option>'+articoli(tipo).map((a,i)=>'<option value="'+i+'">'+esc([a.Nome,a.Codice,a.Fornitore].filter(Boolean).join(' · '))+'</option>').join('')+'</select></label>';
}
function memorizzaArticolo(d,a){
 d.catalogo??=[];const key=x=>[x.tipo,x.Nome,x.Codice??'',x.Fornitore??''].join('|');
 d.catalogo=d.catalogo.filter(x=>key(x)!==key(a));d.catalogo.push(a);
}

function printEditor(p,j){
 const prefix=j===q.StampeAggiuntive.length?'':'StampeAggiuntive.'+j+'.';
 const machines=[['','Stampante del preventivo'],...data.profili.map(m=>[m.nome,m.nome])];
 if(p.Macchina&&!machines.some(([v])=>v===p.Macchina.nome))machines.push([p.Macchina.nome,p.Macchina.nome+' (da archivio)']);
 const machineSelect='<label>Stampante per questa parte<select data-machine="'+j+'">'+machines.map(([v,l])=>'<option value="'+esc(v)+'" '+(v===(p.Macchina?.nome??'')?'selected':'')+'>'+esc(l)+'</option>').join('')+'</select></label>';
 const prefissoMacchina=p.Macchina?prefix+'Macchina.':'';
 const parametriMacchina='<details class="parametri-stampante"><summary>Parametri stampante</summary>'+fields([...machine,['Energia (€/kWh)','Tariffa']].map(([label,key])=>input(label,prefissoMacchina+key)))+'</details>';
 const materials=p.Materiali.map((m,i)=>{
  const k=prefix+'Materiali.'+i+'.';
  const options=[['','Nessuna bobina'],...data.bobine.filter(b=>!nascondiEsaurite||residuo(b)>0||id(b.Id)===m.Bobina).map(b=>[id(b.Id),id(b.Id)+' · '+b.Materiale+' · '+b.Colore+(b.Codice?' · '+b.Codice:'')+' · '+(n(b.Lordo)-n(b.Tara)).toFixed(2)+' g'])];
  if(m.Bobina&&!options.some(([v])=>v===m.Bobina))options.push([m.Bobina,'Bobina '+m.Bobina+' rimossa']);
  const primary=data.bobine.find(b=>id(b.Id)===m.Bobina);
  const reserves=[['','Nessuna riserva'],...data.bobine.filter(b=>stessaBobina(primary,b)&&residuo(b)>0).map(b=>[id(b.Id),id(b.Id)+' · '+b.Materiale+' · '+b.Colore+' · '+residuo(b).toFixed(2)+' g'])];
  if(m.Riserva&&!reserves.some(([v])=>v===m.Riserva))reserves.push([m.Riserva,'Riserva da verificare '+m.Riserva]);
  return '<div class="row">'+(m.Slot?'<strong>Filamento slot '+esc(m.Slot)+'</strong>':'')+fields([input('Filamento',k+'Nome','text'),input('Colore / HEX',k+'Colore','text'),input('Grammi',k+'Grammi'),input('Scarto extra (g)',k+'Extra'),input('€/kg',k+'Prezzo'),select('Bobina',k+'Bobina',options),select('Alimentazione',k+'Alimentazione',[['','Da verificare'],['AMS','AMS'],['EXT','Bobina esterna (EXT)']]),...(m.Alimentazione==='AMS'?[select('Bobina identica di riserva AMS',k+'Riserva',reserves)]:[])])+(m.Alimentazione==='AMS'?'<small>La riserva viene usata per disponibilità e scarico dei consumi. Abilita il cambio bobina automatico sulla stampante e verifica la compatibilità nell’AMS.</small>':'')+btn('Rimuovi filamento','rmMat:'+j+':'+i)+'</div>';
 }).join('');
 return '<fieldset class="parte-stampa"><legend>Parte '+(j+1)+'</legend>'+fields([input('Nome o file',prefix+'Origine','text'),input('Durata (min)',prefix+'Minuti'),input('Pezzi per stampa',prefix+'Pezzi'),input('Ripetizioni',prefix+'Ripetizioni'),machineSelect])+(p.AvvisoImportazione?'<p role="alert">'+esc(p.AvvisoImportazione)+'</p>':'')+'<p data-printer-summary="'+j+'"><strong>Dati stampante usata per questo pezzo:</strong> <span>'+datiStampante(p)+'</span></p>'+parametriMacchina+'<div class="foto-controllo">'+fotoHtml(p.Foto,p.Origine)+'<label>Foto del pezzo<input type="file" accept="image/*" data-photo="'+j+'"></label>'+(p.Foto?btn('Rimuovi foto','rmPhoto:'+j):'')+'</div>'+materials+'<div class="actions">'+btn('Aggiungi filamento','mat:'+j)+btn('Registra consumo','consume:'+j)+btn('Elimina parte','rmPart:'+j)+'</div></fieldset>';
}
function quote(){
 const profiles=data.profili.map(p=>[p.nome,p.nome]);if(!profiles.some(([v])=>v===q.Profilo))profiles.push([q.Profilo,q.Profilo]);
 return '<section class="card"><h2>Preventivo · '+numeroPreventivo(q.Numero)+'</h2>'+fields([input('Nome oggetto','Titolo','text'),input('Cliente','Cliente','text'),input('Prodotti finiti','ProdottiFiniti'),select('Stampante','Profilo',profiles)])+'<div class="actions">'+btn('Gestisci stampanti','managePrinters')+'</div>'+'<div class="import-panel"><label for="files"><strong>Importa file di stampa</strong><span>Seleziona uno o più G-code o 3MF elaborati dallo slicer.</span></label><input id="files" type="file" multiple accept=".gcode,.3mf"></div></section>'+
  [...q.StampeAggiuntive,q].map(printEditor).join('')+btn('Aggiungi parte','part')+
  '<fieldset class="settore-extra"><legend>Materiale extra</legend><p>I nuovi acquisti sono IVA compresa. Indica l’aliquota oppure scegli IVA esclusa. Gli articoli precedenti mantengono il prezzo netto originale.</p>'+q.Componenti.map((c,i)=>'<div class="row">'+menuArticoli('componente','data-component="'+i+'"')+fields([input('Componente','Componenti.'+i+'.Nome','text'),input('Codice articolo','Componenti.'+i+'.Codice','text'),input('Fornitore','Componenti.'+i+'.Fornitore','text'),input('Data acquisto','Componenti.'+i+'.DataAcquisto','date'),input('IVA acquisto (%)','Componenti.'+i+'.Iva'),select('Tipo prezzo','Componenti.'+i+'.PrezzoIvato',[['true','IVA compresa'],['false','IVA esclusa']]),input('Quantità','Componenti.'+i+'.Quantita'),input('Prezzo unitario (€)','Componenti.'+i+'.Prezzo')])+btn('Memorizza articolo','remember:'+i)+btn('Rimuovi componente','rmComp:'+i)+'</div>').join('')+btn('Aggiungi componente','comp')+'</fieldset>'+
  '<fieldset class="settore-lavorazioni"><legend>Lavorazioni e prezzo</legend>'+fields([['Preparazione (min)','Lavoro'],['Preparazione (€/h)','Paga'],['Pulizia e finitura (min)','PostMinuti'],['Postproduzione (€/h)','PostTariffa'],['Altri costi (€)','Altro'],['Ricarico (%)','Ricarico'],['IVA (%)','Iva']].map(([a,b])=>input(a,b)))+'</fieldset>'+
  '<section class="card"><h2>Riepilogo</h2><div id="total"></div><div class="actions">'+btn('Calcola','calc')+btn('Salva preventivo','save',true)+btn(q.Numero?'Esporta preventivo':'Salva ed esporta','export')+btn('Stampa / PDF','pdf',true)+btn('Nuovo preventivo','new')+'</div></section>';
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
 if(check&&(!q.Titolo.trim()||!Number.isInteger(n(q.ProdottiFiniti))||n(q.ProdottiFiniti)<1||n(q.Vita)<=0))throw Error('Controlla nome oggetto, prodotti finiti e vita della stampante.');
 const lines=[...q.StampeAggiuntive,q].map((p,i)=>{
  const time=n(p.Minuti),rep=n(p.Ripetizioni??1),pieces=n(p.Pezzi);
  if(check&&(!(time>0)||!(rep>0)||!(pieces>0)||!Number.isInteger(rep)||!Number.isInteger(pieces)||!p.Materiali.some(m=>n(m.Grammi)>0)))throw Error('Controlla durata, quantità e grammi della parte '+(i+1)+'.');
  const film=p.Materiali.reduce((s,m)=>s+(n(m.Grammi)+n(m.Extra))*n(m.Prezzo)/1000,0);
  const m=p.Macchina??q, tariffa=m.Tariffa??q.Tariffa;
  const ore=rep*time/60;
  const quotaAcquisto=n(m.Acquisto)/n(m.Vita);
  const materialiUsati=p.Materiali.filter(f=>n(f.Grammi)+n(f.Extra)>0);
  const soloEsterno=materialiUsati.length>0&&materialiUsati.every(f=>f.Alimentazione==='EXT');
  const potenzaAms=soloEsterno?0:n(m.WattAms);
  const stampa=rep*film+ore*((n(m.Watt)+potenzaAms)*n(tariffa)/1000+quotaAcquisto);
  const costiInterni=ore*(maintenance(m)+ammortamento(m)-quotaAcquisto);
  return [(p.Origine||'Parte '+(i+1))+' · '+(m.nome??q.Profilo),pieces*rep,stampa,p.Foto,costiInterni];
 });
 const costoEsercizio=lines.reduce((s,r)=>s+r[4],0);
 for(const c of q.Componenti)lines.push([c.Nome+(c.Codice?' · Cod. '+c.Codice:''),n(c.Quantita),prezzoNetto(c.Prezzo,c.Iva,c.PrezzoIvato===true||c.PrezzoIvato==='true')*n(c.Quantita)]);
 if(n(q.Lavoro))lines.push(['Preparazione',q.Lavoro+' min',n(q.Lavoro)*n(q.Paga)/60]);
 if(n(q.PostMinuti))lines.push(['Pulizia e finitura',q.PostMinuti+' min',n(q.PostMinuti)*n(q.PostTariffa)/60]);
 if(n(q.Altro))lines.push(['Altri costi','',n(q.Altro)]);
 if(lines.some(x=>!Number.isFinite(x[2])||x[2]<0))throw Error('Inserisci valori numerici validi.');
 let acc=0,net=0;const rows=lines.map(([name,qty,price,foto])=>{acc+=price*(1+n(q.Ricarico)/100);const next=round(acc), amount=round(next-net);net=next;return [name,qty,amount,foto]});
 net=round(acc+costoEsercizio*(1+n(q.Ricarico)/100));
 const tax=round(net*n(q.Iva)/100),total=round(net+tax);
 const productionCost=lines.reduce((sum,row)=>sum+row[2],costoEsercizio);
 return {rows,net,tax,total,unit:total/n(q.ProdottiFiniti),productionCost,productionUnit:productionCost/n(q.ProdottiFiniti)};
}
function showTotal(x){
 const verifica=pianoConsumi([...q.StampeAggiuntive,q]);
 $('#total').innerHTML='<p><strong>Costo di realizzazione: '+euro(x.productionCost)+'</strong> · '+euro(x.productionUnit)+' per prodotto finito<br><small>Uso interno, prima di ricarico e IVA</small></p><div class="total">'+euro(x.total)+'</div><p>'+euro(x.unit)+' per prodotto finito · IVA '+euro(x.tax)+'</p>'+x.rows.map(([a,b,c])=>'<div class="row">'+esc(a)+' · '+esc(b)+' · '+euro(c)+'</div>').join('');
 if(verifica.warnings.length)$('#total').insertAdjacentHTML('afterbegin','<div role="alert" style="padding:14px;border:2px solid #b84e25;background:#fff3e9;margin-bottom:16px"><strong>Verifica disponibilità filamento</strong><ul>'+verifica.warnings.map(w=>'<li>'+esc(w)+'</li>').join('')+'</ul></div>');
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
  if(!first){warnings.push('Parte '+(i+1)+' · '+m.Nome+': assegna una bobina per verificare il residuo');continue}
  const ids=[m.Bobina];
  if(m.Riserva){
   const backup=db.bobine.find(b=>id(b.Id)===m.Riserva);
   if(m.Alimentazione!=='AMS'||!stessaBobina(first,backup))warnings.push('Riserva AMS non valida per '+m.Nome);
   else ids.push(m.Riserva);
  }
  for(const key of ids){
   const amount=Math.min(g,available.get(key)??0);
   if(amount>0){available.set(key,available.get(key)-amount);used.set(key,(used.get(key)??0)+amount);g-=amount}
  }
  if(g>0.000001)warnings.push('Filamento insufficiente: '+m.Nome+' · mancano '+g.toFixed(2)+' g');
 }
 return {used,warnings};
}
function csvCell(value){
 let text=String(value??'');
 if(/^[\s]*[=+@-]/.test(text))text="'"+text;
 return '"'+text.replace(/"/g,'""')+'"';
}
function esportaCsv(tipo){
 const bobine=tipo==='bobine',headers=bobine?['ID','Marca','Tipo filamento','Colore','Codice','Fornitore','Data acquisto','Netto acquistato g','Lordo g','Tara g','Residuo g','Densita g/cm3','Prezzo acquisto EUR','IVA %','IVA compresa']:
 ['Articolo','Codice','Fornitore','Data acquisto','Prezzo unitario EUR','IVA %','IVA compresa'];
 const rows=bobine?data.bobine.filter(b=>!nascondiEsaurite||residuo(b)>0).map(b=>[id(b.Id),b.Produttore,b.Materiale,b.Colore,b.Codice,b.Fornitore,b.Data,n(b.Acquistato).toFixed(2),n(b.Lordo).toFixed(2),n(b.Tara).toFixed(2),residuo(b).toFixed(2),b.Densita??'',n(b.Prezzo).toFixed(2),b.Iva??0,b.PrezzoIvato===true]):
 articoli(tipo).map(a=>[a.Nome,a.Codice,a.Fornitore,a.DataAcquisto,n(a.Prezzo).toFixed(2),a.Iva??0,a.PrezzoIvato===true]);
 const csv='\ufeff'+[headers,...rows].map(row=>row.map(csvCell).join(';')).join('\r\n');
 const link=document.createElement('a'),url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));
 link.href=url;link.download=(bobine?'filamenti':tipo==='ricambio'?'ricambi':'materiale-extra')+'.csv';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}

function spools(){
 return '<section class="card"><h2>Bobine</h2>'+btn('Nuova bobina','spool')+btn('Stampa elenco bobine','print:bobine')+btn('CSV filamenti','csv:bobine')+btn(nascondiEsaurite?'Mostra bobine esaurite':'Nascondi bobine esaurite','toggleEmpty')+data.bobine.filter(b=>!nascondiEsaurite||residuo(b)>0).map(b=>'<div class="row"><strong>#'+id(b.Id)+' '+esc(b.Materiale+' · '+b.Colore)+'</strong><p>'+esc(b.Produttore)+(b.Codice?' · Cod. '+esc(b.Codice):'')+' · '+(n(b.Lordo)-n(b.Tara)).toLocaleString('it-IT',{minimumFractionDigits:2,maximumFractionDigits:2})+' g residui · '+euro(prezzoNetto(b.Prezzo,b.Iva,b.PrezzoIvato===true)*1000/n(b.Acquistato))+'/kg</p>'+btn('Modifica','spool:'+b.Id)+btn('Cancella','rmSpool:'+b.Id)+'</div>').join('')+'</section>';
}
function archive(){return '<section class="card"><h2>Preventivi salvati</h2>'+btn('Stampa elenco preventivi','print:preventivi')+data.preventivi.map((p,i)=>'<div class="row"><strong>'+numeroPreventivo(p.Numero)+' · '+esc(p.Titolo)+'</strong><p>'+esc(p.Cliente)+' · '+esc(p.Data)+' · '+euro(p.Esito?.Totale??0)+'</p>'+btn('Apri','open:'+i)+'</div>').join('')+'</section>'}
const printerFields=[...machine,['Tariffa elettrica (€/kWh)','Tariffa']];
const costFields=[
 ['Budget riparazioni (€)','BudgetRiparazioni'],['Ore previste per il budget','BudgetOre'],
 ['Valore contabile prima dei lavori (€)','ValoreResiduo'],['Costo migliorie capitalizzabili (€)','Migliorie'],['Vita utile residua (ore)','OreResidue']
];
function applyProfile(profile){
 for(const [,key] of machine)q[key]=profile[key];
 if(profile.Tariffa!=null)q.Tariffa=profile.Tariffa;
 q.Usura=structuredClone(profile.Usura??[]);
 for(const [,key] of costFields)q[key]=profile[key]??0;
}
function printerForm(existing){
 const dialog=document.createElement('dialog');
 dialog.innerHTML='<form class="card"><h2>'+(existing?'Modifica stampante':'Aggiungi stampante')+'</h2>'+fields([
  '<label>Nome stampante<input name="nome" required maxlength="100" value="'+esc(existing?.nome??'')+'"></label>',
  ...printerFields.map(([label,key])=>'<label>'+label+'<input type="number" inputmode="decimal" min="'+(key==='Vita'?1:0)+'" step="any" name="'+key+'" required value="'+esc(existing?.[key]??(key==='Vita'?3000:0))+'"></label>')
 ])+'<fieldset><legend>Budget riparazioni e ammortamento</legend>'+fields(costFields.map(([label,key])=>'<label>'+label+'<input type="number" min="0" step="any" required name="'+key+'" value="'+esc(existing?.[key]??0)+'"></label>'))+'<p>Usa il budget per riparazioni non già comprese nei ricambi. Compila valore contabile, migliorie e ore residue se vuoi ricalcolare l’ammortamento.</p></fieldset><fieldset><legend>Manutenzione e ricambi</legend><div data-usura></div><button type="button" data-add-usura>Aggiungi ricambio o intervento</button><p><output></output> di manutenzione per ora di stampa</p></fieldset><p>La potenza media è quella durante la stampa. Inserisci il consumo AMS extra solo se è misurato separatamente.</p><p role="alert"></p><div class="actions"><button class="primary">Salva stampante</button><button type="button">Annulla</button></div></form>';
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
   '<label>Ricambio o intervento<input required data-nome value="'+esc(r.nome??'')+'"></label>',
   '<label>Codice articolo<input data-codice value="'+esc(r.codice??'')+'"></label>',
   '<label>Fornitore<input data-fornitore list="fornitori-ricambi" value="'+esc(r.fornitore??'')+'"></label>',
   '<label>Data acquisto<input data-data type="date" value="'+esc(r.dataAcquisto??'')+'"></label>',
   '<label>IVA acquisto (%)<input data-iva type="number" min="0" max="100" step="any" value="'+esc(r.iva??22)+'"></label>',
   '<label>Tipo prezzo<select data-prezzo-ivato><option value="true" '+(r.prezzoIvato!==false?'selected':'')+'>IVA compresa</option><option value="false" '+(r.prezzoIvato===false?'selected':'')+'>IVA esclusa</option></select></label>',
   '<label>Costo (€)<input type="number" min="0" step="any" required data-prezzo value="'+esc(r.prezzo??'')+'"></label>',
   '<label>Intervallo (ore)<input type="number" min="0.01" step="any" required data-ore value="'+esc(r.ore??'')+'"></label>'
  ])+'<button type="button">Rimuovi ricambio</button>';
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
   if(!nome)throw Error('Inserisci il nome della stampante.');
   if(profile.BudgetRiparazioni>0&&profile.BudgetOre<=0)throw Error('Indica le ore previste per il budget riparazioni.');
   if((profile.Migliorie>0||profile.ValoreResiduo>0)&&profile.OreResidue<=0)throw Error('Indica le ore di vita utile residua.');
   if(profile.Usura.some(r=>!r.nome||!(r.ore>0)))throw Error('Controlla nome e intervallo di ogni ricambio.');
   await save(d=>{
    if(d.profili.some(p=>p.nome!==existing?.nome&&p.nome.toLocaleLowerCase('it')===nome.toLocaleLowerCase('it')))throw Error('Esiste già una stampante con questo nome.');
    if(existing)d.profili=d.profili.filter(p=>p.nome!==existing.nome);
    d.profili.push(profile);
    for(const r of profile.Usura)memorizzaArticolo(d,{tipo:'ricambio',Nome:r.nome,Codice:r.codice,Fornitore:r.fornitore,Prezzo:r.prezzo,Iva:r.iva,PrezzoIvato:r.prezzoIvato,Ore:r.ore});
   });
   q.Profilo=nome;applyProfile(profile);dialog.close();render();msg('Profilo salvato e selezionato nel preventivo.');
  }catch(err){dialog.querySelector('[role=alert]').textContent=err.message}
 };
 formattaCampi(dialog);
 dialog.showModal();
}

function stampaElenco(tipo){
 const preventivi=tipo==='preventivi';
 const bobine=tipo==='bobine',titolo=preventivi?'Elenco preventivi':bobine?'Elenco bobine':tipo==='ricambio'?'Elenco ricambi':'Elenco materiale extra';
 const headers=preventivi?['Numero','Data','Oggetto','Cliente','Totale (€)']:bobine?['ID','Marca','Filamento','Colore','Codice','Fornitore','Data acquisto','Lordo g','Tara g','Netto g','Prezzo acquisto','IVA %','Tipo prezzo']:['Articolo','Codice','Fornitore','Data acquisto','Prezzo unitario','IVA %','Tipo prezzo'];
 const tipoPrezzo=v=>v?'IVA compresa':'IVA esclusa';
 const rows=preventivi?data.preventivi.map(p=>[numeroPreventivo(p.Numero),p.Data,p.Titolo,p.Cliente,euro(p.Esito?.Totale??0)]):bobine?data.bobine.map(b=>[id(b.Id),b.Produttore,b.Materiale,b.Colore,b.Codice,b.Fornitore,b.Data,formattaNumero(b.Lordo),formattaNumero(b.Tara),formattaNumero(n(b.Lordo)-n(b.Tara)),euro(b.Prezzo),b.Iva??0,tipoPrezzo(b.PrezzoIvato===true)]):articoli(tipo).map(a=>[a.Nome,a.Codice,a.Fornitore,a.DataAcquisto,euro(a.Prezzo),a.Iva??0,tipoPrezzo(a.PrezzoIvato===true)]);
 const html='<!doctype html><html lang="it"><meta charset="utf-8"><title>'+titolo+'</title><style>body{font:13px system-ui;color:#14243c;margin:24px}table{width:100%;border-collapse:collapse}th,td{padding:7px;text-align:left;border-bottom:1px solid #ccd5e2}th{background:#edf2fa}button{padding:10px}@media print{button{display:none}@page{size:landscape;margin:12mm}thead{display:table-header-group}tr{break-inside:avoid}}</style><h1>'+titolo+'</h1><p>'+new Date().toLocaleDateString('it-IT')+' · '+rows.length+' voci</p><button onclick="window.print()">Stampa / Salva PDF</button><table><thead><tr>'+headers.map(h=>'<th>'+esc(h)+'</th>').join('')+'</tr></thead><tbody>'+rows.map(row=>'<tr>'+row.map(v=>'<td>'+esc(v??'')+'</td>').join('')+'</tr>').join('')+'</tbody></table></html>';
 const page=window.open('','_blank');if(!page)throw Error('Consenti l’apertura della finestra di stampa nel browser.');
 page.document.open();page.document.write(html);page.document.close();
}

function settings(){return '<section class="card"><h2>Esportazione CSV</h2><div class="actions">'+btn('Filamenti','csv:bobine')+btn('Ricambi','csv:ricambio')+btn('Materiale extra','csv:componente')+'</div></section>'+ '<section class="card"><h2>Elenchi stampabili</h2><div class="actions">'+btn('Bobine','print:bobine')+btn('Ricambi','print:ricambio')+btn('Materiale extra','print:componente')+'</div></section>'+ '<section class="card"><h2>Stampanti</h2>'+btn('Aggiungi stampante','printer',true)+data.profili.map((p,i)=>'<div class="row"><strong>'+esc(p.nome)+'</strong><p>'+esc(p.Watt)+' W stampante · '+esc(p.WattAms)+' W AMS extra · '+euro(p.Acquisto)+' acquisto · '+esc(p.Vita)+' ore di vita utile · '+euro(maintenance(p))+'/h manutenzione'+(p.Tariffa==null?'':' · '+esc(p.Tariffa)+' €/kWh')+'</p>'+btn('Modifica stampante','printer:'+i)+btn('Elimina profilo','rmPrinter:'+i)+'</div>').join('')+'</section><section class="card"><h2>Backup e trasferimento dati</h2> <p>'+btn('Scarica backup','backup')+'</p><label>Ripristina un backup<input id="restore" type="file" accept=".json"></label><label>Seleziona bobine.json, profili.json e i preventivi JSON<input id="legacy" type="file" multiple accept=".json"></label><p>I dati Windows si trovano nella cartella %LOCALAPPDATA%\\CalcoloStampa3D.</p></section>'}
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
 const props=[['Produttore','Marca'],['Materiale','Tipo filamento'],['Colore','Colore'],['Fornitore','Fornitore'],['Diametro','Diametro (mm)'],['Densita','Densità (g/cm³, facoltativa)'],['Codice','Codice articolo'],['Lotto','Lotto'],['Data','Data acquisto'],['Acquistato','Peso netto acquistato (g)'],['Lordo','Lordo attuale (g)'],['Tara','Tara (g)'],['Prezzo','Prezzo per bobina (€)'],['Iva','IVA acquisto (%)'],['Note','Note']];
 const numeric=['Acquistato','Lordo','Tara','Prezzo','Diametro','Iva'];
 dialog.innerHTML='<form class="card"><h2>'+(existing?'Modifica bobina':'Nuova bobina')+'</h2>'+fields(props.map(([k,l])=>{
  const options=['Produttore','Materiale','Fornitore'].includes(k)?[...new Set([...(k==='Materiale'?tipiFilamento:[]),...(k==='Fornitore'?fornitori():data.bobine.map(b=>b[k]).filter(Boolean))])]:[];
  return '<label>'+l+'<input name="'+k+'" value="'+esc(k==='Data'?dataCalendario(existing?.[k]):existing?.[k]??(k==='Diametro'?1.75:''))+'" '+(k==='Data'?'type="date"':k==='Densita'?'type="number" min="0.001" step="any" inputmode="decimal"':numeric.includes(k)?'type="number" min="0" step="any" required':(['Produttore','Materiale','Colore'].includes(k)?'required':''))+(options.length?' list="opt'+k+'"':'')+'>'+ (options.length?'<datalist id="opt'+k+'">'+options.map(o=>'<option value="'+esc(o)+'">').join('')+'</datalist>':'')+'</label>';
 }))+'<label>Tipo prezzo<select name="PrezzoIvato"><option value="true" '+(!existing||existing.PrezzoIvato===true?'selected':'')+'>IVA compresa</option><option value="false" '+(existing&&existing.PrezzoIvato!==true?'selected':'')+'>IVA esclusa</option></select></label>'+(existing?'':'<label>Bobine identiche<input name="quantita" type="number" min="1" max="999" value="1" required></label>')+'<p>Netto residuo: <output></output></p><p class="error" role="alert"></p><div class="actions"><button class="primary">Salva</button><button type="button">Annulla</button></div></form>';
 document.body.append(dialog);const form=dialog.querySelector('form');
 
 let pesoAcquistatoManuale=!!existing;
 form.elements.Acquistato.addEventListener('input',()=>{pesoAcquistatoManuale=true});
 const nettoOutput=dialog.querySelector('output');
 nettoOutput.style.cssText='display:block;font-size:1.3rem;font-weight:700;padding:10px;background:#eaf1fc;border-radius:8px';
 const update=()=>{
  const lordo=form.elements.Lordo,tara=form.elements.Tara;
  const completo=lordo.value.trim()!==''&&tara.value.trim()!=='';
  const netto=n(lordo.value)-n(tara.value);
  lordo.setCustomValidity(completo&&netto<0?'Il lordo deve essere almeno pari alla tara.':'');
  nettoOutput.textContent=completo&&netto>=0?netto.toLocaleString('it-IT',{minimumFractionDigits:2,maximumFractionDigits:2})+' g':'—';
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
   if(b.Densita!==null&&(!Number.isFinite(b.Densita)||b.Densita<=0))throw Error('Inserisci una densità positiva oppure lascia il campo vuoto.');
   if(b.Lordo<b.Tara||b.Acquistato<=0||b.Diametro<=0)throw Error('Controlla lordo, tara, peso acquistato e diametro.');
   await save(d=>{if(existing){const i=d.bobine.findIndex(x=>x.Id===existing.Id);if(i<0)throw Error('Bobina rimossa.');d.bobine[i]={...b,Id:existing.Id}}else for(let i=0;i<qty;i++)d.bobine.push({...b,Id:d.prossimo++})});
   dialog.close();render();msg('Bobine salvate.');
  }catch(err){dialog.querySelector('.error').textContent=err.message}
 };

 if(!existing&&data.bobine.length){
  const label=document.createElement('label');label.innerHTML='Richiama filamento già acquistato<select><option value="">Nuovo articolo</option>'+data.bobine.map((b,i)=>'<option value="'+i+'">'+esc([b.Produttore,b.Materiale,b.Colore,b.Codice].filter(Boolean).join(' · '))+'</option>').join('')+'</select>';
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
    const preventivo={...structuredClone(q),Data:new Date().toLocaleString('it-IT'),Esito:{Totale:x.total}};
    await save(d=>{
     const i=d.preventivi.findIndex(p=>preventivo.Numero?p.Numero===preventivo.Numero:
      originalQuote&&p.Titolo===originalQuote.Titolo&&p.Data===originalQuote.Data);
     if(preventivo.Numero&&i<0)throw Error('Preventivo non trovato nell’archivio.');
     if(i>=0)d.preventivi[i]=preventivo;else d.preventivi.unshift(preventivo);
     assegnaNumeri(d);
    });
    q.Numero=preventivo.Numero;originalQuote=null;
}
function documentoPreventivo(x){
 return '<!doctype html><html lang="it"><meta charset="utf-8"><title>'+esc(q.Titolo)+'</title><style>body{font:17px system-ui;max-width:1000px;margin:40px auto;padding:20px;color:#14243C}table{border-collapse:collapse;width:100%}th,td{padding:12px;text-align:left;border-bottom:1px solid #CBD7EA}td{vertical-align:middle}.foto-parte{display:block;max-width:120px;max-height:92px;margin-bottom:6px}tr{break-inside:avoid}thead th{font-size:16px;background:#e5edf9;border-bottom:2px solid #2857a5}tbody td{padding:15px 12px}tbody tr:nth-child(even){background:#f3f6fb}h1{padding-bottom:14px;border-bottom:3px solid #2857a5}h2{margin-top:28px;border-top:3px solid #2857a5;padding-top:16px}@media print{body{margin:0;max-width:none;padding:0}button{display:none}thead{display:table-header-group}@page{size:A4;margin:14mm}}</style><button onclick="window.print()" style="padding:10px 16px;margin-bottom:20px">Stampa / Salva PDF</button><h1>'+numeroPreventivo(q.Numero)+' · '+esc(q.Titolo)+'</h1><p>Preventivo stampa 3D · '+esc(q.Cliente)+'</p><table><thead><tr><th>Voce</th><th>Quantità</th><th>Importo (€)</th></tr></thead><tbody>'+x.rows.map(([a,b,c,foto])=>'<tr><td>'+fotoHtml(foto,a)+esc(a)+'</td><td>'+esc(b)+'</td><td>'+euro(c)+'</td></tr>').join('')+'</tbody></table><p>Imponibile '+euro(x.net)+' · IVA '+euro(x.tax)+'</p><h2>Totale '+euro(x.total)+'</h2><p>'+euro(x.unit)+' per prodotto finito</p></html>';
}
function exportQuote(x){
 const doc=documentoPreventivo(x);
 const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([doc],{type:'text/html'}));a.download='Preventivo '+q.Titolo+'.html';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);

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
 let material=perFilament.map((g,i)=>({...mat(),Nome:types[i]||'Filamento '+(i+1),Grammi:g,Slot:i+1,Colore:colors[i]??'',Densita:density[i]??null})).filter(m=>m.Grammi>0);
 let warning='';
 if(!material.length&&total>0){
  material=[{...mat(),Nome:types.length===1?types[0]:'Totale esportato',Grammi:total,Slot:types.length===1?1:null,Colore:types.length===1?colors[0]??'':'',Densita:types.length===1?density[0]??null:null}];
  if(types.length>1||colors.length>1)warning='Il G-code contiene solo il peso totale. Per i pesi per colore importa il 3MF elaborato dallo slicer, oppure suddividi manualmente il totale nelle righe colore.';
 }else if(material.length&&total>0){
  const sum=material.reduce((a,m)=>a+m.Grammi,0);
  if(Math.abs(total-sum)>Math.max(0.1,material.length*0.02))warning='I pesi per filamento differiscono dal totale esportato. Controlla i grammi di tutti i colori nello slicer prima di calcolare o scaricare le bobine.';
 }
 return {...part(),Origine:name,Minuti:seconds/60,Materiali:material.length?material:[mat()],AvvisoImportazione:warning};
}

async function zipEntries(file){
 const v=new DataView(await file.arrayBuffer()), decoder=new TextDecoder();let end=v.byteLength-22;
 while(end>=Math.max(0,v.byteLength-65557)&&v.getUint32(end,true)!==0x06054b50)end--;
 if(end<0||v.getUint32(end,true)!==0x06054b50)throw Error('Archivio 3MF non valido.');
 let p=v.getUint32(end+16,true);const entries=new Map();
 for(let i=0;i<v.getUint16(end+10,true);i++){
  if(v.getUint32(p,true)!==0x02014b50)throw Error('Archivio 3MF non valido.');
  const size=v.getUint32(p+20,true),plain=v.getUint32(p+24,true),l=v.getUint16(p+28,true),method=v.getUint16(p+10,true),offset=v.getUint32(p+42,true);
  const name=decoder.decode(new Uint8Array(v.buffer,p+46,l));
  if(/^Metadata\/(?:slice_info\.config|plate_\d+\.gcode)$/i.test(name))entries.set(name,async()=>{
   if(plain>256e6)throw Error('Piatto troppo grande.');
   const pos=offset+30+v.getUint16(offset+26,true)+v.getUint16(offset+28,true);
   const bytes=new Uint8Array(v.buffer,pos,size);
   if(method===0)return decoder.decode(bytes);
   if(method!==8)throw Error('Compressione 3MF non supportata.');
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
   const materials=[...p.querySelectorAll('filament')].map(f=>({...mat(),Nome:[f.getAttribute('type'),f.getAttribute('color')].filter(Boolean).join(' ')||'Filamento',Slot:n(f.getAttribute('id')),Colore:f.getAttribute('color')??'',Grammi:n(f.getAttribute('used_g'))})).filter(m=>m.Grammi>0);
   if(!materials.length&&n(get('weight'))>0)materials.push({...mat(),Nome:'Totale esportato',Grammi:n(get('weight'))});
   parts.set(idx,{...part(),Origine:file.name+' · Piatto '+idx,Minuti:n(get('prediction'))/60,Materiali:materials});
  }
 }
 for(const [name,read] of entries){
  const idx=name.match(/plate_(\d+)\.gcode$/i)?.[1];if(!idx)continue;
  const p=parts.get(idx);if(p?.Minuti&&p.Materiali.length)continue;
  const found=gcode(await read(),file.name+' · Piatto '+idx);
  if(!p)parts.set(idx,found);else {p.Minuti ||= found.Minuti;if(!p.Materiali.length)p.Materiali=found.Materiali}
 }
 if(!parts.size)throw Error('Il 3MF non contiene piatti elaborati dallo slicer.');
 return [...parts.values()].map(p=>p.Materiali.length?p:{...p,Materiali:[mat()]});
}
async function legacy(files){
 const values=await Promise.all(Array.from(files,async f=>[f.name,JSON.parse((await f.text()).replace(/^\uFEFF/,''))]));
 await save(d=>{
  for(const [name,j] of values){
   if(Array.isArray(j.Bobine)){
    if(d.bobine.length)throw Error('Importa le bobine Windows in un archivio bobine vuoto per conservare gli ID.');
    d.bobine=j.Bobine;d.prossimo=Math.max(n(j.Prossimo),1,...j.Bobine.map(b=>n(b.Id)+1));
   }else if(name.toLowerCase()==='profili.json'){
    for(const [nome,p] of Object.entries(j)){if(!Array.isArray(p)||p.length!==4)throw Error('Profilo Windows non valido.');
     d.profili=d.profili.filter(x=>x.nome!==nome);d.profili.push({nome,Watt:n(p[0]),WattAms:n(p[1]),Vita:n(p[2]),Acquisto:n(p[3])})}
   }else if(j.Titolo&&Array.isArray(j.Materiali)){
    const normalized={...fresh(),...j,ProdottiFiniti:j.ProdottiFiniti??j.Esito?.PezziTotali??j.Pezzi};
    if(!d.preventivi.some(p=>p.Titolo===j.Titolo&&p.Data===j.Data))d.preventivi.unshift(normalized);
   }else throw Error('File Windows non riconosciuto: '+name);
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
   q.StampeAggiuntive.push(...parts);render();msg('Stampe importate. Verifica pesi e prezzi.');
  }
  if(el.id==='restore'&&el.files.length){
   const backup=JSON.parse(await el.files[0].text());
   if(!Array.isArray(backup?.bobine)||!Array.isArray(backup?.preventivi)||!Array.isArray(backup?.profili)||!Number.isSafeInteger(backup?.prossimo))throw Error('Backup non valido.');
   if(confirm('Sostituire i dati salvati su questo dispositivo con il backup?')){
    await save(d=>Object.assign(d,backup));q=fresh();originalQuote=null;render();msg('Backup ripristinato.');
   }
  }
  if(el.id==='legacy'){await legacy(el.files);render();msg('Dati Windows importati.')}
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
    if(!page)throw Error('Consenti al browser di aprire la finestra di stampa.');
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
    render();showTotal(x);msg('Preventivo '+numeroPreventivo(q.Numero)+' salvato.');return;
   }
   case 'new':if(confirm('Iniziare un nuovo preventivo?')){q=fresh();originalQuote=null;const m=data.profili.find(x=>x.nome===q.Profilo)??data.profili[0];if(m){q.Profilo=m.nome;applyProfile(m)}else q.Profilo='Stampante manuale'}break;
   case 'part':q.StampeAggiuntive.push(part());break;
   case 'rmPart':{
    if(!confirm('Eliminare questa parte stampata dal preventivo?'))return;
    eliminaParte(n(i));break;
   }
   case 'mat':p.Materiali.push(mat());break;
   case 'rmPhoto':delete p.Foto;break;
   case 'rmMat':p.Materiali.splice(n(j),1);break;
   case 'remember':{
    const c=q.Componenti[n(i)];
    if(!c.Nome?.trim()||!Number.isFinite(n(c.Prezzo))||n(c.Prezzo)<0||n(c.Iva)<0||n(c.Iva)>100)throw Error('Controlla nome, prezzo e IVA acquisto.');
    await save(d=>memorizzaArticolo(d,{tipo:'componente',Nome:c.Nome,Codice:c.Codice??'',Fornitore:c.Fornitore??'',DataAcquisto:c.DataAcquisto??'',Prezzo:n(c.Prezzo),Iva:n(c.Iva??0),PrezzoIvato:c.PrezzoIvato===true||c.PrezzoIvato==='true'}));
    msg('Articolo memorizzato nel menu.');break;
   }
   case 'comp':q.Componenti.push({Nome:'',Quantita:1,Prezzo:0,Iva:22,PrezzoIvato:true,DataAcquisto:'',Fornitore:'',Codice:''});break;
   case 'rmComp':q.Componenti.splice(n(i),1);break;
   case 'open':originalQuote=data.preventivi[n(i)];q={...fresh(),...structuredClone(originalQuote)};tab='quote';break;
   case 'spool':spoolForm(data.bobine.find(b=>b.Id===n(i)));return;
   case 'rmSpool':if(confirm('Cancellare la bobina '+id(i)+'?'))await save(d=>d.bobine=d.bobine.filter(b=>b.Id!==n(i)));break;
   case 'rmPrinter':{
    const nome=data.profili[n(i)]?.nome;
    if(!nome||!confirm('Eliminare il profilo '+nome+'?'))return;
    await save(d=>d.profili=d.profili.filter(p=>p.nome!==nome));
    if(q.Profilo===nome&&data.profili.length){q.Profilo=data.profili[0].nome;applyProfile(data.profili[0])}
    else if(q.Profilo===nome)q.Profilo='Stampante manuale';
    msg('Profilo eliminato.');break;
   }
   case 'managePrinters':tab='settings';break;
   case 'printer':printerForm(i===undefined?undefined:data.profili[n(i)]);return;

   case 'consume':{
    const plan=pianoConsumi([p],data,false);
    if(plan.warnings.length)throw Error(plan.warnings.join('\n'));
    if(!plan.used.size)throw Error('Inserisci il consumo in grammi.');
    if(!confirm('Registrare il consumo di una stampa completata?\n'+[...plan.used].map(([b,g])=>b+': '+g.toFixed(2)+' g').join('\n')))return;
    await save(db=>{
     const current=pianoConsumi([p],db,false);
     if(current.warnings.length)throw Error(current.warnings.join('\n'));
     for(const [key,g] of current.used){const bobina=db.bobine.find(b=>id(b.Id)===key);bobina.Lordo=n(bobina.Lordo)-g}
    });msg('Consumo registrato.');break;
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
