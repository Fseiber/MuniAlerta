import prisma from '../src/db';
import { barrios } from '../src/barrios';
import { EstadoReporte, Gravedad } from '@prisma/client';

const BARRIOS_CRITICOS = ['Bañado Norte', 'Laguna Seca', 'Cambá Cuá', 'Mil Viviendas'];
const ANGULO_TRAZADO_GRAVE = 0;
const LONGITUD_TRAZADO_M = 200;

type CasoDemo = {
  barrio: string;
  gravedad: Gravedad;
  descripcion: string;
  offsetLat: number;
  offsetLng: number;
  umbralLluvia: number;
  esTransitable: boolean;
  radioCharcoM?: number;
};

const casos: CasoDemo[] = [
  { barrio: 'Centro', gravedad: Gravedad.LEVE, descripcion: 'En Centro hay un charco pequeño junto al cordón, pero la calle sigue transitable.', offsetLat: 0.0004, offsetLng: 0.0003, umbralLluvia: 10, esTransitable: true },
  { barrio: 'Centro', gravedad: Gravedad.MODERADO, descripcion: 'En Centro el agua cubre media calzada y el tránsito avanza con precaución.', offsetLat: -0.0006, offsetLng: -0.0005, umbralLluvia: 45, esTransitable: true, radioCharcoM: 22 },
  { barrio: 'Centro', gravedad: Gravedad.LEVE, descripcion: 'En Centro una boca de tormenta lenta dejó acumulación superficial transitable.', offsetLat: 0.0008, offsetLng: -0.0004, umbralLluvia: 20, esTransitable: true },
  { barrio: 'La Rosada', gravedad: Gravedad.LEVE, descripcion: 'En La Rosada se observa un charco superficial frente a una esquina, transitable.', offsetLat: 0.0005, offsetLng: 0.0004, umbralLluvia: 12, esTransitable: true },
  { barrio: 'La Rosada', gravedad: Gravedad.MODERADO, descripcion: 'En La Rosada el desagüe tapado redujo un carril y requiere circular despacio.', offsetLat: -0.0007, offsetLng: 0.0002, umbralLluvia: 50, esTransitable: true, radioCharcoM: 18 },
  { barrio: 'La Cruz', gravedad: Gravedad.LEVE, descripcion: 'En La Cruz hay agua acumulada en la cuneta, sin impedir el paso.', offsetLat: -0.0003, offsetLng: 0.0006, umbralLluvia: 15, esTransitable: true },
  { barrio: 'La Cruz', gravedad: Gravedad.MODERADO, descripcion: 'En La Cruz el agua llega al cordón y complica el cruce de la esquina.', offsetLat: 0.0006, offsetLng: -0.0007, umbralLluvia: 38, esTransitable: true, radioCharcoM: 25 },
  { barrio: 'Libertad', gravedad: Gravedad.LEVE, descripcion: 'En Libertad se detectó un charco pequeño que no interrumpe el tránsito.', offsetLat: 0.0004, offsetLng: -0.0004, umbralLluvia: 8, esTransitable: true },
  { barrio: 'Libertad', gravedad: Gravedad.MODERADO, descripcion: 'En Libertad hay agua sobre parte de la calzada y circulación reducida.', offsetLat: -0.0008, offsetLng: 0.0005, umbralLluvia: 55, esTransitable: true, radioCharcoM: 20 },
  { barrio: '17 de Agosto', gravedad: Gravedad.LEVE, descripcion: 'En 17 de Agosto una acumulación leve permanece transitable para autos.', offsetLat: 0.0005, offsetLng: -0.0003, umbralLluvia: 18, esTransitable: true },
  { barrio: '17 de Agosto', gravedad: Gravedad.MODERADO, descripcion: 'En 17 de Agosto el agua llega al cordón y obliga a reducir la velocidad.', offsetLat: -0.0006, offsetLng: 0.0006, umbralLluvia: 48, esTransitable: true, radioCharcoM: 17 },
  { barrio: 'Pirayuí', gravedad: Gravedad.LEVE, descripcion: 'En Pirayuí hay un charco junto a la vereda, sin bloqueo de la calle.', offsetLat: -0.0004, offsetLng: 0.0005, umbralLluvia: 14, esTransitable: true },
  { barrio: 'Pirayuí', gravedad: Gravedad.MODERADO, descripcion: 'En Pirayuí una cuneta desbordada ocupa parte del carril de circulación.', offsetLat: 0.0007, offsetLng: -0.0005, umbralLluvia: 52, esTransitable: true, radioCharcoM: 27 },
  { barrio: 'Esperanza', gravedad: Gravedad.LEVE, descripcion: 'En Esperanza se registró una acumulación menor, la calle es transitable.', offsetLat: 0.0003, offsetLng: 0.0006, umbralLluvia: 22, esTransitable: true },
  { barrio: 'Esperanza', gravedad: Gravedad.MODERADO, descripcion: 'En Esperanza el agua cubre un carril y dificulta el transporte público.', offsetLat: -0.0008, offsetLng: -0.0004, umbralLluvia: 58, esTransitable: true, radioCharcoM: 19 },
  { barrio: 'Ciudades Correntinas', gravedad: Gravedad.LEVE, descripcion: 'En Ciudades Correntinas hay un charco superficial que permite circular.', offsetLat: 0.0005, offsetLng: 0.0005, umbralLluvia: 16, esTransitable: true },
  { barrio: 'Ciudades Correntinas', gravedad: Gravedad.MODERADO, descripcion: 'En Ciudades Correntinas el anegamiento parcial exige circular con cuidado.', offsetLat: -0.0006, offsetLng: -0.0006, umbralLluvia: 44, esTransitable: true, radioCharcoM: 23 },
  { barrio: 'Aldana', gravedad: Gravedad.LEVE, descripcion: 'En Aldana una boca de tormenta acumula poca agua, pero el paso está libre.', offsetLat: -0.0004, offsetLng: 0.0004, umbralLluvia: 9, esTransitable: true },
  { barrio: 'Aldana', gravedad: Gravedad.MODERADO, descripcion: 'En Aldana el agua ocupa media calzada durante la lluvia intensa.', offsetLat: 0.0008, offsetLng: -0.0003, umbralLluvia: 46, esTransitable: true, radioCharcoM: 21 },
  { barrio: 'Molina Punta', gravedad: Gravedad.LEVE, descripcion: 'En Molina Punta se observa una acumulación pequeña, todavía transitable.', offsetLat: 0.0004, offsetLng: -0.0006, umbralLluvia: 13, esTransitable: true },
  { barrio: 'Molina Punta', gravedad: Gravedad.MODERADO, descripcion: 'En Molina Punta el agua alcanza el cordón y ralentiza los vehículos.', offsetLat: -0.0007, offsetLng: 0.0003, umbralLluvia: 53, esTransitable: true, radioCharcoM: 26 },
  { barrio: 'Apipé', gravedad: Gravedad.LEVE, descripcion: 'En Apipé se formó un charco leve al costado de la calle.', offsetLat: 0.0006, offsetLng: 0.0004, umbralLluvia: 11, esTransitable: true },
  { barrio: 'Apipé', gravedad: Gravedad.MODERADO, descripcion: 'En Apipé el desagüe lento deja agua sobre un carril, con paso cuidadoso.', offsetLat: -0.0005, offsetLng: -0.0007, umbralLluvia: 41, esTransitable: true, radioCharcoM: 16 },
  { barrio: 'Lomas del Mirador', gravedad: Gravedad.LEVE, descripcion: 'En Lomas del Mirador hay una acumulación superficial sin cortes de tránsito.', offsetLat: -0.0004, offsetLng: 0.0005, umbralLluvia: 17, esTransitable: true },
  { barrio: 'Lomas del Mirador', gravedad: Gravedad.MODERADO, descripcion: 'En Lomas del Mirador el agua cubre parte de la calzada y requiere precaución.', offsetLat: 0.0007, offsetLng: -0.0004, umbralLluvia: 49, esTransitable: true, radioCharcoM: 24 },
  { barrio: 'Laguna Brava', gravedad: Gravedad.LEVE, descripcion: 'En Laguna Brava se detectó un charco pequeño, la circulación continúa.', offsetLat: 0.0004, offsetLng: 0.0005, umbralLluvia: 24, esTransitable: true },
  { barrio: 'Laguna Brava', gravedad: Gravedad.MODERADO, descripcion: 'En Laguna Brava una cuneta con agua limita el paso por un costado.', offsetLat: -0.0006, offsetLng: -0.0005, umbralLluvia: 57, esTransitable: true, radioCharcoM: 29 },
  { barrio: 'San Gerónimo', gravedad: Gravedad.LEVE, descripcion: 'En San Gerónimo hay un charco menor frente a una vivienda, sin bloqueo.', offsetLat: -0.0003, offsetLng: 0.0005, umbralLluvia: 19, esTransitable: true },
  { barrio: 'San Gerónimo', gravedad: Gravedad.MODERADO, descripcion: 'En San Gerónimo la lluvia anegó parcialmente una intersección.', offsetLat: 0.0008, offsetLng: -0.0004, umbralLluvia: 43, esTransitable: true, radioCharcoM: 18 },
  { barrio: 'Cremonte', gravedad: Gravedad.LEVE, descripcion: 'En Cremonte se registró agua superficial y tránsito normal.', offsetLat: 0.0004, offsetLng: -0.0005, umbralLluvia: 7, esTransitable: true },
  { barrio: 'Cremonte', gravedad: Gravedad.MODERADO, descripcion: 'En Cremonte el agua acumulada ocupa parte de la calle.', offsetLat: -0.0007, offsetLng: 0.0004, umbralLluvia: 36, esTransitable: true, radioCharcoM: 15 },
  { barrio: 'Dr. Montaña', gravedad: Gravedad.LEVE, descripcion: 'En Dr. Montaña hay un charco pequeño, pero se puede transitar.', offsetLat: 0.0005, offsetLng: 0.0004, umbralLluvia: 21, esTransitable: true },
  { barrio: 'Dr. Montaña', gravedad: Gravedad.MODERADO, descripcion: 'En Dr. Montaña el agua llegó al cordón y reduce la calzada disponible.', offsetLat: -0.0006, offsetLng: -0.0005, umbralLluvia: 59, esTransitable: true, radioCharcoM: 30 },
  { barrio: 'Bañado Norte', gravedad: Gravedad.GRAVE, descripcion: 'En Bañado Norte el agua llega hasta las rodillas y la calle está intransitable.', offsetLat: 0.0005, offsetLng: 0.0003, umbralLluvia: 70, esTransitable: false, radioCharcoM: 48 },
  { barrio: 'Bañado Norte', gravedad: Gravedad.GRAVE, descripcion: 'En Bañado Norte una inundación profunda impide el paso de vehículos.', offsetLat: -0.0007, offsetLng: -0.0004, umbralLluvia: 82, esTransitable: false, radioCharcoM: 55 },
  { barrio: 'Bañado Norte', gravedad: Gravedad.GRAVE, descripcion: 'En Bañado Norte el agua cubre la calzada completa y hay corriente.', offsetLat: 0.0008, offsetLng: -0.0006, umbralLluvia: 92, esTransitable: false, radioCharcoM: 42 },
  { barrio: 'Laguna Seca', gravedad: Gravedad.GRAVE, descripcion: 'En Laguna Seca el agua supera el cordón y no permite circular.', offsetLat: -0.0004, offsetLng: 0.0005, umbralLluvia: 68, esTransitable: false, radioCharcoM: 45 },
  { barrio: 'Laguna Seca', gravedad: Gravedad.GRAVE, descripcion: 'En Laguna Seca una cuadra quedó bajo agua, con tránsito interrumpido.', offsetLat: 0.0006, offsetLng: -0.0005, umbralLluvia: 80, esTransitable: false, radioCharcoM: 52 },
  { barrio: 'Laguna Seca', gravedad: Gravedad.GRAVE, descripcion: 'En Laguna Seca el anegamiento llega a media rueda y requiere cortar el paso.', offsetLat: -0.0008, offsetLng: -0.0003, umbralLluvia: 95, esTransitable: false, radioCharcoM: 38 },
  { barrio: 'Cambá Cuá', gravedad: Gravedad.GRAVE, descripcion: 'En Cambá Cuá el agua cubre la calle y los vehículos no pueden avanzar.', offsetLat: 0.0004, offsetLng: 0.0006, umbralLluvia: 65, esTransitable: false, radioCharcoM: 40 },
  { barrio: 'Cambá Cuá', gravedad: Gravedad.GRAVE, descripcion: 'En Cambá Cuá la inundación bloquea una esquina completa.', offsetLat: -0.0006, offsetLng: -0.0004, umbralLluvia: 77, esTransitable: false, radioCharcoM: 50 },
  { barrio: 'Cambá Cuá', gravedad: Gravedad.GRAVE, descripcion: 'En Cambá Cuá el agua llega hasta la vereda y el tramo es intransitable.', offsetLat: 0.0008, offsetLng: -0.0005, umbralLluvia: 90, esTransitable: false, radioCharcoM: 35 },
  { barrio: 'Mil Viviendas', gravedad: Gravedad.GRAVE, descripcion: 'En Mil Viviendas el agua acumulada impide la circulación por la calle.', offsetLat: -0.0005, offsetLng: 0.0004, umbralLluvia: 66, esTransitable: false, radioCharcoM: 46 },
  { barrio: 'Mil Viviendas', gravedad: Gravedad.GRAVE, descripcion: 'En Mil Viviendas el anegamiento supera media rueda y no pasan autos chicos.', offsetLat: 0.0007, offsetLng: -0.0006, umbralLluvia: 84, esTransitable: false, radioCharcoM: 58 },
  { barrio: 'Mil Viviendas', gravedad: Gravedad.GRAVE, descripcion: 'En Mil Viviendas una corriente de agua atraviesa la calzada y obliga a interrumpir el paso.', offsetLat: -0.0008, offsetLng: -0.0003, umbralLluvia: 98, esTransitable: false, radioCharcoM: 33 },
];

function obtenerCentro(nombre: string) {
  const barrio = barrios.find((item) => item.nombre === nombre);
  if (!barrio) throw new Error(`Barrio no encontrado: ${nombre}`);
  return barrio;
}

function crearTrazado(lat: number, lng: number, indiceGrave: number): number[][] {
  const medioLat = (LONGITUD_TRAZADO_M / 2) / 111_000;
  const medioLng = medioLat / Math.cos((lat * Math.PI) / 180);
  const vertical = (indiceGrave + ANGULO_TRAZADO_GRAVE) % 2 === 0;
  return vertical
    ? [[lat - medioLat, lng], [lat + medioLat, lng]]
    : [[lat, lng - medioLng], [lat, lng + medioLng]];
}

async function main() {
  await prisma.reporte.deleteMany({ where: { esDemo: true } });
  let indiceGrave = 0;
  await prisma.reporte.createMany({
    data: casos.map((caso, indice) => {
      const centro = obtenerCentro(caso.barrio);
      const latitud = centro.lat + caso.offsetLat;
      const longitud = centro.lng + caso.offsetLng;
      const esGrave = caso.gravedad === Gravedad.GRAVE;
      if (esGrave && !BARRIOS_CRITICOS.includes(caso.barrio)) {
        throw new Error(`El reporte grave debe pertenecer a un barrio crítico: ${caso.barrio}`);
      }
      const trazado = esGrave ? crearTrazado(latitud, longitud, indiceGrave++) : null;
      return {
        expedienteDoco: `DOCO-2026-${String(indice + 1).padStart(4, '0')}`,
        barrio: caso.barrio,
        latitud,
        longitud,
        descripcion: caso.descripcion,
        gravedad: caso.gravedad,
        esTransitable: caso.esTransitable,
        trazado,
        radioCharcoM: caso.radioCharcoM ?? null,
        estado: EstadoReporte.PENDIENTE,
        esDemo: true,
        umbralLluvia: caso.umbralLluvia,
      };
    }),
  });
  console.log(`Seed completado con ${casos.length} reportes demo`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
