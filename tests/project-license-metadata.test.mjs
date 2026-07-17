import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

console.log('--- Project License Metadata Contract Tests ---');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');

function read(relativePath) {
    return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

function readJson(relativePath) {
    return JSON.parse(read(relativePath));
}

function readTomlPackageField(source, field) {
    const packageSection = source.match(/^\[package\]\s*$([\s\S]*?)(?=^\[|\Z)/m)?.[1] || '';
    return packageSection.match(new RegExp(`^${field}\\s*=\\s*"([^"]*)"\\s*$`, 'm'))?.[1];
}

const licenseText = read('LICENSE.md');
const packageJson = readJson('package.json');
const packageLock = readJson('package-lock.json');
const cargoToml = read('src-tauri/Cargo.toml');
const readme = read('README.md');
const architecture = read('docs/reference/ARCHITEKTUR_UND_FACHKONZEPT.md');
const marketEvidence = read('docs/reference/MARKTVERGLEICH_EVIDENZREGISTER.md');
const rootLockPackage = packageLock.packages?.[''];

assert(licenseText.startsWith('MIT License\n'), 'LICENSE.md should contain the MIT license text');
assertEqual(packageJson.license, 'MIT', 'package.json should declare the MIT project license');
assert(rootLockPackage && typeof rootLockPackage === 'object', 'package-lock.json should expose a root package entry');
assertEqual(rootLockPackage.license, 'MIT', 'only the package-lock root entry represents the project license');
assertEqual(rootLockPackage.name, packageJson.name, 'lockfile root package name should match package.json');
assertEqual(rootLockPackage.version, packageJson.version, 'lockfile root package version should match package.json');
assertEqual(
    JSON.stringify(rootLockPackage.devDependencies),
    JSON.stringify(packageJson.devDependencies),
    'lockfile root dependencies should remain aligned with package.json'
);
assertEqual(
    readTomlPackageField(cargoToml, 'license'),
    'MIT',
    'Cargo package metadata should declare the MIT project license'
);
assert(
    readme.includes('Lizenztext, npm-Paketmetadaten und Tauri-/Cargo-Metadaten weisen das Projekt einheitlich als `MIT` aus.'),
    'README should describe the synchronized MIT metadata'
);
assert(architecture.includes('**Lizenz:** MIT'), 'architecture document should identify MIT as the project license');
assert(
    architecture.includes('| GAP-MKT-06 | geschlossen am 2026-07-17:'),
    'GAP-MKT-06 should remain traceable and be marked closed only after synchronization'
);
assert(
    !architecture.includes('ISC-npm-Metadatum'),
    'architecture document should not retain the resolved ISC mismatch'
);
assert(
    marketEvidence.includes('stimmt mit den npm- und Cargo-Metadaten überein'),
    'MKT-RS-04 should record agreement between license text and project metadata'
);
assert(
    marketEvidence.includes('| K-18 Lizenz | vorhanden · MKT-RS-04, MKT-RS-05 | MIT-Lizenztext und Projektmetadaten sind konsistent;'),
    'market matrix should classify the project license metadata as consistent'
);

console.log('✅ Project license metadata contract tests passed');
