# Procesos de negocio

Cada proceso indica quién lo dispara, qué queda registrado y qué ve la otra parte. La suscripción de la plataforma y la cuota del condominio son dineros distintos.

La lectura comercial, con un diagrama por servicio, está en [SERVICIOS-Y-PROCESOS.md](SERVICIOS-Y-PROCESOS.md). Este archivo fija las reglas que las pruebas ya cubren.

## Actores

| Actor | Qué custodia |
| --- | --- |
| SuperAdmin | Plataforma: clientes, planes, condonaciones, permisos globales. |
| Administrador del condominio | Operación del edificio y la suscripción del SaaS. |
| SubAdmin | Recorte del administrador, según permisos. |
| Contador | Cargos, comprobantes y reportes. |
| Propietario e inquilino | Su unidad: cuotas, visitas, votaciones, paquetes, vehículos. |
| Vigilancia | Caseta: visitas, paquetería, rondas, cámaras. |
| Mantenimiento y limpieza | Incidencias asignadas. Limpieza tiene rol propio. |
| Proveedor | Incidencias que le asignan y la agenda que el administrador le publica. |

El demo Residencial Pedregal Demo materializa a todos. Áreas, plano y cámara del lobby se siembran solos para no reconstruirlos en cada recorrido.

## Suscripción de la plataforma

El administrador contrata DomusCond, no la cuota de mantenimiento. El plan cobra por unidad. El SuperAdmin, en `/superadmin/subscriptions`, cambia plan, cancela y condona meses. Cancelar corta el acceso: el guardia de suscripción muestra que hay que reactivarla. Condonar vuelve a abrir el acceso.

OpenPay cobra esa suscripción en sandbox: el navegador tokeniza la tarjeta y el servidor registra el pago cuando el cargo queda completado. Extender, condonar o cambiar el plan no requiere un cargo. El comercio de producción y el pago con tarjeta de la cuota del residente siguen fuera.

## Alta del condominio y de las personas

1. El SuperAdmin, o el alta pública de administrador, crea al administrador.
2. El administrador crea el condominio, las torres y las unidades.
3. Da de alta al residente en una unidad y le envía invitación.
4. El residente completa el registro con el token. Su fila queda ligada por `UserId`.
5. El personal de vigilancia, mantenimiento y limpieza se crea como usuario de personal ya confirmado, con rol y condominio.
6. El proveedor se registra con rol Provider, queda confirmado, y hay que asegurarle el rol 7 en el condominio. No sale en el formulario de personal, que solo ofrece mantenimiento, vigilancia y limpieza.

Sin `UserId` en el residente, las notificaciones masivas no lo alcanzan. La invitación es el paso que crea ese vínculo.

## Cuotas, recibo y estado de cuenta

El administrador configura la cuota y genera cargos por unidad. El residente los ve en `/resident/payments`, bajo el título de estado de cuenta.

Para pagar sin comprobante elige efectivo, tarjeta o un método que no sea transferencia. La transferencia exige archivo. Al registrar el pago el cargo aplica el monto, pasa a pagado o parcial, y el pago nace con folio `REC-…`. «Ver recibo» muestra ese folio. El pago puede seguir sin verificar por la administración; el folio existe desde el registro.

La multa usa el mismo estado de cuenta. El administrador la captura en `/admin/fines` contra una unidad. El sistema crea un cargo de tipo multa, vence a 15 días, y avisa «Nueva multa». No hay otro saldo paralelo.

Lo que no está: CFDI, domiciliación, ni pago con tarjeta del residente hacia la cuota. El cargo recurrente del administrador sí existe; el pago del residente es un registro operativo, no un clearing bancario.

## Incidencias y agenda del proveedor

Cualquier residente reporta. El administrador asigna a vigilancia, mantenimiento, limpieza o proveedor. La asignación avisa «Incidencia asignada». Quien la cierra deja notas y el reportante recibe «Incidencia resuelta».

El proveedor ve sus órdenes en el panel y las concluye. Las visitas futuras no salen de las incidencias: el administrador las agenda en `/admin/provider-agenda` y el contador «Próximas visitas» cuenta las citas en estado programado.

## Visitas y caseta

El residente registra una visita con llegada prevista dentro del día local. Vigilancia la ve en control de accesos.

Estados: pendiente, aprobada, rechazada, adentro, finalizada. Se puede registrar la entrada desde pendiente o aprobada. La salida solo desde adentro. Rechazar pide un motivo. El registro de accesos lista el día local hasta las 23:59:59 y muestra el estado final en el renglón, no en la tarjeta de resumen.

Al crear la visita se avisa a quien tenga rol de vigilancia: «Nueva visita». Si el guardia todavía no existe, no hay destinatario.

### Acceso con QR

Cada visita nace con un código de acceso aleatorio (`NRV-XXXX-XXXX-XXXX`, 60 bits, sin caracteres ambiguos). El residente lo ve como QR en el detalle de la visita y lo comparte con su visitante.

En caseta, vigilancia abre `/security/qr-access` y escanea con cámara, sube una foto del QR o teclea el código. El pase sirve desde 2 horas antes de la llegada prevista hasta 1 hora después de la salida prevista; sin salida prevista, hasta 13 horas después de la llegada. Una visita rechazada, cancelada, expirada o finalizada no entra, y el pase sirve para una sola entrada. Con la visita adentro, el mismo código registra la salida.

Un código de otro condominio responde igual que uno inexistente, para no revelar que existe. Solo vigilancia, administración y superadmin validan códigos. Al registrar la entrada se avisa al residente: «Tu visita llegó».

## Rondas

La bitácora de rondas es otro libro. Vigilancia anota zona y notas en `/security/rounds`. Ese texto no entra al registro de visitas ni cambia el estado de una visita. No hay recorrido GPS ni checklist de puestos.

## Paquetería

Vigilancia elige condominio y unidad, captura paquetería y descripción, y el residente de esa unidad recibe «Paquete recibido». Lo consulta en `/resident/packages`. El estado inicial es recibido. No hay acuse de entrega al repartidor ni integración con la mensajería.

## Vehículos y cajones

Cajones, vehículos, residentes y visitas están conectados sin perder la opción de anotar un auto externo.

1. El administrador crea un cajón con su código en mayúsculas y puede asignarlo o liberarlo para un residente activo del condominio en `/admin/parking`.
2. Si el residente ya tiene vehículo registrado en su unidad, al asignarle el cajón quedan enlazados la unidad, el residente y la placa.
3. El residente registra en `/resident/vehicles` su placa, marca, color y un cajón libre o ya asignado a él, y ve cuántas visitas de su unidad han usado esa placa.
4. Al crear o editar una visita, el residente puede elegir uno de los vehículos registrados de su unidad (lo que llena placa y descripción y guarda `ResidentVehicleId`) o capturar manualmente la placa de un visitante externo.
5. En `/admin/visits`, cuando la placa de la visita coincide con un vehículo registrado del condominio, aparece debajo el nombre del residente titular.

## Áreas comunes y reservación

Hay dos catálogos históricos. Las pantallas usan el catálogo nuevo. El administrador crea el área, sube fotos (JPG, PNG o WEBP de hasta 8 MB) y puede desactivarla o volver a activarla. La pantalla confirma con «Área desactivada» o «Área activada». El residente ve las fotos y no ve las áreas inactivas.

Reservar un área no es reservar una amenidad. La amenidad tiene su propio calendario, cupo y aprobación. El área común se solicita con fecha, hora de inicio, hora de fin y motivo. Nace pendiente. El administrador la aprueba y el residente pasa a verla aprobada. La aprobación también deja un aviso de reservación.

## Mapas y cámaras

El administrador publica un plano subiendo una imagen (JPG, PNG o WEBP de hasta 8 MB) o pegando un enlace de Google Maps, que muestra vista previa tanto al capturar el formulario como en el mapa guardado para administración y residentes. Sobre el plano coloca marcadores. Un marcador es cámara cuando la etiqueta, la capa, el tooltip o la referencia contienen camera, cámara, camara, cctv o vigilancia. Si la referencia es un URL http, vigilancia ve el reproductor «Transmisión en vivo» y el enlace «Abrir fuente». Un archivo de video usa la etiqueta `video`. Cualquier otro URL usa un marco embebido. No hay stream propio ni grabación.

El demo deja «Jardín central», «Lobby principal», «Estacionamiento visitantes», el plano «Plano general Pedregal» y el marcador «Cámara lobby Pedregal».

## Comunicaciones, votación y acta

El administrador publica un aviso, una encuesta o una asamblea. Los avisos y las publicaciones del foro permiten adjuntar archivos (PDF, PNG, JPG, WEBP o TXT de hasta 8 MB).

La encuesta solo se vota si está activa y dentro de las fechas. Un voto por unidad, salvo que la encuesta permita más. Publicarla avisa «Nueva encuesta» a los residentes con usuario. El residente ve su voto y el porcentaje. El listado no trae el porcentaje con el nombre que usa la pantalla; el cliente lo normaliza.

La asamblea no invita sola. «Invitar residentes» recorre las unidades. Cada invitación avisa «Invitación a asamblea» al usuario de ese residente. El invitado confirma o rechaza. El quórum mira unidades presentes.

«Redactar acta» guarda el texto con el endpoint que ya existía. El residente lo lee aunque la asamblea no esté cerrada. Antes la pantalla solo mostraba el acta de una asamblea concluida, y no había forma de redactarla.

## Documentos

El tipo ya existía en el dominio: contrato, factura, recibo, identificación, poder, reglamento, acta y otro. El módulo nuevo permite al administrador subir pdf, png, jpg, webp o txt, de hasta 8 MB, y publicarlo. El residente lo consulta en `/resident/documents`. No sustituye al comprobante de un pago ni al acta de asamblea: esos siguen en su propio flujo. El reglamento del demo se distingue por el tipo, no por el nombre del archivo.

## Reportes

El contador y el administrador leen tableros de cargos, cobranza y operación. No hay libro mayor, conciliación ni exportación fiscal.

## Reglas transversales que las pruebas ya fijan

- Una prueba de punta a punta arma sus dependencias: condominio, unidad, residente, rol de personal y el hecho previo. No usa datos huérfanos.
- La búsqueda de visitas y de accesos acota al día local.
- El porcentaje de una encuesta vacía no puede romper la pantalla.
- El proveedor puede recibir incidencias. Antes la asignación lo rechazaba.
- Las rutas de documentos, agenda, paquetería, rondas, cajones y multas no dependen de un permiso nuevo.
