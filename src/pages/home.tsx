import { Header } from '../components/Header';
export function HomePage(){
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-yellow-50 to-orange-100">
   <Header/>
      <main className="flex-1 py-12 px-4">
        <div className="max-w-4xl mx-auto text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-6 text-orange-800">
            Experience Divine Blessings
          </h2>
          <p className="text-xl text-gray-700 mb-8">
            Join our sacred community and be part of our spiritual journey
          </p>
          <div className="flex justify-center gap-4">
            <button className="bg-orange-600 hover:bg-orange-700 text-white font-semibold py-3 px-8 rounded-lg shadow-lg transition">
              Get Started
            </button>
            <button 
              className="border-2 border-orange-600 text-orange-600 hover:bg-orange-50 font-semibold py-3 px-8 rounded-lg transition"
              onClick={() => window.location.href = '/login'}
            >
              Sign In
            </button>
          </div>
        </div>

        <section className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-white rounded-xl shadow-md p-6 flex flex-col items-center text-center hover:scale-105 transition-transform">
            <span className="text-3xl mb-2">🙏</span>
            <h2 className="font-semibold text-lg mb-1">Daily Prayers</h2>
            <p className="text-gray-500">Join us for daily prayers and spiritual ceremonies</p>
          </div>
          <div className="bg-white rounded-xl shadow-md p-6 flex flex-col items-center text-center hover:scale-105 transition-transform">
            <span className="text-3xl mb-2">🏛️</span>
            <h2 className="font-semibold text-lg mb-1">Sacred Architecture</h2>
            <p className="text-gray-500">Experience the divine beauty of our temple architecture</p>
          </div>
          <div className="bg-white rounded-xl shadow-md p-6 flex flex-col items-center text-center hover:scale-105 transition-transform">
            <span className="text-3xl mb-2">👥</span>
            <h2 className="font-semibold text-lg mb-1">Community</h2>
            <p className="text-gray-500">Be part of our growing spiritual community</p>
          </div>
        </section>
      </main>

      <footer className="bg-orange-800 text-white py-12 px-4">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h3 className="text-xl font-bold mb-4">Temple Trust</h3>
            <p className="text-orange-100">
              Preserving sacred traditions since 1950
            </p>
          </div>
          <div>
            <h3 className="text-xl font-bold mb-4">Quick Links</h3>
            <ul className="space-y-2">
              <li><a href="#" className="text-orange-200 hover:text-white">About Us</a></li>
              <li><a href="#" className="text-orange-200 hover:text-white">Events Calendar</a></li>
              <li><a href="#" className="text-orange-200 hover:text-white">Volunteer</a></li>
            </ul>
          </div>
          <div>
            <h3 className="text-xl font-bold mb-4">Contact</h3>
            <p className="text-orange-100">
              123 Temple Road<br />
              Sacred City, ST 12345<br />
              info@templetrust.org
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
