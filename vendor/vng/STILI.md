# Direzioni di stile — contro i siti tutti uguali

> Decisione dell'Owner (2026-10-12): i siti rifatti, anche quelli fatti di notte, non devono essere monotoni. Questo file dà a ogni pagina un'identità diversa **prima** di scrivere codice. Vale insieme a R-VIS-40..44 (`layers/design/modules/visual-system.md`).

## Regola di rotazione (obbligatoria)

1. Per ogni sito scegli **una direzione** (D1–D10), **un archetipo di hero** (H1–H8) e **un elemento firma** (la cosa che si ricorda: una sola).
2. **Mai la stessa direzione** usata negli ultimi 3 siti, **mai lo stesso archetipo di hero** due volte nello stesso giro (di notte: nella stessa notte). Con più di 8 siti in un giro un hero può tornare una volta, ma con direzione e palette diverse. Lo storico si tiene nel registro del progetto (nel Radar: campo `stile` del lead, es. `D4/H6/marquee prodotti`).
3. **Il settore suggerisce, non obbliga**: una cantina può essere D2 o D9 o D6. Se le ultime scelte hanno già usato la direzione "ovvia", prendi la seconda.
4. **Font**: mai la stessa coppia in due siti di fila. Vietati come scelta di default: Inter, Space Grotesk, Poppins, Montserrat da soli. Si possono usare come testo corrente solo accanto a un display caratterizzato.
5. **Colori**: palette dalle foto vere del cliente (un colore dominante campionato + un neutro con la stessa tinta + un accento). Mai il viola→blu, mai il crema+terracotta "da IA" se il cliente non lo giustifica.
6. **Componenti**: al massimo 2–3 componenti VNG per pagina, più l'elemento firma. Un sito con 10 effetti diversi sembra un catalogo, non un'azienda.
7. **Composizione**: almeno una sezione che **non** sia "titolo centrato + tre card uguali" (R-VIS-41). Alterna griglie asimmetriche, foto a tutta larghezza, colonne di testo, liste.

## Le 10 direzioni

| # | Direzione | Settori tipici | Font (Google Fonts) | Palette | Motion firma | Componenti adatti |
|---|-----------|----------------|---------------------|---------|--------------|-------------------|
| D1 | **Editoriale da rivista** | cantine, hotel di charme, artigiani | Fraunces o Playfair Display + Source Serif 4 | carta calda, inchiostro, un accento dal prodotto | titoli rivelati riga per riga (SplitText), foto che si scoprono a tendina | lista con foto (`vng-reveal`), FAQ |
| D2 | **Lusso scuro** | distillerie, gioiellerie, ristoranti alti | Cormorant Garamond + Manrope | quasi nero con tinta, oro/ottone, avorio | luce che scivola (`vng-beam`), parallax lento | glow card in oro, pila di card, wave grid in oro |
| D3 | **Industriale / B2B tecnico** | manifatture, meccanica, impianti | IBM Plex Sans Condensed + IBM Plex Mono | acciaio, grafite, un giallo o arancio di sicurezza | numeri che contano (`data-vng-count`), griglia in prospettiva | contatori, griglia in prospettiva, marquee clienti/certificazioni |
| D4 | **Brutalista grafico** | startup, studi creativi, birrifici artigianali | Archivo Black o Anton + JetBrains Mono | 2 colori pieni ad alto contrasto, bordi neri spessi | testo che ruota (`data-vng-flip`), marquee enorme | flip, marquee, bottone hover |
| D5 | **Naturale / outdoor** | campeggi, agriturismi, sport all'aperto | DM Serif Display + Karla | verdi e terre prese dalle foto, cielo | foto a tutto schermo con zoom lento, contatori di distanze/posti | contatori, lista con foto, aurora nei toni del tramonto |
| D6 | **Minimal svizzero** | design, architetti, arredo, B2B premium | Instrument Sans o Archivo + Instrument Serif per i dettagli | bianco/grigio caldo, un solo accento | griglia rigida, comparsa per colonne, nessun effetto decorativo | FAQ, bottone hover (solo questi) |
| D7 | **Pop colorato** | food, gelaterie industriali, brand giovani | Bricolage Grotesque + Nunito | 3 colori saturi presi dal packaging | bottoni e card che rimbalzano (ease back), marquee prodotti | glow card colorate, marquee, pila di card |
| D8 | **Tech / futuro** | startup tecnologiche, energia, software | Sora o Unbounded + Geist Mono | scuro freddo, ciano/lime come accento | 3D (wave grid o particelle `visual-3d`), aurora fredda | wave grid, aurora, spotlight nav, border beam |
| D9 | **Artigianale caldo** | forni, caseifici, pastifici, falegnami | Young Serif + Work Sans | farina, legno, rosso pomodoro o verde salvia | foto mani/lavoro con parallax, timeline della storia | lista con foto, contatori (anni, prodotti), FAQ |
| D10 | **Cinematografico** | hotel, stabilimenti balneari, eventi | Bodoni Moda + Jost | colori del video/foto, testo bianco | sezione pinnata con sequenza di fotogrammi (`visual-motion`), titoli enormi | spotlight nav, bottone hover; niente card |

## Archetipi di hero (uno diverso per ogni sito della stessa notte)

- **H1 Foto a tutto schermo** con titolo in basso a sinistra (non centrato).
- **H2 Divisa** 50/50: testo a sinistra, foto o oggetto 3D a destra.
- **H3 Tipografica**: solo un titolo enorme su colore pieno, la foto arriva allo scroll.
- **H4 Sequenza di fotogrammi** pinnata (scroll = video), da `visual-motion`.
- **H5 Scena 3D** (wave grid, particelle, oggetto procedurale) con testo sopra.
- **H6 Collage** di 3–5 foto sovrapposte che si separano allo scroll.
- **H7 Aurora / gradiente animato** con titolo e flip text (solo D4, D7, D8).
- **H8 Prodotto in primo piano**: un oggetto ritagliato grande, nome e prezzo/specifica.

## Elementi firma (sceglierne uno)

Un numero gigante che conta (anni di attività, ettari, ore di lavorazione) · una timeline orizzontale della storia · un marquee di prodotti o certificazioni · una mappa stilizzata delle sedi · una pila di card dei lavori · una sezione 3D interattiva · un menu/listino che si sfoglia · una citazione vera del titolare (solo se pubblicata da lui).

## Da dove prendere i pezzi

- Componenti animati pronti in HTML puro: `skills/visual-components/kit/` nella Factory; nel repo proposte `vendor/vng/` (markup di esempio in `vendor/vng/esempio.html`).
- Scroll fluido, scrub, sequenze, titoli divisi: `skills/visual-motion`.
- 3D: `skills/visual-3d` (oggetti, particelle) e `kit/wave-grid.js` (cubi che ondeggiano).
- Foto mancanti: `skills/photo-library`. Nelle proposte di restyling: **solo foto vere del cliente**.
- Idee da altre librerie (Aceternity UI, Magic UI, React Bits, Codrops): si possono **ricreare** in HTML puro rispettando la licenza; mai copiare un sito intero o un design riconoscibile.
