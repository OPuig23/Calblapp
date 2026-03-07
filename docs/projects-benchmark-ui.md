# Benchmark UI
## Patrons de pantalla i navegacio per al modul `Projects`

Data de referencia: 2026-03-07

## 1. Objectiu

Aquest document recull patrons de pantalla, navegacio i jerarquia visual detectats en eines del mercat que poden servir de referencia per al modul `Projects`.

No defineix encara el disseny final de Cal Blay. Defineix:

- quins patrons val la pena aprofitar
- quins patrons no encaixen
- com traduir-los a una experiencia propia del modul

## 2. Conclusio de benchmark

La millor UI per a `Projects` no hauria de copiar una eina unica.

La recomanacio es combinar:

- la claredat modular de Notion
- l'estructura de projecte-hub de Basecamp
- la logica de canals i pestanyes de Slack / Teams
- la capa de seguiment executiu d'Asana

El resultat hauria de ser:

- menys dens que ClickUp
- menys pesat que Teams
- menys obert que Notion
- menys centrat en xat que Slack
- menys centrat en tasques que Asana

## 3. Principis de UI per a `Projects`

- el projecte ha de ser l'element central, no la tasca ni el xat
- la pantalla principal ha de mostrar context, estat i activitat sense saturar
- les sales han d'estar subordinades al projecte
- la governanca i l'operativa s'han de percebre com a capes diferents
- el xat ha d'estar accessible, pero no dominar la fitxa mare
- la documentacio ha de ser visible com a part del projecte, no com un annex perdut
- la vista de direccio ha de ser resumida i basada en salut del projecte

## 4. Patrons de referencia per pantalla

## 4.1 Dashboard de projectes

### Referents utilitzables

- Asana portfolios
- monday dashboards
- Notion databases amb vistes filtrades

### Pattern recomanat

Pantalla amb llistat o graella de projectes, filtres i resum superior.

Blocs recomanats:

- cercador
- filtres per estat, owner, departament, criticitat, activitat recent
- targetes o files de projecte
- indicadors resum
- alertes o projectes que necessiten accio

### Que ha de mostrar cada projecte

- nom
- estat
- fase actual
- owner
- activitat recent
- percentatge d'objectius o tasques
- nivell de risc o bloqueig

### Recomanacio visual

Fer servir targetes compactes o files enriquides. No recomano taules massa rigides com a vista principal.

## 4.2 Fitxa mare del projecte

### Referents utilitzables

- Notion per estructura modular
- Basecamp per claredat de projecte-hub
- Asana per resum d'estat

### Pattern recomanat

Una pagina mare molt clara, amb capcalera fixa i seccions verticals o pestanyes superiors.

Capcalera recomanada:

- nom del projecte
- estat
- fase
- owner
- responsables clau
- semafor de salut
- accessos d'accio rapida

Cos de la pagina:

- resum executiu
- document inicial
- objectius
- departaments implicats
- sales
- tasques
- documents
- activitat

### Recomanacio de layout

Model de 3 franges:

- franja superior: identitat i estat
- columna central: contingut principal
- columna lateral: activitat, alertes, propers passos

## 4.3 Fases del projecte

### Referents utilitzables

- Asana status / progress
- monday workflow states
- Notion progress properties

### Pattern recomanat

Una franja visible sempre a la fitxa de projecte amb el cicle de vida i la fase actual.

Pot adoptar forma de:

- barra de fases
- stepper corporatiu
- timeline simplificada

### Recomanacio

Per `Projects`, el model de stepper corporatiu encaixa millor que un gantt com a capa principal.

El gantt, si algun dia existeix, hauria de ser una vista secundaria.

## 4.4 Sales del projecte

### Referents utilitzables

- Slack channels
- Teams channels
- Basecamp campfires / message areas com a inspiracio parcial

### Pattern recomanat

Les sales han de viure dins el projecte com una seccio clara i no com un producte separat.

Cada sala hauria de mostrar:

- nom
- objectiu o tema
- participants
- ultima activitat
- nombre de tasques
- nombre de documents
- estat o etiqueta

### Recomanacio visual

Vista en llista amb cards o files expandibles.

Cada sala pot obrir-se en subpagina o panell dedicat, pero sempre mantenint el context del projecte pare.

## 4.5 Interior d'una sala

### Referents utilitzables

- Slack tabs en canals
- Teams canals amb files i pestanyes
- ClickUp per connexio entre xat i tasques

### Pattern recomanat

Una sala no hauria de ser una simple pantalla de xat.

Ha de tenir estructura per pestanyes o subseccions:

- Conversa
- Tasques
- Documents
- Context / resum

### Recomanacio de layout

Capcalera de sala:

- nom
- projecte pare
- participants
- propietari o responsable
- estat

Zona central:

- pestanyes superiors o subnavegacio

### Regla important

La pestanya `Conversa` pot ser la vista per defecte en una sala, pero no a la fitxa mare del projecte.

## 4.6 Documents

### Referents utilitzables

- Notion docs
- Teams / SharePoint files
- monday Workdocs

### Pattern recomanat

Separar documents en dos nivells molt clars:

- documents del projecte
- documents de la sala

### Recomanacio visual

No tractar els documents com una simple llista plana.

Cal visualitzar:

- categoria
- ubicacio
- ultima actualitzacio
- responsable
- vinculacio amb projecte o sala

## 4.7 Tasques

### Referents utilitzables

- Asana
- monday
- ClickUp
- Notion project views

### Pattern recomanat

La vista de tasques dins un projecte ha de poder alternar:

- llista
- board
- calendari, si te sentit

Pero la vista per defecte hauria de ser simple i llegible.

### Recomanacio funcional

Cada tasca hauria de mostrar clarament:

- titol
- responsable
- estat
- data objectiu
- sala vinculada, si existeix
- nivell de criticitat

## 4.8 Vista executiva transversal

### Referents utilitzables

- Asana portfolios
- monday dashboards

### Pattern recomanat

Una pantalla molt resumida per admin i direccio.

Elements recomanats:

- KPIs resum
- projectes per estat
- projectes amb risc
- projectes bloquejats
- projectes sense activitat
- pendents de validacio

### Recomanacio visual

Aquesta pantalla ha de ser sobria i de lectura rapida. No ha d'heretar la complexitat operativa del nivell projecte.

## 5. Navegacio recomanada

## Nivell 1

Entrada al modul:

- dashboard de projectes

## Nivell 2

Entrada a un projecte:

- overview
- fases
- sales
- tasques
- documents
- avaluacio

## Nivell 3

Entrada a una sala:

- conversa
- tasques
- documents
- context

### Recomanacio clau

No barrejar tot en una unica pantalla infinita. Cal una navegacio clara entre:

- vista global del projecte
- espais operatius concrets

## 6. Pattern de jerarquia visual

La jerarquia visual recomanada per a `Projects` hauria de ser:

1. Identitat i estat del projecte
2. Seguiment i punts d'atencio
3. Context i governanca
4. Sales actives
5. Tasques i documents
6. Activitat detallada

### Implicacio

Si l'activitat o el xat passen al punt 1 o 2, el modul perdera el seu valor diferencial i semblara una eina de missatgeria.

## 7. Que copiar del mercat

- de Notion: modularitat, aire, seccions clares, lectura neta
- de Basecamp: projecte com a centre de tot
- de Slack: canals o sales com a contenidors contextuals amb pestanyes
- de Teams: documents dins el context del canal
- d'Asana: resum executiu, estat i seguiment
- de monday: intake i dashboards de control

## 8. Que evitar

- UX massa densa tipus ClickUp
- excés de taula com a llenguatge principal
- massa dependencia del xat
- massa llibertat d'estructura
- pantalles corporatives carregades i pesades
- mesclar governanca i conversa sense separar capes

## 9. Proposta de traduccio a `Projects`

### Dashboard

Una vista resum de projectes amb alertes i filtres.

### Projecte

Una fitxa mare amb overview clar, estat, fases, objectius, departaments, sales, tasques i documents.

### Sala

Un espai subordinat al projecte amb conversa, tasques i documents propis.

### Executiu

Un dashboard transversal per admin i direccio amb lectura de salut del conjunt.

## 10. Benchmark principal recomanat

Si hagues de construir wireframes de referencia, la combinacio recomanada seria:

- Notion per la fitxa mare del projecte
- Slack / Teams per l'interior d'una sala
- Asana per la vista executiva
- Basecamp per la logica global del projecte com a hub

## 11. Fonts consultades

- Notion Projects: https://www.notion.com/product/projects
- Slack channels: https://slack.com/features/channels
- Slack tabs: https://slack.com/help/articles/32562841868307-Add-and-manage-tabs-in-channels-and-direct-messages
- Slack simplified layout: https://slack.com/help/articles/41214514885907-Use-simplified-layout-mode-in-Slack
- Basecamp pricing and product overview: https://basecamp.com/pricing/
- Asana features: https://asana.com/features
