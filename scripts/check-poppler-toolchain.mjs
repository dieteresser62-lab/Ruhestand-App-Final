import { resolvePopplerTool } from './lib/poppler-toolchain.mjs';

const resolved = resolvePopplerTool();
console.log(
    `Poppler ${resolved.tool} ${resolved.version} is compatible `
    + `(minimum ${resolved.minimumVersion}).`
);

