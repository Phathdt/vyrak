import { cn } from 'cn'

import { Badge, badgeVariants } from '@/components/ui/badge'

import type { VariantProps } from 'class-variance-authority'

type BadgeVariant = VariantProps<typeof badgeVariants>['variant']

type ArtifactTypeMeta = {
  icon: string
  label: string
  description: string
  variant: BadgeVariant
}

export const ARTIFACT_TYPE_META = {
  prd: { icon: '📄', label: 'PRD', description: 'Product Requirements Document', variant: 'default' },
  adr: { icon: '🏗️', label: 'ADR', description: 'Architecture Decision Record', variant: 'secondary' },
  ard: { icon: '📐', label: 'ARD', description: 'Architecture Requirements Document', variant: 'outline' },
  'implementation-plan': {
    icon: '📋',
    label: 'Plan',
    description: 'Implementation Plan',
    variant: 'secondary',
  },
} as const satisfies Record<string, ArtifactTypeMeta>

export type KnownArtifactType = keyof typeof ARTIFACT_TYPE_META

export function isKnownArtifactType(type: string): type is KnownArtifactType {
  return Object.hasOwn(ARTIFACT_TYPE_META, type)
}

export function artifactTypeMeta(type: string): ArtifactTypeMeta {
  if (isKnownArtifactType(type)) {
    return ARTIFACT_TYPE_META[type]
  }

  return { icon: '📎', label: type, description: 'Artifact', variant: 'outline' }
}

type ArtifactBadgeProps = {
  type: string
  version?: number
  className?: string
  showVersion?: boolean
}

export function ArtifactBadge({ type, version, className, showVersion = false }: ArtifactBadgeProps) {
  const meta = artifactTypeMeta(type)

  return (
    <Badge variant={meta.variant} className={cn('gap-1', className)} title={meta.description}>
      <span aria-hidden>{meta.icon}</span>
      <span>{meta.label}</span>
      {showVersion && version != null && <span className='text-xs opacity-70'>v{version}</span>}
    </Badge>
  )
}
