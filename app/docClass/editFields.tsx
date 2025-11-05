import { FormProvider, useForm, type FieldArray, type FieldArrayPath, type FieldValues } from "react-hook-form";
import { CardSection, CardTitle } from "~/components/card";
import { FormCard, Input, MultiSubForm } from "../components/forms";

export type FieldsFormdata = {
  fields: DoctypeField[];
}

export type DoctypeField = {
  name: string
}

export type FieldArrayFromValue<TFieldName extends FieldValues, RFieldName extends FieldArrayPath<TFieldName>> = {
  [P in RFieldName]: [FieldArray<TFieldName, RFieldName>];
};

type DoctypeFieldsProps = {
  onSubmit: (data: FieldsFormdata) => void;
  onBack?: () => void;
  initialFields: DoctypeField[];
  doctypeName: string;
}

export const DoctypeFields = ({ onSubmit, onBack, initialFields, doctypeName }: DoctypeFieldsProps) => {
  const methods = useForm<FieldsFormdata>({ defaultValues: { fields: initialFields } });

  return <FormProvider {...methods}>
    <FormCard methods={methods}
      next="nächster Schritt"
      onSubmit={onSubmit}
      onBack={onBack}
    >
      <CardTitle>Merkmale festlegen</CardTitle>
      <p>
        Als nächstes definieren Sie die Merkmale, die je Dokument gespeichert werden sollen. Diese enthalten sowohl den eigentlichen Inhalt des Dokuments als auch Metadaten, nach denen die Dokumente durchsucht werden können.
      </p>
      <CardSection heading={<>Felder für Typ <em>{doctypeName}</em></>}>
        <MultiSubForm form={methods} name="fields" addText="weiteren Typ hinzufügen" empty={{ name: "" }}>{
          (register, field, index) =>
            <Input type="text" {...register(`fields.${index}.name`)} label={`Dokumententyp ${index + 1}`} />
        }</MultiSubForm>
      </CardSection>
    </FormCard>
  </FormProvider>
}
