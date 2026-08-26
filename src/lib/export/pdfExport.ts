// ============================================================================
// Экспорт отчёта в PDF (jsPDF)
// Используем латинские тексты для совместимости, с rotationY-aware views
// ============================================================================

import { jsPDF } from 'jspdf';
import type { Cargo, LayoutVariant, Vehicle } from '../../types';
import { getCargoVolume } from '../../types';

/** Форматирует объём мм^3 в м^3 */
function volToM3(mm3: number): string {
  return `${(mm3 / 1e9).toFixed(2)} m3`;
}

/** Получает эффективные размеры основания груза с учётом поворота */
function getEffectiveGround(item: { dimensions: { length: number; width: number }; rotationY?: number }) {
  const rot = Math.round(((item.rotationY ?? 0) % 360) / 90) % 2;
  return rot === 1
    ? { effLength: item.dimensions.width, effWidth: item.dimensions.length }
    : { effLength: item.dimensions.length, effWidth: item.dimensions.width };
}

/** Рисует 2D-вид сверху (XZ) раскладки */
function drawTopView(
  doc: jsPDF,
  vehicle: Vehicle,
  variant: LayoutVariant,
  offsetX: number,
  offsetY: number,
  scale: number,
) {
  const w = vehicle.width * scale;
  const l = vehicle.length * scale;

  doc.setDrawColor(40);
  doc.setLineWidth(1);
  doc.rect(offsetX, offsetY, l, w);

  variant.items.forEach((item) => {
    const { effLength, effWidth } = getEffectiveGround(item);
    const x = offsetX + item.position.x * scale;
    const z = offsetY + item.position.z * scale;
    const iw = effLength * scale;
    const id = effWidth * scale;
    doc.setFillColor(59, 130, 246);
    doc.setDrawColor(30);
    doc.setLineWidth(0.4);
    doc.rect(x, z, iw, id, 'FD');

    if (iw > 8 && id > 6) {
      doc.setFontSize(5);
      doc.setTextColor(255, 255, 255);
      const label = `${Math.round(effLength)}x${Math.round(effWidth)}`;
      doc.text(label, x + iw / 2, z + id / 2 + 1, { align: 'center' });
      doc.setTextColor(0, 0, 0);
    }
  });
}

/** Рисует 2D-вид сбоку (XY) раскладки */
function drawSideView(
  doc: jsPDF,
  vehicle: Vehicle,
  variant: LayoutVariant,
  offsetX: number,
  offsetY: number,
  scale: number,
) {
  const h = vehicle.height * scale;
  const l = vehicle.length * scale;

  doc.setDrawColor(40);
  doc.setLineWidth(1);
  doc.rect(offsetX, offsetY, l, h);

  variant.items.forEach((item) => {
    const { effLength } = getEffectiveGround(item);
    const x = offsetX + item.position.x * scale;
    const y = offsetY + h - (item.position.y + item.dimensions.height) * scale;
    const iw = effLength * scale;
    const ih = item.dimensions.height * scale;
    doc.setFillColor(34, 197, 94);
    doc.setDrawColor(30);
    doc.setLineWidth(0.4);
    doc.rect(x, y, iw, ih, 'FD');
  });
}

/** Формирует и скачивает PDF-отчёт */
export function generatePdfReport(
  vehicle: Vehicle,
  cargo: Cargo[],
  variant: LayoutVariant,
): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 16;

  let y = 20;

  // Заголовок
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('Load Report', margin, y);
  y += 8;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(120, 120, 120);
  doc.text(`CargoPlanner - ${new Date().toLocaleDateString()}`, margin, y);
  doc.setTextColor(0, 0, 0);
  y += 10;

  // Информация об авто
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(`Vehicle: ${vehicle.name}`, margin, y);
  y += 6;
  doc.setFont('helvetica', 'normal');
  doc.text(
    `Body: ${vehicle.length}x${vehicle.width}x${vehicle.height} mm | Capacity: ${vehicle.maxWeight} kg`,
    margin, y,
  );
  y += 10;

  // Метрики варианта
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text(`Layout: ${variant.label}`, margin, y);
  y += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.text(`Volume fill: ${variant.volumeFill}%`, margin, y); y += 5;
  doc.text(`Weight fill: ${variant.weightFill}%`, margin, y); y += 5;
  doc.text(`Total weight: ${variant.totalWeight} kg`, margin, y); y += 5;
  doc.text(`Free volume: ${volToM3(variant.freeVolume)}`, margin, y); y += 5;
  doc.text(`Items placed: ${variant.items.length}`, margin, y); y += 8;

  // Габариты размещённого груза
  if (variant.items.length > 0) {
    let maxX = 0, maxZ = 0, maxY = 0;
    variant.items.forEach((item) => {
      const { effLength, effWidth } = getEffectiveGround(item);
      maxX = Math.max(maxX, item.position.x + effLength);
      maxZ = Math.max(maxZ, item.position.z + effWidth);
      maxY = Math.max(maxY, item.position.y + item.dimensions.height);
    });
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Cargo Dimensions:', margin, y); y += 5;
    doc.setFont('helvetica', 'normal');
    doc.text(`Length: ${Math.round(maxX)} mm`, margin + 4, y); y += 4;
    doc.text(`Width: ${Math.round(maxZ)} mm`, margin + 4, y); y += 4;
    doc.text(`Height: ${Math.round(maxY)} mm`, margin + 4, y); y += 4;
    doc.text(`Volume: ${(maxX * maxZ * maxY / 1e9).toFixed(2)} m3`, margin + 4, y); y += 8;
  }

  // 2D-схемы
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('Layout Schemes:', margin, y);
  y += 4;

  // Вид сверху
  const viewScale = Math.min(90 / vehicle.length, 55 / vehicle.width, 2);
  drawTopView(doc, vehicle, variant, margin, y, viewScale);
  y += vehicle.width * viewScale + 14;

  if (y > 240) { doc.addPage(); y = 20; }

  // Вид сбоку
  const sideScale = Math.min(120 / vehicle.length, 60 / vehicle.height, 2);
  drawSideView(doc, vehicle, variant, margin, y, sideScale);
  y += vehicle.height * sideScale + 16;

  // Список грузов
  if (y > 220) { doc.addPage(); y = 20; }
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('Cargo List:', margin, y);
  y += 6;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Name', margin, y);
  doc.text('Qty', margin + 80, y);
  doc.text('Dimensions, mm', margin + 100, y);
  doc.text('Weight, kg', margin + 155, y);
  y += 4;
  doc.setDrawColor(200);
  doc.line(margin, y, pageW - margin, y);
  y += 5;

  cargo.forEach((c) => {
    const size =
      c.shape === 'cylinder'
        ? `D${c.diameter} x ${c.length}`
        : `${c.length}x${c.width ?? 0}x${c.height ?? 0}`;
    const lines = doc.splitTextToSize(c.name, 75);
    doc.text(lines, margin, y);
    doc.text(String(c.quantity), margin + 80, y);
    doc.text(size, margin + 100, y);
    doc.text(String(c.weight), margin + 155, y);
    y += lines.length * 4 + 2;
    if (y > 275) { doc.addPage(); y = 20; }
  });

  // Итоги
  y += 8;
  if (y > 275) { doc.addPage(); y = 20; }
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  const totalVolume = cargo.reduce((s, c) => s + getCargoVolume(c) * c.quantity, 0);
  doc.text(
    `Total: ${variant.totalWeight} kg | Cargo volume: ${volToM3(totalVolume)}`,
    margin, y,
  );

  // Футер
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `CargoPlanner | Page ${i}/${pageCount}`,
      pageW / 2, 290, { align: 'center' },
    );
    doc.setTextColor(0, 0, 0);
  }

  doc.save(`load-report-${Date.now()}.pdf`);
}
