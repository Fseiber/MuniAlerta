import prisma from '../src/db';
import { Gravedad, EstadoReporte } from '@prisma/client';

const centroLat = -27.4692;
const centroLng = -58.8306;
const radioKm = 4;

function randomInRadius() {
  const rad = Math.random() * Math.PI * 2;
  const dist = Math.sqrt(Math.random()) * radioKm; // km
  const dx = dist * Math.cos(rad) / 111; // approx deg lat per km
  const dy = dist * Math.sin(rad) / (111 * Math.cos(centroLat * Math.PI / 180));
  return { lat: centroLat + dx, lng: centroLng + dy };
}

const descripciones = [
  'El agua me llega a las rodillas, no pasan los autos.',
  'Inundación fuerte, la calle está completamente bajo agua.',
  'Pequeña acumulación de agua, pero transitable.',
  'Corte de agua por la lluvia, se forma charco profundo.',
  'El nivel del agua sube cada minuto, peligroso.',
  'Agua hasta la cintura, imposible transitar.',
  'Acumulación moderada, se puede pasar con precaución.',
  'Desbordamiento del arroyo, zona muy afectada.',
  'Lluvia intensa, agua cubre parte del carril.',
  'Obstrucción de desagüe, agua estancada en la vía.'
];

async function main() {
  for (let i = 1; i <= 30; i++) {
    const { lat, lng } = randomInRadius();
    const gravedad = [Gravedad.LEVE, Gravedad.MODERADO, Gravedad.GRAVE][Math.floor(Math.random()*3)];
    const umbral = Math.floor(Math.random()*96) + 5; // 5-100
    const expediente = DOCO-2026-;
    const desc = descripciones[i % descripciones.length];
    await prisma.reporte.create({
      data: {
        expedienteDoco: expediente,
        latitud: lat,
        longitud: lng,
        descripcion: desc,
        gravedad,
        esTransitable: null,
        estado: EstadoReporte.PENDIENTE,
        esDemo: true,
        umbralLluvia: umbral,
      },
    });
  }
}

main()
  .then(async () => {
    console.log('Seed completado con 30 reportes demo');
    await prisma.();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.();
    process.exit(1);
  });
