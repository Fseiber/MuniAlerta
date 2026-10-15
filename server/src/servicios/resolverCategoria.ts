import type { Categoria } from '@prisma/client';
import { esCategoria } from '../categorias';

export function resolverCategoria(elegida: Categoria, sugerida: unknown) {
  return {
    categoria: elegida,
    categoriaSugeridaIa: esCategoria(sugerida) && sugerida !== elegida ? sugerida : null,
  };
}
