// Page d'entrée affichée aux visiteurs non connectés
const MARQUEE = ['Listes partagées', 'Compte à rebours', 'Idées cadeaux', 'En famille', 'Zéro doublon'];

const FEATURES = [
  { n: '01', title: 'Crée tes listes', text: 'Une liste par occasion : anniversaire, Noël, Saint-Valentin… avec photos, liens et prix estimés.', bg: 'bg-malachite' },
  { n: '02', title: 'Partage-les', text: 'Invite ta famille et tes amis. Chacun voit la liste et coche ce qu\'il offre.', bg: 'bg-heliotrope' },
  { n: '03', title: 'Zéro doublon', text: 'Un article acheté est marqué pour tous : plus de cadeau offert deux fois.', bg: 'bg-razzmatazz text-paper' },
];

function Tile({ value, unit, bg }: { value: string; unit: string; bg: string }) {
  return (
    <div className={`${bg} flex flex-col items-center justify-center py-4`}>
      <div className="text-4xl sm:text-5xl font-extrabold tabular-nums">{value}</div>
      <div className="font-mono text-[0.65rem] font-bold uppercase tracking-widest mt-1">{unit}</div>
    </div>
  );
}

export default function Landing({ onStart }: { onStart: () => void }) {
  return (
    <>
      <section className="relative bg-stripes overflow-hidden">
        {/* Formes décoratives */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          <div className="absolute -left-24 top-24 h-24 w-[34rem] -rotate-[35deg] rounded-full bg-heliotrope border-[3px] border-ink" />
          <div className="absolute -right-20 bottom-10 h-24 w-[30rem] -rotate-[35deg] rounded-full bg-razzmatazz border-[3px] border-ink" />
          <div className="absolute right-[38%] -top-10 h-24 w-24 rounded-full bg-paper border-[3px] border-ink" />
        </div>

        <div className="relative max-w-7xl mx-auto px-5 py-12 sm:py-16 grid lg:grid-cols-[1.2fr_1fr] gap-12 items-center">
          <div>
            <p className="label !text-sm !block w-fit">Listes d&apos;achats en famille</p>
            <h1 className="mt-5 flex flex-col items-start gap-2 text-4xl sm:text-6xl xl:text-7xl uppercase leading-none">
              <span className="brut -rotate-1 px-4 py-2">Tes envies</span>
              <span className="brut rotate-1 px-4 py-2 !bg-ink !text-paper !shadow-[6px_6px_0_#ef036c]">en une liste</span>
              <span className="brut -rotate-1 px-4 py-2">partagée</span>
            </h1>
            <p className="mt-6 max-w-lg brut !shadow-none px-4 py-3 text-lg">
              Prépare tes cadeaux, partage la liste et suis le compte à rebours jusqu&apos;au jour J.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <button onClick={onStart} className="btn btn-pink !text-lg !px-8 !py-4">
                Commencer
              </button>
            </div>
          </div>

          {/* Aperçu du produit */}
          <div aria-hidden="true" className="relative mx-auto w-full max-w-md pb-6">
            <div className="brut !bg-heliotrope absolute inset-0 translate-x-5 translate-y-5 rotate-3" />
            <div className="brut relative -rotate-2">
              <div className="bg-razzmatazz text-paper border-b-[3px] border-ink px-5 py-4">
                <span className="label">Noël</span>
                <p className="mt-3 text-2xl font-extrabold uppercase">🎄 Noël en famille</p>
              </div>
              <div className="grid grid-cols-3 divide-x-[3px] divide-ink">
                <Tile value="55" unit="Jours" bg="bg-malachite" />
                <Tile value="08" unit="Heures" bg="bg-heliotrope" />
                <Tile value="38" unit="Min" bg="bg-paper" />
              </div>
              <ul className="border-t-[3px] border-ink font-bold">
                {[['Casque audio', true], ['Livre de cuisine', false], ['Plaid doux', false]].map(([name, done]) => (
                  <li key={name as string} className="flex items-center gap-3 px-5 py-3 border-b-2 border-ink last:border-b-0">
                    <span className={`h-5 w-5 border-[3px] border-ink ${done ? 'bg-malachite' : 'bg-paper'}`} />
                    <span className={done ? 'line-through opacity-60' : ''}>{name as string}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Bandeau défilant */}
      <div className="bg-ink text-paper border-y-[3px] border-ink overflow-hidden" aria-hidden="true">
        <div className="marquee flex w-max gap-10 py-3 font-mono text-sm font-bold uppercase tracking-widest">
          {[...MARQUEE, ...MARQUEE, ...MARQUEE, ...MARQUEE].map((t, i) => (
            <span key={i} className="flex items-center gap-10 whitespace-nowrap">
              {t} <span className="text-malachite">✦</span>
            </span>
          ))}
        </div>
      </div>

      <section className="max-w-7xl mx-auto px-5 py-12 grid gap-6 md:grid-cols-3" aria-label="Fonctionnement">
        {FEATURES.map(f => (
          <article key={f.n} className="brut">
            <div className={`${f.bg} border-b-[3px] border-ink px-5 py-3 flex items-center justify-between`}>
              <h2 className="text-2xl uppercase">{f.title}</h2>
              <span className="label">{f.n}</span>
            </div>
            <p className="px-5 py-4">{f.text}</p>
          </article>
        ))}
      </section>
    </>
  );
}
