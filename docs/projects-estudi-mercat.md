# Estudi de Mercat
## Referents per al modul `Projects`

Data de referencia: 2026-03-07

## 1. Objectiu de l'estudi

Aquest document recull referents del mercat que poden servir d'inspiracio per al modul `Projects` de Cal Blay.

L'objectiu no es trobar una eina identica, sino identificar patrons utiles de:

- estructura funcional
- arquitectura de producte
- organitzacio de la informacio
- disseny d'interficie
- relacio entre projecte, conversa, documents i tasques

## 2. Conclusio executiva

No s'ha detectat una eina estandard que repliqui exactament el concepte de `Projects` definit per Cal Blay.

El model que estem construint s'assembla mes a una combinacio de:

- hub de projecte
- sales o canals contextuals
- documentacio estructurada
- repositori documental
- seguiment de tasques
- vista executiva transversal

La millor aproximacio no es copiar un producte unic, sino combinar bones practiques de diferents eines.

## 3. Matriu comparativa

| Eina | Que fa especialment be | Que no encaixa del tot | Que podem aprofitar |
| --- | --- | --- | --- |
| Basecamp | Converteix cada projecte en una base unica amb missatges, to-dos, fitxers, calendari i seguiment | Es massa generic i menys fort en governanca formal per fases | La idea de projecte com a centre unic de treball |
| Slack | Excel.lent en canals contextuals, conversa, pestanyes, canvases i llistes | Pot derivar massa facilment en soroll de xat | El model de sales, tabs, recursos i tasques dins un context compartit |
| Microsoft Teams + Planner + Loop | Molt potent en canals, fitxers, permisos, tasques i col.laboracio documental | UX mes pesada i menys elegant si es copia massa literalment | La relacio canal-fitxers-tasques-document compartit |
| Notion | Molt fort en projecte com a fitxa viva, documentacio, bases de dades i context unificat | Si se'n copia la flexibilitat total, es perd governanca | La fitxa mare, el document viu i l'estructura modular neta |
| Confluence | Molt bo en documentacio, coneixement i espais estructurats d'equip | No es prou fort com a entorn operatiu per si sol | L'espai mare de context, decisions i coneixement |
| Asana | Molt bo en seguiment, salut del projecte, portfoli i visio executiva | Massa centrat en task/project tracking tradicional | La capa de supervisio, estat, riscos i seguiment executiu |
| monday.com | Molt bo en intake, dashboards, workflows i workdocs connectats | Risc de convertir-ho en una eina massa tabular | Intake de projectes, dashboards i docs connectats a accions |
| ClickUp | Molt bo en unir xat, docs i tasques en un mateix lloc | Pot resultar dens i sobrecarregat | La connexio entre conversa, document i execucio |

## 4. Analisi per referent

## Basecamp

### Valor per a `Projects`

Basecamp es un referent clar per entendre el projecte com un espai unic i autosuficient. La seva estructura combina missatges, tasques, fitxers, calendari i seguiment dins del mateix projecte.

### Quina inspiracio extreure

- projecte com a base operativa unica
- combinacio simple de comunicacio i execucio
- estructura facil d'entendre per a usuaris no tecnics

### Que no copiar

- simplicitat excessiva en processos que, en el cas de Cal Blay, requereixen mes protocol
- poca formalitzacio de fases, validacions i rols corporatius

## Slack

### Valor per a `Projects`

Slack ha evolucionat cap a un model on els canals no son nomes conversa, sino espais amb tabs, canvases, llistes i recursos.

### Quina inspiracio extreure

- sales contextuals dins d'un entorn mes gran
- tabs per separar missatges, documents, llistes o recursos
- capacitat d'invitar participants i gestionar accessos

### Que no copiar

- una experiencia massa centrada en xat
- saturacio de missatges com a centre del producte

## Microsoft Teams + Planner + Loop

### Valor per a `Projects`

Teams aporta una logica molt util de canals amb documents compartits, mentre que Planner cobreix tasques i Loop reforca la part documental i col.laborativa.

### Quina inspiracio extreure

- cada sala o canal pot tenir els seus propis fitxers
- documentacio compartida lligada al context de la sala
- tasques vinculades a espais de treball
- permisos i comparticio molt clars

### Que no copiar

- pes visual i funcional excessiu
- massa dependencia d'integracions visibles per a l'usuari

## Notion

### Valor per a `Projects`

Notion es un dels millors referents per una fitxa mare de projecte molt rica, flexible i neta visualment.

### Quina inspiracio extreure

- pantalla mare modular
- documentacio i dades convivint al mateix lloc
- vista neta, espaiada i facil d'escannejar
- relacio entre context, estat i execucio

### Que no copiar

- llibertat total d'estructura
- model massa obert sense protocol fix

## Confluence

### Valor per a `Projects`

Confluence es especialment util com a benchmark de coneixement, decisions, documentacio de projecte i espais compartits per equips.

### Quina inspiracio extreure

- espai mare del projecte com a font de veritat
- estructuracio de contingut per seccions
- visibilitat de context i recursos compartits

### Que no copiar

- dependencia excessiva de pagines textuals
- falta de musculatura nativa per a coordinacio operativa rapida si no es combina amb altres capes

## Asana

### Valor per a `Projects`

Asana es molt fort en seguiment executiu, estat de salut, portfolios i visio de responsables.

### Quina inspiracio extreure

- capa de resum executiu
- estat del projecte i health
- seguiment transversal per direccio o admin
- visio clara de bloquejos i desviacions

### Que no copiar

- centrar tota l'experiencia en tasques
- reduir el projecte a una llista o timeline

## monday.com

### Valor per a `Projects`

monday.com es especialment interessant per intake, workflows i documents connectats a execucio.

### Quina inspiracio extreure

- entrada estructurada de nous projectes
- dashboards resum
- workdocs connectats a accions
- formularis com a porta d'entrada al proces

### Que no copiar

- dependencia excessiva de taules
- sensacio de sistema massa configuratiu si no es simplifica

## ClickUp

### Valor per a `Projects`

ClickUp es probablement el referent mes proper en la idea de voler unir conversa, documentacio i execucio dins un mateix entorn.

### Quina inspiracio extreure

- missatges vinculats al treball
- documents que poden derivar en tasques
- context compartit entre chat, docs i projecte

### Que no copiar

- densitat d'opcions
- interface carregada
- massa funcionalitats visibles alhora

## 5. Recomanacio de benchmark per a Cal Blay

Per construir `Projects`, la recomanacio es treballar amb un benchmark combinat:

### Estructura base

- Basecamp
- Teams

Per la idea de projecte com a espai mare amb sales contextuals.

### Capa documental i de context

- Notion
- Confluence

Per la fitxa mare, el document viu, el context compartit i les decisions.

### Capa operativa

- Slack
- ClickUp

Per la relacio entre sales, conversa, tasques i recursos.

### Capa executiva

- Asana
- monday.com

Per visibilitat transversal, alertes i estat global.

## 6. Recomanacions de disseny

Del mercat es poden extreure aquestes pautes de disseny:

- la pantalla mare del projecte ha de ser modular i molt clara
- cal separar visualment governanca, operativa i seguiment
- les sales han d'estar subordinades al projecte, no competir-hi visualment
- el xat no ha de dominar la pantalla principal
- documents i tasques han de tenir context visible
- l'estat del projecte ha de ser sempre visible a primera capa
- direccio i admin necessiten una vista resum clara, no una vista operativa saturada

## 7. Riscos de producte detectats al mercat

Si es copia malament el mercat, el modul podria caure en algun d'aquests errors:

- convertir-se en un gestor de tasques generic
- convertir-se en un xat amb documents adjunts
- convertir-se en un repositori de documents sense vida operativa
- convertir-se en una eina massa configurable i poc governada
- convertir-se en una experiencia pesada i corporativa poc usable

## 8. Posicionament recomanat per al modul `Projects`

`Projects` hauria de posicionar-se internament com:

"L'espai corporatiu on neix, es defineix, es valida, es coordina i es segueix un nou projecte de Cal Blay."

No com:

- un task manager
- un drive intern
- un forum antic
- un xat corporatiu

Sino com una combinacio estructurada de:

- protocol
- context
- sales
- documents
- tasques
- seguiment

## 9. Fonts consultades

- Notion Projects: https://www.notion.com/product/projects
- Basecamp: https://basecamp.com/pricing/
- Slack Canvas: https://slack.com/features/canvas
- Slack Lists: https://slack.com/features/task-list
- Slack tabs i recursos en canals: https://slack.com/intl/en-us/help/articles/205239997-Pin-messages-and-bookmark-links
- Microsoft Teams fitxers i canals: https://support.microsoft.com/en-us/office/collaborate-on-files-in-microsoft-teams-9b200289-dbac-4823-85bd-628a5c7bb0ae
- Microsoft Planner: https://support.microsoft.com/en-us/office/manage-your-tasks-in-microsoft-planner-7e3d66b4-684d-4a2f-8fbe-908c614d8314
- ClickUp Docs: https://clickup.com/features/docs
- ClickUp Chat: https://clickup.com/features/chat
- Confluence per project management: https://www.atlassian.com/software/confluence/use-cases/project-management
- monday Workdocs: https://monday.com/workdocs
- monday project management: https://monday.com/project-management
