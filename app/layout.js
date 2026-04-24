import './globals.css';

export const metadata = {
  title: 'SRM BFHL — Node Hierarchy Analyzer',
  description: 'SRM Full Stack Engineering Challenge — POST /bfhl',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-stone-50 text-stone-900 antialiased">{children}</body>
    </html>
  );
}
