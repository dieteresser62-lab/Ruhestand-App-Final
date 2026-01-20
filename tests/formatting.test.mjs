import {
    formatCurrency,
    formatCurrencyShortLog,
    formatCurrencyRounded
} from '../simulator-utils.js';
import {
    formatCurrencySafe,
    formatNumberWithUnit,
    formatPercentage
} from '../results-formatting.js';
import { formatDisplayNumber } from '../simulator-portfolio-format.js';
import { formatPercentValue, formatPercentRatio } from '../simulator-formatting.js';

const normalizeNbsp = (value) => String(value).replace(/\u00a0/g, ' ');

assertEqual(
    normalizeNbsp(formatCurrency(0)),
    '0,00 €',
    'formatCurrency: 0 as EUR'
);
assertEqual(
    normalizeNbsp(formatCurrency(1234.56)),
    '1.234,56 €',
    'formatCurrency: 1234.56 as EUR'
);
assertEqual(
    normalizeNbsp(formatCurrency(-12.3)),
    '-12,30 €',
    'formatCurrency: negative values as EUR'
);

assertEqual(
    formatCurrencyShortLog(0),
    '0 €',
    'formatCurrencyShortLog: 0 short form'
);
assertEqual(
    formatCurrencyShortLog(null),
    '—',
    'formatCurrencyShortLog: null as placeholder'
);
assertEqual(
    normalizeNbsp(formatCurrencyShortLog(999)),
    '999 €',
    'formatCurrencyShortLog: below 1k'
);
assertEqual(
    formatCurrencyShortLog(1500),
    '2k €',
    'formatCurrencyShortLog: rounded k suffix'
);
assertEqual(
    formatCurrencyShortLog(-1500),
    '-2k €',
    'formatCurrencyShortLog: negative values'
);

assertEqual(
    normalizeNbsp(formatCurrencyRounded(4500)),
    '5.000 €',
    'formatCurrencyRounded: rounds to 1k step'
);
assertEqual(
    normalizeNbsp(formatCurrencyRounded(12000)),
    '10.000 €',
    'formatCurrencyRounded: rounds to 5k step'
);
assertEqual(
    normalizeNbsp(formatCurrencyRounded(240000)),
    '250.000 €',
    'formatCurrencyRounded: rounds to 25k step'
);

assertEqual(
    formatCurrencySafe(undefined),
    '—',
    'formatCurrencySafe: undefined placeholder'
);
assertEqual(
    normalizeNbsp(formatCurrencySafe(100)),
    '100,00 €',
    'formatCurrencySafe: numeric value'
);

assertEqual(
    formatNumberWithUnit(12.34, 'Jahre', 1),
    '12,3 Jahre',
    'formatNumberWithUnit: value with unit'
);
assertEqual(
    formatPercentage(12.34),
    '12,3 %',
    'formatPercentage: percent value'
);

assertEqual(
    formatPercentValue(12.34, { fractionDigits: 1, invalid: 'n/a' }),
    '12.3%',
    'formatPercentValue: percent input'
);
assertEqual(
    formatPercentRatio(0.1234, { fractionDigits: 1, invalid: 'n/a' }),
    '12.3%',
    'formatPercentRatio: ratio input'
);

assertEqual(
    formatDisplayNumber(1234.6),
    '1.235',
    'formatDisplayNumber: rounding with grouping'
);
assertEqual(
    formatDisplayNumber(NaN),
    '0',
    'formatDisplayNumber: non-finite fallback'
);
