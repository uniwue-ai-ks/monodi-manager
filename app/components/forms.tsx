import type { MouseEventHandler, PropsWithChildren, ReactElement } from "react";
import { useFormContext, useFieldArray, type Validate, type FieldArray, type FieldArrayPath, type FieldValues, type RegisterOptions } from "react-hook-form";

type Rules = {
  validate?: Validate<
    FieldArray<FieldValues, FieldArrayPath<FieldValues>>[],
    FieldValues> | Record<string, Validate<FieldArray<FieldValues, FieldArrayPath<FieldValues>>[], FieldValues>>;
} & Pick<RegisterOptions<FieldValues>, 'maxLength' | 'minLength' | 'required'>;


export const MultiField = (props: { label: string; name: string; addText?: string, rules?: Rules }) => {
  const { register } = useFormContext();
  const { fields, append, prepend, remove, swap, move, insert } = useFieldArray({
    name: props.name,
    rules: props.rules,
  });

  return <>
    <label htmlFor={props.name} className="block font-medium text-gray-700 dark:text-gray-300">
      {props.label}
    </label>
    <ul className="list-none">
      {fields.map((field, index) => (
        <li key={field.id} className="flex items-center space-x-2">
          <input
            type="text"
            className="w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            {...register(`${props.name}.${index}.value`)} />
          <button type="button" onClick={() => remove(index)} className="bg-red-500 hover:bg-red-700 text-white font-bold py-1 px-2 rounded">
            x
          </button>
        </li>
      ))}
    </ul>
    <button type="button" onClick={() => append({ value: "" })} className="bg-green-400 hover:bg-green-600 text-white font-bold py-1 px-2 rounded">{props.addText || "+"}</button>
  </>;

};

export const Submit = (props: PropsWithChildren<{}>): ReactElement => {
  return <button type="submit" className="bg-green-400 hover:bg-green-600 text-white font-bold py-1 px-2 rounded">
    {props.children}
  </button>
}
