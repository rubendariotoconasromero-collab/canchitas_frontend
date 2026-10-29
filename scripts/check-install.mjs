import {existsSync, readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';

const [major, minor] = process.versions.node.split('.').map(Number);
const supported = (major === 20 && minor >= 19) || (major === 22 && minor >= 12) || major >= 24;
if (!supported) {
  console.error(`Node ${process.versions.node} no es compatible. Usa Node 20.19+, 22.12+ o 24+.`);
  process.exitCode = 1;
} else {
  console.log(`Node ${process.versions.node}: compatible.`);
}
if (!process.argv.includes('--runtime-only')) {
  const cli = fileURLToPath(new URL('../node_modules/@angular/cli/package.json', import.meta.url));
  const build = fileURLToPath(new URL('../node_modules/@angular/build/package.json', import.meta.url));
  if (!existsSync(cli) || !existsSync(build)) {
    console.error('Faltan dependencias del frontend. Ejecuta npm ci dentro de frontend.');
    process.exitCode = 1;
  } else {
    const version = JSON.parse(readFileSync(cli, 'utf8')).version;
    console.log(`Angular CLI ${version}: instalado.`);
  }
  try {
    const own = JSON.parse(readFileSync(new URL('../compatibilidad.json', import.meta.url), 'utf8'));
    if (typeof own.entrega !== 'string' || !own.entrega.trim()) throw new Error('Identificador invalido');
    const backend = fileURLToPath(new URL('../../backend/compatibilidad.json', import.meta.url));
    if (existsSync(backend)) {
      const other = JSON.parse(readFileSync(backend, 'utf8'));
      if (!own.entrega || own.entrega !== other.entrega) {
        console.error('Backend y frontend tienen identificadores de entrega distintos.');
        process.exitCode = 1;
      } else console.log(`Entrega compatible: ${own.entrega}`);
    } else if (existsSync(fileURLToPath(new URL('../../backend/', import.meta.url)))) {
      console.error('El backend vecino no incluye compatibilidad.json; revisa su version.');
      process.exitCode = 1;
    } else console.log(`Backend vecino no encontrado; comprueba la entrega ${own.entrega} por separado.`);
  } catch {
    console.error('Falta o es invalido compatibilidad.json; revisa la version completa.');
    process.exitCode = 1;
  }
}
