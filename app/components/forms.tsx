import * as fb from "flowbite-react";
import type { PropsWithChildren, ReactElement, ReactNode } from "react";
import { Controller, useController, useFieldArray, useFormContext, type Control, type FieldArray, type FieldArrayPath, type FieldArrayWithId, type FieldValues, type Path, type RegisterOptions, type UseFormRegister, type UseFormReturn, type UseFormWatch, type Validate } from "react-hook-form";
import { useNavigate } from "react-router";
import { Card } from "./card";

export type Rules = {
  validate?: Validate<
    FieldArray<FieldValues, FieldArrayPath<FieldValues>>[],
    FieldValues> | Record<string, Validate<FieldArray<FieldValues, FieldArrayPath<FieldValues>>[], FieldValues>>;
} & Pick<RegisterOptions<FieldValues>, 'maxLength' | 'minLength' | 'required'>;

export type FormCardProps<T extends FieldValues, C> = {
  methods: UseFormReturn<T, C, T>;
  onSubmit: (result: T) => void;
  submitDisabled?: boolean,
  onBack?: () => void;
  backDisabled?: boolean,
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
      {props.onBack ? <Back disabled={props.backDisabled}>{props.back || "zurück"}</Back> : undefined}
      {props.next ? <Submit disabled={props.submitDisabled}>{props.next}</Submit> : <Submit>weiter</Submit>}
    </Card>
  </form>
}

export type MultiSubFormChildProps<T extends FieldValues, N extends FieldArrayPath<T>> = {
  register: UseFormRegister<T>;
  field: FieldArrayWithId<T, N, "id">;
  index: number;
  watch: UseFormWatch<T>;
  control: Control<T, any, T>;
}

export const MultiSubForm = <T extends FieldValues, N extends FieldArrayPath<T>, V extends FieldArray<T, N>>(
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
        {props.children({ register: register, field: field, index: index, watch: watch, control: control })}
        <fb.Button color="red" onClick={() => remove(index)}>
          x
        </fb.Button>
      </div>
    ))}
    <div className="my-2">
      <fb.Button className={`float-right`} onClick={() => append(props.empty)}>{props.addText || "+"}</fb.Button>
    </div>
  </>;

};

export const buttonStyle = "font-bold py-1 px-2 rounded-lg"

/** base style for grids without column definition */
export const gridStyle = "w-full grid gap-3 items-center"
export const LabelGrid = ({ infoColumn, children }: PropsWithChildren<{ infoColumn?: boolean }>) => {
  const gridCols = infoColumn ? "grid-cols-[auto_1fr_auto]" : "grid-cols-[auto_1fr]";
  return <div className={`${gridStyle} ${gridCols}`}>
    {children}
  </div>
}

const optionalLabel = (label: ReactNode): ReactNode => label ? <label className="whitespace-nowrap">{label}</label> : undefined

type WithErrorTooltipProps<T extends FieldValues> = {
  methods: UseFormReturn<T, any, T>,
  options?: RegisterOptions<T>,
  patternInfo?: string,
  name: Path<T>,
  children: (valid: Boolean) => React.ReactNode;
}
export const WithErrorTooltip = <T extends FieldValues>(
  { methods, name, options, patternInfo, children }: WithErrorTooltipProps<T>
) => {
  // subscribe to the field state so UI updates immediately on change/touch/validation
  const { fieldState } = useController({ name, control: methods.control as any });
  const valid = !fieldState.error
  const message = ((t: string | undefined) => {
    switch (t) {
      case 'required': return "Pflichtfeld"
      case 'maxLength': return `Zu lang, maximal ${options?.maxLength}`
      case 'minLength': return `Zu lang, maximal ${options?.minLength}`
      case 'pattern': return `Ungültige Eingabe${patternInfo ? ": " + patternInfo : ""}`
      case 'min': return `Wert muss mindestens ${options?.min} betragen`
      case 'max': return `Wert darf höchstens ${options?.max} betragen`
      default:
        return undefined
    }
  })(fieldState.error?.type);

  if (message) {
    return <fb.Tooltip theme={{ target: "w-full" }} content={message}>{children(valid)}</fb.Tooltip>
  } else {
    return children(valid)
  }
}

type TextInputProps<T extends FieldValues> = {
  label?: ReactNode,
  methods: UseFormReturn<T, any, T>,
  options?: RegisterOptions<T>,
  patternInfo?: string,
  name: Path<T>,
  inputProps?: fb.TextInputProps,
}
export const Input = <T extends FieldValues>(props: TextInputProps<T>) => {
  const { methods, label, options, name, inputProps } = props;

  return <>
    {optionalLabel(label)}
    <WithErrorTooltip {...props}>{(valid) => {
      return <fb.TextInput {...methods.register(name, options)}
        className={label ? "" : "col-span-2"}
        color={!valid ? "failure" : undefined}
        {...inputProps}
      />
    }
    }
    </WithErrorTooltip>
  </>
}

type SelectProps = fb.SelectProps & { label?: string }
export const Select = (props: SelectProps) => {
  return <>
    {optionalLabel(props.label)}
    <fb.Select className={`${props.label ? "" : "col-span-2"}`}
      {...props}>
      {props.children}
    </fb.Select>
  </>
}

type ToggleProps<T extends FieldValues> = Pick<fb.ToggleSwitchProps, 'color' | 'sizing'> & { name: Path<T>, control: Control<T, any, T>, label?: ReactNode }
export const Toggle = <T extends FieldValues>(props: ToggleProps<T>) => <>
  {optionalLabel(props.label)}
  <Controller name={props.name} control={props.control} render={({ field }) =>
    <fb.ToggleSwitch checked={field.value} onChange={field.onChange} className={props.label ? "" : "col-span-2"} color={props.color} sizing={props.sizing} />
  } />
</>

export type InfoProps = { content: string }
export const Info = ({ content }: InfoProps) => {
  return <fb.Tooltip content={content}>
    <span className="text-blue-500 inline-block align-text-bottom">&#x1F6C8;</span>
  </fb.Tooltip>
}
export const InfoPlaceholder = () => <span className="inline-block invisible">&#x1F6C8;</span>

const Submit = (props: PropsWithChildren<{ disabled?: boolean }>): ReactElement => {
  return <fb.Button type="submit" className={`col-start-3`} disabled={props.disabled}>
    {props.children}
  </fb.Button>
}

const Back = (props: PropsWithChildren<{ disabled?: boolean }>): ReactElement => {
  const navigate = useNavigate();
  return <fb.Button color="light" onClick={() => navigate(-1)} disabled={props.disabled}>
    {props.children}
  </fb.Button>
}
