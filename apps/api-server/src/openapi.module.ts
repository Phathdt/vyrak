import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'

import { AppController } from './app/app.controller'
import { AppService } from './app/app.service'
import { AuthController } from './app/controllers'
import { OrganizationsController } from './organizations/organizations.controller'

/**
 * Mock AuthService for OpenAPI generation - implements IAuthService interface
 */
class MockAuthService {
  async handleUserOnboarding(): Promise<void> {
    throw new Error('Mock service - not implemented')
  }

  async getCurrentUser() {
    throw new Error('Mock service - not implemented')
  }
}

/**
 * Mock OrganizationsService for OpenAPI generation
 */
class MockOrganizationsService {
  async create() {
    throw new Error('Mock service - not implemented')
  }

  async findAll() {
    throw new Error('Mock service - not implemented')
  }

  async findOne() {
    throw new Error('Mock service - not implemented')
  }

  async update() {
    throw new Error('Mock service - not implemented')
  }

  async delete() {
    throw new Error('Mock service - not implemented')
  }

  async inviteMember() {
    throw new Error('Mock service - not implemented')
  }

  async removeMember() {
    throw new Error('Mock service - not implemented')
  }

  async updateMemberRole() {
    throw new Error('Mock service - not implemented')
  }

  async getMembers() {
    throw new Error('Mock service - not implemented')
  }
}

/**
 * Lightweight module for OpenAPI generation only.
 * Uses mock service providers to avoid database and other heavy dependencies.
 */
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
  ],
  controllers: [AppController, AuthController, OrganizationsController],
  providers: [
    AppService,
    {
      provide: 'AuthService',
      useClass: MockAuthService,
    },
    {
      provide: 'OrganizationsService',
      useClass: MockOrganizationsService,
    },
  ],
})
export class OpenApiModule {}
