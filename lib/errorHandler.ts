import { isAxiosError } from "axios"
import { toast } from "sonner"

export const getApiErrorMessage = (error: unknown): string => {
    if (!isAxiosError(error)) return "Da xay ra loi. Vui long thu lai."

    const message =
        (error.response?.data as any)?.meta?.message ||
        (error.response?.data as any)?.message
    const status = error.response?.status

    if (message) return message

    const fallbacks: Record<number, string> = {
        400: "Du lieu khong hop le",
        401: "Phien dang nhap het han",
        403: "Ban khong co quyen thuc hien thao tac nay",
        404: "Khong tim thay",
        409: "Xung dot du lieu - vui long tai lai trang",
        422: "Vi pham quy tac nghiep vu",
        500: "Loi he thong. Vui long thu lai sau.",
        503: "Dich vu tam thoi khong kha dung",
    }

    return fallbacks[status ?? 0] ?? "Da xay ra loi. Vui long thu lai."
}

export const handleKanbanError = (error: unknown) => {
    if (isAxiosError(error) && error.response?.status === 401) return
    toast.error(getApiErrorMessage(error))
}
