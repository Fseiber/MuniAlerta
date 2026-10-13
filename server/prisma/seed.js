"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const db_1 = __importDefault(require("../src/db"));
const client_1 = require("@prisma/client");
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
        const gravedad = [client_1.Gravedad.LEVE, client_1.Gravedad.MODERADO, client_1.Gravedad.GRAVE][Math.floor(Math.random() * 3)];
        const umbral = Math.floor(Math.random() * 96) + 5; // 5-100
        const expediente = `DOCO-2026-${String(i).padStart(4, '0')}`;
        const desc = descripciones[i % descripciones.length];
        await db_1.default.reporte.create({
            data: {
                expedienteDoco: expediente,
                latitud: lat,
                longitud: lng,
                descripcion: desc,
                gravedad,
                esTransitable: null,
                estado: client_1.EstadoReporte.PENDIENTE,
                esDemo: true,
                umbralLluvia: umbral,
            },
        });
    }
}
main()
    .then(async () => {
    console.log('Seed completado con 30 reportes demo');
    await db_1.default.$disconnect();
})
    .catch(async (e) => {
    console.error(e);
    await db_1.default.$disconnect();
    process.exit(1);
});
