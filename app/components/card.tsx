type CardProps = {
  children: React.ReactNode;
  className?: string;
}

export const Card = (props: CardProps) => {
  return <div className="grid h-screen place-items-center">
    <div className={`${props.className} bg-white rounded-md border-b shadow-lg border-black p-6`}>
      {props.children}
    </div>
  </div>
}

export const CardTitle = ({ children }: { children: React.ReactNode }) => {
  return <h2 className="text-2xl font-bold">{children}</h2>
}
export const CardSection = ({ heading, children }: { heading: string | React.ReactNode, children: React.ReactNode }) => {
  return <div className="">
    <hr className="text-gray-300" />
    <h3 className="text-l font-bold">{heading}</h3>
    {children}
  </div>
}
