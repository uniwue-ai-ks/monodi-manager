import { createContext, useContext, useState, type ReactNode } from "react";

type DocumentField = {
  name: string;
}

type DocumentClass = {
  name: String;
  fields?: DocumentField[];
}

type AppState = {
  documentClasses?: DocumentClass[]
}

export const AppStateContext = createContext<[AppState, React.Dispatch<React.SetStateAction<AppState>>] | undefined>(undefined);

export const AppProvider = (props: { children: ReactNode }) => {
  const value = useState<AppState>({});
  return (
    <AppStateContext.Provider value={value}>
      {props.children}
    </AppStateContext.Provider>
  );
}

export const useAppState = (): [AppState, React.Dispatch<React.SetStateAction<AppState>>] => {
  const context = useContext(AppStateContext);
  if (!context) {
    throw new Error("useAppState must be used within the AppProvider");
  }
  return context;
}
