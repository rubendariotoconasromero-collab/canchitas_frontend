# Frontend

## Instalacion en otro equipo

Este repositorio necesita el [backend de Soccer Real Madrid](https://github.com/rubendariotoconasromero-collab/canchitas_backend).
Clona ambos repositorios en carpetas `frontend` y `backend` y utiliza versiones
publicadas de la misma entrega. La guia completa de Windows y MySQL esta en el
`README.md` del backend.

El archivo `compatibilidad.json` identifica la entrega `srm-2026-10-instalacion-1`.
Debe coincidir con el archivo del backend; la comprobacion lo compara cuando
ambas carpetas estan una al lado de la otra.

Instala Node 20.19+ de la rama 20, Node 22.12+ de la rama 22 o Node 24+, y npm.
Desde la carpeta `frontend` en PowerShell o Git Bash:

```bash
node --version
npm.cmd --version
node scripts/check-install.mjs --runtime-only
npm.cmd ci
npm.cmd run check:install
npm.cmd start
```

La primera comprobacion revisa Node y `npm.cmd ci` instala las dependencias. Mantener
Django ejecutandose en `127.0.0.1:8000`: el proxy de desarrollo
redirige `/api` y `/media` a ese backend. Si el puerto 4200 esta ocupado, detener
el proceso anterior o escoger otro puerto y configurar los origenes autorizados.
La web esta en `http://localhost:4200/` y el panel en `/login`.

Una base nueva deja el negocio y las canchas sin publicar; las imagenes requieren
registros en la base y configuracion de contenido. Para produccion se necesita un
servidor HTTPS con proxy hacia `/api`, acceso a `/media` y fallback a `index.html`
para las rutas de Angular. `ng serve` no es el servidor de produccion.

El backend genera credenciales iniciales al poblar una base nueva. No hay una
contrasena fija; consulta el archivo privado generado durante esa carga.

## Comprobaciones sin navegador

`npm.cmd run build` compila la aplicacion en `dist/`. Las comprobaciones
`npm.cmd run test:public`, `npm.cmd run test:caja` y `npm.cmd run test:phase6`
se ejecutan sin navegador. El comando `npm.cmd test` usa Karma y requiere un
navegador, por lo que no forma parte de esas comprobaciones.

Si cambias `proxy.conf.json`, reinicia el servidor de desarrollo. En Windows,
`localhost` puede resolver a IPv4 o IPv6: evita tener dos servidores en el mismo
puerto y detiene el proceso anterior si se muestran cambios de otra copia.
