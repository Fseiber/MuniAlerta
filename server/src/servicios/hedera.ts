import { AccountId, Client, PrivateKey, TopicId, TopicMessageSubmitTransaction, TransactionRecordQuery } from '@hashgraph/sdk';

export type ResultadoHedera = { transactionId: string; secuencia: number; tiempoConsenso: string };
export type TipoClaveHedera = 'ED25519' | 'ECDSA';
export type ClaveOperador = { clave: PrivateKey; tipo: TipoClaveHedera };

export function censurarError(texto: string, secreto = process.env.HEDERA_PRIVATE_KEY || '') {
  const valores = [secreto, secreto.trim(), secreto.trim().replace(/^['"]|['"]$/g, '').trim()].filter(Boolean);
  return valores.reduce((resultado, valor) => resultado.split(valor).join('[HEDERA_PRIVATE_KEY_CENSURADA]'), texto);
}

export function leerClaveOperador(): ClaveOperador {
  const original = process.env.HEDERA_PRIVATE_KEY || '';
  const clave = original.trim().replace(/^['"]|['"]$/g, '').trim();
  const minuscula = clave.toLowerCase();
  if (minuscula.startsWith('302e')) return { clave: PrivateKey.fromStringDer(clave), tipo: 'ED25519' };
  if (minuscula.startsWith('3030')) return { clave: PrivateKey.fromStringDer(clave), tipo: 'ECDSA' };
  throw new Error(`HEDERA_PRIVATE_KEY debe ser la 'DER Encoded Private Key' del portal; la clave HEX no indica su tipo. Longitud: ${clave.length}`);
}

export function hederaConfigurada() {
  return process.env.HEDERA_NETWORK === 'testnet' && Boolean(process.env.HEDERA_ACCOUNT_ID && process.env.HEDERA_PRIVATE_KEY && process.env.HEDERA_TOPIC_ID);
}

export function informarEstadoHedera() {
  if (process.env.HEDERA_NETWORK !== 'testnet') { console.warn('Hedera deshabilitado: HEDERA_NETWORK no es testnet'); return; }
  if (!hederaConfigurada()) { console.warn('Hedera deshabilitado: faltan variables de configuración'); return; }
  console.log(`Hedera testnet activo. Cuenta ${process.env.HEDERA_ACCOUNT_ID}. Topic ${process.env.HEDERA_TOPIC_ID}`);
}

export async function enviarMensajeHcs(texto: string): Promise<ResultadoHedera> {
  if (!hederaConfigurada()) throw new Error('Hedera no configurado');
  let cliente: Client | undefined;
  try {
    const cuenta = AccountId.fromString(process.env.HEDERA_ACCOUNT_ID!);
    const operador = leerClaveOperador();
    const topic = TopicId.fromString(process.env.HEDERA_TOPIC_ID!);
    cliente = Client.forTestnet().setOperator(cuenta, operador.clave);
    const resultado = await Promise.race([
      (async () => {
        const transaccion = await new TopicMessageSubmitTransaction().setTopicId(topic).setMessage(texto).execute(cliente!);
        const recibo = await transaccion.getReceipt(cliente!);
        const secuencia = recibo.topicSequenceNumber?.toNumber();
        if (secuencia === undefined) throw new Error('Hedera no devolvió secuencia');
        const registro = await new TransactionRecordQuery().setTransactionId(transaccion.transactionId).execute(cliente!);
        const consenso = registro.consensusTimestamp?.toDate().toISOString() || new Date().toISOString();
        return { transactionId: transaccion.transactionId.toString(), secuencia, tiempoConsenso: consenso };
      })(),
      new Promise<never>((_, rechazar) => setTimeout(() => rechazar(new Error('Tiempo agotado al enviar a Hedera')), 15_000)),
    ]);
    return resultado;
  } finally { cliente?.close(); }
}
