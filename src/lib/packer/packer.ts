/** Основная функция расчёта раскладки */
export function packItems(
  vehicle: Vehicle,
  cargo: Cargo[],
  settings?: PackSettings,
  loadingPoints?: LoadingPoint[],
): PackResult {
  try {
    const resolvedSettings: PackSettings = settings ?? {
      maxStackHeight: 0,
      allowRotation: true,
    };

    const bin = {
      length: vehicle.length,
      width: vehicle.width,
      height: vehicle.height,
    };

    // Сортируем грузы по порядку точки загрузки (по возрастанию order),
    // чтобы грузы, загружаемые первыми, укладывались раньше.
    const orderByLoadingPoint = new Map<string, number>();
    if (loadingPoints && loadingPoints.length > 0) {
      loadingPoints.forEach((lp) => orderByLoadingPoint.set(lp.id, lp.order));
    }
    const sortedCargo = [...cargo].sort((a, b) => {
      const oa = a.loadingPointId !== undefined ? (orderByLoadingPoint.get(a.loadingPointId) ?? Number.MAX_SAFE_INTEGER) : Number.MAX_SAFE_INTEGER;
      const ob = b.loadingPointId !== undefined ? (orderByLoadingPoint.get(b.loadingPointId) ?? Number.MAX_SAFE_INTEGER) : Number.MAX_SAFE_INTEGER;
      return oa - ob;
    });

    // Размножаем каждый груз на quantity штук
    const boxes: Box[] = [];
    sortedCargo.forEach((c, idx) => {
      const qty = Math.max(1, Math.floor(c.quantity || 1));
      for (let i = 0; i < qty; i++) {
        boxes.push(toBox(c, idx));
      }
    });