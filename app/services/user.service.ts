import { apiJava } from '@/lib/axios'
import { UserType, SignupFormValues, ProfileFormValues, AvatarImage } from '@/app/types/user.schema'
import { Client } from '@stomp/stompjs'

export class UserService {
  private static readonly PREFIX = '/user'
  static async signup(userData: SignupFormValues): Promise<UserType> {
    const response = await apiJava.post<UserType>(`${this.PREFIX}/signup`, userData)
    return response.data
  }

  static async getProfile(userId: number): Promise<UserType> {
    const response = await apiJava.get<UserType>(`${this.PREFIX}/profile/${userId}`)
    return response.data
  }

  static async saveEdit(userData: ProfileFormValues): Promise<UserType> {
    const response = await apiJava.post<UserType>(`${this.PREFIX}/saveEdit`, userData)
    return response.data
  }

  static async getAll(): Promise<UserType[]> {
    const response = await apiJava.get<UserType[]>(`${this.PREFIX}/getAll`)
    return response.data
  }

  static async uploadAvatar(body: FormData): Promise<AvatarImage> {
    const response = await apiJava.post<AvatarImage>(`${this.PREFIX}/upload-avatar`, body, {
      headers: { 'Content-Type': undefined }
    })
    return response.data
  }

  static connectUser = (stompClient: Client, user: UserType) => {
    if (stompClient.connected) {
      stompClient.publish({
        destination: '/app/user.connectUser',
        body: JSON.stringify(user)
      })
    }
  }

  static disconnectUser = (stompClient: Client, user: UserType) => {
    if (stompClient.connected) {
      stompClient.publish({
        destination: '/app/user.disconnectUser',
        body: JSON.stringify(user)
      })
    }
  }
}
