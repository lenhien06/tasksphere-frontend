'use client'

import { Checkbox } from '@/components/ui/checkbox'
import { FormControl, FormField, FormItem, FormLabel } from '@/components/ui/form'
import { Control, FieldValues, Path } from 'react-hook-form'
import { ReactNode } from 'react'

interface FormCheckboxGroupProps<T extends FieldValues, TItem extends Record<string, unknown>> {
  control: Control<T>
  name: Path<T>
  options: TItem[]
  valueKey: keyof TItem
  labelKey: keyof TItem
  renderOption?: (option: TItem) => ReactNode
}

export function FormCheckboxGroup<T extends FieldValues, TItem extends Record<string, unknown>>({
  control,
  name,
  options,
  valueKey,
  labelKey,
  renderOption
}: FormCheckboxGroupProps<T, TItem>) {
  return (
    <>
      {options.map((option) => {
        const optionValue = option[valueKey]
        if (optionValue === null || optionValue === undefined) {
          return null
        }
        const optionValueStr = String(optionValue)

        return (
          <FormField
            key={optionValueStr}
            control={control}
            name={name}
            render={({ field }) => (
              <FormItem className='flex items-center space-x-3 space-y-0 rounded-lg p-2 transition-colors hover:bg-muted/50'>
                <FormControl>
                  <Checkbox
                    checked={field.value?.includes(optionValueStr)}
                    onCheckedChange={(checked) => {
                      const newValues = checked
                        ? [...(field.value || []), optionValueStr]
                        : field.value?.filter((value: string) => value !== optionValueStr)
                      field.onChange(newValues)
                    }}
                  />
                </FormControl>
                {renderOption ? (
                  renderOption(option)
                ) : (
                  <FormLabel className='cursor-pointer font-normal'>{String(option[labelKey])}</FormLabel>
                )}
              </FormItem>
            )}
          />
        )
      })}
    </>
  )
}
