import { useNavigate } from 'react-router-dom'
import { useAuth } from '../AuthContext.jsx'
import { useToast } from '../ToastContext.jsx'

function FeatureButton({ img, alt, title, desc, to, onClick }) {
  const navigate = useNavigate()
  return (
    <button
      onClick={onClick ? onClick : () => navigate(to)}
      className="feature-btn bg-surface/90 backdrop-blur-sm border border-transparent hover:border-brand transition-all duration-300 rounded-2xl p-8 text-center w-72 hover:shadow-[0_0_20px_rgba(25,182,173,0.3)]"
    >
      <img src={img} alt={alt} className="w-20 h-20 mx-auto mb-4" />
      <h3 className="text-xl font-semibold text-white mb-2">{title}</h3>
      <p className="text-gray-400 text-[0.95rem]">{desc}</p>
    </button>
  )
}

export default function Home() {
  const { user } = useAuth()
  const { showToast } = useToast()
  const navigate = useNavigate()

  function handleNewsletter() {
    if (!user) {
      navigate('/login')
    } else if (user.newsletter) {
      showToast("You're already subscribed — watch for the weekly updates!")
    } else {
      navigate('/profile')
      showToast('Tick "Subscribe to the Digeon newsletter" and save to subscribe.', {
        actionLabel: 'Go to profile', actionTo: '/profile',
      })
    }
  }
  return (
    <main>
      {/* HERO */}
      <section
        className="home-hero relative flex items-center justify-center text-center h-[75vh] bg-cover bg-center animate-fadeIn"
        style={{ backgroundImage: "url('/images/hero-bg.png')" }}
      >
        <div className="hero-gradient absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-black/80"></div>
        <div className="hero-overlay relative max-w-2xl px-4">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Discover, Develop, and Deliver
          </h1>
          <p className="text-lg text-gray-300 mb-6">
            Digeon AI helps you find the right AI tools, publish intelligent
            solutions, and share insight — acting as your digital courier for
            AI-powered innovation.
          </p>
          <div className="cta-group flex justify-center gap-4">
            
             <a href="#about"
              className="btn-secondary border border-gray-700 hover:border-brand text-textlight hover:text-brand px-6 py-3 rounded-full font-semibold transition-all duration-300"
            >
              Learn More
            </a>
          </div>
        </div>
      </section>

      {/* ABOUT */}
      <section id="about" className="about-block text-center my-20 px-6 max-w-3xl mx-auto animate-fadeIn">
        <h2 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-brand to-teal-400 bg-clip-text text-transparent mb-4">
          What is Digeon?
        </h2>
        <p className="text-gray-300 text-lg leading-relaxed">
          Digeon AI is a growing platform dedicated to making artificial
          intelligence accessible, practical, and impactful for creators,
          innovators, and professionals alike. Whether you're a developer looking
          to showcase AI agents or a user exploring tools to boost productivity,
          Digeon brings everything together in one intelligent ecosystem.
        </p>
      </section>

      {/* FEATURES */}
      <section className="features-row flex flex-wrap justify-center gap-10 max-w-6xl mx-auto my-16 animate-fadeIn">
        <FeatureButton img="/images/directory.png" alt="AI Tools Directory" title="Tools Directory" desc="Find vetted AI tools and agents." to="/directory" />
        <FeatureButton img="/images/marketplace.png" alt="AI Marketplace" title="Marketplace" desc="Discover resources and services for builders." to="/marketplace" />
        <FeatureButton img="/images/newsletter.png" alt="Weekly AI Newsletter" title="Weekly Newsletter" desc="Weekly trends, resources, and insights." onClick={handleNewsletter} />
      </section>
    </main>
  )
}