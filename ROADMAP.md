# Roadmap

Corte: 4 de noviembre de 2026. El mapa de servicios está en [docs/SERVICIOS-Y-PROCESOS.md](docs/SERVICIOS-Y-PROCESOS.md). Las reglas de cada proceso, en [docs/BUSINESS-PROCESSES.md](docs/BUSINESS-PROCESSES.md). Aquí solo se separa lo que ya sostiene un piloto de lo que falta para operarlo en serio.

## Cerrado para el piloto

- Identidad, invitaciones, roles de condominio y permisos de tres niveles.
- Alta de condominio, torres, unidades y residentes.
- Suscripción de plataforma: plan, cancelación, condonación y bloqueo de acceso.
- Cuotas, pago del residente, folio de recibo y multa reflejada en el estado de cuenta.
- Incidencias asignables a mantenimiento, limpieza y proveedor, con cierre.
- Agenda de visitas del proveedor.
- Visitas del día, control de acceso, pase QR y registro de caseta.
- Rondas de vigilancia en un libro distinto.
- Paquetería con aviso al residente.
- Áreas comunes con reservación aprobada, y amenidades con su propio calendario.
- Planos, marcadores y reproductor de la cámara configurada.
- Avisos, encuestas, asambleas, asistencia y redacción de acta.
- Documentos del condominio.
- Vehículos del residente y cajones.
- Campana de avisos para visita, encuesta, asamblea, incidencia, paquete y multa.
- Demo de Pedregal con áreas, plano y cámara.
- Playwright de esos flujos en local: 99 aprobadas y 2 omitidas el 4 de noviembre de 2026. La suite contra el App Service de ese día no se volvió a correr.
- Correo de confirmación y restablecimiento por Brevo en Azure, desde `contacto@domuscond.com`. En local el envío está apagado y las pruebas leen el buzón capturado.
- Postgres en Neon para local y para el sitio publicado. La clave JWT no está en el repositorio.
- Cobro sandbox de la suscripción de la plataforma con OpenPay. La tarjeta se tokeniza en el navegador.

## Fuera del piloto, a propósito

- Comercio OpenPay de producción y cobro con tarjeta de la cuota del residente.
- CFDI y facturación electrónica.
- App móvil.
- Base distinta para el sitio publicado y para las pruebas locales.

El sandbox de OpenPay ya aceptó un cargo de la suscripción. Las llaves viven en user-secrets y en App Settings, con `UseSandbox` en true.

## Para salir a producción

El orden importa. Las pantallas no son el bloqueo.

1. Separar la base de Azure y la de desarrollo. Hoy comparten Neon, así que una prueba local escribe en el sitio público.
2. Dejar la carpeta `uploads` fuera de `wwwroot`. La base ya no es un archivo dentro del sitio.
3. Subir el plan de App Service. F1 se duerme y no alcanza para un condominio en uso. En el plan Free de Neon el cómputo también se suspende a los pocos minutos.
4. Vaciar Application Insights no sustituye tener telemetría. La clave JWT ya salió del repositorio: producción la lee de App Settings y local de user-secrets.
5. Apagar `Demo:SeedOnStartup` y cambiar las cuentas de demostración.
6. Cada columna nueva de Postgres entra como un id en `PostgresSchemaPatch`. Las migraciones de SQL Server no se ejecutan contra Neon.

## Después del primer condominio real

- Domiciliación o tarjeta para la cuota del residente, distinta de la suscripción del administrador.
- Acuse de entrega de paquetería.
- Rondas con puestos y hora de paso.
- Conciliación del estado de cuenta y exportación para el contador.
- Retención y borrado de documentos e identificaciones.

Esas piezas no se anticipan en el código hasta que un condominio piloto las pida.
