# Document Tecnic Mare v1
## Modul `Projects` d'Opsia / Cal Blay

## 1. Visio del modul

El modul `Projects` neix per digitalitzar i ordenar el protocol corporatiu de creacio i gestio de nous projectes de Cal Blay, amb un enfocament clar en la coordinacio interna entre departaments.

No es planteja com un gestor de projectes classic centrat nomes en tasques, sino com un entorn integral on un projecte pot:

- neixer formalment
- definir-se amb estructura
- validar-se
- activar departaments implicats
- desplegar fronts de treball i tasques
- coordinar-se, si cal, mitjancant sales
- compartir documents
- gestionar tasques
- mantenir tracabilitat
- avaluar-se al tancament

El valor principal del modul es reduir dispersio d'informacio, ordenar la comunicacio i donar visibilitat real sobre l'estat de cada projecte.

## 2. Objectiu de negoci

El modul ha de permetre que qualsevol nou projecte de Cal Blay segueixi un circuit corporatiu comu, amb criteri, context i responsabilitats definides abans d'activar recursos.

Objectius principals:

- formalitzar qualsevol iniciativa abans de posar-la en marxa
- garantir alineacio amb objectius de l'empresa
- identificar des de l'inici els departaments afectats
- centralitzar documentacio, conversa i seguiment
- millorar la comunicacio interna entre arees
- donar visibilitat completa al responsable del projecte
- oferir a admin i direccio una capa de supervisio global

## 3. No objectius inicials

El modul no ha de ser, en aquesta primera etapa:

- un xat corporatiu generic
- un repositori documental sense estructura
- un gestor de tasques desconnectat del context
- una eina avancada de planificacio tipus MS Project
- un substitut universal de totes les eines operatives existents

## 4. Principis funcionals

El disseny del modul s'ha de basar en aquests principis:

- cada projecte te una fitxa mare unica
- cap projecte no es pot activar sense document inicial obligatori
- la informacio ha d'estar estructurada per fases
- tots els projectes segueixen la mateixa estructura corporativa base
- la comunicacio ha de ser contextual, no dispersa
- el projecte no neix amb sales
- les sales son una capa opcional de coordinacio dins del projecte
- el desplegament operatiu del projecte passa per blocs o fronts de treball i per tasques
- les tasques poden tenir dependencies i paral.lelismes
- el responsable del projecte ha de tenir visibilitat total del seu entorn
- admin i direccio han de tenir una visio transversal resumida de tots els projectes

## 5. Entitat principal: Projecte

El `Projecte` es l'expedient mare d'una iniciativa.

Ha de concentrar tota la informacio estructural, funcional i operativa del projecte.

Contingut minim del projecte:

- nom del projecte
- responsable impulsor
- project owner
- context i necessitat detectada
- objectius estrategics
- impacte esperat
- riscos identificats
- termini estimat
- pressupost orientatiu
- estat del projecte
- departaments implicats
- responsables departamentals
- objectius operatius
- blocs o fronts de treball
- documents
- tasques
- dependencies i bloquejos
- sales vinculades, si n'hi ha
- decisions i historial
- evidencies de seguiment
- avaluacio final

## 6. Protocol corporatiu traduit a cicle de vida digital

El modul ha de reflectir el protocol corporatiu seguent:

1. Idea
2. Document inicial
3. Identificacio de departaments implicats
4. Definicio d'objectius
5. Kickoff
6. Planificacio
7. Execucio
8. Control i seguiment
9. Avaluacio final

Possibles estats funcionals simplificats dins la webapp:

- Esborrany
- En definicio
- Pendent de validacio
- Validat
- En kickoff
- En planificacio
- En execucio
- En seguiment
- Tancat
- Avaluat

Aquests estats s'han de poder mapar al protocol real de l'empresa.

## 7. Fase 1: document inicial obligatori

Aquesta es una regla estructural critica del sistema.

Sense document inicial no es pot activar cap projecte.

### Format funcional

El document inicial sera de tipus `hibrid`:

- formulari estructurat dins la webapp
- document adjunt d'origen o suport

### Camps minims obligatoris

- nom del projecte
- responsable impulsor
- context i necessitat detectada
- objectius estrategics
- impacte esperat
  - facturacio
  - EBITDA
  - eficiencia
  - marca
- riscos identificats
- termini estimat
- pressupost orientatiu

### Regla de negoci

Un projecte pot existir en estat `esborrany`, pero no pot avancar a estat validable o actiu si no compleix:

- fitxa inicial completada
- document base adjunt

## 8. Departaments implicats

El sistema ha de permetre identificar quins departaments queden afectats pel projecte.

Departaments inicials previstos:

- Produccio
- Cuina
- Logistica
- Comercial
- Finances
- RRHH
- Marqueting
- Restaurants
- Festivals

Per cada departament caldra definir:

- nivell d'impacte: Alt / Mig / Baix
- tipus d'implicacio: Operativa / Economica / Estrategica
- responsable assignat

Aquesta informacio ha de ser visible des de la fitxa general del projecte.

## 9. Objectius del projecte

La fase de definicio d'objectius s'ha de traduir a una estructura clara dins el sistema.

Cada objectiu ha de complir:

- ser concret
- ser mesurable
- tenir data
- tenir responsable

A futur, aquests objectius poden servir de base per seguiment i avaluacio final.

## 10. Kickoff

El modul ha de contemplar formalment la fase de kickoff com un punt de transicio entre definicio i execucio.

Participants previstos:

- responsable del projecte
- departaments implicats
- direccio, si el projecte te impacte estrategic

Contingut minim a registrar:

- presentacio d'objectius
- definicio d'abast
- expectatives
- calendari preliminar
- rols i responsabilitats
- sistema de seguiment

La webapp no ha de reproduir necessriament la reunio en si, pero si deixar-ne tracabilitat i evidencia.

## 11. Planificacio

La fase de planificacio ha d'incloure com a minim:

### Cronograma

- fases
- fites clau
- dates
- responsable per fase

### Rols i responsabilitats

- Project Owner
- Project Manager, si aplica
- responsables departamentals
- equips executors

Per cada rol:

- que s'espera
- dedicacio estimada
- KPIs associats

### Pla de comunicacio interna

- canal
- frequencia
- format
- public objectiu

### Desplegament del treball

Despres del kickoff, el projecte es desplega en blocs o fronts de treball, i dins de cada bloc poden apareixer tasques mes petites.

Aquesta estructura ha de permetre:

- tenir una visio clara dels grans fronts oberts
- evitar llistes planes massa llargues
- desgranar una feina gran en tasques concretes
- identificar dependencies i treball en paral.lel

## 12. Blocs o fronts de treball

El projecte no es desplega directament nomes en microtasques.

La primera capa operativa recomanada es la de `blocs` o `fronts de treball`.

Exemples:

- permisos i llicencies
- adequacio d'instal.lacions
- contractacio i persones
- equipament
- preparacio operativa d'obertura

### Funcio dels blocs

- ordenar el projecte en grans ambits de feina
- fer visible qui porta cada front
- agrupar tasques relacionades
- facilitar seguiment visual
- servir com a possible punt d'origen d'una sala si la coordinacio ho exigeix

## 13. Sales del projecte

Cada projecte pot contenir una o mes `sales`, pero no neix amb cap sala per defecte.

La sala es una unitat de coordinacio dins del projecte. No es nomes un xat.

### Funcions d'una sala

- coordinar una part del projecte quan hi intervenen diverses persones o departaments
- agrupar participants de diferents departaments
- centralitzar conversa contextual
- compartir documents
- vincular tasques a un ambit concret
- deixar tracabilitat de decisions i seguiment operatiu

### Participants

- poden participar-hi usuaris de diferents departaments
- es poden fer invitacions
- la participacio no ha d'estar limitada a un unic departament

### Model de creacio de sales

El model es `emergent i mixt`:

- un projecte no crea sales al neixer
- una sala pot crear-se manualment pels usuaris amb permis
- una sala pot suggerir-se o crear-se quan un bloc o una tasca requereix coordinacio transversal real

### Regla funcional acordada

- una tasca o un bloc poden existir sense sala
- una sala pot contenir diverses tasques
- una sala apareix quan una part del projecte requereix coordinacio compartida
- la presencia de diferents persones o departaments dins una mateixa feina es un dels principals desencadenants de creacio d'una sala

### Criteri recomanat

No totes les tasques han de crear sala. Nomes aquelles que realment obrin un front de treball col.laboratiu.

## 14. Comunicacio dins les sales

A diferencia de la fitxa mare del projecte, dins les sales si que pot existir una capa de conversa mes operativa.

Aquesta conversa pot assemblar-se funcionalment al model existent al modul `Ops`, pero sempre contextualitzada dins del projecte i dins la sala corresponent.

Per tant:

- hi pot haver xat o conversa operativa
- hi pot haver comparticio documental
- hi pot haver seguiment de tasques
- tota la conversa ha de quedar vinculada al context de la sala

## 15. Documents

El modul ha d'incloure gestio documental en dos nivells:

### Nivell projecte

Documents globals del projecte:

- document inicial
- presentacions
- pressupostos
- annexos
- documents executius
- actes o evidencies de seguiment

### Nivell sala

Documents especifics d'un front de treball:

- fitxers de treball
- versions
- materials compartits
- documents de coordinacio

La idea funcional s'aproxima a una logica tipus SharePoint o Drive, pero integrada dins del context del projecte.

## 16. Tasques

Les tasques formen part del seguiment operatiu del projecte.

### Principis acordats

- una tasca pot pertanyer al projecte
- una tasca pot pertanyer a un bloc o front de treball
- una tasca pot estar vinculada a una sala
- una tasca sempre ha de tenir responsable
- una tasca ha de tenir estat
- una tasca pot tenir data objectiu
- una tasca gran es pot desgranar en tasques mes petites
- hi pot haver dependencies entre tasques
- hi pot haver tasques que avancin en paral.lel
- una tasca ha de ser visible en el seu context i tambe dins la vista global del projecte

### Relacio bloc-tasca

- el projecte es pot ordenar en blocs o fronts
- cada bloc pot contenir una o mes tasques
- una tasca gran pot derivar en diverses tasques petites

### Relacio tasca-sala

- no tota tasca necessita sala
- no tot bloc necessita sala
- algunes tasques o blocs poden donar lloc a una sala
- una sala pot agrupar diverses tasques del mateix ambit

### Dependencies

El modul ha de contemplar com a minim aquestes relacions:

- tasques que depenen d'una altra per iniciar-se
- tasques bloquejades per una pendent
- tasques que poden executar-se en paral.lel

## 17. Visibilitat i seguiment

### Vista global principal

La vista global principal es `per projecte`.

Cada responsable de projecte ha de poder veure:

- estat general del projecte
- fase actual
- blocs o fronts oberts
- tasques obertes i tancades
- dependencies critiques
- bloquejos
- sales actives
- activitat recent
- desviacions o punts pendents

### Vista executiva transversal

Els rols `admin` i `direccio` han de disposar d'una vista resumida de tots els projectes per detectar:

- projectes bloquejats
- retards
- projectes sense activitat
- tasques critiques vencudes
- pendents de validacio
- riscos elevats
- necessitat d'intervencio

Aquesta vista no es la vista operativa principal, sino una capa de supervisio.

## 18. Rols

### Responsable impulsor

Persona que impulsa la idea inicial i promou la creacio del projecte.

### Project Owner

Responsable global del projecte.

Ha de tenir visibilitat completa sobre:

- fitxa del projecte
- sales
- tasques
- documents
- activitat general
- seguiment i estat

### Project Manager

Rol opcional, si el projecte ho requereix.

### Responsables departamentals

Referents de cada area afectada.

### Participants de sala

Usuaris convidats a espais concrets de treball.

### Admin

Visio transversal sobre tots els projectes i capacitat de supervisio global.

### Direccio

Acces executiu a l'estat dels projectes, especialment aquells amb impacte estrategic.

## 19. Arquitectura funcional del modul

A nivell conceptual, el modul es compon de 4 capes:

### 1. Capa de governanca

- document inicial
- definicio del projecte
- fases
- departaments implicats
- objectius
- validacio
- kickoff
- rols

### 2. Capa operativa

- blocs o fronts de treball
- documents
- tasques
- dependencies
- sales, nomes quan cal coordinacio transversal
- xat contextual dins les sales
- activitat de treball

### 3. Capa de seguiment

- estat del projecte
- vista global del projecte
- seguiment de tasques
- alertes
- bloquejos
- control d'activitat

### 4. Capa executiva

- resum global de tots els projectes
- alertes per admin i direccio
- indicadors de salut del portfoli

## 20. Estructura funcional de la UI

Sense entrar encara en disseny final, la UI del modul probablement s'hauria d'organitzar aixi:

- llistat o dashboard de projectes
- fitxa mare del projecte
- bloc de fases i estat
- bloc de document inicial
- bloc de departaments implicats
- bloc d'objectius
- bloc de planificacio
- bloc de fronts o blocs de treball
- bloc de sales
- bloc de documents
- bloc de tasques
- bloc de seguiment
- bloc d'avaluacio final

## 21. Avaluacio final del projecte

En tancar el projecte, el sistema ha de permetre registrar:

- objectius assolits %
- ROI real
- aprenentatges
- errors detectats
- impacte operatiu real
- escalabilitat futura

Aixo es important perque el modul no nomes serveixi per obrir projectes, sino tambe per generar coneixement corporatiu.

## 22. Resum del model conceptual

El model funcional resumit es:

- `Projecte` com a expedient mare
- `Fases` com a traduccio del protocol corporatiu
- `Document inicial hibrid` com a requisit d'activacio
- `Departaments implicats` com a mapa d'impacte
- `Blocs o fronts de treball` com a primera capa de desplegament
- `Tasques` com a seguiment operatiu
- `Dependencies` com a part del control de seqüencia i bloqueig
- `Sales` com a unitats opcionals de coordinacio
- `Xat` com a funcionalitat dins les sales
- `Documents` com a repositori contextual
- `Vista global per projecte` com a centre de control del responsable
- `Vista transversal executiva` com a capa de supervisio per admin i direccio

## 23. Decisions ja tancades

Queden definides aquestes decisions:

- tots els projectes segueixen la mateixa estructura corporativa base
- la vista global principal es per projecte
- admin i direccio tenen vista transversal resumida
- el document inicial es hibrid
- el projecte no neix amb sales
- les sales segueixen un model emergent i mixt
- els blocs o fronts de treball son la primera capa operativa del projecte
- una tasca gran es pot dividir en tasques mes petites
- les tasques poden tenir dependencies i paral.lelismes
- una tasca pot existir sense sala
- una sala pot contenir diverses tasques
- nomes algunes tasques o blocs poden generar sala
- el Project Owner te visibilitat total del seu projecte

## 24. Proper pas recomanat

Ara el mes util es fer la `v2 del document`, centrada en 4 blocs mes concrets:

- regles de negoci detallades
- permisos exactes per rol
- mapa de pantalles / experiencia d'usuari
- definicio del MVP i fases posteriors
