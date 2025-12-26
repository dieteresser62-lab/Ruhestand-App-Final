<script lang="ts">
    export let label: string;
    export let value: number;
    export let min: number = 0;
    export let max: number | undefined = undefined;
    export let step: number = 1;
    export let placeholder: string = "";
    export let title: string = "";
    export let unit: string = "";
    export let disabled: boolean = false;

    function handleInput(e: Event) {
        const target = e.target as HTMLInputElement;
        const num = parseFloat(target.value);
        if (!isNaN(num)) {
            value = num;
        }
    }
</script>

<div class="input-group" {title}>
    <label>
        {label}
        {#if unit}
            <span class="unit">({unit})</span>
        {/if}
    </label>
    <input
        type="number"
        {value}
        {min}
        {max}
        {step}
        {placeholder}
        {disabled}
        on:input={handleInput}
    />
</div>

<style>
    .input-group {
        display: flex;
        flex-direction: column;
        gap: 0.35rem;
    }

    label {
        font-size: 0.875rem;
        font-weight: 500;
        color: #374151;
    }

    .unit {
        color: #6b7280;
        font-weight: normal;
        margin-left: 0.25rem;
    }

    input {
        padding: 0.5rem;
        border: 1px solid #d1d5db;
        border-radius: 6px;
        font-size: 0.95rem;
        transition:
            border-color 0.15s,
            box-shadow 0.15s;
    }

    input:focus {
        outline: none;
        border-color: #3b82f6;
        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
    }

    input:disabled {
        background-color: #f3f4f6;
        cursor: not-allowed;
    }
</style>
