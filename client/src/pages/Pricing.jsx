import { Link } from 'react-router-dom';
import PricingCards from '../features/PricingCards.jsx';

export default function Pricing() {
  return (
    <section className="py-16 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto mb-14 max-w-2xl text-center">
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">Simple plans for every team size</h1>
          <p className="mt-4 text-slate-600">Every plan includes unlimited tickets, the knowledge base and a public help center. Limits apply to team members and AI-assisted replies per month.</p>
        </div>
        <PricingCards />
        <p className="mx-auto mt-10 max-w-2xl text-center text-sm text-slate-500">This deployment does not process payments yet, so plan changes are for evaluation. Questions? Visit the <Link to="/help" className="font-semibold text-brand-700 hover:underline">help center</Link>.</p>
      </div>
    </section>
  );
}
