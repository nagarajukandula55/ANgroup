export function calculateInclusiveGST(
  amount: number,
  gstRate: number
) {
  const taxableValue =
    +(amount / (1 + gstRate / 100)).toFixed(2)

  const gstAmount =
    +(amount - taxableValue).toFixed(2)

  const halfGST =
    +(gstAmount / 2).toFixed(2)

  return {
    taxableValue,

    cgst: halfGST,
    sgst: halfGST,
    igst: 0,

    gstTotal: gstAmount,

    total: amount
  }
}
