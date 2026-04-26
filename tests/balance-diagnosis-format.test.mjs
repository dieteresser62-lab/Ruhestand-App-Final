import { formatDiagnosisPayload } from '../app/balance/balance-diagnosis-format.js';

console.log('--- Balance Diagnosis Format Tests ---');

{
    const formatted = formatDiagnosisPayload({
        guardrails: [
            {
                name: 'Budget-Floor Deckung',
                value: 129702.2,
                threshold: 129702.2,
                type: 'currency',
                rule: 'min'
            }
        ],
        keyParams: {}
    });

    const guardrail = formatted.guardrails[0];
    assertEqual(guardrail.status, 'ok', 'Exact min threshold should be OK, not warn');
    assert(guardrail.note.includes('Exakt auf Mindestniveau'), 'Exact min threshold should explain boundary status');
}

{
    const formatted = formatDiagnosisPayload({
        guardrails: [
            {
                name: 'Runway',
                value: 104,
                threshold: 100,
                type: 'percent',
                rule: 'min'
            }
        ],
        keyParams: {}
    });

    const guardrail = formatted.guardrails[0];
    assertEqual(guardrail.status, 'warn', 'Narrow margin above min threshold should stay warn');
    assert(guardrail.note.includes('Knapp'), 'Narrow margin should explain low safety distance');
}

console.log('✅ Balance diagnosis format tests passed');
console.log('--- Balance Diagnosis Format Tests Completed ---');
