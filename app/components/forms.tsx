import type { PropsWithChildren, ReactElement, ReactNode } from "react";
import { useFieldArray, useFormContext, type FieldArray, type FieldArrayPath, type FieldArrayWithId, type FieldValues, type Path, type RegisterOptions, type UseFormRegister, type UseFormReturn, type UseFormWatch, type Validate } from "react-hook-form";
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

export type MultiSubFormChildProps<T extends FieldValues, N extends FieldArrayPath<T>> = {
  register: UseFormRegister<T>;
  field: FieldArrayWithId<T, N, "id">;
  index: number;
  watch: UseFormWatch<T>;
}

export const MultiSubForm = <T extends FieldValues, N extends FieldArrayPath<T>, D extends keyof T & string, V extends FieldArray<T, N>>(
  props: {
    form: UseFormReturn<T, any, T>,
    name: N;
    addText?: string;
    rules?: Rules;
    empty: V;
    children: (props: MultiSubFormChildProps<T, N>) => React.ReactNode;
  }
) => {
  const { register, control, watch } = props.form;
  const { fields, append, remove } = useFieldArray({
    name: props.name,
    rules: props.rules,
    control
  });

  return <>
    {fields.map((field, index) => (
      <div key={field.id} className="grid grid-cols-[1fr_min-content] items-end space-x-2 my-2 rounded-md shadow-lg p-6 gap-3">
        {props.children({register: register, field: field, index: index, watch: watch})}
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

/** base style for grids without column definition */
export const gridStyle = "w-full grid gap-3 items-center"
export const LabelGrid = ({ children }: PropsWithChildren<{}>) =>
  <div className={`${gridStyle} grid-cols-[auto_1fr]`}>
    {children}
  </div>

const optionalLabel = (label: ReactNode): ReactNode => label ? <label className="whitespace-nowrap">{label}</label> : undefined

type InputProps = Omit<React.DetailedHTMLProps<React.InputHTMLAttributes<HTMLInputElement>, HTMLInputElement>, 'className'> & { label?: ReactNode }
export const Input = (props: InputProps) => <>
  {optionalLabel(props.label)}
  <input
    className={`${props.label ? "" : "col-span-2"} w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500`}
    {...props}
  />
</>

type SelectProps = Omit<React.DetailedHTMLProps<React.SelectHTMLAttributes<HTMLSelectElement>, HTMLSelectElement>, 'className'> & { label?: string }
export const Select = (props: SelectProps) => {
  return <>
    {optionalLabel(props.label)}
    <select
      className={`${props.label ? "" : "col-span-2"} w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500`}
      {...props}>
      {props.children}
    </select>
  </>
}

export const Info = () => {
  //TODO show popover help
  //maybe use flowbite
  return <span className="text-blue-300 inline-block align-text-bottom">&#x1F6C8;</span>
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
