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

## Licenza / License

[PolyForm Noncommercial License 1.0.0](LICENSE). Uso gratuito per finalità non commerciali. L’uso commerciale richiede un’autorizzazione separata.

Free for noncommercial use. Commercial use requires separate permission.


## Stampe multicolore / Multicolour prints

Importa il G-code oppure il 3MF elaborato dallo slicer. Se sono presenti i pesi per filamento, ogni slot mantiene grammi e colore in una riga separata. Assegna bobina e prezzo a ciascuna riga. Se il G-code riporta soltanto il totale, usa un 3MF con i consumi per filamento oppure suddividi manualmente il totale. Verifica che gli scarti già inclusi nel peso esportato non vengano inseriti di nuovo come AMS extra.

Import G-code or sliced 3MF. Per-filament weights and colours are kept in separate slot rows when available. Assign a spool and price to each row. For total-only G-code, use a 3MF with per-filament usage or split the total manually. Avoid adding waste already included in the exported weight again as extra AMS grams.
