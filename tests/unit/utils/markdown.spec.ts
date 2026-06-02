import { describe, expect, it } from 'vitest'

import { hasMarkdownHeadings, sanitizeMarkdownHtml } from '@/utils/markdown'

describe('markdown utils', () => {
  it('removes unsafe tags, event handlers, and javascript urls from rendered html', () => {
    const result = sanitizeMarkdownHtml(
      '<p onclick="alert(1)">hello</p><img src="x" onerror="alert(1)"><a href="javascript:alert(1)">bad</a><script>alert(1)</script><iframe src="https://example.com"></iframe>',
    )

    expect(result).toContain('<p>hello</p>')
    expect(result).toContain('<img src="x">')
    expect(result).toContain('<a>bad</a>')
    expect(result).not.toContain('onclick')
    expect(result).not.toContain('onerror')
    expect(result).not.toContain('<script')
    expect(result).not.toContain('<iframe')
    expect(result).not.toContain('javascript:')
  })

  it('detects when markdown contains headings for a table of contents', () => {
    expect(hasMarkdownHeadings('# Title\n\n## Section')).toBe(true)
    expect(hasMarkdownHeadings('Paragraph only\n\n- list item')).toBe(false)
  })
})
