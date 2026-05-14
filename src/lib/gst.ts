export function calculateGST(
  amount: number,
  gstPercent: number
) {
  const taxableValue =
    +(amount / (1 + gstPercent / 100))
      .toFixed(2);

  const gstAmount =
    +(amount - taxableValue)
      .toFixed(2);

  const splitTax =
    +(gstAmount / 2)
      .toFixed(2);

  return {
    taxableValue,

    cgst: splitTax,

    sgst: splitTax,

    igst: 0,

    gstTotal: gstAmount,

    total: amount,
  };
}
