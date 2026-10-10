import type { Ilustracion, Rol, Unidad } from "@/dominio/tipos"

/**
 * Catálogo base de la empresa demo "Ferretería Industrial Demo".
 *
 * Marcas, proveedores, clientes y personas son FICTICIOS. Se eligieron marcas
 * inventadas para no asociar marcas reales a precios inventados.
 * Precios de costo en pesos argentinos sin IVA, orientativos.
 */

export const SEMILLA_DEMO = "ferreteria-industrial-demo-v1"
/** Color de acento de la empresa demo (co-branding de ejemplo). */
export const COLOR_DEMO = "#12A594"

export type Plantilla = {
  nombre: string
  /** Variantes: reemplazan {v} en el nombre y escalan el costo. */
  variantes?: { v: string | number; costo: number }[]
  costo?: number
  unidad?: Unidad
  /** Popularidad relativa en ventas (1 = normal). */
  pop?: number
  /** Cantidad de marcas que lo fabrican (por defecto la de la categoría). */
  marcas?: number
  /** Es una máquina (se vende de a 1, se repara en el taller, va al depósito de maquinaria). */
  maquina?: boolean
  /** Rango de cantidad por venta para consumibles. */
  cantidad?: [number, number]
}

export type CategoriaDemo = {
  nombre: string
  codigo: string
  ilustracion: Ilustracion
  marcas: string[]
  marcasPorProducto: number
  proveedor: number
  plantillas: Plantilla[]
}

const V = (pares: [string | number, number][]) => pares.map(([v, costo]) => ({ v, costo }))

export const CATEGORIAS_DEMO: CategoriaDemo[] = [
  {
    nombre: "Herramientas eléctricas",
    codigo: "HE",
    ilustracion: "taladro",
    marcas: ["Torkan", "Vulkor", "Brava"],
    marcasPorProducto: 2,
    proveedor: 0,
    plantillas: [
      { nombre: "Taladro percutor {v} W 13 mm", variantes: V([[650, 52000], [750, 61000], [850, 74000], [1050, 92000]]), maquina: true, pop: 2.2 },
      { nombre: "Rotomartillo SDS Plus {v} W", variantes: V([[800, 118000], [1050, 165000], [1500, 255000]]), maquina: true, pop: 1.2 },
      { nombre: "Atornillador inalámbrico {v} V con 2 baterías", variantes: V([[12, 105000], [20, 168000]]), maquina: true, pop: 1.4 },
      { nombre: "Llave de impacto inalámbrica 20 V 1/2\"", costo: 228000, maquina: true, pop: 0.6 },
      { nombre: "Pistola de calor 2000 W", costo: 43000, maquina: true, pop: 0.8, marcas: 1 },
      { nombre: "Lijadora orbital {v} W", variantes: V([[240, 46000], [300, 55000]]), maquina: true, pop: 0.7, marcas: 1 },
      { nombre: "Cepillo eléctrico 82 mm 750 W", costo: 83000, maquina: true, pop: 0.4, marcas: 1 },
      { nombre: "Fresadora 1/2\" 1800 W", costo: 176000, maquina: true, pop: 0.3, marcas: 1 },
      { nombre: "Mezcladora de pintura 1400 W", costo: 137000, maquina: true, pop: 0.3, marcas: 1 },
    ],
  },
  {
    nombre: "Amoladoras y corte",
    codigo: "AM",
    ilustracion: "amoladora",
    marcas: ["Torkan", "Vulkor", "Brava"],
    marcasPorProducto: 2,
    proveedor: 0,
    plantillas: [
      { nombre: "Amoladora angular 115 mm {v} W", variantes: V([[710, 44000], [850, 56000], [1010, 72000]]), maquina: true, pop: 2.4, marcas: 3 },
      { nombre: "Amoladora angular 180 mm 2000 W", costo: 118000, maquina: true, pop: 0.9 },
      { nombre: "Amoladora angular 230 mm 2400 W", costo: 148000, maquina: true, pop: 0.8 },
      { nombre: "Sensitiva 355 mm 2200 W", costo: 226000, maquina: true, pop: 0.5 },
      { nombre: "Amoladora inalámbrica 20 V 115 mm", costo: 158000, maquina: true, pop: 0.5, marcas: 1 },
    ],
  },
  {
    nombre: "Soldadura",
    codigo: "SO",
    ilustracion: "soldadora",
    marcas: ["Arkon", "Vulkor"],
    marcasPorProducto: 2,
    proveedor: 1,
    plantillas: [
      { nombre: "Soldadora inverter {v} A", variantes: V([[140, 158000], [200, 236000], [250, 372000]]), maquina: true, pop: 1.3 },
      { nombre: "Soldadora MIG/MAG {v} A", variantes: V([[180, 515000], [250, 842000]]), maquina: true, pop: 0.5 },
      { nombre: "Soldadora TIG/MMA 200 A", costo: 684000, maquina: true, pop: 0.3, marcas: 1 },
      { nombre: "Careta fotosensible", costo: 37000, pop: 1.1 },
      { nombre: "Electrodos 6013 2,5 mm (por kg)", costo: 8600, unidad: "kg", pop: 3.2, marcas: 1, cantidad: [1, 5] },
      { nombre: "Electrodos 7018 3,2 mm (por kg)", costo: 11800, unidad: "kg", pop: 1.8, marcas: 1, cantidad: [1, 5] },
      { nombre: "Alambre MIG 0,8 mm x 5 kg", costo: 47000, pop: 0.9, marcas: 1 },
      { nombre: "Guantes de soldador descarne (par)", costo: 7600, pop: 1.6, marcas: 1, cantidad: [1, 4] },
    ],
  },
  {
    nombre: "Compresores y neumática",
    codigo: "CN",
    ilustracion: "compresor",
    marcas: ["Neumátika", "Aircor"],
    marcasPorProducto: 2,
    proveedor: 2,
    plantillas: [
      { nombre: "Compresor {v}", variantes: V([["25 L 2 HP", 255000], ["50 L 2,5 HP", 398000], ["100 L 3 HP", 760000], ["200 L 4 HP trifásico", 1580000]]), maquina: true, pop: 1.0 },
      { nombre: "Kit neumático 5 piezas", costo: 29000, pop: 0.9, marcas: 1 },
      { nombre: "Manguera neumática espiral 10 m", costo: 17500, pop: 1.0, marcas: 1 },
      { nombre: "Pistola de pintar alta presión", costo: 25500, pop: 0.7, marcas: 1 },
      { nombre: "Llave de impacto neumática 1/2\"", costo: 93000, maquina: true, pop: 0.5 },
      { nombre: "Acople rápido 1/4\" (par)", costo: 3900, pop: 1.8, marcas: 1, cantidad: [1, 6] },
    ],
  },
  {
    nombre: "Generadores",
    codigo: "GE",
    ilustracion: "generador",
    marcas: ["Genvolt", "Potenzia"],
    marcasPorProducto: 2,
    proveedor: 3,
    plantillas: [
      { nombre: "Generador nafta {v} kVA", variantes: V([["2,5", 640000], ["3,5", 895000], ["5,5", 1540000], ["7", 2350000]]), maquina: true, pop: 0.8 },
      { nombre: "Generador diésel {v} kVA insonorizado", variantes: V([["6", 2780000], ["10", 5450000]]), maquina: true, pop: 0.2 },
      { nombre: "Tablero de transferencia automática 40 A", costo: 276000, maquina: true, pop: 0.2, marcas: 1 },
    ],
  },
  {
    nombre: "Hidrolavadoras y limpieza",
    codigo: "HL",
    ilustracion: "hidrolavadora",
    marcas: ["Hidrapro", "Brava"],
    marcasPorProducto: 2,
    proveedor: 3,
    plantillas: [
      { nombre: "Hidrolavadora {v}", variantes: V([["110 bar 1400 W", 118000], ["135 bar 1800 W", 186000], ["160 bar 2100 W", 296000]]), maquina: true, pop: 1.0 },
      { nombre: "Hidrolavadora industrial 200 bar trifásica", costo: 1880000, maquina: true, pop: 0.15, marcas: 1 },
      { nombre: "Aspiradora industrial {v} L", variantes: V([[30, 128000], [60, 255000]]), maquina: true, pop: 0.6 },
    ],
  },
  {
    nombre: "Sierras",
    codigo: "SI",
    ilustracion: "sierra",
    marcas: ["Torkan", "Vulkor"],
    marcasPorProducto: 2,
    proveedor: 0,
    plantillas: [
      { nombre: "Sierra circular {v}", variantes: V([["185 mm 1400 W", 93000], ["235 mm 2100 W", 168000]]), maquina: true, pop: 1.0 },
      { nombre: "Sierra caladora 650 W", costo: 68000, maquina: true, pop: 0.9 },
      { nombre: "Sierra sable 1100 W", costo: 127000, maquina: true, pop: 0.4 },
      { nombre: "Ingletadora 254 mm 1800 W", costo: 336000, maquina: true, pop: 0.3 },
      { nombre: "Motosierra a explosión 52 cc", costo: 258000, maquina: true, pop: 0.5 },
      { nombre: "Hoja de sierra circular 185 mm 24 dientes", costo: 14500, pop: 1.3, marcas: 1, cantidad: [1, 3] },
    ],
  },
  {
    nombre: "Herramientas manuales",
    codigo: "HM",
    ilustracion: "llave",
    marcas: ["Ferrum", "Tenaz"],
    marcasPorProducto: 2,
    proveedor: 4,
    plantillas: [
      { nombre: "Juego de llaves combinadas {v} piezas", variantes: V([[8, 24000], [12, 41000], [22, 73000]]), pop: 1.2, marcas: 2 },
      { nombre: "Llave francesa {v}\"", variantes: V([[8, 11500], [10, 14800], [12, 19500]]), pop: 1.3 },
      { nombre: "Caja de herramientas 108 piezas", costo: 142000, pop: 0.5 },
      { nombre: "Martillo galponero 27 mm", costo: 13500, pop: 1.5, marcas: 2 },
      { nombre: "Pinza universal 8\"", costo: 10800, pop: 1.6, marcas: 2 },
      { nombre: "Juego de destornilladores 6 piezas", costo: 15800, pop: 1.4, marcas: 2 },
      { nombre: "Llave stillson {v}\"", variantes: V([[14, 17500], [18, 26500], [24, 44000]]), pop: 0.8 },
      { nombre: "Arco de sierra profesional", costo: 12600, pop: 1.0 },
      { nombre: "Tenaza armador 10\"", costo: 11800, pop: 1.0 },
      { nombre: "Nivel de aluminio {v} cm", variantes: V([[40, 8800], [60, 12900], [100, 21500]]), pop: 0.9 },
    ],
  },
  {
    nombre: "Abrasivos y discos",
    codigo: "AD",
    ilustracion: "disco",
    marcas: ["Abrasur", "Corta"],
    marcasPorProducto: 2,
    proveedor: 5,
    plantillas: [
      { nombre: "Disco de corte metal {v} x 1 mm", variantes: V([[115, 1050], [180, 2100], [230, 3100]]), pop: 4.5, cantidad: [1, 12] },
      { nombre: "Disco flap grano {v} 115 mm", variantes: V([[40, 2900], [60, 2900], [80, 2900], [120, 2900]]), pop: 1.8, marcas: 1, cantidad: [1, 10] },
      { nombre: "Disco diamantado continuo 115 mm", costo: 8700, pop: 1.2, cantidad: [1, 3] },
      { nombre: "Disco diamantado segmentado 230 mm", costo: 23500, pop: 0.6, marcas: 1 },
      { nombre: "Lija al agua grano {v} (x10)", variantes: V([[80, 3900], [120, 3900], [220, 3900]]), pop: 1.5, marcas: 1, cantidad: [1, 5] },
      { nombre: "Cepillo copa trenzado 75 mm", costo: 7800, pop: 0.9, marcas: 1 },
    ],
  },
  {
    nombre: "Bulonería y fijaciones",
    codigo: "BF",
    ilustracion: "tornillo",
    marcas: ["Fijar", "Bulonsur"],
    marcasPorProducto: 2,
    proveedor: 4,
    plantillas: [
      { nombre: "Tornillo autoperforante 14x1\" (caja x100)", costo: 5900, unidad: "caja", pop: 3.0, cantidad: [1, 6] },
      { nombre: "Tornillo T2 punta mecha 8x1/2\" (caja x100)", costo: 3400, unidad: "caja", pop: 2.6, cantidad: [1, 8] },
      { nombre: "Bulón hexagonal {v} galvanizado (caja x50)", variantes: V([["M8x50", 8800], ["M10x60", 13500], ["M12x80", 21800]]), unidad: "caja", pop: 1.4, cantidad: [1, 4] },
      { nombre: "Taco de nylon {v} mm (caja x100)", variantes: V([[6, 2400], [8, 3600], [10, 4900]]), unidad: "caja", pop: 2.0, cantidad: [1, 6] },
      { nombre: "Varilla roscada {v} x 1 m", variantes: V([["M8", 1900], ["M10", 2800], ["M12", 3900]]), pop: 1.6, cantidad: [1, 12] },
      { nombre: "Arandela plana M10 (caja x100)", costo: 2100, unidad: "caja", pop: 1.2, cantidad: [1, 4] },
      { nombre: "Juego de mechas HSS para metal 13 piezas", costo: 21500, pop: 1.0, marcas: 2 },
      { nombre: "Mecha SDS Plus {v} x 160 mm", variantes: V([[6, 3900], [8, 4500], [10, 5600], [12, 7800]]), pop: 1.5, marcas: 2, cantidad: [1, 4] },
    ],
  },
  {
    nombre: "Seguridad industrial",
    codigo: "SE",
    ilustracion: "casco",
    marcas: ["Escudo", "Protek"],
    marcasPorProducto: 2,
    proveedor: 6,
    plantillas: [
      { nombre: "Casco de seguridad con arnés", costo: 8700, pop: 1.6, cantidad: [1, 10], marcas: 2 },
      { nombre: "Guantes de nitrilo (par)", costo: 2900, pop: 3.0, cantidad: [1, 12] },
      { nombre: "Anteojos de seguridad claros", costo: 3400, pop: 2.2, cantidad: [1, 12] },
      { nombre: "Protector auditivo tipo copa", costo: 8600, pop: 1.0, cantidad: [1, 6] },
      { nombre: "Botín de seguridad puntera de acero T{v}", variantes: V([[39, 52000], [40, 52000], [41, 52000], [42, 52000], [43, 52000], [44, 52000]]), pop: 0.6 },
      { nombre: "Arnés de seguridad 3 argollas", costo: 73000, pop: 0.4 },
      { nombre: "Barbijo N95 (caja x10)", costo: 11500, unidad: "caja", pop: 1.0, cantidad: [1, 5] },
      { nombre: "Chaleco reflectivo", costo: 4800, pop: 1.2, cantidad: [1, 10] },
    ],
  },
  {
    nombre: "Bombas y agua",
    codigo: "BA",
    ilustracion: "bomba",
    marcas: ["Caudal", "Potenzia"],
    marcasPorProducto: 2,
    proveedor: 3,
    plantillas: [
      { nombre: "Bomba periférica 1/2 HP", costo: 73000, maquina: true, pop: 1.0 },
      { nombre: "Bomba centrífuga 1 HP", costo: 148000, maquina: true, pop: 0.6 },
      { nombre: "Bomba sumergible de achique 750 W", costo: 108000, maquina: true, pop: 0.7 },
      { nombre: "Motobomba nafta 2\" 6,5 HP", costo: 376000, maquina: true, pop: 0.3, marcas: 1 },
      { nombre: "Presurizadora 1/2 HP", costo: 207000, maquina: true, pop: 0.4, marcas: 1 },
      { nombre: "Manguera reforzada 1/2\" x 25 m", costo: 21500, pop: 0.9, marcas: 1 },
    ],
  },
  {
    nombre: "Medición",
    codigo: "ME",
    ilustracion: "medidor",
    marcas: ["Precisa", "Tenaz"],
    marcasPorProducto: 2,
    proveedor: 4,
    plantillas: [
      { nombre: "Cinta métrica {v} m", variantes: V([[5, 5800], [8, 9600]]), pop: 1.8, marcas: 2 },
      { nombre: "Calibre digital 150 mm", costo: 24500, pop: 0.6 },
      { nombre: "Medidor láser de distancia 40 m", costo: 64000, pop: 0.5 },
      { nombre: "Nivel láser autonivelante de líneas", costo: 176000, maquina: true, pop: 0.3 },
      { nombre: "Multímetro digital", costo: 27500, pop: 0.7 },
      { nombre: "Pinza amperométrica", costo: 54000, pop: 0.4 },
    ],
  },
  {
    nombre: "Electricidad",
    codigo: "EL",
    ilustracion: "cable",
    marcas: ["Lumen", "Conductel"],
    marcasPorProducto: 2,
    proveedor: 7,
    plantillas: [
      { nombre: "Cable unipolar {v} mm² (por metro)", variantes: V([["1,5", 560], ["2,5", 880], ["4", 1420], ["6", 2150]]), unidad: "m", pop: 2.8, cantidad: [3, 40] },
      { nombre: "Cable tipo taller 3x{v} mm² (por metro)", variantes: V([["1,5", 1950], ["2,5", 2950]]), unidad: "m", pop: 1.6, cantidad: [3, 25] },
      { nombre: "Prolongador 10 m 3 tomas", costo: 14800, pop: 1.0, marcas: 2 },
      { nombre: "Disyuntor diferencial 2x40 A", costo: 37000, pop: 0.6 },
      { nombre: "Interruptor termomagnético 2x{v} A", variantes: V([[16, 8800], [20, 9400], [32, 13600]]), pop: 1.0 },
      { nombre: "Cinta aisladora 20 m", costo: 1150, pop: 2.6, cantidad: [1, 10] },
      { nombre: "Reflector LED {v} W", variantes: V([[50, 14500], [100, 26500], [200, 44500]]), pop: 1.0, marcas: 2 },
    ],
  },
  {
    nombre: "Lubricantes",
    codigo: "LU",
    ilustracion: "lubricante",
    marcas: ["Lubrimax"],
    marcasPorProducto: 1,
    proveedor: 7,
    plantillas: [
      { nombre: "Aceite para compresor 1 L", costo: 8800, pop: 0.9, cantidad: [1, 4] },
      { nombre: "Aceite 2T para motosierra 1 L", costo: 7900, pop: 0.9, cantidad: [1, 4] },
      { nombre: "Grasa multipropósito 1 kg", costo: 10800, pop: 0.8, cantidad: [1, 3] },
      { nombre: "Lubricante multiuso en aerosol 300 ml", costo: 4800, pop: 2.0, cantidad: [1, 6] },
      { nombre: "Aceite hidráulico 4 L", costo: 27800, pop: 0.5 },
    ],
  },
  {
    nombre: "Escaleras y altura",
    codigo: "EA",
    ilustracion: "escalera",
    marcas: ["Altura", "Escalar"],
    marcasPorProducto: 1,
    proveedor: 6,
    plantillas: [
      { nombre: "Escalera tijera de aluminio {v} escalones", variantes: V([[5, 74000], [7, 98000], [9, 138000]]), pop: 0.8, marcas: 2 },
      { nombre: "Escalera extensible 2x{v} escalones", variantes: V([[10, 188000], [14, 276000]]), pop: 0.4 },
      { nombre: "Andamio tubular 1,5 m (cuerpo)", costo: 158000, pop: 0.3 },
    ],
  },
]

/** Marcas premium (+costo) y económicas (−costo). El resto, costo base. */
export const FACTOR_MARCA: Record<string, number> = {
  Torkan: 1.12,
  Brava: 0.88,
  Neumátika: 1.08,
  Genvolt: 1.06,
  Hidrapro: 1.05,
  Tenaz: 0.92,
  Corta: 0.9,
  Protek: 0.93,
  Potenzia: 0.94,
  Conductel: 0.95,
  Escalar: 0.92,
}

export const PROVEEDORES_DEMO = [
  { nombre: "Distribuidora Andina de Herramientas", dias: 3 },
  { nombre: "Soldaduras del Litoral", dias: 4 },
  { nombre: "Neumática Integral Sur", dias: 5 },
  { nombre: "Importadora Río Grande Maquinarias", dias: 10 },
  { nombre: "Mayorista Industrial Centro", dias: 2 },
  { nombre: "Abrasivos del Plata", dias: 3 },
  { nombre: "Seguridad Laboral Norte", dias: 4 },
  { nombre: "Electro Mayorista Oeste", dias: 2 },
]

export const NEGOCIOS_DEMO = [
  {
    nombre: "Ferretería Industrial Demo",
    rubro: "Ferretería industrial",
    sucursales: [
      { nombre: "Casa Central", codigo: "CC", direccion: "Av. del Trabajo 1450, Ciudad Demo", puestos: 3, ventasDia: 16 },
      { nombre: "Sucursal Norte", codigo: "NO", direccion: "Ruta Provincial 24 km 12, Ciudad Demo", puestos: 2, ventasDia: 9 },
    ],
  },
  {
    nombre: "Demo Maquinarias",
    rubro: "Distribuidora de maquinaria",
    sucursales: [{ nombre: "Salón y depósito de maquinaria", codigo: "DM", direccion: "Parque Industrial Demo, lote 18", puestos: 2, ventasDia: 3 }],
  },
]

export const USUARIOS_DEMO: { nombre: string; email: string; rol: Rol; sucursales: string[] | null }[] = [
  { nombre: "Martín Olivera", email: "dueno@demo.yunque.app", rol: "dueno", sucursales: null },
  { nombre: "Carla Benítez", email: "admin@demo.yunque.app", rol: "administracion", sucursales: null },
  { nombre: "Diego Sosa", email: "mostrador@demo.yunque.app", rol: "mostrador", sucursales: ["CC"] },
  { nombre: "Lucía Romero", email: "mostrador.norte@demo.yunque.app", rol: "mostrador", sucursales: ["NO"] },
  { nombre: "Pablo Medina", email: "maquinaria@demo.yunque.app", rol: "mostrador", sucursales: ["DM"] },
  { nombre: "Ramón Acosta", email: "deposito@demo.yunque.app", rol: "deposito", sucursales: null },
  { nombre: "Sergio Paz", email: "tecnico@demo.yunque.app", rol: "tecnico", sucursales: ["CC"] },
  { nombre: "Nahuel Ríos", email: "tecnico2@demo.yunque.app", rol: "tecnico", sucursales: ["CC"] },
  { nombre: "Valeria Luna", email: "compras@demo.yunque.app", rol: "compras", sucursales: null },
]

export const LISTAS_DEMO = [
  { nombre: "Minorista", margen: 62, esDefault: true },
  { nombre: "Gremio", margen: 46, esDefault: false },
  { nombre: "Mayorista", margen: 34, esDefault: false },
]

// Nombres para clientes ficticios
export const EMPRESAS_PREFIJO = [
  "Constructora", "Metalúrgica", "Taller", "Estructuras", "Herrería", "Montajes", "Agro", "Instalaciones",
  "Mantenimiento", "Transportes", "Carpintería", "Electromecánica", "Obras", "Servicios", "Talleres",
]
export const EMPRESAS_NOMBRE = [
  "Los Álamos", "San Cayetano", "del Oeste", "La Unión", "Ruta 5", "El Ceibo", "Del Valle", "Pampa", "Horizonte",
  "Santa Rita", "Las Tunas", "El Molino", "Sur", "Norte Grande", "La Esperanza", "Mirador", "El Trébol", "Las Heras",
  "Vientos", "Nogales", "Cerro Azul", "Laguna", "Monte Grande", "La Ribera", "Tres Arroyos",
]
export const EMPRESAS_SUFIJO = ["SRL", "SA", "SAS", "", "Hnos."]
export const NOMBRES = [
  "Juan", "Carlos", "Jorge", "Luis", "Miguel", "Roberto", "Daniel", "Gustavo", "Marcelo", "Ricardo", "Fernando", "Hernán",
  "Ana", "María", "Silvia", "Patricia", "Gabriela", "Laura", "Mónica", "Claudia", "Romina", "Natalia", "Cecilia", "Sofía",
]
export const APELLIDOS = [
  "González", "Rodríguez", "Gómez", "Fernández", "López", "Díaz", "Martínez", "Pérez", "García", "Sánchez", "Romero",
  "Torres", "Álvarez", "Ruiz", "Ramírez", "Flores", "Acosta", "Benítez", "Medina", "Herrera", "Suárez", "Aguirre",
  "Giménez", "Molina", "Castro", "Ortiz", "Silva", "Núñez", "Luna", "Juárez",
]
export const CALLES = [
  "Av. San Martín", "Belgrano", "Mitre", "Sarmiento", "Rivadavia", "Av. Libertador", "Moreno", "Alsina", "Colón",
  "Av. Industria", "Pellegrini", "Lavalle", "Urquiza", "Las Heras", "Av. de Mayo",
]
