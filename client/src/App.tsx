import { useEffect, useState } from 'react'
import { CircleMarker, MapContainer, Popup, TileLayer } from 'react-leaflet'
import { crearReporte, generarBoletin, obtenerReportes } from './services/api'
import type { Reporte } from './types'
import './App.css'

const CORRIENTES = { latitud: -27.4692, longitud: -58.8306 }
const CENTRO_MAPA: [number, number] = [CORRIENTES.latitud, CORRIENTES.longitud]

const coloresGravedad = {
  LEVE: '#22c55e',
  MODERADO: '#eab308',
  GRAVE: '#ef4444',
} as const

function App() {
  const [listaReportes, setListaReportes] = useState<Reporte[]>([])
  const [reporteSeleccionado, setReporteSeleccionado] = useState<Reporte | null>(null)
  const [esModoDemo, setEsModoDemo] = useState(true)
  const [nivelLluviaSimulada, setNivelLluviaSimulada] = useState(50)
  const [textoMensaje, setTextoMensaje] = useState('')
  const [ubicacionSeleccionada, setUbicacionSeleccionada] = useState<{
    latitud: number
    longitud: number
  } | null>(null)
  const [cargando, setCargando] = useState(true)
  const [enviando, setEnviando] = useState(false)
  const [generandoBoletin, setGenerandoBoletin] = useState(false)
  const [boletinContenido, setBoletinContenido] = useState<string | null>(null)
  const [mensajeError, setMensajeError] = useState('')

  useEffect(() => {
    let activo = true

    const cargarReportes = async () => {
      try {
        const reportes = await obtenerReportes(esModoDemo)
        if (activo) {
          setListaReportes(reportes)
          setMensajeError('')
        }
      } catch {
        if (activo) setMensajeError('No se pudo conectar con el servidor municipal.')
      } finally {
        if (activo) setCargando(false)
      }
    }

    void cargarReportes()
    const intervalo = window.setInterval(() => void cargarReportes(), 4000)
    return () => {
      activo = false
      window.clearInterval(intervalo)
    }
  }, [esModoDemo])

  const reportesVisibles = esModoDemo
    ? listaReportes.filter((reporte) => (reporte.umbralLluvia ?? 0) <= nivelLluviaSimulada)
    : listaReportes

  const usarUbicacionDePrueba = () => setUbicacionSeleccionada(CORRIENTES)

  const enviarAlerta = async () => {
    if (!ubicacionSeleccionada || !textoMensaje.trim()) return

    setEnviando(true)
    setMensajeError('')
    try {
      await crearReporte({
        ...ubicacionSeleccionada,
        texto: textoMensaje.trim(),
        esDemo: esModoDemo,
      })
      setTextoMensaje('')
      setUbicacionSeleccionada(null)
    } catch {
      setMensajeError('No se pudo enviar la alerta. Intentalo nuevamente.')
    } finally {
      setEnviando(false)
    }
  }

  const solicitarBoletin = async () => {
    setGenerandoBoletin(true)
    try {
      const resultado = await generarBoletin()
      setBoletinContenido(resultado.boletin)
    } catch {
      setMensajeError('No se pudo generar el boletín.')
    } finally {
      setGenerandoBoletin(false)
    }
  }

  const imprimirBoletin = () => {
    if (!boletinContenido) return
    const ventana = window.open('', '_blank', 'width=800,height=700')
    if (!ventana) return
    const contenidoSeguro = boletinContenido.replace(/[&<>"']/g, (caracter) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    })[caracter] ?? caracter)
    ventana.document.write(`<!doctype html><html><head><title>Boletín Municipal de Incidencias</title><style>body{font-family:Arial,sans-serif;color:#17212b;max-width:720px;margin:48px auto;line-height:1.6}h1{font-size:22px;border-bottom:2px solid #22c55e;padding-bottom:12px}main{white-space:pre-wrap;font-size:16px}</style></head><body><h1>Boletín Municipal de Incidencias</h1><main>${contenidoSeguro}</main></body></html>`)
    ventana.document.close()
    ventana.focus()
    ventana.print()
  }

  return (
    <main className="aplicacion">
      <header className="encabezado-mobile">
        <div className="marca"><span className="marca-punto" /> MuniAlerta</div>
        <span className="etiqueta-en-vivo"><span /> Monitoreo activo</span>
      </header>

      <section className="panel-ciudadano">
        <div className="marca marca-escritorio"><span className="marca-punto" /> MuniAlerta</div>
        <div className="titulo-panel">
          <span className="icono-circulo">!</span>
          <div><p className="sobretitulo">Canal ciudadano</p><h1>Reportá un problema</h1></div>
        </div>
        <p className="introduccion">Tu aviso ayuda a la Municipalidad a cuidar las calles de Corrientes.</p>

        <div className="chat">
          <div className="mensaje-bot">
            <span className="avatar">MA</span>
            <p>Hola. ¿Qué está pasando en tu barrio?</p>
          </div>
          {ubicacionSeleccionada && (
            <div className="ubicacion-confirmada">
              <span>●</span><div><strong>Ubicación lista</strong><small>{ubicacionSeleccionada.latitud.toFixed(4)}, {ubicacionSeleccionada.longitud.toFixed(4)}</small></div>
            </div>
          )}
          <label className="campo-label" htmlFor="mensaje">Descripción del problema</label>
          <textarea id="mensaje" value={textoMensaje} onChange={(evento) => setTextoMensaje(evento.target.value)} placeholder="Ej: Hay un bache grande en la esquina..." rows={5} />
          <button className="boton-ubicacion" type="button" onClick={usarUbicacionDePrueba}><span>⌖</span> Usar ubicación de prueba</button>
          <button className="boton-primario" type="button" disabled={!ubicacionSeleccionada || !textoMensaje.trim() || enviando} onClick={() => void enviarAlerta()}>{enviando ? 'Enviando...' : 'Enviar Alerta'} <span>→</span></button>
        </div>
        <p className="ayuda">Al enviar, tu alerta será visible para el equipo municipal.</p>
      </section>

      <section className="panel-municipal">
        <div className="barra-controles">
          <div><p className="sobretitulo">Centro de operaciones</p><h2>Mapa de incidencias</h2></div>
          <div className="controles-derecha">
            <button className="boton-boletin" type="button" disabled={generandoBoletin} onClick={() => void solicitarBoletin()}>{generandoBoletin ? 'Generando...' : '✨ Generar Informe IA'}</button>
            <label className="control-demo"><span>Modo Demo</span><input type="checkbox" checked={esModoDemo} onChange={(evento) => setEsModoDemo(evento.target.checked)} /><i /></label>
            <label className="control-lluvia"><span>Lluvia simulada <strong>{nivelLluviaSimulada} mm</strong></span><input type="range" min="0" max="100" value={nivelLluviaSimulada} onChange={(evento) => setNivelLluviaSimulada(Number(evento.target.value))} /></label>
          </div>
        </div>
        <div className="resumen-mapa"><span><i className="punto-verde" /> {reportesVisibles.length} alertas visibles</span><span className="leyenda"><i className="punto verde" /> Leve <i className="punto amarillo" /> Moderado <i className="punto rojo" /> Grave</span></div>
        <div className="mapa-contenedor">
          <MapContainer center={CENTRO_MAPA} zoom={13} className="mapa" zoomControl={true}>
            <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            {reportesVisibles.map((reporte) => (
              <CircleMarker key={reporte.id} center={[reporte.latitud, reporte.longitud]} radius={9} pathOptions={{ color: coloresGravedad[reporte.gravedad], fillColor: coloresGravedad[reporte.gravedad], fillOpacity: 0.82, weight: 2 }} eventHandlers={{ click: () => setReporteSeleccionado(reporte) }}>
                <Popup><strong>{reporte.expedienteDoco}</strong><br />{reporte.descripcion}</Popup>
              </CircleMarker>
            ))}
          </MapContainer>
          {cargando && <div className="estado-mapa">Cargando reportes...</div>}
          {mensajeError && <div className="aviso-error">{mensajeError}</div>}
        </div>
        {reporteSeleccionado && <aside className="detalle-reporte"><button type="button" aria-label="Cerrar detalle" onClick={() => setReporteSeleccionado(null)}>×</button><span className="sobretitulo">Reporte seleccionado</span><h3>{reporteSeleccionado.expedienteDoco}</h3><p>{reporteSeleccionado.descripcion}</p><span className={`estado estado-${reporteSeleccionado.estado.toLowerCase()}`}>{reporteSeleccionado.estado.replace('_', ' ')}</span></aside>}
      </section>
      {boletinContenido && <div className="modal-fondo" role="presentation" onClick={() => setBoletinContenido(null)}><section className="modal-boletin" role="dialog" aria-modal="true" aria-labelledby="titulo-boletin" onClick={(evento) => evento.stopPropagation()}><div className="modal-encabezado"><div><span className="sobretitulo">Informe generado por IA</span><h2 id="titulo-boletin">Boletín Municipal de Incidencias</h2></div><button className="modal-cerrar-icono" type="button" aria-label="Cerrar boletín" onClick={() => setBoletinContenido(null)}>×</button></div><div className="boletin-texto">{boletinContenido}</div><div className="modal-acciones"><button className="boton-secundario" type="button" onClick={() => setBoletinContenido(null)}>Cerrar</button><button className="boton-primario boton-imprimir" type="button" onClick={imprimirBoletin}>🖨️ Imprimir Reporte</button></div></section></div>}
    </main>
  )
}

export default App
