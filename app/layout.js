import './globals.css';

export const metadata = {
  title: 'CRT Attendance Portal — KL University',
  description: '2023-27 Batch Y-23 Summer CRT Training',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-gray-50 text-gray-800">{children}</body>
    </html>
  );
}
