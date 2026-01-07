import React from "react";
import { FormProvider, useForm, useFormContext, type FieldArray, type FieldArrayPath, type FieldValues } from "react-hook-form";
import { CardSection, CardTitle } from "~/components/card";
import { FormCard, Info, InfoPlaceholder, Input, LabelGrid, MultiSubForm, Select, Toggle, type MultiSubFormChildProps } from "../components/forms";

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
  const normalized = initialFields.map(f => ({ useSeparator: false, searchable: false, showInResults: false, ...f }));
  const methods = useForm<FieldsFormdata>({ values: { fields: normalized } });

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

const FieldForm = ({ index }: MultiSubFormChildProps): React.ReactNode => {
  const { register, watch } = useFormContext();
  const selectedType = watch(`fields.${index}.type`)
  return <LabelGrid infoColumn={true}>
    <Input {...register(`fields.${index}.name`)} label="Name" />
    <InfoPlaceholder />

    <Select {...register(`fields.${index}.type`)} label="Typ">
      {Object.entries(typeOptions).map(([key, value]) => <option key={key} value={key}>{value}</option>)}
    </Select>
    <TypeSpecificSettings selectedType={selectedType} index={index}/>

    {selectedType != ":pdf" ?
      <Toggle name={`fields.${index}.searchable`} label="Durchsuchbar" />
      : <></>
    }
  </LabelGrid>
}

const TypeSpecificSettings = ({ selectedType }: { index: number, selectedType: FieldType }): React.ReactNode => {
  switch (selectedType) {
    case ":category":
      return <Info content="Kategorische Felder haben eine feste Menge an möglichen Werten, die beim Suchen in diesem Feld vorgeschlagen werden." />;
  }
  return <InfoPlaceholder />
}
