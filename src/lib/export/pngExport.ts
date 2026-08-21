// ============================================================================
// Экспорт текущего вида 3D-сцены в PNG (html2canvas)
// ============================================================================

/**
 * Сохраняет DOM-элемент (канвас 3D-сцены) как изображение PNG.
 * @param elementId id элемента, содержимое которого нужно сохранить
 * @param filename имя файла без расширения
 */
export async function exportSceneToPng(elementId: string, filename: string): Promise<void> {
  const el = document.getElementById(elementId);
  if (!el) {
    throw new Error(`Элемент "${elementId}" не найден`);
  }

  // Динамический импорт html2canvas для ленивой загрузки
  const html2canvas = (await import('html2canvas')).default;

  const canvas = await html2canvas(el, {
    backgroundColor: '#0f172a',
    useCORS: true,
    scale: 2,
  });

  const link = document.createElement('a');
  link.download = `${filename}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
}