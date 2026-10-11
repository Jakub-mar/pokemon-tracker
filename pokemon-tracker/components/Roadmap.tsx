import { roadmapSteps } from '@/data/roadmap';

export function Roadmap() {
  return (
    <section className="mx-auto mb-10 w-full rounded-[18px] border border-slate-800 bg-[#0d0c0b] px-6 py-5 shadow-[0_0_0_1px_rgba(255,255,255,0.02)] sm:px-8">
      <div className="flex items-center justify-between gap-4">
        <h3 className="text-4xl font-semibold tracking-tight text-slate-100">Říjen</h3>
        <span className="text-3xl leading-none text-slate-400">−</span>
      </div>

      <ol className="mt-6 space-y-2 text-left text-xl font-light text-slate-100 sm:text-[2rem]">
        {roadmapSteps.map((step) => (
          <li key={step.id} className={step.children ? 'block' : 'flex items-start gap-3 leading-relaxed'}>
            {step.children ? (
              <div className="space-y-2">
                <div className="flex items-start gap-3 leading-relaxed">
                  <span className="w-8 shrink-0">{step.id}.</span>
                  <span>{step.label}</span>
                </div>

                <ol className="space-y-2 pl-8 text-left text-xl font-light text-slate-100 sm:text-[1.9rem]">
                  {step.children.map((child) => (
                    <li key={child.id} className="flex items-start gap-3 leading-relaxed">
                      <span className="w-10 shrink-0">{child.id}</span>
                      <span>{child.label}</span>
                    </li>
                  ))}
                </ol>
              </div>
            ) : (
              <>
                <span className="w-8 shrink-0">{step.id}.</span>
                <span>{step.label}</span>
              </>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}
