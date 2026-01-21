import React, { useEffect, useRef, useState, type DragEventHandler } from "react";
import * as fb from "flowbite-react";
import { type FieldValues, type FieldArrayPath, type FieldArray, useFormContext, useFieldArray, type Validate, type RegisterOptions } from "react-hook-form";
import { HiDocumentAdd, HiPlus } from "react-icons/hi";
import { HiXMark } from "react-icons/hi2";

export type Rules = {
    validate?: Validate<
        FieldArray<FieldValues, FieldArrayPath<FieldValues>>[],
        FieldValues> | Record<string, Validate<FieldArray<FieldValues, FieldArrayPath<FieldValues>>[], FieldValues>>;
} & Pick<RegisterOptions<FieldValues>, 'maxLength' | 'minLength' | 'required'>;

export type MultiSubFormChildProps = { index: number; key: string; }

/**
 * A form component for repeating sub-forms. Can be used if the form result type contains an array of a complex type.
 *
 * @param name a form field path to an array
 * @param addText optional text for the "add" button, defaults to a plus icon
 * @param rules field rules for react-hook-form
 * @param empty default value for a newly added entry
 * @param children the children that create the form for a single entry
 */
export const MultiSubForm = <T extends FieldValues, N extends FieldArrayPath<T>, V extends FieldArray<T, N>>(
    props: {
        name: N;
        addText?: string;
        rules?: Rules;
        empty: V;
        children: (props: MultiSubFormChildProps) => React.ReactNode;
    }
) => {
    const { control } = useFormContext<T, N, V>();
    const { fields, append, remove, move } = useFieldArray({
        name: props.name,
        rules: props.rules,
        control
    });

    const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
    const [dropIndex, setDropIndex] = useState<number | null>(null);

    const imageRef = useRef<HTMLDivElement>(null)

    return <>
        <div ref={imageRef} className="transform-[translate(-10000px,-10000px)] absolute"><HiDocumentAdd size={50} /></div>
        {fields.map((field, index) => (
            <div key={field.id}>
                <div className={`h-0.5 ${dropIndex === index ? "bg-blue-500" : ""} my-1`} />
                <div draggable
                    onDragStart={(e) => {
                        e.dataTransfer?.setData('text/plain', String(index));
                        e.dataTransfer.setDragImage(imageRef.current as Element, 0, 0);
                        setDraggingIndex(index);
                        console.log("Drag start at", index);
                    }}
                    onDragEnd={() => {
                        if (draggingIndex !== null && dropIndex !== null) {
                            const to = dropIndex > draggingIndex ? dropIndex - 1 : dropIndex;
                            const from = draggingIndex;
                            console.log("drop finished, from", from, "to", to);
                            if (!Number.isNaN(from) &&
                                from !== to
                            ) move(from, to);
                        }
                        setDraggingIndex(null);
                        setDropIndex(null);
                    }}
                    onDragOver={(e) => {
                        e.preventDefault();
                        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                        const offset = e.clientY - rect.top;
                        const newIndex = offset > rect.height / 2 ? index + 1 : index;
                        if (dropIndex !== newIndex) { setDropIndex(newIndex); }
                    }}
                    className={`grid grid-cols-[1fr_min-content] items-end my-2 rounded-md shadow-lg p-6 ${draggingIndex === index ? 'opacity-50' : ''}`}>
                    <div className="grid grid-cols-[1fr_min-content] items-end space-x-2 gap-3">
                        {props.children({ key: `${field.id}--${index}`, index: index })}
                    </div>
                    <fb.Button color="red" onClick={() => remove(index)}>
                        <HiXMark className="h-5 w-5" />
                    </fb.Button>
                </div>
            </div>
        ))}

        <div className={`h-0.5 ${dropIndex === fields.length ? "bg-blue-500" : ""} my-1`} />
        {/* End drop area to allow dropping after the last item */}
        <div onDragOver={(e) => { e.preventDefault(); if (dropIndex !== fields.length) setDropIndex(fields.length); }} className="min-h-3" />

        <div className="my-2">
            <fb.Button color="green" className={`float-right`} onClick={() => append(props.empty)}>{props.addText || <HiPlus />}</fb.Button>
        </div>
    </>;

};

