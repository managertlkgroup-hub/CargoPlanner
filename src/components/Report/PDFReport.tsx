// ============================================================================
// PDF-отчёт с использованием @react-pdf/renderer
// Поддержка кириллицы через шрифт Roboto
// ============================================================================


import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  pdf,
  Font,
  Svg,
  Rect,
  Circle,
} from '@react-pdf/renderer';
import type { Cargo, LayoutVariant, PackedItem, PackSettings, Vehicle, Unit } from '../../types';
import { useAppStore } from '../../store/useAppStore';
import { UNIT_LABEL, unitLabel, WEIGHT_UNIT_LABEL, formatWeight, formatDimension, type WeightUnit, nameOf } from '../../utils/helpers';
import { calculateCOG } from '../../lib/physics/cog';
import { tr, trf, type Lang } from '../../i18n';

// Регистрация шрифтов с поддержкой кириллицы
import robotoRegular from '../../assets/Roboto-Regular.ttf';
import robotoBold from '../../assets/Roboto-Bold.ttf';

try {
  Font.register({
    family: 'Roboto',
    fonts: [
      { src: robotoRegular, fontWeight: 400 },
      { src: robotoBold, fontWeight: 700 },
    ],
  });
} catch (e) {
  console.warn('Roboto font registration failed, falling back to default font', e);
}

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

function layerOfPacked(item: { layer?: number; position: { y: number }; dimensions: { height: number } }): number {
  if (item.layer != null) return item.layer;
  return layerOf(item);
}

function methodOf(item: { layer?: number; position: { y: number }; dimensions: { height: number } }): 'stack' | 'side' {
  return layerOfPacked(item) > 0 ? 'stack' : 'side';
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
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerLogo: {
    marginRight: 12,
  },
  headerText: {
    flex: 1,
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
  headerDate: {
    fontSize: 9,
    color: '#cbd5e1',
    textAlign: 'right',
  },
  headerDateLabel: {
    color: '#64748b',
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
  // Пояснение к центру тяжести
  cogInfo: {
    marginTop: 4,
    padding: 6,
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    borderRadius: 4,
  },
  cogWarn: {
    marginTop: 3,
    fontSize: 10,
    fontFamily: 'Roboto',
    fontWeight: 700,
    color: '#b45309',
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
    fontSize: 6,
    fontFamily: 'Roboto',
    color: '#0f172a',
    textAlign: 'center',
    position: 'absolute',
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
  // Диаграмма заполнения
  fillChartRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  fillChartLabel: {
    width: 110,
    fontSize: 9,
    color: '#334155',
  },
  fillChartTrack: {
    flex: 1,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#e2e8f0',
    marginRight: 8,
    overflow: 'hidden',
  },
  fillChartBar: {
    height: 10,
    borderRadius: 5,
  },
  fillChartValue: {
    width: 40,
    fontSize: 9,
    fontFamily: 'Roboto',
    fontWeight: 700,
    color: '#1e293b',
    textAlign: 'right',
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
  settings: PackSettings;
  unit: Unit;
  weightUnit: WeightUnit;
  lang: Lang;
}

/** Логотип приложения (blue truck/box) */
function AppLogo() {
  return (
    <Svg width={40} height={40} viewBox="0 0 64 64">
      <Rect x={4} y={16} width={56} height={32} rx={6} fill="#3b82f6" />
      <Rect x={12} y={24} width={14} height={10} rx={2} fill="#ffffff" fillOpacity={0.9} />
      <Rect x={30} y={24} width={14} height={10} rx={2} fill="#ffffff" fillOpacity={0.9} />
      <Circle cx={20} cy={48} r={6} fill="#1f2937" />
      <Circle cx={44} cy={48} r={6} fill="#1f2937" />
    </Svg>
  );
}

/** Заголовок */
function CoverHeader({ lang }: { lang: Lang }) {
  const locale = lang === 'ru' ? 'ru-RU' : 'en-US';
  return (
    <View style={styles.header}>
      <View style={styles.headerLogo}>
        <AppLogo />
      </View>
      <View style={styles.headerText}>
        <Text style={styles.headerTitle}>{tr(lang, 'pdf.cover.title')}</Text>
        <Text style={styles.headerSub}>CargoPlanner</Text>
      </View>
      <Text style={styles.headerDate}>
        <Text style={styles.headerDateLabel}>{tr(lang, 'pdf.dateLabel')}: </Text>
        {new Date().toLocaleDateString(locale)}
      </Text>
    </View>
  );
}

/** Информация об автомобиле */
function VehicleInfo({ vehicle, unit, weightUnit, lang }: { vehicle: Vehicle; unit: Unit; weightUnit: WeightUnit; lang: Lang }) {
  const fmt = (mm: number) => formatDimension(mm, unit);
  const BODY_LABELS: Record<string, string> = {
    tent: tr(lang, 'pdf.body.tent'), van: tr(lang, 'pdf.body.van'), isothermal: tr(lang, 'pdf.body.isothermal'),
    refrigerator: tr(lang, 'pdf.body.refrigerator'), side: tr(lang, 'pdf.body.side'), platform: tr(lang, 'pdf.body.platform'),
    flatbed: tr(lang, 'pdf.body.platform'), low_loader: tr(lang, 'pdf.body.low_loader'), dump: tr(lang, 'pdf.body.dump'),
    tanker: tr(lang, 'pdf.body.tanker'), container: tr(lang, 'pdf.body.container'),
  };
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={styles.sectionTitle}>{tr(lang, 'pdf.section.vehicle')}</Text>
      <Text style={styles.textBold}>{nameOf(vehicle, lang)}</Text>
      {vehicle.bodyType && (
        <Text style={styles.text}>{tr(lang, 'pdf.type')}: {BODY_LABELS[vehicle.bodyType] || vehicle.bodyType}</Text>
      )}
      <Text style={styles.text}>{tr(lang, 'pdf.body')}: {fmt(vehicle.length)} × {fmt(vehicle.width)} × {fmt(vehicle.height)} {UNIT_LABEL[unit]}</Text>
          <Text style={styles.text}>{tr(lang, 'pdf.maxWeight')}: {formatWeight(vehicle.maxWeight, weightUnit)} {WEIGHT_UNIT_LABEL[weightUnit]}</Text>
    </View>
  );
}

/** Сводка по загрузке */
function Metrics({ variant, vehicle, unit, weightUnit, lang }: { variant: LayoutVariant; vehicle: Vehicle; unit: Unit; weightUnit: WeightUnit; lang: Lang }) {
  const fmt = (mm: number) => `${formatDimension(mm, unit)} ${unitLabel(lang, unit)}`;
  const maxLayer = variant.items.length > 0
    ? Math.max(...variant.items.map(i => layerOfPacked(i)))
    : 0;
  const cog = calculateCOG(variant.items, vehicle);
  const isMixed = variant.labelKey === 'mode.mixed';

  // Метод укладки по грузам для смешанного режима
  const methodByName = new Map<string, string>();
  if (isMixed) {
    variant.items.forEach(item => {
      const key = item.nameKey || item.name || '';
      if (!methodByName.has(key)) {
        methodByName.set(key, tr(lang, methodOf(item) === 'stack' ? 'pd.stackingShort' : 'pd.sideBySideShort'));
      }
    });
  }

  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={styles.sectionTitle}>{tr(lang, 'pdf.summary')}</Text>
      <Text style={styles.textBold}>{tr(lang, 'pdf.variant')}: {tr(lang, variant.labelKey || 'mode.along')}</Text>
      <View style={styles.metricsRow}>
        <View style={styles.metricCell}>
          <Text style={styles.text}>{tr(lang, 'pdf.fillVolume')}: {variant.volumeFill}%</Text>
          <Text style={styles.text}>{tr(lang, 'pdf.fillWeight')}: {variant.weightFill}%</Text>
          <Text style={styles.text}>{tr(lang, 'pdf.placed')}: {variant.items.length}</Text>
        </View>
        <View style={styles.metricCell}>
          <Text style={styles.text}>{tr(lang, 'pdf.totalWeight')}: {formatWeight(variant.totalWeight, weightUnit)} {WEIGHT_UNIT_LABEL[weightUnit]}</Text>
          <Text style={styles.text}>{tr(lang, 'pdf.layers')}: {maxLayer + 1}</Text>
          <Text style={styles.text}>{tr(lang, 'pdf.maxWeight')}: {formatWeight(vehicle.maxWeight, weightUnit)} {WEIGHT_UNIT_LABEL[weightUnit]}</Text>
        </View>
      </View>
      {cog && (
        <View style={styles.cogInfo}>
          <Text style={styles.text}>
            {tr(lang, 'pdf.cog')}: X {fmt(cog.x)}, Y {fmt(cog.y)}, Z {fmt(cog.z)}
          </Text>
          <Text style={styles.text}>{tr(lang, 'pdf.cog.explain')}</Text>
          {(() => {
            const offX = Math.abs(cog.x - vehicle.length / 2);
            const offZ = Math.abs(cog.z - vehicle.width / 2);
            const warnLong = offX > vehicle.length * 0.1;
            const warnLat = offZ > vehicle.width * 0.1;
            return (
              <>
                {warnLong && <Text style={styles.cogWarn}>{tr(lang, 'pdf.cog.warnLong')}</Text>}
                {warnLat && <Text style={styles.cogWarn}>{tr(lang, 'pdf.cog.warnLat')}</Text>}
              </>
            );
          })()}
        </View>
      )}

      {/* Распределение по слоям */}
      {maxLayer > 0 && (() => {
        const counts: Record<number, number> = {};
        variant.items.forEach(item => {
          const li = layerOfPacked(item);
          counts[li] = (counts[li] || 0) + 1;
        });
        const dist = Object.entries(counts)
          .sort(([a], [b]) => Number(a) - Number(b))
          .map(([l, c]) => trf(lang, 'pdf.layerCount', { l: Number(l), c }))
          .join('  •  ');
        return <Text style={styles.textMuted}>{dist}</Text>;
      })()}

      {/* Метод укладки для смешанного режима */}
      {isMixed && methodByName.size > 0 && (
        <View style={{ marginTop: 4 }}>
          <Text style={styles.textMuted}>{tr(lang, 'pdf.method')}: </Text>
          {Array.from(methodByName.entries()).map(([name, m]) => (
            <Text key={name} style={styles.text}>{name} — {m}</Text>
          ))}
        </View>
      )}
    </View>
  );
}

/** Блок «Зазоры» — отображается только если хотя бы один зазор включён */
function GapsSection({ settings, unit, lang }: { settings: PackSettings; unit: Unit; lang: Lang }) {
  const gaps = [
    { label: tr(lang, 'gaps.wallShort'), value: settings.gapWalls ?? 0 },
    { label: tr(lang, 'gaps.widthShort'), value: settings.gapWidth ?? 0 },
    { label: tr(lang, 'gaps.lengthShort'), value: settings.gapLength ?? 0 },
  ].filter(g => g.value > 0);
  if (gaps.length === 0) return null;
  const fmt = (mm: number) => `${formatDimension(mm, unit)} ${unitLabel(lang, unit)}`;
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={styles.sectionTitle}>{tr(lang, 'gaps.title')}</Text>
      {gaps.map(g => (
        <Text key={g.label} style={styles.text}>{g.label}: {fmt(g.value)}</Text>
      ))}
    </View>
  );
}

/** Легенда цветов грузов для конкретного слоя */
function LayerItemLegend({ items, lang }: { items: PackedItem[]; lang: Lang }) {
  if (items.length === 0) return null;
  const unique = new Map<string, string>();
  items.forEach(item => {
    const key = item.color || '#3b82f6';
    if (!unique.has(key)) unique.set(key, nameOf(item, lang));
  });
  return (
    <View style={styles.legendRow}>
      {Array.from(unique.entries()).map(([color, name]) => {
        const rgb = hexToRgb(color);
        return (
          <View key={color} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})` }]} />
            <Text style={styles.legendText}>{name}</Text>
          </View>
        );
      })}
    </View>
  );
}

/** 2D-схема одного слоя */
function LayerScheme({
  vehicle,
  layer,
  layerItems,
  maxWidth,
  lang,
  allItems,
}: {
  vehicle: Vehicle;
  layer: number;
  layerItems: PackedItem[];
  maxWidth: number;
  lang: Lang;
  allItems?: PackedItem[];
}) {
  const SCALE = Math.min(maxWidth / vehicle.length, 100 / vehicle.width, 1.2);
  const vw = vehicle.length * SCALE;
  const vh = vehicle.width * SCALE;
  const source = allItems && allItems.length > 0 ? allItems : layerItems;

  return (
    <View style={styles.schemeContainer}>
      <Text style={styles.schemeTitle}>
        {tr(lang, 'pdf.layer')} {layer}{layer === 0 ? ` (${tr(lang, 'pdf.floor')})` : ''}
      </Text>
      <LayerItemLegend items={layerItems} lang={lang} />
      <View style={[styles.schemeBox, { width: vw, height: vh }]}>
        {layerItems.map((item) => {
          const { w, h } = ground(item);
          const x = item.position.x * SCALE;
          const y = item.position.z * SCALE;
          const iw = w * SCALE;
          const ih = h * SCALE;
          const color = item.color || '#3b82f6';
          const rgb = hexToRgb(color);
          const num = source.findIndex((s) => s.id === item.id) + 1;

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
              {iw > 22 && ih > 10 && (
                <Text style={[styles.schemeItemText, { paddingHorizontal: 4 }]}>{num}</Text>
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
}

/** Легенда слоёв */
function LayerLegend({ maxLayer, lang }: { maxLayer: number; lang: Lang }) {
  if (maxLayer <= 0) return null;
  return (
    <View style={styles.legendRow}>
      {Array.from({ length: maxLayer + 1 }, (_, i) => {
        const color = LAYER_COLORS[i % LAYER_COLORS.length];
        const rgb = hexToRgb(color);
        return (
          <View key={i} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})` }]} />
            <Text style={styles.legendText}>{tr(lang, 'pdf.layer')} {i}{i === 0 ? ` (${tr(lang, 'pdf.floor')})` : ''}</Text>
          </View>
        );
      })}
    </View>
  );
}

/** Легенда номеров грузов */
function ItemLegend({ items, lang }: { items: PackedItem[]; lang: Lang }) {
  if (items.length === 0) return null;
  const maxL = items.length > 0 ? Math.max(...items.map(i => layerOfPacked(i))) : 0;

  if (maxL === 0) {
    // Без слоёв — простой список
    return (
      <View style={{ marginBottom: 8 }}>
        <Text style={styles.textBold}>{tr(lang, 'pdf.itemNumbers')}</Text>
        <View style={styles.legendRow}>
          {items.map((item, idx2) => (
            <Text key={item.id} style={styles.legendText}>
              {idx2 + 1}. {nameOf(item, lang)}
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
      <Text style={styles.textBold}>{tr(lang, 'pdf.itemNumbersByLayer')}</Text>
      {Array.from({ length: maxL + 1 }, (_, layer) => {
        const layerItems = items
          .map((item, idx) => ({ item, idx }))
          .filter(({ item }) => layerOfPacked(item) === layer);
        if (layerItems.length === 0) return null;
        const color = LAYER_COLORS[layer % LAYER_COLORS.length];
        const rgb = hexToRgb(color);
        return (
          <View key={layer} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
            <View style={[styles.legendDot, { backgroundColor: `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`, marginRight: 4 }]} />
            <Text style={[styles.text, { fontFamily: 'Roboto', fontWeight: 700 }]}>{trf(lang, 'pdf.layerLabel', { layer })}</Text>
            <Text style={[styles.text, { marginLeft: 4 }]}>
              {layerItems.map(({ item, idx }) => `${idx + 1}. ${nameOf(item, lang)}`).join('  ·  ')}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

/** Таблица грузов */
function CargoTable({ cargo, items, unit, weightUnit, lang }: { cargo: Cargo[]; items: PackedItem[]; unit: Unit; weightUnit: WeightUnit; lang: Lang }) {
  const fmt = (mm: number) => formatDimension(mm, unit);

  // Сопоставляем cargo по id для деталей (форма)
  const cargoById = new Map(cargo.map(c => [c.id, c]));

  const rows = items.map((item, idx) => {
    const c = cargoById.get(item.id.split('-')[0]);
    return { item, c, idx: idx + 1 };
  });

  // Показываем «лишние» столбцы только если в них есть реальные данные
  const methodsUsed = new Set(rows.map(({ item }) => methodOf(item)));
  const showMethod = methodsUsed.size > 1;
  const showMaxLoad = rows.some(({ item }) => item.maxLoad != null);
  const showCompat = rows.some(({ item, c }) => item.compatibilityGroup || c?.compatibilityGroup);

  const COL_W = {
    num: 18,
    name: 56,
    shape: 32,
    size: 68,
    layer: 20,
    rot: 20,
    method: 34,
    weight: 28,
    stop: 22,
    maxLoad: 30,
    compat: 44,
  };

  return (
    <View>
      <Text style={styles.sectionTitle}>{tr(lang, 'pdf.cargoTable')}</Text>

      {/* Шапка таблицы — повторяется на каждой странице при переносе */}
      <View fixed style={styles.tableHeader}>
        <Text style={[styles.tableHeaderText, { width: COL_W.num }]}>{tr(lang, 'pdf.th.num')}</Text>
        <Text style={[styles.tableHeaderText, { width: COL_W.name }]}>{tr(lang, 'pdf.th.name')}</Text>
        <Text style={[styles.tableHeaderText, { width: COL_W.shape }]}>{tr(lang, 'pdf.th.shape')}</Text>
        <Text style={[styles.tableHeaderText, { width: COL_W.size }]}>{trf(lang, 'pdf.th.dimensions', { unit: UNIT_LABEL[unit] })}</Text>
        <Text style={[styles.tableHeaderText, { width: COL_W.layer }]}>{tr(lang, 'pdf.th.layer')}</Text>
        <Text style={[styles.tableHeaderText, { width: COL_W.rot }]}>{tr(lang, 'pdf.th.rotation')}</Text>
        {showMethod && <Text style={[styles.tableHeaderText, { width: COL_W.method }]}>{tr(lang, 'th.method')}</Text>}
        <Text style={[styles.tableHeaderText, { width: COL_W.weight }]}>{tr(lang, 'pdf.th.weight')}</Text>
        <Text style={[styles.tableHeaderText, { width: COL_W.stop }]}>{tr(lang, 'pdf.th.stop')}</Text>
        {showMaxLoad && <Text style={[styles.tableHeaderText, { width: COL_W.maxLoad }]}>{tr(lang, 'pdf.th.maxLoad')}</Text>}
        {showCompat && <Text style={[styles.tableHeaderText, { width: COL_W.compat }]}>{tr(lang, 'pdf.th.compatGroup')}</Text>}
      </View>

      {/* Строки данных — по одному грузу на каждую позицию */}
      {rows.map(({ item, c, idx }, rowIdx) => {
        const name = nameOf(item, lang);
        const shape = item.shape;
        const len = item.dimensions.length;
        const wid = item.dimensions.width;
        const hei = item.dimensions.height;
        const diam = item.diameter;
        const layer = layerOfPacked(item);
        const size = shape === 'cylinder'
          ? `Ø${fmt(diam ?? 0)}×${fmt(len)}`
          : `${fmt(len)}×${fmt(wid ?? 0)}×${fmt(hei ?? 0)}`;
        const method = tr(lang, methodOf(item) === 'stack' ? 'pd.stackingShort' : 'pd.sideBySideShort');
        const rot = item.rotationY != null ? `${item.rotationY}°` : '0°';
        const stop = item.stopOrder != null ? String(item.stopOrder) : '–';
        const maxLoad = item.maxLoad != null ? String(item.maxLoad) : '–';
        const compat = item.compatibilityGroup || c?.compatibilityGroup || '–';

          return (
            <View
              key={`${item.id}-${idx}`}
              style={[styles.tableRow, rowIdx % 2 === 0 ? styles.tableRowAlt : {}]}
            >
            <Text style={[styles.tableCell, { width: COL_W.num }]}>{idx}</Text>
            <Text style={[styles.tableCell, { width: COL_W.name }]}>{name}</Text>
            <Text style={[styles.tableCell, { width: COL_W.shape }]}>
              {shape === 'box' ? tr(lang, 'shape.rectShort') : tr(lang, 'shape.cylinder')}
            </Text>
            <Text style={[styles.tableCell, { width: COL_W.size }]}>{size}</Text>
            <View style={[styles.tableCell, { width: COL_W.layer, flexDirection: 'row', alignItems: 'center' }]}>
              <View style={[styles.layerBadge, { backgroundColor: item.color || '#3b82f6' }]} />
              <Text>{layer}</Text>
            </View>
            <Text style={[styles.tableCell, { width: COL_W.rot }]}>{rot}</Text>
            {showMethod && <Text style={[styles.tableCell, { width: COL_W.method }]}>{method}</Text>}
            <Text style={[styles.tableCell, { width: COL_W.weight }]}>
              {formatWeight(item.weight, weightUnit)}
            </Text>
            <Text style={[styles.tableCell, { width: COL_W.stop }]}>{stop}</Text>
            {showMaxLoad && <Text style={[styles.tableCell, { width: COL_W.maxLoad }]}>{maxLoad}</Text>}
            {showCompat && <Text style={[styles.tableCell, { width: COL_W.compat }]}>{compat}</Text>}
          </View>
        );
      })}
    </View>
  );
}

// ─── Основной документ ─────────────────────────────────────

/** Горизонтальная диаграмма заполнения */
function FillChart({ variant, lang }: { variant: LayoutVariant; lang: Lang }) {
  const clamp = (v: number) => Math.max(0, Math.min(100, v));
  const volt = clamp(variant.volumeFill);
  const wt = clamp(variant.weightFill);
  const bar = (label: string, pct: number, color: string) => (
    <View style={styles.fillChartRow}>
      <Text style={styles.fillChartLabel}>{label}</Text>
      <View style={styles.fillChartTrack}>
        <View style={[styles.fillChartBar, { width: `${pct}%`, backgroundColor: color }]} />
      </View>
      <Text style={styles.fillChartValue}>{pct.toFixed(0)}%</Text>
    </View>
  );

  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={styles.sectionTitle}>{tr(lang, 'pdf.fillChart')}</Text>
      {bar(tr(lang, 'pdf.fillVolume'), volt, '#3b82f6')}
      {bar(tr(lang, 'pdf.fillWeight'), wt, '#f59e0b')}
    </View>
  );
}

function PDFDocument({ vehicle, cargo, variant, settings, unit, weightUnit, lang }: ReportProps) {
  const maxLayer = variant.items.length > 0
    ? Math.max(...variant.items.map(i => layerOfPacked(i)))
    : 0;
  const numLayers = maxLayer + 1;
  const SCHEME_MAX_W = 480;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Шапка */}
        <CoverHeader lang={lang} />

        {/* Информация об автомобиле */}
        <VehicleInfo vehicle={vehicle} unit={unit} weightUnit={weightUnit} lang={lang} />

        {/* Сводка */}
        <Metrics variant={variant} vehicle={vehicle} unit={unit} weightUnit={weightUnit} lang={lang} />

        {/* Зазоры (если включены) */}
        <GapsSection settings={settings} unit={unit} lang={lang} />

        {/* 2D-схемы по слоям */}
        {numLayers <= 1 ? (
          // Без штабелирования — одна общая схема
          <LayerScheme
            vehicle={vehicle}
            layer={0}
            layerItems={variant.items}
            allItems={variant.items}
            maxWidth={SCHEME_MAX_W}
            lang={lang}
          />
        ) : (
          // Со штабелированием — отдельная схема для каждого слоя
          <View>
            <Text style={styles.sectionTitle}>{tr(lang, 'pdf.schemeByLayer')}</Text>
            <LayerLegend maxLayer={maxLayer} lang={lang} />
            {Array.from({ length: numLayers }, (_, li) => {
              const layerItems = variant.items.filter(i => layerOfPacked(i) === li);
              return (
                <LayerScheme
                  key={li}
                  vehicle={vehicle}
                  layer={li}
                  layerItems={layerItems}
                  allItems={variant.items}
                  maxWidth={numLayers >= 3 ? (SCHEME_MAX_W - 16) / 2 : SCHEME_MAX_W}
                  lang={lang}
                />
              );
            })}
          </View>
        )}

        {/* Диаграмма заполнения */}
        <FillChart variant={variant} lang={lang} />

        {/* Легенда номеров */}
        <ItemLegend items={variant.items} lang={lang} />

        {/* Таблица грузов */}
        <CargoTable cargo={cargo} items={variant.items} unit={unit} weightUnit={weightUnit} lang={lang} />

        {/* Подвал */}
        <Text style={styles.footer}>CargoPlanner — {trf(lang, 'pdf.page', { n: 1 })}</Text>
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
  lang: Lang = 'ru',
): Promise<void> {
  const state = useAppStore.getState();
  const unit = state.unit;
  const settings = state.settings;
  const blob = await pdf(
    <PDFDocument vehicle={vehicle} cargo={cargo} variant={variant} settings={settings} unit={unit} weightUnit={weightUnit} lang={lang} />
  ).toBlob();

  const url = URL.createObjectURL(blob);
  window.open(url, '_blank');
}
