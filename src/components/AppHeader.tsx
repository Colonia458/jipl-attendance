import ThemeToggle from "@/components/ThemeToggle";
import logo from "@/assets/ip_logo.png";

const AppHeader = () => {
  return (
    <div className="w-full bg-card border-b border-border">
      <div className="container mx-auto px-4 py-3 flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden">
          <img src={logo} alt="JKUAT Industrial Park Logo" className="w-full h-full object-contain" />
        </div>
        <h1 className="text-sm sm:text-base font-bold text-foreground leading-tight flex-1">
          JKUAT Industrial Park Meeting Attendance
        </h1>
        <ThemeToggle />
      </div>
    </div>
  );
};

export default AppHeader;
