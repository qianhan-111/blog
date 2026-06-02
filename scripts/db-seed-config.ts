type SeedEnv = Record<string, string | undefined>

export interface SeedUserConfig {
  bio: string
  email: string
  nickname: string
  password: string
  username: string
}

export interface SeedUsersConfig {
  admin: SeedUserConfig
  author: SeedUserConfig
}

function readValue(env: SeedEnv, key: string, fallback: string): string {
  return env[key]?.trim() || fallback
}

export function readSeedUsers(env: SeedEnv = process.env): SeedUsersConfig {
  return {
    admin: {
      username: readValue(env, 'SEED_ADMIN_USERNAME', 'admin'),
      email: readValue(env, 'SEED_ADMIN_EMAIL', 'admin@example.com'),
      password: readValue(env, 'SEED_ADMIN_PASSWORD', 'Admin123456!'),
      nickname: readValue(env, 'SEED_ADMIN_NICKNAME', '管理员'),
      bio: readValue(env, 'SEED_ADMIN_BIO', '负责全站内容治理。'),
    },
    author: {
      username: readValue(env, 'SEED_AUTHOR_USERNAME', 'author_demo'),
      email: readValue(env, 'SEED_AUTHOR_EMAIL', 'author@example.com'),
      password: readValue(env, 'SEED_AUTHOR_PASSWORD', 'Author123456!'),
      nickname: readValue(env, 'SEED_AUTHOR_NICKNAME', '演示作者'),
      bio: readValue(env, 'SEED_AUTHOR_BIO', '专注 Vue、工程化和全栈实践的演示账号。'),
    },
  }
}
