// ============================================================================
// Экспорт отчёта в PDF (jsPDF)
// ============================================================================

import { jsPDF } from 'jspdf';
import type { Cargo, LayoutVariant, Vehicle } from '../../types';
import { getCargoVolume } from '../../types';

/** Форматирует объём мм^3 в м^3 */
function volToM3(mm3: number): string {
  return `${(mm3 / 1e9).toFixed(2)} м³`;
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
    const x = offsetX + item.position.x * scale;
    const z = offsetY + item.position.z * scale;
    const iw = item.dimensions.length * scale;
    const id = item.dimensions.width * scale;
    doc.setFillColor(59, 130, 246);
    doc.setDrawColor(30);
    doc.setLineWidth(0.4);
    doc.rect(x, z, iw, id, 'FD');
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
    const x = offsetX + item.position.x * scale;
    const y = offsetY + h - (item.position.y + item.dimensions.height) * scale;
    const iw = item.dimensions.length * scale;
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
  doc.text('Отчёт о загрузке автомобиля', margin, y);
  y += 10;

  // Информация об авто
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(`Автомобиль: ${vehicle.name}`, margin, y);
  y += 6;
  doc.text(
    `Кузов: ${vehicle.length}×${vehicle.width}×${vehicle.height} мм · Грузоподъёмность: ${vehicle.maxWeight} кг`,
    margin,
    y,
  );
  y += 10;

  // Метрики варианта
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text(`Вариант: ${variant.label}`, margin, y);
  y += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.text(`Заполнение объёма: ${variant.volumeFill}%`, margin, y);
  y += 5;
  doc.text(`Заполнение по весу: ${variant.weightFill}%`, margin, y);
  y += 5;
  doc.text(`Суммарный вес: ${variant.totalWeight} кг`, margin, y);
  y += 5;
  doc.text(`Свободный объём: ${volToM3(variant.freeVolume)}`, margin, y);
  y += 10;

  // 2D-схемы
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('Схемы размещения:', margin, y);
  y += 4;

  // Вид сверху
  const viewScale = Math.min(90 / vehicle.length, 55 / vehicle.width, 2);
  drawTopView(doc, vehicle, variant, margin, y, viewScale);
  y += vehicle.width * viewScale + 14;

  if (y > 240) {
    doc.addPage();
    y = 20;
  }

  // Вид сбоку
  const sideScale = Math.min(120 / vehicle.length, 60 / vehicle.height, 2);
  drawSideView(doc, vehicle, variant, margin, y, sideScale);
  y += vehicle.height * sideScale + 16;

  // Список грузов
  if (y > 220) {
    doc.addPage();
    y = 20;
  }
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('Список грузов:', margin, y);
  y += 6;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Название', margin, y);
  doc.text('Кол-во', margin + 80, y);
  doc.text('Размеры, мм', margin + 110, y);
  doc.text('Вес, кг', margin + 160, y);
  y += 4;
  doc.setDrawColor(200);
  doc.line(margin, y, pageW - margin, y);
  y += 5;

  cargo.forEach((c) => {
    const size =
      c.shape === 'cylinder'
        ? `Ø${c.diameter} × ${c.length}`
        : `${c.length}×${c.width}×${c.height}`;
    const lines = doc.splitTextToSize(c.name, 75);
    doc.text(lines, margin, y);
    doc.text(String(c.quantity), margin + 80, y);
    doc.text(size, margin + 110, y);
    doc.text(String(c.weight), margin + 160, y);
    y += lines.length * 4 + 2;
    if (y > 275) {
      doc.addPage();
      y = 20;
    }
  });

  // Итоги
  y += 8;
  if (y > 275) {
    doc.addPage();
    y = 20;
  }
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  const totalVolume = cargo.reduce((s, c) => s + getCargoVolume(c) * c.quantity, 0);
  doc.text(
    `Итого: ${variant.totalWeight} кг · общий объём груза ${volToM3(totalVolume)}`,
    margin,
    y,
  );

  doc.save(`load-report-${Date.now()}.pdf`);
}