export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t bg-background">
      <div className="container mx-auto flex min-h-14 items-center px-4">
        <p className="text-sm text-muted-foreground">
          © {currentYear} VPS Monitor
        </p>
      </div>
    </footer>
  );
}
