// Tipos manuales alineados con supabase/migrations/0001_init_schema.sql
// (generar con `supabase gen types typescript` cuando el proyecto esté enlazado)

export type Rol = "dueña" | "trabajador";
export type MonedaCodigo = "PEN" | "USD" | "EUR" | "MONEDAS";
export type CuentaTipo = "banco" | "efectivo_boveda" | "fondo_juan";

export type MovimientoTipo =
  | "compra_divisa"
  | "venta_divisa"
  | "cruce_divisas"
  | "traspaso_banco_efectivo"
  | "traspaso_interno"
  | "venta_monedas_billetes"
  | "pago_deuda_cliente"
  | "prestamo_a_cliente"
  | "deposito_sin_identificar"
  | "ajuste_correccion";

export type MovimientoEstado = "normal" | "pendiente_identificar" | "identificado";

export type FondoDiarioEstado =
  | "cuadrado"
  | "investigando"
  | "asumido_por_juan"
  | "pendiente_devolucion";

export type CierreEstado = "cuadrado" | "con_diferencia";

export interface Usuario {
  id: string;
  nombre: string;
  rol: Rol;
  activo: boolean;
  creado_en: string;
}

export interface Moneda {
  codigo: MonedaCodigo;
  nombre: string;
}

export interface Cuenta {
  id: string;
  nombre: string;
  slug: string;
  tipo: CuentaTipo;
  moneda_codigo: MonedaCodigo;
  activa: boolean;
}

export interface TipoCambio {
  id: string;
  fecha_hora: string;
  tc_usd: number;
  tc_eur: number;
  usuario_id: string;
}

export interface ComisionConfig {
  id: string;
  tipo: "monedas" | "billetes";
  tasa_por_100: number;
  vigente_desde: string;
}

export interface Movimiento {
  id: string;
  fecha_hora: string;
  fecha_contable: string;
  usuario_id: string;
  tipo: MovimientoTipo;
  cliente_texto: string | null;
  cuenta_origen_id: string | null;
  moneda_origen: MonedaCodigo | null;
  monto_origen: number | null;
  cuenta_destino_id: string | null;
  moneda_destino: MonedaCodigo | null;
  monto_destino: number | null;
  tipo_cambio_id: string | null;
  tc_aplicado: number | null;
  comision_calculada: number | null;
  cuenta_por_cobrar_id: string | null;
  estado: MovimientoEstado;
  movimiento_corregido_id: string | null;
  comentario: string | null;
  creado_en: string;
}

export interface CuentaPorCobrar {
  id: string;
  cliente_texto: string;
  moneda: MonedaCodigo;
  monto_original: number;
  fecha_operacion: string;
  movimiento_id: string | null;
}

export interface CuentaPorCobrarConSaldo extends CuentaPorCobrar {
  total_abonado: number;
  saldo_pendiente: number;
}

export interface AbonoCxc {
  id: string;
  cuenta_por_cobrar_id: string;
  fecha: string;
  monto_abonado: number;
  movimiento_id: string;
}

export interface FondoDiario {
  id: string;
  fecha: string;
  usuario_id: string;
  monto_entregado: number;
  monto_devuelto: number | null;
  diferencia: number;
  estado: FondoDiarioEstado;
  observacion: string | null;
  creado_en: string;
}

export interface MovimientoJuan {
  id: string;
  fondo_diario_id: string;
  hora: string;
  cliente_texto: string | null;
  tipo_operacion: string;
  moneda_origen: MonedaCodigo | null;
  monto_origen: number | null;
  moneda_destino: MonedaCodigo | null;
  monto_destino: number | null;
  tc_aplicado: number | null;
  comentario: string | null;
}

export interface CierreDiario {
  id: string;
  fecha: string;
  hora_cierre: string;
  cuenta_id: string;
  saldo_sistema: number;
  conteo_milagro: number | null;
  conteo_juan: number | null;
  diferencia_real: number | null;
  variacion_cambiaria: number | null;
  estado: CierreEstado;
  observacion: string | null;
  cerrado: boolean;
  usuario_id: string;
  creado_en: string;
}

export interface SaldoCuenta {
  cuenta_id: string;
  cuenta_nombre: string;
  cuenta_slug: string;
  cuenta_tipo: CuentaTipo;
  moneda_codigo: MonedaCodigo;
  saldo: number;
}
