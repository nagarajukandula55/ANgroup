export default function Stepper({ step }) {
  const steps = [
    "Basic Info",
    "Commercial",
    "Structure",
    "BOM",
    "Compliance",
    "Nutrition",
    "SEO",
    "Review",
  ];

  return (
    <div className="flex gap-2 flex-wrap">
      {steps.map((label, i) => (
        <div
          key={i}
          className={`px-3 py-1 rounded-full text-sm border ${
            step === i + 1
              ? "bg-blue-600 text-white"
              : "bg-gray-100"
          }`}
        >
          {label}
        </div>
      ))}
    </div>
  );
}
