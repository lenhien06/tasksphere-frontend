"use client"

import * as React from "react"
import { format } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"
import { Control } from "react-hook-form"
import { enUS } from "date-fns/locale"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface FormDatePickerProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  control: Control<any>
  name: string
  label: string
  placeholder?: string
  description?: string
  disabled?: boolean
}

export function FormDatePicker({
  control,
  name,
  label,
  placeholder = "Select date",
  description,
  disabled,
}: FormDatePickerProps) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className="flex flex-col">
          <FormLabel className="text-[13px] font-bold text-gray-700 mb-2 px-1">{label}</FormLabel>
          <Popover>
            <PopoverTrigger asChild>
              <FormControl>
                <Button
                  variant={"outline"}
                  className={cn(
                    "w-full h-11 px-4 rounded-xl border border-gray-200 bg-gray-50/50 text-[14px] text-gray-900 outline-none transition-all justify-start text-left font-normal",
                    !field.value && "text-gray-400",
                    "hover:bg-gray-100 hover:text-gray-600 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                  )}
                  disabled={disabled}
                >
                  <CalendarIcon className="mr-2 h-4 w-4 opacity-50" />
                  {field.value ? (
                    format(new Date(field.value), "PPP", { locale: enUS })
                  ) : (
                    <span>{placeholder}</span>
                  )}
                </Button>
              </FormControl>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 rounded-2xl border-gray-100 shadow-2xl" align="start">
              <Calendar
                mode="single"
                selected={field.value ? new Date(field.value) : undefined}
                onSelect={(date) => field.onChange(date?.toISOString())}
                disabled={(date) =>
                  disabled || false
                }
                initialFocus
                locale={enUS}
              />
            </PopoverContent>
          </Popover>
          {description && <FormDescription>{description}</FormDescription>}
          <FormMessage className="text-[11px] font-medium text-red-500 px-1" />
        </FormItem>
      )}
    />
  )
}
