import { Fragment, memo, useEffect, useMemo, useRef, useState } from 'react'
import { Circle, CircleMarker, MapContainer, Marker, Pane, Polyline, Popup, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import { divIcon } from 'leaflet'
import { actualizarCategoriaReporte, actualizarEstadoReporte, crearReporte, generarBoletin, iniciarSesion, obtenerBarrios, obtenerCategorias, obtenerEstadoSello, obtenerRegistroSello, obtenerReporte, obtenerReportes, reintentarSellos, validarReporte, verificarSello } from './services/api'
import type { Barrio, Boletin, Categoria, CategoriaInfo, EstadoSelloRespuesta, Reporte, RegistroSello, VerificacionSello } from './types'
import './App.css'

const CORRIENTES = { latitud: -27.4692, longitud: -58.8306 }
const CENTRO_MAPA: [number, number] = [CORRIENTES.latitud, CORRIENTES.longitud]
const CUADRILLAS = ['Cuadrilla Norte', 'Cuadrilla Centro', 'Cuadrilla Sur']
const NOMBRE_APLICACION = 'MuniAlerta 2.0'
const CATEGORIAS_FALLBACK: CategoriaInfo[] = [{ id: 'ANEGAMIENTO', nombre: 'Inundación / desborde', emoji: '🌊', color: '#3b82f6' }, { id: 'ARBOLADO', nombre: 'Árbol caído / ramas', emoji: '🌳', color: '#22c55e' }, { id: 'BASURA_CLOACAS', nombre: 'Basura / cloacas', emoji: '🗑️', color: '#a16207' }, { id: 'VIAL', nombre: 'Bache / calle dañada', emoji: '🕳️', color: '#f97316' }, { id: 'LUMINARIA', nombre: 'Luminaria rota / calle oscura', emoji: '💡', color: '#facc15' }, { id: 'SEMAFORO', nombre: 'Semáforo fuera de servicio', emoji: '🚥', color: '#14b8a6' }, { id: 'CABLE_ELECTRICO', nombre: 'Cable caído / peligro eléctrico', emoji: '⚡', color: '#a855f7' }]

type Ubicacion = { latitud: number; longitud: number }
type Burbuja = { rol: 'vecino' | 'bot'; texto: string }
type RadarFrame = { host: string; path: string; time: number }
type DatosClima = { temperatura: number | null; lluvia: number | null; viento: number | null; rafagas: number | null; direccion: string }

function InteraccionMapa({ onSeleccionar, ubicacionParaCentrar }: { onSeleccionar: (ubicacion: Ubicacion) => void; ubicacionParaCentrar: Ubicacion | null }) {
  const mapa = useMap()
  useMapEvents({ click: (evento) => onSeleccionar({ latitud: evento.latlng.lat, longitud: evento.latlng.lng }) })

  useEffect(() => {
    if (ubicacionParaCentrar) mapa.flyTo([ubicacionParaCentrar.latitud, ubicacionParaCentrar.longitud], 15, { duration: 1.2 })
  }, [mapa, ubicacionParaCentrar])

  return null
}

function distanciaKm(origen: Ubicacion, destino: Ubicacion) {
  const radioTierra = 6371
  const dLat = ((destino.latitud - origen.latitud) * Math.PI) / 180
  const dLng = ((destino.longitud - origen.longitud) * Math.PI) / 180
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((origen.latitud * Math.PI) / 180) * Math.cos((destino.latitud * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return radioTierra * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function horaSimulada(nivel: number) {
  const totalMinutos = 15 * 60 + Math.round((nivel / 100) * 5 * 60)
  return `${String(Math.floor(totalMinutos / 60) % 24).padStart(2, '0')}:${String(totalMinutos % 60).padStart(2, '0')}`
}

function direccionCardinal(grados: number) {
  return ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'][Math.round(grados / 45) % 8]
}

function horaFrame(timestamp: number) {
  return new Intl.DateTimeFormat('es-AR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Argentina/Buenos_Aires' }).format(new Date(timestamp * 1000))
}

function textoPlazo(reporte: Reporte) {
  const horas = Math.round((new Date(reporte.fechaLimite).getTime() - Date.now()) / 3_600_000)
  return horas >= 0 ? `Vence en ${horas} h` : `Vencido hace ${Math.abs(horas)} h`
}

function pesoArchivo(bytes: number) {
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function InsigniaSello({ estado, onReintentar }: { estado?: string; onReintentar?: () => void }) {
  if (estado === 'ANCLADO') return <span className="insignia-sello anclado">🛡️ Sello Hedera · Sellado ✓</span>
  if (estado === 'PENDIENTE') return <span className="insignia-sello pendiente">🛡️ Sello Hedera · Sellando…</span>
  if (estado === 'ERROR') return <span className="insignia-sello error">🛡️ Sello Hedera · Sello pendiente {onReintentar && <button className="boton" type="button" onClick={onReintentar}>Reintentar</button>}</span>
  return <span className="insignia-sello apagado">🛡️ Sello Hedera · Sin sello</span>
}

const OPCIONES_CHARCO = { color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 0.35, weight: 1 }
const OPCIONES_CALLE = { color: '#38bdf8', weight: 6, opacity: 0.7 }
const OPCIONES_UBICACION = { color: '#f8fafc', fillColor: '#59a9ff', fillOpacity: 1, weight: 3 }
const OPCIONES_RESALTADO = { color: '#ffffff', fillOpacity: 0, weight: 3, className: 'pin-resaltado' }
const OPCIONES_PIN = {
  LEVE: { normal: { color: '#22c55e', fillColor: '#22c55e', fillOpacity: 0.82, weight: 2 }, revision: { color: '#ffffff', fillColor: '#22c55e', fillOpacity: 0.82, weight: 4 } },
  MODERADO: { normal: { color: '#eab308', fillColor: '#eab308', fillOpacity: 0.82, weight: 2 }, revision: { color: '#ffffff', fillColor: '#eab308', fillOpacity: 0.82, weight: 4 } },
  GRAVE: { normal: { color: '#ef4444', fillColor: '#ef4444', fillOpacity: 0.82, weight: 2 }, revision: { color: '#ffffff', fillColor: '#ef4444', fillOpacity: 0.82, weight: 4 } },
} as const

const CapaAgua = memo(function CapaAgua({ reportes, nivelLluvia, esModoDemo }: { reportes: Reporte[]; nivelLluvia: number; esModoDemo: boolean }) {
  return <Pane name="agua" style={{ zIndex: 390 }}>{reportes.map((reporte) => {
    const radio = reporte.radioCharcoM === null ? null : esModoDemo
      ? reporte.radioCharcoM * (0.6 + 0.8 * Math.min(1, Math.max(0, (nivelLluvia - (reporte.umbralLluvia ?? 0)) / 40)))
      : reporte.radioCharcoM
    const trazado = reporte.trazado?.map(([lat, lng]) => [lat, lng] as [number, number])
    if (radio === null && !trazado) return null
    return <Fragment key={`agua-${reporte.id}`}>
      {radio !== null && <Circle key={`charco-${reporte.id}`} center={[reporte.latitud, reporte.longitud]} radius={radio} pathOptions={OPCIONES_CHARCO} />}
      {reporte.gravedad === 'GRAVE' && trazado && <Polyline key={`calle-${reporte.id}`} positions={trazado} pathOptions={OPCIONES_CALLE} />}
    </Fragment>
  })}</Pane>
})

const PinesMapa = memo(function PinesMapa({ reportes, barrioResaltado, onSeleccionar }: { reportes: Reporte[]; barrioResaltado: string | null; onSeleccionar: (reporte: Reporte) => void }) {
  return <>{reportes.map((reporte) => {
    const opciones = OPCIONES_PIN[reporte.gravedad][reporte.estado === 'EN_REVISION' ? 'revision' : 'normal']
    const categoria = CATEGORIAS_FALLBACK.find((item) => item.id === reporte.categoria) || CATEGORIAS_FALLBACK[0]
    const icono = divIcon({ className: `pin-categoria ${reporte.nivelEscalamiento > 0 ? 'pin-escalado' : ''}`, html: `<span style="background:${opciones.fillColor}">${categoria.emoji}${reporte.nivelEscalamiento > 0 ? '<b>!</b>' : ''}</span>` })
    return <Fragment key={reporte.id}>
      {barrioResaltado === reporte.barrio && <CircleMarker key={`resaltado-${reporte.id}`} center={[reporte.latitud, reporte.longitud]} radius={15} pathOptions={OPCIONES_RESALTADO} />}
      <Marker key={`pin-${reporte.id}`} position={[reporte.latitud, reporte.longitud]} icon={icono} eventHandlers={{ click: () => onSeleccionar(reporte) }}><Popup><strong>{reporte.expedienteDoco}</strong><br /><InsigniaSello estado={reporte.selloEstado} /><br />{reporte.barrio}<br />{reporte.resumenIa || reporte.descripcion}</Popup></Marker>
    </Fragment>
  })}</>
})

function App() {
  const [tema, setTema] = useState<'dark' | 'light'>(() => {
    try { return localStorage.getItem('munialerta-tema') === 'light' ? 'light' : 'dark' }
    catch { return 'dark' }
  })
  const [listaReportes, setListaReportes] = useState<Reporte[]>([])
  const [barrios, setBarrios] = useState<Barrio[]>([])
  const [reporteSeleccionado, setReporteSeleccionado] = useState<Reporte | null>(null)
  const [esModoDemo, setEsModoDemo] = useState(true)
  const [nivelLluviaSimulada, setNivelLluviaSimulada] = useState(50)
  const [desfaseHoras, setDesfaseHoras] = useState(0)
  const [categorias, setCategorias] = useState<CategoriaInfo[]>(CATEGORIAS_FALLBACK)
  const [filtroCategoria, setFiltroCategoria] = useState<Categoria | null>(null)
  const [categoriaElegida, setCategoriaElegida] = useState<Categoria | null>(null)
  const [intentoEnvioSinCategoria, setIntentoEnvioSinCategoria] = useState(false)
  const [imagenBase64, setImagenBase64] = useState('')
  const [cuentaId] = useState(() => { try { const guardada = localStorage.getItem('munialerta-cuenta'); if (guardada) return guardada; const nueva = crypto.randomUUID(); localStorage.setItem('munialerta-cuenta', nueva); return nueva } catch { return crypto.randomUUID() } })
  const [textoMensaje, setTextoMensaje] = useState('')
  const [ubicacionSeleccionada, setUbicacionSeleccionada] = useState<Ubicacion | null>(null)
  const [ubicacionParaCentrar, setUbicacionParaCentrar] = useState<Ubicacion | null>(null)
  const [barrioElegido, setBarrioElegido] = useState('')
  const [mensajeUbicacion, setMensajeUbicacion] = useState('')
  const [historialChat, setHistorialChat] = useState<Burbuja[]>([])
  const [cargando, setCargando] = useState(true)
  const [enviando, setEnviando] = useState(false)
  const [generandoBoletin, setGenerandoBoletin] = useState(false)
  const [boletinContenido, setBoletinContenido] = useState<Boletin | null>(null)
  const [mensajeError, setMensajeError] = useState('')
  const [clima, setClima] = useState<DatosClima>({ temperatura: null, lluvia: null, viento: null, rafagas: null, direccion: '--' })
  const [horaReal, setHoraReal] = useState('')
  const [radarActivo, setRadarActivo] = useState(false)
  const [radarFrames, setRadarFrames] = useState<RadarFrame[]>([])
  const [indiceRadar, setIndiceRadar] = useState(0)
  const [radarReproduciendo, setRadarReproduciendo] = useState(false)
  const [radarError, setRadarError] = useState(false)
  const [mensajeOperador, setMensajeOperador] = useState('')
  const [esOperador, setEsOperador] = useState(() => { try { return Boolean(sessionStorage.getItem('munialerta-token')) } catch { return false } })
  const [claveOperador, setClaveOperador] = useState('')
  const [modalLogin, setModalLogin] = useState(false)
  const [ingresando, setIngresando] = useState(false)
  const [mensajeLogin, setMensajeLogin] = useState('')
  const [archivoFoto, setArchivoFoto] = useState<File | null>(null)
  const [fotoError, setFotoError] = useState('')
  const [arrastrandoFoto, setArrastrandoFoto] = useState(false)
  const inputFotoRef = useRef<HTMLInputElement>(null)
  const [barrioResaltado, setBarrioResaltado] = useState<string | null>(null)
  const timerResaltado = useRef<number | null>(null)
  const barriosConsultados = useRef(false)
  const [estadoSelloPublico, setEstadoSelloPublico] = useState<EstadoSelloRespuesta | null>(null)
  const [registroSello, setRegistroSello] = useState<RegistroSello[]>([])
  const [registroDisponible, setRegistroDisponible] = useState<boolean | null>(null)
  const [registroAbierto, setRegistroAbierto] = useState(false)
  const [reporteSellandoId, setReporteSellandoId] = useState<number | null>(null)
  const [mensajeSello, setMensajeSello] = useState('')
  const [verificacion, setVerificacion] = useState<VerificacionSello | null>(null)
  const [verificandoSello, setVerificandoSello] = useState(false)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', tema === 'dark')
    document.documentElement.classList.toggle('light', tema === 'light')
    try { localStorage.setItem('munialerta-tema', tema) } catch { /* preferencia no disponible */ }
  }, [tema])

  useEffect(() => {
    if (barriosConsultados.current) return
    barriosConsultados.current = true
    void obtenerBarrios().then(setBarrios).catch(() => setMensajeError('No se pudieron cargar los barrios.'))
    void obtenerCategorias().then(setCategorias).catch(() => undefined)
  }, [])

  useEffect(() => {
    void obtenerEstadoSello().then(setEstadoSelloPublico).catch(() => setEstadoSelloPublico(null))
  }, [])

  useEffect(() => {
    if (!reporteSellandoId) return
    let intentos = 0
    let activo = true
    const revisar = async () => {
      intentos += 1
      try {
        const detalle = await obtenerReporte(reporteSellandoId)
        if (!activo) return
        setListaReportes((actuales) => actuales.map((reporte) => reporte.id === detalle.id ? { ...reporte, selloEstado: detalle.selloEstado, eventosSello: detalle.eventosSello } : reporte))
        if (detalle.selloEstado === 'ANCLADO') { setMensajeSello('Sellado ✓'); setReporteSellandoId(null) }
        else if (detalle.selloEstado === 'ERROR') { setMensajeSello('Sello pendiente'); setReporteSellandoId(null) }
        else if (intentos >= 10) { setMensajeSello('Sellado pendiente de confirmación'); setReporteSellandoId(null) }
      } catch { if (intentos >= 10) { setMensajeSello('No se pudo consultar el sello'); setReporteSellandoId(null) } }
    }
    void revisar()
    const intervalo = window.setInterval(() => void revisar(), 3_000)
    return () => { activo = false; window.clearInterval(intervalo) }
  }, [reporteSellandoId])

  useEffect(() => {
    if (!modalLogin) return
    const enfocar = window.setTimeout(() => document.getElementById('clave-operador')?.focus(), 0)
    const tecla = (evento: KeyboardEvent) => {
      if (evento.key === 'Escape') setModalLogin(false)
      if (evento.key === 'Enter' && !ingresando) void ingresarOperador()
    }
    window.addEventListener('keydown', tecla)
    return () => { window.clearTimeout(enfocar); window.removeEventListener('keydown', tecla) }
  }, [modalLogin, ingresando])

  useEffect(() => {
    let activo = true
    const cargarReportes = async () => {
      try {
        const reportes = await obtenerReportes(esModoDemo, desfaseHoras)
        if (activo) { setListaReportes(reportes); setMensajeError('') }
      } catch { if (activo) setMensajeError('No se pudo conectar con el servidor municipal.') }
      finally { if (activo) setCargando(false) }
    }
    void cargarReportes()
    if (esModoDemo) return () => { activo = false }
    const intervalo = window.setInterval(() => void cargarReportes(), 4000)
    return () => { activo = false; window.clearInterval(intervalo) }
  }, [esModoDemo, desfaseHoras])

  useEffect(() => {
    if (esModoDemo) return
    const actualizarHora = () => setHoraReal(new Intl.DateTimeFormat('es-AR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Argentina/Buenos_Aires' }).format(new Date()))
    actualizarHora()
    const intervalo = window.setInterval(actualizarHora, 30_000)
    return () => window.clearInterval(intervalo)
  }, [esModoDemo])

  useEffect(() => {
    if (esModoDemo) return
    let activo = true
    const cargarTemperatura = async () => {
      try {
        const respuesta = await fetch('https://api.open-meteo.com/v1/forecast?latitude=-27.4692&longitude=-58.8306&current=temperature_2m,precipitation,wind_speed_10m,wind_direction_10m,wind_gusts_10m&timezone=America%2FArgentina%2FBuenos_Aires')
        if (!respuesta.ok) throw new Error('No se pudo obtener el clima')
        const datos = await respuesta.json() as { current?: { temperature_2m?: number; precipitation?: number; wind_speed_10m?: number; wind_direction_10m?: number; wind_gusts_10m?: number } }
        const actual = datos.current
        if (activo) setClima({ temperatura: actual?.temperature_2m ?? null, lluvia: actual?.precipitation ?? null, viento: actual?.wind_speed_10m ?? null, rafagas: actual?.wind_gusts_10m ?? null, direccion: typeof actual?.wind_direction_10m === 'number' ? direccionCardinal(actual.wind_direction_10m) : '--' })
      } catch { if (activo) setClima({ temperatura: null, lluvia: null, viento: null, rafagas: null, direccion: '--' }) }
    }
    void cargarTemperatura()
    const intervalo = window.setInterval(() => void cargarTemperatura(), 600_000)
    return () => { activo = false; window.clearInterval(intervalo) }
  }, [esModoDemo])

  useEffect(() => {
    if (esModoDemo || !radarActivo) { setRadarFrames([]); setRadarReproduciendo(false); return }
    let activo = true
    const cargarRadar = async () => {
      try {
        const respuesta = await fetch('https://api.rainviewer.com/public/weather-maps.json')
        if (!respuesta.ok) throw new Error('Radar no disponible')
        const datos = await respuesta.json() as { host?: string; radar?: { past?: Array<{ path: string; time: number }>; nowcast?: Array<{ path: string; time: number }> } }
        const frames = [...(datos.radar?.past ?? []), ...(datos.radar?.nowcast ?? [])]
        if (!datos.host || frames.length === 0) throw new Error('Radar sin frames')
        if (activo) { setRadarFrames(frames.map((frame) => ({ ...frame, host: datos.host! }))); setIndiceRadar((indice) => Math.min(indice, frames.length - 1)); setRadarError(false) }
      } catch {
        if (activo) { setRadarFrames([]); setRadarError(true); setRadarActivo(false) }
      }
    }
    void cargarRadar()
    const intervalo = window.setInterval(() => void cargarRadar(), 300_000)
    return () => { activo = false; window.clearInterval(intervalo) }
  }, [esModoDemo, radarActivo])

  useEffect(() => {
    if (!radarReproduciendo || radarFrames.length < 2) return
    const intervalo = window.setInterval(() => setIndiceRadar((indice) => (indice + 1) % radarFrames.length), 700)
    return () => window.clearInterval(intervalo)
  }, [radarFrames.length, radarReproduciendo])

  const reportesDisponibles = useMemo(() => listaReportes.filter((reporte) => reporte.estado !== 'RESUELTO' && (!esModoDemo || reporte.categoria !== 'ANEGAMIENTO' || (reporte.umbralLluvia ?? 0) <= nivelLluviaSimulada)), [listaReportes, esModoDemo, nivelLluviaSimulada])
  const reportesVisibles = useMemo(() => reportesDisponibles.filter((reporte) => !filtroCategoria || reporte.categoria === filtroCategoria), [reportesDisponibles, filtroCategoria])
  const horaVisible = esModoDemo ? horaSimulada(nivelLluviaSimulada) : horaReal || '--:--'
  const temperaturaVisible = esModoDemo ? `${(34 - nivelLluviaSimulada * 0.12).toFixed(1)}°C` : clima.temperatura === null ? '--°C' : `${clima.temperatura.toFixed(1)}°C`
  const lluviaVisible = esModoDemo ? nivelLluviaSimulada * 0.9 : clima.lluvia
  const paranaVisible = esModoDemo ? (4.5 + nivelLluviaSimulada * 0.012).toFixed(2) : '--'
  const vientoVisible = esModoDemo ? 15 + nivelLluviaSimulada * 0.35 : clima.viento
  const rafagasVisible = esModoDemo ? (15 + nivelLluviaSimulada * 0.35) * 1.5 : clima.rafagas
  const reportesActivos = useMemo(() => reportesVisibles.filter((reporte) => reporte.estado !== 'RESUELTO'), [reportesVisibles])
  const emergenciasGraves = useMemo(() => reportesActivos.filter((reporte) => reporte.gravedad === 'GRAVE'), [reportesActivos])

  const seleccionarUbicacion = (ubicacion: Ubicacion) => {
    setMensajeUbicacion('')
    setUbicacionSeleccionada(ubicacion)
    setUbicacionParaCentrar(ubicacion)
  }

  const seleccionarUbicacionEnMapa = (ubicacion: Ubicacion) => {
    setMensajeUbicacion('')
    setBarrioElegido('')
    setUbicacionSeleccionada(ubicacion)
  }

  const elegirBarrio = (nombre: string) => {
    setBarrioElegido(nombre)
    const barrio = barrios.find((item) => item.nombre === nombre)
    if (barrio) seleccionarUbicacion({ latitud: barrio.lat, longitud: barrio.lng })
  }

  const usarUbicacionActual = () => {
    if (!navigator.geolocation) { setMensajeUbicacion('No pudimos obtener tu ubicación; tocá el mapa o elegí tu barrio'); return }
    navigator.geolocation.getCurrentPosition(
      (posicion) => {
        const ubicacion = { latitud: posicion.coords.latitude, longitud: posicion.coords.longitude }
        if (distanciaKm(CORRIENTES, ubicacion) > 20) { setMensajeUbicacion('La ubicación está a más de 20 km de Corrientes y no se puede usar.'); return }
        setBarrioElegido('')
        seleccionarUbicacion(ubicacion)
      },
      () => setMensajeUbicacion('No pudimos obtener tu ubicación; tocá el mapa o elegí tu barrio'),
      { enableHighAccuracy: true, timeout: 8000 },
    )
  }

  const enviarAlerta = async () => {
    if (!ubicacionSeleccionada || (!textoMensaje.trim() && !imagenBase64) || !categoriaElegida) { setIntentoEnvioSinCategoria(!categoriaElegida); return }
    setEnviando(true); setMensajeError('')
    try {
      const textoEnviado = textoMensaje.trim()
      const categoriaEnviada = categoriaElegida
      const respuesta = await crearReporte({ ...ubicacionSeleccionada, texto: textoEnviado || undefined, imagenBase64: imagenBase64 || undefined, categoria: categoriaEnviada, cuentaId, esDemo: esModoDemo, barrio: barrioElegido || undefined })
      const datosCategoria = categorias.find((item) => item.id === categoriaEnviada) || CATEGORIAS_FALLBACK.find((item) => item.id === categoriaEnviada)!
       setHistorialChat((historial) => [...historial, { rol: 'vecino', texto: textoEnviado || 'Foto adjunta' }, { rol: 'bot', texto: `${respuesta.mensajeRespuesta}\n\n${respuesta.reporte.resumenIa || 'Pendiente de revisión'}\n${datosCategoria.emoji} ${datosCategoria.nombre} · Gravedad ${respuesta.reporte.gravedad}\nExpediente ${respuesta.reporte.expedienteDoco} · Plazo de respuesta: ${respuesta.reporte.gravedad === 'GRAVE' ? 4 : respuesta.reporte.gravedad === 'LEVE' ? 72 : 24} h` }])
       setListaReportes(await obtenerReportes(esModoDemo, desfaseHoras))
       if (estadoSelloPublico?.activo === true) { setReporteSellandoId(respuesta.reporte.id); setMensajeSello('Sellando tu reclamo en Hedera…') } else { setMensajeSello('') }
      setUbicacionParaCentrar(ubicacionSeleccionada)
        setTextoMensaje(''); setImagenBase64(''); setCategoriaElegida(null); setIntentoEnvioSinCategoria(false); setUbicacionSeleccionada(null); setBarrioElegido('')
    } catch { setMensajeError('No se pudo enviar la alerta. Intentalo nuevamente.') }
    finally { setEnviando(false) }
  }

  const refrescarReportes = async () => {
    const reportes = await obtenerReportes(esModoDemo, desfaseHoras)
    setListaReportes(reportes)
    if (reporteSeleccionado) setReporteSeleccionado(reportes.find((reporte) => reporte.id === reporteSeleccionado.id) ?? null)
  }

  const seleccionarReporte = async (reporte: Reporte) => {
    try { setReporteSeleccionado(await obtenerReporte(reporte.id)) } catch { setReporteSeleccionado(reporte) }
  }

  const reintentarSello = async () => {
    try { await reintentarSellos(); await refrescarReportes(); setMensajeOperador('Sellos reencolados.') }
    catch (error) { if ((error as Error & { status?: number }).status === 401) cerrarSesion(); setMensajeOperador('No se pudo reintentar los sellos.') }
  }

  const verificarIntegridad = async () => {
    if (!reporteSeleccionado) return
    setVerificandoSello(true); setVerificacion(null)
    try { setVerificacion(await verificarSello(reporteSeleccionado.expedienteDoco)) }
    catch { setMensajeOperador('No se pudo verificar la integridad.') }
    finally { setVerificandoSello(false) }
  }

  const actualizarRegistroPublico = async () => {
    try {
      const [estado, registro] = await Promise.all([obtenerEstadoSello(), obtenerRegistroSello()])
      setEstadoSelloPublico(estado); setRegistroDisponible(registro.disponible); setRegistroSello(registro.mensajes)
    } catch { setRegistroDisponible(false); setRegistroSello([]) }
  }

  const corregirCategoria = async () => {
    if (!reporteSeleccionado?.categoriaSugeridaIa) return
    try {
      await actualizarCategoriaReporte(reporteSeleccionado.id, reporteSeleccionado.categoriaSugeridaIa)
      await refrescarReportes()
      setMensajeOperador('Categoría corregida según la sugerencia de IA.')
    } catch (error) { if ((error as Error & { status?: number }).status === 401) cerrarSesion(); setMensajeOperador('No se pudo corregir la categoría.') }
  }

  const asignarCuadrilla = async (cuadrilla: string) => {
    if (!reporteSeleccionado || !cuadrilla) return
    try {
      await actualizarEstadoReporte(reporteSeleccionado.id, 'EN_REVISION', cuadrilla)
      await refrescarReportes()
      setMensajeOperador(`Asignado a ${cuadrilla}`)
    } catch (error) { if ((error as Error & { status?: number }).status === 401) cerrarSesion(); setMensajeOperador('No se pudo asignar la cuadrilla.') }
  }

  const marcarResuelto = async () => {
    if (!reporteSeleccionado) return
    try {
      await actualizarEstadoReporte(reporteSeleccionado.id, 'RESUELTO')
      await refrescarReportes()
      setReporteSeleccionado(null)
      setMensajeOperador('Reporte marcado como resuelto.')
    } catch (error) { if ((error as Error & { status?: number }).status === 401) cerrarSesion(); setMensajeOperador('No se pudo marcar el reporte como resuelto.') }
  }

  const notificarZona = () => {
    if (reporteSeleccionado) setMensajeOperador(`Alerta enviada a vecinos de ${reporteSeleccionado.barrio || 'la zona'}`)
  }

  const solicitarBoletin = async () => {
    if (!esOperador) { setModalLogin(true); return }
    setGenerandoBoletin(true)
    try { setBoletinContenido(await generarBoletin(esModoDemo, nivelLluviaSimulada)) }
    catch (error) { if ((error as Error & { status?: number }).status === 401) cerrarSesion(); setMensajeError('No se pudo generar el boletín.') }
    finally { setGenerandoBoletin(false) }
  }

  const cerrarSesion = () => { try { sessionStorage.removeItem('munialerta-token') } catch { /* sesión no disponible */ } setEsOperador(false); setModalLogin(false) }
  const ingresarOperador = async () => {
    setIngresando(true); setMensajeLogin('')
    try { const respuesta = await iniciarSesion(claveOperador.trim()); try { sessionStorage.setItem('munialerta-token', respuesta.token) } catch { /* sesión no disponible */ } setEsOperador(true); setClaveOperador(''); setModalLogin(false) }
    catch (error) { const estado = (error as Error & { status?: number }).status; setMensajeLogin(estado === 401 ? 'Clave incorrecta' : estado === 503 ? 'El acceso de operador no está configurado en el servidor' : estado === 429 ? error instanceof Error ? error.message : 'Demasiados intentos, esperá un minuto' : 'No se pudo conectar con el servidor') }
    finally { setIngresando(false) }
  }
  const seleccionarFoto = (archivo: File | undefined) => {
    if (!archivo) return
    setFotoError('')
    if (!archivo.type.startsWith('image/')) { setFotoError('El archivo debe ser una imagen'); return }
    const lector = new FileReader()
    lector.onerror = () => setFotoError('No se pudo leer la imagen')
    lector.onload = () => {
      const imagen = new Image()
      imagen.onerror = () => setFotoError('No se pudo abrir la imagen')
      imagen.onload = () => {
        try { const escala = Math.min(1, 800 / Math.max(imagen.width, imagen.height)); const canvas = document.createElement('canvas'); canvas.width = Math.max(1, Math.round(imagen.width * escala)); canvas.height = Math.max(1, Math.round(imagen.height * escala)); const contexto = canvas.getContext('2d'); if (!contexto) throw new Error('canvas'); contexto.drawImage(imagen, 0, 0, canvas.width, canvas.height); const reducida = canvas.toDataURL('image/jpeg', 0.7); if (!reducida) throw new Error('imagen'); setArchivoFoto(archivo); setImagenBase64(reducida) } catch { setFotoError('No se pudo reducir la imagen; podés conservar tu texto y probar otra foto') }
      }
      imagen.src = String(lector.result)
    }
    lector.readAsDataURL(archivo)
  }
  const quitarFoto = () => { setArchivoFoto(null); setImagenBase64(''); setFotoError(''); if (inputFotoRef.current) inputFotoRef.current.value = '' }
  const cerrarLogin = () => { if (!ingresando) { setModalLogin(false); setMensajeLogin(''); setClaveOperador('') } }

  const abrirBarrioDesdeBoletin = (nombre: string) => {
    const barrio = barrios.find((item) => item.nombre === nombre)
    if (!barrio) return
    setBoletinContenido(null)
    setUbicacionParaCentrar({ latitud: barrio.lat, longitud: barrio.lng })
    setBarrioResaltado(nombre)
    if (timerResaltado.current) window.clearTimeout(timerResaltado.current)
    timerResaltado.current = window.setTimeout(() => setBarrioResaltado(null), 6000)
    if (esModoDemo) {
      const delBarrio = listaReportes.filter((reporte) => reporte.barrio === nombre && reporte.estado !== 'RESUELTO')
      const visibles = delBarrio.filter((reporte) => (reporte.umbralLluvia ?? 0) <= nivelLluviaSimulada)
      if (delBarrio.length > visibles.length) setMensajeOperador('Subí la lluvia simulada para ver todos los reportes de este barrio')
    }
  }

  const textoPlanoBoletin = (boletin: Boletin) => boletin.grupos.flatMap((grupo) => [
    `${grupo.gravedad === 'GRAVE' ? 'GRAVES' : `${grupo.gravedad}S`} (${grupo.total})`,
    ...grupo.barrios.map((barrio) => `• ${barrio.nombre}: ${barrio.reportes} ${barrio.reportes === 1 ? 'reporte' : 'reportes'}${barrio.sinPaso > 0 ? `, ${barrio.sinPaso} sin paso` : ''}`),
  ]).concat(`Acción sugerida: ${boletin.accionSugerida}`).join('\n')

  const imprimirBoletin = () => {
    if (!boletinContenido) return
    const ventana = window.open('', '_blank', 'width=800,height=700')
    if (!ventana) return
    const seguro = textoPlanoBoletin(boletinContenido).replace(/[&<>"']/g, (caracter) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[caracter] ?? caracter)
    ventana.document.write(`<!doctype html><html><head><title>Informe de situación</title><style>body{font-family:Arial,sans-serif;color:#17212b;max-width:720px;margin:48px auto;line-height:1.6}h1{font-size:22px;border-bottom:2px solid #22c55e;padding-bottom:12px}main{white-space:pre-wrap;font-size:16px}</style></head><body><h1>Informe de situación</h1><main>${seguro}</main></body></html>`)
    ventana.document.close(); ventana.focus(); ventana.print()
  }

  // HashScan usa el formato cuenta-segundos-nanos; por eso el enlace reemplaza "@" por "-".

  return <main className={`aplicacion tema-${tema}`}>
    <header className="encabezado-mobile"><div className="marca"><span className="marca-punto" /> {NOMBRE_APLICACION}</div><span className="etiqueta-en-vivo"><span /> Monitoreo activo</span></header>
    <section className="panel-ciudadano">
       <div className="marca marca-escritorio"><span className="marca-punto" /> {NOMBRE_APLICACION}</div>
      <div className="titulo-panel"><span className="icono-circulo">!</span><div><p className="sobretitulo">Canal ciudadano</p><h1>Reportá un problema</h1></div></div>
      <p className="introduccion">Tu aviso ayuda a la Municipalidad a cuidar las calles de Corrientes.</p>
      <div className="chat">
        <div className="mensaje-bot"><span className="avatar">MA</span><p>Hola. ¿Qué está pasando en tu barrio?</p></div>
         {historialChat.map((burbuja, indice) => <div className={`burbuja-chat burbuja-${burbuja.rol}`} key={`${burbuja.rol}-${indice}`}>{burbuja.rol === 'bot' && <span className="avatar">MA</span>}<p>{burbuja.texto}</p></div>)}
         {mensajeSello && <div className="burbuja-chat burbuja-bot"><span className="avatar">MA</span><p>{mensajeSello}{mensajeSello.startsWith('Sellado') && <a href="https://hashscan.io/testnet" target="_blank" rel="noopener noreferrer"> Ver comprobante</a>}</p></div>}
        {ubicacionSeleccionada && <div className="ubicacion-confirmada"><span>●</span><div><strong>Ubicación lista</strong><small>{ubicacionSeleccionada.latitud.toFixed(4)}, {ubicacionSeleccionada.longitud.toFixed(4)}</small></div></div>}
          <div className="campo-grupo"><label className="campo-label" htmlFor="mensaje">Descripción del problema</label>
          <textarea id="mensaje" value={textoMensaje} onChange={(evento) => setTextoMensaje(evento.target.value)} placeholder="Ej: Hay un bache grande en la esquina..." rows={5} /></div>
          <div className="campo-grupo"><label className="campo-label" htmlFor="categoria-elegida">Tipo de problema</label><div className="selector-categoria"><select id="categoria-elegida" className={`selector-categoria-select ${intentoEnvioSinCategoria ? 'selector-categoria-error' : ''}`} value={categoriaElegida ?? ''} aria-invalid={intentoEnvioSinCategoria} aria-describedby={intentoEnvioSinCategoria ? 'error-categoria' : undefined} onChange={(evento) => { setCategoriaElegida((evento.target.value || null) as Categoria | null); setIntentoEnvioSinCategoria(false) }}><option value="" disabled>Elegí el tipo de problema</option>{categorias.map((categoria) => <option key={categoria.id} value={categoria.id}>{categoria.emoji} {categoria.nombre}</option>)}</select><span className="selector-categoria-flecha" aria-hidden="true" /></div>{intentoEnvioSinCategoria && <p className="error-ubicacion" id="error-categoria">Elegí el tipo de problema para enviar.</p>}</div>
          <p className="aviso-911">Si hay riesgo inmediato para personas, llamá al 911. Esta app no reemplaza una emergencia.</p>
          <div className={`bloque-foto ${arrastrandoFoto ? 'arrastrando-foto' : ''}`} onDragOver={(evento) => { evento.preventDefault(); setArrastrandoFoto(true) }} onDragLeave={() => setArrastrandoFoto(false)} onDrop={(evento) => { evento.preventDefault(); setArrastrandoFoto(false); seleccionarFoto(evento.dataTransfer.files[0]) }}><span className="titulo-seccion">Foto del problema (opcional)</span><input ref={inputFotoRef} className="visualmente-oculto" id="foto" type="file" accept="image/*" onChange={(evento) => seleccionarFoto(evento.target.files?.[0])} /><button className="boton boton-foto" type="button" onClick={() => inputFotoRef.current?.click()}>📷 Subir foto del problema</button>{archivoFoto && <div className="foto-seleccionada"><img src={imagenBase64} alt="Vista previa del problema" /><div><strong>{archivoFoto.name.length > 28 ? `${archivoFoto.name.slice(0, 25)}...` : archivoFoto.name}</strong><small>{pesoArchivo(archivoFoto.size)}</small></div><button className="boton" type="button" onClick={quitarFoto}>Quitar</button></div>}{fotoError && <p className="error-ubicacion">{fotoError}</p>}</div>
          <label className="campo-label" htmlFor="barrio">Elegí tu barrio</label>
         <select id="barrio" className="selector-ubicacion" value={barrioElegido} onChange={(evento) => elegirBarrio(evento.target.value)}><option value="">Elegí tu barrio...</option>{barrios.map((barrio) => <option key={barrio.nombre} value={barrio.nombre}>{barrio.nombre}</option>)}</select>
         <button className="boton boton-ubicacion" type="button" onClick={usarUbicacionActual}>⌖ Usar mi ubicación actual</button>
        <p className="ayuda-ubicacion">También podés hacer clic directamente en el mapa para marcar el punto.</p>{mensajeUbicacion && <p className="error-ubicacion">{mensajeUbicacion}</p>}
          <button className="boton boton--primario boton-primario" type="button" disabled={!ubicacionSeleccionada || (!textoMensaje.trim() && !imagenBase64) || !categoriaElegida || enviando} onClick={() => void enviarAlerta()}>{enviando ? 'Enviando...' : 'Enviar Alerta'} <span>→</span></button>{!categoriaElegida && <small>Elegí el tipo de problema para enviar.</small>}
      </div>
      <p className="ayuda">Al enviar, tu alerta será visible para el equipo municipal.</p>
    </section>
    <section className="panel-municipal">
       <div className="barra-controles"><div><p className="sobretitulo">Centro de operaciones</p><h2>Mapa de incidencias</h2></div><div className="controles-derecha"><button className="boton tema-toggle" type="button" aria-label={tema === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'} aria-pressed={tema === 'light'} onClick={() => setTema((actual) => actual === 'dark' ? 'light' : 'dark')}><span aria-hidden="true">{tema === 'dark' ? '☀️' : '🌙'}</span><span>{tema === 'dark' ? 'Modo claro' : 'Modo oscuro'}</span></button>{esOperador ? <button className="boton" type="button" onClick={cerrarSesion}>Salir</button> : <button className="boton" type="button" onClick={() => setModalLogin(true)}>Ingreso operador</button>}{esOperador && <button className="boton boton--primario boton-boletin" type="button" disabled={generandoBoletin} onClick={() => void solicitarBoletin()}>{generandoBoletin ? 'Generando...' : 'Generar informe'}</button>}<label className="control-demo"><span>Modo Demo</span><input type="checkbox" checked={esModoDemo} onChange={(evento) => setEsModoDemo(evento.target.checked)} /><i /></label><label className="control-lluvia"><span>Lluvia simulada <strong>{nivelLluviaSimulada} mm</strong></span><input type="range" min="0" max="100" value={nivelLluviaSimulada} onChange={(evento) => setNivelLluviaSimulada(Number(evento.target.value))} /></label></div></div>
        <div className="franja-informacion"><div className="clima-pildora"><span className="clima-segmento"><small>Hora</small><strong>{horaVisible}</strong></span><span className="clima-segmento"><small>Temperatura</small><strong>{temperaturaVisible}</strong></span><span className="clima-segmento"><small>Viento</small><strong>{vientoVisible === null ? '--' : `${vientoVisible.toFixed(0)} km/h`} · ráfagas {rafagasVisible === null ? '--' : `${rafagasVisible.toFixed(0)} km/h`} · {esModoDemo ? 'Sur' : clima.direccion}</strong></span><span className="clima-segmento"><small>Lluvia</small><strong>{lluviaVisible === null ? '--' : `${lluviaVisible.toFixed(1)} mm`}</strong></span></div>{esModoDemo && <><span className="etiqueta-escenario">Escenario simulado · +{desfaseHoras} h</span><button className="boton" type="button" onClick={() => setDesfaseHoras((valor) => Math.min(168, valor + 24))}>Simular +24 h</button><button className={`boton ${desfaseHoras === 0 ? 'boton--activo' : ''}`} type="button" onClick={() => setDesfaseHoras(0)}>Volver a ahora</button></>}{esModoDemo ? <span className="radar-inactivo">Disponible en modo real</span> : <label className="control-radar"><span>Radar</span><input type="checkbox" checked={radarActivo} onChange={(evento) => { setRadarError(false); setRadarActivo(evento.target.checked) }} /><i /></label>}{radarError && <small>Radar no disponible</small>}</div>
       {radarActivo && !esModoDemo && radarFrames.length > 0 && <div className="controles-radar"><button className="boton" type="button" onClick={() => setRadarReproduciendo((reproduciendo) => !reproduciendo)}>{radarReproduciendo ? 'Pausar' : 'Reproducir'}</button><span>{horaFrame(radarFrames[indiceRadar].time)}</span><input type="range" min="0" max={radarFrames.length - 1} value={indiceRadar} onChange={(evento) => { setRadarReproduciendo(false); setIndiceRadar(Number(evento.target.value)) }} /></div>}
       {esOperador && <div className="tarjetas-metricas"><div><strong>{reportesActivos.length}</strong><span>Reportes activos</span></div><div><strong className={emergenciasGraves.length > 0 ? 'numero-grave' : ''}>{emergenciasGraves.length}</strong><span>Emergencias graves</span></div><div><strong>{lluviaVisible === null ? '--' : lluviaVisible.toFixed(1)}</strong><span>Lluvia última hora (mm)</span></div><div><strong>{paranaVisible}</strong><span>Altura del Paraná (m) {!esModoDemo && <small>sin datos</small>}</span></div></div>}
         <div className="filtros-categoria"><strong>Filtrar por tipo:</strong><button type="button" className={`filtro-chip ${!filtroCategoria ? 'filtro-activo filtro-todas' : ''}`} aria-pressed={!filtroCategoria} onClick={() => setFiltroCategoria(null)}>Todas ({reportesDisponibles.length})</button>{categorias.map((categoria) => <button type="button" className={`filtro-chip ${filtroCategoria === categoria.id ? 'filtro-activo' : ''}`} data-categoria={categoria.id} aria-pressed={filtroCategoria === categoria.id} key={categoria.id} onClick={() => setFiltroCategoria(categoria.id)}>{categoria.emoji} {categoria.nombre} ({reportesDisponibles.filter((reporte) => reporte.categoria === categoria.id).length})</button>)}</div>{filtroCategoria && <p className="filtro-seleccionado">Mostrando solo: {categorias.find((categoria) => categoria.id === filtroCategoria)?.nombre} · <button className="boton" type="button" onClick={() => setFiltroCategoria(null)}>Quitar filtro</button></p>}
       <div className="resumen-mapa"><span><i className="punto-verde" /> {reportesVisibles.length} alertas visibles</span><span className="leyenda"><i className="punto verde" /> Leve <i className="punto amarillo" /> Moderado <i className="punto rojo" /> Grave <i className="leyenda-linea charco" /> Charco <i className="leyenda-linea calle" /> Calle inundada</span></div>{radarActivo && !esModoDemo && <div className="leyenda-radar">Débil <i /> Intensa</div>}
      <div className="mapa-contenedor">
        <MapContainer center={CENTRO_MAPA} zoom={13} className="mapa" zoomControl>
          <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <InteraccionMapa onSeleccionar={seleccionarUbicacionEnMapa} ubicacionParaCentrar={ubicacionParaCentrar} />
          {radarActivo && !esModoDemo && radarFrames[indiceRadar] && <TileLayer url={`${radarFrames[indiceRadar].host}${radarFrames[indiceRadar].path}/256/{z}/{x}/{y}/2/1_1.png`} opacity={0.6} maxNativeZoom={7} attribution="RainViewer" eventHandlers={{ tileerror: () => { setRadarActivo(false); setRadarError(true) } }} />}
          <CapaAgua reportes={reportesVisibles} nivelLluvia={nivelLluviaSimulada} esModoDemo={esModoDemo} />
          {ubicacionSeleccionada && <CircleMarker center={[ubicacionSeleccionada.latitud, ubicacionSeleccionada.longitud]} radius={11} pathOptions={OPCIONES_UBICACION} />}
       <PinesMapa reportes={reportesVisibles} barrioResaltado={barrioResaltado} onSeleccionar={(reporte) => void seleccionarReporte(reporte)} />
        </MapContainer>
       {cargando && <div className="estado-mapa">Cargando reportes...</div>}{mensajeError && <div className="aviso-error">{mensajeError}</div>}
       </div>
       <section className="registro-publico"><button className="boton registro-toggle" type="button" onClick={() => { setRegistroAbierto((abierto) => !abierto); if (!registroAbierto) void actualizarRegistroPublico() }}>🛡️ Registro público en Hedera <span>{registroAbierto ? '▲' : '▼'}</span></button>{registroAbierto && <div className="registro-contenido">{!estadoSelloPublico?.activo ? <p>Sellado no configurado</p> : <><p><strong>{estadoSelloPublico.anclados} eventos sellados</strong> · <a href={`https://hashscan.io/testnet/topic/${estadoSelloPublico.topicId}`} target="_blank" rel="noopener noreferrer">Ver Topic</a></p><button className="boton" type="button" onClick={() => void actualizarRegistroPublico()}>Actualizar</button>{registroDisponible === false && <p>Registro de red no disponible.</p>}<div>{registroSello.map((mensaje) => <div className="registro-item" key={`${mensaje.secuencia}-${mensaje.hash}`}><strong>{mensaje.exp}</strong> · {mensaje.tipo} · {mensaje.tiempoConsenso ? new Date(mensaje.tiempoConsenso).toLocaleString('es-AR') : 'hora pendiente'} · {mensaje.hash}{!mensaje.enBase && <em>No figura en la base municipal</em>}</div>)}</div></>}</div>}</section>
       {mensajeOperador && <div className="aviso-operador">{mensajeOperador}<button type="button" onClick={() => setMensajeOperador('')}>×</button></div>}
       {esOperador && <aside className="detalle-reporte"><strong>Reclamos escalados</strong>{reportesVisibles.filter((reporte) => reporte.nivelEscalamiento > 0).sort((a, b) => b.nivelEscalamiento - a.nivelEscalamiento).slice(0, 8).map((reporte) => <button type="button" key={reporte.id} onClick={() => { setReporteSeleccionado(reporte); setUbicacionParaCentrar(reporte) }}>{reporte.expedienteDoco} · {reporte.textoEscalamiento}</button>)}</aside>}
         {reporteSeleccionado && <aside className="detalle-reporte"><button className="boton detalle-cerrar" type="button" aria-label="Cerrar detalle" onClick={() => setReporteSeleccionado(null)}>×</button><span className="sobretitulo">Reporte seleccionado</span><h3>{reporteSeleccionado.expedienteDoco}</h3><InsigniaSello estado={reporteSeleccionado.selloEstado} onReintentar={esOperador && reporteSeleccionado.selloEstado === 'ERROR' ? reintentarSello : undefined} /><p>{categorias.find((categoria) => categoria.id === reporteSeleccionado.categoria)?.emoji} {categorias.find((categoria) => categoria.id === reporteSeleccionado.categoria)?.nombre} · {reporteSeleccionado.resumenIa || reporteSeleccionado.descripcion}</p><p>{textoPlazo(reporteSeleccionado)} · {reporteSeleccionado.textoEscalamiento} · {reporteSeleccionado.confirmaciones} vecinos reportaron esto</p><button className="boton boton-verificar" type="button" disabled={verificandoSello} onClick={() => void verificarIntegridad()}>{verificandoSello ? 'Verificando...' : 'Verificar integridad'}</button>{verificacion && <div className="resultado-verificacion">{verificacion.eventos.map((evento, indice) => <p key={`${evento.hash}-${indice}`}>{evento.coincideBase ? '✔' : '✖'} Coincide con la base{evento.coincideRed === true ? ` · ✔ Coincide con la red Hedera (secuencia ${evento.secuencia} · ${evento.tiempoConsenso || 'fecha pendiente'})` : evento.coincideRed === null ? ' · Red no disponible, reintentá en unos segundos' : ' · ✖ Alterado'}</p>)}</div>}<div className="timeline-sello">{(reporteSeleccionado.eventosSello || []).map((evento) => <div key={evento.id}><strong>{evento.tipo === 'CREACION' ? 'Creación' : evento.tipo === 'VALIDACION' ? 'Validación' : 'Cambio de estado'}</strong><small>{new Date(evento.creadoEn).toLocaleString('es-AR')} · {evento.hash.slice(0, 10)}…</small>{evento.hederaTransactionId && <a href={`https://hashscan.io/testnet/transaction/${evento.hederaTransactionId.replace('@', '-')}`} target="_blank" rel="noopener noreferrer">Ver en HashScan</a>}</div>)}</div>{esOperador && <div className="acciones-operador">{reporteSeleccionado.categoriaSugeridaIa && <p className="sugerencia-ia">Sugerencia de la IA: {categorias.find((categoria) => categoria.id === reporteSeleccionado.categoriaSugeridaIa)?.emoji} {categorias.find((categoria) => categoria.id === reporteSeleccionado.categoriaSugeridaIa)?.nombre}<button className="boton" type="button" onClick={() => void corregirCategoria()}>Corregir categoría</button></p>}<select value="" onChange={(evento) => void asignarCuadrilla(evento.target.value)}><option value="">Asignar cuadrilla</option>{CUADRILLAS.map((cuadrilla) => <option key={cuadrilla} value={cuadrilla}>{cuadrilla}</option>)}</select><button className="boton" type="button" onClick={notificarZona}>Notificar zona</button><button className="boton" type="button" onClick={() => void marcarResuelto()}>Marcar resuelto</button><button className="boton" type="button" onClick={() => void validarReporte(reporteSeleccionado.id)}>Validar reclamo</button></div>}</aside>}
    </section>
      {boletinContenido && <div className="modal-fondo" role="presentation" onClick={() => setBoletinContenido(null)}><section className="modal-boletin" role="dialog" aria-modal="true" aria-labelledby="titulo-boletin" onClick={(evento) => evento.stopPropagation()}><div className="modal-encabezado"><div><span className="sobretitulo">Informe de situación</span><h2 id="titulo-boletin">Boletín Municipal de Incidencias</h2></div><button className="boton modal-cerrar-icono" type="button" aria-label="Cerrar informe" onClick={() => setBoletinContenido(null)}>×</button></div><div className="boletin-estructurado"><h3>ESCALADOS ({boletinContenido.escalados})</h3><p>{boletinContenido.localidadesEscaladas.join(', ') || 'Sin localidades escaladas'}</p><p><strong>Por categoría:</strong> {boletinContenido.categorias.join(' · ')}</p>{boletinContenido.grupos.map((grupo) => <section className="grupo-boletin" key={grupo.gravedad}><h3><i className={`punto-grupo ${grupo.gravedad.toLowerCase()}`} />{grupo.gravedad === 'GRAVE' ? 'GRAVES' : `${grupo.gravedad}S`} ({grupo.total})</h3>{grupo.barrios.map((barrio) => <button className="barrio-boletin" type="button" key={barrio.nombre} onClick={() => abrirBarrioDesdeBoletin(barrio.nombre)}>{barrio.nombre}: {barrio.reportes} {barrio.reportes === 1 ? 'reporte' : 'reportes'}{barrio.sinPaso > 0 && <span> · ⚠️ {barrio.sinPaso} sin paso</span>}</button>)}</section>)}{boletinContenido.grupos.length === 0 && <p className="boletin-vacio">Sin incidentes activos.</p>}<p className="accion-boletin"><strong>Acción sugerida:</strong> {boletinContenido.accionSugerida}</p></div><div className="modal-acciones"><button className="boton-secundario" type="button" onClick={() => setBoletinContenido(null)}>Cerrar</button><button className="boton boton--primario boton-primario boton-imprimir" type="button" onClick={imprimirBoletin}>🖨️ Imprimir Reporte</button></div></section></div>}
      {modalLogin && <div className="modal-fondo" role="presentation" onClick={cerrarLogin}><section className="modal-boletin modal-login" role="dialog" aria-modal="true" aria-labelledby="titulo-login" onClick={(evento) => evento.stopPropagation()}><h2 id="titulo-login">Ingreso operador</h2><input id="clave-operador" type="password" value={claveOperador} onChange={(evento) => setClaveOperador(evento.target.value)} placeholder="Clave" autoComplete="current-password" />{mensajeLogin && <p className="error-ubicacion">{mensajeLogin}</p>}<div className="modal-acciones"><button className="boton-secundario" type="button" onClick={cerrarLogin}>Cancelar</button><button className="boton boton--primario boton-primario" type="button" disabled={ingresando} onClick={() => void ingresarOperador()}>{ingresando ? 'Ingresando…' : 'Ingresar'}</button></div></section></div>}
  </main>
}

export default App
