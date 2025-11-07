import { Html, Head, Main, NextScript } from 'next/document'

export default function Document() {
  return (
    <Html>
      <Head>
        <script type="module" src="/kokoro.js"></script>
        <script type="module" src="/phonemize.js"></script>
        <script type="module" src="/transformers.min.js"></script>
        <script type="module" src="/worker.js"></script>
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  )
}
