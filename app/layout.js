export const metadata = {
  title: "Job Intelligence Agent",
  description: "LinkedIn job intelligence for all experience levels",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0, background: "#080e1a" }}>{children}</body>
    </html>
  );
}
