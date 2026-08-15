"use client";

import React, { createContext, useContext, useState } from "react";

type ClassLevel = "Class 11" | "Class 12";

interface ClassContextType {
  selectedClass: ClassLevel;
  setSelectedClass: (cls: ClassLevel) => void;
}

const ClassContext = createContext<ClassContextType | undefined>(undefined);

export const ClassProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [selectedClass, setSelectedClass] = useState<ClassLevel>("Class 12");

  return (
    <ClassContext.Provider value={{ selectedClass, setSelectedClass }}>
      {children}
    </ClassContext.Provider>
  );
};

export const useClass = () => {
  const context = useContext(ClassContext);
  if (!context) throw new Error("useClass must be used within a ClassProvider");
  return context;
};
