// ============================================================================
// PDF-отчёт с использованием @react-pdf/renderer
// Поддержка кириллицы через стандартные шрифты (Helvetica, Times-Roman)
// ============================================================================


import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  pdf,
} from '@react-pdf/renderer';
import type { Cargo, LayoutVariant, PackedItem, Vehicle } from '../../types';

// ─── Цвета слоёв ───────────────────────────────────────────
const LAYER_COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

// ─── Утилиты ───────────────────────────────────────────────

function ground(item: { dimensions: { length: number; width: number }; rotationY?: number }) {
  const rot = Math.round(((item.rotationY ?? 0) % 360) / 90) % 2;
  return rot === 1
    ? { w: item.dimensions.width, h: item.dimensions.length }
    : { w: item.dimensions.length, h: item.dimensions.width };
}

function layerOf(item: { position: { y: number }; dimensions: { height: number } }): number {
  return Math.round(item.position.y / Math.max(1, item.dimensions.height));
}

function volMm3(mm3: number): string {
  return `${(mm3 / 1e9).toFixed(2)} м³`;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return { r, g, b };
}

// ─── Стили ─────────────────────────────────────────────────

const styles = StyleSheet.create({
  page: {
    padding: 28,
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: '#1e293b',
  },
  // Шапка
  header: {
    backgroundColor: '#1e293b',
    padding: 16,
    marginBottom: 16,
    borderRadius: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: 'Helvetica-Bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  headerSub: {
    fontSize: 10,
    color: '#94a3b8',
  },
  // Заголовки секций
  sectionTitle: {
    fontSize: 13,
    fontFamily: 'Helvetica-Bold',
    color: '#1e293b',
    marginBottom: 6,
    borderBottomWidth: 2,
    borderBottomColor: '#3b82f6',
    paddingBottom: 4,
  },
  // Текст
  text: {
    fontSize: 10,
    color: '#334155',
    marginBottom: 2,
  },
  textBold: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: '#1e293b',
    marginBottom: 2,
  },
  textMuted: {
    fontSize: 9,
    color: '#64748b',
    marginBottom: 2,
  },
  // Метрики — две колонки
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  metricCell: {
    width: '48%',
  },
  // Схема
  schemeContainer: {
    marginBottom: 12,
  },
  schemeTitle: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: '#1e293b',
    marginBottom: 4,
  },
  schemeBox: {
    borderWidth: 1,
    borderColor: '#475569',
    backgroundColor: '#f8fafc',
    position: 'relative',
  },
  schemeItem: {
    position: 'absolute',
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  schemeItemText: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: '#ffffff',
    textAlign: 'center',
    position: 'absolute',
  },
  rulerText: {
    fontSize: 7,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 2,
  },
  // Легенда
  legendRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
    marginTop: 4,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 2,
  },
  legendText: {
    fontSize: 8,
    color: '#334155',
  },
  // Таблица
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#1e293b',
    padding: 4,
  },
  tableHeaderText: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: '#ffffff',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: '#e2e8f0',
    padding: 3,
  },
  tableRowAlt: {
    backgroundColor: '#f8fafc',
  },
  tableCell: {
    fontSize: 8,
    color: '#1e293b',
  },
  layerBadge: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 4,
  },
  footer: {
    position: 'absolute',
    bottom: 12,
    left: 28,
    right: 28,
    textAlign: 'center',
    fontSize: 8,
    color: '#94a3b8',
  },
});

// ─── Компоненты PDF ────────────────────────────────────────

interface ReportProps {
  vehicle: Vehicle;
  cargo: Cargo[];
  variant: LayoutVariant;
}

/** Заголовок */
function CoverHeader() {
  return (
    <View style={styles.header}>
      <Text style={styles.headerTitle}>ОТЧЁТ О ЗАГРУЗКЕ</Text>
      <Text style={styles.headerSub}>CargoPlanner · {new Date().toLocaleDateString('ru-RU')}</Text>
    </View>
  );
}

/** Информация об автомобиле */
function VehicleInfo({ vehicle }: { vehicle: Vehicle }) {
  const BODY_LABELS: Record<string, string> = {
    tent: 'Тентованный', van: 'Фургон', isothermal: 'Изотерм',
    refrigerator: 'Рефрижератор', side: 'Бортовой', platform: 'Платформа',
    flatbed: 'Платформа', low_loader: 'Низкорамный', dump: 'Самосвал',
    tanker: 'Цистерна', container: 'Контейнеровоз',
  };
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={styles.sectionTitle}>Автомобиль</Text>
      <Text style={styles.textBold}>{vehicle.name}</Text>
      {vehicle.bodyType && (
        <Text style={styles.text}>Тип: {BODY_LABELS[vehicle.bodyType] || vehicle.bodyType}</Text>
      )}
      <Text style={styles.text}>Кузов: {vehicle.length} × {vehicle.width} × {vehicle.height} мм</Text>
      <Text style={styles.text}>Грузоподъёмность: {vehicle.maxWeight} кг</Text>
    </View>
  );
}

/** Сводка по загрузке */
function Metrics({ variant, vehicle }: { variant: LayoutVariant; vehicle: Vehicle }) {
  const maxLayer = variant.items.length > 0
    ? Math.max(...variant.items.map(i => layerOf(i)))
    : 0;

  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={styles.sectionTitle}>Сводка по загрузке</Text>
      <Text style={styles.textBold}>{variant.label}</Text>
      <View style={styles.metricsRow}>
        <View style={styles.metricCell}>
          <Text style={styles.text}>Заполнение объёма: {variant.volumeFill}%</Text>
          <Text style={styles.text}>Заполнение по весу: {variant.weightFill}%</Text>
        </View>
        <View style={styles.metricCell}>
          <Text style={styles.text}>Размещено: {variant.items.length} шт.</Text>
          <Text style={styles.text}>Вес: {variant.totalWeight} кг</Text>
        </View>
      </View>
      <View style={styles.metricsRow}>
        <View style={styles.metricCell}>
          <Text style={styles.text}>Свободный объём: {volMm3(variant.freeVolume)}</Text>
          <Text style={styles.text}>Свободный вес: {Math.max(0, vehicle.maxWeight - variant.totalWeight)} кг</Text>
        </View>
        <View style={styles.metricCell}>
          {maxLayer > 0 && <Text style={styles.text}>Слоёв: {maxLayer + 1}</Text>}
          <Text style={styles.text}>Грузоподъёмность: {vehicle.maxWeight} кг</Text>
        </View>
      </View>

      {/* Распределение по слоям */}
      {maxLayer > 0 && (() => {
        const counts: Record<number, number> = {};
        variant.items.forEach(item => {
          const li = layerOf(item);
          counts[li] = (counts[li] || 0) + 1;
        });
        const dist = Object.entries(counts)
          .sort(([a], [b]) => Number(a) - Number(b))
          .map(([l, c]) => `Слой ${l}: ${c} шт.`)
          .join('  •  ');
        return <Text style={styles.textMuted}>{dist}</Text>;
      })()}
    </View>
  );
}

/** 2D-схема одного слоя */
function LayerScheme({
  vehicle,
  variant,
  layer,
  layerItems,
  maxLayer,
  maxWidth,
}: {
  vehicle: Vehicle;
  variant: LayoutVariant;
  layer: number;
  layerItems: PackedItem[];
  maxLayer: number;
  maxWidth: number;
}) {
  const SCALE = Math.min(maxWidth / vehicle.length, 100 / vehicle.width, 1.2);
  const vw = vehicle.length * SCALE;
  const vh = vehicle.width * SCALE;

  return (
    <View style={styles.schemeContainer}>
      <Text style={styles.schemeTitle}>
        Слой {layer}{layer === 0 ? ' (пол)' : ''}
      </Text>
      <View style={[styles.schemeBox, { width: vw, height: vh }]}>
        {layerItems.map((item) => {
          const { w, h } = ground(item);
          const x = item.position.x * SCALE;
          const y = item.position.z * SCALE;
          const iw = w * SCALE;
          const ih = h * SCALE;
          const color = maxLayer > 0 ? LAYER_COLORS[layer % LAYER_COLORS.length] : '#3b82f6';
          const rgb = hexToRgb(color);
          const globalIdx = variant.items.indexOf(item) + 1;

          return (
            <View
              key={item.id}
              style={[
                styles.schemeItem,
                {
                  left: x,
                  top: y,
                  width: iw,
                  height: ih,
                  backgroundColor: `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`,
                },
              ]}
            >
              {iw > 12 && ih > 10 && (
                <Text style={styles.schemeItemText}>{globalIdx}</Text>
              )}
            </View>
          );
        })}
      </View>
      <Text style={styles.rulerText}>═══ 1 м ═══</Text>
    </View>
  );
}

/** Легенда слоёв */
function LayerLegend({ maxLayer }: { maxLayer: number }) {
  if (maxLayer <= 0) return null;
  return (
    <View style={styles.legendRow}>
      {Array.from({ length: maxLayer + 1 }, (_, i) => {
        const color = LAYER_COLORS[i % LAYER_COLORS.length];
        const rgb = hexToRgb(color);
        return (
          <View key={i} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})` }]} />
            <Text style={styles.legendText}>Слой {i}{i === 0 ? ' (пол)' : ''}</Text>
          </View>
        );
      })}
    </View>
  );
}

/** Легенда номеров грузов */
function ItemLegend({ items }: { items: PackedItem[] }) {
  if (items.length === 0) return null;
  const maxL = items.length > 0 ? Math.max(...items.map(i => layerOf(i))) : 0;

  if (maxL === 0) {
    // Без слоёв — простой список
    return (
      <View style={{ marginBottom: 8 }}>
        <Text style={styles.textBold}>Номера грузов:</Text>
        <View style={styles.legendRow}>
          {items.map((item, idx2) => (
            <Text key={item.id} style={styles.legendText}>
              {idx2 + 1}. {item.name}
              {idx2 < items.length - 1 ? '  ·  ' : ''}
            </Text>
          ))}
        </View>
      </View>
    );
  }

  // Со слоями — группировка
  return (
    <View style={{ marginBottom: 8 }}>
      <Text style={styles.textBold}>Номера грузов по слоям:</Text>
      {Array.from({ length: maxL + 1 }, (_, layer) => {
        const layerItems = items
          .map((item, idx) => ({ item, idx }))
          .filter(({ item }) => layerOf(item) === layer);
        if (layerItems.length === 0) return null;
        const color = LAYER_COLORS[layer % LAYER_COLORS.length];
        const rgb = hexToRgb(color);
        return (
          <View key={layer} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
            <View style={[styles.legendDot, { backgroundColor: `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`, marginRight: 4 }]} />
            <Text style={[styles.text, { fontFamily: 'Helvetica-Bold' }]}>Слой {layer}:</Text>
            <Text style={[styles.text, { marginLeft: 4 }]}>
              {layerItems.map(({ item, idx }) => `${idx + 1}. ${item.name}`).join('  ·  ')}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

/** Таблица грузов */
function CargoTable({ cargo, items }: { cargo: Cargo[]; items: PackedItem[] }) {
  const maxL = items.length > 0 ? Math.max(...items.map(i => layerOf(i))) : 0;
  const hasLayers = maxL > 0;

  // Ширины колонок
  const COL_W = {
    num: 22,
    name: hasLayers ? 80 : 95,
    shape: 42,
    size: 88,
    weight: 42,
    qty: 30,
    layer: hasLayers ? 40 : 0,
  };


  // Маппинг cargo → layer
  const itemLayersByCargoId = new Map<string, number[]>();
  items.forEach(item => {
    const id = item.id.split('-')[0];
    const arr = itemLayersByCargoId.get(id) || [];
    arr.push(layerOf(item));
    itemLayersByCargoId.set(id, arr);
  });

  const sorted = cargo.map(c => {
    const layers = itemLayersByCargoId.get(c.id) || [];
    const layer = layers.length > 0 ? Math.min(...layers) : 0;
    return { c, layer };
  }).sort((a, b) => a.layer - b.layer);

  return (
    <View>
      <Text style={styles.sectionTitle}>Список грузов</Text>

      {/* Шапка таблицы */}
      <View style={styles.tableHeader}>
        <Text style={[styles.tableHeaderText, { width: COL_W.num }]}>№</Text>
        <Text style={[styles.tableHeaderText, { width: COL_W.name }]}>Название</Text>
        <Text style={[styles.tableHeaderText, { width: COL_W.shape }]}>Форма</Text>
        <Text style={[styles.tableHeaderText, { width: COL_W.size }]}>Размеры, мм</Text>
        <Text style={[styles.tableHeaderText, { width: COL_W.weight }]}>Вес</Text>
        <Text style={[styles.tableHeaderText, { width: COL_W.qty }]}>Кол-во</Text>
        {hasLayers && <Text style={[styles.tableHeaderText, { width: COL_W.layer }]}>Слой</Text>}
      </View>

      {/* Строки данных */}
      {sorted.map(({ c, layer: li }, rowIdx) => {
        const size = c.shape === 'cylinder'
          ? `Ø${c.diameter}×${c.length}`
          : `${c.length}×${c.width ?? 0}×${c.height ?? 0}`;

        return (
          <View
            key={c.id}
            style={[
              styles.tableRow,
              rowIdx % 2 === 0 ? styles.tableRowAlt : {},
            ]}
          >
            <Text style={[styles.tableCell, { width: COL_W.num }]}>{rowIdx + 1}</Text>
            <Text style={[styles.tableCell, { width: COL_W.name }]}>{c.name}</Text>
            <Text style={[styles.tableCell, { width: COL_W.shape }]}>
              {c.shape === 'box' ? 'Прямоуг.' : 'Цилиндр'}
            </Text>
            <Text style={[styles.tableCell, { width: COL_W.size }]}>{size}</Text>
            <Text style={[styles.tableCell, { width: COL_W.weight }]}>{c.weight}</Text>
            <Text style={[styles.tableCell, { width: COL_W.qty }]}>{c.quantity}</Text>
            {hasLayers && (
              <View style={[styles.tableCell, { width: COL_W.layer, flexDirection: 'row', alignItems: 'center' }]}>
                <View style={[styles.layerBadge, { backgroundColor: LAYER_COLORS[li % LAYER_COLORS.length] }]} />
                <Text>{li}</Text>
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}

// ─── Основной документ ─────────────────────────────────────

function PDFDocument({ vehicle, cargo, variant }: ReportProps) {
  const maxLayer = variant.items.length > 0
    ? Math.max(...variant.items.map(i => layerOf(i)))
    : 0;
  const numLayers = maxLayer + 1;
  const SCHEME_MAX_W = 480;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Шапка */}
        <CoverHeader />

        {/* Информация об автомобиле */}
        <VehicleInfo vehicle={vehicle} />

        {/* Сводка */}
        <Metrics variant={variant} vehicle={vehicle} />

        {/* 2D-схемы по слоям */}
        {numLayers <= 1 ? (
          // Без штабелирования — одна общая схема
          <LayerScheme
            vehicle={vehicle}
            variant={variant}
            layer={0}
            layerItems={variant.items}
            maxLayer={0}
            maxWidth={SCHEME_MAX_W}
          />
        ) : (
          // Со штабелированием — отдельная схема для каждого слоя
          <View>
            <Text style={styles.sectionTitle}>Вид сверху по слоям</Text>
            <LayerLegend maxLayer={maxLayer} />
            {Array.from({ length: numLayers }, (_, li) => {
              const layerItems = variant.items.filter(i => layerOf(i) === li);
              return (
                <LayerScheme
                  key={li}
                  vehicle={vehicle}
                  variant={variant}
                  layer={li}
                  layerItems={layerItems}
                  maxLayer={maxLayer}
                  maxWidth={numLayers >= 3 ? (SCHEME_MAX_W - 16) / 2 : SCHEME_MAX_W}
                />
              );
            })}
          </View>
        )}

        {/* Легенда номеров */}
        <ItemLegend items={variant.items} />

        {/* Таблица грузов */}
        <CargoTable cargo={cargo} items={variant.items} />

        {/* Подвал */}
        <Text style={styles.footer}>CargoPlanner — стр. 1</Text>
      </Page>
    </Document>
  );
}

// ─── Публичная функция экспорта ────────────────────────────

export async function generatePdfWithReactPdf(
  vehicle: Vehicle,
  cargo: Cargo[],
  variant: LayoutVariant,
): Promise<void> {
  const blob = await pdf(
    <PDFDocument vehicle={vehicle} cargo={cargo} variant={variant} />
  ).toBlob();

  const url = URL.createObjectURL(blob);
  window.open(url, '_blank');
}
