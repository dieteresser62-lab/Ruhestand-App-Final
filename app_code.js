const berechneInflationsRente = (realeRendite, laufzeitJahre) => {
  const jahreBisRentenende = Math.max(1, Number(laufzeitJahre) || 1);
  const realeJahresrendite = Number(realeRendite) || 0;
  return realeJahresrendite / (1 - (1 + realeJahresrendite) ** -jahreBisRentenende);
};