/**
 * Module: Debug Configuration Data
 * Purpose: Provides data points (years 1949, 1950) for debugging historical data anomalies.
 * Usage: Importing this module logs specific data points to console.
 * Dependencies: simulator-data.js
 */
import { annualData } from './simulator-data.js';

const d1949 = annualData.find(d => d.jahr === 1949);
const d1950 = annualData.find(d => d.jahr === 1950);

console.log('1949:', d1949);
console.log('1950:', d1950);
