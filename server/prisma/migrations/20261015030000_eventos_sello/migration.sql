DO $$ BEGIN
  CREATE TYPE "EstadoSello" AS ENUM ('SIN_SELLO', 'PENDIENTE', 'ANCLADO', 'ERROR');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "TipoEventoSello" AS ENUM ('CREACION', 'CAMBIO_ESTADO', 'VALIDACION');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "EventoSello" (
  "id" SERIAL NOT NULL,
  "reporteId" INTEGER NOT NULL,
  "tipo" "TipoEventoSello" NOT NULL,
  "estadoNuevo" TEXT,
  "hash" TEXT NOT NULL,
  "hashPrevio" TEXT,
  "selloEstado" "EstadoSello" NOT NULL DEFAULT 'PENDIENTE',
  "hederaTransactionId" TEXT,
  "hederaSecuencia" INTEGER,
  "tiempoConsenso" TEXT,
  "intentos" INTEGER NOT NULL DEFAULT 0,
  "ultimoError" TEXT,
  "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EventoSello_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "EventoSello_reporteId_fkey" FOREIGN KEY ("reporteId") REFERENCES "Reporte"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "EventoSello_reporteId_creadoEn_idx" ON "EventoSello"("reporteId", "creadoEn");
