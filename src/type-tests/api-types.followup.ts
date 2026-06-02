import { getAdminArticles, updateMyArticle } from '@/api/author-articles'
import { createMyArticle } from '@/api/author-articles'
import { getAdminUsers } from '@/api/users'
import type { ArticleSummary } from '@/types/article'

const draftCreateRequest = createMyArticle({
  status: 'draft',
})

const draftUpdateRequest = updateMyArticle(1, {
  status: 'draft',
  summary: 'draft summary',
})

const adminArticleListRequest = getAdminArticles({
  page: 1,
  pageSize: 20,
  authorId: 42,
  status: 'published',
  keyword: 'search term',
})

const adminUserListRequest = getAdminUsers({
  page: 1,
  pageSize: 20,
  keyword: 'author@example.com',
  status: 'enabled',
})

const publicArticleCardShape: ArticleSummary = {
  id: 1,
  authorId: 42,
  author: {
    id: 42,
    username: 'author-42',
    nickname: 'Author 42',
    avatarUrl: '/avatar.png',
  },
  title: 'Draft-friendly types',
  summary: 'Summary',
  coverUrl: '/cover.png',
  contentMarkdown: 'Body',
  status: 'published',
  publishTime: '2026-05-12T00:00:00.000Z',
  updatedAt: '2026-05-12T00:00:00.000Z',
}

void draftCreateRequest
void draftUpdateRequest
void adminArticleListRequest
void adminUserListRequest
void publicArticleCardShape
