"use client"

import { useState } from "react"
import { Check, Minus, ShieldAlert, ShieldCheck, UserPlus } from "lucide-react"
import { toast } from "sonner"
import { useApp, useDatos } from "@/cliente/app-contexto"
import { EncabezadoPagina, Panel, Requiere } from "@/components/app/pagina"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DESCRIPCION_ROL, exige2FA, NOMBRE_ROL, PERMISOS, PERMISOS_POR_ROL, puedeAsignarRol } from "@/dominio/permisos"
import { ROLES, type Id, type Rol, type Usuario } from "@/dominio/tipos"
import { cn } from "@/lib/utils"

const GRUPOS_PERMISO: Record<string, string> = {
  tablero: "Tablero",
  inventario: "Inventario",
  stock: "Stock",
  conteo: "Conteos",
  costos: "Costos",
  precios: "Precios",
  mostrador: "Mostrador",
  caja: "Caja",
  ventas: "Ventas",
  presupuestos: "Presupuestos",
  servicio: "Servicio técnico",
  clientes: "Clientes",
  cuentas: "Cuentas corrientes",
  compras: "Compras",
  entregas: "Entregas",
  reportes: "Reportes",
  usuarios: "Usuarios",
  config: "Configuración",
  auditoria: "Auditoría",
  importar: "Importación",
}

export function Usuarios() {
  const { e } = useDatos()
  const [editar, setEditar] = useState<Usuario | "nuevo" | null>(null)
  return (
    <Requiere permiso="usuarios.gestionar">
      <EncabezadoPagina
        ficha={`Usuarios · ${e.usuarios.filter((u) => u.activo).length} activos`}
        titulo="Usuarios y permisos"
        descripcion="Cada persona ve y hace solo lo que le corresponde. Dueños y administración entran con doble factor."
        acciones={
          <Button onClick={() => setEditar("nuevo")}>
            <UserPlus /> Invitar usuario
          </Button>
        }
      />
      <Tabs defaultValue="usuarios">
        <TabsList className="mb-3">
          <TabsTrigger value="usuarios">Usuarios</TabsTrigger>
          <TabsTrigger value="matriz">Matriz de permisos</TabsTrigger>
        </TabsList>
        <TabsContent value="usuarios">
          <div className="overflow-hidden rounded-xl border border-linea bg-card">
            <table className="w-full t-texto-sm">
              <thead className="bg-superficie-2 t-texto-sm text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 text-left font-medium">Persona</th>
                  <th className="hidden px-4 py-2 text-left font-medium sm:table-cell">Rol</th>
                  <th className="hidden px-4 py-2 text-left font-medium md:table-cell">Sucursales</th>
                  <th className="hidden px-4 py-2 text-left font-medium md:table-cell">Doble factor</th>
                  <th className="hidden px-4 py-2 text-left font-medium lg:table-cell">Último ingreso</th>
                  <th className="px-4 py-2" />
                </tr>
              </thead>
              <tbody>
                {e.usuarios.map((u) => (
                  <tr key={u.id} className={cn("border-t border-linea", !u.activo && "opacity-55")}>
                    <td className="px-4 py-2.5">
                      <p className="font-medium">{u.nombre}</p>
                      <p className="t-texto-sm text-muted-foreground">{u.email}</p>
                      <p className="t-texto-sm text-muted-foreground sm:hidden">{NOMBRE_ROL[u.rol]}</p>
                    </td>
                    <td className="hidden px-4 py-2.5 sm:table-cell">{NOMBRE_ROL[u.rol]}</td>
                    <td className="hidden px-4 py-2.5 t-texto-sm md:table-cell">{u.sucursalIds === null ? "Todas" : u.sucursalIds.map((s) => e.sucursales.find((x) => x.id === s)?.codigo).join(", ")}</td>
                    <td className="hidden px-4 py-2.5 md:table-cell">
                      {u.dosFactor ? (
                        <span className="inline-flex items-center gap-1 t-texto-sm text-ok">
                          <ShieldCheck className="size-3.5" /> Activado
                        </span>
                      ) : exige2FA(u.rol) ? (
                        <span className="inline-flex items-center gap-1 t-texto-sm text-error">
                          <ShieldAlert className="size-3.5" /> Pendiente (obligatorio)
                        </span>
                      ) : (
                        <span className="t-texto-sm text-muted-foreground">Opcional</span>
                      )}
                    </td>
                    <td className="num hidden px-4 py-2.5 t-texto-sm text-muted-foreground lg:table-cell">{u.ultimoIngreso ? new Date(u.ultimoIngreso).toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" }) : "—"}</td>
                    <td className="px-4 py-2.5 text-right">
                      <Button size="sm" variant="ghost" onClick={() => setEditar(u)}>
                        Editar
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>
        <TabsContent value="matriz">
          <Panel>
            <div className="overflow-auto">
              <table className="w-full t-texto-sm">
                <thead>
                  <tr className="text-muted-foreground">
                    <th className="sticky left-0 bg-card px-2 py-2 text-left font-medium">Permiso</th>
                    {ROLES.map((r) => (
                      <th key={r} className="px-2 py-2 font-medium" title={DESCRIPCION_ROL[r]}>
                        {NOMBRE_ROL[r]}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {PERMISOS.map((p) => {
                    const [grupo, accion] = p.split(".")
                    return (
                      <tr key={p} className="border-t border-linea">
                        <td className="sticky left-0 bg-card px-2 py-1.5">
                          <span className="font-medium">{GRUPOS_PERMISO[grupo] ?? grupo}</span> <span className="text-muted-foreground">· {accion}</span>
                        </td>
                        {ROLES.map((r) => (
                          <td key={r} className="px-2 py-1.5 text-center">
                            {PERMISOS_POR_ROL[r].includes(p) ? <Check className="mx-auto size-4 text-ok" aria-label="Sí" /> : <Minus className="mx-auto size-3 text-muted-foreground/50" aria-label="No" />}
                          </td>
                        ))}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <p className="mt-3 t-texto-sm text-muted-foreground">La misma matriz vive en la base de datos y la aplican las políticas de seguridad (RLS): no depende solo de la pantalla.</p>
          </Panel>
        </TabsContent>
      </Tabs>
      {editar && <DialogoUsuario usuario={editar === "nuevo" ? null : editar} onCerrar={() => setEditar(null)} />}
    </Requiere>
  )
}

function DialogoUsuario({ usuario, onCerrar }: { usuario: Usuario | null; onCerrar: () => void }) {
  const { e } = useDatos()
  const { ejecutar, motor, usuario: yo } = useApp()
  const [nombre, setNombre] = useState(usuario?.nombre ?? "")
  const [email, setEmail] = useState(usuario?.email ?? "")
  const [rol, setRol] = useState<Rol>(usuario?.rol ?? "mostrador")
  const [todas, setTodas] = useState(usuario ? usuario.sucursalIds === null : false)
  const [sucursales, setSucursales] = useState<Id[]>(usuario?.sucursalIds ?? [e.sucursales[0].id])
  const [activo, setActivo] = useState(usuario?.activo ?? true)
  const esYo = usuario?.id === yo.id
  const roles = ROLES.filter((r) => puedeAsignarRol(yo.rol, r) || r === usuario?.rol)

  return (
    <Dialog open onOpenChange={(a) => !a && onCerrar()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{usuario ? "Editar usuario" : "Invitar usuario"}</DialogTitle>
          <DialogDescription>{usuario ? usuario.email : "Le llega un email para crear su contraseña. En la demo la invitación está emulada."}</DialogDescription>
        </DialogHeader>
        <form
          className="space-y-3"
          onSubmit={async (ev) => {
            ev.preventDefault()
            const sucursalIds = todas ? null : sucursales
            const r = usuario
              ? await ejecutar("usuario.guardar", { usuarioId: usuario.id, cambios: { nombre, rol, sucursalIds, activo } }, null)
              : await ejecutar("usuario.guardar", { usuarioId: motor.uuid(), nuevo: { id: motor.uuid(), orgId: e.org.id, nombre, email, rol, sucursalIds, activo: true, dosFactor: false, ultimoIngreso: null, permisosExtra: [], preferencias: {} } }, null)
            if (!r.ok) return toast.error(r.error)
            toast.success(usuario ? "Usuario actualizado" : "Invitación registrada (envío emulado en la demo)")
            onCerrar()
          }}
        >
          <div className="space-y-1">
            <Label htmlFor="us-nombre">Nombre</Label>
            <Input id="us-nombre" value={nombre} onChange={(ev) => setNombre(ev.target.value)} required />
          </div>
          {!usuario && (
            <div className="space-y-1">
              <Label htmlFor="us-email">Email</Label>
              <Input id="us-email" type="email" value={email} onChange={(ev) => setEmail(ev.target.value)} required />
            </div>
          )}
          <div className="space-y-1">
            <Label>Rol</Label>
            <Select value={rol} onValueChange={(r) => setRol(r as Rol)} disabled={esYo}>
              <SelectTrigger className="w-full" aria-label="Rol">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {roles.map((r) => (
                  <SelectItem key={r} value={r}>
                    {NOMBRE_ROL[r]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="t-texto-sm text-muted-foreground">{DESCRIPCION_ROL[rol]}</p>
            {esYo && <p className="t-texto-sm text-muted-foreground">No podés cambiar tu propio rol.</p>}
          </div>
          <fieldset className="space-y-1.5">
            <legend className="t-texto-sm font-medium">Sucursales</legend>
            <label className="flex items-center gap-2 t-texto-sm">
              <Checkbox checked={todas} onCheckedChange={(c) => setTodas(Boolean(c))} /> Todas
            </label>
            {!todas &&
              e.sucursales.map((s) => (
                <label key={s.id} className="flex items-center gap-2 t-texto-sm">
                  <Checkbox checked={sucursales.includes(s.id)} onCheckedChange={(c) => setSucursales((xs) => (c ? [...xs, s.id] : xs.filter((x) => x !== s.id)))} />
                  {s.codigo} · {s.nombre}
                </label>
              ))}
          </fieldset>
          {usuario && !esYo && (
            <label className="flex items-center justify-between t-texto-sm">
              Usuario activo
              <Switch checked={activo} onCheckedChange={setActivo} />
            </label>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onCerrar}>
              Cancelar
            </Button>
            <Button type="submit" disabled={!todas && sucursales.length === 0}>
              Guardar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
