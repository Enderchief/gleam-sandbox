function createBlobUrl(content: string, type: string) {
  const blob = new Blob([content], { type });
  return URL.createObjectURL(blob);
}

export function createDocument(bundle: string) {
  const iframe = document.createElement('iframe');
  iframe.style.flexGrow = '1';
  iframe.style.margin = '0';
  iframe.style.padding = '0';
  iframe.src = createBlobUrl(
    `<!DOCTYPE html>
<html>
    <head>
        <script type="module" src="${createBlobUrl(
          bundle,
          'text/javascript'
        )}"></script>
    </head>
    <body>
        <div id="app">Hello Gleam!, my id is "app".</div>
    </body>
</html>`,
    'text/html'
  );
  return iframe;
}
