
import Document, { Html, Head, Main, NextScript, DocumentContext } from 'next/document';

class MyDocument extends Document {
    static async getInitialProps(ctx: DocumentContext) {
        const initialProps = await Document.getInitialProps(ctx);
        return { ...initialProps };
    }

    render() {
        return (
            <Html lang="en">
                <Head>
                    <meta charSet="UTF-8" />
                    <script src="https://cdn.tailwindcss.com"></script>
                    <script
                        dangerouslySetInnerHTML={{
                            __html: `
                        tailwind.config = {
                            theme: {
                                extend: {
                                    colors: {
                                        primary: 'var(--primary-accent)',
                                    },
                                    fontFamily: {
                                        sans: ['Inter', 'sans-serif'],
                                    }
                                }
                            }
                        }
                    `
                        }}
                    />
                    <link rel="preconnect" href="https://fonts.googleapis.com" />
                    <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
                    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
                    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />
                    <link rel="manifest" href="/manifest.json?v=3" />
                    <meta name="theme-color" content="#050508" />
                    <link rel="apple-touch-icon" href="/icon-192.png?v=3" />
                </Head>
                <body>
                    <Main />
                    <NextScript />
                </body>
            </Html>
        );
    }
}

export default MyDocument;
