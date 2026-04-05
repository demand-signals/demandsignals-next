import { HeroVideo } from '@/components/sections/HeroVideo';
import { StatsBar } from '@/components/sections/StatsBar';
import { ServicesGrid } from '@/components/sections/ServicesGrid';
import ReplacesGrid from '@/components/sections/ReplacesGrid';
import ProofTable from '@/components/sections/ProofTable';
import IndustriesGrid from '@/components/sections/IndustriesGrid';
import HowItWorks from '@/components/sections/HowItWorks';
import PortfolioGrid from '@/components/sections/PortfolioGrid';
import BookingSection from '@/components/sections/BookingSection';
import ReportsCallout from '@/components/sections/ReportsCallout';
import CtaBand from '@/components/sections/CtaBand';

export const metadata = {
  title: 'Demand Signals — AI-Powered Websites. AI-Driven Marketing. Always On.',
  description:
    'We build AI-powered websites and run AI-driven marketing for local businesses. 14 clients. Proven results. AI replaces your SEO agency, social media manager, and web developer — at a fraction of the cost.',
};

export default function HomePage() {
  return (
    <>
      <HeroVideo />
      <StatsBar />
      <ServicesGrid />
      <ReplacesGrid />
      <ProofTable />
      <IndustriesGrid />
      <HowItWorks />
      <PortfolioGrid />
      <BookingSection />
      <ReportsCallout />
      <CtaBand />
    </>
  );
}
