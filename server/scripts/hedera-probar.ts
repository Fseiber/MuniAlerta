import 'dotenv/config';
import { diagnosticarHedera, imprimirResumenDiagnostico } from '../src/servicios/diagnosticoHedera';

async function main() {
  const resultado = await diagnosticarHedera();
  imprimirResumenDiagnostico(resultado);
  process.exitCode = resultado.pasos[0]?.ok && resultado.pasos.every((paso) => paso.ok) ? 0 : 1;
}

void main().catch(() => { console.error('Diagnóstico: error no controlado'); process.exitCode = 1; });
