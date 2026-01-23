# Tech Stack Evaluation: React, Tailwind, Next.js

**Erstellt:** 2026-01-23
**Branch:** claude/evaluate-tech-stack-8iJZK
**Kontext:** Bewertung moderner Frontend-Frameworks für Ruhestand-App-Final

---

## Executive Summary

**Empfehlung: NICHT migrieren zu React/Tailwind/Next.js**

Die aktuelle Vanilla-JS-Architektur mit nativen ES6-Modulen ist für dieses Projekt optimal geeignet. Eine Migration zu modernen Frameworks würde erhebliche Nachteile bei Bundle-Size, Build-Komplexität und Offline-Fähigkeit mit sich bringen, ohne signifikante Vorteile zu bieten.

---

## Aktuelle Architektur (Ist-Zustand)

### Tech Stack
- **Frontend:** Vanilla JavaScript (ES6 modules)
- **Module:** 99 separate `.js` Dateien
- **Styling:** 1 CSS-Datei (modular organisiert)
- **Build:** Nur Engine wird gebündelt (`engine/*.mjs` → `engine.js`)
- **Desktop:** Tauri 2.x
- **Workers:** Vanilla Web Workers für Monte-Carlo-Parallelisierung

### Kernmerkmale
- **Local-first:** Komplett offline-fähig, keine Server-Abhängigkeiten
- **Zero-build für App-Code:** Änderungen an Modulen = Browser-Refresh
- **Deterministisch:** Reproduzierbare Simulationen mit seeded RNG
- **Performance-kritisch:** Worker-basierte MC-Simulation (8 parallel workers)
- **Kleiner Footprint:** Minimalistische Abhängigkeiten

### Entwickler-Experience
```bash
# Kein Build-Step für App-Änderungen
vim balance-renderer.js  # Edit
# → Browser refresh → Änderung sichtbar

# Nur Engine benötigt Build
npm run build:engine     # Nach engine/*.mjs Änderungen
```

---

## Evaluation: Next.js

### ❌ **NICHT EMPFOHLEN**

**Warum Next.js existiert:**
- Server-Side Rendering (SSR)
- Static Site Generation (SSG)
- API Routes
- File-based Routing
- Image Optimization
- SEO-Optimierung

**Warum es hier NICHT passt:**

| Next.js Feature | Ruhestand-App Realität |
|-----------------|------------------------|
| SSR/SSG | ❌ Komplett local-first, kein Server |
| API Routes | ❌ Keine Backend-Kommunikation |
| File-based Routing | ❌ Nur 2 Hauptseiten (Balance, Simulator) |
| Image Optimization | ❌ Minimale Bilder, keine externe Lade-Optimierung |
| SEO | ❌ Desktop-App, keine Web-Discovery |

**Probleme bei Migration:**
1. **Architektur-Konflikt:** Next.js ist für web-basierte, server-integrierte Apps konzipiert
2. **Tauri-Integration:** Komplexer (Next.js erwartet Node.js-Server, Tauri ist static)
3. **Build-Komplexität:** Vollständiges Rebuild bei jeder Änderung
4. **Bundle-Size:** Next.js Runtime + React = ~200KB+ (aktuell: minimaler footprint)
5. **Offline-Modus:** Zusätzliche Konfiguration für Service Workers nötig

**Urteil:** ❌ **Next.js bietet NULL relevante Features für dieses Projekt**

---

## Evaluation: React

### ⚠️ **BEDINGT EMPFOHLEN** (Aufwand >> Nutzen)

### Pro-Argumente

✅ **Component-basierte Architektur**
- Wiederverwendbare UI-Komponenten
- Klare Separation of Concerns
- Aber: Aktuelles Modul-System bietet bereits Separation

✅ **State Management**
- React Context / Redux für globalen State
- Hooks für lokalen State
- Aber: `localStorage` + Event-System funktioniert gut

✅ **Deklaratives UI**
- JSX macht UI-Struktur lesbarer
- Aber: Vanilla HTML ist für statische Layouts ausreichend

✅ **Ecosystem**
- Große Community, viele Libraries
- Aber: Projekt benötigt kaum externe UI-Libraries

### Contra-Argumente

❌ **Build-Komplexität**
```bash
# Aktuell
vim balance-renderer.js → Browser refresh

# Mit React
vim BalanceRenderer.jsx → webpack/vite build → wait → Browser refresh
```

❌ **Bundle-Size Impact**
| Technologie | Minimized + Gzipped |
|-------------|---------------------|
| React + ReactDOM | ~130KB |
| Aktuelle Engine | 0.4KB (371 bytes) |
| Preact (Alternative) | ~10KB |

❌ **Worker-Integration komplexer**
- Aktuell: DOM-freie `*-runner.js` Dateien laufen direkt in Workers
- Mit React: Zusätzliche Abstraktionsebene nötig, keine JSX in Workers

❌ **Migration Effort**
- 99 JavaScript-Module umschreiben zu React Components
- `balance-renderer.js`, `simulator-results.js`, etc. komplett neu
- Geschätzter Aufwand: 40-60 Stunden
- Refactoring-Risiko: Bugs in kritischer Financial-Logic

❌ **Tauri-Integration**
- React funktioniert, aber: zusätzlicher Build-Step
- Debugging komplexer (Source Maps nötig)

### Wann würde React Sinn machen?

**Wenn das Projekt folgende Eigenschaften hätte:**
- Hochdynamische UI mit vielen State-Changes (z.B. Drag & Drop, Real-time Collaboration)
- Komplexe verschachtelte Components (aktuell: meist flache Struktur)
- Team mit React-Expertise (Single Developer?)
- Geplante Mobile-App (React Native)

**Urteil:** ⚠️ **React würde funktionieren, aber Aufwand-Nutzen-Verhältnis ist negativ**

---

## Evaluation: Tailwind CSS

### ✅ **POTENZIELL SINNVOLL** (mit Einschränkungen)

### Pro-Argumente

✅ **Utility-First Approach**
```html
<!-- Aktuell -->
<button class="btn primary">Export</button>
<!-- CSS: .btn.primary { background: var(--primary); ... } -->

<!-- Mit Tailwind -->
<button class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
  Export
</button>
```

✅ **Konsistentes Spacing/Sizing**
- Design-System "built-in" (4px, 8px, 16px Grid)
- Aber: Aktuell mit CSS-Variablen auch möglich

✅ **Kein CSS-Bloat**
- PurgeCSS entfernt ungenutzte Styles
- Finale CSS-Datei: ~10-30KB (statt potentiell 100KB+)

✅ **Schnellere Entwicklung**
- Keine Klassennamen überlegen
- Weniger Context-Switching zwischen HTML und CSS

### Contra-Argumente

❌ **Build-Step erforderlich**
```bash
# Tailwind benötigt PostCSS
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init
# → Watcher-Prozess oder Build-Script
```

❌ **HTML-Verbosity**
```html
<!-- Kompakt (aktuell) -->
<div class="panel result-section">

<!-- Tailwind -->
<div class="bg-white shadow-lg rounded-lg p-6 mb-4 border border-gray-200">
```

❌ **Migration Effort**
- Balance.html, Simulator.html: Alle Klassen umschreiben
- CSS-Variablen (Dark Mode) müssen zu Tailwind-Config migriert werden
- Geschätzter Aufwand: 8-12 Stunden

❌ **Debugging komplexer**
```html
<!-- Fehler-Suche aktuell -->
.result-section { background: red; } → Check Browser

<!-- Mit Tailwind -->
Welche der 15 Utility-Klassen verursacht das Layout-Problem?
```

### Wann würde Tailwind Sinn machen?

**Wenn:**
- Team mehrere Entwickler hat (konsistenter Style ohne Konventionen)
- Häufige UI-Iterationen (schnelles Prototyping)
- Projekt wächst stark (CSS-Bloat-Prevention)

**Urteil:** ✅ **Tailwind könnte mittelfristig Vorteile bringen, aber nicht prioritär**

---

## Alternativen zu React/Next.js/Tailwind

### 1. **Web Components + Lit** (Leichtgewicht-React)

**Warum interessant:**
- Native Browser-Standard (Shadow DOM, Custom Elements)
- Lit: Nur ~5KB, ähnliche DX wie React
- Kein Bundler zwingend nötig
- Interoperabel mit Vanilla JS

**Beispiel:**
```javascript
import { LitElement, html, css } from 'lit';

class ResultPanel extends LitElement {
  static properties = { data: {} };

  render() {
    return html`
      <div class="panel">
        <h2>${this.data.title}</h2>
        <p>${this.data.value}</p>
      </div>
    `;
  }
}
customElements.define('result-panel', ResultPanel);
```

**Pro:**
- Kleiner als React
- Schrittweise Migration möglich (1 Component nach dem anderen)
- Native Browser-Integration

**Contra:**
- Noch relativ wenig verbreitet
- Shadow DOM kann Styling komplizieren

### 2. **Alpine.js** (jQuery-Replacement)

**Warum interessant:**
- Nur ~15KB
- Direkt in HTML (kein Build)
- Perfekt für einfache Interaktivität

**Beispiel:**
```html
<div x-data="{ open: false }">
  <button @click="open = !open">Toggle</button>
  <div x-show="open">Content</div>
</div>
```

**Pro:**
- Extrem leichtgewichtig
- Kein Build-Step
- Ideal für aktuelles Projekt

**Contra:**
- Nicht für komplexe State Management

### 3. **Vanilla JS + Moderne Patterns**

**Optimierungen ohne Framework:**
- Template Literals für HTML-Generation
- Custom Events für Module-Kommunikation (bereits verwendet!)
- Web Components für wiederverwendbare Elemente
- CSS Container Queries statt Media Queries

**Beispiel:**
```javascript
// balance-renderer.js (aktuell, optimiert)
export function renderResult(data) {
  const template = `
    <div class="result-panel">
      <h2>${data.title}</h2>
      <p class="value">${formatCurrency(data.amount)}</p>
    </div>
  `;
  document.getElementById('results').innerHTML = template;
}
```

---

## Spezifische Projekt-Anforderungen

### Kritische Constraints

| Anforderung | React/Next/Tailwind | Aktueller Stack |
|-------------|---------------------|-----------------|
| **Offline-First** | ⚠️ Möglich, komplexer | ✅ Nativ |
| **Determinismus** | ✅ Kein Problem | ✅ Kein Problem |
| **Worker-Parallelisierung** | ⚠️ Komplexer | ✅ Trivial |
| **Build-Time** | ❌ 5-30s | ✅ 0s (außer engine) |
| **Bundle-Size** | ❌ +150KB | ✅ Minimal |
| **Hot-Reload** | ✅ HMR verfügbar | ✅ Native Modules |
| **Tauri-Integration** | ⚠️ Zusätzliche Config | ✅ Einfach |
| **Lernkurve** | ❌ React/JSX/Tooling | ✅ Vanilla JS |

### Performance-Vergleich (geschätzt)

| Metrik | Aktuell | Mit React/Next |
|--------|---------|----------------|
| Initial Load | ~50ms | ~200-300ms |
| Bundle-Size (gzipped) | ~30KB | ~180KB |
| Build-Time | 0s (nur engine: ~0.5s) | 5-30s |
| Hot-Reload | <100ms | ~500ms (HMR) |
| Worker-Spawn | ~10ms | ~10ms |

---

## Empfohlene Vorgehensweise

### Kurzfristig (nächste 3-6 Monate)

✅ **BEIBEHALTEN:** Vanilla JS mit ES6 Modules

**Optimierungen ohne Framework-Migration:**

1. **CSS-Organisation verbessern**
   ```css
   /* css/balance.css */
   :root {
     --spacing-xs: 4px;
     --spacing-sm: 8px;
     --spacing-md: 16px;
     /* ... konsistente Design-Tokens */
   }
   ```

2. **Template-System einführen** (ohne Framework)
   ```javascript
   // shared/templates.js
   export const templates = {
     resultCard: (data) => `
       <div class="result-card">
         <h3>${data.title}</h3>
         <p>${data.value}</p>
       </div>
     `
   };
   ```

3. **Web Components für wiederverwendbare UI-Elemente**
   ```javascript
   // components/loading-spinner.js
   class LoadingSpinner extends HTMLElement {
     connectedCallback() {
       this.innerHTML = '<div class="spinner"></div>';
     }
   }
   customElements.define('loading-spinner', LoadingSpinner);
   ```

4. **TypeScript prüfen** (OPTIONAL, nur für Type-Safety)
   - JSDoc-Kommentare für Typen (kein Build nötig!)
   ```javascript
   /**
    * @param {Object} inputs
    * @param {number} inputs.startkapital
    * @param {number} inputs.entnahmerate
    * @returns {Promise<SimulationResult>}
    */
   export async function runSimulation(inputs) { ... }
   ```

### Mittelfristig (6-12 Monate)

⚠️ **EVALUIEREN:** Tailwind CSS

**Voraussetzungen:**
- Team wächst oder UI-Änderungen werden häufiger
- Build-Pipeline ist akzeptabel
- CSS-Datei wird unübersichtlich

**Migrations-Plan:**
1. Tailwind-Config anlegen (`tailwind.config.js`)
2. Schrittweise Migration (1 Seite nach der anderen)
3. Alte CSS parallel laufen lassen
4. Nach vollständiger Migration: alte CSS entfernen

### Langfristig (12+ Monate)

❓ **PRÜFEN:** Lit (Web Components)

**Nur wenn:**
- UI-Komplexität steigt signifikant
- Komponenten-Wiederverwendung wird kritisch
- Team hat Kapazität für Migration

**NICHT:** React/Next.js (siehe oben)

---

## Konkrete Handlungsempfehlungen

### DO ✅

1. **CSS-Variablen ausbauen** für Design-Konsistenz
2. **Template-System** für häufig wiederholte HTML-Strukturen
3. **JSDoc-Typen** für bessere IDE-Unterstützung
4. **Web Components** für wirklich wiederverwendbare UI-Elemente (z.B. `<result-card>`)
5. **Tailwind evaluieren** wenn CSS-Datei >2000 Zeilen wird

### DON'T ❌

1. **NICHT** zu Next.js migrieren (bietet NULL Vorteile)
2. **NICHT** React einführen ohne konkreten Pain-Point
3. **NICHT** Build-Komplexität erhöhen ohne klaren ROI
4. **NICHT** Bundle-Size opfern für Framework-DX

### MAYBE ⚠️

1. **Preact statt React** (falls React wirklich nötig: ~10KB statt 130KB)
2. **Alpine.js für Interaktivität** (falls jQuery-artige Helpers nötig)
3. **Vite als Build-Tool** (falls Build-Pipeline eingeführt wird: schneller als Webpack)

---

## Migrations-Aufwand (falls React trotzdem gewollt)

### Geschätzter Aufwand

| Phase | Aufwand | Risiko |
|-------|---------|--------|
| Setup (Vite/React/TypeScript) | 4-6h | Niedrig |
| Balance-App Migration | 20-30h | Mittel |
| Simulator Migration | 30-40h | Hoch (Worker-Integration) |
| Testing & Bugfixing | 10-20h | Hoch |
| **GESAMT** | **64-96h** | **Mittel-Hoch** |

### Migrations-Risiken

❌ **High-Risk Bereiche:**
- Worker-Code (Monte-Carlo-Runner): Kein JSX, React-Context nicht verfügbar
- Determinismus: React-Lifecycle könnte RNG-Seeding beeinflussen
- Engine-Integration: Muss weiterhin global verfügbar sein
- localStorage-Integration: React-State-Sync komplex

⚠️ **Medium-Risk:**
- Tauri-Integration: Build-Config komplexer
- Performance: Virtuel DOM könnte Simulator verlangsamen (60fps Requirement?)

---

## Fazit

### Klare Empfehlung

**NICHT migrieren zu React/Tailwind/Next.js**

**Begründung:**

1. **Next.js:** Architektural falsch für local-first Desktop-App
2. **React:** Hoher Migrations-Aufwand (64-96h) bei fragwürdigem Nutzen
3. **Tailwind:** Potenziell sinnvoll, aber nicht prioritär

### Stattdessen:

**Vanilla JS + ES6 Modules optimieren:**
- CSS-Variablen ausbauen
- Template-System für HTML-Generation
- Web Components für wirklich wiederverwendbare Elemente
- JSDoc für Type-Safety (kein Build nötig)

### Ausnahmen:

**Tailwind einführen FALLS:**
- CSS-Datei >2000 Zeilen und unübersichtlich
- Team wächst und Style-Konsistenz wird Problem
- Build-Pipeline ist akzeptabel

**React/Lit evaluieren FALLS:**
- UI-Komplexität steigt dramatisch (z.B. Drag & Drop, Real-time Features)
- Component-Wiederverwendung wird kritisch
- Team hat dedizierte Frontend-Ressourcen

---

## Referenzen

- **Bundle-Size-Vergleich:** https://bundlephobia.com
- **Lit Documentation:** https://lit.dev
- **Alpine.js:** https://alpinejs.dev
- **Tailwind CSS:** https://tailwindcss.com
- **Tauri + React:** https://tauri.app/v1/guides/getting-started/setup/vite/

---

**Nächste Schritte:**

1. ✅ Dieses Dokument mit Team reviewen
2. ⚠️ CSS-Variablen Audit durchführen
3. ⚠️ Template-System Proof-of-Concept erstellen
4. ❌ KEINE React/Next.js Migration planen
