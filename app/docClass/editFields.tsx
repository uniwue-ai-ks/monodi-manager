import { type ReactNode } from "react";
import * as fb from "flowbite-react";
import { Controller, FormProvider, useForm, useFormContext, type FieldArray, type FieldArrayPath, type FieldValues } from "react-hook-form";
import { CardSection, CardTitle } from "~/components/card";
import { MultiSubForm, type MultiSubFormChildProps } from "~/components/MultiSubForm";
import { typeOptions, type DoctypeField, type FieldType } from "~/state";
import { FormCard, Info, InfoPlaceholder, Input, LabelGrid, Select, Toggle } from "../components/forms";
import { DisplayLocationSelector } from "./DisplayLocationSelector";

export type FieldsFormdata = {
  fields: DoctypeField[];
}

export type FieldArrayFromValue<TFieldName extends FieldValues, RFieldName extends FieldArrayPath<TFieldName>> = {
  [P in RFieldName]: [FieldArray<TFieldName, RFieldName>];
};

type DoctypeFieldsProps = {
  onSubmit: (data: FieldsFormdata) => void;
  onBack?: () => void;
  initialFields: DoctypeField[];
  doctypeName: string;
  isFinal: boolean;
}

export const DoctypeFields = ({ onSubmit, onBack, initialFields, doctypeName, isFinal }: DoctypeFieldsProps) => {
  const normalized = initialFields.map(f => ({ useSeparator: false, searchable: false, showInResults: false, ...f }));
  const methods = useForm<FieldsFormdata>({ defaultValues: { fields: normalized } });

  return <FormProvider {...methods}>
    <FormCard next={isFinal ? "nächster Schritt" : "nächster Dokumententyp"} onSubmit={onSubmit} onBack={onBack}>
      <CardTitle>Merkmale festlegen</CardTitle>
      <p>
        Als nächstes definieren Sie die Merkmale, die je Dokument gespeichert werden sollen. Diese enthalten sowohl den eigentlichen Inhalt des Dokuments als auch Metadaten, nach denen die Dokumente durchsucht werden können.
      </p>
      <CardSection heading={<>Felder für Typ <em>{doctypeName}</em></>}>
        <MultiSubForm name="fields" addText="Feld hinzufügen" empty={{ name: "", type: ":string" }}>{
          (props) =>
            <FieldForm key={props.key} index={props.index} />
        }</MultiSubForm>
      </CardSection>
    </FormCard>
  </FormProvider>
}

const FieldForm = ({ index }: MultiSubFormChildProps): ReactNode => {
  const { register, watch, control } = useFormContext<FieldsFormdata>();
  const selectedType = watch(`fields.${index}.type`)
  return <LabelGrid infoColumn={true}>
    <Input {...register(`fields.${index}.name`)} label="Name" />
    <InfoPlaceholder />

    <Input {...register(`fields.${index}.displayName`)} label="Anzeigename (optional)" />
    <Info content="Wird als RDF-Label verwendet. Leer lassen, um den Namen zu verwenden." />

    <Select {...register(`fields.${index}.type`)} label="Typ">
      {Object.entries(typeOptions).map(([key, value]) => <option key={key} value={key}>{value}</option>)}
    </Select>
    <TypeSpecificSettings selectedType={selectedType} index={index} />

    {selectedType != ":pdf" ?
      [<Toggle name={`fields.${index}.searchable`} label="Durchsuchbar" />, <span />]
      : undefined
    }

    {selectedType != ":pdf" ?
      [<Toggle name={`fields.${index}.showInResults`} label="In Suche anzeigen" />, <span />]
      : undefined
    }

    {selectedType != ":pdf" ?
      [
        <label>Kürzen in Ergebnissen</label>,
        <Controller
          name={`fields.${index}.shortenIn`}
          control={control}
          render={({ field }) => (
            <fb.ToggleSwitch
              checked={Array.isArray(field.value) && (field.value as string[]).includes(":results")}
              onChange={(checked) => field.onChange(checked ? [":results"] : [])}
            />
          )}
        />,
        <span />
      ]
      : undefined
    }

    <label htmlFor={`fields.${index}.documentPositions`}>Dokumentenansicht</label>
    <Controller name={`fields.${index}.documentPositions`} control={control} render={({ field }) => {
      return <DisplayLocationSelector {...field} downloadable={selectedType == ":pdf"} />
    }} />
  </LabelGrid>
}

const TypeSpecificSettings = ({ selectedType }: { index: number, selectedType: FieldType }): ReactNode => {
  switch (selectedType) {
    case ":category":
      return <Info content="Kategorische Felder haben eine feste Menge an möglichen Werten, die beim Suchen in diesem Feld vorgeschlagen werden." />;
  }
  return <InfoPlaceholder />
}
