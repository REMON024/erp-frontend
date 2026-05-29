import type { User } from '@/types'
import data from './users.json'

export interface MockCredential { email: string; password: string; user: User }
export const MOCK_CREDENTIALS = data.credentials as unknown as MockCredential[]
export const MOCK_USERS       = data.users       as unknown as User[]
