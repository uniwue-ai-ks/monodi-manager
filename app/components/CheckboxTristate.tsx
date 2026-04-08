import { BsQuestion } from 'react-icons/bs';
import { FiCheck, FiX } from 'react-icons/fi';

type TriBoolean = boolean|undefined
type CheckboxTristateProps = {
    value?: TriBoolean;
    onChange: (newValue: TriBoolean) => void;
}

export const CheckboxTristate = ({ value = undefined, onChange }: CheckboxTristateProps) => {
    const nextValue = value === undefined ? true : value === true ? false : undefined;
    const title = value === true ? "Ja" : value === false ? "Nein" : "Unselected";

    return (
        <button
            type="button"
            role="checkbox"
            aria-checked={value === undefined ? 'mixed' : value}
            onClick={() => onChange(nextValue)}
            title={title}
            className="w-5 h-5 flex items-center justify-center border border-gray-300 rounded-sm bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 cursor-pointer"
        >
            {value === true && <FiCheck className="w-4 h-4 text-green-600 stroke-[3]" />}
            {value === false && <FiX className="w-4 h-4 text-red-500 stroke-[3]" />}
            {value === undefined && <BsQuestion className="w-4 h-4 text-blue-300 stroke-[1]" />}
        </button>
    );
};
