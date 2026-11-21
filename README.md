# CALCOLO STAMPA 3D

[Apri l’app / Open the app](https://hermannpro17.github.io/calcolo-stampa-3d/)

App per PC e smartphone, in italiano e inglese, con icona bobina e cubo blu. Gestisce preventivi per assemblati, importazione di G-code e 3MF elaborati dallo slicer, bobine, stampanti, componenti extra e lavorazioni.

## PC Windows

1. Premi **Code → Download ZIP** e scegli **Estrai tutto** sul file scaricato.
2. Per creare l’icona sul desktop, apri **CREA ICONA DESKTOP.vbs** dalla cartella estratta. Il file copia l’icona nella cartella locale dell’utente e crea il collegamento **CALCOLO STAMPA 3D** sul desktop.
3. Il collegamento apre la versione web nel browser predefinito. Usa sempre lo stesso browser per ritrovare il tuo archivio.
4. Per aprire la copia scaricata, fai doppio clic su **AVVIA APP.cmd**.

## Android

1. Apri il link dell’app in Chrome.
2. Dal menu **⋮**, scegli **Installa app** oppure **Aggiungi a schermata Home**.
3. Avvia l’app dall’icona con la bobina blu.

## iPhone

1. Apri il link dell’app in Safari.
2. Premi **Condividi → Aggiungi a Home → Aggiungi**.
3. Avvia l’app dall’icona con la bobina blu.

## Archivio e trasferimento PC ↔ smartphone

La versione pubblica salva i dati nel browser del dispositivo. Il trasferimento è manuale tramite backup.

1. Nel dispositivo con i dati aggiornati, apri **Stampanti e dati → Scarica backup**.
2. Trasferisci il file JSON all’altro dispositivo.
3. Apri la stessa app e scegli **Stampanti e dati → Ripristina un backup**.
4. Per tornare dal telefono al PC, ripeti i passaggi nella direzione opposta.

**Il ripristino sostituisce l’archivio di destinazione.** Lavora su un dispositivo alla volta durante il trasferimento. Conserva una copia del backup prima di ripristinare. La copia scaricata e la versione web possono avere archivi distinti.

## English instructions

Open the app using the link above. Choose **English** in the navigation.

- **Windows desktop icon:** download and extract the repository ZIP, then open **CREA ICONA DESKTOP.vbs**. It creates a desktop shortcut with the blue spool icon and opens the web app in your default browser.
- **Downloaded copy:** open **AVVIA APP.cmd** from the extracted folder.
- **Android:** open the app in Chrome and choose **Install app** or **Add to Home screen**.
- **iPhone:** open the app in Safari and choose **Share → Add to Home Screen**.
- **Transfer data:** use **Printers and data → Download backup** on the source device, transfer the JSON file, then choose **Restore a backup** on the destination. Restoring replaces that device’s archive. Automatic cloud synchronisation is not included in the public edition.

## Licenza e vincoli di utilizzo / License and usage restrictions

Copyright © 2026 HERMANNPRO17.

Il software è distribuito con la [PolyForm Noncommercial License 1.0.0](LICENSE).

- Uso gratuito per finalità personali, hobbistiche e non commerciali, nei limiti della licenza.
- È consentito condividere e modificare il software per gli scopi ammessi, conservando il testo della licenza o il suo URL e gli avvisi obbligatori di copyright.
- Per vendere l’app, offrirla come servizio commerciale o usarla nell’attività commerciale ordinaria occorre ottenere un’autorizzazione separata dal titolare. Restano applicabili gli usi espressamente consentiti dalla licenza per le organizzazioni indicate nel suo testo.
- Il software è fornito nelle condizioni in cui si trova, con le esclusioni di garanzia e responsabilità previste dalla licenza e nei limiti di legge.

Per richiedere un’autorizzazione commerciale, contatta HERMANNPRO17 attraverso il [profilo GitHub](https://github.com/HERMANNPRO17).

Questo riepilogo facilita la lettura. Le condizioni applicabili sono nel file [LICENSE](LICENSE).

### English

The software is provided under the [PolyForm Noncommercial License 1.0.0](LICENSE).

- Free for personal, hobby and other noncommercial purposes permitted by the license.
- Sharing and modification are permitted for allowed purposes, subject to retaining the license text or its URL and all required notices.
- Selling the app, offering it as a commercial service or using it in ordinary commercial business requires separate permission from the licensor. The organizational uses expressly allowed by the license remain permitted.
- Warranty and liability exclusions apply as stated in the license, to the extent permitted by law.

Contact [HERMANNPRO17](https://github.com/HERMANNPRO17) for commercial permission. This is a reading aid; [LICENSE](LICENSE) contains the applicable terms.


## Stampe multicolore / Multicolour prints

Importa il G-code oppure il 3MF elaborato dallo slicer. Se sono presenti i pesi per filamento, ogni slot mantiene grammi e colore in una riga separata. Assegna bobina e prezzo a ciascuna riga. Se il G-code riporta soltanto il totale, usa un 3MF con i consumi per filamento oppure suddividi manualmente il totale. Verifica che gli scarti già inclusi nel peso esportato non vengano inseriti di nuovo come AMS extra.

Import G-code or sliced 3MF. Per-filament weights and colours are kept in separate slot rows when available. Assign a spool and price to each row. For total-only G-code, use a 3MF with per-filament usage or split the total manually. Avoid adding waste already included in the exported weight again as extra AMS grams.


## Aggiornamento del 19 novembre 2026 / Update, 19 November 2026

- Stampe multicolore con slot, colori e pesi per filamento quando disponibili nel file; gestione bobina esterna e AMS.
- Cataloghi richiamabili di materiale extra e ricambi, fornitori, codici, date di acquisto e IVA inclusa o esclusa.
- Peso netto bobina calcolato da lordo meno tara e densità facoltativa.
- Parti eliminabili, sezioni più visibili, colori HEX come sfondo e pesi e prezzi a due decimali.
- Stampa/PDF del preventivo e stampa degli elenchi di bobine, ricambi, materiale extra e preventivi.
- Le funzioni sono disponibili in italiano e inglese. I dati della versione pubblica restano nel browser del dispositivo; il trasferimento avviene tramite backup.

Multicolour import, external spool support, reusable purchase catalogs, automatic net spool weight, optional density, clearer layout, quote printing/PDF and printable inventory and quote lists are available in Italian and English. Public-edition data is stored locally in the browser and can be transferred using backups.


## CSV, bobine esaurite e riserva AMS

In **Stampanti e dati → Esportazione CSV** puoi esportare filamenti, ricambi e materiale extra. Il CSV usa separatore punto e virgola, codifica UTF-8 e intestazioni nella lingua corrente.

In **Bobine**, il pulsante **Nascondi bobine esaurite / Mostra bobine esaurite** filtra l’elenco e il CSV filamenti. Le bobine selezionate in un preventivo restano riconoscibili anche quando esaurite.

Premi **Calcola** per verificare il filamento necessario a tutte le parti e ripetizioni. L’avviso considera il residuo condiviso tra le parti. Assegna una bobina per ogni riga per controllarne la disponibilità.

Per una riga alimentata tramite **AMS**, puoi scegliere una **bobina identica di riserva**. L’identità viene verificata su marca, materiale, colore, diametro e codice articolo. Controlla che i dati del magazzino corrispondano alle bobine fisiche e abilita la funzione di cambio automatico sulla stampante. L’app gestisce disponibilità e consumi; la configurazione della stampante avviene nei suoi comandi.

**Registra consumo** riguarda una singola esecuzione completata. Scarica prima la bobina principale e poi la riserva, mostrando i grammi nella conferma. Se la stampante ha usato quantità diverse, correggi le pesate delle bobine.

### English

Export filament, spare-part and extra-material CSV files from **Printers and data → CSV export**. Hide or show empty spools from **Spools**. Press **Calculate** to check stock across all parts and repetitions.

For AMS feed, select an identical backup spool. The app checks brand, material, colour, diameter and item code, then accounts for both remaining weights. Enable automatic spool backup on the printer separately and verify physical spool compatibility. **Record usage** deducts one completed run from the primary spool first and the backup second; adjust actual spool weights if the real allocation differs.


## Versione 2026.11.21.1: riconoscere la copia aggiornata

La versione caricata è visibile nella testata. Questa versione comprende il richiamo di codici e colori dai dati salvati.

Per aggiornare la copia scaricata, estrai tutto lo ZIP in una nuova cartella, apri **AVVIA APP.cmd**, poi esegui **CREA ICONA DESKTOP.vbs** per aggiornare il collegamento. Il collegamento desktop apre ora index.html dalla cartella estratta. Conserva la cartella per continuare a usare il collegamento. La versione web rimane accessibile dal link pubblico.

L’archivio dipende dal browser e dall’indirizzo o percorso della copia aperta. Prima del trasferimento usa **Scarica backup**, poi **Ripristina un backup** nella nuova copia, controllando l’archivio di destinazione.

### English

The header shows the loaded release version. Extract the entire ZIP into a new folder, open **AVVIA APP.cmd**, then run **CREA ICONA DESKTOP.vbs** to update the desktop shortcut. The shortcut now opens the downloaded local index.html. Keep its folder in place. Use backup export and restore to transfer your saved data between copies or browsers.
