import 'dotenv/config';
import { AccountId, Client, TopicCreateTransaction } from '@hashgraph/sdk';
import { censurarError, leerClaveOperador } from '../src/servicios/hedera';
import { diagnosticarHedera } from '../src/servicios/diagnosticoHedera';

async function main() {
  if (process.env.HEDERA_NETWORK !== 'testnet') { console.error('Falta HEDERA_NETWORK=testnet en server/.env'); process.exitCode = 1; return; }
  if (!process.env.HEDERA_ACCOUNT_ID || !process.env.HEDERA_PRIVATE_KEY) { console.error('Diagnóstico: variable ausente'); process.exitCode = 1; return; }
  const diagnostico = await diagnosticarHedera(3);
  if (diagnostico.pasos.length < 3 || diagnostico.pasos.slice(0, 3).some((paso) => !paso.ok)) { console.error('Diagnóstico: no se crea el Topic porque falló la validación de cuenta o clave'); process.exitCode = 1; return; }
  let cliente: Client | undefined;
  try {
    const cuenta = AccountId.fromString(process.env.HEDERA_ACCOUNT_ID);
    const operador = leerClaveOperador();
    cliente = Client.forTestnet().setOperator(cuenta, operador.clave);
    const transaccion = await new TopicCreateTransaction().setTopicMemo('MuniAlerta 2.0').setSubmitKey(operador.clave.publicKey).execute(cliente);
    const recibo = await transaccion.getReceipt(cliente);
    const topicId = recibo.topicId?.toString();
    if (!topicId) throw new Error('topic sin identificador');
    console.log(`Topic creado: ${topicId}`);
    console.log(`Pegá este valor en server/.env como HEDERA_TOPIC_ID=${topicId}`);
  } catch (error) {
    const mensaje = error instanceof Error && error.message.startsWith('HEDERA_PRIVATE_KEY no tiene formato DER') ? error.message : 'no se pudo crear el topic';
    console.error(`Diagnóstico: ${censurarError(mensaje)}`); process.exitCode = 1;
  }
  finally { cliente?.close(); }
}

void main();
