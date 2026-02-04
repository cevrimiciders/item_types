export const metadata = {
  title: "Ölçme Lab",
  description: "Likert dışı soru türleriyle ölçme aracı oluşturma platformu"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <body style={{ fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif", margin: 0 }}>
        {children}
      </body>
    </html>
  );
}
