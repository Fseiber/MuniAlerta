import { Categoria } from '@prisma/client';

export const categorias = [
  { id: Categoria.ANEGAMIENTO, nombre: 'Inundación / desborde', emoji: '🌊', color: '#3b82f6' },
  { id: Categoria.ARBOLADO, nombre: 'Árbol caído / ramas', emoji: '🌳', color: '#22c55e' },
  { id: Categoria.BASURA_CLOACAS, nombre: 'Basura / cloacas', emoji: '🗑️', color: '#a16207' },
  { id: Categoria.VIAL, nombre: 'Bache / calle dañada', emoji: '🕳️', color: '#f97316' },
  { id: Categoria.LUMINARIA, nombre: 'Luminaria rota / calle oscura', emoji: '💡', color: '#facc15' },
  { id: Categoria.SEMAFORO, nombre: 'Semáforo fuera de servicio', emoji: '🚥', color: '#14b8a6' },
  { id: Categoria.CABLE_ELECTRICO, nombre: 'Cable caído / peligro eléctrico', emoji: '⚡', color: '#a855f7' },
];

export function esCategoria(valor: unknown): valor is Categoria {
  return typeof valor === 'string' && Object.values(Categoria).includes(valor as Categoria);
}
