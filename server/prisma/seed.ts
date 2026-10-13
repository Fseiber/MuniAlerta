import prisma from '../src/db';
import { EstadoReporte, Gravedad } from '@prisma/client';

type ReporteDemo = {
  barrio: string;
  latitud: number;
  longitud: number;
  descripcion: string;
  gravedad: Gravedad;
  esTransitable: boolean;
  umbralLluvia: number;
};

const reportesDemo: ReporteDemo[] = [
  { barrio: 'Centro', latitud: -27.4697, longitud: -58.8342, descripcion: 'Charco pequeño junto al cordón, pero la calle sigue transitable.', gravedad: Gravedad.LEVE, esTransitable: true, umbralLluvia: 10 },
  { barrio: 'La Rosada', latitud: -27.4664, longitud: -58.8368, descripcion: 'Acumulación leve frente a una boca de tormenta, se puede circular con precaución.', gravedad: Gravedad.LEVE, esTransitable: true, umbralLluvia: 15 },
  { barrio: 'Camba Cuá', latitud: -27.4591, longitud: -58.8351, descripcion: 'Charco de agua en la esquina, pero transitable para vehículos.', gravedad: Gravedad.LEVE, esTransitable: true, umbralLluvia: 12 },
  { barrio: 'Nuestra Señora de Pompeya', latitud: -27.4518, longitud: -58.8424, descripcion: 'Agua acumulada en media calzada, todavía se puede pasar.', gravedad: Gravedad.LEVE, esTransitable: true, umbralLluvia: 18 },
  { barrio: 'Bañado Norte', latitud: -27.4438, longitud: -58.8502, descripcion: 'Desagüe lento y charco superficial en la calle.', gravedad: Gravedad.LEVE, esTransitable: true, umbralLluvia: 20 },
  { barrio: 'Aldana', latitud: -27.4622, longitud: -58.8485, descripcion: 'Pequeña acumulación de agua frente a una vivienda, tránsito normal.', gravedad: Gravedad.LEVE, esTransitable: true, umbralLluvia: 14 },
  { barrio: 'La Cruz', latitud: -27.4775, longitud: -58.8413, descripcion: 'Charco profundo en un carril, se circula lentamente.', gravedad: Gravedad.LEVE, esTransitable: true, umbralLluvia: 22 },
  { barrio: 'San Martín', latitud: -27.4821, longitud: -58.8506, descripcion: 'Agua acumulada cerca de la esquina, sin interrupción del tránsito.', gravedad: Gravedad.LEVE, esTransitable: true, umbralLluvia: 16 },
  { barrio: 'Sur', latitud: -27.4904, longitud: -58.8568, descripcion: 'Cuneta con agua y barro, la calle permanece transitable.', gravedad: Gravedad.LEVE, esTransitable: true, umbralLluvia: 24 },
  { barrio: 'Santa Rosa', latitud: -27.4971, longitud: -58.8469, descripcion: 'Boca de tormenta obstruida y charco leve en la calzada.', gravedad: Gravedad.LEVE, esTransitable: true, umbralLluvia: 19 },
  { barrio: 'Libertad', latitud: -27.4568, longitud: -58.8612, descripcion: 'Agua acumulada en la mitad de la calle, se puede pasar con cuidado.', gravedad: Gravedad.MODERADO, esTransitable: true, umbralLluvia: 38 },
  { barrio: 'Güemes', latitud: -27.4694, longitud: -58.8618, descripcion: 'La lluvia formó un espejo de agua que dificulta el paso de motos.', gravedad: Gravedad.MODERADO, esTransitable: true, umbralLluvia: 42 },
  { barrio: 'Villa Chiquita', latitud: -27.4422, longitud: -58.8664, descripcion: 'Agua a la altura del cordón y tránsito lento en la cuadra.', gravedad: Gravedad.MODERADO, esTransitable: true, umbralLluvia: 45 },
  { barrio: 'San Gerónimo', latitud: -27.4506, longitud: -58.8731, descripcion: 'Calle anegada parcialmente, los autos pasan con precaución.', gravedad: Gravedad.MODERADO, esTransitable: true, umbralLluvia: 50 },
  { barrio: 'Santa Teresita', latitud: -27.4639, longitud: -58.8792, descripcion: 'Desagüe tapado y agua sobre un carril, circulación reducida.', gravedad: Gravedad.MODERADO, esTransitable: true, umbralLluvia: 48 },
  { barrio: 'Antártida Argentina', latitud: -27.4758, longitud: -58.8685, descripcion: 'Anegamiento moderado en la intersección, se recomienda reducir la velocidad.', gravedad: Gravedad.MODERADO, esTransitable: true, umbralLluvia: 55 },
  { barrio: 'Juan de Vera', latitud: -27.4842, longitud: -58.8754, descripcion: 'El agua cubre parte de la calzada y complica el transporte público.', gravedad: Gravedad.MODERADO, esTransitable: true, umbralLluvia: 60 },
  { barrio: 'San Benito', latitud: -27.4927, longitud: -58.8739, descripcion: 'Anegamiento moderado en calle de tierra, tránsito limitado.', gravedad: Gravedad.MODERADO, esTransitable: true, umbralLluvia: 58 },
  { barrio: 'Ponce', latitud: -27.4386, longitud: -58.8824, descripcion: 'El agua subió hasta el cordón y bloquea parcialmente una esquina.', gravedad: Gravedad.MODERADO, esTransitable: true, umbralLluvia: 62 },
  { barrio: 'Molina Punta', latitud: -27.4328, longitud: -58.8701, descripcion: 'Calle con anegamiento moderado, solo pasan vehículos altos.', gravedad: Gravedad.MODERADO, esTransitable: true, umbralLluvia: 65 },
  { barrio: 'Laguna Seca', latitud: -27.4555, longitud: -58.8891, descripcion: 'El agua llega a media rueda y varios vehículos evitan la zona.', gravedad: Gravedad.GRAVE, esTransitable: false, umbralLluvia: 72 },
  { barrio: 'Doctor Montaña', latitud: -27.4827, longitud: -58.8953, descripcion: 'Agua hasta las rodillas, no pasan autos pequeños.', gravedad: Gravedad.GRAVE, esTransitable: false, umbralLluvia: 78 },
  { barrio: 'Quilmes', latitud: -27.5018, longitud: -58.8872, descripcion: 'Inundación fuerte, la calle está completamente bajo agua.', gravedad: Gravedad.GRAVE, esTransitable: false, umbralLluvia: 85 },
  { barrio: 'Esperanza', latitud: -27.5112, longitud: -58.8708, descripcion: 'El agua llega hasta la cintura en algunos domicilios, imposible transitar.', gravedad: Gravedad.GRAVE, esTransitable: false, umbralLluvia: 95 },
  { barrio: 'San Antonio Oeste', latitud: -27.5184, longitud: -58.8559, descripcion: 'Desborde de desagüe, hay agua profunda y riesgo para peatones.', gravedad: Gravedad.GRAVE, esTransitable: false, umbralLluvia: 88 },
  { barrio: 'San Roque', latitud: -27.5074, longitud: -58.8412, descripcion: 'Anegamiento severo en la vía, el paso está interrumpido.', gravedad: Gravedad.GRAVE, esTransitable: false, umbralLluvia: 90 },
  { barrio: 'Independencia', latitud: -27.4935, longitud: -58.8398, descripcion: 'Agua por encima de la vereda y calzada intransitable.', gravedad: Gravedad.GRAVE, esTransitable: false, umbralLluvia: 82 },
  { barrio: 'Villa Raquel', latitud: -27.4746, longitud: -58.8958, descripcion: 'Inundación extensa, el agua impide el acceso de vehículos.', gravedad: Gravedad.GRAVE, esTransitable: false, umbralLluvia: 92 },
  { barrio: 'Fray José de la Quintana', latitud: -27.4634, longitud: -58.9004, descripcion: 'Agua hasta la rodilla y corriente en la calle, no es transitable.', gravedad: Gravedad.GRAVE, esTransitable: false, umbralLluvia: 86 },
  { barrio: 'San Cayetano', latitud: -27.4468, longitud: -58.8951, descripcion: 'Calle totalmente anegada, el tránsito está suspendido.', gravedad: Gravedad.GRAVE, esTransitable: false, umbralLluvia: 96 },
  { barrio: 'Parque Cadenas', latitud: -27.4317, longitud: -58.8916, descripcion: 'Desborde de cuneta con agua profunda, no pueden circular autos.', gravedad: Gravedad.GRAVE, esTransitable: false, umbralLluvia: 80 },
];

async function main() {
  await prisma.reporte.deleteMany({ where: { esDemo: true } });
  await prisma.reporte.createMany({
    data: reportesDemo.map((reporte, indice) => ({
      expedienteDoco: `DOCO-2026-${String(indice + 1).padStart(4, '0')}`,
      ...reporte,
      estado: EstadoReporte.PENDIENTE,
      esDemo: true,
    })),
  });
  console.log('Seed completado con 30 reportes demo');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
