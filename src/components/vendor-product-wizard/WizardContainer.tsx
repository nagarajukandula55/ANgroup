"use client";

import { useState } from "react";

import Stepper from "./Stepper";
import StepBasicInfo from "./steps/StepBasicInfo";
import StepCommercial from "./steps/StepCommercial";
import StepStructure from "./steps/StepStructure";
import StepBOM from "./steps/StepBOM";

export default function WizardContainer({ draftId }) {
  const [step, setStep] = useState(1);

  const next = () => setStep((s) => s + 1);
  const back = () => setStep((s) => s - 1);

  return (
    <div className="max-w-4xl mx-auto p-6">

      <Stepper step={step} />

      <div className="mt-6 bg-white border rounded-xl p-6 shadow-sm">

        {step === 1 && (
          <StepBasicInfo draftId={draftId} next={next} />
        )}

        {step === 2 && (
          <StepCommercial draftId={draftId} next={next} back={back} />
        )}

        {step === 3 && (
          <StepStructure draftId={draftId} next={next} back={back} />
        )}

        {step === 4 && (
          <StepBOM draftId={draftId} next={next} back={back} />
        )}

      </div>
    </div>
  );
}
