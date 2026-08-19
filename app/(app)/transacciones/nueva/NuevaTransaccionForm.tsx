"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { registrarMovimiento } from "@/lib/actions/movimientos";
import { encolar } from "@/lib/offlineQueue";
import type { Cuenta, CuentaPorCobrarConSaldo, MovimientoTipo } from "@/types/database.types";

type ModoConversion = "compra_divisa" | "venta_divisa";
type MonedaDivisa = "USD" | "EUR";

const TIPOS_OTRO: { value: MovimientoTipo; label: string; pill: string }[] = [
  { value: "traspaso_interno", label: "Traspaso entre cuentas propias", pill: "Traspaso" },
  { value: "pago_deuda_cliente", label: "Pago de deuda de cliente", pill: "Deuda" },
  { value: "prestamo_a_cliente", label: "Préstamo a cliente", pill: "Préstamo" },
  { value: "deposito_sin_identificar", label: "Depósito sin identificar", pill: "Depósito" },
  { value: "cruce_divisas", label: "Cruce de divisas", pill: "Cruce" },
  { value: "gasto", label: "Gasto / salida de dinero", pill: "Gasto" },
  { value: "ajuste_correccion", label: "Ajuste / corrección", pill: "Ajuste" },
];

function cuentasDe(cuentas: Cuenta[], moneda?: string) {
  return moneda ? cuentas.filter((c) => c.moneda_codigo === moneda) : cuentas;
}

export function NuevaTransaccionForm({
  cuentas,
  cxcAbiertas,
  tcVigente,
}: {
  cuentas: Cuenta[];
  cxcAbiertas: CuentaPorCobrarConSaldo[];
  tcVigente: { tc_usd: number; tc_eur: number } | null;
}) {
  const router = useRouter();
  const [modo, setModo] = useState<ModoConversion | "otro" | null>(null);
  const [monedaDivisa, setMonedaDivisa] = useState<MonedaDivisa>("USD");
  const [tipoOtro, setTipoOtro] = useState<MovimientoTipo | "">("");
  const [monto, setMonto] = useState("");
  const [tc, setTc] = useState("");
  const [montoDestino, setMontoDestino] = useState("");
  const [mostrarCuentas, setMostrarCuentas] = useState(false);
  const [cuentaOrigenId, setCuentaOrigenId] = useState("");
  const [cuentaDestinoId, setCuentaDestinoId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [pending, startTransition] = useTransition();

  const cuentasPen = useMemo(() => cuentasDe(cuentas, "PEN"), [cuentas]);
  const cuentasDivisa = useMemo(
    () => cuentas.filter((c) => c.moneda_codigo === "USD" || c.moneda_codigo === "EUR"),
    [cuentas]
  );
  const cuentasBanco = useMemo(() => cuentas.filter((c) => c.tipo === "banco"), [cuentas]);

  const bovedaPen = useMemo(() => cuentas.find((c) => c.slug === "boveda_efectivo_pen"), [cuentas]);
  const bovedaDivisa = useMemo(
    () => cuentas.find((c) => c.slug === `boveda_efectivo_${monedaDivisa.toLowerCase()}`),
    [cuentas, monedaDivisa]
  );

  const tcReferencia = monedaDivisa === "USD" ? tcVigente?.tc_usd : tcVigente?.tc_eur;

  function calcularDesdeTc(montoStr: string, tcStr: string) {
    const m = Number(montoStr) || 0;
    const t = Number(tcStr) || 0;
    if (m <= 0 || t <= 0) return "";
    const resultado = modo === "venta_divisa" ? m * t : m / t;
    return (Math.round(resultado * 100) / 100).toString();
  }

  function calcularTcDesdeMontos(montoStr: string, destinoStr: string) {
    const m = Number(montoStr) || 0;
    const d = Number(destinoStr) || 0;
    if (m <= 0 || d <= 0) return "";
    const resultado = modo === "venta_divisa" ? d / m : m / d;
    return (Math.round(resultado * 10000) / 10000).toString();
  }

  function handleMontoChange(v: string) {
    setMonto(v);
    if (tc) setMontoDestino(calcularDesdeTc(v, tc));
    else if (montoDestino) setTc(calcularTcDesdeMontos(v, montoDestino));
  }

  function handleTcChange(v: string) {
    setTc(v);
    setMontoDestino(calcularDesdeTc(monto, v));
  }

  function handleMontoDestinoChange(v: string) {
    setMontoDestino(v);
    setTc(calcularTcDesdeMontos(monto, v));
  }

  const origenDefecto = modo === "compra_divisa" ? bovedaPen : bovedaDivisa;
  const destinoDefecto = modo === "compra_divisa" ? bovedaDivisa : bovedaPen;
  const origenFinalId = cuentaOrigenId || origenDefecto?.id || "";
  const destinoFinalId = cuentaDestinoId || destinoDefecto?.id || "";

  function cambiarModo(nuevo: ModoConversion) {
    setModo(nuevo);
    setTipoOtro("");
    setMonto("");
    setMontoDestino("");
    setCuentaOrigenId("");
    setCuentaDestinoId("");
    setMostrarCuentas(false);
    setError(null);
    setOk(false);
  }

  function reset(formEl: HTMLFormElement) {
    formEl.reset();
    setModo(null);
    setTipoOtro("");
    setMonto("");
    setTc("");
    setMontoDestino("");
    setCuentaOrigenId("");
    setCuentaDestinoId("");
    setMostrarCuentas(false);
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setOk(false);

    if ((modo === "compra_divisa" || modo === "venta_divisa") && !tc && !montoDestino) {
      setError("Ingrese el TC de esta operación o el monto que recibe");
      return;
    }

    const formEl = e.currentTarget;
    const formData = new FormData(formEl);
    const tipoActual = (formData.get("tipo") as string) || modo || tipoOtro;
    const campos: Record<string, string> = {};
    formData.forEach((v, k) => (campos[k] = String(v)));

    startTransition(async () => {
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        encolar(campos, `${tipoActual}: ${campos.cliente_texto ?? "sin cliente"}`);
        setOk(true);
        reset(formEl);
        return;
      }

      try {
        const res = await registrarMovimiento(formData);
        if (res.error) {
          setError(res.error);
          return;
        }
        setOk(true);
        reset(formEl);
        router.refresh();
      } catch {
        // Falla de red a mitad de envío: no perder el registro.
        encolar(campos, `${tipoActual}: ${campos.cliente_texto ?? "sin cliente"}`);
        setOk(true);
        reset(formEl);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
      <div className="grid grid-cols-2 gap-2.5">
        <button
          type="button"
          onClick={() => cambiarModo("compra_divisa")}
          className={`rounded-2xl p-3.5 text-left ${
            modo === "compra_divisa" ? "bg-ink text-paper" : "border border-ink/10 bg-white text-ink"
          }`}
        >
          <p className={`text-xs ${modo === "compra_divisa" ? "text-paper/55" : "text-ink/50"}`}>Compro</p>
          <p className="mt-0.5 text-[19px] font-bold">{monedaDivisa === "USD" ? "Dólares" : "Euros"}</p>
          <p className={`mt-0.5 text-xs ${modo === "compra_divisa" ? "text-lime" : "text-ink/50"}`}>
            soles → {monedaDivisa}
          </p>
        </button>
        <button
          type="button"
          onClick={() => cambiarModo("venta_divisa")}
          className={`rounded-2xl p-3.5 text-left ${
            modo === "venta_divisa" ? "bg-ink text-paper" : "border border-ink/10 bg-white text-ink"
          }`}
        >
          <p className={`text-xs ${modo === "venta_divisa" ? "text-paper/55" : "text-ink/50"}`}>Vendo</p>
          <p className="mt-0.5 text-[19px] font-bold">{monedaDivisa === "USD" ? "Dólares" : "Euros"}</p>
          <p className={`mt-0.5 text-xs ${modo === "venta_divisa" ? "text-lime" : "text-ink/50"}`}>
            {monedaDivisa} → soles
          </p>
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setMonedaDivisa("USD")}
          className={monedaDivisa === "USD" ? "pill-active" : "pill"}
        >
          Dólares
        </button>
        <button
          type="button"
          onClick={() => setMonedaDivisa("EUR")}
          className={monedaDivisa === "EUR" ? "pill-active" : "pill"}
        >
          Euros
        </button>
        {TIPOS_OTRO.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => {
              setModo("otro");
              setTipoOtro(t.value);
              setError(null);
              setOk(false);
            }}
            className={tipoOtro === t.value ? "pill-active" : "pill"}
          >
            {t.pill}
          </button>
        ))}
      </div>

      {(modo === "compra_divisa" || modo === "venta_divisa") && (
        <>
          <input type="hidden" name="tipo" value={modo} />
          <input type="hidden" name="cuenta_origen_id" value={origenFinalId} />
          <input type="hidden" name="cuenta_destino_id" value={destinoFinalId} />

          <input type="hidden" name="monto_destino" value={montoDestino} />
          <input type="hidden" name="tc_aplicado" value={tc} />

          <div className="card flex flex-col gap-3">
            <div>
              <p className="text-[12.5px] text-ink/50">
                {modo === "compra_divisa" ? "Entrego S/" : `Entrego ${monedaDivisa}`}
              </p>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="font-num text-[15px] text-ink/50">
                  {modo === "compra_divisa" ? "S/" : monedaDivisa === "USD" ? "US$" : "€"}
                </span>
                <input
                  name="monto_origen"
                  type="number"
                  step="0.01"
                  inputMode="decimal"
                  required
                  autoFocus
                  placeholder="0"
                  className="font-num w-full border-none bg-transparent text-[30px] font-semibold outline-none"
                  value={monto}
                  onChange={(e) => handleMontoChange(e.target.value)}
                />
              </div>
            </div>

            <div className="h-px bg-[#f0f0ea]" />

            <div>
              <p className="text-[12.5px] text-ink/50">
                TC de esta operación
                {tcReferencia && ` · referencia del cierre ${tcReferencia.toFixed(4)}`}
              </p>
              <input
                type="number"
                step="0.0001"
                inputMode="decimal"
                placeholder={tcReferencia ? tcReferencia.toFixed(4) : "0.0000"}
                className="font-num mt-1 w-full border-none bg-transparent text-[22px] font-semibold outline-none"
                value={tc}
                onChange={(e) => handleTcChange(e.target.value)}
              />
            </div>

            <div className="h-px bg-[#f0f0ea]" />

            <div>
              <p className="text-[12.5px] text-ink/50">
                Recibo {modo === "compra_divisa" ? monedaDivisa : "soles"}
              </p>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="font-num text-[15px] text-ink/50">
                  {modo === "compra_divisa" ? (monedaDivisa === "USD" ? "US$" : "€") : "S/"}
                </span>
                <input
                  type="number"
                  step="0.01"
                  inputMode="decimal"
                  placeholder="0"
                  className="font-num w-full border-none bg-transparent text-[26px] font-semibold outline-none"
                  value={montoDestino}
                  onChange={(e) => handleMontoDestinoChange(e.target.value)}
                />
              </div>
            </div>

            <button
              type="button"
              onClick={() => setMostrarCuentas((v) => !v)}
              className="flex items-center justify-between gap-2 rounded-xl bg-paper px-3 py-2.5 text-left"
            >
              <span className="min-w-0 flex-1 truncate text-[12.5px] font-medium text-ink/70">
                {cuentas.find((c) => c.id === origenFinalId)?.nombre ?? "…"} →{" "}
                {cuentas.find((c) => c.id === destinoFinalId)?.nombre ?? "…"}
              </span>
              <span className="shrink-0 text-[11.5px] font-semibold text-lime-dark">cambiar</span>
            </button>
          </div>

          {mostrarCuentas && (
            <div className="card flex flex-col gap-3">
              <SelectCuenta
                label="Cuenta origen (de donde sale)"
                value={origenFinalId}
                onChange={setCuentaOrigenId}
                opciones={modo === "compra_divisa" ? cuentasPen : cuentasDivisa}
              />
              <SelectCuenta
                label="Cuenta destino (a donde entra)"
                value={destinoFinalId}
                onChange={setCuentaDestinoId}
                opciones={modo === "compra_divisa" ? cuentasDivisa : cuentasPen}
              />
            </div>
          )}

          <div className="flex items-center gap-2.5 rounded-2xl bg-white px-3.5 py-3 shadow-sm">
            <span className="text-[13px] text-ink/50">Cliente</span>
            <input
              name="cliente_texto"
              placeholder="opcional, toca para escribir"
              className="flex-1 border-none bg-transparent text-sm outline-none placeholder:text-ink/30"
            />
          </div>
        </>
      )}

      {modo === "otro" && tipoOtro && (
        <>
          <input type="hidden" name="tipo" value={tipoOtro} />

          {tipoOtro === "traspaso_interno" && (
            <>
              <SelectCuentaNativo name="cuenta_origen_id" label="Cuenta origen" opciones={cuentas} />
              <SelectCuentaNativo name="cuenta_destino_id" label="Cuenta destino" opciones={cuentas} />
              <CampoMonto name="monto" label="Monto" />
            </>
          )}

          {tipoOtro === "cruce_divisas" && (
            <>
              <CampoCliente opcional />
              <SelectCuentaNativo name="cuenta_origen_id" label="Cuenta origen (de donde sale)" opciones={cuentasDivisa} />
              <SelectCuentaNativo name="cuenta_destino_id" label="Cuenta destino (a donde entra)" opciones={cuentasDivisa} />
              <CampoMonto name="monto_origen" label="Monto que entrega el cliente" />
              <CampoMonto name="monto_destino" label="Monto que recibe el cliente" />
            </>
          )}

          {tipoOtro === "prestamo_a_cliente" && (
            <>
              <CampoCliente opcional={false} />
              <SelectCuentaNativo name="cuenta_origen_id" label="Cuenta de donde sale el dinero" opciones={cuentas} />
              <CampoMonto name="monto_origen" label="Monto prestado" />
            </>
          )}

          {tipoOtro === "pago_deuda_cliente" && (
            <>
              <div>
                <label className="field-label" htmlFor="cuenta_por_cobrar_id">
                  Deuda a abonar
                </label>
                <select id="cuenta_por_cobrar_id" name="cuenta_por_cobrar_id" required className="field-input">
                  <option value="" disabled>
                    Seleccione…
                  </option>
                  {cxcAbiertas.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.cliente_texto} (pendiente {c.saldo_pendiente} {c.moneda})
                    </option>
                  ))}
                </select>
              </div>
              <SelectCuentaNativo name="cuenta_destino_id" label="Cuenta donde entra el pago" opciones={cuentas} />
              <CampoMonto name="monto_destino" label="Monto abonado" />
            </>
          )}

          {tipoOtro === "deposito_sin_identificar" && (
            <>
              <SelectCuentaNativo name="cuenta_destino_id" label="Banco donde entró el depósito" opciones={cuentasBanco} />
              <CampoMonto name="monto_destino" label="Monto depositado" />
            </>
          )}

          {tipoOtro === "gasto" && (
            <>
              <SelectCuentaNativo name="cuenta_origen_id" label="Cuenta de donde sale" opciones={cuentas} />
              <CampoMonto name="monto_origen" label="Monto del gasto" />
            </>
          )}

          {tipoOtro === "ajuste_correccion" && (
            <>
              <div>
                <label className="field-label" htmlFor="movimiento_corregido_id">
                  ID del movimiento que corrige
                </label>
                <input
                  id="movimiento_corregido_id"
                  name="movimiento_corregido_id"
                  required
                  className="field-input"
                  placeholder="UUID del movimiento original"
                />
              </div>
              <CampoCliente opcional />
              <SelectCuentaNativo name="cuenta_origen_id" label="Cuenta origen (opcional)" opciones={cuentas} opcionalVacio />
              <CampoMonto name="monto_origen" label="Monto origen (opcional)" opcional />
              <SelectCuentaNativo name="cuenta_destino_id" label="Cuenta destino (opcional)" opciones={cuentas} opcionalVacio />
              <CampoMonto name="monto_destino" label="Monto destino (opcional)" opcional />
            </>
          )}

          <div>
            <label className="field-label" htmlFor="comentario">
              {tipoOtro === "ajuste_correccion"
                ? "Motivo del ajuste"
                : tipoOtro === "gasto"
                  ? "¿En qué se gastó?"
                  : "Comentario (opcional)"}
            </label>
            <input
              id="comentario"
              name="comentario"
              required={tipoOtro === "ajuste_correccion" || tipoOtro === "gasto"}
              className="field-input"
            />
          </div>
        </>
      )}

      {error && <p className="text-sm text-rust">{error}</p>}
      {ok && <p className="text-sm text-brand-700">Transacción registrada ✓</p>}

      {(modo === "compra_divisa" || modo === "venta_divisa" || (modo === "otro" && tipoOtro)) && (
        <button type="submit" className="btn-primary" disabled={pending}>
          {pending ? "Guardando…" : "Registrar cambio"}
        </button>
      )}
    </form>
  );
}

function CampoCliente({ opcional }: { opcional: boolean }) {
  return (
    <div>
      <label className="field-label" htmlFor="cliente_texto">
        Cliente {opcional && "(opcional)"}
      </label>
      <input id="cliente_texto" name="cliente_texto" required={!opcional} className="field-input" />
    </div>
  );
}

function SelectCuentaNativo({
  name,
  label,
  opciones,
  opcionalVacio,
}: {
  name: string;
  label: string;
  opciones: Cuenta[];
  opcionalVacio?: boolean;
}) {
  return (
    <div>
      <label className="field-label" htmlFor={name}>
        {label}
      </label>
      <select id={name} name={name} required={!opcionalVacio} className="field-input" defaultValue="">
        <option value="" disabled={!opcionalVacio}>
          Seleccione…
        </option>
        {opciones.map((c) => (
          <option key={c.id} value={c.id}>
            {c.nombre}
          </option>
        ))}
      </select>
    </div>
  );
}

function SelectCuenta({
  label,
  value,
  onChange,
  opciones,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  opciones: Cuenta[];
}) {
  return (
    <div>
      <label className="field-label">{label}</label>
      <select className="field-input" value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="" disabled>
          Seleccione…
        </option>
        {opciones.map((c) => (
          <option key={c.id} value={c.id}>
            {c.nombre}
          </option>
        ))}
      </select>
    </div>
  );
}

function CampoMonto({ name, label, opcional }: { name: string; label: string; opcional?: boolean }) {
  return (
    <div>
      <label className="field-label" htmlFor={name}>
        {label}
      </label>
      <input
        id={name}
        name={name}
        type="number"
        step="0.01"
        inputMode="decimal"
        required={!opcional}
        className="field-input"
      />
    </div>
  );
}
