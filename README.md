ADA – Consegna moduli (MVP)

Moduli inclusi in questa consegna:

Analisi di Bilancio (da XBRL)

Analisi della Centrale Rischi (da PDF)

Analisi Questionari Qualitativi (AS IS / TO BE)

Sistema di Allerta Complessiva (scoring & giudizi)

Fornitore: Key Performance Softwares Srl
Cliente: CLM Srl – contatto: Dott. Michele Schito
Data consegna: 18/12/2025 – h 10:00 CET (via Google Meet)
Versione: v0.1.0-mvp

1. Panoramica del repository

Monorepo con backend applicativo e interfaccia base di amministrazione per i moduli consegnati.

/backend/ # API, business logic, migrazioni DB
/frontend/ # UI minima per testare i moduli consegnati
/docs/ # Documentazione tecnica
├─ ALERTING.md # Logica scoring & giudizi
├─ XBRL_GUIDE.md # Flusso import XBRL, mappature
├─ CR_PDF_GUIDE.md # Flusso import CR PDF, filtri periodo
└─ QUESTIONARI.md # Modello questionari, punteggi, conciliazione
/scripts/ # Utility (es: import demo, checksum)
/samples/ # File di esempio: .xbrl, .pdf CR, questionari

Nota: Il repository include solo i moduli esplicitati. Moduli come Previsioni & Cash Flow, Conti & Movimenti, Clienti & Fatture, Simulazioni e AI non sono oggetto di questa consegna.

2. Prerequisiti

Runtime backend: PHP 8.2+ (Laravel 10+)

DB: MySQL 8+ o MariaDB 10.6+

Node.js: 18+ (per build frontend)

Composer: 2.x

Optional: Docker/Docker Compose (per avvio rapido)

3. Setup rapido
   3.1 Clonazione & dipendenze
   git clone <repository_url>
   cd backend
   cp .env.example .env
   composer install
   php artisan key:generate

cd ../frontend
cp .env.example .env
npm install

3.2 Database & migrazioni

Configura DB in backend/.env (host, db, user, password), poi:

cd backend
php artisan migrate --seed # include dati minimi e profili demo

3.3 Avvio in sviluppo

# backend API

php artisan serve --host=0.0.0.0 --port=8000

# frontend (dev server)

cd ../frontend
npm run dev

Docker (opzionale): docker compose up -d (vedi docker-compose.yml).

4. Configurazione (.env)
   Backend (estratto)
   APP_ENV=local
   APP_KEY=base64:...
   APP_URL=https://ada-stage.compaynet-b2b.com

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=ada
DB_USERNAME=ada_user
DB_PASSWORD=**\*\*\*\***

# Upload & parsing

UPLOAD_MAX_MB=50
XBRL_ALLOWED_EXT=xbrl
CR_ALLOWED_EXT=pdf

# Scoring (pesi di default)

ALERT_WEIGHT_XBRL=0.40
ALERT_WEIGHT_CR=0.40
ALERT_WEIGHT_QUESTIONARI=0.20

# Soglie giudizi (0–100)

ALERT_THRESHOLD_GOOD=75
ALERT_THRESHOLD_FAIR=55

Frontend (estratto)

5. Moduli consegnati – Guida operativa
   5.1 Analisi di Bilancio (XBRL)

Cosa fa: importa un file .xbrl, estrae voci contabili chiave e calcola indici (liquidità, solidità, sostenibilità oneri, ecc.).

Dati mancanti: interfaccia per integrare campi non presenti nel tracciato, con ricalcolo degli indici.

Output: valori indice, stato soglia (fuori soglia sì/no), giudizio sintetico; tabella alert per voce (erario, previdenza, fornitori, ecc.).

Percorso UI demo: Bilancio → Importa XBRL → Calcola indici.

API principali (esempio):

POST /api/bilanci/import-xbrl – upload e parsing

GET /api/bilanci/{id}/indici – valori e giudizi

POST /api/bilanci/{id}/integrazioni – salvataggio campi mancanti

Dettagli e mappature: vedere docs/XBRL_GUIDE.md.

5.2 Analisi della Centrale Rischi (PDF)

Cosa fa: importa il PDF CR, esegue parsing strutturato e consente analisi su tutto il documento o per periodo selezionato.

Output chiave: score /10, elenco anomalie, sconfinamenti (con data, banca, categoria, utilizzo, importo; fasce entro/oltre 90/180 gg), affidamenti (accordato, utilizzato, peso %), elenco intermediari.

Filtri periodo: ricalcolo in tempo reale.

Percorso UI demo: Centrale Rischi → Carica PDF → Vista sintetica → Dettagli.

API principali (esempio):

POST /api/cr/import-pdf

GET /api/cr/{id}/sintesi

GET /api/cr/{id}/sconfinamenti?from=YYYY-MM&to=YYYY-MM

GET /api/cr/{id}/affidamenti

Dettagli parsing e limiti: docs/CR_PDF_GUIDE.md.

5.3 Analisi Questionari Qualitativi (AS IS / TO BE)

Cosa fa: raccoglie risposte su governance, processi e rischi, generando punteggi e etichette per area.

Conciliazione: i punteggi sono armonizzati con Bilancio e CR per contribuire allo stato complessivo.

UI demo: Questionari → Nuovo/Modifica → Salva & Confronta.

API principali (esempio):

GET /api/questionari/template

POST /api/questionari/compilazioni

GET /api/questionari/{id}/punteggi

Struttura domande e pesi: docs/QUESTIONARI.md.

5.4 Sistema di Allerta Complessiva (scoring & giudizi)

Input: tre fonti normalizzate (XBRL, CR, Questionari).

Calcolo: combinazione pesata (default in .env), generazione score [0–100] + giudizi testuali (“Molto buono”, “Buono”, “Attenzione”, “Critico”).

Spiegabilità: breakdown contributi per area, trend ultimo anno, motivazioni salienti.

UI demo: Dashboard → Stato complessivo / Allerta.

API principali (esempio):

GET /api/alerting/stato-complessivo

GET /api/alerting/breakdown

Formula, pesi, soglie: docs/ALERTING.md.

6. Dati di esempio

Cartella /samples/ con:

bilancio_demo.xbrl

centrale_rischi_demo.pdf

questionari_demo.json

script scripts/load_demo.sh per import massivo in locale.

7. Test

Unit test (business logic): backend/tests/Unit/\*

API test (feature): backend/tests/Feature/\*

Esecuzione:

cd backend
php artisan test

8. Logging & Tracciabilità

Log applicativi: storage/logs/ (livelli configurabili via .env)

Audit base: create/update su record chiave (import, modifiche integrazioni, esiti scoring)

Correlation-ID: propagato nelle risposte API per facilitare il debug.

9. Sicurezza & Privacy

Nessuna credenziale reale in repo; usare .env.

File caricati validati per estensione e dimensione (vedi .env).

Dati personali trattati secondo principi minimizzazione e finalità; eventuali esportazioni con pseudonimizzazione in ambiente demo.

10. Limitazioni note (MVP)

XBRL: mappature standard incluse; voci fuori tracciato possono richiedere integrazione manuale.

CR PDF: qualità del PDF (testo vs. scansione) impatta la precisione del parsing; OCR non abilitato di default.

Questionari: set domande base; pesi personalizzabili ma non editabili da UI in questa release.

Allerta: pesi globali in .env; futuri perfezionamenti su base settoriale.

11. Build produzione (sintesi)

# backend

composer install --no-dev --optimize-autoloader
php artisan config:cache && php artisan route:cache && php artisan view:cache

# frontend

npm ci
npm run build

# servire artefatti statici da /frontend/dist dietro reverse proxy

12. Supporto & Handover

Sessione di consegna: 18/12/2025, ore 10:00 CET (Google Meet)

Verifica integrità pacchetti (checksum)

Walkthrough setup & moduli

Q&A tecnico

Contatti tecnici:

Federico Megna – Key Performance Softwares Srl – [email] / [tel]

13. Licenza & Diritti

Salvo diverso accordo contrattuale, il codice è consegnato a CLM Srl per gli usi previsti dal contratto.
Le librerie di terze parti sono soggette alle rispettive licenze (vedi composer.json / package.json).

14. Changelog

v0.1.0-mvp (18/12/2025): prima consegna moduli XBRL, CR PDF, Questionari, Allerta; API e UI demo; documentazione iniziale.
