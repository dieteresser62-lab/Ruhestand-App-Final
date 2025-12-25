<script lang="ts">
    import { slide } from "svelte/transition";

    export let title: string;
    export let icon: string = "";
    export let collapsed: boolean = false;

    function toggle() {
        collapsed = !collapsed;
    }
</script>

<div class="section-container">
    <button class="section-header" on:click={toggle} class:collapsed>
        <span class="title">
            {#if icon}<span class="icon">{icon}</span>{/if}
            {title}
        </span>
        <span class="arrow" class:rotated={!collapsed}>▼</span>
    </button>

    {#if !collapsed}
        <div class="section-content" transition:slide|local={{ duration: 200 }}>
            <slot />
        </div>
    {/if}
</div>

<style>
    .section-container {
        border: 1px solid #e5e7eb;
        border-radius: 8px;
        background: white;
        margin-bottom: 1rem;
        overflow: hidden;
        box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
    }

    .section-header {
        width: 100%;
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0.75rem 1rem;
        background: #f9fafb;
        border: none;
        cursor: pointer;
        font-weight: 600;
        color: #374151;
        font-size: 1rem;
        text-align: left;
    }

    .section-header:hover {
        background: #f3f4f6;
    }

    .title {
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }

    .icon {
        font-size: 1.2rem;
    }

    .arrow {
        transition: transform 0.2s;
        opacity: 0.5;
    }

    .rotated {
        transform: rotate(180deg);
    }

    .section-content {
        padding: 1rem;
        border-top: 1px solid #e5e7eb;
    }
</style>
