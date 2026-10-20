// ffprobe-static no trae tipos: solo exporta la ruta del ejecutable.
declare module "ffprobe-static" {
  const ffprobe: { path: string }
  export default ffprobe
}
