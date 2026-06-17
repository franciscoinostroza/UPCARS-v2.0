# UPCARS — Manual del Sistema

## 1. Introducción

**UPCARS** es un sistema de automatización operativa para concesionarios de autos. Usa **Notion** como base de datos visual y fuente de verdad, y agrega un motor de automatizaciones serverless que gestiona:

- Ciclo de vida de vehículos (Comprado → Vendido)
- Flujo de autorización de conductores (Pendiente autorización → Autorizado)
- Órdenes de taller y tareas por área
- Tracking de SLA (Service Level Agreements) por etapa
- Alertas (SLA vencido, vehículo atascado, tarea vencida, sin responsable)
- KPIs por vehículo, empleado y por área
- **Rendimiento de ventas** (KPIs de autos vendidos, registro de ventas)
- Sincronización de reseñas de Google My Business
- **Notificaciones internas 🔔** (vía People column de Notion)
- Notificaciones por email

**Stack:** Next.js 16 + React 19 + Supabase + Notion API + Google My Business + Resend + Vercel

---

## 2. Máquina de Estados

Cada vehículo pasa por los siguientes estados (nombres reales desde Notion):

```
Comprado → Pendiente autorización → Autorizado → Entregado al concesionario
  │                                                                         │
  └──── En logística → En taller ↔ En chapa → En preparación → Listo para venta → Vendido
                          ↓                                                           ↓
                        Cedido ←─────────────────────────────────────────────────── Cedido
```

### Transiciones válidas

| Desde | Hacia |
|---|---|
| Comprado | Pendiente autorización, En logística |
| Pendiente autorización | Autorizado |
| Autorizado | Entregado al concesionario |
| Entregado al concesionario | En preparación |
| En logística | En taller, En chapa, Cedido |
| En taller | En chapa, En preparación |
| En chapa | En taller, En preparación |
| En preparación | Listo para venta |
| Listo para venta | Vendido, Cedido |
| Vendido | *(ninguno)* |
| Cedido | En logística, En taller |

---

## 3. Automatizaciones por Cambio de Estado

Cuando un vehículo cambia de estado (manualmente en Notion o desde el Dashboard), el sistema ejecuta automáticamente:

### → En logística
- Crea **evento de calendario** en la DB Calendario Operativo (título: "Logística - {vehículo}", estado "Programado")
- Crea **orden de taller** tipo Logística con responsable asignado
- Crea **tarea** "Organizar logística" (prioridad Alta, departamento Logística)
- Inicia **SLA** de Logística (24h)

### → En taller
- Crea **orden de taller** tipo Taller con mecánico asignado (estado "En proceso")
- Crea **tarea** "Revisión mecánica" (prioridad Alta, departamento Taller)
- Inicia **SLA** de Taller (72h / 3 días)

### → En chapa
- Crea **registro en Chapa y Pintura** (estado "En taller externo", fecha salida, notas)
- Crea **tarea** "Gestionar chapa y pintura" (prioridad Alta, departamento Taller)
- Inicia **SLA** de Chapa (120h / 5 días)

### → Entregado al concesionario
- **Fija automáticamente** la fecha en el campo "Fecha entrada preparación"
- Crea **orden de taller** tipo Preparación con notas "Vehículo recibido en concesionario"
- Crea **tarea** "Recibir y preparar" (prioridad Alta, departamento Taller)
- Inicia **SLA** de Preparación (24h / 1 día)
- Notifica al Preparador (Víctor)

### → En preparación
- Crea **orden de taller** tipo Preparación con preparador asignado (estado "En proceso")
- Crea **tarea** "Checklist limpieza" (prioridad Alta, departamento Taller)
- Crea **tarea** "Preparar vehículo" (prioridad Alta, departamento Taller)
- Inicia **SLA** de Preparación (24h / 1 día)

### → Listo para venta
- **Fija automáticamente** la fecha en el campo "Fecha listo para venta"
- Crea **tarea** "Publicar vehículo" (prioridad Media, departamento Marketing)
- Crea **tarea** "Gestionar venta" (prioridad Alta, departamento Ventas)
- Cierra SLA de Preparación (si venía de ahí)

### Transiciones que cierran SLA automáticamente
Al salir de cualquier área con SLA (Logística, Taller, Chapa, Preparación), el sistema cierra el registro SLA y calcula si se cumplió el threshold.

---

## 4. Sistema de SLA

### Thresholds por área

| Área (estado Origen) | Threshold | Variable de entorno |
|---|---|---|
| En logística | 24h | `SLA_LOGISTICA` |
| En taller | 72h (3 días) | `SLA_TALLER` |
| En chapa | 120h (5 días) | `SLA_CHAPA` |
| En preparación | 24h (1 día) | `SLA_PREPARACION` |

### ¿Cómo funciona?

1. Cuando un vehículo **entra** a un estado con SLA, se crea un registro en `sla_records` (Supabase) con `start_time` y `threshold`.
2. Cuando el vehículo **sale** del estado, se cierra el registro con `end_time` y se calcula `met` (true si el tiempo real ≤ threshold).
3. El cron cada hora revisa registros abiertos y genera alertas `sla_violation` para los que exceden el threshold.

### KPIs disponibles

| KPI | Descripción | Dónde se ve |
|---|---|---|
| **Tiempo promedio por área** | Horas promedio que los vehículos pasan en cada área | Dashboard, sección SLA |
| **% Cumplimiento** | Porcentaje de vehículos que cumplieron el SLA por área | Dashboard, sección SLA |
| **Cuellos de botella** | Áreas ordenadas por mayor tiempo promedio | Dashboard, sección Cuellos de botella |
| **KPIs por vehículo** | Desglose por vehículo: horas por área, si cumplió | Endpoint `/api/kpis` |
| **Tiempo total ciclo** | Días desde Comprado hasta Listo/Vendido | Endpoint `/api/kpis`, chip en dashboard |

---

## 5. Alertas

### Tipos de alerta

| Tipo | Condición | Icono |
|---|---|---|
| `sla_violation` | SLA excedido en cualquier área | ⏰ |
| `vehicle_no_responsible` | Vehículo sin responsable asignado (excepto Vendido) | 👤 |
| `stuck_in_{estado}` | Vehículo supera umbral de días en un estado | 🚫 |
| `task_overdue` | Tarea en Notion con fecha límite vencida | 📋 |

### Umbrales de "atascado" por estado

| Estado | Días antes de alertar |
|---|---|
| Comprado | 7 |
| Pendiente autorización | 7 |
| Autorizado | 7 |
| Entregado al concesionario | 7 |
| En logística | 3 |
| En taller | 5 |
| En chapa | 7 |
| En preparación | 2 |
| Listo para venta | 14 |
| Cedido | 30 |

### ¿Cómo se generan?

El cron **"cron-hourly"** ejecuta `GET /api/cron/alerts` cada hora, que corre:
1. `checkSLAAlerts()` — vehículos con SLA abierto que ya excedieron el threshold
2. `checkVehicleAlerts()` — vehículos sin responsable + vehículos atascados por estado
3. `checkTaskAlerts()` — tareas en Notion con "Fecha límite" vencida y estado ≠ Completada

### Notificaciones

Cada alerta nueva **envía un email** al `ADMIN_EMAIL` vía Resend con:
- Asunto: "⚠️ UPCARS Alerta: {mensaje}"
- Cuerpo: mensaje, vehículo, tipo, fecha

Además del email, las alertas también **generan una notificación 🔔 en Notion** asignada a:
- **Alertas de vehículo** (atasco, sin responsable): José, Luis Miguel, David
- **Alertas SLA**: el staff + el responsable del área correspondiente
- **Tareas vencidas**: el responsable asignado a la tarea

Las notificaciones se crean en la DB "Notificaciones" de Notion y aparecen como campanita 🔔 en la interfaz de Notion de cada usuario.

### Cómo resolver una alerta

1. **Desde el Dashboard:** botón "✓" en cada alerta
2. **API:** `PATCH /api/alerts/{id}` — marca `resolved=true`

---

## 6. KPIs de Empleados

### ¿Qué mide?

| Métrica | Descripción |
|---|---|
| Tareas completadas | Tareas en Notion asignadas al empleado con estado "Completada" |
| Total tareas | Todas las tareas asignadas al empleado |
| Eficiencia | Porcentaje = (completadas / total) × 100 |

### ¿Cómo se calcula?

`getEmployeeKPIs()` obtiene:
1. Todos los empleados activos desde Notion
2. Todas las tareas desde Notion
3. Agrupa por responsable y cuenta completadas vs total

### Código de colores (Dashboard)

| Eficiencia | Color |
|---|---|
| ≥ 80% | Verde |
| 50-79% | Amarillo |
| < 50% | Rojo |

---

## 7. Integración Google My Business

### ¿Qué hace?

Sincroniza reseñas de Google My Business a una base de datos de Notion cada **15 minutos**.

### Flujo

1. `GET /api/cron/reviews` ejecuta `syncGoogleReviews()`
2. Obtiene token OAuth2 usando `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET` + `GOOGLE_REFRESH_TOKEN`
3. Consulta todas las reseñas de la cuenta configurada
4. Compara contra reseñas ya existentes en Notion (deduplication por `reviewId`)
5. Crea páginas nuevas en la DB "Reseñas Google" con:
   - Autor, puntuación (1-5), comentario, fecha, enlace, estado "Pendiente"
6. Si hay reseñas nuevas, envía **email de notificación** al admin

### Datos sincronizados por reseña

| Campo | Tipo en Notion |
|---|---|
| Autor | Title |
| Puntuación | Number (1-5) |
| Fecha de publicación | Date |
| Estado de respuesta | Select (Pendiente) |
| ID de reseña | Rich text |
| Comentario | Rich text |
| Enlace a reseña | URL |

---

## 8. Endpoints de la API

### Rutas Públicas

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/health` | Health check (Notion + Supabase) |
| GET | `/api/kpis` | Todos los KPIs del dashboard (incluye sales KPIs) |
| GET | `/api/vehicles` | Pipeline de vehículos (agrupados por estado). `?list=true` para lista plana |
| POST | `/api/vehicles` | Crear nuevo vehículo en Notion |
| PATCH | `/api/vehicles/{id}` | Cambiar estado de un vehículo (valida transición) |
| PATCH | `/api/vehicles/{id}/assign` | Asignar responsable a un vehículo |
| GET | `/api/employees` | Listar empleados activos |
| POST | `/api/workshop-orders` | Crear orden de taller |
| PATCH | `/api/alerts/{id}` | Resolver una alerta |
| GET | `/api/ventas` | Listar ventas + KPIs de rendimiento (total vendidos, precio prom., margen, por mes, por empleado) |
| POST | `/api/ventas` | Crear un registro de venta manual |

### Rutas de Cron (protegidas con `CRON_SECRET`)

| Método | Ruta | Frecuencia | Descripción |
|---|---|---|---|
| GET | `/api/cron/sync` | Cada 5 min | Sincronización principal: detecta cambios en Notion, ejecuta automatizaciones, logea eventos + **notifica cambios de estado** + **auto-crea ventas** cuando un vehículo se vende |
| GET | `/api/cron/sla` | Cada hora | Revisa SLA abiertos y reporta violaciones |
| GET | `/api/cron/alerts` | Cada hora | Genera alertas (SLA, atascados, tareas vencidas) + **notifica 🔔** a los responsables |
| GET | `/api/cron/reviews` | Cada 15 min | Sincroniza reseñas de Google My Business + **notifica 🔔** a todos los empleados activos |
| GET | `/api/cron/cleanup-notifications` | Cada 3 días | Archiva notificaciones con más de 3 días de antigüedad |

**Autenticación:** Los endpoints de cron requieren header `Authorization: Bearer {CRON_SECRET}`. Si `CRON_SECRET` no está configurado, se omiten los checks.

> **Importante:** En producción, `CRON_SECRET` debe configurarse tanto en las **variables de entorno de Vercel** como en los **secrets de GitHub Actions** con el mismo valor. GitHub Actions ya está configurado para pasar el header automáticamente si el secret existe.

---

## 9. Páginas del Frontend

### `/` — Home
Pantalla de inicio con estado del sistema:
- Conexión Notion / Supabase
- Total vehículos
- Enlaces a todas las secciones: Dashboard, Ventas, Tareas, Noticias, Botones, Bases de datos, Health

### `/dashboard` — Dashboard Operativo
Panel principal con auto-refresh cada 30 segundos:

| Sección | Contenido |
|---|---|
| **Stats chips** | Eventos totales, vehículos en pipeline, alertas activas, ratio SLA cumplido |
| **Pipeline Kanban** | Columnas por estado. Botones para mover vehículos al siguiente estado |
| **Cumplimiento SLA** | Barras por área con promedio de horas y % de cumplimiento |
| **Cuellos de botella** | Áreas ordenadas por mayor tiempo promedio, con colores |
| **Alertas activas** | Lista de alertas con botón de resolver |
| **Rendimiento empleados** | Tarjetas por empleado: nombre, rol, eficiencia, tareas completadas/total |

### `/ventas` — Rendimiento de Ventas
Panel de métricas comerciales:

| Sección | Contenido |
|---|---|
| **KPIs** | Total vendidos, precio promedio, margen promedio, días promedio, ingreso total |
| **Gráfico mensual** | Barras de cantidad de ventas por mes |
| **Rendimiento por empleado** | Tabla: empleado, cantidad vendida, ingresos, margen generado |
| **Ventas registradas** | Tabla con detalle de cada venta (cliente, precio, margen, fecha, forma de pago) |

Los KPIs se calculan desde la DB Vehículos (estado `Vendido` + `fechaVendido`) y la DB Ventas (registros de venta con cliente, vendedor, forma de pago).

### `/botones` — Acciones rápidas (touch-friendly)
Formularios modales para operaciones comunes:
- **Nuevo vehículo** — todos los campos del vehículo
- **Mover vehículo** — seleccionar vehículo y destino
- **Asignar responsable** — seleccionar vehículo y empleado
- **Nueva orden taller** — tipo y vehículo
- Botones: "Forzar sync", "Resolver alertas"

### `/health` — Health Check
Detalle de estado del sistema:
- Servicios (Notion, Supabase)
- Uptime, vehículos sincronizados, alertas activas
- Listado de tablas en base de datos

---

## 10. Variables de Entorno

### Notion (IDs de bases de datos)

```
NOTION_TOKEN=<token>
VEHICLES_DB_ID=<id>
TASKS_DB_ID=<id>
WORKSHOP_DB_ID=<id>
EMPLOYEES_DB_ID=<id>
LOGISTICS_DB_ID=<id>
CHAPA_DB_ID=<id>
PREPARACION_DB_ID=<id>
VENTAS_DB_ID=<id>
CALENDARIO_OPERATIVO_DB_ID=<id>
CALENDARIO_RRHH_DB_ID=<id>
MARKETING_DB_ID=<id>
GOOGLE_REVIEWS_DB_ID=<id>
PROVIDERS_DB_ID=<id>
FINANCIERAS_DB_ID=<id>
OPERACIONES_FINANCIADAS_DB_ID=<id>
FINANZAS_DB_ID=<id>
BUZON_MEJORA_DB_ID=<id>
NOTICIAS_DB_ID=<id>            # Tablón de noticias
NOTIFICACIONES_DB_ID=<id>      # Notificaciones 🔔
```

### Supabase

```
SUPABASE_URL=<url>
SUPABASE_SERVICE_KEY=<key>
```

### Google My Business

```
GOOGLE_CLIENT_ID=<id>
GOOGLE_CLIENT_SECRET=<secret>
GOOGLE_REFRESH_TOKEN=<token>
GOOGLE_ACCOUNT_ID=<id>
```

### Email (Resend)

```
RESEND_API_KEY=<key>
ADMIN_EMAIL=<email>
EMAIL_FROM="UPCARS <alertas@upcars.com>"
```

### SLA Thresholds (horas)

```
SLA_TALLER=72
SLA_CHAPA=120
SLA_PREPARACION=24
SLA_LOGISTICA=24
```

### Cron

```
CRON_SECRET=<token>  # Requerido en producción para proteger los endpoints de cron
```

### Opcionales

```
NODE_ENV=production
PORT=3000
```

---

## 11. Base de Datos (Supabase)

### Tabla: `vehicle_events`

| Columna | Tipo | Descripción |
|---|---|---|
| `id` | bigint PK | Auto-increment |
| `vehicle_id` | text | ID de página en Notion |
| `vehicle_name` | text | Nombre del vehículo |
| `old_state` | text | Estado anterior (nullable) |
| `new_state` | text | Nuevo estado |
| `created_at` | timestamptz | Fecha del evento |

### Tabla: `sla_records`

| Columna | Tipo | Descripción |
|---|---|---|
| `id` | bigint PK | Auto-increment |
| `vehicle_id` | text | ID del vehículo |
| `area` | text | Área (Taller, Chapa, etc.) |
| `start_time` | timestamptz | Entrada al área |
| `end_time` | timestamptz | Salida del área (nullable) |
| `threshold` | float | SLA en horas |
| `met` | boolean | Si cumplió SLA (nullable) |
| `created_at` | timestamptz | Fecha de creación |

### Tabla: `alert_records`

| Columna | Tipo | Descripción |
|---|---|---|
| `id` | bigint PK | Auto-increment |
| `vehicle_id` | text | ID del vehículo (nullable) |
| `vehicle_name` | text | Nombre del vehículo/tarea |
| `type` | text | Tipo de alerta |
| `message` | text | Mensaje descriptivo |
| `resolved` | boolean | Si está resuelta (default false) |
| `created_at` | timestamptz | Fecha de creación |
| `resolved_at` | timestamptz | Fecha de resolución (nullable) |

---

## 12. Bases de Datos en Notion

El sistema utiliza **19 bases de datos** en Notion:

| Nombre lógico | Variable de entorno | Propósito |
|---|---|---|
| vehicles | `VEHICLES_DB_ID` | Catálogo maestro de vehículos |
| employees | `EMPLOYEES_DB_ID` | Empleados con roles y departamentos |
| tasks | `TASKS_DB_ID` | Tareas operativas |
| workshop | `WORKSHOP_DB_ID` | Órdenes de taller |
| providers | `PROVIDERS_DB_ID` | Lista de empresas proveedoras |
| logistics | `LOGISTICS_DB_ID` | Registros de logística |
| chapa | `CHAPA_DB_ID` | Órdenes de chapa/pintura |
| preparacion | `PREPARACION_DB_ID` | Órdenes de preparación |
| ventas | `VENTAS_DB_ID` | Registros de ventas |
| calendario_operativo | `CALENDARIO_OPERATIVO_DB_ID` | Eventos operativos (logística, taller, etc.) |
| calendario_rrhh | `CALENDARIO_RRHH_DB_ID` | Eventos de RRHH |
| marketing | `MARKETING_DB_ID` | Campañas y acciones de marketing |
| reviews | `GOOGLE_REVIEWS_DB_ID` | Reseñas de Google |
| financieras | `FINANCIERAS_DB_ID` | Entidades financieras |
| operaciones_financiadas | `OPERACIONES_FINANCIADAS_DB_ID` | Operaciones con financiación |
| finanzas | `FINANZAS_DB_ID` | Registros financieros |
| buzon_mejora | `BUZON_MEJORA_DB_ID` | Buzón de sugerencias y mejoras |
| noticias | `NOTICIAS_DB_ID` | Tablón de noticias / anuncios |
| notificaciones | `NOTIFICACIONES_DB_ID` | Notificaciones 🔔 (se asignan a personas vía People column) |

---

## 13. Cron Jobs (GitHub Actions)

### `cron-sync.yml` — Cada 5 minutos
```yaml
- calls GET /api/cron/sync
- Detecta cambios de estado en Notion
- Ejecuta automatizaciones
- Logea eventos a Supabase
```

### `cron-reviews.yml` — Cada 15 minutos
```yaml
- calls GET /api/cron/reviews
- Sincroniza reseñas de Google My Business → Notion
- Envía email si hay nuevas
```

### `cron-hourly.yml` — Cada hora
```yaml
- calls GET /api/cron/sla
- calls GET /api/cron/alerts
- Genera alertas de SLA, vehículos atascados, tareas vencidas
- Notifica 🔔 a los responsables
```

### `cleanup-notifications.yml` — Cada 3 días
```yaml
- calls GET /api/cron/cleanup-notifications
- Archiva notificaciones de la DB Notificaciones con más de 3 días
```

---

## 14. Cómo Usar el Sistema

### Flujo diario

1. **Revisar el Dashboard** (`/dashboard`) al empezar el día
2. **Pipeline Kanban** muestra todos los vehículos activos por estado
3. **Alertas** muestra problemas que requieren atención
4. **Cuellos de botella** muestra qué área está tardando más
5. **Rendimiento empleados** muestra carga de trabajo por persona

### Mover un vehículo

**Opción 1 — Dashboard:** Click en el botón del estado destino en la tarjeta del vehículo (ej. botón 🔧 para mover a Taller)

**Opción 2 — Botones:** `/botones` → "Mover vehículo" → seleccionar vehículo y destino

**Opción 3 — Notion:** Cambiar el campo "Status" directamente en la base de datos de vehículos. El cron detectará el cambio en ≤5 minutos.

### Crear un vehículo nuevo

`/botones` → "Nuevo vehículo" → completar formulario. Se crea en Notion con estado "Comprado".

### Resolver una alerta

Dashboard → click "✓" en la alerta. Se marca como resuelta en Supabase.

---

## 15. Estructura del Vehículo (Vehicle type)

### Campos extraídos desde Notion

| Campo | Tipo | Propiedad en Notion | Función de parseo |
|---|---|---|---|
| `id` | string | ID de página | — |
| `name` | string | Nombre / ID (title) | `tv()` |
| `matricula` | string | Matricula / VIN (rich_text) | `rtv()` |
| `brand` | string | Marca (rich_text) | `rtv()` |
| `model` | string | Modelo (rich_text) | `rtv()` |
| `year` | number | Año (number) | `num()` |
| `lineaNegocio` | string | Línea de Negocio (select) | `sel()` |
| `tipo` | string | Tipo de vehículos (select) | `sel()` |
| `state` | VehicleState | Estado Actual (select) | `sel()` |
| `combustible` | string | Combustible (select) | `sel()` |
| `color` | string | Color (rich_text) | `rtv()` |
| `kilometrajeEntrada` | number \| null | Kilometraje entrada (number) | `num()` |
| `fechaCompra` | string | Fecha de compra (date) | `dateVal()` |
| `fechaEntradaTaller` | string \| null | Fecha entrada taller (date) | `dateVal()` |
| `fechaEntradaPreparacion` | string \| null | Fecha entrada preparación (date) | `dateVal()` |
| `fechaListo` | string \| null | Fecha listo para venta (date) | `dateVal()` |
| `fechaVendido` | string \| null | Fecha de venta (date) | `dateVal()` |
| `responsable` | string \| null | Responsable Actual (relation) | `rel()` |
| `precioCompra` | number \| null | Precio de compra (€) (number) | `num()` |
| `precioVenta` | number \| null | Precio venta (€) (number) | `num()` |
| `notas` | string | Notas (rich_text) | `rtv()` |
| `tiempoTotalDias` | number \| null | Tiempo total (días) (formula) | `formulaNum()` |
| `diasActivoSinCerrar` | number \| null | Días activo sin cerrar (formula) | `formulaNum()` |
| `margenBruto` | number \| null | Margen bruto (€) (formula) | `formulaNum()` |

### Cálculo de días en estado (pipeline)

En el endpoint `GET /api/vehicles`, se calcula `daysInState` según el estado actual:

| Estado | Fecha de referencia |
|---|---|
| En taller | `fechaEntradaTaller` |
| En preparación | `fechaEntradaPreparacion` |
| Otros | `fechaCompra` |

---

## 16. Sistema de Notificaciones 🔔

### ¿Cómo funciona?

Cada vez que ocurre un evento relevante, el sistema crea una página en la DB **"Notificaciones"** de Notion y asigna personas en la columna **Asignado** (tipo `people`). Esto activa la campanita 🔔 automática en la interfaz de Notion de cada usuario asignado.

### ¿Quién recibe cada notificación?

El sistema busca los emails en la DB **Empleados** en tiempo real. Si el email del empleado coincide con una cuenta de Notion en el workspace, recibe la 🔔. Si no, simplemente no se asigna (no hay error).

| Evento | Notifica a | Cómo se determina |
|---|---|---|
| **Vehículo → Logística** | Empleado con rol Logística | `getEmployeeByRole('Logística')` |
| **Vehículo → Taller** | Empleado con rol Mecánico | `getEmployeeByRole('Mecánico')` |
| **Vehículo → Chapa** | Luis Miguel, Víctor, José | `getEmployeesByNames()` |
| **Vehículo → Preparación** | Empleado con rol Preparador (Víctor) | `getEmployeeByRole('Preparador')` |
| **Vehículo → Listo para venta** | Luis Miguel, José | `getEmployeesByNames()` |
| **Autorizado** | Conductor asignado (Responsable Actual) | `vehicle.responsable → employee.email` |
| **Entregado al concesionario** | Preparador (Víctor) | `getEmployeeByRole('Preparador')` |
| **Tarea creada** | Empleado asignado a la tarea | `responsableId → employee.email` |
| **Noticia publicada** | Todos los empleados activos con email | `getEmployees().filter(active && email)` |
| **Reseña Google nueva** | Todos los empleados activos con email | `getEmployees().filter(active && email)` |
| **Alerta de vehículo** (atasco, sin responsable) | José, Luis Miguel, David | `getEmployeesByNames()` |
| **Alerta SLA** | Staff + responsable del área | `getEmployeesByNames()` + `getEmployeeByRole()` |
| **Tarea vencida** | Responsable de la tarea | `task.Responsable → employee.email` |

### Cleanup automático

Las notificaciones con más de **3 días** se archivan automáticamente cada 3 días vía `GET /api/cron/cleanup-notifications`.

### DB Notificaciones

| Columna | Tipo | Descripción |
|---|---|---|
| Título | title | Título de la notificación |
| Cuerpo | rich_text | Contenido con autor, link, mensaje |
| Asignado | people | Usuarios de Notion que reciben la 🔔 |
| Link | url | Enlace opcional relacionado |
| Leída | checkbox | Control de lectura (pendiente de implementar en frontend) |
| Fecha | date | Fecha de creación |

---

## 17. Rendimiento de Ventas 💰

### ¿Qué mide?

El sistema calcula automáticamente métricas de rendimiento comercial a partir de:
- **Vehículos con estado `Vendido`** en la DB Vehículos
- **Registros en la DB Ventas** (con cliente, vendedor, forma de pago)

### KPIs disponibles

| Métrica | Cálculo | Dónde se ve |
|---|---|---|
| Total vendidos | Cantidad de vehículos con estado `Vendido` | Dashboard, `/ventas` |
| Precio de venta promedio | `avg(precioVenta)` de todos los vendidos | `/ventas` |
| Margen bruto promedio | `avg(margenBruto)` de todos los vendidos | `/ventas` |
| Días totales promedio | `avg(fechaVendido - fechaCompra)` | `/ventas` |
| Días en venta promedio | `avg(fechaVendido - fechaListo)` | `/ventas` |
| Ingreso total | `sum(precioVenta)` de todos los vendidos | `/ventas` |
| Ventas por mes | Agrupación por mes de `fechaVendido` | `/ventas` (gráfico) |
| Rendimiento por empleado | Ventas + margen agrupado por responsable | `/ventas` |

### Auto-creación de ventas

Cuando un vehículo cambia a estado **`Vendido`** (detectado por el cron sync), el sistema crea automáticamente un registro en la DB Ventas con los datos disponibles:
- Nombre: `Venta - {vehicleName}`
- Vehículo: relación al vehículo
- Fecha de venta: columna `fechaVendido` del vehículo (o fecha actual)
- Precio de venta: columna `precioVenta` del vehículo
- Vendedor: columna `Responsable Actual` del vehículo

El usuario puede completar los datos faltantes (cliente, forma de pago, etc.) después desde Notion o vía `POST /api/ventas`.

---

## 18. Arquitectura General

```
GitHub Actions (Cron) ──► Vercel (Next.js App)
                                │
                    ┌───────────┼──────────────┐
                    │           │              │
                    ▼           ▼              ▼
                  Notion     Supabase      Google My Bus.
              (19 DBs + 🔔)  (3 tablas)     (Reviews)
                    │
                    ├──► Resend (Email)
                    │
                    └──► 🔔 Notion Notifications (People column)
```

- **Source of Truth:** Notion (todo el dato operativo vive aquí, incluyendo notificaciones)
- **Estado transicional:** Supabase (eventos, SLA, alertas)
- **UI:** Next.js en Vercel (dashboard + botones + ventas + health)
- **Cron:** GitHub Actions (gatillan los workers serverless)
- **Email:** Resend (notificaciones de alertas y reviews)
- **Notificaciones 🔔:** Notion People column (campanita 🔔 interna)
- **Reviews:** Google My Business API
