// xlsx-js-style no trae tipos propios; mismo API que SheetJS + estilos de celda
// vía la propiedad `.s`. Lo usamos solo en generarInforme.
declare module 'xlsx-js-style' {
  const XLSX: any;
  export default XLSX;
}
