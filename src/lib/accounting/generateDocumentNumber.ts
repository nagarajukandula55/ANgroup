import DocumentCounter
  from "@/models/DocumentCounter";

import { getFinancialYear }
  from "./getFinancialYear";

type Params = {
  businessId: string;

  documentType: string;

  prefix?: string;
};

export async function generateDocumentNumber({
  businessId,

  documentType,

  prefix = "NA",
}: Params) {

  const financialYear =
    getFinancialYear();

  const counter =
    await DocumentCounter.findOneAndUpdate(
      {
        businessId,

        documentType,

        financialYear,
      },

      {
        $inc: {
          current: 1,
        },

        $setOnInsert: {
          prefix,
        },
      },

      {
        new: true,

        upsert: true,
      }
    );

  const sequence =
    String(counter.current)
      .padStart(6, "0");

  return `${prefix}-${documentType}-${financialYear}-${sequence}`;
}
