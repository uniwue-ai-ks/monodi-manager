import { Link, useLocation } from "react-router";

type Step = {
  key: "import" | "fields" | "data";
  label: string;
  path: string;
};

type DoctypeStepsBarProps = {
  doctypeSlug: string;
};

export const DoctypeStepsBar = ({ doctypeSlug }: DoctypeStepsBarProps) => {
  const location = useLocation();

  const steps: Step[] = [
    { key: "import", label: "Import", path: `/${doctypeSlug}/import` },
    { key: "fields", label: "Felder", path: `/${doctypeSlug}/fields` },
    { key: "data",   label: "Daten",  path: `/${doctypeSlug}/data`   },
  ];

  const currentStep = steps.find((s) => location.pathname === s.path)?.key;

  return (
    <nav className="bg-gray-50 border-b border-gray-200">
      <div className="max-w-screen-xl mx-auto px-4">
        <ol className="flex">
          {steps.map((step, i) => {
            const isActive = step.key === currentStep;
            return (
              <li key={step.key} className="flex items-center">
                {i > 0 && (
                  <span className="mx-1 text-gray-400 select-none">›</span>
                )}
                <Link
                  to={step.path}
                  className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                    isActive
                      ? "border-blue-600 text-blue-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  {step.label}
                </Link>
              </li>
            );
          })}
        </ol>
      </div>
    </nav>
  );
};
