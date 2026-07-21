"use client"

import * as React from "react"

interface FocusContextType {
  isFocused: boolean
  setIsFocused: React.Dispatch<React.SetStateAction<boolean>>
}

const FocusContext = React.createContext<FocusContextType>({
  isFocused: false,
  setIsFocused: () => {},
})

export function FocusProvider({ children }: { children: React.ReactNode }) {
  const [isFocused, setIsFocused] = React.useState(false)

  return (
    <FocusContext.Provider value={{ isFocused, setIsFocused }}>
      {children}
    </FocusContext.Provider>
  )
}

export function useFocusMode() {
  return React.useContext(FocusContext)
}
