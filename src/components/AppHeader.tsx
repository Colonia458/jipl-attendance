const AppHeader = () => {
  return (
    <div className="w-full bg-card border-b border-border">
      <div className="container mx-auto px-4 py-3 flex items-center gap-3">
        {/* Logo placeholder — replace src with your uploaded logo */}
        <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0 overflow-hidden">
          <span className="text-primary font-extrabold text-sm">JP</span>
        </div>
        <h1 className="text-sm sm:text-base font-bold text-foreground leading-tight">
          JKUAT Industrial Park Meeting Attendance
        </h1>
      </div>
    </div>
  );
};

export default AppHeader;
