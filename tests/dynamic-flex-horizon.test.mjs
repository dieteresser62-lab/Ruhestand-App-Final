import {
    estimateRemainingLifeYears,
    estimateJointRemainingLifeYears,
    estimateSingleRemainingLifeYearsAtQuantile,
    estimateJointRemainingLifeYearsAtQuantile
} from '../app/simulator/simulator-engine-helpers.js';

console.log('--- Dynamic Flex Horizon Tests ---');

// Test 1: Single-life quantile horizon should shrink with age.
{
    const younger = estimateSingleRemainingLifeYearsAtQuantile('m', 65, 0.85);
    const older = estimateSingleRemainingLifeYearsAtQuantile('m', 75, 0.85);
    assert(younger > older, 'quantile horizon should decrease with age');
}

// Test 2: Joint-life quantile should be at least as long as single-life for same start age.
{
    const single = estimateSingleRemainingLifeYearsAtQuantile('m', 65, 0.85);
    const joint = estimateJointRemainingLifeYearsAtQuantile('m', 65, 'w', 65, 0.85);
    assert(joint >= single, 'joint-life quantile horizon should not be shorter than single-life baseline');
}

// Test 3: Mean and quantile helpers return plausible bounded values.
{
    const meanSingle = estimateRemainingLifeYears('w', 67);
    const meanJoint = estimateJointRemainingLifeYears('m', 67, 'w', 65);
    const qSingle = estimateSingleRemainingLifeYearsAtQuantile('w', 67, 0.9);
    const qJoint = estimateJointRemainingLifeYearsAtQuantile('m', 67, 'w', 65, 0.9);

    [meanSingle, meanJoint, qSingle, qJoint].forEach((v) => {
        assert(Number.isFinite(v), 'horizon helper should return finite number');
        assert(v >= 1 && v <= 60, 'horizon helper should stay in [1,60]');
    });
}

console.log('--- Dynamic Flex Horizon Tests Completed ---');
