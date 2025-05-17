function TitleBar({
  label,
  className = "",
  varient = "primary",
}: {
  label: string;
  className?: string;
  varient?: "primary" | "secondary" | "accent";
}) {
  const varientType = {
    primary: "bg-primary text-primary-content",
    secondary: "bg-secondary text-secondary-content",
    accent: "bg-accent text-accent-content",
  };

  return (
    <h2
      className={`${varientType[varient]}
        font-bold py-1 pl-5 rounded-md
        relative 
        before:absolute 
        before:content-[''] 
        before:w-1.5
        before:h-3/5 
        before:bg-base-200
        before:left-2
        before:top-1/2
        before:-translate-y-1/2
        before:rounded-md
        ${className}`}
    >
      {label}
    </h2>
  );
}

export default TitleBar;
