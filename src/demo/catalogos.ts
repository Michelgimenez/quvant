/**
 * Catálogos de las empresas generadas de la demo: nombres genéricos, sin marcas registradas ni fotos.
 * Cada plantilla es [nombre, precio base en pesos, unidad] y se expande con variantes (tamaños, sabores,
 * presentaciones). Las ubicaciones son centros de ciudades argentinas reales, nunca comercios reales.
 */

export type Plantilla = readonly [nombre: string, precio: number, unidad?: string]
export type Categoria = { nombre: string; plantillas: readonly Plantilla[]; variantes: readonly (readonly [sufijo: string, factor: number])[] }

// ───────────────────────── Kiosco (≈ 350) ─────────────────────────

export const CATEGORIAS_KIOSCO: readonly Categoria[] = [
  {
    nombre: "Golosinas",
    plantillas: [
      ["Alfajor de chocolate triple", 1800], ["Alfajor de maicena", 1200], ["Alfajor de fruta", 1300], ["Alfajor de dulce de leche", 1500],
      ["Chocolate con leche", 1500], ["Chocolate amargo", 2100], ["Caramelos masticables", 900], ["Chicle de menta", 800],
      ["Chupetín frutal", 400], ["Turrón de maní", 700], ["Barra de cereal", 1100], ["Pastillas de menta", 900],
      ["Bombón relleno", 600], ["Gomitas frutales", 1200], ["Oblea rellena", 1000], ["Confites de chocolate", 1400],
    ],
    variantes: [["", 1], [" (caja x 12)", 10.5], [" (sin azúcar)", 1.15]],
  },
  {
    nombre: "Bebidas",
    plantillas: [
      ["Gaseosa cola", 1700], ["Gaseosa lima limón", 1600], ["Gaseosa de naranja", 1600], ["Agua mineral", 900],
      ["Agua saborizada", 1300], ["Bebida isotónica", 1900], ["Energizante", 2600, "lata"], ["Cerveza rubia", 2200],
      ["Jugo de naranja", 2100], ["Soda", 1100], ["Té frío", 1500], ["Agua con gas", 1000],
    ],
    variantes: [[" 500 ml", 1], [" 1,5 L", 1.9], [" 2,25 L", 2.5], [" sin azúcar 500 ml", 1.05], [" sin azúcar 1,5 L", 2]],
  },
  {
    nombre: "Galletitas",
    plantillas: [
      ["Galletitas de agua", 1300], ["Galletitas dulces de vainilla", 1400], ["Galletitas con chips", 1900], ["Galletitas rellenas de chocolate", 1600],
      ["Bizcochos de grasa", 1500], ["Tostadas de arroz", 1700], ["Galletitas integrales", 1600], ["Vainillas", 1500],
    ],
    variantes: [["", 1], [" (pack x 3)", 2.7], [" sin TACC", 1.4]],
  },
  {
    nombre: "Snacks",
    plantillas: [["Papas fritas", 1500], ["Palitos salados", 1200], ["Maní salado", 1100], ["Chizitos", 1200], ["Nachos con queso", 1800], ["Mix de frutos secos", 2400]],
    variantes: [[" 40 g", 1], [" 120 g", 2.4], [" 250 g", 4.2]],
  },
  {
    nombre: "Lácteos y frescos",
    plantillas: [
      ["Leche entera 1 L", 1400], ["Leche descremada 1 L", 1450], ["Yogur bebible 1 L", 2600], ["Yogur firme", 1100],
      ["Queso cremoso (horma chica)", 7900], ["Manteca 200 g", 2600], ["Dulce de leche 400 g", 2900], ["Huevos (media docena)", 2400],
      ["Crema de leche 200 ml", 2100], ["Postre de vainilla", 1300], ["Queso rallado 40 g", 1500],
    ],
    variantes: [["", 1]],
  },
  {
    nombre: "Almacén",
    plantillas: [
      ["Yerba mate", 3600], ["Azúcar", 1500], ["Café molido", 4200], ["Té en saquitos (25)", 1600], ["Fideos secos", 1500],
      ["Arroz", 1700], ["Harina de trigo", 1100], ["Aceite de girasol 900 ml", 2900], ["Puré de tomate 520 g", 1200],
      ["Pan lactal", 2700], ["Mermelada 450 g", 2500], ["Sal fina", 900], ["Polenta instantánea", 1300], ["Lentejas secas", 1800],
      ["Atún al natural", 2600], ["Arvejas en lata", 1100],
    ],
    variantes: [[" (común)", 1], [" (premium)", 1.35], [" (económico)", 0.85]],
  },
  {
    nombre: "Limpieza",
    plantillas: [
      ["Lavandina 1 L", 1200], ["Detergente 500 ml", 1500], ["Esponja de cocina", 700], ["Rollo de cocina", 1900],
      ["Papel higiénico (4 rollos)", 2800], ["Trapo de piso", 1600], ["Desodorante de ambiente", 2200], ["Bolsas de residuos (10)", 1300],
      ["Limpiador multiuso", 1800], ["Jabón en polvo 800 g", 3900],
    ],
    variantes: [["", 1], [" (pack ahorro)", 2.6], [" (repuesto)", 0.8]],
  },
  {
    nombre: "Higiene",
    plantillas: [
      ["Jabón de tocador", 900], ["Shampoo 400 ml", 3600], ["Acondicionador 400 ml", 3700], ["Pasta dental 90 g", 2100],
      ["Desodorante en aerosol", 3100], ["Toallitas femeninas", 2300], ["Pañuelos descartables", 700], ["Afeitadora descartable", 900],
      ["Cepillo de dientes", 1500], ["Alcohol en gel 250 ml", 1900],
    ],
    variantes: [["", 1], [" (tamaño viaje)", 0.6]],
  },
  {
    nombre: "Fiambrería",
    plantillas: [["Jamón cocido", 2900], ["Queso de máquina", 2400], ["Salame", 3300], ["Mortadela", 1700], ["Paleta cocida", 2200], ["Queso de rallar", 3800]],
    variantes: [[" 100 g", 1], [" 250 g", 2.4]],
  },
  {
    nombre: "Helados",
    plantillas: [["Palito helado de agua", 900], ["Palito bombón", 1600], ["Cucurucho", 1900], ["Pote de helado 1/4 kg", 4900], ["Pote de helado 1 kg", 14900], ["Bombón helado", 1700]],
    variantes: [["", 1], [" (pack x 4)", 3.6]],
  },
  {
    nombre: "Librería escolar",
    plantillas: [["Lápiz negro", 400], ["Goma de borrar", 500], ["Plasticola 30 g", 1200], ["Regla 20 cm", 700], ["Sacapuntas", 600], ["Fibras (caja x 12)", 4900], ["Témperas (caja x 6)", 5900], ["Cartulina", 600], ["Repuesto de hojas rayadas", 2900], ["Carpeta escolar", 3900]],
    variantes: [["", 1], [" (x 3)", 2.7]],
  },
  {
    nombre: "Bebidas con alcohol",
    plantillas: [["Vino tinto 750 ml", 4900], ["Vino blanco 750 ml", 4700], ["Aperitivo amargo 750 ml", 9900], ["Sidra 720 ml", 3900], ["Cerveza negra 473 ml", 2600], ["Licor de dulce de leche 700 ml", 8900]],
    variantes: [[" (común)", 1], [" (reserva)", 1.6]],
  },
  {
    nombre: "Varios",
    plantillas: [
      ["Pilas AA (par)", 2200], ["Pilas AAA (par)", 2200], ["Encendedor", 900], ["Fósforos", 400], ["Cargador USB", 6900],
      ["Vela", 500], ["Cinta adhesiva", 900], ["Birome azul", 700], ["Cuaderno rayado", 2900], ["Hielo 2 kg", 1900],
      ["Carbón 3 kg", 4900], ["Cable USB tipo C", 4500],
    ],
    variantes: [["", 1]],
  },
]

/** Los botones de favoritos del mostrador del kiosco (nombres de producto que se buscan en el catálogo). */
export const FAVORITOS_KIOSCO = [
  "Gaseosa cola 500 ml", "Agua mineral 500 ml", "Alfajor de chocolate triple", "Chicle de menta", "Galletitas de agua",
  "Cerveza rubia 500 ml", "Papas fritas 40 g", "Leche entera 1 L", "Yerba mate (común)", "Pan lactal (común)",
  "Encendedor", "Hielo 2 kg",
] as const

export const PROVEEDORES_KIOSCO = [
  { id: "p-bebidas", nombre: "Bebidas del Sur (distribuidor)", rubro: "Bebidas", visita: "lunes y jueves", categorias: ["Bebidas", "Bebidas con alcohol"] },
  { id: "p-golosinas", nombre: "Golosinera Central", rubro: "Golosinas, galletitas y helados", visita: "martes", categorias: ["Golosinas", "Galletitas", "Snacks", "Helados"] },
  { id: "p-almacen", nombre: "Mayorista de barrio", rubro: "Almacén, limpieza, higiene y librería", visita: "sábados", categorias: ["Almacén", "Limpieza", "Higiene", "Varios", "Librería escolar"] },
  { id: "p-lacteos", nombre: "Reparto de lácteos y fiambres", rubro: "Lácteos, frescos y fiambrería", visita: "todos los días", categorias: ["Lácteos y frescos", "Fiambrería"] },
] as const

/** Vecinos del kiosco (nombres de pila y un apellido inventado). */
export const VECINOS = [
  "Rosa Peralta", "Aníbal Cuello", "Silvia Ortiz", "Don Ramón Ledesma", "Graciela Amaya", "Tito Barrios", "Norma Quiroga",
  "Pocha Villalba", "Héctor Sosa", "Marcela Ruiz", "Carlitos Funes", "Estela Moreno", "Jorge Paredes", "Nélida Ojeda",
  "Raúl Medina", "Susana Correa", "Beto Gallardo", "Mirta Herrera", "Oscar Vera", "Liliana Rojas", "Pedro Acuña",
  "Teresa Molina", "Daniel Ponce", "Chela Giménez", "Hugo Toledo", "Marta Benítez", "Walter Leiva", "Alicia Navarro",
  "Rubén Castro", "Inés Godoy", "Néstor Ríos", "Patricia Luna", "Mario Arce", "Gladys Ferreyra", "Ricardo Díaz",
  "Elsa Domínguez", "Julio Romero", "Ana Sánchez", "Luis Pereyra", "Cristina Gómez", "Ernesto Vega", "Lucía Campos",
  "Sergio Ibarra", "Laura Juárez", "Fabián Torres", "Mónica Suárez",
] as const

// ───────────────────────── Distribuidora (≈ 1.800) ─────────────────────────

/** Presentaciones mayoristas: el mismo producto en bulto. */
export const PRESENTACIONES_MAYORISTA = [
  [" · caja x 6", 5.6],
  [" · caja x 12", 10.8],
  [" · bulto x 24", 20.5],
] as const

/** Líneas de precio de la distribuidora (sin marcas). */
export const LINEAS_MAYORISTA = [
  ["", 1],
  [" · línea económica", 0.82],
  [" · línea premium", 1.3],
] as const

export const CATEGORIAS_EXTRA_DISTRIBUIDORA: readonly Categoria[] = [
  {
    nombre: "Perfumería",
    plantillas: [["Crema de manos", 2400], ["Talco", 1700], ["Hisopos (100)", 1200], ["Algodón 140 g", 1500], ["Gel fijador", 1900], ["Protector solar", 6900], ["Repelente", 3900], ["Jabón líquido 250 ml", 1800]],
    variantes: [["", 1], [" (familiar)", 1.7]],
  },
  {
    nombre: "Descartables",
    plantillas: [["Vasos descartables (50)", 1900], ["Platos descartables (25)", 2100], ["Servilletas (100)", 1100], ["Film de cocina 30 m", 2300], ["Papel aluminio 7 m", 2100], ["Bandejas de telgopor (10)", 1400]],
    variantes: [["", 1], [" (pack x 3)", 2.8]],
  },
  {
    nombre: "Mascotas",
    plantillas: [["Alimento para perro 1,5 kg", 5900], ["Alimento para gato 1 kg", 5200], ["Piedras sanitarias 4 kg", 4300], ["Snack para perro", 1900]],
    variantes: [["", 1], [" (adulto)", 1.05], [" (cachorro)", 1.1]],
  },
]

export const ZONAS_DISTRIBUIDORA = [
  "Centro", "Norte", "Sur", "Oeste", "Noroeste", "Sudoeste", "Funes", "Villa Gobernador Gálvez", "Granadero Baigorria", "Pérez", "Capitán Bermúdez", "Roldán",
] as const

export const PREVENTISTAS = [
  "Gustavo Ledesma", "Carla Pintos", "Matías Roldán", "Verónica Ayala", "Pablo Sanabria", "Julieta Cabral",
  "Diego Maidana", "Lorena Quiroga", "Facundo Arias", "Natalia Coronel", "Emiliano Paz", "Romina Villar",
] as const

export const TIPOS_COMERCIO = ["Almacén", "Despensa", "Autoservicio", "Maxikiosco", "Kiosco", "Minimercado", "Fiambrería", "Dietética"] as const
export const NOMBRES_COMERCIO = [
  "Don Tito", "El Trébol", "La Unión", "Los Andes", "San Cayetano", "El Progreso", "La Rueda", "Doña Elsa", "El Faro", "La Placita",
  "Los Hermanos", "El Sol", "La Estrella", "Don Pepe", "El Rincón", "Las Acacias", "El Puente", "Santa Lucía", "El Ceibo", "La Familia",
  "Mi Barrio", "El Paraíso", "Los Pinos", "La Esperanza", "El Tala", "Don Luis", "La Cantina", "El Molino", "Las Rosas", "El Abuelo",
] as const

// ───────────────────────── Grupo (25.000) ─────────────────────────

/** Rubros de una cadena de hogar y construcción: [categoría, tipos, variantes A, variantes B, precio base]. */
export const RUBROS_GRUPO: readonly (readonly [string, readonly string[], readonly string[], readonly string[], number])[] = [
  ["Construcción", ["Cemento", "Cal hidratada", "Arena embolsada", "Ladrillo hueco", "Bloque de hormigón", "Malla sima", "Hierro del", "Adhesivo para cerámicos", "Pastina", "Membrana líquida"], ["25 kg", "30 kg", "40 kg", "50 kg", "8 mm", "10 mm", "12 mm", "4 kg", "10 kg", "20 L"], ["estándar", "premium", "rápido", "uso exterior", "uso interior"], 9500],
  ["Pinturas", ["Látex interior", "Látex exterior", "Esmalte sintético", "Barniz marino", "Fijador sellador", "Impermeabilizante", "Antióxido", "Enduido plástico", "Pintura para pisos", "Laca poliuretánica"], ["1 L", "4 L", "10 L", "20 L"], ["blanco", "negro", "gris perla", "marfil", "verde inglés", "azul", "rojo óxido", "incoloro", "teja", "cedro"], 14500],
  ["Sanitarios", ["Inodoro", "Bidet", "Lavatorio", "Vanitory", "Grifería de cocina", "Grifería de baño", "Ducha", "Depósito de colgar", "Tanque de agua", "Termotanque"], ["línea A", "línea B", "línea C", "compacto", "de pie", "de pared"], ["blanco", "cromo", "negro mate", "acero", "500 L", "1000 L", "50 L", "80 L"], 89000],
  ["Electricidad", ["Cable unipolar", "Cable taller", "Toma doble", "Interruptor", "Disyuntor", "Llave termomagnética", "Caño corrugado", "Caja de luz", "Tablero", "Prolongador"], ["1,5 mm", "2,5 mm", "4 mm", "10 A", "16 A", "25 A", "40 A", "2 bocas", "4 bocas", "x 100 m"], ["blanco", "negro", "gris", "embutir", "exterior"], 7800],
  ["Iluminación", ["Lámpara LED", "Panel LED", "Plafón", "Aplique de pared", "Colgante", "Reflector LED", "Tira LED", "Spot dicroico", "Farol de jardín", "Luz de emergencia"], ["7 W", "9 W", "12 W", "18 W", "24 W", "50 W", "100 W", "5 m"], ["luz cálida", "luz fría", "luz neutra", "negro", "blanco", "dorado"], 6500],
  ["Herramientas", ["Taladro", "Amoladora", "Sierra circular", "Atornillador", "Lijadora", "Hidrolavadora", "Soldadora", "Compresor", "Juego de llaves", "Caja de herramientas"], ["550 W", "750 W", "1200 W", "1800 W", "12 V", "20 V", "24 L", "50 L", "12 piezas", "40 piezas"], ["hogar", "profesional", "inalámbrico", "con maletín", "kit"], 69000],
  ["Ferretería", ["Tornillo autoperforante", "Tarugo", "Bisagra", "Cerradura", "Candado", "Cadena", "Clavo", "Arandela", "Bulón", "Pasador"], ["6 mm", "8 mm", "10 mm", "x 50", "x 100", "x 500", "30 mm", "50 mm", "1 m"], ["zincado", "acero inoxidable", "bronce", "galvanizado", "negro"], 1900],
  ["Jardín", ["Manguera", "Cortadora de césped", "Bordeadora", "Pileta de lona", "Maceta", "Tierra fértil", "Fertilizante", "Semillas de césped", "Regadera", "Reposera"], ["15 m", "25 m", "50 m", "20 L", "50 L", "1 kg", "5 kg", "chica", "mediana", "grande"], ["verde", "negro", "terracota", "natural", "eléctrica", "a explosión"], 18500],
  ["Bazar", ["Juego de ollas", "Sartén antiadherente", "Vajilla", "Juego de vasos", "Cubiertos", "Termo", "Pava eléctrica", "Tabla de picar", "Fuente para horno", "Organizador"], ["18 cm", "24 cm", "28 cm", "6 piezas", "12 piezas", "24 piezas", "1 L", "1,7 L"], ["acero", "aluminio", "vidrio", "cerámica", "bambú", "negro", "blanco"], 15500],
  ["Hogar", ["Cortina", "Alfombra", "Almohada", "Juego de sábanas", "Acolchado", "Toallón", "Perchero", "Espejo", "Estante", "Cesto"], ["1 plaza", "2 plazas", "queen", "king", "60 x 90", "120 x 170", "160 x 230", "chico", "grande"], ["gris", "beige", "blanco", "negro", "azul", "terracota", "verde"], 21500],
  ["Pisos y revestimientos", ["Cerámico", "Porcellanato", "Piso vinílico", "Piso flotante", "Revestimiento de pared", "Zócalo", "Guarda decorativa", "Mosaico"], ["30 x 30", "45 x 45", "60 x 60", "60 x 120", "20 x 120", "m²"], ["símil madera", "símil piedra", "blanco", "gris", "cementicio", "mate", "brillante"], 16500],
  ["Aberturas", ["Puerta placa", "Puerta de chapa", "Ventana de aluminio", "Ventana de PVC", "Portón", "Mosquitero", "Persiana"], ["70 cm", "80 cm", "90 cm", "100 x 110", "150 x 110", "200 x 200"], ["blanco", "negro", "madera", "aluminio natural"], 129000],
  ["Climatización", ["Ventilador de pie", "Ventilador de techo", "Caloventor", "Estufa a gas", "Estufa eléctrica", "Aire acondicionado split", "Purificador"], ["40 cm", "50 cm", "2000 W", "3000 kcal", "5000 kcal", "2250 frig", "3000 frig"], ["blanco", "negro", "con control", "inverter", "tiro balanceado"], 98000],
  ["Electro", ["Licuadora", "Batidora", "Microondas", "Horno eléctrico", "Freidora de aire", "Aspiradora", "Plancha", "Cafetera", "Tostadora", "Exprimidor"], ["20 L", "28 L", "45 L", "3,5 L", "5 L", "600 W", "1000 W", "1500 W"], ["negro", "blanco", "acero", "rojo", "digital"], 59000],
]

export const SUCURSALES_GRUPO: readonly (readonly [ciudad: string, provincia: string, lat: number, lng: number, tamano: number])[] = [
  ["La Plata", "Buenos Aires", -34.921, -57.955, 1.3], ["Mar del Plata", "Buenos Aires", -38.005, -57.543, 1.4], ["Bahía Blanca", "Buenos Aires", -38.719, -62.272, 1.1],
  ["Tandil", "Buenos Aires", -37.321, -59.135, 0.8], ["Pilar", "Buenos Aires", -34.459, -58.914, 1.2], ["Quilmes", "Buenos Aires", -34.724, -58.254, 1.25],
  ["Morón", "Buenos Aires", -34.653, -58.62, 1.15], ["San Isidro", "Buenos Aires", -34.472, -58.528, 1.35], ["Lomas de Zamora", "Buenos Aires", -34.761, -58.406, 1.2],
  ["Junín", "Buenos Aires", -34.585, -60.958, 0.75], ["Olavarría", "Buenos Aires", -36.892, -60.322, 0.7], ["San Nicolás", "Buenos Aires", -33.335, -60.225, 0.85],
  ["Luján", "Buenos Aires", -34.57, -59.105, 0.8], ["Córdoba Centro", "Córdoba", -31.417, -64.183, 1.45], ["Córdoba Norte", "Córdoba", -31.37, -64.2, 1.1],
  ["Córdoba Sur", "Córdoba", -31.46, -64.19, 1.05], ["Río Cuarto", "Córdoba", -33.123, -64.349, 0.9], ["Villa María", "Córdoba", -32.407, -63.24, 0.8],
  ["Villa Carlos Paz", "Córdoba", -31.424, -64.497, 0.75], ["San Francisco", "Córdoba", -31.428, -62.083, 0.7], ["Rosario Centro", "Santa Fe", -32.947, -60.639, 1.4],
  ["Rosario Norte", "Santa Fe", -32.9, -60.68, 1.1], ["Rosario Oeste", "Santa Fe", -32.96, -60.72, 1.0], ["Santa Fe Centro", "Santa Fe", -31.633, -60.7, 1.15],
  ["Santa Fe Norte", "Santa Fe", -31.6, -60.71, 0.85], ["Rafaela", "Santa Fe", -31.25, -61.487, 0.8], ["Venado Tuerto", "Santa Fe", -33.746, -61.969, 0.75],
  ["Reconquista", "Santa Fe", -29.15, -59.651, 0.65], ["Mendoza Centro", "Mendoza", -32.889, -68.845, 1.3], ["Mendoza Este", "Mendoza", -32.9, -68.8, 0.95],
  ["Godoy Cruz", "Mendoza", -32.928, -68.844, 1.0], ["Luján de Cuyo", "Mendoza", -33.036, -68.877, 0.8], ["San Rafael", "Mendoza", -34.617, -68.33, 0.75],
  ["Tucumán Centro", "Tucumán", -26.808, -65.217, 1.2], ["Tucumán Sur", "Tucumán", -26.84, -65.21, 0.85], ["Yerba Buena", "Tucumán", -26.816, -65.316, 0.9],
  ["Concepción", "Tucumán", -27.343, -65.592, 0.6], ["Paraná", "Entre Ríos", -31.732, -60.529, 1.0], ["Concordia", "Entre Ríos", -31.393, -58.02, 0.8],
  ["Gualeguaychú", "Entre Ríos", -33.009, -58.517, 0.75],
]

export const PROVEEDORES_GRUPO = [
  "Cementera del Centro", "Pinturas Andinas", "Sanitarios del Litoral", "Electro Mayorista Norte", "Iluminación Patagónica", "Herramientas del Plata",
  "Bulonera Industrial", "Viveros del Oeste", "Bazar Mayorista", "Textil Hogar", "Cerámica del Sur", "Aberturas Mendocinas", "Clima Total",
] as const

export const NOMBRES_PERSONAS = [
  "Andrea", "Bruno", "Camila", "Darío", "Elena", "Federico", "Gabriela", "Hernán", "Ivana", "Javier", "Karina", "Leandro", "Mariana", "Nicolás",
  "Olga", "Pablo", "Rocío", "Santiago", "Tamara", "Ulises", "Valeria", "Walter", "Ximena", "Yamila", "Zoe", "Agustín", "Belén", "Cristian",
] as const
export const APELLIDOS = [
  "Acosta", "Benítez", "Cabrera", "Díaz", "Escobar", "Ferreyra", "Gómez", "Herrera", "Ibáñez", "Juárez", "López", "Martínez", "Núñez", "Ortega",
  "Pereyra", "Quiroga", "Ríos", "Sosa", "Torres", "Vázquez", "Zalazar", "Aguirre", "Bustos", "Cardozo", "Domínguez", "Figueroa", "Giménez", "Luna",
] as const
