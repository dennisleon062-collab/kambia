"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { registrarMovimiento } from "@/lib/actions/movimientos";
import { encolar } from "@/lib/offlineQueue";
import type { Cuenta, CuentaPorCobrarConSaldo, MovimientoTipo } from "@/types/database.types";

const TIPOS: { value: MovimientoTipo; label: string }[] = [
  { value: "compra_divisa", label: "Compra de divisa (Soles → USD/EUR)" },
  { value: "venta_divisa", label: "Venta de divisa (USD/EUR → Soles)" },
  { value: "cruce_divisas", label: "Cruce de divisas (ej. EUR → USD)" },
  { value: "traspaso_banco_efectivo", label: "Traspaso banco ↔ efectivo" },
  { value: "traspaso_interno", label: "Traspaso interno (misma moneda)" },
  { value: "venta_monedas_billetes", label: "Cambio de monedas/billetes (con comisión)" },
  { value: "pago_deuda_cliente", label: "Pago de deuda de cliente (abono)" },
  { value: "prestamo_a_cliente", label: "Préstamo a cliente" },
  { value: "deposito_sin_identificar", label: "Depósito sin identificar" },
  { value: "ajuste_correccion", label: "Ajuste / corrección" },
];

function cuentasDe(cuentas: Cuenta[], moneda?: string) {
  return moneda ? cuentas.filter((c) => c.moneda_codigo === moneda) : cuentas;
}

export function NuevaTransaccionForm({
  cuentas,
  cxcAbiertas,
}: {
  cuentas: Cuenta[];
  cxcAbiertas: CuentaPorCobrarConSaldo[];
}) {
  const router = useRouter();
  const [tipo, setTipo] = useState<MovimientoTipo | "">("");
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [pending, startTransition] = useTransition();

  const cuentasPen = useMemo(() => cuentasDe(cuentas, "PEN"), [cuentas]);
  const cuentasDivisa = useMemo(
    () => cuentas.filter((c) => c.moneda_codigo === "USD" || c.moneda_codigo === "EUR"),
    [cuentas]
  );
  const cuentaMonedas = useMemo(() => cuentas.find((c) => c.slug === "boveda_monedas"), [cuentas]);
  const cuentasBanco = useMemo(() => cuentas.filter((c) => c.tipo === "banco"), [cuentas]);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setOk(false);
    const formData = new FormData(e.currentTarget);
    const campos: Record<string, string> = {};
    formData.forEach((v, k) => (campos[k] = String(v)));

    startTransition(async () => {
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        encolar(campos, `${tipo}: ${campos.cliente_texto ?? "sin cliente"}`);
        setOk(true);
        (e.target as HTMLFormElement).reset();
        setTipo("");
        return;
      }

      try {
        const res = await registrarMovimiento(formData);
        if (res.error) {
          setError(res.error);
          return;
        }
        setOk(true);
        (e.target as HTMLFormElement).reset();
        setTipo("");
        router.refresh();
      } catch {
        // Falla de red a mitad de envío: no perder el registro.
        encolar(campos, `${tipo}: ${campos.cliente_texto ?? "sin cliente"}`);
        setOk(true);
        (e.target as HTMLFormElement).reset();
        setTipo("");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div>
        <label className="field-label" htmlFor="tipo">
          Tipo de operación
        </label>
        <select
          id="tipo"
          name="tipo"
          required
          className="field-input"
          value={tipo}
          onChange={(e) => setTipo(e.target.value as MovimientoTipo)}
        >
          <option value="" disabled>
            Seleccione…
          </option>
          {TIPOS.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      {(tipo === "compra_divisa" || tipo === "venta_divisa" || tipo === "cruce_divisas") && (
        <>
          <CampoCliente opcional />
          <SelectCuenta
            name="cuenta_origen_id"
            label="Cuenta origen (de donde sale)"
            opciones={
              tipo === "compra_divisa" ? cuentasPen : tipo === "venta_divisa" ? cuentasDivisa : cuentasDivisa
            }
          />
          <SelectCuenta
            name="cuenta_destino_id"
            label="Cuenta destino (a donde entra)"
            opciones={
              tipo === "compra_divisa" ? cuentasDivisa : tipo === "venta_divisa" ? cuentasPen : cuentasDivisa
            }
          />
          <CampoMonto name="monto_origen" label="Monto que entrega el cliente" />
          <p className="text-xs text-ink/50">
            El monto a entregar se calcula automáticamente con el tipo de cambio vigente.
          </p>
        </>
      )}

      {(tipo === "traspaso_banco_efectivo" || tipo === "traspaso_interno") && (
        <>
          <SelectCuenta name="cuenta_origen_id" label="Cuenta origen" opciones={cuentas} />
          <SelectCuenta name="cuenta_destino_id" label="Cuenta destino" opciones={cuentas} />
          <CampoMonto name="monto" label="Monto" />
        </>
      )}

      {tipo === "venta_monedas_billetes" && (
        <>
          <CampoCliente opcional />
          <div>
            <label className="field-label" htmlFor="subtipo">
              Tipo
            </label>
            <select id="subtipo" name="subtipo" required className="field-input">
              <option value="monedas">Monedas (S/2 por cada S/100)</option>
              <option value="billetes">Billetes (S/1 por cada S/100)</option>
            </select>
          </div>
          <SelectCuenta
            name="cuenta_origen_id"
            label="Cuenta de donde sale el efectivo normal"
            opciones={cuentasPen}
          />
          <input
            type="hidden"
            name="cuenta_destino_id"
            value={cuentaMonedas?.id ?? ""}
          />
          <CampoMonto name="monto_nominal" label="Monto nominal cambiado (S/)" />
        </>
      )}

      {tipo === "prestamo_a_cliente" && (
        <>
          <CampoCliente opcional={false} />
          <SelectCuenta name="cuenta_origen_id" label="Cuenta de donde sale el dinero" opciones={cuentas} />
          <CampoMonto name="monto_origen" label="Monto prestado" />
        </>
      )}

      {tipo === "pago_deuda_cliente" && (
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
          <SelectCuenta name="cuenta_destino_id" label="Cuenta donde entra el pago" opciones={cuentas} />
          <CampoMonto name="monto_destino" label="Monto abonado" />
        </>
      )}

      {tipo === "deposito_sin_identificar" && (
        <>
          <SelectCuenta name="cuenta_destino_id" label="Banco donde entró el depósito" opciones={cuentasBanco} />
          <CampoMonto name="monto_destino" label="Monto depositado" />
        </>
      )}

      {tipo === "ajuste_correccion" && (
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
          <SelectCuenta name="cuenta_origen_id" label="Cuenta origen (opcional)" opciones={cuentas} opcionalVacio />
          <CampoMonto name="monto_origen" label="Monto origen (opcional)" opcional />
          <SelectCuenta name="cuenta_destino_id" label="Cuenta destino (opcional)" opciones={cuentas} opcionalVacio />
          <CampoMonto name="monto_destino" label="Monto destino (opcional)" opcional />
        </>
      )}

      {tipo && tipo !== "ajuste_correccion" && (
        <div>
          <label className="field-label" htmlFor="comentario">
            Comentario (opcional)
          </label>
          <input id="comentario" name="comentario" className="field-input" />
        </div>
      )}

      {tipo === "ajuste_correccion" && (
        <div>
          <label className="field-label" htmlFor="comentario">
            Motivo del ajuste (obligatorio)
          </label>
          <input id="comentario" name="comentario" required className="field-input" />
        </div>
      )}

      {error && <p className="text-sm text-rust">{error}</p>}
      {ok && <p className="text-sm text-brand-700">Transacción registrada ✓</p>}

      {tipo && (
        <button type="submit" className="btn-primary" disabled={pending}>
          {pending ? "Guardando…" : "Registrar transacción"}
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

function SelectCuenta({
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
