'use client'

import { Button } from '@/components/ui/button'
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import Image from 'next/image'
import { useState } from 'react'
import { Control, FieldValues, Path, PathValue, useFormContext } from 'react-hook-form'

interface FormImageUploadProps<T extends FieldValues> {
  name: Path<T>
  label?: string
  control: Control<T>
  onFileChange: (file: File | null) => void
}

export function FormImageUpload<T extends FieldValues>({
  name,
  label,
  control,
  onFileChange
}: FormImageUploadProps<T>) {
  const [file, setFile] = useState<File | null>(null)
  const { setValue } = useFormContext<T>()
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          {label && <FormLabel>{label}</FormLabel>}
          <FormControl>
            <Input
              type='file'
              accept='image/*'
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) {
                  setFile(file)
                  onFileChange?.(file)
                  field.onChange('http://localhost:3000/' + file.name)
                }
              }}
            />
          </FormControl>
          <FormMessage />
          {(file || field.value) && (
            <div>
              <Image
                src={file ? URL.createObjectURL(file) : field.value}
                width={128}
                height={128}
                alt='preview'
                className='w-32 h-32 object-cover'
              />
              <Button
                type='button'
                variant='destructive'
                size='sm'
                onClick={() => {
                  onFileChange(null)
                  setFile(null)
                  setValue(name, '' as PathValue<T, Path<T>>, {
                    shouldValidate: true
                  })
                }}
              >
                Remove Image
              </Button>
            </div>
          )}
        </FormItem>
      )}
    />
  )
}
