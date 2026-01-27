"use strict";

export function initPartnerToggle() {
    const chkPartnerAktiv = document.getElementById('chkPartnerAktiv');
    const sectionRente2 = document.getElementById('sectionRente2');
    if (!chkPartnerAktiv || !sectionRente2) return;

    chkPartnerAktiv.addEventListener('change', () => {
        const aktiv = chkPartnerAktiv.checked;
        // Toggle partner section visibility and persist the flag.
        sectionRente2.style.display = aktiv ? 'block' : 'none';
        localStorage.setItem('sim_partnerAktiv', aktiv ? '1' : '0');
    });
}
