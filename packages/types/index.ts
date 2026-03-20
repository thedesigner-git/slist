export type User = {
  id: string
  email: string
  name: string | null
  avatarUrl: string | null
}

export type Market = 'US' | 'DE' | 'CN' | 'EU'

export type Strategy = 'growth' | 'value' | 'watch'
