import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Compass,
  HeartHandshake,
  Layers3,
  MoveUpRight,
} from "lucide-react";
import { Brand, SiteHeader } from "@/components/brand";

const pillars = [
  {
    icon: Compass,
    number: "01",
    title: "See the whole picture",
    text: "Make sense of the operational needs that shape your organization's ability to do good work.",
  },
  {
    icon: HeartHandshake,
    number: "02",
    title: "Find the right support",
    text: "Connect your real-world challenges with practical resources and capacity-building opportunities.",
  },
  {
    icon: Layers3,
    number: "03",
    title: "Move forward together",
    text: "Turn a clearer understanding into confident next steps for your team and community.",
  },
];

export default function HomePage() {
  return (
    <main>
      <SiteHeader />
      <section className="hero">
        <div className="container hero-layout">
          <div className="hero-copy">
            <div className="hero-label"><span className="hero-label-mark" /> CAPACITY, CONNECTED</div>
            <h1>The work is big.<br /><em>Find your next move.</em></h1>
            <p className="hero-description">
              A clearer picture of your organization’s needs can make the next step easier to find. Capacity Connect helps nonprofit teams make sense of the challenge and connect with support that fits.
            </p>
            <div className="hero-actions">
              <Link href="/register" className="button button-brand">Find your next step <ArrowUpRight size={17} /></Link>
              <Link href="/login" className="hero-login-link">Log in <ArrowRight size={15} /></Link>
            </div>
            <p className="hero-footnote">For nonprofit teams doing the work every day.</p>
          </div>

          <div className="orientation-art" aria-label="The organization orientation asks about mission, people, challenges, and support needs">
            <div className="orientation-art-head">
              <span>THE STARTING POINT</span>
              <span>YOUR ORGANIZATION</span>
            </div>
            <p className="orientation-art-title">Start with<br /><em>what you know.</em></p>
            <ol className="orientation-steps">
              <li><span>01</span><div><strong>Your mission</strong><small>What you’re here to change</small></div></li>
              <li><span>02</span><div><strong>Your reality</strong><small>People, pressure, priorities</small></div></li>
              <li><span>03</span><div><strong>Where support could help</strong><small>In your words, on your terms</small></div></li>
            </ol>
            <div className="orientation-art-foot"><span>NO PERFECT ANSWERS REQUIRED</span><ArrowUpRight className="orientation-art-mark" size={18} aria-hidden="true" /></div>
          </div>
        </div>
        <div className="container hero-bottomline"><span>BUILT FOR THE PEOPLE BEHIND THE MISSION</span><span className="hero-bottomrule" /><span>CAPACITY CANADA <MoveUpRight size={12} /></span></div>
      </section>

      <section className="mission-section" id="how-it-works">
        <div className="container mission-layout">
          <div className="section-index"><span>01</span><i /> A BETTER WAY TO BUILD CAPACITY</div>
          <div className="mission-content">
            <h2>Doing good is hard work.<br /><span>Finding your next step shouldn&apos;t be.</span></h2>
            <p>Capacity Connect brings the needs of nonprofit organizations into focus, then connects them with relevant guidance, resources, and opportunities to grow stronger.</p>
            <Link href="/register" className="underlined-link">Get to know Capacity Connect <ArrowRight size={15} /></Link>
          </div>
          <div className="mission-aside">
            <span className="mission-aside-icon"><HeartHandshake size={19} /></span>
            <p>Built with care for the organizations that make communities stronger.</p>
          </div>
        </div>
      </section>

      <section className="approach-section" id="for-organizations">
        <div className="container">
          <div className="approach-heading">
            <div><div className="section-index"><span>02</span><i /> HOW WE HELP</div><h2>From the challenge<br />to a clearer path.</h2></div>
            <p>Less searching in the dark.<br />More support that makes sense.</p>
          </div>
          <div className="pillar-list">
            {pillars.map(({ icon: Icon, number, title, text }) => (
              <article className="pillar-row" key={number}>
                <span className="pillar-number">{number}</span>
                <span className="pillar-icon"><Icon size={20} strokeWidth={1.7} /></span>
                <h3>{title}</h3>
                <p>{text}</p>
                <span className="pillar-arrow"><ArrowUpRight size={17} /></span>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="closing-section">
        <div className="container closing-layout">
          <div className="closing-emblem"><span><HeartHandshake size={24} /></span><i /><i /><i /></div>
          <div className="closing-copy"><span className="closing-kicker">FOR THE WORK THAT MATTERS</span><h2>Your mission has a next step.<br /><em>Let&apos;s find it.</em></h2></div>
          <Link href="/register" className="button button-brand">Get started <ArrowUpRight size={17} /></Link>
        </div>
      </section>

      <footer className="site-footer">
        <div className="container footer-main">
          <div><Brand light /><p>Stronger organizations.<br />More room for good.</p></div>
          <div className="footer-links"><Link href="/#how-it-works">How it works</Link><Link href="/login">Log in</Link><Link href="/register">Get started</Link><a href="https://capacitycanada.ca" target="_blank" rel="noreferrer">Capacity Canada <ArrowUpRight size={13} /></a></div>
        </div>
        <div className="container footer-bottom"><span>© {new Date().getFullYear()} Capacity Connect</span><span>Built around the people doing good work.</span></div>
      </footer>
    </main>
  );
}
