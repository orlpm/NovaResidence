# Roadmap

Corte: 29 de octubre de 2026. El estado de cada proceso está descrito en [docs/BUSINESS-PROCESSES.md](docs/BUSINESS-PROCESSES.md). Aquí solo se separa lo que ya sostiene un piloto de lo que falta para operarlo en serio.

## Cerrado para el piloto

- Identidad, invitaciones, roles de condominio y permisos de tres niveles.
- Alta de condominio, torres, unidades y residentes.
- Suscripción de plataforma: plan, cancelación, condonación y bloqueo de acceso.
- Cuotas, pago del residente, folio de recibo y multa reflejada en el estado de cuenta.
- Incidencias asignables a mantenimiento, limpieza y proveedor, con cierre.
- Agenda de visitas del proveedor.
- Visitas del día, control de acceso y registro de caseta.
- Rondas de vigilancia en un libro distinto.
- Paquetería con aviso al residente.
- Áreas comunes con reservación aprobada, y amenidades con su propio calendario.
- Planos, marcadores y reproductor de la cámara configurada.
- Avisos, encuestas, asambleas, asistencia y redacción de acta.
- Documentos del condominio.
- Vehículos del residente y cajones.
- Campana de avisos para visita, encuesta, asamblea, incidencia, paquete y multa.
- Demo de Pedregal con áreas, plano y cámara.
- Playwright de esos flujos, en local y contra el App Service.

## Fuera del piloto, a propósito

- Envío de correo con Brevo.
- Cargo con tarjeta en OpenPay.
- CFDI y facturación electrónica.
- App móvil.

No se retoman hasta que se pidan. El código de correo y de OpenPay existe y está apagado.

## Para salir a producción

El orden importa. Las pantallas no son el bloqueo.

1. Sacar SQLite. PostgreSQL o Azure SQL, con migración que incluya las tablas que hoy solo crea `SqliteSchemaPatch`, y respaldo fuera del sitio.
2. Dejar el archivo de base y la carpeta `uploads` fuera de `wwwroot`.
3. Subir el plan de App Service. F1 se duerme y no alcanza para un condominio en uso.
4. Rotar la clave JWT y quitarla del repositorio. Vaciar Application Insights no sustituye tener telemetría.
5. Apagar `Demo:SeedOnStartup` y cambiar las cuentas de demostración.
6. Confirmar correo de verdad, cuando Brevo esté configurado, antes de abrir el registro público.
7. Commit del working tree. El producto desplegado el 16 de octubre de 2026 no está en el historial de git.

## Después del primer condominio real

- Domiciliación o tarjeta para la cuota del residente, distinta de la suscripción del administrador.
- Acuse de entrega de paquetería.
- Rondas con puestos y hora de paso.
- Conciliación del estado de cuenta y exportación para el contador.
- Retención y borrado de documentos e identificaciones.

Esas piezas no se anticipan en el código hasta que un condominio piloto las pida.
