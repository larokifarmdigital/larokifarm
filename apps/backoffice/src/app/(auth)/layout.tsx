export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main id="main" className="min-h-[100dvh]">
      {children}
    </main>
  );
}
