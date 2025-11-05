import type { PropsWithChildren, ReactElement } from "react";
import { useFieldArray, useFormContext, type FieldArray, type FieldArrayPath, type FieldArrayWithId, type FieldValues, type Path, type RegisterOptions, type UseFormRegister, type UseFormReturn, type Validate } from "react-hook-form";
import { Card } from "./card";
import { useNavigate } from "react-router";

export type Rules = {
  validate?: Validate<
    FieldArray<FieldValues, FieldArrayPath<FieldValues>>[],
    FieldValues> | Record<string, Validate<FieldArray<FieldValues, FieldArrayPath<FieldValues>>[], FieldValues>>;
} & Pick<RegisterOptions<FieldValues>, 'maxLength' | 'minLength' | 'required'>;

export type FormCardProps<T extends FieldValues, C> = {
  methods: UseFormReturn<T, C, T>;
  onSubmit: (result: T) => void;
  onBack?: () => void;
  children: React.ReactNode;
  next?: string;
  back?: string;
  className?: string;
}

export const FormCard = <T extends FieldValues, C>(props: FormCardProps<T, C>) => {
  return <form onSubmit={props.methods.handleSubmit(props.onSubmit)}>
    <Card className="max-w-200 pb-4 grid grid-cols-3 gap-4">
      <div className="col-span-3 space-y-4">
        {props.children}
      </div>
      <hr className="text-gray-300 col-span-3" />
      {props.onBack ? <Back>{props.back || "zurück"}</Back> : undefined}
      {props.next ? <Submit>{props.next}</Submit> : <Submit>weiter</Submit>}
    </Card>
  </form>
}

export const MultiField = <T extends FieldValues, N extends FieldArrayPath<T>, D extends keyof T & string, V extends FieldArray<T, N>>(
  props: {
    label: string;
    name: N;
    displayField: D;
    addText?: string;
    rules?: Rules;
    empty: V;
  }
) => {
  const { register, control } = useFormContext<T>();
  const { fields, append, remove } = useFieldArray({
    name: props.name,
    rules: props.rules,
    control
  });

  return <>
    <label htmlFor={props.name} className="block font-medium text-gray-700 dark:text-gray-300">
      {props.label}
    </label>
    <ul className="list-none">
      {fields.map((field, index) => (
        <li key={field.id} className="flex items-center space-x-2 my-1">
          <Input
            type="text"
            {...register(`${props.name}.${index}.${props.displayField}` as Path<T>)}
          />
          <button type="button" onClick={() => remove(index)} className={`bg-red-500 hover:bg-red-700 text-white ${buttonStyle}`}>
            x
          </button>
        </li>
      ))}
    </ul>
    <div className="text-right my-2">
    <button type="button" onClick={() => append(props.empty)} className={`bg-green-400 hover:bg-green-600 text-white ${buttonStyle}`}>{props.addText || "+"}</button>
    </div>
  </>;

};

export const MultiSubForm = <T extends FieldValues, N extends FieldArrayPath<T>, D extends keyof T & string, V extends FieldArray<T, N>>(
  props: {
    form: UseFormReturn<T, any, T>,
    name: N;
    addText?: string;
    rules?: Rules;
    empty: V;
    children: (register: UseFormRegister<T>, field: FieldArrayWithId<T, N, "id">, index: number) => React.ReactNode;
  }
) => {
  const { register, control } = props.form;
  const { fields, append, remove } = useFieldArray({
    name: props.name,
    rules: props.rules,
    control
  });

  return <>
    {fields.map((field, index) => (
      <div key={field.id} className="grid grid-cols-[1fr_min-content] items-end space-x-2 my-2 rounded-md shadow-lg p-6 gap-3">
        {props.children(register, field, index)}
        <button type="button" onClick={() => remove(index)} className={`bg-red-500 hover:bg-red-700 text-white ${buttonStyle}`}>
          x
        </button>
      </div>
    ))}
    <div className="text-right my-2">
    <button type="button" onClick={() => append(props.empty)} className={`bg-green-400 hover:bg-green-600 text-white ${buttonStyle}`}>{props.addText || "+"}</button>
    </div>
  </>;

};

export const buttonStyle = "font-bold py-1 px-2 rounded-lg"


type InputProps = Omit<React.DetailedHTMLProps<React.InputHTMLAttributes<HTMLInputElement>, HTMLInputElement>, 'className'> & { label?: string}
export const Input = (props: InputProps) => {
  return <div className={`w-full grid ${props.label ? "grid-cols-[auto_1fr]" : ""} gap-3 items-center`}>
    {props.label ? <label className="whitespace-nowrap">{props.label}</label> : <></>}
  <input
    className="w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
    {...props}
  />
  </div>
}

const Submit = (props: PropsWithChildren<{}>): ReactElement => {
  return <button type="submit" className={`bg-green-400 hover:bg-green-600 text-white col-start-3 ${buttonStyle}`}>
    {props.children}
  </button>
}

const Back = (props: PropsWithChildren<{}>): ReactElement => {
  const navigate = useNavigate();
  return <button onClick={() => navigate(-1)} className={`bg-gray-400 hover:bg-gray-600 text-white ${buttonStyle}`}>
    {props.children}
  </button>
}
