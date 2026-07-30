import type { User } from '@/types'
import usersData from '@/mocks/users.json'

const store: User[] = usersData as User[]

export const UserRepository = {
  async findAll(): Promise<User[]> {
    return structuredClone(store)
  },

  async findById(id: string): Promise<User | null> {
    return structuredClone(store.find((u) => u.id === id) ?? null)
  },

  async findByEmail(email: string): Promise<User | null> {
    return structuredClone(store.find((u) => u.correo === email) ?? null)
  },
}
