"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

const TabsContext = React.createContext<{ value: string, onValueChange: (v: string) => void }>({ value: '', onValueChange: () => {} })

export function Tabs({ defaultValue, value, onValueChange, className, children }: any) {
  const [current, setCurrent] = React.useState(value || defaultValue)
  const handleChange = (v: string) => {
    setCurrent(v)
    if (onValueChange) onValueChange(v)
  }
  return (
    <TabsContext.Provider value={{ value: value !== undefined ? value : current, onValueChange: handleChange }}>
      <div className={className} data-state="active">
        {children}
      </div>
    </TabsContext.Provider>
  )
}

export function TabsList({ className, children }: any) {
  return (
    <div className={cn("inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground", className)}>
      {children}
    </div>
  )
}

export function TabsTrigger({ value, className, children }: any) {
  const { value: selectedValue, onValueChange } = React.useContext(TabsContext)
  const isSelected = selectedValue === value
  return (
    <button
      type="button"
      role="tab"
      aria-selected={isSelected}
      data-state={isSelected ? "active" : "inactive"}
      onClick={() => onValueChange(value)}
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm",
        className
      )}
    >
      {children}
    </button>
  )
}

export function TabsContent({ value, className, children }: any) {
  const { value: selectedValue } = React.useContext(TabsContext)
  if (selectedValue !== value) return null
  return (
    <div 
      className={cn("mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2", className)}
    >
      {children}
    </div>
  )
}
