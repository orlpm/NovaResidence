# Servicios y procesos de DomusCond

DomusCond vende la operación diaria de un condominio como un solo servicio. El administrador, la caseta, el contador, el residente y el proveedor trabajan sobre los mismos hechos: quién vive, quién entró, qué se debe y qué decidió la asamblea.

Este documento recorre cada servicio desde que una persona entra hasta que el hecho queda registrado. El detalle de estados, excepciones y pantallas está en [BUSINESS-PROCESSES.md](BUSINESS-PROCESSES.md).

## Cómo leer un diagrama

Cada flecha es un paso que alguien hace o que la plataforma deja asentado. El rombo es una decisión. El proceso termina cuando la otra parte ya puede ver el resultado.

## La oferta

| Servicio | A quién le ahorra trabajo | Qué queda demostrado |
| --- | --- | --- |
| Acceso y sesión | A cada rol, para no compartir una cuenta | Quién entró y que el correo es suyo |
| Alta del condominio | Al administrador nuevo | Torres, unidades y primeras invitaciones |
| Comunidad | A administración y a caseta | Residente, personal y proveedor ligados a una unidad o a un rol |
| Caseta y QR | Al guardia y al residente | Entrada y salida de la visita, una sola vez |
| Paquetería | A caseta | El residente sabe que su paquete llegó |
| Rondas y cámaras | A vigilancia | Bitácora del recorrido y plano con la fuente de video |
| Cuotas y multas | Al contador y al residente | Un solo estado de cuenta y un folio de recibo |
| Incidencias y proveedores | A mantenimiento, limpieza y proveedores | Quién tiene la orden y cuándo se citó |
| Estacionamiento | A administración | Cajón y placa del residente, aparte de la visita |
| Áreas y amenidades | Al residente | Solicitud, aprobación y calendario |
| Gobierno del condominio | A la mesa directiva | Aviso, voto por unidad y acta |
| Expediente | A administración | Reglamento, contrato e identificación publicados |
| Suscripción de la plataforma | Al operador del SaaS | Plan, acceso y condonación, separados de la cuota |

La cuota del residente y la suscripción del administrador son dos dineros. No se mezclan.

```mermaid
flowchart TD
    A[Administrador contrata DomusCond] --> B[Configura condominio, torres y unidades]
    B --> C[Invita residentes y da de alta al personal]
    C --> D[Operación del día]
    D --> E[Caseta registra visita, paquete o ronda]
    D --> F[Contador carga cuotas y el residente paga]
    D --> G[Se reporta una incidencia o se reserva un área]
    D --> H[La mesa publica aviso, encuesta o asamblea]
    E --> I[El residente ve el resultado en su panel]
    F --> I
    G --> I
    H --> I
```

## 1. Acceso y sesión

**Qué se vende.** Una puerta de entrada por rol. El residente no ve la caseta. El guardia no ve la cobranza de la plataforma.

**Valor.** Se evita la cuenta compartida del comité. Si la persona olvida la contraseña, recupera el acceso sin llamar a soporte.

```mermaid
flowchart TD
    A[Abre DomusCond] --> B{Ya tiene cuenta}
    B -->|No| C[Se registra]
    C --> D[Recibe el correo de confirmación]
    D --> E[Abre el enlace]
    B -->|Sí| F[Escribe correo y contraseña]
    E --> F
    F --> G{El correo está confirmado}
    G -->|No| H[Puede reenviar la confirmación]
    H --> D
    G -->|Sí| I{La suscripción del administrador sigue vigente}
    I -->|No| J[Ve la pantalla para reactivarla]
    I -->|Sí| K[Entra al panel de su rol]
    F --> L[Olvidó la contraseña]
    L --> M[Pide el enlace y define una nueva]
    M --> F
```

El personal que crea un administrador autenticado queda confirmado y no espera correo. El registro público sí espera la confirmación antes de entrar.

## 2. Alta del administrador y suscripción

**Qué se vende.** El arranque del cliente: una cuenta de administrador y un plan por unidad.

**Valor.** El edificio empieza sin que el operador del SaaS capture a mano cada torre. Si el pago de la plataforma se atrasa, el acceso se corta y se vuelve a abrir al condonar, sin tocar las cuotas de los residentes.

```mermaid
flowchart TD
    A[Elige un plan y se registra] --> B[Confirma su correo]
    B --> C[Primer inicio de sesión]
    C --> D[Asistente de configuración]
    D --> E[Datos del condominio]
    E --> F[Torres o edificios]
    F --> G[Unidades]
    G --> H[Invitación de los primeros residentes]
    H --> I[El avance se guarda si sale a la mitad]
    I --> J[Condominio listo para operar]
    J --> K{El SuperAdmin cambia el plan, cancela o condona}
    K -->|Cancela| L[El panel pide reactivar]
    K -->|Condona o cambia el plan| J
```

El cobro con tarjeta de esta suscripción ya opera en el sandbox de OpenPay. Cambiar el plan, cancelar o condonar no exige un cargo. El comercio de producción sigue fuera.

## 3. Puesta en marcha del condominio

**Qué se vende.** El edificio queda descrito como lo recorre la gente: condominio, torre, unidad, residente.

**Valor.** Administración deja de llevar el padrón en una hoja. Caseta, cobranza y asamblea usan la misma unidad.

```mermaid
flowchart TD
    A[Administrador abre Condominios] --> B[Captura nombre, dirección, país y estado]
    B --> C[Guarda el condominio]
    C --> D[Agrega una torre]
    D --> E{Genera las unidades en automático}
    E -->|Sí| F[Nacen las unidades de la torre]
    E -->|No| G[Captura cada unidad]
    F --> H[Asigna residente o envía invitación]
    G --> H
    H --> I[La unidad ya se puede cobrar, visitar y convocar]
```

El administrador puede corregir después el nombre y la dirección. El país y el estado salen del catálogo. Si el país tiene estados, hay que elegir uno.

## 4. Comunidad: residentes, personal y proveedores

**Qué se vende.** El padrón vivo del edificio y el equipo que lo opera.

**Valor.** Un aviso, una multa o un paquete llegan a la persona de esa unidad. Vigilancia, mantenimiento y limpieza entran con su propio panel. El proveedor solo ve lo que le encargan.

```mermaid
flowchart TD
    A[Administrador elige una unidad] --> B[Crea la invitación del residente]
    B --> C[El residente abre el enlace]
    C --> D{La invitación sigue vigente}
    D -->|No| E[Pide un enlace nuevo]
    D -->|Sí| F[Completa su cuenta]
    F --> G[Queda ligado a la unidad]
    G --> H[Ya recibe avisos, cuotas y paquetes]
    A --> I[Da de alta vigilancia, mantenimiento o limpieza]
    I --> J[El personal entra confirmado a su panel]
    A --> K[Registra un proveedor]
    K --> L[Le asigna el rol en ese condominio]
    L --> M[Ve incidencias y citas de ese edificio]
```

Sin ese vínculo, el residente existe en el padrón y no recibe las notificaciones. El formulario de personal ofrece mantenimiento, vigilancia y limpieza. El proveedor se incorpora por su propio rol.

## 5. Caseta y visitas con QR

**Qué se vende.** El control de quién entra, sin una libreta y sin que el guardia pregunte el nombre en voz alta.

**Valor.** El residente autoriza antes. El visitante trae un código. Caseta registra la entrada y la salida. El residente recibe el aviso de que su visita llegó. Un código de otro edificio no revela si existe.

```mermaid
flowchart TD
    A[Residente registra la visita del día] --> B[Nace pendiente y con código NRV]
    B --> C[Vigilancia recibe Nueva visita]
    B --> D[El residente muestra el QR]
    D --> E[Caseta escanea, sube la foto o teclea el código]
    E --> F{El código es de este condominio y está en horario}
    F -->|No| G[Caseta ve código no válido]
    F -->|Sí| H{La visita ya está adentro}
    H -->|No| I[Registra la entrada]
    I --> J[El residente recibe Tu visita llegó]
    H -->|Sí| K[El mismo código registra la salida]
    C --> L{Administración la rechaza}
    L -->|Sí, con motivo| M[La visita no puede entrar]
```

El pase abre desde dos horas antes de la llegada prevista hasta una hora después de la salida prevista. Si no hay hora de salida, queda abierto trece horas desde la llegada. Sirve para una sola entrada. Rechazada, cancelada o finalizada, no entra.

Estados de la visita: pendiente, aprobada, rechazada, adentro y finalizada. La entrada se puede tomar desde pendiente o aprobada. La salida solo desde adentro.

## 6. Paquetería

**Qué se vende.** La recepción de paquetes en caseta, con aviso al departamento correcto.

**Valor.** El residente no baja a preguntar. Caseta no depende de un chat para avisar.

```mermaid
flowchart TD
    A[Llega un paquete a caseta] --> B[Vigilancia elige condominio y unidad]
    B --> C[Anota la descripción]
    C --> D[El paquete queda recibido]
    D --> E[El residente de esa unidad recibe Paquete recibido]
    E --> F[Lo consulta en su panel]
```

El servicio deja constancia de la recepción. No acusa la entrega al repartidor ni se conecta con la paquetería.

## 7. Rondas y cámaras

**Qué se vende.** La evidencia de que el recorrido se hizo y un plano para ubicar la cámara.

**Valor.** La bitácora de rondas no se mezcla con el libro de visitas. El comité ve el plano. Vigilancia abre la fuente de video que administración ya configuró.

```mermaid
flowchart TD
    A[Vigilancia inicia una ronda] --> B[Anota zona y notas]
    B --> C[La bitácora queda en el libro de rondas]
    D[Administrador publica el plano] --> E[Coloca marcadores]
    E --> F{El marcador es una cámara}
    F -->|Sí| G[Vigilancia abre Cámaras]
    G --> H[Ve la transmisión o el enlace de la fuente]
    F -->|No| I[El marcador solo ubica el punto en el plano]
```

La ronda no trae recorrido GPS ni checklist de puestos. DomusCond no graba video: reproduce el URL que el condominio ya tiene.

## 8. Cuotas, recibos y multas

**Qué se vende.** El estado de cuenta de la unidad, con recibo foliado, y la multa dentro de ese mismo estado.

**Valor.** El residente ve un solo saldo. El contador no lleva una libreta paralela para las multas. El folio existe desde que se registra el pago.

```mermaid
flowchart TD
    A[Administrador configura la cuota] --> B[Genera cargos por unidad]
    B --> C[El residente abre su estado de cuenta]
    C --> D{Cómo registra el pago}
    D -->|Efectivo u otro método sin archivo| E[Registra el pago]
    D -->|Transferencia| F[Adjunta el comprobante]
    F --> E
    E --> G[El cargo pasa a pagado o parcial]
    G --> H[Nace el recibo REC]
    I[Administrador captura una multa] --> J[Nace un cargo de multa a 15 días]
    J --> K[El residente recibe Nueva multa]
    K --> C
```

Administración puede verificar después el pago. El folio no espera esa verificación. No hay CFDI, domiciliación ni cargo con tarjeta del residente hacia la cuota. El pago es un registro de la administración del edificio.

## 9. Incidencias y agenda de proveedores

**Qué se vende.** Una orden de trabajo con responsable, y una cita cuando el trabajo es de un externo.

**Valor.** El residente reporta una vez. Mantenimiento, limpieza o el proveedor ven la orden en su panel. El comité deja de perseguir el avance por mensajes.

```mermaid
flowchart TD
    A[Residente reporta la incidencia] --> B[Administrador la asigna]
    B --> C[El responsable recibe Incidencia asignada]
    C --> D{Quién la atiende}
    D -->|Mantenimiento o limpieza| E[La inicia y la resuelve con notas]
    D -->|Proveedor| F[La ve en su panel y la concluye]
    E --> G[El residente recibe Incidencia resuelta]
    F --> G
    H[Administrador agenda una cita] --> I[El proveedor la ve en su agenda]
    I --> J[El tablero cuenta las citas programadas]
```

La cita del proveedor no es una visita de caseta. Vive en la agenda y no cambia el libro de accesos.

## 10. Estacionamiento

**Qué se vende.** El padrón de cajones y placas de quien vive ahí.

**Valor.** Administración sabe qué placa corresponde a qué cajón. La placa de un visitante no se convierte en vehículo del residente.

```mermaid
flowchart TD
    A[Administrador abre un cajón] --> B[El código se guarda en mayúsculas]
    B --> C[Residente registra placa y marca]
    C --> D{Elige cajón}
    D -->|Sí| E[El cajón queda asociado a esa placa]
    D -->|No| F[La placa queda en su padrón]
    E --> G[Administración ve cajones y vehículos]
    F --> G
```

## 11. Áreas comunes y amenidades

**Qué se vende.** Dos calendarios distintos: el área del edificio y la amenidad con cupo.

**Valor.** El residente pide la fecha y el motivo. Administración aprueba. Lo inactivo deja de ofrecerse sin borrarlo del historial.

```mermaid
flowchart TD
    A[Administrador crea el área] --> B{La deja activa}
    B -->|No| C[El residente no la ve]
    B -->|Sí| D[El residente pide fecha, hora y motivo]
    D --> E[La solicitud nace pendiente]
    E --> F[Administrador la aprueba]
    F --> G[El residente la ve aprobada y recibe el aviso]
    H[Administrador crea una amenidad] --> I[Define cupo y si exige aprobación]
    I --> J[El residente reserva en el calendario de la amenidad]
```

Reservar el salón no es reservar la amenidad. Cada una conserva su propio registro.

## 12. Gobierno del condominio

**Qué se vende.** El canal oficial del comité: aviso, encuesta y asamblea con acta.

**Valor.** El voto es por unidad. La invitación a la asamblea queda enviada. El acta se puede leer sin esperar a reconstruirla en un documento aparte.

```mermaid
flowchart TD
    A[Administrador publica un aviso] --> B[Los residentes lo reciben y pueden marcarlo leído]
    C[Publica una encuesta activa] --> D[Los residentes reciben Nueva encuesta]
    D --> E{Sigue en fecha y la unidad no ha votado}
    E -->|Sí| F[La unidad vota]
    E -->|No| G[El voto no se acepta]
    F --> H[El residente ve su voto y el porcentaje]
    I[Convoca una asamblea] --> J[Invita a las unidades]
    J --> K[Cada residente recibe Invitación a asamblea]
    K --> L[Confirma o rechaza]
    L --> M[El quórum cuenta unidades presentes]
    M --> N[Administrador redacta el acta]
    N --> O[El residente puede leerla]
```

La encuesta admite un voto por unidad, salvo que se haya permitido más de uno. La asamblea no invita sola: hay que recorrer las unidades.

## 13. Expediente del condominio

**Qué se vende.** El archivo que el residente puede consultar sin pedir una copia por correo.

**Valor.** Reglamento, contrato, identificación o poder quedan publicados con un tipo. No se confunden con el comprobante de un pago ni con el acta de la asamblea.

```mermaid
flowchart TD
    A[Administrador elige el tipo de documento] --> B[Sube pdf, imagen o texto de hasta 8 MB]
    B --> C[Lo publica]
    C --> D[El residente lo abre en su expediente]
```

Tipos: contrato, factura, recibo, identificación, poder, reglamento, acta y otro.

## 14. Tablero del contador

**Qué se vende.** La lectura de la cobranza y de la operación, para el contador y para el administrador.

**Valor.** El comité ve cargos, pagos y actividad reciente sin exportar una hoja para la junta de la semana.

```mermaid
flowchart TD
    A[Contador o administrador abre el tablero] --> B[Consulta cargos del periodo]
    B --> C[Revisa cobranza y métodos de pago]
    C --> D[Revisa la actividad operativa]
    D --> E[La junta usa esas cifras]
```

El tablero no es un libro mayor, no concilia bancos y no exporta un archivo fiscal.

## Qué se puede prometer hoy

Se puede prometer la operación del edificio: padrón, caseta, paquete, ronda, cuota, multa, incidencia, cita, cajón, reserva, aviso, voto, acta y expediente.

Conviene decir con claridad lo que el piloto todavía no cierra, para no venderlo como incluido:

- El comercio de producción de OpenPay. El sandbox de la suscripción de la plataforma ya cobra.
- El pago con tarjeta del residente hacia su cuota.
- CFDI, conciliación bancaria y libro mayor.
- Recorrido GPS de la ronda y grabación propia de video.
- Acuse del paquete frente al repartidor.

Esos límites protegen la venta. El valor que ya se entrega es la operación completa del condominio en un solo lugar, con cada rol viendo solo su trabajo.
