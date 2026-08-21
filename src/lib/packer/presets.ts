/** Возвращает готовый пресет по id или первый пресет по умолчанию */
export function getVehiclePreset(id?: string): Vehicle {
  if (!id) return VEHICLE_PRESETS[0];
  return VEHICLE_PRESETS.find((v) => v.id === id) ?? VEHICLE_PRESETS[0];
}

/**
 * Возвращает список стандартных пресетов автомобилей.
 * Используется как исходный список транспортных средств по умолчанию.
 */
export function getDefaultVehicles(): Vehicle[] {
  return VEHICLE_PRESETS.map((v) => ({ ...v }));
}