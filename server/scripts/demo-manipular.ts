import 'dotenv/config';
import prisma from '../src/db';

async function main() {
  const argumento = process.argv[2];
  const restaurar = argumento === '--restaurar';
  const expediente = restaurar ? process.argv[3] : argumento;
  if (!expediente) { console.error('Uso: demo-manipular.ts <expediente> | --restaurar <expediente>'); process.exitCode = 1; return; }
  const reporte = await prisma.reporte.findUnique({ where: { expedienteDoco: expediente } });
  if (!reporte) { console.error('Reporte no encontrado'); process.exitCode = 1; return; }
  const sufijo = ' (editado)';
  const descripcion = restaurar ? reporte.descripcion.endsWith(sufijo) ? reporte.descripcion.slice(0, -sufijo.length) : reporte.descripcion : reporte.descripcion.endsWith(sufijo) ? reporte.descripcion : `${reporte.descripcion}${sufijo}`;
  await prisma.reporte.update({ where: { id: reporte.id }, data: { descripcion } });
  console.log(`${restaurar ? 'Restaurado' : 'Editado'} ${expediente}`);
}

void main().finally(() => prisma.$disconnect());
