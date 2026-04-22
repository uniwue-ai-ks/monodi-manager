import { Controller, useFormContext, useWatch } from "react-hook-form";
import { Select, TableCell, TableRow, Tooltip } from "flowbite-react";
import { HiExclamationTriangle } from "react-icons/hi2";
import type { DoctypeField } from "~/state";
import { FieldInput } from "./FieldInput";
import type { EnterDataFormData } from "./types";

export type DocumentTableRowProps = {
  index: number;
  doctypeNames: string[];
  allFields: DoctypeField[];
  doctypeFieldMap: Map<string, Set<string>>;
  multipleTypes: boolean;
  rowErrors?: Record<string, string>;
  isWarning?: boolean;
};

export const DocumentTableRow = ({
  index,
  doctypeNames,
  allFields,
  doctypeFieldMap,
  multipleTypes,
  rowErrors,
  isWarning,
}: DocumentTableRowProps) => {
  const { register, control } = useFormContext<EnterDataFormData>();
  const doctype = useWatch({ control, name: `documents.${index}.doctype` });
  const filename = useWatch({ control, name: `documents.${index}.filename` });
  const activeFields = doctypeFieldMap.get(doctype) ?? new Set<string>();

  const rowBg = isWarning ? "bg-yellow-50" : "bg-white";

  return (
    <TableRow className={rowBg}>
      <TableCell className="whitespace-nowrap font-medium text-gray-900">
        <input type="hidden" {...register(`documents.${index}.filename`)} />
        <span className="flex items-center gap-1">
          {isWarning && (
            <Tooltip content="Datei noch nicht hochgeladen">
              <HiExclamationTriangle className="text-yellow-500 w-4 h-4 shrink-0" />
            </Tooltip>
          )}
          {filename}
        </span>
      </TableCell>
      {multipleTypes && (
        <TableCell>
          <Controller
            control={control}
            name={`documents.${index}.doctype`}
            render={({ field }) => (
              <Select {...field} sizing="sm">
                {doctypeNames.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </Select>
            )}
          />
        </TableCell>
      )}
      {allFields.map((f) => {
        const active = !multipleTypes || activeFields.has(f.name);
        const fieldError = rowErrors?.[f.name];
        return (
          <TableCell key={f.name}>
            {active ? (
              fieldError ? (
                <Tooltip content={fieldError}>
                  <div className="ring-2 ring-red-500 rounded inline-block">
                    <FieldInput f={f} index={index} control={control} register={register} />
                  </div>
                </Tooltip>
              ) : (
                <FieldInput f={f} index={index} control={control} register={register} />
              )
            ) : (
              <span className="text-gray-300 select-none">—</span>
            )}
          </TableCell>
        );
      })}
    </TableRow>
  );
};
