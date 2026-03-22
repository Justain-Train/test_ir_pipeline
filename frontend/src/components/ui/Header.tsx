
type HeaderProps = {
  title: string;
  description: string;
}

export default function Header({title, description} : HeaderProps) {
  return (
    <header className="space-y-3 pb-6 md:pb-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-5">
                <h2 className="text-header font-bold tracking-tight text-slate-800">
                  {title}
                </h2>
                <p className="text-md text-slate-400">
                  {description}
                </p>
              </div>
            </div>
            <div className="h-px w-full bg-slate-200" />
      </header>
  )
}