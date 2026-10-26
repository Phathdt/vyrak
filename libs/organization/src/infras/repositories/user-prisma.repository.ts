import type { DatabaseService } from '@vyrak/database'

export class UserPrismaRepository {
  constructor(private readonly prisma: DatabaseService) {}

  async findByEmail(email: string): Promise<{ id: string; email: string } | null> {
    return this.prisma.client.user.findUnique({
      where: { email },
      select: { id: true, email: true },
    })
  }

  async findById(id: string): Promise<{ id: string; email: string } | null> {
    return this.prisma.client.user.findUnique({
      where: { id },
      select: { id: true, email: true },
    })
  }
}
