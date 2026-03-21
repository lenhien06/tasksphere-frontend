'use client'

import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Control } from 'react-hook-form'

interface FormRadioGroupProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  control: Control<any>
  name: string
  label: string
  options: { label: string; value: string }[]
}

export function FormRadioGroup({ control, name, label, options }: FormRadioGroupProps) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <RadioGroup onValueChange={field.onChange} value={field.value} className='flex gap-4'>
              {options.map((option) => (
                <div key={option.value} className='flex items-center space-x-2'>
                  <RadioGroupItem value={option.value} id={option.value} />
                  <FormLabel htmlFor={option.value} className='font-normal'>
                    {option.label}
                  </FormLabel>
                </div>
              ))}
            </RadioGroup>
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  )
}
