# 🌿 Git Branch Workflow

> **ITPM_Inventory-POS_System**

---

## 🏭 Main Branch

### `main`

> 🟢 **Production Line**

## Main branch - eto yung main production line natin. kumbaga eto yung completed na. mag p-push lang dito once tapos na yung nasa test.

---

## 🧪 Test Branch

### `test`

> 🟡 **Integration & Testing**

## Test branch - dito papasok lahat ng galing sa dev. i-iintegrate lahat ng nang galing sa dev, then i t-test kung gagana lahat. walang i r-remove dito.

---

## 🛠️ Dev Branch

### `dev`

> 🔵 **Development Line**

## Dev branch - dito naman gagawin lahat ng modules, lahat ng functions, lahat ng bug fix, lahat lahat.

---

### 🔄 Branch Flow

```text
              ┌──────────────────┐
              │       DEV        │
              │  🛠️ Development  │
              └────────┬─────────┘
                       │
                       ▼
              ┌──────────────────┐
              │       TEST       │
              │ 🧪 Integration   │
              │    & Testing     │
              └────────┬─────────┘
                       │
                       ▼
              ┌──────────────────┐
              │       MAIN       │
              │ 🏭 Production    │
              │     /Stable      │
              └──────────────────┘
