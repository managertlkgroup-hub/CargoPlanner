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
  Font,
} from '@react-pdf/renderer';
import type { Cargo, LayoutVariant, PackedItem, Vehicle, Unit } from '../../types';
import { useAppStore } from '../../store/useAppStore';
import { UNIT_LABEL, toUnit, WEIGHT_UNIT_LABEL, formatWeight, type WeightUnit } from '../../utils/helpers';

// Регистрация шрифтов с поддержкой кириллицы
import robotoRegular from '../../assets/Roboto-Regular.ttf';
import robotoBold from '../../assets/Roboto-Bold.ttf';

Font.register({
  family: 'Roboto',
  fonts: [
    { src: robotoRegular, fontWeight: 400 },
    { src: robotoBold, fontWeight: 700 },
  ],
});

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
    fontFamily: 'Roboto',
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
    fontFamily: 'Roboto',
    fontWeight: 700,
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
    fontFamily: 'Roboto',
    fontWeight: 700,
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
    fontFamily: 'Roboto',
    fontWeight: 700,
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
    fontFamily: 'Roboto',
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
    fontFamily: 'Roboto',
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
    fontFamily: 'Roboto',
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
function VehicleInfo({ vehicle, unit, weightUnit }: { vehicle: Vehicle; unit: Unit; weightUnit: WeightUnit }) {
  const fmt = (mm: number) => Math.round(toUnit(mm, unit) * 100) / 100;
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
      <Text style={styles.text}>Кузов: {fmt(vehicle.length)} × {fmt(vehicle.width)} × {fmt(vehicle.height)} {UNIT_LABEL[unit]}</Text>
          <Text style={styles.text}>Грузоподъёмность: {formatWeight(vehicle.maxWeight, weightUnit)} {WEIGHT_UNIT_LABEL[weightUnit]}</Text>
    </View>
  );
}

/** Сводка по загрузке */
function Metrics({ variant, vehicle, weightUnit }: { variant: LayoutVariant; vehicle: Vehicle; weightUnit: WeightUnit }) {
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
          <Text style={styles.text}>Вес: {formatWeight(variant.totalWeight, weightUnit)} {WEIGHT_UNIT_LABEL[weightUnit]}</Text>
        </View>
      </View>
      <View style={styles.metricsRow}>
        <View style={styles.metricCell}>
          <Text style={styles.text}>Свободный объём: {volMm3(variant.freeVolume)}</Text>
          <Text style={styles.text}>Свободный вес: {formatWeight(Math.max(0, vehicle.maxWeight - variant.totalWeight), weightUnit)} {WEIGHT_UNIT_LABEL[weightUnit]}</Text>
        </View>
        <View style={styles.metricCell}>
          {maxLayer > 0 && <Text style={styles.text}>Слоёв: {maxLayer + 1}</Text>}
      <Text style={styles.text}>Грузоподъёмность: {formatWeight(vehicle.maxWeight, weightUnit)} {WEIGHT_UNIT_LABEL[weightUnit]}</Text>
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
            <Text style={[styles.text, { fontFamily: 'Roboto', fontWeight: 700 }]}>Слой {layer}:</Text>
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
function CargoTable({ cargo, items, unit, weightUnit }: { cargo: Cargo[]; items: PackedItem[]; unit: Unit; weightUnit: WeightUnit }) {
  const fmt = (mm: number) => Math.round(toUnit(mm, unit) * 100) / 100;
  const maxL = items.length > 0 ? Math.max(...items.map(i => layerOf(i))) : 0;
  const hasLayers = maxL > 0;

  // Группируем размещённые грузы по (cargoId, layer) и считаем количество на каждом слое
  const groups = new Map<string, { layer: number; count: number; item: PackedItem }>();
  items.forEach(item => {
    const cargoId = item.id.split('-')[0];
    const layer = layerOf(item);
    const key = `${cargoId}::${layer}`;
    const existing = groups.get(key);
    if (existing) existing.count++;
    else groups.set(key, { layer, count: 1, item });
  });

  // Сопоставляем cargo по id для деталей (имя, форма, размер, вес)
  const cargoById = new Map(cargo.map(c => [c.id, c]));

  const rows = Array.from(groups.values())
    .map(g => {
      const c = cargoById.get(g.item.id.split('-')[0]);
      return { g, c };
    })
    .sort((a, b) => a.g.layer - b.g.layer || String(a.g.item.name).localeCompare(String(b.g.item.name), 'ru'));

  const COL_W = {
    num: 22,
    name: hasLayers ? 70 : 95,
    shape: 40,
    size: 88,
    weight: 40,
    qty: 26,
    layer: hasLayers ? 30 : 0,
  };

  return (
    <View>
      <Text style={styles.sectionTitle}>Список грузов</Text>

      {/* Шапка таблицы */}
      <View style={styles.tableHeader}>
        <Text style={[styles.tableHeaderText, { width: COL_W.num }]}>№</Text>
        <Text style={[styles.tableHeaderText, { width: COL_W.name }]}>Название</Text>
        <Text style={[styles.tableHeaderText, { width: COL_W.shape }]}>Форма</Text>
        <Text style={[styles.tableHeaderText, { width: COL_W.size }]}>Размеры, {UNIT_LABEL[unit]}</Text>
        <Text style={[styles.tableHeaderText, { width: COL_W.weight }]}>Вес</Text>
        <Text style={[styles.tableHeaderText, { width: COL_W.qty }]}>Кол-во</Text>
        {hasLayers && <Text style={[styles.tableHeaderText, { width: COL_W.layer }]}>Слой</Text>}
      </View>

      {/* Строки данных — по одному грузу на каждый слой */}
      {rows.map(({ g, c }, rowIdx) => {
        const name = c ? c.name : g.item.name;
        const shape = c ? c.shape : g.item.shape;
        const len = c ? c.length : g.item.dimensions.length;
        const wid = c ? c.width : g.item.dimensions.width;
        const hei = c ? c.height : g.item.dimensions.height;
        const diam = c ? c.diameter : g.item.diameter;
        const weight = c ? c.weight : g.item.weight;
        const qty = c ? c.quantity : 1;

        const size = shape === 'cylinder'
          ? `Ø${fmt(diam ?? 0)}×${fmt(len)}`
          : `${fmt(len)}×${fmt(wid ?? 0)}×${fmt(hei ?? 0)}`;

        return (
          <View
            key={`${name}-${g.layer}`}
            style={[styles.tableRow, rowIdx % 2 === 0 ? styles.tableRowAlt : {}]}
          >
            <Text style={[styles.tableCell, { width: COL_W.num }]}>{rowIdx + 1}</Text>
            <Text style={[styles.tableCell, { width: COL_W.name }]}>{name}</Text>
            <Text style={[styles.tableCell, { width: COL_W.shape }]}>
              {shape === 'box' ? 'Прямоуг.' : 'Цилиндр'}
            </Text>
            <Text style={[styles.tableCell, { width: COL_W.size }]}>{size}</Text>
            <Text style={[styles.tableCell, { width: COL_W.weight }]}>
              {formatWeight(weight * (c ? g.count : qty), weightUnit)}
            </Text>
            <Text style={[styles.tableCell, { width: COL_W.qty }]}>{g.count}</Text>
            {hasLayers && (
              <View style={[styles.tableCell, { width: COL_W.layer, flexDirection: 'row', alignItems: 'center' }]}>
                <View style={[styles.layerBadge, { backgroundColor: LAYER_COLORS[g.layer % LAYER_COLORS.length] }]} />
                <Text>{g.layer}</Text>
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}

// ─── Основной документ ─────────────────────────────────────

function PDFDocument({ vehicle, cargo, variant, unit, weightUnit }: ReportProps & { unit: Unit; weightUnit: WeightUnit }) {
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
        <VehicleInfo vehicle={vehicle} unit={unit} weightUnit={weightUnit} />

        {/* Сводка */}
        <Metrics variant={variant} vehicle={vehicle} weightUnit={weightUnit} />

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
        <CargoTable cargo={cargo} items={variant.items} unit={unit} weightUnit={weightUnit} />

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
  weightUnit: WeightUnit = 'kg',
): Promise<void> {
  const unit = useAppStore.getState().unit;
  const blob = await pdf(
    <PDFDocument vehicle={vehicle} cargo={cargo} variant={variant} unit={unit} weightUnit={weightUnit} />
  ).toBlob();

  const url = URL.createObjectURL(blob);
  window.open(url, '_blank');
}
