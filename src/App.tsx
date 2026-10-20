import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import {
  ArrowDownRight, ArrowRight, BadgeCheck, BriefcaseBusiness, Building2, Check, ChevronDown,
  CircleAlert, Clock3, Globe2, Instagram, LogIn, LogOut, Mail, MapPin, Menu, Phone,
  Search, ShieldCheck, X,
} from "lucide-react";
import { Link, Navigate, Route, Routes, useLocation, useNavigate, useParams } from "react-router-dom";
import en from "./i18n/en.json";
import ml from "./i18n/ml.json";
import { getPublishedJob, listPublishedJobs, submitApplication, submitEnquiry } from "./lib/data";
import type { Job } from "./lib/data";
import { isSupabaseConfigured, supabase } from "./lib/supabase";

type Key = keyof typeof en;
type Language = "en" | "ml";
const dictionaries = { en, ml };
const LanguageContext = createContext<{ lang: Language; setLang: (value: Language) => void; t: (key: Key, vars?: Record<string, string>) => string } | null>(null);
const businessEmail = import.meta.env.VITE_BUSINESS_EMAIL?.trim() || "gulfbridgeoverseas.careers@gmail.com";
const instagramUrl = import.meta.env.VITE_INSTAGRAM_URL?.trim() || "https://www.instagram.com/gulfbridge.careers/";

function useCopy() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error("Language context is unavailable.");
  return context;
}

function App() {
  const [lang, setLang] = useState<Language>(() => localStorage.getItem("gulfbridge-language") === "ml" ? "ml" : "en");
  useEffect(() => { document.documentElement.lang = lang; }, [lang]);
  const value = useMemo(() => ({
    lang,
    setLang: (next: Language) => { localStorage.setItem("gulfbridge-language", next); setLang(next); },
    t: (key: Key, vars: Record<string, string> = {}) => Object.entries(vars).reduce(
      (text, [name, replacement]) => text.replaceAll(`{${name}}`, replacement),
      dictionaries[lang][key] as string,
    ),
  }), [lang]);
  return <LanguageContext.Provider value={value}>
    <SiteLayout />
  </LanguageContext.Provider>;
}

function SiteLayout() {
  const { t, lang, setLang } = useCopy();
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  useEffect(() => { setMenuOpen(false); window.scrollTo(0, 0); }, [location.pathname]);
  const navLinks: [string, Key][] = [
    ["/jobs", "nav.jobs"], ["/about", "nav.about"], ["/how-it-works", "nav.process"], ["/safety", "nav.safety"], ["/contact", "nav.contact"],
  ];
  return <>
    <a className="skip-link" href="#main-content">Skip to content</a>
    <header className="site-header">
      <div className="container header-inner">
        <Link to="/" className="brand" aria-label="GulfBridge Overseas home">
          <span className="brand-mark"><Globe2 size={22} /></span>
          <span><strong>GulfBridge</strong><small>OVERSEAS</small></span>
        </Link>
        <button className="mobile-menu-button" aria-label={menuOpen ? "Close menu" : "Open menu"} aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}>
          {menuOpen ? <X /> : <Menu />}
        </button>
        <nav className={`main-nav ${menuOpen ? "is-open" : ""}`} aria-label="Main navigation">
          {navLinks.map(([path, label]) => <Link key={path} to={path} className={location.pathname === path ? "active" : ""}>{t(label)}</Link>)}
          <button className="language-toggle" onClick={() => setLang(lang === "en" ? "ml" : "en")} aria-label="Switch language">
            {lang === "en" ? "മലയാളം" : "English"} <ChevronDown size={14} />
          </button>
        </nav>
      </div>
    </header>
    <main id="main-content"><RoutesContent /></main>
    <Footer />
  </>;
}

function RoutesContent() {
  return <Routes>
    <Route path="/" element={<Home />} />
    <Route path="/jobs" element={<JobsPage />} />
    <Route path="/jobs/:slug" element={<JobDetails />} />
    <Route path="/apply/:jobId" element={<ApplicationPage />} />
    <Route path="/about" element={<InfoPage titleKey="about.title" bodyKey="about.body" />} />
    <Route path="/how-it-works" element={<ProcessPage />} />
    <Route path="/safety" element={<SafetyPage />} />
    <Route path="/contact" element={<ContactPage />} />
    <Route path="/privacy" element={<InfoPage titleKey="privacy.title" bodyKey="privacy.body" />} />
    <Route path="/terms" element={<InfoPage titleKey="terms.title" bodyKey="terms.body" />} />
    <Route path="/admin/login" element={<AdminLogin />} />
    <Route path="/admin/*" element={<AdminPanel />} />
    <Route path="*" element={<NotFound />} />
  </Routes>;
}

function Footer() {
  const { t } = useCopy();
  const phone = import.meta.env.VITE_BUSINESS_PHONE as string | undefined;
  const whatsapp = import.meta.env.VITE_WHATSAPP_URL as string | undefined;
  const address = import.meta.env.VITE_BUSINESS_ADDRESS as string | undefined;
  const partnerDetails = import.meta.env.VITE_RECRUITMENT_PARTNER_PUBLIC_DETAILS as string | undefined;
  return <footer className="site-footer">
    <div className="container footer-grid">
      <div className="footer-brand">
        <Link to="/" className="brand brand-light"><span className="brand-mark"><Globe2 size={22} /></span><span><strong>GulfBridge</strong><small>OVERSEAS</small></span></Link>
        <p>{t("hero.malayalam")}</p>
        <p className="footer-tagline">{t("common.disclaimer")}</p>
      </div>
      <div><h3>Explore</h3><Link to="/jobs">{t("nav.jobs")}</Link><Link to="/how-it-works">{t("nav.process")}</Link><Link to="/safety">{t("nav.safety")}</Link></div>
      <div><h3>{t("nav.contact")}</h3>
        <a href={`mailto:${businessEmail}`}><Mail size={15} />{businessEmail}</a>
        {phone && <a href={`tel:${phone}`}><Phone size={15} />{phone}</a>}
        {whatsapp && <a href={whatsapp} target="_blank" rel="noreferrer"><Phone size={15} />WhatsApp</a>}
        <a href={instagramUrl} target="_blank" rel="noreferrer"><Instagram size={15} />Instagram</a>
        {address && <span className="muted-footer">{address}</span>}
        {partnerDetails && <span className="muted-footer">{partnerDetails}</span>}
      </div>
    </div>
    <div className="container footer-bottom"><span>© {new Date().getFullYear()} GulfBridge Overseas</span><div><Link to="/privacy">{t("privacy.title")}</Link><Link to="/terms">{t("terms.title")}</Link><Link to="/admin/login">{t("nav.admin")}</Link></div></div>
  </footer>;
}

function Home() {
  const { t } = useCopy();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [jobsError, setJobsError] = useState(false);
  useEffect(() => { listPublishedJobs().then(setJobs).catch(() => setJobsError(true)); }, []);
  return <>
    <section className="hero">
      <div className="hero-image" aria-hidden="true" />
      <div className="container hero-content">
        <p className="eyebrow"><span />{t("hero.eyebrow")}</p>
        <h1>{t("hero.title")}</h1>
        <p className="hero-malayalam" lang="ml">{t("hero.malayalam")}</p>
        <p className="hero-body">{t("hero.body")}</p>
        <div className="button-row"><Link to="/jobs" className="button button-gold">{t("hero.jobs")}<ArrowRight size={17} /></Link><Link to="/how-it-works" className="button button-outline">{t("hero.process")}</Link></div>
        <div className="hero-note"><ShieldCheck size={17} /> Verified details. Clear next steps. No false promises.</div>
      </div>
      <div className="hero-decor" aria-hidden="true"><span>GB</span></div>
    </section>
    <section className="section destinations-section">
      <div className="container"><SectionHeading eyebrow="DESTINATIONS" title={t("home.destinations")} body={t("home.destinationsBody")} />
        <div className="destination-grid">{[
          ["UAE", "United Arab Emirates", "photo-1512453979798-5ea266f8880c"], ["Saudi Arabia", "Kingdom of Saudi Arabia", "photo-1518684079-3c830dcef090"], ["Qatar", "State of Qatar", "photo-1578895101408-1a36b834405b"], ["Oman", "Sultanate of Oman", "photo-1518005020951-eccb494ad742"], ["Kuwait", "State of Kuwait", "photo-1519501025264-65ba15a82390"],
        ].map(([country, sub, image]) => <Link className="destination-card" to={`/jobs?country=${encodeURIComponent(country)}`} key={country} style={{ backgroundImage: `linear-gradient(0deg,rgba(7,26,53,.9),rgba(7,26,53,.02)),url(https://images.unsplash.com/${image}?auto=format&fit=crop&w=700&q=75)` }}>
          <span>{country}</span><small>{sub}</small><ArrowRight size={18} />
        </Link>)}</div>
      </div>
    </section>
    <section className="section section-soft">
      <div className="container">
        <SectionHeading eyebrow="OPPORTUNITIES" title={t("home.latest")} body={t("home.latestBody")} />
        {jobsError ? <InlineNotice>{t("common.error")}</InlineNotice> : jobs.length ? <div className="job-grid">{jobs.slice(0, 3).map(job => <JobCard key={job.id} job={job} />)}</div> : <EmptyState title={t("jobs.empty")} body={t("jobs.emptyBody")} />}
        <div className="centered-action"><Link className="text-link" to="/jobs">{t("home.allJobs")}<ArrowRight size={17} /></Link></div>
      </div>
    </section>
    <section className="section">
      <div className="container">
        <SectionHeading eyebrow="INDUSTRIES" title={t("home.categories")} body={t("home.categoriesBody")} />
        <div className="category-grid">{[["Building2", "Construction"], ["BriefcaseBusiness", "Hospitality"], ["ShieldCheck", "Healthcare"], ["Globe2", "Logistics"]].map(([icon, name]) => <div className="category-card" key={name}><span className="icon-box">{icon === "Building2" ? <Building2 /> : icon === "BriefcaseBusiness" ? <BriefcaseBusiness /> : icon === "ShieldCheck" ? <ShieldCheck /> : <Globe2 />}</span><strong>{name}</strong><span>Explore published roles <ArrowDownRight size={15} /></span></div>)}</div>
      </div>
    </section>
    <section className="section process-band">
      <div className="container process-band-inner"><div><p className="eyebrow">{t("home.process")}</p><h2>{t("home.processBody")}</h2><Link to="/how-it-works" className="button button-outline-light">{t("common.learnMore")}<ArrowRight size={17} /></Link></div>
        <div className="process-mini"><div><span>01</span><p>Review clear job information</p></div><div><span>02</span><p>Apply with confidence</p></div><div><span>03</span><p>Understand each next step</p></div></div>
      </div>
    </section>
    <section className="section faq-section"><div className="container"><SectionHeading eyebrow="GOOD TO KNOW" title={t("faq.title")} /><div className="faq-list">
      {([
        ["faq.guaranteeQuestion", "faq.guaranteeAnswer"],
        ["faq.verifiedQuestion", "faq.verifiedAnswer"],
        ["faq.documentsQuestion", "faq.documentsAnswer"],
        ["faq.feesQuestion", "faq.feesAnswer"],
      ] as const).map(([question, answer]) => <details key={question}><summary>{t(question)}</summary><p>{t(answer)}</p></details>)}
    </div></div></section>
    <section className="section safety-cta"><div className="container safety-cta-inner"><span className="icon-box gold-icon"><ShieldCheck size={27} /></span><div><h2>{t("home.safety")}</h2><p>{t("home.safetyBody")}</p></div><Link className="button button-navy" to="/safety">{t("home.safetyLink")}<ArrowRight size={17} /></Link></div></section>
    <section className="employer-cta"><div className="container employer-inner"><div><p className="eyebrow">{t("home.employer")}</p><h2>{t("home.employerBody")}</h2></div><Link className="button button-gold" to="/contact">{t("home.employerLink")}<ArrowRight size={17} /></Link></div></section>
  </>;
}

function SectionHeading({ eyebrow, title, body }: { eyebrow: string; title: string; body?: string }) {
  return <div className="section-heading"><p className="eyebrow">{eyebrow}</p><h2>{title}</h2>{body && <p>{body}</p>}</div>;
}

function JobCard({ job }: { job: Job }) {
  const { t } = useCopy();
  return <article className="job-card">
    <div className="job-card-top"><span className="job-category">{job.category}</span>{job.verification_status === "verified" ? <span className="verification-pill"><BadgeCheck size={14} />{t("job.verified")}</span> : <span className="verification-pending"><Clock3 size={14} />{t("job.awaiting")}</span>}</div>
    <h3><Link to={`/jobs/${job.slug}`}>{job.title}</Link></h3>
    <p className="job-place"><MapPin size={15} />{[job.city, job.country].filter(Boolean).join(", ")}</p>
    <div className="job-card-meta"><span>{t("job.reference")}: {job.reference_code}</span>{job.employment_type && <span>{job.employment_type}</span>}</div>
    <div className="job-card-meta job-card-secondary">
      {(job.salary_min != null || job.salary_max != null) && <span>{t("job.salary")}: {job.salary_min ?? "—"}–{job.salary_max ?? "—"} {job.salary_currency ?? ""}</span>}
      {job.vacancies_count != null && <span>{t("job.vacancies")}: {job.vacancies_count}</span>}
      <span>{t("common.updated")}: {new Date(job.updated_at).toLocaleDateString()}</span>
    </div>
    <Link className="job-card-link" to={`/jobs/${job.slug}`}>View opportunity<ArrowRight size={16} /></Link>
  </article>;
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return <div className="empty-state"><span className="icon-box"><BriefcaseBusiness /></span><h3>{title}</h3><p>{body}</p></div>;
}

function JobsPage() {
  const { t } = useCopy();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [country, setCountry] = useState(new URLSearchParams(window.location.search).get("country") ?? "");
  const [category, setCategory] = useState("");
  const [experience, setExperience] = useState("");
  const [employment, setEmployment] = useState("");
  useEffect(() => {
    let active = true;
    listPublishedJobs()
      .then(result => { if (active) setJobs(result); })
      .catch(() => { if (active) setError(true); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  const countries = [...new Set(jobs.map(job => job.country))];
  const categories = [...new Set(jobs.map(job => job.category))];
  const filtered = jobs.filter(job => {
    const haystack = `${job.title} ${job.city ?? ""} ${job.country} ${job.reference_code} ${job.category}`.toLowerCase();
    return (!search || haystack.includes(search.toLowerCase()))
      && (!country || job.country === country)
      && (!category || job.category === category)
      && (!experience || job.experience_level === experience)
      && (!employment || job.employment_type === employment);
  });
  return <PageHero eyebrow="CURRENT OPPORTUNITIES" title={t("jobs.title")} body={t("jobs.intro")}>
    <div className="container jobs-content">
      <div className="filter-bar">
        <label className="search-field"><Search size={17} /><input value={search} onChange={event => setSearch(event.target.value)} placeholder={t("jobs.search")} aria-label={t("jobs.search")} /></label>
        <select value={country} onChange={event => setCountry(event.target.value)} aria-label={t("common.country")}><option value="">{t("jobs.country")}</option>{countries.map(value => <option key={value}>{value}</option>)}</select>
        <select value={category} onChange={event => setCategory(event.target.value)} aria-label={t("common.category")}><option value="">{t("jobs.category")}</option>{categories.map(value => <option key={value}>{value}</option>)}</select>
        <select value={experience} onChange={event => setExperience(event.target.value)} aria-label={t("jobs.experience")}><option value="">{t("jobs.experience")}</option>{["Entry", "Mid", "Senior"].map(value => <option key={value}>{value}</option>)}</select>
        <select value={employment} onChange={event => setEmployment(event.target.value)} aria-label={t("common.employment")}><option value="">{t("jobs.type")}</option>{[...new Set(jobs.map(job => job.employment_type).filter(Boolean))].map(value => <option key={value}>{value}</option>)}</select>
      </div>
      {loading ? <div className="jobs-loading" role="status">Loading current vacancies…</div>
        : error ? <InlineNotice>{t("common.error")}</InlineNotice>
          : filtered.length ? <div className="job-grid">{filtered.map(job => <JobCard key={job.id} job={job} />)}
            </div> : <EmptyState title={t("jobs.empty")} body={t("jobs.emptyBody")} />}
    </div>
  </PageHero>;
}

function PageHero({ eyebrow, title, body, children }: { eyebrow: string; title: string; body: string; children?: ReactNode }) {
  return <><section className="page-hero"><div className="container"><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p>{body}</p></div></section>{children}</>;
}

function JobDetails() {
  const { slug = "" } = useParams();
  const { t } = useCopy();
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  useEffect(() => { setLoading(true); getPublishedJob(slug).then(setJob).catch(() => setError(true)).finally(() => setLoading(false)); }, [slug]);
  if (loading) return <div className="container page-state">Loading opportunity…</div>;
  if (error) return <div className="container page-state"><InlineNotice>{t("common.error")}</InlineNotice></div>;
  if (!job) return <div className="container page-state"><EmptyState title="Opportunity unavailable" body="This listing may have closed or is no longer published." /><Link className="button button-navy" to="/jobs">Browse vacancies</Link></div>;
  const salary = job.salary_min != null || job.salary_max != null
    ? `${job.salary_min ?? "—"} – ${job.salary_max ?? "—"} ${job.salary_currency ?? ""}`
    : t("job.awaiting");
  return <div className="container detail-page">
    <Link className="back-link" to="/jobs">← All vacancies</Link>
    <div className="detail-layout">
      <article className="detail-main">
        <span className="job-category">{job.category}</span><h1>{job.title}</h1><p className="job-place"><MapPin size={16} />{[job.city, job.country].filter(Boolean).join(", ")}</p>
        <div className="detail-info-grid"><InfoItem label={t("job.reference")} value={job.reference_code} /><InfoItem label={t("common.country")} value={job.country} /><InfoItem label={t("common.city")} value={job.city} /><InfoItem label={t("common.employment")} value={job.employment_type} /><InfoItem label={t("job.salary")} value={salary} /><InfoItem label={t("job.deadline")} value={job.application_deadline} /><InfoItem label={t("job.contract")} value={job.contract_duration} /><InfoItem label={t("common.updated")} value={new Date(job.updated_at).toLocaleDateString()} /></div>
        <DetailSection title={t("job.employer")}>{job.employer_disclosure_status === "disclosed" && job.employer_display_name ? job.employer_display_name : job.employer_disclosure_status === "confidential" ? "Employer details are not publicly disclosed." : t("job.awaiting")}</DetailSection>
        {job.description && <DetailSection title="Overview">{job.description}</DetailSection>}
        {job.responsibilities && <DetailSection title={t("job.responsibilities")}>{job.responsibilities}</DetailSection>}
        <DetailSection title={t("job.qualifications")}>{job.qualifications || t("job.awaiting")}</DetailSection>
        <DetailSection title={t("job.experience")}>{job.experience_requirements || t("job.awaiting")}</DetailSection>
        {job.benefits && <DetailSection title={t("job.benefits")}>{job.benefits}</DetailSection>}
        {job.vacancies_count != null && <DetailSection title={t("job.vacancies")}>{job.vacancies_count}</DetailSection>}
        {job.working_hours && <DetailSection title={t("job.workingHours")}>{job.working_hours}</DetailSection>}
        {job.weekly_rest && <DetailSection title={t("job.weeklyRest")}>{job.weekly_rest}</DetailSection>}
        {job.accommodation && <DetailSection title={t("job.accommodation")}>{job.accommodation}</DetailSection>}
        {job.transport && <DetailSection title={t("job.transport")}>{job.transport}</DetailSection>}
        {job.work_permit_information && <DetailSection title={t("job.workPermit")}>{job.work_permit_information}</DetailSection>}
        {job.required_documents && <DetailSection title={t("job.documents")}>{job.required_documents}</DetailSection>}
      </article>
      <aside className="detail-aside">
        <div className="verification-box">{job.verification_status === "verified" ? <BadgeCheck /> : <Clock3 />}<div><strong>{t("job.verification")}</strong><p>{job.verification_status === "verified" ? t("job.verified") : t("job.awaiting")}</p></div></div>
        <p className="small-muted">{t("job.disclaimer")}</p>
        <Link className="button button-gold full-width" to={`/apply/${job.id}`}>{t("job.apply")}<ArrowRight size={17} /></Link>
        <p className="tiny-muted">Never pay unexpected fees or share sensitive documents before verifying the process.</p>
      </aside>
    </div>
  </div>;
}

function InfoItem({ label, value }: { label: string; value: string | number | null }) {
  const { t } = useCopy();
  return <div><small>{label}</small><strong>{value || t("job.awaiting")}</strong></div>;
}

function DetailSection({ title, children }: { title: string; children: ReactNode }) {
  return <section className="detail-section"><h2>{title}</h2><p>{children}</p></section>;
}

function ApplicationPage() {
  const { jobId = "" } = useParams();
  const { t } = useCopy();
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reference, setReference] = useState("");
  useEffect(() => { listPublishedJobs().then(jobs => setJob(jobs.find(item => item.id === jobId) ?? null)).catch(() => setError(t("common.error"))).finally(() => setLoading(false)); }, [jobId, t]);
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError("");
    if (!job) { setError(t("common.error")); return; }
    const form = new FormData(event.currentTarget);
    if (form.get("privacy-consent") !== "on") { setError(t("common.error")); return; }
    try {
      const receipt = await submitApplication({
        jobId: job.id,
        applicantName: String(form.get("name")).trim(),
        email: String(form.get("email")).trim(),
        phone: String(form.get("phone")).trim(),
        currentLocation: String(form.get("location")).trim(),
        preferredDestination: String(form.get("destination")),
        experience: String(form.get("experience")).trim(),
        qualifications: String(form.get("qualifications")).trim(),
        message: String(form.get("message")).trim(),
      });
      setReference(receipt);
    } catch { setError(t("common.error")); }
  }
  if (loading) return <div className="container page-state">Loading application…</div>;
  if (reference) return <div className="container page-state"><div className="success-card"><span className="success-icon"><Check /></span><p className="eyebrow">APPLICATION RECEIPT</p><h1>{t("apply.success")}</h1><p>{t("apply.successBody", { reference })}</p><Link to="/jobs" className="button button-navy">Back to vacancies</Link></div></div>;
  if (!job) return <div className="container page-state">{error && <InlineNotice>{error}</InlineNotice>}<EmptyState title="Opportunity unavailable" body="This vacancy is no longer accepting applications." /><Link to="/jobs" className="button button-navy">Browse vacancies</Link></div>;
  return <PageHero eyebrow={`VACANCY ${job.reference_code}`} title={t("apply.title")} body={`${job.title} · ${job.country}`}>
    <div className="container form-wrap"><p className="form-intro">{t("apply.intro")}</p>{!isSupabaseConfigured && <InlineNotice>{t("admin.unconfigured")}</InlineNotice>}
      <form className="form-card" onSubmit={handleSubmit}>
        <div className="form-grid">
          <FormField label={t("apply.name")} name="name" required autoComplete="name" maxLength={120} />
          <FormField label={t("apply.email")} name="email" type="email" required autoComplete="email" maxLength={254} />
          <FormField label={t("apply.phone")} name="phone" required autoComplete="tel" maxLength={30} pattern="^\\+[1-9][0-9 ()-]{5,24}$" placeholder="+<country code> <number>" />
          <FormField label={t("apply.location")} name="location" required />
          <label className="form-field"><span>{t("apply.destination")} <i>*</i></span><select name="destination" required defaultValue={job.country}><option>UAE</option><option>Saudi Arabia</option><option>Qatar</option><option>Oman</option><option>Kuwait</option></select></label>
          <label className="form-field"><span>{t("apply.experience")} <i>*</i></span><textarea name="experience" rows={3} maxLength={4000} required /></label>
          <label className="form-field full-field"><span>{t("apply.qualifications")} <i>*</i></span><textarea name="qualifications" rows={3} maxLength={2000} required /></label>
          <label className="form-field full-field"><span>{t("apply.message")}</span><textarea name="message" rows={3} maxLength={1000} /></label>
        </div>
        <label className="consent-row"><input type="checkbox" name="privacy-consent" required /><span>{t("apply.consent")} <Link to="/privacy" target="_blank">Privacy notice</Link></span></label>
        <p className="tiny-muted">Do not include passport numbers, medical details, passwords or financial information.</p>
        {error && <InlineNotice>{error}</InlineNotice>}
        <button className="button button-gold" type="submit" disabled={!isSupabaseConfigured}>{t("apply.submit")}<ArrowRight size={17} /></button>
      </form>
    </div>
  </PageHero>;
}

function FormField({ label, name, type = "text", required = false, autoComplete, defaultValue, maxLength = 200, pattern, placeholder, min, step }: { label: string; name: string; type?: string; required?: boolean; autoComplete?: string; defaultValue?: string | number | null; maxLength?: number; pattern?: string; placeholder?: string; min?: number; step?: number | "any" }) {
  return <label className="form-field"><span>{label}{required && <i> *</i>}</span><input name={name} type={type} required={required} autoComplete={autoComplete} maxLength={maxLength} pattern={pattern} placeholder={placeholder} defaultValue={defaultValue ?? ""} min={min} step={step} /></label>;
}

function InfoPage({ titleKey, bodyKey }: { titleKey: Key; bodyKey: Key }) {
  const { t } = useCopy();
  return <PageHero eyebrow="GULFBRIDGE OVERSEAS" title={t(titleKey)} body={t(bodyKey)}>{titleKey === "privacy.title" && <div className="container text-page"><p>For privacy questions or deletion requests, please use the contact form. A named privacy contact and finalized retention schedule must be configured before public launch.</p></div>}</PageHero>;
}

function ProcessPage() {
  const { t } = useCopy();
  return <PageHero eyebrow="OUR APPROACH" title={t("process.title")} body={t("process.intro")}>
    <div className="container steps-list">{[t("process.step1"), t("process.step2"), t("process.step3"), t("process.step4")].map((text, index) => <div className="step-card" key={text}><span>0{index + 1}</span><p>{text}</p></div>)}<div className="notice-box"><ShieldCheck /><p>{t("common.disclaimer")}</p></div></div>
  </PageHero>;
}

function SafetyPage() {
  const { t } = useCopy();
  return <PageHero eyebrow="STAY INFORMED" title={t("safety.title")} body={t("safety.body")}><div className="container safety-list">
    {[t("safety.tip1"), t("safety.tip2"), t("safety.tip3"), t("safety.tip4")].map(tip => <div key={tip} className="safety-tip"><span><ShieldCheck size={21} /></span><p>{tip}</p></div>)}
    <div className="alert-panel"><CircleAlert /><div><strong>{t("safety.alertTitle")}</strong><p>{t("safety.alertBody")}</p></div></div>
  </div></PageHero>;
}

function ContactPage() {
  const { t } = useCopy();
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);
  const phone = import.meta.env.VITE_BUSINESS_PHONE?.trim();
  const whatsapp = import.meta.env.VITE_WHATSAPP_URL?.trim();
  const address = import.meta.env.VITE_BUSINESS_ADDRESS as string | undefined;
  const partnerDetails = import.meta.env.VITE_RECRUITMENT_PARTNER_PUBLIC_DETAILS as string | undefined;
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setMessage("");
    const form = new FormData(event.currentTarget);
    try {
      await submitEnquiry({
        name: String(form.get("name")).trim(),
        email: String(form.get("email")).trim(),
        phone: String(form.get("phone")).trim(),
        enquiryType: String(form.get("type")),
        message: String(form.get("message")).trim(),
      });
      setSent(true);
    } catch { setMessage(t("common.error")); }
  }
  return <PageHero eyebrow="LET'S CONNECT" title={t("contact.title")} body={t("contact.intro")}><div className="container form-wrap contact-wrap">
    <div className="contact-details"><h2>GulfBridge Overseas</h2><p>Reach us by email or follow us on Instagram.</p>
      <div><Mail /><a href={`mailto:${businessEmail}`}>{businessEmail}</a></div>
      <div><Instagram /><a href={instagramUrl} target="_blank" rel="noreferrer">Instagram · @gulfbridge.careers</a></div>
      {phone && <div><Phone /><a href={`tel:${phone}`}>{phone}</a></div>}
      {whatsapp && <div><Phone /><a href={whatsapp} target="_blank" rel="noreferrer">WhatsApp</a></div>}
      {address && <p>{address}</p>}{partnerDetails && <p>{partnerDetails}</p>}
    </div>
    <form className="form-card" onSubmit={handleSubmit}>
      {sent ? <div className="success-inline"><Check />{t("contact.sent")}</div> : <>
        {!isSupabaseConfigured && <InlineNotice>{t("admin.unconfigured")}</InlineNotice>}
        <FormField label={t("contact.name")} name="name" required maxLength={120} />
        <FormField label={t("apply.email")} name="email" type="email" required maxLength={254} />
        <FormField label={t("apply.phone")} name="phone" maxLength={30} pattern="^\\+[1-9][0-9 ()-]{5,24}$" placeholder="+<country code> <number>" />
        <label className="form-field"><span>{t("contact.type")}</span><select name="type"><option value="candidate">{t("contact.candidate")}</option><option value="employer">{t("contact.employer")}</option><option value="general">{t("contact.general")}</option></select></label>
        <label className="form-field"><span>{t("contact.message")} <i>*</i></span><textarea name="message" rows={4} maxLength={3000} required /></label>
        <label className="consent-row"><input type="checkbox" required /><span>{t("contact.consent")}</span></label>
        {message && <InlineNotice>{message}</InlineNotice>}
        <button className="button button-gold" disabled={!isSupabaseConfigured}>Send enquiry<ArrowRight size={16} /></button>
      </>}
    </form>
  </div></PageHero>;
}

function InlineNotice({ children }: { children: ReactNode }) {
  return <div className="inline-notice" role="alert"><CircleAlert size={17} />{children}</div>;
}

async function hasAdminAccess(): Promise<boolean> {
  if (!supabase) throw new Error("Supabase is not configured.");
  const { data, error } = await supabase.rpc("is_admin");
  if (error) throw error;
  return data === true;
}

function publicationFailureMessage(error: { code?: string; message?: string; details?: string; hint?: string }): string {
  const details = [error.message, error.details, error.hint].filter(Boolean).join(" ").toLowerCase();
  if (details.includes("private_employer_verification_required")) {
    return "Private employer verification is incomplete. Open Verification, save review notes of at least 5 characters, and mark the review complete. Then edit the vacancy, set its verification status to Verified, save, and retry publishing.";
  }
  if (error.code === "23514") {
    return "Database validation blocked publication. Set the vacancy verification status to Verified and save a completed private employer verification record with notes of at least 5 characters.";
  }
  if (error.code === "42501") {
    return "Supabase denied this action. Confirm this account is authorized in public.admin_users and the admin and schema migrations have been applied.";
  }
  return "Unable to publish this vacancy. Check the vacancy and private employer verification, then try again.";
}

function AdminLogin() {
  const { t } = useCopy();
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      if (!supabase) { setError(t("admin.unconfigured")); return; }
      const form = new FormData(event.currentTarget);
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: String(form.get("email")).trim(),
        password: String(form.get("password")),
      });
      if (authError) {
        const message = authError.message.toLowerCase();
        setError(
          message.includes("invalid login credentials")
            ? t("admin.invalidCredentials")
            : message.includes("too many requests") || message.includes("rate limit")
              ? t("admin.tooManyAttempts")
              : message.includes("email not confirmed")
                ? t("admin.emailNotConfirmed")
                : t("admin.loginFailed"),
        );
        return;
      }
      if (!data.user) {
        setError(t("admin.loginFailed"));
        return;
      }

      let authorized: boolean;
      try {
        authorized = await hasAdminAccess();
      } catch {
        const signedOut = await clearLoginSession();
        setError(signedOut ? t("admin.authorizationCheckFailed") : t("admin.authorizationCheckFailedSignOutFailed"));
        return;
      }

      if (!authorized) {
        const signedOut = await clearLoginSession();
        if (!signedOut) {
          setError(t("admin.authorizationCheckFailedSignOutFailed"));
          return;
        }
        setError(t("admin.noAccess"));
        return;
      }

      navigate("/admin");
    } catch {
      setError(t("admin.loginFailed"));
    } finally {
      setBusy(false);
    }
  }
  return <PageHero eyebrow="RESTRICTED ACCESS" title={t("admin.login")} body="For authorized administrators only.">
    <div className="container login-wrap"><form className="form-card login-card" onSubmit={handleSubmit}>
      {!isSupabaseConfigured && <InlineNotice>{t("admin.unconfigured")}</InlineNotice>}
      <FormField label={t("admin.email")} name="email" type="email" required autoComplete="username" maxLength={254} />
      <FormField label={t("admin.password")} name="password" type="password" required autoComplete="current-password" />
      {error && <InlineNotice>{error}</InlineNotice>}
      <button className="button button-navy full-width" disabled={busy || !isSupabaseConfigured}>{busy ? t("admin.signingIn") : t("admin.signin")}<LogIn size={17} /></button>
    </form></div>
  </PageHero>;
}

async function clearLoginSession(): Promise<boolean> {
  if (!supabase) return false;
  try {
    const { error: signOutError } = await supabase.auth.signOut();
    return !signOutError;
  } catch {
    return false;
  }
}

type AdminState = "loading" | "admin" | "denied" | "signedOut" | "unconfigured";
function AdminPanel() {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useCopy();
  const [state, setState] = useState<AdminState>(isSupabaseConfigured ? "loading" : "unconfigured");
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [jobsLoading, setJobsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [showJobForm, setShowJobForm] = useState(false);
  const [verificationJob, setVerificationJob] = useState<Job | null>(null);
  const [editingJob, setEditingJob] = useState<Job | null>(null);
  const section = location.pathname.split("/")[2] || "overview";
  const sectionName = section === "overview" ? "admin.dashboard" : section === "jobs" ? "admin.jobs" : section === "applications" ? "admin.applications" : "admin.enquiries";
  useEffect(() => {
    let active = true;
    async function verifyAdmin() {
      if (!supabase) { setState("unconfigured"); return; }
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (!active) return;
        if (!user) { setState("signedOut"); return; }
        if (authError) { setState("denied"); return; }
        setState(await hasAdminAccess() ? "admin" : "denied");
      } catch {
        if (active) setState("denied");
      }
    }
    setState("loading");
    void verifyAdmin();
    const { data: { subscription } } = supabase?.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        setState("signedOut");
        return;
      }
      setState("loading");
      queueMicrotask(() => { void verifyAdmin(); });
    }) ?? { data: { subscription: null } };
    return () => { active = false; subscription?.unsubscribe(); };
  }, [location.pathname]);
  useEffect(() => {
    if (state !== "admin") return;
    let active = true;
    async function loadRecords() {
      if (!supabase) return;
      setError("");
      if (section === "applications") {
        const { data, error: queryError } = await supabase.from("applications").select("id, applicant_name, email, phone, job_id, status, created_at, internal_notes").order("created_at", { ascending: false });
        if (active) { setRows(data ?? []); if (queryError) setError(t("common.error")); }
      } else if (section === "enquiries") {
        const { data, error: queryError } = await supabase.from("enquiries").select("id, name, email, phone, enquiry_type, message, created_at").order("created_at", { ascending: false });
        if (active) { setRows(data ?? []); if (queryError) setError(t("common.error")); }
      } else if (section === "jobs") {
        setJobsLoading(true);
        try {
          const { data, error: queryError } = await supabase.from("jobs").select("*").order("created_at", { ascending: false });
          if (!active) return;
          if (queryError) setError(t("common.error"));
          else setJobs((data ?? []) as Job[]);
        } catch {
          if (active) setError(t("common.error"));
        } finally {
          if (active) setJobsLoading(false);
        }
      } else {
        const { data, error: queryError } = await supabase.from("applications").select("id, status").order("created_at", { ascending: false }).limit(6);
        if (active) { setRows(data ?? []); if (queryError) setError(t("common.error")); }
      }
    }
    void loadRecords();
    return () => { active = false; };
  }, [state, section, refreshKey, t]);
  async function signOut() {
    if (!supabase) return;
    const { error: signOutError } = await supabase.auth.signOut();
    if (signOutError) {
      window.alert("Unable to sign out. Please try again.");
      return;
    }
    setState("signedOut");
    navigate("/admin/login");
  }
  if (state === "loading") return <div className="container page-state">Checking administrator access…</div>;
  if (state === "signedOut") return <Navigate to="/admin/login" replace />;
  if (state === "unconfigured") return <div className="container page-state"><InlineNotice>{t("admin.unconfigured")}</InlineNotice></div>;
  if (state === "denied") return <div className="container page-state"><InlineNotice>{t("admin.noAccess")}</InlineNotice><button className="button button-navy" onClick={signOut}>{t("admin.signout")}</button></div>;
  return <div className="admin-page"><div className="container admin-layout">
    <aside className="admin-sidebar"><p className="eyebrow">GULFBRIDGE</p><h2>Admin</h2>
      <Link className={section === "overview" ? "selected" : ""} to="/admin">{t("admin.dashboard")}</Link>
      <Link className={section === "jobs" ? "selected" : ""} to="/admin/jobs">{t("admin.jobs")}</Link>
      <Link className={section === "applications" ? "selected" : ""} to="/admin/applications">{t("admin.applications")}</Link>
      <Link className={section === "enquiries" ? "selected" : ""} to="/admin/enquiries">{t("admin.enquiries")}</Link>
      <button className="signout-button" onClick={signOut}><LogOut size={16} />{t("admin.signout")}</button>
    </aside>
    <section className="admin-content"><div className="admin-heading"><div><p className="eyebrow">ADMINISTRATION</p><h1>{t(sectionName as Key)}</h1></div>
      {section === "jobs" && <button className="button button-gold" onClick={() => { setEditingJob(null); setShowJobForm(true); }}>+ Add vacancy</button>}</div>
      {error && <InlineNotice>{error}</InlineNotice>}
      {success && <div className="success-notice" role="status">{success}</div>}
      {section === "jobs" ? jobsLoading ? <div className="jobs-loading" role="status">Loading vacancies…</div> : <AdminJobs jobs={jobs} onEdit={job => { setEditingJob(job); setShowJobForm(true); }} onVerify={setVerificationJob} onRefresh={message => { setSuccess(message); setError(""); setRefreshKey(value => value + 1); }} /> :
        section === "applications" ? <AdminApplications rows={rows} onRefresh={() => setRefreshKey(value => value + 1)} /> :
          section === "enquiries" ? <AdminEnquiries rows={rows} onRefresh={() => setRefreshKey(value => value + 1)} /> : <AdminOverview rows={rows} />}
      {showJobForm && <JobEditor job={editingJob} onClose={() => setShowJobForm(false)} onSaved={message => { setShowJobForm(false); setSuccess(message); setError(""); setRefreshKey(value => value + 1); }} />}
      {verificationJob && <VerificationEditor
        job={verificationJob}
        onClose={() => setVerificationJob(null)}
        onSaved={message => {
          setVerificationJob(null);
          setSuccess(message);
          setError("");
          setRefreshKey(value => value + 1);
        }}
      />}
    </section>
  </div></div>;
}

function AdminOverview({ rows }: { rows: Record<string, unknown>[] }) {
  const { t } = useCopy();
  const latestApplication = rows[0]?.created_at ? new Date(String(rows[0].created_at)).toLocaleDateString() : "No applications yet";
  return <><div className="admin-stat-grid"><div><span>Latest application</span><strong>{latestApplication}</strong></div><div><span>Candidate data</span><strong>Admin-only</strong></div><div><span>Vacancy workflow</span><strong>Draft → verify → publish</strong></div></div><div className="admin-note"><ShieldCheck /><p>Only authorized administrators can access private candidate and employer enquiry records. Do not export or share personal data unless necessary and authorized.</p></div><Link to="/admin/applications" className="text-link">{t("admin.applications")}<ArrowRight size={16} /></Link></>;
}

function AdminJobs({ jobs, onEdit, onVerify, onRefresh }: { jobs: Job[]; onEdit: (job: Job) => void; onVerify: (job: Job) => void; onRefresh: (message: string) => void }) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [actionError, setActionError] = useState("");
  const [busyJobId, setBusyJobId] = useState("");
  const visibleJobs = jobs.filter(job =>
    `${job.title} ${job.reference_code} ${job.country}`.toLowerCase().includes(search.toLowerCase())
    && (!statusFilter || job.publication_status === statusFilter),
  );
  async function updateStatus(job: Job, status: "draft" | "published" | "closed") {
    if (!supabase || busyJobId) return;
    if (status === "published" && !window.confirm(`Publish ${job.title}? Published vacancy details are visible to the public.`)) return;
    setBusyJobId(job.id);
    setActionError("");
    const { error: updateError } = await supabase.from("jobs").update({ publication_status: status }).eq("id", job.id);
    setBusyJobId("");
    if (updateError) {
      setActionError(status === "published" ? publicationFailureMessage(updateError) : "Unable to update this vacancy. Please try again.");
      return;
    }
    onRefresh(status === "published" ? "Vacancy published." : status === "closed" ? "Vacancy closed." : "Vacancy unpublished and saved as a draft.");
  }
  async function deleteJob(job: Job) {
    if (!supabase || busyJobId || !window.confirm(`Permanently delete ${job.title}? This cannot be undone.`)) return;
    setBusyJobId(job.id);
    setActionError("");
    const { error: deleteError } = await supabase.from("jobs").delete().eq("id", job.id);
    setBusyJobId("");
    if (deleteError) {
      setActionError(deleteError.message.includes("foreign key")
        ? "This vacancy has applications and cannot be deleted. Close it instead to preserve application records."
        : "Unable to delete this vacancy. Please try again.");
      return;
    }
    onRefresh("Vacancy deleted.");
  }
  return <>{actionError && <InlineNotice>{actionError}</InlineNotice>}<div className="admin-list-filters"><label className="admin-search"><Search size={15} /><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search vacancies" /></label><select value={statusFilter} onChange={event => setStatusFilter(event.target.value)}><option value="">All publication states</option>{["draft", "published", "paused", "closed", "archived"].map(status => <option key={status} value={status}>{status}</option>)}</select></div><div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Vacancy</th><th>Reference</th><th>Verification</th><th>Publication</th><th>Actions</th></tr></thead><tbody>
    {visibleJobs.map(job => <tr key={job.id}><td><strong>{job.title}</strong><small>{job.country} · {job.category}</small></td><td>{job.reference_code}</td><td>{job.verification_status}</td><td>{job.publication_status}</td><td className="job-actions">
      <button className="small-action" disabled={busyJobId === job.id || Boolean(busyJobId)} onClick={() => onEdit(job)}>Edit</button>
      <button className="small-action" disabled={busyJobId === job.id || Boolean(busyJobId)} onClick={() => onVerify(job)}>Verification</button>
      {job.publication_status === "published"
        ? <button className="small-action" disabled={Boolean(busyJobId)} onClick={() => void updateStatus(job, "draft")}>Unpublish</button>
        : <button className="small-action" disabled={Boolean(busyJobId)} onClick={() => void updateStatus(job, "published")}>Publish</button>}
      {job.publication_status !== "closed" && <button className="small-action" disabled={Boolean(busyJobId)} onClick={() => void updateStatus(job, "closed")}>Close</button>}
      <button className="small-action danger-action" disabled={Boolean(busyJobId)} onClick={() => void deleteJob(job)}>Delete</button>
      {busyJobId === job.id && <small role="status">Saving…</small>}
    </td></tr>)}
    {!visibleJobs.length && <tr><td colSpan={5}>No matching vacancies.</td></tr>}
  </tbody></table></div></>;
}

function AdminApplications({ rows, onRefresh }: { rows: Record<string, unknown>[]; onRefresh: () => void }) {
  const stages = ["received", "under_review", "shortlisted", "interview_scheduled", "employer_decision_pending", "closed"];
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const visibleRows = rows.filter(row => `${row.applicant_name} ${row.email}`.toLowerCase().includes(search.toLowerCase()) && (!statusFilter || row.status === statusFilter));
  async function updateStatus(id: string, status: string) {
    if (!supabase) return;
    const { error } = await supabase.from("applications").update({ status }).eq("id", id);
    if (error) { window.alert("Unable to update application status."); return; }
    onRefresh();
  }
  async function updateNotes(id: string, notes: string) {
    if (!supabase) return;
    const original = rows.find(row => row.id === id)?.internal_notes;
    const trimmedNotes = notes.trim();
    if (trimmedNotes === String(original ?? "")) return;
    const { error } = await supabase.from("applications").update({ internal_notes: trimmedNotes || null }).eq("id", id);
    if (error) window.alert("Unable to save the internal note.");
  }
  async function deleteApplication(row: Record<string, unknown>) {
    if (!supabase || !window.confirm(`Permanently delete the application from ${String(row.applicant_name)}? This cannot be undone.`)) return;
    const { error } = await supabase.from("applications").delete().eq("id", String(row.id));
    if (error) { window.alert("Unable to delete the application."); return; }
    onRefresh();
  }
  return <><div className="admin-list-filters"><label className="admin-search"><Search size={15} /><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search candidate or email" /></label><select value={statusFilter} onChange={event => setStatusFilter(event.target.value)}><option value="">All stages</option>{stages.map(stage => <option key={stage} value={stage}>{stage.replaceAll("_", " ")}</option>)}</select></div><div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Candidate</th><th>Contact</th><th>Submitted</th><th>Stage</th><th>Internal note</th><th>Data action</th></tr></thead><tbody>
    {visibleRows.map(row => <tr key={String(row.id)}><td><strong>{String(row.applicant_name)}</strong></td><td>{String(row.email)}<small>{String(row.phone)}</small></td><td>{new Date(String(row.created_at)).toLocaleDateString()}</td><td><select aria-label={`Status for ${String(row.applicant_name)}`} value={String(row.status)} onChange={event => void updateStatus(String(row.id), event.target.value)}>{stages.map(stage => <option key={stage} value={stage}>{stage.replaceAll("_", " ")}</option>)}</select></td><td><input className="note-input" aria-label={`Internal note for ${String(row.applicant_name)}`} defaultValue={String(row.internal_notes ?? "")} maxLength={2000} placeholder="Add private note" onBlur={event => void updateNotes(String(row.id), event.target.value)} /></td><td><button className="small-action danger-action" onClick={() => void deleteApplication(row)}>Delete</button></td></tr>)}
    {!visibleRows.length && <tr><td colSpan={6}>No matching applications.</td></tr>}
  </tbody></table></div></>;
}

function AdminEnquiries({ rows, onRefresh }: { rows: Record<string, unknown>[]; onRefresh: () => void }) {
  const [search, setSearch] = useState("");
  const visibleRows = rows.filter(row => `${row.name} ${row.email} ${row.enquiry_type} ${row.message}`.toLowerCase().includes(search.toLowerCase()));
  async function deleteEnquiry(row: Record<string, unknown>) {
    if (!supabase || !window.confirm(`Permanently delete the enquiry from ${String(row.name)}? This cannot be undone.`)) return;
    const { error } = await supabase.from("enquiries").delete().eq("id", String(row.id));
    if (error) { window.alert("Unable to delete the enquiry."); return; }
    onRefresh();
  }
  return <><label className="admin-search"><Search size={15} /><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search enquiries" /></label><div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Contact</th><th>Type</th><th>Message</th><th>Received</th><th>Data action</th></tr></thead><tbody>
    {visibleRows.map(row => <tr key={String(row.id)}><td><strong>{String(row.name)}</strong><small>{String(row.email)} · {String(row.phone || "No phone")}</small></td><td>{String(row.enquiry_type)}</td><td className="message-cell">{String(row.message)}</td><td>{new Date(String(row.created_at)).toLocaleDateString()}</td><td><button className="small-action danger-action" onClick={() => void deleteEnquiry(row)}>Delete</button></td></tr>)}
    {!visibleRows.length && <tr><td colSpan={5}>No matching enquiries.</td></tr>}
  </tbody></table></div></>;
}

function VerificationEditor({ job, onClose, onSaved }: { job: Job; onClose: () => void; onSaved: (message: string) => void }) {
  const [record, setRecord] = useState<Record<string, unknown> | null>();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    async function load() {
      if (!supabase) return;
      const { data, error: queryError } = await supabase.from("employer_verifications").select("*").eq("job_id", job.id).maybeSingle();
      if (queryError) setError("Unable to load private verification information.");
      else setRecord(data);
    }
    void load();
  }, [job.id]);
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      if (!supabase) { setError("Supabase is not configured."); return; }
      const form = new FormData(event.currentTarget);
      const complete = form.get("complete") === "on";
      const notes = String(form.get("notes")).trim();
      if (complete && notes.length < 5) {
        setError("Add private review notes of at least 5 characters before marking this review complete.");
        return;
      }
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        setError("Your administrator session could not be verified. Sign in again and retry.");
        return;
      }
      const { error: saveError } = await supabase.from("employer_verifications").upsert({
        job_id: job.id,
        employer_legal_name: String(form.get("legal_name")).trim() || null,
        partner_registration_details: String(form.get("partner_details")).trim() || null,
        verification_notes: notes || null,
        verified_by: complete ? user.id : null,
        verified_at: complete ? new Date().toISOString() : null,
      });
      if (saveError) {
        setError(saveError.message.includes("unpublish_job_before_reversing_verification")
          ? "Unpublish this vacancy before removing its completed verification."
          : "Unable to save private verification information. Confirm your administrator access and try again.");
        return;
      }
      onSaved("Private employer verification saved. Set the vacancy's verification status to Verified in Edit before publishing.");
    } catch {
      setError("Unable to save private verification information. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }
  if (record === undefined && !error) return <div className="modal-backdrop"><div className="job-editor">Loading private verification information…</div></div>;
  return <div className="modal-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
    <form className="job-editor verification-editor" onSubmit={save} role="dialog" aria-modal="true" aria-labelledby="verification-title">
      <div className="modal-heading"><div><p className="eyebrow">PRIVATE · ADMIN ONLY</p><h2 id="verification-title">Employer verification</h2><p className="tiny-muted">{job.reference_code} — {job.title}</p></div><button type="button" className="icon-button" onClick={onClose} aria-label="Close"><X /></button></div>
      {error && <InlineNotice>{error}</InlineNotice>}
      <FormField label="Employer legal name" name="legal_name" defaultValue={String(record?.employer_legal_name ?? "")} />
      <label className="form-field"><span>Partner registration details (if applicable)</span><textarea name="partner_details" rows={3} defaultValue={String(record?.partner_registration_details ?? "")} /></label>
      <label className="form-field"><span>Private verification notes (at least 5 characters to complete review)</span><textarea name="notes" rows={5} maxLength={4000} defaultValue={String(record?.verification_notes ?? "")} /></label>
      <label className="consent-row"><input type="checkbox" name="complete" defaultChecked={Boolean(record?.verified_at)} /><span>Verification review is complete; record who reviewed it.</span></label>
      <p className="tiny-muted">To publish, complete this private review and also set the vacancy's verification status to Verified in Edit. Employer legal name and partner registration details are optional reference fields. Keep confidential evidence out of public vacancy fields; do not upload identity documents here.</p>
      <div className="modal-actions"><button type="button" className="button button-quiet" onClick={onClose}>Cancel</button><button className="button button-gold" disabled={busy}>{busy ? "Saving…" : "Save private record"}</button></div>
    </form>
  </div>;
}

function JobEditor({ job, onClose, onSaved }: { job: Job | null; onClose: () => void; onSaved: (message: string) => void }) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    if (!supabase) { setError("Supabase is not configured."); setBusy(false); return; }
    const form = new FormData(event.currentTarget);
    const title = String(form.get("title")).trim();
    const record = {
      reference_code: String(form.get("reference")).trim(),
      title,
      slug: String(form.get("slug")).trim(),
      employer_display_name: String(form.get("employer_display_name")).trim() || null,
      employer_disclosure_status: String(form.get("employer_disclosure_status")),
      country: String(form.get("country")),
      city: String(form.get("city")).trim(),
      category: String(form.get("category")).trim(),
      description: String(form.get("description")).trim(),
      responsibilities: String(form.get("responsibilities")).trim(),
      qualifications: String(form.get("qualifications")).trim(),
      experience_requirements: String(form.get("experience")).trim(),
      experience_level: String(form.get("experience_level")) || null,
      salary_min: form.get("salary_min") ? Number(form.get("salary_min")) : null,
      salary_max: form.get("salary_max") ? Number(form.get("salary_max")) : null,
      salary_currency: String(form.get("currency")).trim() || null,
      employment_type: String(form.get("employment_type")).trim() || null,
      benefits: String(form.get("benefits")).trim() || null,
      contract_duration: String(form.get("contract_duration")).trim() || null,
      vacancies_count: form.get("vacancies_count") ? Number(form.get("vacancies_count")) : null,
      working_hours: String(form.get("working_hours")).trim() || null,
      weekly_rest: String(form.get("weekly_rest")).trim() || null,
      accommodation: String(form.get("accommodation")).trim() || null,
      transport: String(form.get("transport")).trim() || null,
      work_permit_information: String(form.get("work_permit_information")).trim() || null,
      required_documents: String(form.get("required_documents")).trim() || null,
      application_deadline: String(form.get("deadline")) || null,
      verification_status: String(form.get("verification_status")),
      publication_status: String(form.get("publication_status")),
      verified_at: String(form.get("verification_status")) === "verified" ? new Date().toISOString() : null,
    };
    try {
      const result = job
        ? await supabase.from("jobs").update(record).eq("id", job.id)
        : await supabase.from("jobs").insert(record);
      if (result.error) {
        setError(record.publication_status === "published"
          ? publicationFailureMessage(result.error)
          : "The vacancy could not be saved. Check the required fields, slug format, and salary range.");
        return;
      }
      onSaved(job ? "Vacancy changes saved." : "Vacancy created as a draft.");
    } catch {
      setError("Unable to save the vacancy. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }
  return <div className="modal-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
    <form className="job-editor" onSubmit={save} role="dialog" aria-modal="true" aria-labelledby="job-editor-title">
      <div className="modal-heading"><div><p className="eyebrow">VACANCY DETAILS</p><h2 id="job-editor-title">{job ? "Edit vacancy" : "Add vacancy"}</h2></div><button type="button" className="icon-button" onClick={onClose} aria-label="Close"><X /></button></div>
      <div className="form-grid">
        <FormField label="Job title" name="title" required defaultValue={job?.title} /><FormField label="Reference code" name="reference" required defaultValue={job?.reference_code} />
        <FormField label="URL slug" name="slug" required defaultValue={job?.slug} /><FormField label="City" name="city" required defaultValue={job?.city} />
        <FormField label="Country" name="country" required defaultValue={job?.country} /><FormField label="Industry" name="category" required defaultValue={job?.category} />
        <FormField label="Employer name (shown only if disclosure is permitted)" name="employer_display_name" defaultValue={job?.employer_display_name} maxLength={160} />
        <label className="form-field"><span>Employer disclosure</span><select name="employer_disclosure_status" defaultValue={job?.employer_disclosure_status ?? "awaiting_confirmation"}><option value="awaiting_confirmation">Awaiting confirmation</option><option value="disclosed">Disclosed</option><option value="confidential">Confidential</option></select></label>
        <FormField label="Employment type" name="employment_type" defaultValue={job?.employment_type} /><FormField label="Contract duration" name="contract_duration" defaultValue={job?.contract_duration} />
        <FormField label="Number of vacancies (confirmed only)" name="vacancies_count" type="number" defaultValue={job?.vacancies_count} />
        <label className="form-field"><span>Verification status</span><select name="verification_status" defaultValue={job?.verification_status ?? "awaiting_confirmation"}><option value="awaiting_confirmation">Awaiting confirmation</option><option value="verified">Verified</option></select></label>
        <label className="form-field"><span>Publication status</span><select name="publication_status" defaultValue={job?.publication_status ?? "draft"}><option value="draft">Draft</option><option value="published">Published</option><option value="closed">Closed</option><option value="paused">Paused</option></select></label>
        <label className="form-field"><span>Experience level</span><select name="experience_level" defaultValue={job?.experience_level ?? ""}><option value="">Awaiting confirmation</option><option>Entry</option><option>Mid</option><option>Senior</option></select></label>
        <FormField label="Salary min (confirmed only)" name="salary_min" type="number" min={0} step={0.01} defaultValue={job?.salary_min} /><FormField label="Salary max (confirmed only)" name="salary_max" type="number" min={0} step={0.01} defaultValue={job?.salary_max} /><FormField label="Currency" name="currency" maxLength={3} placeholder="e.g. AED" defaultValue={job?.salary_currency} />
        <FormField label="Application deadline" name="deadline" type="date" defaultValue={job?.application_deadline} />
        <label className="form-field full-field"><span>Job description</span><textarea name="description" rows={3} required maxLength={10000} defaultValue={job?.description ?? ""} /></label>
        <label className="form-field full-field"><span>Responsibilities</span><textarea name="responsibilities" rows={3} defaultValue={job?.responsibilities ?? ""} /></label>
        <label className="form-field full-field"><span>Requirements and qualifications</span><textarea name="qualifications" rows={3} required maxLength={4000} defaultValue={job?.qualifications ?? ""} /></label>
        <label className="form-field full-field"><span>Experience requirements</span><textarea name="experience" rows={2} defaultValue={job?.experience_requirements ?? ""} /></label>
        <label className="form-field full-field"><span>Benefits (confirmed only)</span><textarea name="benefits" rows={2} defaultValue={job?.benefits ?? ""} /></label>
        <label className="form-field full-field"><span>Working hours</span><textarea name="working_hours" rows={2} defaultValue={job?.working_hours ?? ""} /></label>
        <label className="form-field full-field"><span>Weekly rest</span><textarea name="weekly_rest" rows={2} defaultValue={job?.weekly_rest ?? ""} /></label>
        <label className="form-field full-field"><span>Accommodation (confirmed only)</span><textarea name="accommodation" rows={2} defaultValue={job?.accommodation ?? ""} /></label>
        <label className="form-field full-field"><span>Transport (confirmed only)</span><textarea name="transport" rows={2} defaultValue={job?.transport ?? ""} /></label>
        <label className="form-field full-field"><span>Work-permit information (confirmed only)</span><textarea name="work_permit_information" rows={2} defaultValue={job?.work_permit_information ?? ""} /></label>
        <label className="form-field full-field"><span>Required documents</span><textarea name="required_documents" rows={2} defaultValue={job?.required_documents ?? ""} /></label>
      </div>
      {error && <InlineNotice>{error}</InlineNotice>}
      <div className="modal-actions"><button type="button" className="button button-quiet" onClick={onClose}>Cancel</button><button className="button button-gold" disabled={busy}>{busy ? "Saving…" : "Save vacancy"}</button></div>
      {job && <input type="hidden" name="existing" value={job.id} />}
    </form>
  </div>;
}

function NotFound() {
  return <div className="container page-state"><EmptyState title="Page not found" body="The page you are looking for may have moved." /><Link to="/" className="button button-navy">Return home</Link></div>;
}

export default App;
