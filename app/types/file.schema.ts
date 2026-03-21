import z from 'zod'

export const FileControlDetailSchema = z.object({
  detailNo: z.coerce.number(),
  tmpPath: z.string(),
  fileName: z.string(),
  deleteFlag: z.string(),
  createDatetime: z.date(),
  createUserCode: z.string(),
  fileNameDifferenceFlag: z.boolean()
})

export type FileControlDetailType = z.TypeOf<typeof FileControlDetailSchema>

export const FileControlSchema = z.object({
  fileControlId: z.coerce.number().nullable(), // Can be null
  objectId: z.string().nullable(),
  fileControlDetails: z.array(FileControlDetailSchema)
})

export type FileControlType = z.TypeOf<typeof FileControlSchema>

export const FileControlRes = z.object({
  data: FileControlSchema,
  message: z.string()
})

export type FileControlResType = z.TypeOf<typeof FileControlRes>

export const FileControlListRes = z.object({
  data: z.array(FileControlSchema),
  message: z.string()
})

export type FileControlListResType = z.TypeOf<typeof FileControlListRes>
