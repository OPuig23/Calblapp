# Arquitectura del Pilot — Mòdul de Missatgeria (Manteniment)

## 1) Abast del pilot
**Tipus únic:** Manteniment  
**Origen i ubicacions:**

**Events**
- Clos la Plana  
- Josep Massachs  
- Mirador Events  
- Font de la Canya  
- La Masia  

**Restaurants**
- Mirador  
- Nàutic  
- La Masia  
- Camp Nou  
- Soliver  

**Usuaris pilot**
- Anna C.  
- Gaston  
- Jona  
- Aroa  
- David  
- Joan  
- Natasha  
- Fred  
- Sonia  
- Jordi  
- Santi  
- Oriol (admin)

**Permisos**
- **Admin**: crea canals i assigna subscripcions.  
- **Subscrits**: poden llegir i escriure al canal.  
- **No subscrits**: no veuen res.  

**De moment: només canals (sense 1:1)**  

---

## 2) Model de canals
Un canal és la combinació:

```
Tipus  →  Origen  →  Ubicació
```

Exemples:
- `Manteniment > Events > Clos la Plana`
- `Manteniment > Restaurants > Nàutic`

---

## 3) Tipus de missatge dins del canal
Quan s’envia un missatge dins el canal, es pot triar la visibilitat:

- **`channel`** → el veuen tots els subscrits  
- **`direct`** → només el veuen els usuaris seleccionats  

Si és **direct**, només el veu el destinatari i la resta del canal **no el veu**.

---

## 4) Estructura de dades (definitiva)

### A) `channels`
Canal únic per combinació Tipus + Origen + Ubicació.

**Camps**
- `type`: `"manteniment"`
- `source`: `"events"` | `"restaurants"`
- `location`: `"Clos la Plana"` (o restaurant)
- `name`: `"Manteniment · Events · Clos la Plana"`
- `createdBy`
- `createdAt`
- `lastMessagePreview`
- `lastMessageAt`

### B) `channelMembers`
Relació usuari ↔ canal.

**Camps**
- `channelId`
- `userId`
- `role`: `"member"`
- `joinedAt`
- `unreadCount` (per canal)

### C) `messages`
Missatges del canal.

**Camps**
- `channelId`
- `senderId`
- `senderName`
- `body`
- `createdAt`
- `visibility`: `"channel"` | `"direct"`
- `targetUserIds`: `[uid]` (només si direct)

### D) `userMessageState` (opcional, futur)
Per marcar llegits a nivell de missatge.

**Camps**
- `userId`
- `messageId`
- `readAt`

*(Per al pilot n’hi ha prou amb `unreadCount` per canal.)*

---

## 5) Flux bàsic d’ús

**Inbox**
- Només canals on l’usuari està subscrit.  
- Mostra últim missatge + comptador de no llegits.  

**Conversa**
- Carrega només els **15 últims missatges**.  
- Històric antic només si l’usuari fa scroll amunt.  

**Enviar**
- Qualsevol subscrit pot enviar missatge.  
- Es pot triar: **tothom del canal** o **usuari concret**.  

---

## 6) Configuració de subscripcions
Es gestiona dins **Configuració**.

**Per usuari**
- Llista de canals disponibles (del pilot).  
- Checkbox per subscriure’s o sortir.  
- Opcions: rebre push / silenciar canal.  

**Per admin**
- Pot editar subscripcions de qualsevol usuari.  

---

## 7) Control de cost i rendiment
- **Carregar 15 missatges** per defecte.  
- **Històric antic** només manual.  
- **Auto-borrat a 6 mesos** (futur).  

---

## 8) Decisió d’UI
Base **converses**, amb:
- **Pestanya per Tipus** (aquí només Manteniment)  
- **Filtres per Origen i Ubicació**  
- **Missatges directes** dins del canal (no visibles per tothom)

---

## 9) Decisions confirmades
- Primer nivell mental: **Tipus** (Manteniment).  
- Canals per combinació Tipus + Origen + Ubicació.  
- Missatges directes només visibles per destinataris.  
- Subscripcions a **Configuració**.  
- Pilot sense 1:1.  

