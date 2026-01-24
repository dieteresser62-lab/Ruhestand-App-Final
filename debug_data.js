import { annualData } from './simulator-data.js';

const d1949 = annualData.find(d => d.jahr === 1949);
const d1950 = annualData.find(d => d.jahr === 1950);

console.log('1949:', d1949);
console.log('1950:', d1950);
