# 🚀 Plan Maestro: Sistema de Créditos de Campaña (Citenly)

Este documento detalla la hoja de ruta técnica para transformar el motor de campañas de un modelo descentralizado (YCloud individual) a un modelo de ingresos recurrente basado en **Créditos Citenly**.

## 1. 🏗 Estructura de Base de Datos (Supabase)

### Tabla `clinic_settings` (Añadir campos)
```sql
ALTER TABLE clinic_settings 
ADD COLUMN balance_credits INTEGER DEFAULT 0,
ADD COLUMN ai_credits_cost_clp INTEGER DEFAULT 100; -- Precio de venta al cliente (Ej: $100 CLP/msg)
```

### Nueva Tabla `credit_transactions`
Para auditoría y transparencia con el cliente.
```sql
CREATE TABLE credit_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clinic_id UUID REFERENCES clinic_settings(id),
    amount INTEGER NOT NULL, -- Positivo para compra, Negativo para gasto
    type VARCHAR(50) NOT NULL, -- 'purchase', 'campaign_send', 'refund'
    campaign_id UUID REFERENCES campaigns(id) NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

## 2. 🧠 Lógica del Motor de Envío (`send-whatsapp-campaign`)

Cuando el tiempo llegue, debemos actualizar la función de Supabase para realizar estas comprobaciones:

1.  **Validación de Saldo**:
    *   Consultar `balance_credits` antes de iniciar el bucle de envíos.
    *   Si `balance_credits < total_audience`, pausar la campaña y pedir recarga.

2.  **Descuento Atómico**:
    *   Por cada mensaje entregado por la API de YCloud, ejecutar un RPC en Supabase que reste 1 crédito y registre la transacción.
    *   `UPDATE clinic_settings SET balance_credits = balance_credits - 1 WHERE id = clinic_id;`

---

## 3. 💳 Interfaz de Usuario y Pasarela de Pagos

### Sección de "Recarga" en el CRM
1.  **Checkout Externo**: Usar los links de **Lemon Squeezy** (o Mercado Pago) que ya tienes.
2.  **Webhook de Éxito**: Crear una nueva Edge Function `handle-payment-webhook` que reciba la confirmación de pago y ejecute:
    *   Identificar el `clinic_id` del comprador.
    *   Aumentar su `balance_credits` automáticamente.

---

## 4. 📈 Beneficios del Modelo
*   **UX Premium**: El doctor nunca sale de Citenly. No ve interfaces complejas de APIs.
*   **Margen de Ganancia**: Citenly compra el mensaje a ~$70 CLP y lo vende a ~$100-110 CLP. 
*   **Control de Límites**: Al centralizar los números bajo una sola cuenta verificada de Citenly, eliminamos el límite de 250 mensajes de Meta.

---

> [!IMPORTANT]
> **Estado Actual**: Este plan está en espera hasta que tengas al menos 3 clínicas activas enviando volumen. La sección visual está en "Próximamente" para evitar errores de saldo de YCloud.
