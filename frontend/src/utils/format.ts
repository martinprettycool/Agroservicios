export function formatFecha(fecha: string): string {
  // Fecha de negocio: no convertir a un instante ni cambiar la zona horaria.
  return fecha.split('-').reverse().join('/');
}

export function formatDecimal(value: string | null): string {
  if (value === null) return 'Sin resultado';
  // Agrupar sin convertir Decimal a Number ni redondear los valores del backend.
  if (!/^-?\d+(\.\d+)?$/.test(value)) return value;
  const [integer, fraction] = value.split('.');
  const grouped = integer.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return fraction === undefined ? grouped : `${grouped},${fraction}`;
}
