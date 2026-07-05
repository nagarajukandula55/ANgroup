"use client";

import { useState } from "react";

import Stepper from "./Stepper";
import StepBasicInfo from "./steps/StepBasicInfo";
import StepCommercial from "./steps/StepCommercial";
import StepStructure from "./steps/StepStructure";
import StepBOM from "./steps/StepBOM";
import StepPackaging from "./steps/StepPackaging";
import StepCompliance from "./steps/StepCompliance";
import StepReview from "./steps/StepReview";
import StepSubmit from "./steps/StepSubmit";

interface WizardContainerProps {
  draftId: string;
  businessId?: string;
}

export default function WizardContainer({
  draftId,
  businessId,
}: WizardContainerProps) {
  const [step, setStep] = useState(1);

  const next = () => setStep((s) => s + 1);

  const back = () =>
    setStep((s) => Math.max(1, s - 1));

  return (
    <div>

      <Stepper step={step} />

      <div className="mt-6 rounded-xl border bg-white p-6 shadow-sm">

        {step === 1 && (
          <StepBasicInfo
            draftId={draftId}
            businessId={businessId}
            next={next}
          />
        )}

        {step === 2 && (
          <StepCommercial
            draftId={draftId}
            next={next}
            back={back}
          />
        )}

        {step === 3 && (
          <StepStructure
            draftId={draftId}
            next={next}
            back={back}
          />
        )}

        {step === 4 && (
          <StepBOM
            draftId={draftId}
            next={next}
            back={back}
          />
        )}

        {step === 5 && (
          <StepPackaging
            draftId={draftId}
            next={next}
            back={back}
          />
        )}

        {step === 6 && (
          <StepCompliance
            draftId={draftId}
            next={next}
            back={back}
          />
        )}

        {step === 7 && (
          <StepReview
            draftId={draftId}
            next={next}
            back={back}
          />
        )}

        {step === 8 && (
          <StepSubmit
            draftId={draftId}
            back={back}
          />
        )}

      </div>

    </div>
  );
}
