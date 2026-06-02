const UNSAFE_TAGS = ['script', 'iframe', 'object', 'embed', 'style', 'link', 'meta']

function stripUnsafeAttributes(element: Element) {
  for (const attribute of Array.from(element.attributes)) {
    const name = attribute.name.toLowerCase()
    const value = attribute.value.trim().toLowerCase()

    if (name.startsWith('on')) {
      element.removeAttribute(attribute.name)
      continue
    }

    if ((name === 'href' || name === 'src' || name === 'xlink:href') && value.startsWith('javascript:')) {
      element.removeAttribute(attribute.name)
    }
  }
}

export function sanitizeMarkdownHtml(html: string) {
  const parser = new DOMParser()
  const documentFragment = parser.parseFromString(html, 'text/html')

  for (const tag of UNSAFE_TAGS) {
    for (const node of Array.from(documentFragment.querySelectorAll(tag))) {
      node.remove()
    }
  }

  for (const element of Array.from(documentFragment.body.querySelectorAll('*'))) {
    stripUnsafeAttributes(element)
  }

  return documentFragment.body.innerHTML
}

export function hasMarkdownHeadings(markdown: string) {
  return /^\s{0,3}#{1,6}\s+\S/m.test(markdown)
}
