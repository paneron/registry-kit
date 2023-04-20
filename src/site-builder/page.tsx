/** @jsxImportSource . */


interface PageMeta {
  title: string
}

export default function getHTML(meta: PageMeta): string {
  return <html>
    <head>
      <title>{meta.title}</title>
    </head>
    <body>
      <div>test</div>
    </body>
  </html>;
}
