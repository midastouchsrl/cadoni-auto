# VibeCar - Analisi Tecnica Dettagliata

## Task 1: Filtri AutoScout24 Italia

### Filtri URL Disponibili

| Parametro | Tipo | Valori | Usato in VibeCar | Impatto Prezzo | Rischio Scraping |
|-----------|------|--------|------------------|----------------|------------------|
| `cy` | Country | `I` (Italia) | Si | - | Basso |
| `mmm` | Make/Model ID | `28\|14\|` (Fiat\|Panda) | Si | Alto | Basso |
| `fregfrom` | Anno min | 1990-2026 | Si | Alto | Basso |
| `fregto` | Anno max | 1990-2026 | Si | Alto | Basso |
| `kmfrom` | Km min | 0-999999 | Si | Alto | Basso |
| `kmto` | Km max | 0-999999 | Si | Alto | Basso |
| `fuel` | Alimentazione | B,D,E,L,M,2 | Si | Medio | Basso |
| `gear` | Cambio | M,A | Si | Medio | Basso |
| `pricefrom` | Prezzo min | EUR | No | - | Basso |
| `priceto` | Prezzo max | EUR | No | - | Basso |
| `powertype` | Unita potenza | kw, hp | No | Medio | Basso |
| `powerfrom` | Potenza min | kW/HP | No | Medio | Basso |
| `powerto` | Potenza max | kW/HP | No | Medio | Basso |
| `body` | Carrozzeria | 1-12 | No | Medio | Basso |
| `doors` | Porte | 2,3,4,5 | No | Basso | Basso |
| `seats` | Posti | 2-9 | No | Basso | Basso |
| `color` | Colore | 1-12 | No | Basso | Basso |
| `emissclass` | Euro | 1-6 | No | Medio | Basso |
| `seller` | Venditore | P (privato), D (dealer) | No | Medio | Basso |
| `damaged_listing` | Incidentate | exclude, include | Si | Alto | Basso |
| `atype` | Tipo annuncio | C (auto) | Si | - | Basso |
| `ustate` | Stato | N (nuovo), U (usato) | Si | Alto | Basso |
| `sort` | Ordinamento | standard, price, km, age | Si | - | Basso |
| `desc` | Direzione | 0 (asc), 1 (desc) | Si | - | Basso |
| `size` | Risultati/pagina | 10,20,50 | Si | - | Basso |
| `page` | Pagina | 1-N | Si | - | Basso |

### Valori Filtro Alimentazione (fuel)

| Codice | Descrizione |
|--------|-------------|
| `B` | Benzina |
| `D` | Diesel |
| `E` | Elettrica |
| `L` | GPL |
| `M` | Metano/CNG |
| `2` | Ibrida Benzina |
| `3` | Ibrida Diesel |
| `H` | Idrogeno |
| `O` | Altri |

### Valori Filtro Carrozzeria (body)

| Codice | Descrizione |
|--------|-------------|
| `1` | Berlina |
| `2` | Station wagon |
| `3` | City car |
| `4` | Cabrio |
| `5` | Coupe |
| `6` | Fuoristrada/SUV |
| `7` | Monovolume |
| `8` | Furgone |
| `9` | Pick-up |
| `10` | Altro |

### Valori Filtro Emissioni (emissclass)

| Codice | Descrizione |
|--------|-------------|
| `1` | Euro 1 |
| `2` | Euro 2 |
| `3` | Euro 3 |
| `4` | Euro 4 |
| `5` | Euro 5 |
| `6` | Euro 6 |
| `6d` | Euro 6d |
| `6d-TEMP` | Euro 6d-TEMP |

---

## Task 2: Campi Estraibili dai Listing

### Sempre Presenti (100%)

| Campo | Formato HTML | Formato JSON | Note |
|-------|--------------|--------------|------|
| `price` | `data-price="12345"` | `"price":"12345"` | In centesimi o euro interi |
| `rawPrice` | - | `"rawPrice":12345` | Prezzo numerico puro |
| `make` | `data-make="Fiat"` | `"make":"28"` o `"make":"Fiat"` | ID numerico o nome |
| `model` | `data-model="Panda"` | `"model":"14"` o `"model":"Panda"` | ID numerico o nome |
| `firstRegistration` | `data-first-registration="01-2023"` | `"firstRegistrationYear":2023` | MM-YYYY |
| `mileageInKm` | - | `"mileageInKm":"50.000 km"` | Stringa formattata |
| `fuel` | - | `"fuel":"Benzina"` | Nome localizzato |
| `fuelType` | - | `"fuelType":"b"` | Codice lettera |
| `sellerId` | `data-customer-id="12345"` | `"sellerId":12345` | ID venditore |
| `offerType` | - | `"offerType":"U"` | U=Usato, N=Nuovo |

### Spesso Presenti (70-95%)

| Campo | Formato | Affidabilita | Note |
|-------|---------|--------------|------|
| `powerInKw` | JSON | 85% | Potenza in kW |
| `powerInHp` | JSON | 85% | Potenza in CV |
| `gearbox` | JSON | 90% | Tipo cambio |
| `bodyType` | JSON | 80% | Tipo carrozzeria |
| `doors` | JSON | 75% | Numero porte |
| `version` | JSON | 70% | Versione/allestimento |
| `color` | JSON | 65% | Colore carrozzeria |

### Inconsistenti (<70%)

| Campo | Formato | Affidabilita | Note |
|-------|---------|--------------|------|
| `consumption` | JSON | 50% | Consumo L/100km |
| `emissionSticker` | JSON | 40% | Classe Euro |
| `seats` | JSON | 45% | Numero posti |
| `previousOwners` | JSON | 30% | Proprietari precedenti |
| `warranty` | JSON | 35% | Garanzia residua |
| `serviceHistory` | JSON | 25% | Storico tagliandi |

### Pattern di Estrazione Attuali in VibeCar

```javascript
// Pattern 1: data-price attribute
/data-price="(\d+)"/g

// Pattern 2: Prezzi con simbolo euro
/[€]\s*([\d.]+)/g

// Pattern 3: JSON "price" field
/"price":\s*(\d+)/g

// Pattern 4: JSON "rawPrice" field
/"rawPrice":\s*(\d+)/g
```

### Pattern Aggiuntivi Raccomandati

```javascript
// Chilometraggio
/"mileageInKm":\s*"([^"]+)"/g  // -> "50.000 km"

// Anno immatricolazione
/data-first-registration="(\d{2})-(\d{4})"/g  // -> MM-YYYY

// Potenza
/"powerInKw":\s*(\d+)/g
/"powerInHp":\s*(\d+)/g

// ID listing (per deduplicazione)
/"listingId":\s*"([^"]+)"/g
```

---

## Task 3: Portali Alternativi

### 1. Subito.it (Motori)

| Aspetto | Valutazione | Note |
|---------|-------------|------|
| **Volume annunci** | Alto | Secondo portale in Italia |
| **Copertura marche** | Completa | Tutte le marche |
| **Struttura URL** | Semplice | `/annunci-italia/vendita/usate/auto/?q=fiat+panda` |
| **Anti-scraping** | Medio | Cloudflare, ma bypass possibile |
| **Qualita dati** | Media | Meno strutturati di AS24 |
| **API pubblica** | No | Solo scraping |
| **Filtri URL** | Limitati | Prezzo, km, anno, provincia |

**Pro**: Grande volume, molti privati
**Contro**: Dati meno strutturati, prezzi meno affidabili (trattabili)

### 2. AutoHero.com/it

| Aspetto | Valutazione | Note |
|---------|-------------|------|
| **Volume annunci** | Medio | Solo stock proprio |
| **Copertura marche** | Buona | Marche principali |
| **Struttura URL** | Moderna | SPA con API REST |
| **Anti-scraping** | Basso | API JSON accessibili |
| **Qualita dati** | Alta | Dati verificati |
| **API pubblica** | Semi | Endpoints JSON rilevabili |
| **Filtri URL** | Completi | Tutti i parametri |

**Pro**: Dati verificati, prezzi finali, API JSON
**Contro**: Solo dealer (AutoHero), niente privati

### 3. Automobile.it

| Aspetto | Valutazione | Note |
|---------|-------------|------|
| **Volume annunci** | Alto | Network Subito |
| **Copertura marche** | Completa | Tutte |
| **Struttura URL** | Semplice | URL path-based |
| **Anti-scraping** | Medio | Simile a Subito |
| **Qualita dati** | Media | Mix privati/dealer |
| **API pubblica** | No | Solo scraping |
| **Filtri URL** | Buoni | Parametri standard |

**Pro**: Buon volume, focus auto
**Contro**: Stesso network Subito, dati ridondanti

### 4. Brumbrum.it

| Aspetto | Valutazione | Note |
|---------|-------------|------|
| **Volume annunci** | Basso | Solo stock proprio |
| **Copertura marche** | Limitata | Selezione curata |
| **Struttura URL** | Moderna | SPA |
| **Anti-scraping** | Basso | API JSON |
| **Qualita dati** | Alta | Certificati, garanzia |
| **API pubblica** | Semi | Endpoints rilevabili |
| **Filtri URL** | Completi | Tutti |

**Pro**: Prezzi certi, dati certificati
**Contro**: Volume basso, solo dealer

### Raccomandazione Portali

| Priorita | Portale | Motivazione |
|----------|---------|-------------|
| 1 | **AutoScout24** | Volume + struttura dati (attuale) |
| 2 | **Subito Motori** | Volume privati, validazione incrociata |
| 3 | **AutoHero** | Dati certificati per benchmark dealer |
| 4 | Automobile.it | Solo se serve volume aggiuntivo |

---

## Task 4: Raccomandazioni Operative MVP

### A) Form Migliorato - Campi Proposti

#### Campi Essenziali (Attuali) - MANTENERE

| Campo | Tipo | Obbligatorio | Note |
|-------|------|--------------|------|
| Marca | Dropdown + autocomplete | Si | Con makeId |
| Modello | Dropdown dinamico | Si | Con modelId |
| Anno | Dropdown 1990-2026 | Si | |
| Chilometraggio | Input numerico | Si | Validazione 0-999999 |
| Alimentazione | Dropdown | Si | 6 opzioni |
| Cambio | Dropdown | Si | 2 opzioni |
| Condizione | Radio 3 opzioni | Si | Scarsa/Normale/Ottima |

#### Campi Opzionali - DA VALUTARE

| Campo | Tipo | Impatto Prezzo | Complessita UI | Raccomandazione |
|-------|------|----------------|----------------|-----------------|
| Potenza (kW) | Slider/input | Alto | Media | **Si, V2** |
| Carrozzeria | Dropdown | Medio | Bassa | No (auto-detect) |
| Colore | Dropdown | Basso | Bassa | No |
| Porte | Dropdown | Basso | Bassa | No |
| Euro (emissioni) | Dropdown | Medio | Media | **Si, V2** |
| Venditore (P/D) | Toggle | Medio | Bassa | **Si, V1** |

### B) Strategia Fallback Migliorata

```
STEP 1: Ricerca stretta
├── Anno: ±1
├── Km: ±15%
├── Fuel: esatto
├── Gearbox: esatto
└── Min risultati: 10

STEP 2: Allarga anno (se <10 risultati)
├── Anno: ±2
└── Resto: invariato

STEP 3: Allarga km (se <10 risultati)
├── Anno: ±2
├── Km: ±30%
└── Resto: invariato

STEP 4: Rimuovi filtro cambio (se <5 risultati)
├── Anno: ±2
├── Km: ±30%
├── Fuel: esatto
└── Gearbox: ANY

STEP 5: Verifica esistenza modello (se 0 risultati)
├── Solo make/model
├── Nessun filtro anno/km
└── Messaggio contestuale
```

### C) Nuovi Campi da Estrarre

| Campo | Pattern | Uso |
|-------|---------|-----|
| `mileageInKm` | `/"mileageInKm":\s*"([^"]+)"/g` | Validazione incrociata km |
| `firstRegistration` | `/data-first-registration="(\d{2})-(\d{4})"/g` | Validazione anno |
| `powerInKw` | `/"powerInKw":\s*(\d+)/g` | Filtro potenza futuro |
| `listingId` | `/"listingId":\s*"([^"]+)"/g` | Deduplicazione |
| `sellerId` | `/data-customer-id="(\d+)"/g` | Analisi dealer vs privato |

### D) Checklist Tecnica Pre-Implementazione

#### Priorita Alta (V1.1)

- [ ] Aggiungere toggle "Solo privati" / "Solo dealer" / "Tutti"
- [ ] Estrarre `listingId` per deduplicazione accurata
- [ ] Implementare fallback STEP 4 (rimuovi cambio)
- [ ] Aggiungere rate limiting (max 1 req/500ms)
- [ ] Log errori strutturati per monitoring

#### Priorita Media (V1.2)

- [ ] Aggiungere filtro potenza (range kW)
- [ ] Aggiungere filtro Euro (classe emissioni)
- [ ] Cross-validazione con Subito Motori
- [ ] Storico valutazioni (localStorage)
- [ ] Export PDF risultato

#### Priorita Bassa (V2)

- [ ] Integrazione AutoHero per benchmark dealer
- [ ] Trend prezzi (storico 30/60/90 giorni)
- [ ] Notifiche prezzo (web push)
- [ ] API pubblica per B2B

### E) Metriche da Implementare

| Metrica | Tipo | Scopo |
|---------|------|-------|
| `search_count` | Counter | Volume ricerche |
| `search_no_results` | Counter | Ricerche vuote |
| `search_fallback_used` | Counter | Uso fallback |
| `avg_listings_found` | Gauge | Qualita ricerca |
| `cache_hit_rate` | Gauge | Efficienza cache |
| `response_time_p95` | Histogram | Performance |
| `make_model_popularity` | Counter | Analytics prodotto |

---

## Riepilogo Decisioni

| Decisione | Scelta | Motivazione |
|-----------|--------|-------------|
| Portale principale | AutoScout24 | Volume + dati strutturati |
| Portale secondario | Subito (futuro) | Validazione privati |
| Filtro regione | Rimosso | Complessita vs valore |
| Filtro venditore | Aggiungere V1 | Impatto alto, facile |
| Filtro potenza | Aggiungere V2 | Impatto medio, richiede UI |
| Estrazione km/anno | Aggiungere | Validazione incrociata |
| Multi-source | V2 | Complessita alta |

---

*Documento generato il 4 gennaio 2026*
*Analisi tecnica per roadmap sviluppo VibeCar*
