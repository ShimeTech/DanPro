import { useState } from 'react';
import { Link } from 'react-router-dom';
import { contactApi } from '../../api/contact.api';
import {
  ArrowRight,
  Award,
  BarChart3,
  Building2,
  CheckCircle2,
  FileCheck2,
  HardHat,
  Landmark,
  MapPinned,
  ShieldCheck,
  Users,
  Warehouse,
} from 'lucide-react';

const sectors = [
  {
    title: 'Building Construction',
    text: 'Commercial towers, residential buildings, offices, hospitals, schools, and mixed-use developments.',
    image:
      'https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=1200&q=80',
  },
  {
    title: 'Road Construction',
    text: 'Highways, road networks, bridges, asphalt works, drainage systems, and transportation infrastructure.',
    image:
      'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&w=1200&q=80',
  },
  {
    title: 'Real Estate Construction',
    text: 'Modern apartments, gated communities, commercial real estate, and urban developments.',
    image:
      'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1200&q=80',
  },
  {
    title: 'Industrial Park Construction',
    text: 'Factories, logistics centers, warehouses, industrial zones, and utility infrastructure.',
    image:
      'https://images.unsplash.com/photo-1513828583688-c52646db42da?auto=format&fit=crop&w=1200&q=80',
  },
{
  title: 'Smart City Construction',
  text: 'Digitally connected urban infrastructure, intelligent transportation, and sustainable city systems.',
  image:
    'https://images.unsplash.com/photo-1519501025264-65ba15a82390?auto=format&fit=crop&w=1200&q=80',
},
  {
    title: 'Infrastructure Projects',
    text: 'Large-scale public and private infrastructure projects with integrated planning and project controls.',
    image:
      'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?auto=format&fit=crop&w=1200&q=80',
  },
];

const modules = [
  'Project Management',
  'Planning & Scheduling',
  'Document Control',
  'RFI Management',
  'Submittal Management',
  'Approvals Workflow',
  'Quality Management',
  'Safety Management',
  'Procurement Management',
  'Inventory Management',
  'Cost Control',
  'Budget Management',
  'Finance Management',
  'Reports & Dashboards',
  'Audit Logs',
  'Notifications',
];



const stats = [
  { label: 'Projects Delivered', value: '500+', icon: Building2 },
  { label: 'Active Platform Users', value: '1,500+', icon: Users },
  { label: 'Years of Experience', value: '25+', icon: Award },
  { label: 'Client Satisfaction', value: '99%', icon: CheckCircle2 },
];

const featuredProjects = [
  {
    title: 'Smart City Development',
    text: 'Integrated urban infrastructure, transport systems, utilities, and digital governance support.',
    icon: Landmark,
  },
  {
    title: 'Industrial Park Program',
    text: 'Factories, warehouses, access roads, logistics areas, and utility infrastructure delivery.',
    icon: Warehouse,
  },
  {
    title: 'Express Highway Corridor',
    text: 'Road construction, bridges, drainage, asphalt works, and transport infrastructure controls.',
    icon: MapPinned,
  },
];

const benefits = [
  'Real-time project visibility',
  'ISO-aligned quality and safety processes',
  'Digital document and revision control',
  'Integrated cost, budget, and finance control',
  'Procurement, inventory, and supplier visibility',
  'Executive dashboards and audit trails',
];

const standards = [
  'ISO 9001 Quality Management',
  'ISO 14001 Environmental Management',
  'ISO 45001 Occupational Health & Safety',
  'PMI Project Management Practices',
];

const clients = [
  'Government',
  'Developers',
  'Contractors',
  'Consultants',
  'Industrial Clients',
];

export default function HomePage() {
  const [contactForm, setContactForm] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    subject: '',
    message: '',
  });

  const [contactLoading, setContactLoading] = useState(false);
  const [contactMessage, setContactMessage] = useState('');

  function updateContactField(field: keyof typeof contactForm, value: string) {
    setContactForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  async function handleContactSubmit(e: React.FormEvent) {
    e.preventDefault();

    try {
      setContactLoading(true);
      setContactMessage('');

      await contactApi.send(contactForm);

      setContactMessage('Thank you. Your message has been sent successfully.');

      setContactForm({
        name: '',
        email: '',
        phone: '',
        company: '',
        subject: '',
        message: '',
      });
    } catch (error: any) {
      setContactMessage(
        error.response?.data?.message || 'Failed to send message.',
      );
    } finally {
      setContactLoading(false);
    }
  }

  return (
    <div className="company-public-page">
      <section className="company-hero">
        <img
          className="company-hero-image"
          src="https://images.unsplash.com/photo-1541976590-713941681591?auto=format&fit=crop&w=1800&q=80"
          alt="Modern construction project site"
        />

        <div className="company-hero-overlay" />

        <div className="company-hero-content">
          <span className="company-badge">
            Building • Roads • Real Estate • Infrastructure • Smart Cities
          </span>

          <h1>Engineering modern construction with digital project control.</h1>

          <p>
            BuildPro IMS brings construction delivery, planning, document
            control, procurement, quality, safety, cost, finance, reporting, and
            audit visibility into one enterprise-grade construction management
            platform.
          </p>

          <div className="company-hero-actions">
            <Link to="/login" className="company-primary-btn">
              Access Platform <ArrowRight size={18} />
            </Link>

            <a href="#contact" className="company-secondary-btn">
              Contact Us
            </a>
          </div>
        </div>
      </section>

      <section className="company-stats">
        {stats.map(({ label, value, icon: Icon }) => (
          <div key={label} className="company-stat-card">
            <Icon size={28} />
            <h2>{value}</h2>
            <p>{label}</p>
          </div>
        ))}
      </section>

      <section id="about" className="company-section">
        <div className="company-section-heading">
          <span>About Company</span>
          <h2>Construction excellence powered by engineering and technology.</h2>
          <p>
            We deliver construction and infrastructure solutions for public,
            commercial, industrial, and urban development projects. BuildPro IMS
            supports international-standard project management, document
            control, quality, safety, cost, procurement, and finance.
          </p>
        </div>

        <div className="company-about-grid">
          <InfoCard
            icon={<HardHat size={28} />}
            title="Mission"
            text="To deliver quality construction projects with safety, efficiency, accountability, and digital project visibility."
          />
          <InfoCard
            icon={<BarChart3 size={28} />}
            title="Vision"
            text="To become a leading construction and infrastructure company using modern engineering, innovation, and smart construction management."
          />
          <InfoCard
            icon={<ShieldCheck size={28} />}
            title="Core Values"
            text="Integrity, quality, safety, innovation, sustainability, teamwork, and client satisfaction."
          />
        </div>
      </section>

      <section id="sectors" className="company-section company-light-section">
        <div className="company-section-heading">
          <span>Our Work</span>
          <h2>Main construction sectors we serve.</h2>
          <p>
            We support complex construction and infrastructure projects with
            integrated engineering management, planning, reporting, procurement,
            and project controls.
          </p>
        </div>

        <div className="company-sector-grid">
          {sectors.map((sector) => (
            <article key={sector.title} className="company-sector-card">
              <img src={sector.image} alt={sector.title} />
              <div>
                <h3>{sector.title}</h3>
                <p>{sector.text}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="company-section">
        <div className="company-section-heading">
          <span>Projects</span>
          <h2>Featured construction programs.</h2>
          <p>
            Designed for major capital projects, infrastructure delivery, and
            multi-stakeholder construction environments.
          </p>
        </div>

        <div className="company-about-grid">
          {featuredProjects.map(({ title, text, icon: Icon }) => (
            <InfoCard
              key={title}
              icon={<Icon size={28} />}
              title={title}
              text={text}
            />
          ))}
        </div>
      </section>

      <section id="system" className="company-section company-light-section">
        <div className="company-section-heading">
          <span>BuildPro IMS</span>
          <h2>One platform for complete construction management.</h2>
          <p>
            BuildPro IMS integrates project management, planning, document
            control, procurement, quality, safety, cost, finance, and reporting
            into one digital construction platform.
          </p>
        </div>

        <div className="company-module-grid">
          {modules.map((module) => (
            <div key={module} className="company-module-card">
              <FileCheck2 size={18} />
              {module}
            </div>
          ))}
        </div>
      </section>

      <section className="company-section">
        <div className="company-section-heading">
          <span>Why Choose Us</span>
          <h2>Enterprise control for modern construction delivery.</h2>
        </div>

        <div className="company-module-grid">
          {benefits.map((benefit) => (
            <div key={benefit} className="company-module-card">
              <CheckCircle2 size={18} />
              {benefit}
            </div>
          ))}
        </div>
      </section>

      <section className="company-section company-light-section">
        <div className="company-section-heading">
          <span>Compliance</span>
          <h2>International standards and governance readiness.</h2>
        </div>

        <div className="company-module-grid">
          {standards.map((standard) => (
            <div key={standard} className="company-module-card">
              <ShieldCheck size={18} />
              {standard}
            </div>
          ))}
        </div>
      </section>

      <section className="company-section">
        <div className="company-section-heading">
          <span>Clients</span>
          <h2>Trusted by construction stakeholders.</h2>
        </div>

        <div className="company-client-grid">
          {clients.map((client) => (
            <div key={client} className="company-client-card">
              {client}
            </div>
          ))}
        </div>
      </section>

      <section id="contact" className="company-section company-light-section">
        <div className="company-contact-wrapper">
          <div className="company-contact-info">
            <span>Contact Us</span>

            <h2>Ready to Build the Future Together?</h2>

            <p>
              Contact BuildPro for construction services, infrastructure
              development, project management consulting, smart city initiatives,
              and BuildPro IMS implementation.
            </p>

            <div className="company-contact-details">
              <div>
                <strong>Email</strong>
                <p>info@buildproims.com</p>
              </div>

              <div>
                <strong>Phone</strong>
                <p>+251 900 000 000</p>
              </div>

              <div>
                <strong>Head Office</strong>
                <p>Addis Ababa, Ethiopia</p>
              </div>

              <div>
                <strong>Business Hours</strong>
                <p>Monday - Friday: 8:00 AM - 5:00 PM</p>
              </div>

              <div>
                <strong>Website</strong>
                <p>www.buildproims.com</p>
              </div>
            </div>

            <div className="company-social-links">
              <a href="#">LinkedIn</a>
              <a href="#">Facebook</a>
              <a href="#">X (Twitter)</a>
              <a href="#">YouTube</a>
            </div>
          </div>

          <div className="company-contact-form">
            <h3>Send us a message</h3>

            {contactMessage && (
              <div className="company-contact-message">{contactMessage}</div>
            )}

            <form onSubmit={handleContactSubmit}>
              <input
                type="text"
                placeholder="Full Name"
                value={contactForm.name}
                onChange={(e) => updateContactField('name', e.target.value)}
                disabled={contactLoading}
                required
              />

              <input
                type="email"
                placeholder="Email Address"
                value={contactForm.email}
                onChange={(e) => updateContactField('email', e.target.value)}
                disabled={contactLoading}
                required
              />

              <input
                type="tel"
                placeholder="Phone Number"
                value={contactForm.phone}
                onChange={(e) => updateContactField('phone', e.target.value)}
                disabled={contactLoading}
              />

              <input
                type="text"
                placeholder="Company Name"
                value={contactForm.company}
                onChange={(e) => updateContactField('company', e.target.value)}
                disabled={contactLoading}
              />

              <input
                type="text"
                placeholder="Subject"
                value={contactForm.subject}
                onChange={(e) => updateContactField('subject', e.target.value)}
                disabled={contactLoading}
              />

              <textarea
                rows={5}
                placeholder="How can we help you?"
                value={contactForm.message}
                onChange={(e) => updateContactField('message', e.target.value)}
                disabled={contactLoading}
                required
              />

              <button type="submit" disabled={contactLoading}>
                {contactLoading ? 'Sending...' : 'Send Message'}
              </button>
            </form>
          </div>
        </div>
      </section>

      <footer className="company-footer enterprise-footer">
        <div>
          <h3>BuildPro IMS</h3>
          <p>Enterprise Construction Management Platform</p>
        </div>

        <div>
          <h4>Platform</h4>
          <p>Project Management</p>
          <p>Document Control</p>
          <p>Cost & Finance</p>
          <p>Quality & Safety</p>
        </div>

        <div>
          <h4>Company</h4>
          <p>Construction</p>
          <p>Infrastructure</p>
          <p>Real Estate</p>
          <p>Smart Cities</p>
        </div>

        <div>
          <h4>Contact</h4>
          <p>info@buildproims.com</p>
          <p>+251 900 000 000</p>
          <p>Addis Ababa, Ethiopia</p>
        </div>

        <div className="company-footer-bottom">
          © {new Date().getFullYear()} BuildPro IMS. All rights reserved.
        </div>
      </footer>
    </div>
  );
}

function InfoCard({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="company-info-card">
      <div className="company-info-icon">
        {icon}
      </div>

      <h3>{title}</h3>

      <p>{text}</p>
    </div>
  );
}