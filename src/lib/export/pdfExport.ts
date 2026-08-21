// ============================================================================
// Экспорт отчёта в PDF (jsPDF + html2canvas)
// ============================================================================

import { jsPDF } from 'jspdf';
import type { Cargo, LayoutVariant, Vehicle } from '../../types';

/** Строит 2D-схему размещения (вид сверху) и возвращает SVG-разметку */
function buildTopView(variant: LayoutVariant): string {
  const items = variant.items;
  if (items.length === 0) return '<p>Нет размещённых грузов</p>';

  // Определяем границы
  const maxX = Math.max(...items.map((i) => i.position.x + i.dimensions.length), 1);
  const maxZ = Math.max(...items.map((i) => i.position.z + i.dimensions.width), 1);

  // Масштаб: подгоняем под 180x100 мм на листе
  const scale = Math.min(180 / maxX, 100 / maxZ);
  const offsetX = 20;
  const offsetY = 90;

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="220" height="130" viewBox="0 0 220 130">`;
  // Корпус кузова (контур)
  svg += `<rect x="${offsetX}" y="${offsetY}" width="${maxX * scale}" height="${maxZ * scale}" fill="none" stroke="#334155" stroke-width="1.5" />`;

  items.forEach((item) => {
    const x = offsetX + item.position.x * scale;
    const y = offsetY + item.position.z * scale;
    const w = item.dimensions.length * scale;
    const h = item.dimensions.width * scale;
    svg += `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${item.color}" opacity="0.85" stroke="#0f172a" stroke-width="0.5" />`;
    // Короткая подпись (первые 3 буквы)
    const label = item.name.slice(0, 3).toUpperCase();
    svg += `<text x="${x + w / 2}" y="${y + h / 2}" font-size="5" text-anchor="middle" dominant-baseline="middle" fill="#fff">${label}</text>`;
  });
  svg += `</svg>`;
  return svg;
}

/** Строит 2D-схему размещения (вид сбоку) */
function buildSideView(variant: LayoutVariant, vehicle: Vehicle): string {
  const items = variant.items;
  const maxX = Math.max(...items.map((i) => i.position.x + i.dimensions.length), vehicle.length);
  const maxY = Math.max(...items.map((i) => i.position.y + i.dimensions.height), vehicle.height);

  const scale = Math.min(180 / maxX, 60 / maxY);
  const offsetX = 20;
  const offsetY = 220;

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="220" height="100" viewBox="0 0 220 100">`;
  svg += `<rect x="${offsetX}" y="${offsetY - maxY * scale}" width="${maxX * scale}" height="${maxY * scale}" fill="none" stroke="#334155" stroke-width="1.5" />`;

  items.forEach((item) => {
    const x = offsetX + item.position.x * scale;
    const y = offsetY - (item.position.y + item.dimensions.height) * scale;
    const w = item.dimensions.length * scale;
    const h = item.dimensions.height * scale;
    svg += `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${item.color}" opacity="0.85" stroke="#0f172a" stroke-width="0.5" />`;
  });
  svg += `</svg>`;
  return svg;
}

/** Формирует пошаговую инструкцию для грузчиков */
function buildLoaderInstructions(variant: LayoutVariant): string[] {
  if (variant.items.length === 0) return ['Нет размещённых грузов.'];

  // Группируем грузы по слоям (по координате y)
  const layers = new Map<number, typeof variant.items>();
  variant.items.forEach((item) => {
    const key = Math.round(item.position.y * 10) / 10;
    if (!layers.has(key)) layers.set(key, []);
    layers.get(key)!.push(item);
  });

  const sortedKeys = [...layers.keys()].sort((a, b) => a - b);
  const lines: string[] = [];
  sortedKeys.forEach((y, idx) => {
    lines.push(`Слой ${idx + 1} (высота ${y} мм):`);
    layers.get(y)!.forEach((item) => {
      lines.push(
        `  • ${item.name}: ${item.dimensions.length}×${item.dimensions.width}×${item.dimensions.height} мм, вес ${item.weight} кг — координаты x=${Math.round(item.position.x)}, z=${Math.round(item.position.z)}`,
      );
    });
  });
  return lines;
}

/** Создаёт и скачивает PDF-отчёт */
export function generatePdfReport(
  vehicle: Vehicle,
  cargo: Cargo[],
  variant: LayoutVariant | null,
): void {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });

  // --- Заголовок ---
  doc.setFontSize(18);
  doc.text('Отчёт о загрузке автомобиля', 20, 20);
  doc.setFontSize(11);
  doc.text(`Дата: ${new Date().toLocaleString('ru-RU')}`, 20, 30);

  // --- Параметры автомобиля ---
  doc.setFontSize(14);
  doc.text('Параметры автомобиля', 20, 45);
  doc.setFontSize(11);
  doc.text(`Модель: ${vehicle.name}`, 20, 55);
  doc.text(
    `Кузов: ${vehicle.length} × ${vehicle.width} × ${vehicle.height} мм`,
    20,
    62,
  );
  doc.text(`Грузоподъёмность: ${vehicle.maxWeight} кг`, 20, 69);

  // --- Список грузов ---
  doc.setFontSize(14);
  doc.text('Список грузов', 20, 84);
  doc.setFontSize(9);
  let yPos = 92;
  cargo.forEach((c) => {
    doc.text(
      `${c.name}: ${c.length}×${c.width}×${c.height} мм, ${c.weight} кг, кол-во ${c.quantity}${c.stackable ? ', штабелируемый' : ''}`,
      20,
      yPos,
    );
    yPos += 6;
    if (yPos > 270) {
      doc.addPage();
      yPos = 20;
    }
  });

  // --- Метрики варианта ---
  if (variant) {
    doc.addPage();
    doc.setFontSize(14);
    doc.text(`Вариант: ${variant.label}`, 20, 20);
    doc.setFontSize(11);
    doc.text(`Заполнение по объёму: ${variant.volumeFill}%`, 20, 30);
    doc.text(`Заполнение по весу: ${variant.weightFill}%`, 20, 37);
    doc.text(`Суммарный вес: ${variant.totalWeight} кг`, 20, 44);
    doc.text(
      `Свободный объём: ${(variant.freeVolume / 1e9).toFixed(2)} м³`,
      20,
      51,
    );
    doc.text(`Свободный вес: ${variant.freeWeight} кг`, 20, 58);

    // --- Схемы ---
    doc.setFontSize(13);
    doc.text('Схема загрузки (вид сверху):', 20, 72);
    doc.addImage(buildTopView(variant), 'SVG', 15, 78, 200, 118);

    doc.text('Схема загрузки (вид сбоку):', 20, 205);
    doc.addImage(buildSideView(variant, vehicle), 'SVG', 15, 210, 200, 90);

    // --- Инструкция ---
    doc.addPage();
    doc.setFontSize(14);
    doc.text('Инструкция для грузчиков', 20, 20);
    doc.setFontSize(10);
    const instructions = buildLoaderInstructions(variant);
    let iy = 30;
    instructions.forEach((line) => {
      const split = doc.splitTextToSize(line, 175);
      doc.text(split, 20, iy);
      iy += split.length * 5;
      if (iy > 280) {
        doc.addPage();
        iy = 20;
      }
    });
  } else {
    doc.text('Расчёт не выполнен — вариантов раскладки нет.', 20, 90);
  }

  doc.save(`load-report-${vehicle.name.replace(/\s+/g, '-').toLowerCase()}.pdf`);
}