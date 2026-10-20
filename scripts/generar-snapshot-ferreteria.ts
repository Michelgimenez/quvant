// Exporta la Ferretería Industrial Demo del seed de la app al modelo de lectura de la demo
// (src/demo/ferreteria-snapshot.json), con la misma fecha ancla que las otras empresas.
// Uso: npx tsx scripts/generar-snapshot-ferreteria.ts
import { writeFileSync } from "node:fs"
import { generarEmpresaDemo } from "../src/datos/demo/generar"
import { datosNegocioDesdeEstado } from "../src/datos/negocio-desde-estado"
import { ANCLA_DEMO_ISO } from "../src/demo/empresas"

const ahora = new Date(ANCLA_DEMO_ISO)
const estado = generarEmpresaDemo({ ahora, dias: 95 })
const datos = datosNegocioDesdeEstado(estado, ahora, { dias: 90, empresaId: "ferreteria" })
writeFileSync("src/demo/ferreteria-snapshot.json", JSON.stringify(datos))
const hoy = datos.dias.at(-1)!
console.log(
  `Ferretería: ${datos.productos.length} productos, ${datos.clientes.length} clientes, ${datos.sucursales.length} sucursales,`,
  `hoy $ ${Math.round(hoy.porSucursal.reduce((a, b) => a + b, 0) / 100).toLocaleString("es-AR")} en ${hoy.tickets.reduce((a, b) => a + b, 0)} ventas.`,
)
