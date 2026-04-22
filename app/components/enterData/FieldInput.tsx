import { Controller } from "react-hook-form";
import { TextInput } from "flowbite-react";
import { CheckboxTristate } from "~/components/CheckboxTristate";
import type { DoctypeField } from "~/state";
import { useFormContext } from "react-hook-form";
import type { EnterDataFormData } from "./types";

export type FieldInputProps = {
  f: DoctypeField;
  index: number;
  control: ReturnType<typeof useFormContext<EnterDataFormData>>["control"];
  register: ReturnType<typeof useFormContext<EnterDataFormData>>["register"];
};

export const FieldInput = ({ f, index, control, register }: FieldInputProps) => {
  if (f.type === ":boolean") {
    return (
      <Controller
        control={control}
        name={`documents.${index}.values.${f.name}`}
        render={({ field }) => {
          const triValue = field.value === "true" ? true : field.value === "false" ? false : undefined;
          return (
            <CheckboxTristate
              value={triValue}
              onChange={(v) => field.onChange(v === true ? "true" : v === false ? "false" : "")}
            />
          );
        }}
      />
    );
  }
  return (
    <TextInput
      {...register(`documents.${index}.values.${f.name}`)}
      sizing="sm"
      type={f.type === ":number" ? "number" : "text"}
    />
  );
};
