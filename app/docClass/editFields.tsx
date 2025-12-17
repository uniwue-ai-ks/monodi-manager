import { FormProvider, useForm, type FieldArray, type FieldArrayPath, type FieldArrayWithId, type FieldValues, type MultipleFieldErrors, type UseFormRegister } from "react-hook-form";
import { CardSection, CardTitle } from "~/components/card";
import { FormCard, Info, InfoPlaceholder, Input, LabelGrid, MultiSubForm, Select, Toggle, type MultiSubFormChildProps } from "../components/forms";
import React, { useState } from "react";
import { ToggleSwitch } from "flowbite-react";

export type FieldsFormdata = {
  fields: DoctypeField[];
}

const typeOptions = {
  ":string": "Text",
  ":htmlContent": "Formatierter Text (HTML)",
  ":number": "Zahl",
  ":pdf": "PDF-Datei",
  ":category": "Kategorisch",
} as const;

type FieldType = keyof typeof typeOptions;
export type DoctypeField = {
  name: string;
  type: FieldType;
  useSeparator?: boolean;
  searchable?: boolean;
  showInResults?: boolean;
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
  const methods = useForm<FieldsFormdata>({ values: { fields: initialFields } });

  return <FormProvider {...methods}>
    <FormCard methods={methods}
      next={isFinal ? "nächster Schritt" : "nächster Dokumententyp"}
      onSubmit={onSubmit}
      onBack={onBack}
    >
      <CardTitle>Merkmale festlegen</CardTitle>
      <p>
        Als nächstes definieren Sie die Merkmale, die je Dokument gespeichert werden sollen. Diese enthalten sowohl den eigentlichen Inhalt des Dokuments als auch Metadaten, nach denen die Dokumente durchsucht werden können.
      </p>
      <CardSection heading={<>Felder für Typ <em>{doctypeName}</em></>}>
        <MultiSubForm form={methods} name="fields" addText="Feld hinzufügen" empty={{ name: "", type: ":string" }}>{
          (props) =>
            <FieldForm {...props} />
        }</MultiSubForm>
      </CardSection>
    </FormCard>
  </FormProvider>
}

const FieldForm = (props: MultiSubFormChildProps<FieldsFormdata, "fields">): React.ReactNode => {
  const { control, register, index, watch } = props;
  const selectedType = watch(`fields.${index}.type`)
  return <LabelGrid infoColumn={true}>
    <Input type="text" {...register(`fields.${index}.name`)} label="Name" />
    <InfoPlaceholder />

    <Select {...register(`fields.${index}.type`)} label="Typ">
      {Object.entries(typeOptions).map(([key, value]) => <option value={key}>{value}</option>)}
    </Select>
    <TypeSpecificSettings selectedType={selectedType} {...props}/>

    {selectedType != ":pdf" ?
      <Toggle name={`fields.${index}.searchable`} control={control} label="Durchsuchbar" />
      : <></>
    }
  </LabelGrid>
}

const TypeSpecificSettings = ({ selectedType }: MultiSubFormChildProps<FieldsFormdata, "fields"> & { selectedType: FieldType }): React.ReactNode => {
  switch(selectedType) {
    case ":category":
      return <Info content="Kategorische Felder haben eine feste Menge an möglichen Werten, die beim Suchen in diesem Feld vorgeschlagen werden." />;
  }
  return <InfoPlaceholder />
}
