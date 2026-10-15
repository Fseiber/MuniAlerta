import { AccountBalanceQuery, AccountId, Client } from '@hashgraph/sdk';
import net from 'node:net';
import { censurarError, leerClaveOperador, type ClaveOperador } from './hedera';

type Paso = { numero: number; ok: boolean; explicacion: string };
export type ResultadoDiagnostico = { pasos: Paso[]; causa: string; cliente: Client | undefined };

const MIRROR = 'https://testnet.mirrornode.hedera.com/api/v1';

function salida(texto: string) { return censurarError(texto); }
function registrar(pasos: Paso[], numero: number, ok: boolean, explicacion: string) { const paso = { numero, ok, explicacion: salida(explicacion) }; pasos.push(paso); console.log(`${ok ? 'PASA' : 'FALLA'} ${numero}. ${paso.explicacion}`); return ok; }
function timeoutFetch(url: string, milisegundos: number) {
  const controlador = new AbortController();
  const temporizador = setTimeout(() => controlador.abort(), milisegundos);
  return fetch(url, { signal: controlador.signal }).finally(() => clearTimeout(temporizador));
}
function probarPuerto(host: string, port: number) {
  return new Promise<boolean>((resolver) => {
    const socket = net.createConnection({ host, port });
    const temporizador = setTimeout(() => { socket.destroy(); resolver(false); }, 5_000);
    socket.once('connect', () => { clearTimeout(temporizador); socket.destroy(); resolver(true); });
    socket.once('error', () => { clearTimeout(temporizador); socket.destroy(); resolver(false); });
  });
}
function coincideClaveCuenta(clave: ClaveOperador, valor: unknown) {
  if (typeof valor !== 'string') return false;
  const esperado = [clave.clave.publicKey.toStringDer().toLowerCase(), clave.clave.publicKey.toStringRaw().toLowerCase()];
  const candidatos = [valor.toLowerCase()];
  try { candidatos.push(Buffer.from(valor, 'base64').toString('hex').toLowerCase()); } catch { /* formato no base64 */ }
  return esperado.some((item) => candidatos.includes(item));
}

export async function diagnosticarHedera(hastaPaso = 6): Promise<ResultadoDiagnostico> {
  const pasos: Paso[] = [];
  let cliente: Client | undefined;
  let operador: ClaveOperador | undefined;
  let cuenta: AccountId | undefined;
  let datosCuenta: { balance?: number; key?: { _type?: string; key?: string } } | undefined;
  let causaPaso5 = '';
  const cuentaTexto = process.env.HEDERA_ACCOUNT_ID || '';
  const cuentaValida = /^0\.0\.\d+$/.test(cuentaTexto);
  try {
    if (cuentaValida) cuenta = AccountId.fromString(cuentaTexto);
    if (process.env.HEDERA_PRIVATE_KEY) operador = leerClaveOperador();
    const paso1 = cuentaValida && Boolean(operador) && process.env.HEDERA_NETWORK === 'testnet';
    const detalle = !cuentaValida ? 'HEDERA_ACCOUNT_ID debe tener formato 0.0.N' : !operador ? `HEDERA_PRIVATE_KEY ausente o inválida (longitud ${process.env.HEDERA_PRIVATE_KEY?.trim().length || 0})` : process.env.HEDERA_NETWORK !== 'testnet' ? 'Falta HEDERA_NETWORK=testnet en server/.env' : `Cuenta ${cuentaTexto}; clave presente, longitud ${process.env.HEDERA_PRIVATE_KEY!.trim().length}, tipo ${operador.tipo}; red testnet`;
    registrar(pasos, 1, paso1, detalle);
    if (!paso1 || hastaPaso === 1) return { pasos, causa: paso1 ? 'No se ejecutaron pasos posteriores.' : detalle, cliente };

    try {
      const respuesta = await timeoutFetch(`${MIRROR}/accounts/${cuentaTexto}`, 8_000);
      if (respuesta.status === 404) { registrar(pasos, 2, false, 'La cuenta no existe en Mirror Node (404)'); return { pasos, causa: 'ID de cuenta incorrecto', cliente }; }
      if (!respuesta.ok) throw new Error(`Mirror Node respondió ${respuesta.status}`);
      const cuentaMirror = await respuesta.json() as { balance?: number; key?: { _type?: string; key?: string } };
      datosCuenta = cuentaMirror;
      const saldoHbar = ((cuentaMirror.balance || 0) / 100_000_000).toFixed(8);
      registrar(pasos, 2, true, `Cuenta existente. Saldo: ${saldoHbar} HBAR. Tipo de clave pública: ${cuentaMirror.key?._type || 'desconocido'}`);
    } catch (error) { registrar(pasos, 2, false, `Mirror Node no respondió: ${censurarError(error instanceof Error ? error.message : 'error desconocido')}`); return { pasos, causa: 'Mirror Node no disponible', cliente }; }
    if (hastaPaso === 2) return { pasos, causa: 'No se ejecutaron pasos posteriores.', cliente };

    const coincide = coincideClaveCuenta(operador!, datosCuenta?.key?.key);
    const tipoCuenta = datosCuenta?.key?._type || 'desconocido';
    registrar(pasos, 3, coincide, coincide ? `La clave pública coincide con la cuenta (${operador!.tipo})` : `NO coincide (la cuenta usa ${tipoCuenta}, la clave es ${operador!.tipo})`);
    if (!coincide) return { pasos, causa: 'Clave de otra cuenta o tipo distinto', cliente };
    if (hastaPaso === 3) return { pasos, causa: 'No se ejecutaron pasos posteriores.', cliente };

    cliente = Client.forTestnet();
    const nodos = Object.keys(cliente.network).slice(0, 3);
    let bloqueados = 0;
    for (const nodo of nodos) {
      const host = nodo.split(':')[0];
      for (const puerto of [50211, 50212]) {
        const abierto = await probarPuerto(host, puerto);
        if (!abierto) bloqueados += 1;
        registrar(pasos, 4, abierto, `${host}:${puerto} ${abierto ? 'abierto' : 'bloqueado'}`);
      }
    }
    if (bloqueados === nodos.length * 2) return { pasos, causa: 'Red que bloquea los puertos de Hedera; probá con otra red, hotspot del celular o VPN', cliente };
    if (hastaPaso === 4) return { pasos, causa: 'No se ejecutaron pasos posteriores.', cliente };

    try {
      cliente.setOperator(cuenta!, operador!.clave);
      const saldo = await Promise.race([
        new AccountBalanceQuery().setAccountId(cuenta!).execute(cliente),
        new Promise<never>((_, rechazar) => setTimeout(() => rechazar(Object.assign(new Error('Tiempo agotado'), { name: 'TimeoutError' })), 15_000)),
      ]);
      registrar(pasos, 5, true, `Saldo por SDK: ${saldo.hbars.toString()}`);
    } catch (error) {
      const dato = error as { name?: string; status?: { toString?: () => string }; message?: string };
      const nombre = dato.name || 'Error';
      const status = dato.status?.toString?.() || 'sin status';
      const mensaje = censurarError(dato.message || 'sin mensaje');
      causaPaso5 = `${nombre}: ${mensaje}`;
      const bajo = `${nombre} ${status} ${mensaje}`.toLowerCase();
      const clase = nombre.includes('Timeout') ? 'TIMEOUT' : /econnrefused|unavailable|network|socket/.test(bajo) ? 'RED/ECONNREFUSED/UNAVAILABLE' : /account|invalid id/.test(bajo) ? 'CUENTA_INVALIDA' : /signature|firma|invalid signature/.test(bajo) ? 'FIRMA_INVALIDA' : 'OTRO';
      registrar(pasos, 5, false, `${clase}. nombre=${nombre}, status=${status}, mensaje=${mensaje}`);
    }
    if (hastaPaso === 5) return { pasos, causa: causaPaso5 || 'No se ejecutaron pasos posteriores.', cliente };
    return { pasos, causa: pasos.some((paso) => !paso.ok) ? causaPaso5 || 'Se detectó una falla en los pasos anteriores' : 'No se detectó una falla en los pasos ejecutados', cliente };
  } finally { cliente?.close(); }
}

export function imprimirResumenDiagnostico(resultado: ResultadoDiagnostico) { console.log(`Causa probable: ${salida(resultado.causa)}`); }
