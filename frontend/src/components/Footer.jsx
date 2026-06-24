export default function Footer() {
  return (
    <footer className="bg-surface/80 backdrop-blur-md py-10 mt-12 border-t border-gray-800 text-center">
      <div className="container mx-auto">
        <p className="text-sm text-gray-400 mb-4">
          &copy; 2025 Digeon AI. All rights reserved.
        </p>
        <div className="footer-social-bar flex justify-center items-center gap-6">
          <a href="https://x.com/digeonAI" target="_blank" rel="noreferrer" title="X (Twitter)" className="hover:scale-110 transition-transform">
            <img src="https://cdn.simpleicons.org/x/ffffff" alt="X (Twitter)" className="w-7 h-7" />
          </a>
          <a href="https://www.instagram.com/digeon.ai/" target="_blank" rel="noreferrer" title="Instagram" className="hover:scale-110 transition-transform">
            <img src="https://cdn.simpleicons.org/instagram/ffffff" alt="Instagram" className="w-7 h-7" />
          </a>
          <a href="https://www.linkedin.com/company/digeon-ai/" target="_blank" rel="noreferrer" title="LinkedIn" className="hover:scale-110 transition-transform">
            <svg xmlns="http://www.w3.org/2000/svg" role="img" width="28" height="28" viewBox="0 0 24 24" fill="#ffffff">
              <title>LinkedIn</title>
              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.026-3.037-1.849-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.354V9h3.414v1.561h.049c.476-.899 1.637-1.849 3.37-1.849 3.601 0 4.268 2.37 4.268 5.455v6.285zm-16.356-11.41c-1.144 0-2.067-.926-2.067-2.065 0-1.138.923-2.065 2.067-2.065 1.143 0 2.066.927 2.066 2.065 0 1.139-.923 2.065-2.066 2.065zm1.778 11.41H2.313V9h3.556v11.452zM22.225 0H1.771C.792 0 0 .771 0 1.723v20.549C0 23.229.792 24 1.771 24h20.451C23.2 24 24 23.229 24 22.271V1.723C24 .771 23.2 0 22.222 0z" />
            </svg>
          </a>
          <a href="mailto:Digeon.technologies@gmail.com" title="Email Digeon" className="hover:scale-110 transition-transform">
            <img src="https://cdn.simpleicons.org/gmail/ffffff" alt="Gmail" className="w-7 h-7" />
          </a>
        </div>
      </div>
    </footer>
  )
}