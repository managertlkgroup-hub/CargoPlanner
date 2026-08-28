# 📚 Knowledge Base — CargoPlanner Technologies

> Collected from research of npm packages, GitHub repos, and documentation.
> Last updated: 2026-08-27

---

## 1. Drag & Drop — Grid Snapping & Collision

### 1.1 dnd-kit (clauderic/dnd-kit)
**Most popular React DnD library. Framework-agnostic core with React adapter.**

```bash
npm install @dnd-kit/react @dnd-kit/collision @dnd-kit/geometry
```

**Architecture (layered):**
- `@dnd-kit/abstract` — core abstractions, sensors, collision system
- `@dnd-kit/dom` — framework-agnostic DOM layer
- `@dnd-kit/collision` — collision detection algorithms
- `@dnd-kit/geometry` — geometry utilities (rectangles, points)
- `@dnd-kit/react` — React adapter (hooks, components)

**Built-in Collision Detection Algorithms:**

| Algorithm | How It Works | Best For |
|-----------|-------------|----------|
| `rectIntersection` | No gap between any 4 sides = collision (default) | General purpose |
| `closestCenter` | Distance between centers of dragged and droppable | Grid layouts |
| `closestCorners` | Distance between nearest corners | Irregular shapes |
| `pointerWithin` | Pointer position inside droppable rect | Precise targeting |
| `directionBiased` | Bias toward movement direction | Sortable lists |
| `custom` | Implement your own algorithm | Special needs |

**Key Pattern — Custom Collision Detection:**
```typescript
// For CargoPlanner: custom AABB collision that prevents overlap
function customCollision(args: CollisionDetection args) {
  const { active, droppableRects } = args;
  const activeRect = active.rect.current.initial;
  
  for (const [id, rect] of droppableRects) {
    if (rectsIntersect(activeRect, rect)) {
      return id; // Collision detected
    }
  }
  return null;
}
```

**Sensors (input methods):**
- `PointerSensor` — mouse/touch via pointer events
- `KeyboardSensor` — keyboard navigation
- `TouchSensor` — touch-only with delay
- `MouseSensor` — mouse-only

**Best for:** Sortable lists, multi-container layouts, accessibility-heavy UIs.
**For CargoPlanner:** Overkill for Canvas-based 2D — we use raw Canvas events instead.

### 1.2 react-grid-layout
**Draggable and resizable grid layouts with snap-to-grid.**

```bash
npm install react-grid-layout
```

**Key Features:**
- Snap-to-grid with configurable `compactType` and `gridSize`
- Collision handling: prevent overlap or "push" behavior
- Responsive breakpoints via `ResponsiveGridLayout`
- Drag handles, resizable corners
- Layout persistence (save/restore positions)

**Grid Snapping Pattern:**
```jsx
<GridLayout
  layout={layout}
  cols={12}
  rowHeight={30}
  width={1200}
  compactType="horizontal" // or "vertical" or null
  onLayoutChange={(layout) => saveLayout(layout)}
>
  {items.map(item => <div key={item.id} data-grid={item}>{item.name}</div>)}
</GridLayout>
```

**Collision Modes:**
- `compactType="horizontal"` — items push right
- `compactType="vertical"` — items push down
- `compactType={null}` — no compaction, free placement

### 1.3 Canvas-Based Grid Snapping (Our Approach)
**Lighter than DOM-based libraries — we implement custom.**

```typescript
// Grid snapping function
const snapToGrid = (value: number, gridSize: number): number => {
  return Math.round(value / gridSize) * gridSize;
};

// In mouse move handler:
const rawPackX = (mouseX - drag.offsetX - offsetX) / scale;
const rawPackZ = (mouseY - drag.offsetZ - offsetY) / scale;
const snappedX = snapToGrid(rawPackX, 10); // 10mm grid
const snappedZ = snapToGrid(rawPackZ, 10);

// Collision check before applying
if (!checkCollision2D(snappedX, snappedZ)) {
  updatePosition(snappedX, snappedZ);
}
```

### 1.4 AABB Collision Detection

**2D AABB (Axis-Aligned Bounding Box):**
```typescript
function intersects2D(
  a: { x: number; z: number; width: number; depth: number },
  b: { x: number; z: number; width: number; depth: number }
): boolean {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.z < b.z + b.depth &&
    a.z + a.depth > b.z
  );
}
```

**3D AABB:**
```typescript
function intersects3D(a: Box3D, b: Box3D): boolean {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y &&
    a.z < b.z + b.depth &&
    a.z + a.depth > b.z
  );
}
```

**Axis-Separated Sliding (for smooth dragging):**
```typescript
// Try full move, then slide along each axis independently
if (!checkCollision(newX, newZ)) {
  setPosition(newX, newZ);           // Full move OK
} else if (!checkCollision(newX, currentZ)) {
  setPosition(newX, currentZ);       // Slide along X only
} else if (!checkCollision(currentX, newZ)) {
  setPosition(currentX, newZ);       // Slide along Z only
}
// else: both axes blocked → do nothing
```

### 1.5 dyna-touch-grid
**Touch-friendly grid with collision detection.**

- Designed for touch devices
- Grid-based collision detection
- Snap-to-grid with configurable step
- Limited documentation, low npm downloads

**For CargoPlanner:** Not needed — our Canvas approach is simpler and more performant.

---

## 2. Layer Management

### 2.1 @moritzbrantner/layer-editor
**Component for managing layers: add, delete, reorder, visibility.**

- UI for layer list with controls
- Toggle visibility per layer
- Reorder layers (drag or buttons)
- Lock layers to prevent editing

**Key Pattern — Layer State:**
```typescript
interface Layer {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
  opacity: number;
}

const [layers, setLayers] = useState<Layer[]>([
  { id: '1', name: 'Layer 1', visible: true, locked: false, opacity: 1.0 },
]);

const addLayer = () => setLayers(prev => [...prev, newLayer]);
const toggleVisibility = (id: string) => 
  setLayers(prev => prev.map(l => l.id === id ? {...l, visible: !l.visible} : l));
const removeLayer = (id: string) => 
  setLayers(prev => prev.filter(l => l.id !== id));
```

### 2.2 @slithy/layers
**Z-index management for React components.**

- Manages z-index stacking contexts
- Prevents z-index wars between components
- Provides `Layer` and `LayerManager` components

**For CargoPlanner:** Not needed — we handle layers via Y-position and Canvas rendering order.

### 2.3 Layer Index Calculation from Y Position
```typescript
// Calculate which layer an item is on
const layerIndex = Math.round(item.position.y / Math.max(1, item.dimensions.height));

// Progressive transparency for visualization
const layerAlpha = layerIndex === 0 ? 1.0 : Math.max(0.4, 1.0 - layerIndex * 0.2);

// Layer badge rendering on Canvas
if (maxLayer > 0) {
  const badgeSize = 14;
  ctx.fillStyle = layerIndex === 0 ? 'rgba(0,0,0,0.6)' : 'rgba(59,130,246,0.8)';
  ctx.beginPath();
  ctx.roundRect(x + w - badgeSize - 2, y + 2, badgeSize, badgeSize, 3);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.fillText(String(layerIndex + 1), x + w - badgeSize/2 - 2, y + badgeSize/2 + 2);
}
```

### 2.4 Support Verification for Stacking
```typescript
function hasSupport(item: PackedItem, placed: PackedItem[]): boolean {
  if (item.position.y === 0) return true; // Floor is always support
  
  return placed.some(other => {
    // Check vertical contact (item sits exactly on top)
    const verticalContact = Math.abs(
      other.position.y + other.dimensions.height - item.position.y
    ) < 0.01;
    if (!verticalContact) return false;
    
    // Check XZ overlap (item must be supported in both dimensions)
    const overlapX = item.position.x < other.position.x + other.dimensions.width &&
                     item.position.x + item.dimensions.width > other.position.x;
    const overlapZ = item.position.z < other.position.z + other.dimensions.depth &&
                     item.position.z + item.dimensions.depth > other.position.z;
    return overlapX && overlapZ;
  });
}
```

---

## 3. PDF Generation — jsPDF-AutoTable

### 3.1 Installation & Basic Usage
```bash
npm install jspdf jspdf-autotable
```

```typescript
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const doc = new jsPDF();

// Draw header
doc.setFontSize(18);
doc.text('Load Report', 14, 22);

// Draw table with startY
autoTable(doc, {
  startY: 30,
  head: [['Name', 'Dimensions', 'Weight']],
  body: items.map(i => [i.name, `${i.l}×${i.w}×${i.h}`, `${i.weight}kg`]),
  styles: { fontSize: 10 },
  headStyles: { fillColor: [59, 130, 246] },
});

// CRITICAL: Get Y position after table
const afterTable = doc.lastAutoTable.finalY;

// Draw more content below
doc.text('Summary', 14, afterTable + 10);
```

### 3.2 Key API: `doc.lastAutoTable.finalY`
- **This is the ONLY reliable way** to know where the last table ended
- Access it **after** the `autoTable()` call
- Updates with each new `autoTable()` call
- Use it to position subsequent text, tables, or images

### 3.3 Multi-Table Positioning Pattern
```typescript
// First table
autoTable(doc, { startY: 30, body: data1 });
const y1 = doc.lastAutoTable.finalY;

// Second table (with gap)
autoTable(doc, { startY: y1 + 15, body: data2 });
const y2 = doc.lastAutoTable.finalY;

// Third table
autoTable(doc, { startY: y2 + 15, body: data3 });
```

### 3.4 Margin & Page Break Control
```typescript
autoTable(doc, {
  startY: 30,
  margin: { top: 20, bottom: 20, left: 14, right: 14 },
  pageBreak: 'auto',    // 'auto' | 'avoid' | 'always'
  rowPageBreak: 'avoid', // Keep rows together
  showHead: 'everyPage', // Repeat header on each page
  horizontalPageBreak: true, // Split wide tables
});
```

### 3.5 Canvas-to-PDF for Cyrillic/Unicode
**When jsPDF fonts don't support your characters:**

```typescript
// 1. Render on Canvas (supports any Unicode text)
const canvas = document.createElement('canvas');
canvas.width = 794 * 2; // A4 @ 96dpi × DPR
canvas.height = 1123 * 2;
const ctx = canvas.getContext('2d')!;
ctx.scale(2, 2);

// Draw with Canvas API (supports Cyrillic natively)
ctx.font = '14px system-ui, sans-serif';
ctx.fillText('Отчёт о загрузке', 30, 50);

// 2. Convert to image
const imgData = canvas.toDataURL('image/png');

// 3. Embed in jsPDF
const doc = new jsPDF({ unit: 'mm', format: 'a4' });
doc.addImage(imgData, 'PNG', 0, 0, 210, 297);
doc.save('report.pdf');
```

### 3.6 Table Styling Options
```typescript
autoTable(doc, {
  styles: {
    font: 'helvetica',
    fontSize: 10,
    cellPadding: 4,
    overflow: 'linebreak',
    fillColor: false, // transparent
    textColor: [30, 41, 59],
    lineColor: [229, 231, 235],
    lineWidth: 0.1,
  },
  headStyles: {
    fillColor: [241, 245, 249],
    textColor: [30, 41, 59],
    fontStyle: 'bold',
  },
  alternateRowStyles: {
    fillColor: [248, 250, 252],
  },
  columnStyles: {
    0: { cellWidth: 40 }, // First column fixed width
    1: { cellWidth: 'auto' },
  },
});
```

---

## 4. Panel Layout — Fixed Width & Resizing

### 4.1 CSS-Only Fixed Panel (Our Current Approach)
**No library needed — pure CSS Flexbox.**

```css
.left-panel {
  width: 380px;
  min-width: 280px;
  max-width: 380px;
  flex-shrink: 0;           /* KEY: prevent flex shrinking */
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  overflow-x: hidden;
}

.right-panel {
  flex: 1;                  /* Fill remaining space */
  min-width: 0;            /* Allow content to determine minimum */
  display: flex;
  flex-direction: column;
}
```

**Why `flex-shrink: 0` works:**
- Default `flex-shrink` is `1` — items shrink to fit container
- Setting to `0` **prevents the item from ever shrinking**
- Combined with `min-width`/`max-width` → truly fixed panel
- The right panel gets `flex: 1` to fill remaining space

### 4.2 react-resizable-panels
**User-resizable panels with min/max constraints.**

```bash
npm install react-resizable-panels
```

```tsx
import { PanelGroup, Panel, PanelResizeHandle } from 'react-resizable-panels';

<PanelGroup direction="horizontal">
  {/* Fixed sidebar */}
  <Panel 
    defaultSize={380} 
    minSize={280} 
    maxSize={380}
    collapsedSize={0}
    collapsible={true}
  >
    <Sidebar />
  </Panel>
  
  <PanelResizeHandle className="w-2 bg-gray-200 hover:bg-gray-300" />
  
  {/* Flexible content */}
  <Panel defaultSize="100%" minSize={400}>
    <Content />
  </Panel>
</PanelGroup>
```

**Key Props:**
- `defaultSize` — initial size (pixels, %, em, rem, vh, vw)
- `minSize` / `maxSize` — size constraints
- `collapsible` — can collapse to `collapsedSize`
- `groupResizeBehavior="preserve-pixel-size"` — keep pixel size when group resizes
- `onLayoutChange` — callback for layout changes

### 4.3 @svar-ui/react-layout
**SVAR React Layout — flexible panel components.**

- 30+ React UI components including layout panels
- Light/dark themes
- Fixed and resizable panel modes
- Less popular than react-resizable-panels

**For CargoPlanner:** CSS approach is sufficient; react-resizable-panels if user resizing is needed.

### 4.4 Preventing Panel Width Changes on Content Change
**Problem:** Panel shrinks when child content changes (e.g., form opens).

**Solution — Multiple Defenses:**
```css
/* 1. Fix the panel width */
.left-panel {
  width: 380px;
  flex-shrink: 0;
}

/* 2. Constrain children */
.left-panel .panel {
  max-width: 100%;
  min-width: 0;
  overflow-x: hidden;
}

/* 3. Constrain form grids */
.left-panel .form-grid {
  min-width: 0;
  max-width: 100%;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}
```

---

## 5. 3D Bin Packing Algorithms

### 5.1 Extreme Points Heuristic (Our Current Approach)
**Most common algorithm for 3D bin packing. Used by xflp, skjolber, and others.**

**Algorithm:**
1. Start with extreme point at (0, 0, 0)
2. For each box, try all extreme points
3. Choose point with best score (compactness + Y priority)
4. Place box, generate 3 new extreme points:
   - Right: `(x + width, y, z)`
   - Above: `(x, y + height, z)`
   - Behind: `(x, y, z + depth)`
5. Remove points inside placed boxes
6. Remove duplicate points

**Scoring Function:**
```typescript
// Compactness: minimize bounding box
const footprintMax = Math.max(maxX, maxZ);

// Y multiplier controls stacking preference
const yMult = 1e4; // Reduced from 1e9 to enable stacking

// Score = Y priority + footprint + secondary
const score = point.y * yMult + footprintMax * 1e6 + secondary;

// With stacking: prefer floor when footprint stays same
const floorBonus = (maxStackHeight > 0 && point.y === 0) ? -5e6 : 0;
score += floorBonus;
```

### 5.2 @cratefit/pack — Three Algorithms
**Commercial API with three packing strategies:**

| Algorithm | Description | Best For |
|-----------|-------------|----------|
| **Extreme Point** | Default. Places at candidate points, tries all orientations. | General purpose |
| **Layer Building** | Builds horizontal layers bottom-to-top. Each layer fills floor first. | Uniform height items |
| **Wall Building** | Builds vertical walls from one end to the other. | Long items in narrow bins |

**Key Insight — Layer Building:**
```
Layer 1: Fill entire floor (Y=0) with boxes
Layer 2: Fill next level (Y = max height of Layer 1)
Layer 3: Fill next level...
Continue until bin height reached or no more boxes fit
```

**For CargoPlanner:** Our "floor-first" mixed mode is similar to Layer Building.

### 5.3 xflp — Java Solver with Real-World Constraints
**Heuristic solver for container loading with industrial constraints.**

**Features:**
- Single or multiple bin packing
- 1-axis rotation
- LIFO (Last In, First Out) loading/unloading
- Max height/weight constraints
- Stacking groups
- Axle load distribution (2 axles)
- Immersive depth during stacking

**Algorithm Stack:**
1. **Construction Heuristic:** Extreme Point + Space-oriented collision detection
2. **GRASP Heuristic:** Biased randomized search (random factor + preference for better positions)
3. **Neighborhood Search:** Swap and relocate improvements

**Key Pattern — Space-Oriented Collision:**
```
Instead of checking collision with ALL placed items (O(n)),
maintain a list of "spaces" (available regions).
Checking if item fits at position = O(1) lookup.
Performance improvement: 3x for large problems.
```

**For CargoPlanner:** GRASP + neighborhood search could improve our packing quality.

### 5.4 binpackingjs — JavaScript 2D/3D/4D Library
**Fast, immutable, tree-shakeable.**

```bash
npm install binpackingjs
```

**3D API:**
```typescript
import { pack3D, RotationType } from 'binpackingjs/3d';

const result = pack3D({
  bins: [{ name: 'Container', width: 13600, height: 2600, depth: 2460, maxWeight: 25000 }],
  items: [
    { name: 'Pallet', width: 1200, height: 1500, depth: 800, weight: 500,
      allowedRotations: [RotationType.WHD, RotationType.DHW] // 2 of 6 rotations
    },
  ],
});

console.log(result.packedBins[0].items.length); // Items packed
console.log(result.unfitItems.length);          // Items that didn't fit
```

**All 6 Rotation Types:** WHD, HWD, HDW, DHW, DWH, WDH

**2D Heuristics:**
- `BestShortSideFit` (default) — minimizes leftover on shorter side
- `BestAreaFit` — minimizes wasted area
- `BestLongSideFit` — minimizes leftover on longer side
- `BottomLeft` — places as low and left as possible

**For CargoPlanner:** Could use as reference implementation; our custom packer is more tailored.

### 5.5 skjolber/3d-bin-container-packing — Java LAFF Algorithm
**Largest Area Fit First (LAFF) + Brute Force.**

**LAFF Algorithm:**
1. Find box with largest ground area → place it first
2. Its height becomes the "level height"
3. Fill remaining space at same level with boxes that fit
4. When level is full, increment to next level
5. Repeat until all boxes placed or bin full

**Brute Force (for ≤ 6 boxes):**
- Try ALL permutations of box order
- Try ALL rotations for each permutation
- Find the arrangement that fits most boxes
- Exponential complexity, but fast for small counts

**Packager Customization Points:**
- **Manifest controls:** Which boxes go in which containers
- **Point controls:** Which extreme points are valid for each box
- **Placement controls:** Best placement selection (stability, weight, etc.)

### 5.6 Comparison: Which Algorithm for Which Case

| Scenario | Best Algorithm | Why |
|----------|---------------|-----|
| Mixed sizes, general purpose | Extreme Point | Good balance of speed and quality |
| Uniform height items | Layer Building | Fills layers efficiently |
| Very few items (≤6) | Brute Force | Optimal solution guaranteed |
| Real-world logistics | xflp-style | LIFO, weight, axle constraints |
| Maximum density | GRASP + Neighborhood | Iterative improvement |

---

## 6. Canvas 2D Rendering

### 6.1 DPI-Aware Canvas
```typescript
const DPR = window.devicePixelRatio || 1;
canvas.width = logicalWidth * DPR;
canvas.height = logicalHeight * DPR;
ctx.scale(DPR, DPR);
// Draw in logical coordinates — Canvas handles scaling
```

### 6.2 Hit Testing (Click Detection)
```typescript
function hitTest(
  mx: number, my: number,
  items: PackedItem[],
  layout: { scale: number; offsetX: number; offsetY: number }
): PackedItem | null {
  // Check items in reverse order (top-most first)
  for (let i = items.length - 1; i >= 0; i--) {
    const item = items[i];
    const ix = layout.offsetX + item.position.x * layout.scale;
    const iy = layout.offsetY + item.position.z * layout.scale;
    const iw = item.dimensions.width * layout.scale;
    const ih = item.dimensions.depth * layout.scale;
    if (mx >= ix && mx <= ix + iw && my >= iy && my <= iy + ih) {
      return item;
    }
  }
  return null;
}
```

### 6.3 ResizeObserver for Responsive Canvas
```typescript
useEffect(() => {
  const parent = canvasRef.current?.parentElement;
  if (!parent) return;
  
  const observer = new ResizeObserver((entries) => {
    const { width, height } = entries[0].contentRect;
    setDimensions({ w: Math.max(400, width), h: Math.max(300, height) });
  });
  observer.observe(parent);
  
  return () => observer.disconnect();
}, []);
```

### 6.4 Keyboard Event Handling
```typescript
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    // Don't intercept when typing in inputs
    if (e.target instanceof HTMLInputElement || 
        e.target instanceof HTMLSelectElement ||
        e.target instanceof HTMLTextAreaElement) return;
    
    switch (e.key) {
      case 'ArrowUp':    e.preventDefault(); moveUp(); break;
      case 'ArrowDown':  e.preventDefault(); moveDown(); break;
      case 'r': case 'R': rotate(); break;
      case 's': case 'S': smartStack(); break;
    }
  };
  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, [dependencies]);
```

### 6.5 Canvas vs DOM for Drag-and-Drop

| Aspect | Canvas | DOM |
|--------|--------|-----|
| Performance | Better for many items | Slower with many elements |
| Hit testing | Manual (coordinate math) | Built-in (event.target) |
| Rendering | Immediate mode (redraw all) | Retained mode (update DOM) |
| Accessibility | Poor (no ARIA) | Good (native ARIA) |
| Collision detection | Custom AABB | Library-provided |
| Best for | 2D games, visualizations | Forms, lists, UI components |

**For CargoPlanner:** Canvas is correct choice — we need performant 2D rendering of cargo items.

---

## 7. Zustand Store Patterns

### 7.1 Immutable State Updates
```typescript
// ✅ Correct: create new objects
updateItem: (id, patch) => {
  set(state => ({
    items: state.items.map(item => 
      item.id === id ? { ...item, ...patch } : item
    )
  }));
}

// ❌ Wrong: mutating state directly
updateItem: (id, patch) => {
  get().items.find(i => i.id === id).position = newPos; // DON'T
}
```

### 7.2 Persist to localStorage
```typescript
import { persist } from 'zustand/middleware';

const useStore = create(
  persist(
    (set, get) => ({
      data: [],
      updateData: (newData) => set({ data: newData }),
    }),
    { 
      name: 'cargo-planner-storage',
      partialize: (state) => ({ data: state.data }), // Only persist these fields
    }
  )
);
```

### 7.3 Derived State with Selectors
```typescript
// Selector — only re-renders when selected value changes
const items = useStore(state => state.result?.variants[0]?.items ?? []);

// Memoized selector for expensive computations
const layerCount = useMemo(() => {
  if (!variant) return 0;
  const layers = new Set(variant.items.map(i => 
    Math.round(i.position.y / Math.max(1, i.dimensions.height))
  ));
  return layers.size;
}, [variant]);
```

---

## 8. Common Pitfalls & Solutions

### 8.1 React Hooks Rule Violation
**Error:** "Rendered fewer hooks than expected"
```tsx
// ❌ WRONG — early return before all hooks
function Component() {
  const data = useData();
  if (!data) return null;  // EARLY RETURN
  const value = useValue(); // This hook won't run on next render!
}

// ✅ CORRECT — all hooks before any returns
function Component() {
  const data = useData();
  const value = useValue();  // Always called
  if (!data) return null;    // Early return AFTER hooks
}
```

### 8.2 Canvas WebGL Capture
**Issue:** `html2canvas` can't capture WebGL canvases (Three.js).
**Solution:** Capture the `<canvas>` element directly:
```typescript
const canvas = container.querySelector('canvas');
if (canvas) {
  const imgData = canvas.toDataURL('image/png');
  // Use imgData...
}
```

### 8.3 PDF Cyrillic Characters (Кракозябры)
**Issue:** Russian text shows as garbage in PDF.
**Cause:** jsPDF built-in fonts (helvetica, courier) don't support Cyrillic.
**Solution:** Canvas → PDF approach (render on canvas, embed as image).

### 8.4 Flex Panel Shrinking
**Issue:** Panel width changes when child content changes.
**Solution:** `flex-shrink: 0` + `min-width` + `max-width`.

### 8.5 Pointer Capture for Drag
**Issue:** Mouse events lost when cursor leaves canvas during drag.
**Solution:** Use `setPointerCapture`:
```typescript
canvas.setPointerCapture(e.pointerId);
// Now all pointer events go to this canvas, even outside bounds
```

---

## 9. Quick Reference for CargoPlanner

### Package Decision Matrix

| Need | Current Solution | Library Alternative |
|------|-----------------|-------------------|
| 2D Canvas DnD | Custom Canvas events | dnd-kit (overkill) |
| Grid Snapping | Custom `snapToGrid()` | react-grid-layout |
| Collision Detection | Custom AABB | dnd-kit/collision |
| Layer Management | Custom store methods | @moritzbrantner/layer-editor |
| PDF Tables | jsPDF-AutoTable | (already using) |
| PDF Cyrillic | Canvas → PDF | (already using) |
| Fixed Panel | CSS `flex-shrink: 0` | react-resizable-panels |
| Resizable Panels | N/A | react-resizable-panels |
| 3D Visualization | Three.js (existing) | (already using) |

### Algorithm Selection for Packing

| Mode | Algorithm | Key Parameter |
|------|-----------|--------------|
| Along (Вдоль) | Extreme Point, orientation fixed L×W | `yMult = 1e4` |
| Across (Поперёк) | Extreme Point, orientation fixed W×L | `yMult = 1e4` |
| Mixed (Смешанный) | Extreme Point + floor bonus | `floorBonus = -5e6` |
| With Stacking | Extreme Point + vertical points | `maxStackHeight > 0` |

### Key Constants
```typescript
const GRID_SNAP = 10;          // mm — snap-to-grid step
const Y_MULTIPLIER = 1e4;      // Scoring: Y vs footprint priority
const FLOOR_BONUS = -5e6;      // Mixed mode: prefer floor first
const STACK_MAX_HEIGHT = 2000; // Default max stack height (mm)
```
