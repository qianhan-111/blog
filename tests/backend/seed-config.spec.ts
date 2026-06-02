// @vitest-environment node
import { describe, expect, it } from 'vitest'

import { readSeedUsers } from '../../scripts/db-seed-config'

describe('database seed user configuration', () => {
  it('uses documented demo credentials when no handoff overrides are provided', () => {
    expect(readSeedUsers({})).toEqual({
      admin: {
        username: 'admin',
        email: 'admin@example.com',
        password: 'Admin123456!',
        nickname: '管理员',
        bio: '负责全站内容治理。',
      },
      author: {
        username: 'author_demo',
        email: 'author@example.com',
        password: 'Author123456!',
        nickname: '演示作者',
        bio: '专注 Vue、工程化和全栈实践的演示账号。',
      },
    })
  })

  it('lets the new owner override seed login credentials from environment variables', () => {
    expect(readSeedUsers({
      SEED_ADMIN_USERNAME: 'classmate_admin',
      SEED_ADMIN_EMAIL: 'classmate-admin@example.com',
      SEED_ADMIN_PASSWORD: 'ClassmateAdmin123!',
      SEED_ADMIN_NICKNAME: '同学管理员',
      SEED_AUTHOR_USERNAME: 'classmate_author',
      SEED_AUTHOR_EMAIL: 'classmate-author@example.com',
      SEED_AUTHOR_PASSWORD: 'ClassmateAuthor123!',
      SEED_AUTHOR_NICKNAME: '同学作者',
    })).toMatchObject({
      admin: {
        username: 'classmate_admin',
        email: 'classmate-admin@example.com',
        password: 'ClassmateAdmin123!',
        nickname: '同学管理员',
      },
      author: {
        username: 'classmate_author',
        email: 'classmate-author@example.com',
        password: 'ClassmateAuthor123!',
        nickname: '同学作者',
      },
    })
  })
})
