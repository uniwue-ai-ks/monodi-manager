import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router";
import {
  Controller,
  FormProvider,
  useFieldArray,
  useForm,
  useFormContext,
  useWatch,
} from "react-hook-form";
import { Button, Select, TabItem, Table, TableBody, TableCell, TableHead, TableHeadCell, TableRow, Tabs, TextInput } from "flowbite-react";
import { Card, CardTitle } from "~/components/card";
import { useAppState, type DocumentEntry } from "~/utils/flowStorage";
import type { DoctypeField } from "~/state";
import type { Route } from "./+types/enterData";

type EnterDataFormData = {
  documents: DocumentEntry[];
};

export const meta = ({ }: Route.MetaArgs) => {
  return [
    { title: "Metadaten erfassen" },
    { name: "description", content: "Schritt 4: Metadaten für die Dokumente erfassen" },
  ];
}

export const MetadataPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const locationState = location.state as { files?: File[]; filesByDoctype?: Record<string, File[]> } | null;

  const storage = useAppState();
  const doctypes = storage.contents.doctypes ?? {};
  const doctypeNames = Object.keys(doctypes);
  const defaultDoctype = doctypeNames[0] ?? "";

  // Collect all unique non-pdf fields across all doctypes (preserving first-seen order)
  const allFields: DoctypeField[] = [];
  const seenFieldNames = new Set<string>();
  for (const fields of Object.values(doctypes)) {
    for (const field of fields) {
      if (!seenFieldNames.has(field.name) && field.type !== ":pdf") {
        seenFieldNames.add(field.name);
        allFields.push(field);
      }
    }
  }

  // Map from doctype name → set of field names that belong to it
  const doctypeFieldMap = new Map<string, Set<string>>(
    Object.entries(doctypes).map(([name, fields]) => [
      name,
      new Set(fields.filter((f) => f.type !== ":pdf").map((f) => f.name)),
    ])
  );

  const multipleTypes = doctypeNames.length > 1;
  const existingDocs = storage.contents.documents ?? [];

  // Flatten filesByDoctype (new format) or fall back to legacy flat files array
  const incomingFiles: { file: File; doctype: string }[] = locationState?.filesByDoctype
    ? Object.entries(locationState.filesByDoctype).flatMap(([doctype, files]) =>
      files.map((file) => ({ file, doctype }))
    )
    : (locationState?.files ?? []).map((file) => ({ file, doctype: defaultDoctype }));

  const initialDocs: DocumentEntry[] =
    incomingFiles.length > 0
      ? incomingFiles.map(({ file, doctype }) => {
        const existing = existingDocs.find((d) => d.filename === file.name);
        return existing ?? { filename: file.name, doctype, values: {} };
      })
      : existingDocs;

  const methods = useForm<EnterDataFormData>({
    defaultValues: { documents: initialDocs },
  });
  const { fields } = useFieldArray({ control: methods.control, name: "documents" });

  useEffect(() => {
    if (incomingFiles.length === 0 && existingDocs.length === 0) {
      navigate("/upload");
    }
  }, []);

  const onSubmit = (data: EnterDataFormData) => {
    storage.patchContents({ documents: data.documents });
    navigate("/step5");
  };

  return (
    <Card className="pb-4 w-full max-w-screen-xl">
      <FormProvider {...methods}>
        <form onSubmit={methods.handleSubmit(onSubmit)}>
          <div className="space-y-4 mb-4">
            <CardTitle>Metadaten erfassen</CardTitle>
            <p>Erfassen Sie die Metadaten für jedes Dokument.</p>
          </div>
          {multipleTypes ? (
            <Tabs>
              {doctypeNames.map((doctype) => {
                const tabFields = allFields.filter((f) => doctypeFieldMap.get(doctype)?.has(f.name));
                const tabRows = fields.map((row, i) => ({ row, i })).filter(({ row }) => row.doctype === doctype);
                return (
                  <TabItem key={doctype} title={`${doctype} (${tabRows.length})`}>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHead>
                          <TableHeadCell>Dateiname</TableHeadCell>
                          {tabFields.map((f) => (
                            <TableHeadCell key={f.name}>{f.name}</TableHeadCell>
                          ))}
                        </TableHead>
                        <TableBody className="divide-y">
                          {tabRows.map(({ row, i }) => (
                            <DocumentTableRow
                              key={row.id}
                              index={i}
                              doctypeNames={doctypeNames}
                              allFields={tabFields}
                              doctypeFieldMap={doctypeFieldMap}
                              multipleTypes={false}
                            />
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </TabItem>
                );
              })}
            </Tabs>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHead>
                  <TableHeadCell>Dateiname</TableHeadCell>
                  {allFields.map((f) => (
                    <TableHeadCell key={f.name}>{f.name}</TableHeadCell>
                  ))}
                </TableHead>
                <TableBody className="divide-y">
                  {fields.map((row, i) => (
                    <DocumentTableRow
                      key={row.id}
                      index={i}
                      doctypeNames={doctypeNames}
                      allFields={allFields}
                      doctypeFieldMap={doctypeFieldMap}
                      multipleTypes={false}
                    />
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          <hr className="text-gray-300 mt-4" />
          <div className="flex justify-between mt-4">
            <Button color="light" onClick={() => navigate(-1)}>
              zurück
            </Button>
            <Button type="submit">weiter</Button>
          </div>
        </form>
      </FormProvider>
    </Card>
  );
}
export default MetadataPage;

type DocumentTableRowProps = {
  index: number;
  doctypeNames: string[];
  allFields: DoctypeField[];
  doctypeFieldMap: Map<string, Set<string>>;
  multipleTypes: boolean;
};

const DocumentTableRow = ({
  index,
  doctypeNames,
  allFields,
  doctypeFieldMap,
  multipleTypes,
}: DocumentTableRowProps) => {
  const { register, control } = useFormContext<EnterDataFormData>();
  const doctype = useWatch({ control, name: `documents.${index}.doctype` });
  const filename = useWatch({ control, name: `documents.${index}.filename` });
  const activeFields = doctypeFieldMap.get(doctype) ?? new Set<string>();

  return (
    <TableRow className="bg-white">
      <TableCell className="whitespace-nowrap font-medium text-gray-900">
        <input type="hidden" {...register(`documents.${index}.filename`)} />
        {filename}
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
        return (
          <TableCell key={f.name}>
            {active ? (
              <TextInput
                {...register(`documents.${index}.values.${f.name}`)}
                sizing="sm"
                type={f.type === ":number" ? "number" : "text"}
              />
            ) : (
              <span className="text-gray-300 select-none">—</span>
            )}
          </TableCell>
        );
      })}
    </TableRow>
  );
};
