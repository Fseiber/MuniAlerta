export interface Barrio {
  nombre: string;
  lat: number;
  lng: number;
}

export const barrios: Barrio[] = [
  { nombre: 'Centro', lat: -27.4682, lng: -58.8351 },
  { nombre: 'Cambá Cuá', lat: -27.4665, lng: -58.8441 },
  { nombre: 'La Rosada', lat: -27.4628, lng: -58.8302 },
  { nombre: 'La Cruz', lat: -27.4651, lng: -58.8263 },
  { nombre: 'Libertad', lat: -27.4725, lng: -58.8248 },
  { nombre: 'Mil Viviendas', lat: -27.4931, lng: -58.8214 },
  { nombre: 'Laguna Seca', lat: -27.4872, lng: -58.8058 },
  { nombre: '17 de Agosto', lat: -27.4915, lng: -58.7885 },
  { nombre: 'Pirayuí', lat: -27.5103, lng: -58.7794 },
  { nombre: 'Esperanza', lat: -27.5412, lng: -58.8010 },
  { nombre: 'Ciudades Correntinas', lat: -27.4987, lng: -58.7837 },
  { nombre: 'Aldana', lat: -27.4583, lng: -58.8211 },
  { nombre: 'Molina Punta', lat: -27.4285, lng: -58.7942 },
  { nombre: 'Bañado Norte', lat: -27.4531, lng: -58.8142 },
  { nombre: 'Apipé', lat: -27.4362, lng: -58.7851 },
  { nombre: 'Lomas del Mirador', lat: -27.4421, lng: -58.7905 },
  { nombre: 'Laguna Brava', lat: -27.4851, lng: -58.7291 },
  { nombre: 'San Gerónimo', lat: -27.4691, lng: -58.7912 },
  { nombre: 'Cremonte', lat: -27.4668, lng: -58.7615 },
  { nombre: 'Dr. Montaña', lat: -27.5182, lng: -58.7681 },
];

export function barrioMasCercano(lat: number, lng: number): Barrio {
  return barrios.reduce((cercano, barrio) => {
    const distanciaCercano = Math.hypot(cercano.lat - lat, cercano.lng - lng);
    const distanciaActual = Math.hypot(barrio.lat - lat, barrio.lng - lng);
    return distanciaActual < distanciaCercano ? barrio : cercano;
  });
}
