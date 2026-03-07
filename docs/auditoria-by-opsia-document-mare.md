# Document Mare - Modul Auditoria by Opsia

## 1. Objectiu del modul

Cal Blay executa mes de 800 esdeveniments anuals. Direccio no pot validar presencialment a tots els serveis si es compleix l'ABC operatiu definit per l'empresa.

Per aquest motiu es crea el modul `Auditoria by Opsia`, amb l'objectiu de:

- Estandarditzar autoauditories curtes al tancament de cada esdeveniment.
- Garantir un minim de control de qualitat per departament executor.
- Deixar traçabilitat consultable per event, departament i periode.
- Facilitar decisions de millora continua basades en dades.

## 2. Abast funcional (fase actual)

El modul queda definit en 3 submoduls:

1. `Plantilles d'auditoria`
2. `Valoracio d'auditories` (pendent de detall funcional)
3. `Consulta d'auditories`

L'execucio de les auditories no es fa dins del modul Auditoria, sino des del modul `Esdeveniments`.

## 3. Submodul 1 - Plantilles

### 3.1 Estructura per departaments

El submodul neix amb pestanyes per departament i arquitectura extensible.

Pestanyes inicials operatives:

- Comercial
- Serveis
- Cuina
- Logistica

Pestanya prevista (preparada per activacio):

- Deco

Regla de futur:

- S'ha de poder afegir nous departaments/pestanyes sense redissenyar el modul.

Cada departament gestionara les seves plantilles segons permisos d'usuari:

- Consultar
- Crear
- Editar

### 3.2 Estructura comuna de plantilla

Totes les plantilles comparteixen el mateix model:

- `Plantilla`
- `Blocs`
- `Items` dins de cada bloc (preguntes/grups/checklist)

Tipus d'item suportat:

- Checklist
- Valoracio numerica (1-10)
- Adjunt de foto

Cada bloc tindra un `% de pes` sobre la puntuacio global de l'auditoria.

### 3.3 Criteris UX obligatoris

La creacio i edicio de plantilles ha de complir:

- Simplicitat maxima (flux molt curt i clar)
- Usabilitat per perfils no digitals
- Mobile-first real (operable des de mobil)
- Mateixa linia visual i d'interaccio que la resta de l'app

## 4. Submodul 2 - Valoracio d'auditories

Aquest submodul serveix per validar qualitat real d'execucio i calcular elegibilitat d'incentius dels responsables.

### 4.1 Funcionament operatiu

- Les auditories es completen a operativa (mobil) des d'Esdeveniments.
- La valoracio es fa posteriorment des d'oficina per rols responsables de cada departament.
- Cada responsable veu el seu panell mensual amb:
  - Auditories rebudes
  - Auditories validades
  - % de compliment per auditoria
  - % mig de compliment del periode
  - Estat d'elegibilitat d'incentiu
- La pantalla tambe ha de permetre vista resumida per responsable.

### 4.2 Logica de puntuacio

La nota de cada auditoria es calcula de forma ponderada per blocs:

- Cada bloc te un `% de pes` (definit a la plantilla)
- Cada item aporta puntuacio segons tipus:
  - checklist (complert/no complert)
  - rating (1-10)
  - foto (evidencia requerida o opcional segons configuracio)
- Resultat final en percentatge (0-100%)

### 4.3 Logica d'incentius (model base)

El submodul ha de suportar regles mensuals com:

- Minima activitat: p. ex. `>= 6` auditories/mes
- Minima qualitat: p. ex. `% compliment mig >= 80%`
- Incentiu maxim: p. ex. `200 EUR`

Calcul orientatiu:

- Si no arriba al minim d'auditories: incentiu `0`
- Si arriba al minim i compleix llindar de qualitat: incentiu segons taula/regla activa
- Si supera llindars superiors (si es defineixen): pot arribar al maxim establert

Nota: el modul ha de permetre ajustar aquests llindars (nombre auditories, percentatge i import) sense redisseny.

### 4.4 Estats de valoracio

Per cada auditoria:

- `completed` (omplerta a operativa)
- `under_review` (en revisio oficina)
- `validated` (validada per valoracio)
- `rejected` (no valida, amb motiu)

Per mes/usuari/departament:

- `not_eligible`
- `eligible`
- `incentive_confirmed`

## 5. Submodul 3 - Consulta d'auditories

Aquest submodul es necessari per assegurar control operatiu i historics.

Objectius minims:

- Consultar auditories per esdeveniment
- Consultar per departament
- Consultar per rang de dates
- Veure detall de respostes, puntuacio i evidencies (fotos)
- Incloure resum mensual operatiu (també per responsable) per seguiment de valoracio i incentius.

## 6. Execucio de l'autoauditoria (des de Esdeveniments)

### 6.1 Punt d'entrada

L'autoauditoria s'executa des del modul `Esdeveniments`, en el context operatiu del responsable de l'event.

Hi ha una decisio funcional pendent (no bloquejant en aquesta fase):

- Opcio A: un sol punt d'entrada per Incidencies + Auditoria
- Opcio B: dos punts d'entrada separats

La decisio final es prendra en fase de detall UX d'execucio.

### 6.2 Regla operativa base

Per cada esdeveniment es preveu fins a 4 auditories inicials (maxim una per departament operatiu: Comercial, Serveis, Cuina, Logistica), amb possibilitat d'ampliacio quan s'activin nous departaments com Deco.

### 6.3 Requisit d'usabilitat en execucio

Aquest flux es considera `100% mobil-first` en la practica operativa:

- L'auditoria es completa majoritariament in situ durant l'esdeveniment o en el trajecte de retorn.
- L'us en ordinador es residual.
- El disseny ha de prioritzar captura rapida de dades i fotos des de mobil (pocs tocs, lectura clara, accions evidents).

## 7. Arquitectura tecnica recomanada

### 7.1 Principi de persistencia

Model hibrid:

- `Firestore`: dades estructurades (plantilles, execucions, respostes, puntuacions, estat)
- `Storage`: fitxers d'evidencia (fotos)

No es recomana guardar imatges dins Firestore.

### 7.2 Racional de la decisio

- Millor escalabilitat en volum d'imatges
- Cost mes controlable a mitja i llarga durada
- Consultes mes eficients per event/departament/periode
- Menys complexitat d'integracio que usar SharePoint com a font principal operativa

### 7.3 Relacio amb SharePoint

Si es necessari per processos interns, SharePoint pot quedar com a repositori de copia/export posterior.

La font de veritat operativa del modul hauria de ser:

- Firestore (dades)
- Storage (evidencies)

## 8. Model conceptual de dades (alt nivell, sense codi)

### 8.1 Entitats principals

- `audit_templates`
- `audit_template_versions`
- `audit_runs` (execucio d'una auditoria per event + departament)
- `audit_answers` (respostes per item)
- `audit_media` (metadades d'imatges a Storage)

### 8.2 Claus funcionals minimes

Per cada `audit_run`:

- `eventId`
- `department`
- `templateId`
- `templateVersion`
- `status` (draft, completed, reviewed)
- `scoreTotal`
- `createdBy`, `createdAt`, `completedAt`

Per cada item de resposta:

- `itemType` (checklist, rating, photo)
- `value`
- `blockWeight`
- `contributionToScore`

## 9. Seguretat i permisos (principis)

### 9.1 Rols i abast

- `Admin`: visio i acces complet a tot el modul.
- `Direccio`: visio i acces complet a tot el modul.
- `Executor` (responsable d'esdeveniment per departament): executa l'autoauditoria del seu departament des d'Esdeveniments.
- `Cap de departament`: crea/edita plantilles del seu departament i fa la valoracio de les auditories.

### 9.2 Origen del rol executor

El rol executor surt del modul `Quadrants` (responsables assignats per departament a cada esdeveniment).

### 9.3 Regles de permisos

- Creacio i edicio de plantilles restringida als caps de departament, Admin i Direccio.
- Valoracio restringida als caps de departament, Admin i Direccio.
- Consulta transversal habilitada per Admin i Direccio.
- Cada usuari opera en el context del seu departament excepte rols globals (Admin/Direccio).

## 10. KPI i control (definicio inicial)

Indicadors minims a suportar:

- % d'esdeveniments auditats
- % de compliment per departament
- Score mig per departament i periode
- Top no conformitats recurrents
- % d'auditories amb evidencies fotografiques

## 11. Pla de posada en practica (sense codi)

### Fase 1 - Definicio (tancada)

- Definicio funcional del modul completada i validada.

### Fase 2 - Creacio dels moduls d'Auditories

- Desenvolupar estructura funcional dels submoduls:
  - Plantilles
  - Valoracio
  - Consulta

### Fase 3 - Introduccio de dades al modul Auditories

- Donar d'alta plantilles inicials per departament.
- Configurar blocs, items i pesos per bloc.
- Preparar dades base per iniciar execucio real.

### Fase 4 - Crear acces d'execucio des d'Esdeveniments

- Integrar el punt d'entrada per executar autoauditories des del flux d'event.
- Garantir flux 100% mobil-first per omplir i adjuntar evidencies.

### Fase 5 - Validar submoduls de Valoracio i Consulta

- Validar revisio i estat de les auditories (completed/under_review/validated/rejected).
- Validar consulta operativa i resum mensual (incloent vista per responsable).
- Validar coherencia final amb regles d'incentius.

## 12. Decisions tancades i pendents

### Decisions tancades

- Modul Auditoria amb 3 submoduls: Plantilles, Valoracio, Consulta
- Execucio des de modul Esdeveniments
- Persistencia hibrida Firestore + Storage
- Estructura comuna de plantilla i pes per bloc

### Decisions pendents

- Disseny detallat del submodul Valoracio
- Punt d'entrada UX a Esdeveniments (unificat vs separat amb Incidencies)
- Definicio exacta de perfils/rols i matriu de permisos
- Regles finals de tancament i validacio d'una auditoria completada

---

Aquest document es la base mare de referencia per passar, en la seguent fase, a disseny funcional detallat i posterior implementacio.
