export const metadata = {
  title: "Launchpad — AI Job Intelligence",
  description:
    "Find your next role with AI-powered fit scores and personalized insights",
  viewport: "width=device-width, initial-scale=1",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body style={{ margin: 0, padding: 0, background: "#f8fffe" }}>
        {children}
      </body>
    </html>
  );
}
