// Manual API client for projects
// Temporary implementation until Orval generation works

import type {
  CreateProjectDto,
  ListProjectsParams,
  PaginatedProjects,
  Project,
  UpdateProjectDto,
} from './types/projects'

import { apiClient } from '../lib/api-client'

export async function listProjects(orgId: string, params: ListProjectsParams = {}): Promise<PaginatedProjects> {
  const response = await apiClient.get<PaginatedProjects>(`/api/organizations/${orgId}/projects`, { params })
  return response.data
}

export async function getProject(orgId: string, projectId: string): Promise<Project> {
  const response = await apiClient.get<Project>(`/api/organizations/${orgId}/projects/${projectId}`)
  return response.data
}

export async function createProject(orgId: string, data: CreateProjectDto): Promise<Project> {
  const response = await apiClient.post<Project>(`/api/organizations/${orgId}/projects`, data)
  return response.data
}

export async function updateProject(orgId: string, projectId: string, data: UpdateProjectDto): Promise<Project> {
  const response = await apiClient.patch<Project>(`/api/organizations/${orgId}/projects/${projectId}`, data)
  return response.data
}

export async function deleteProject(orgId: string, projectId: string): Promise<void> {
  await apiClient.delete(`/api/organizations/${orgId}/projects/${projectId}`)
}

export async function checkSlugAvailability(orgId: string, slug: string): Promise<boolean> {
  const response = await apiClient.get<{ available: boolean }>(`/api/organizations/${orgId}/projects/check-slug`, {
    params: { slug },
  })
  return response.data.available
}
