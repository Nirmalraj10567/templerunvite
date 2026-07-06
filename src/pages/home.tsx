import { Header } from '../components/Header';
import { useLanguage } from '../lib/language';
export function HomePage(){
  const { language } = useLanguage();
  const lang = (String(language).toLowerCase() === 'english' ? 'tamil' : 'english') as 'tamil' | 'english';

  const t = {
    tamil: {
      heroTitle: 'தெய்வீக அருளை அனுபவிக்கவும்',
      heroSubtitle: 'எங்கள் புனித சமூகத்தில் இணைந்து ஆன்மிகப் பயணத்தில் பங்கேற்கவும்',
      getStarted: 'தொடங்கு',
      signIn: 'உள்நுழை',
      dailyPrayers: 'தினசரி பூஜைகள்',
      dailyPrayersDesc: 'தினசரி பூஜைகள் மற்றும் ஆன்மீக விழாக்களில் எங்களுடன் சேருங்கள்',
      sacredArchitecture: 'புனிதக் கட்டிடக்கலை',
      sacredArchitectureDesc: 'எங்கள் கோவிலின் தெய்வீக அழகை அனுபவிக்கவும்',
      community: 'சமூகம்',
      communityDesc: 'எங்கள் வளர்ந்து வரும் ஆன்மிக சமூகத்தின் ஒரு பகுதியாகுங்கள்',
      templeTrust: 'Temple Trust',
      preservingSince: '1950 முதல் புனித மரபுகளை காத்து வருகிறோம்',
      quickLinks: 'விரைவு இணைப்புகள்',
      aboutUs: 'எங்களை பற்றி',
      eventsCalendar: 'நிகழ்வுகள் நாட்காட்டி',
      volunteer: 'தன்னார்வலர்',
      contact: 'தொடர்பு',
      addressLine1: '123 கோவில் சாலை',
      addressLine2: 'புனித நகரம், ST 12345',
      email: 'info@templetrust.org',
    },
    english: {
      heroTitle: 'Experience Divine Blessings',
      heroSubtitle: 'Join our sacred community and be part of our spiritual journey',
      getStarted: 'Get Started',
      signIn: 'Sign In',
      dailyPrayers: 'Daily Prayers',
      dailyPrayersDesc: 'Join us for daily prayers and spiritual ceremonies',
      sacredArchitecture: 'Sacred Architecture',
      sacredArchitectureDesc: 'Experience the divine beauty of our temple architecture',
      community: 'Community',
      communityDesc: 'Be part of our growing spiritual community',
      templeTrust: 'Temple Trust',
      preservingSince: 'Preserving sacred traditions since 1950',
      quickLinks: 'Quick Links',
      aboutUs: 'About Us',
      eventsCalendar: 'Events Calendar',
      volunteer: 'Volunteer',
      contact: 'Contact',
      addressLine1: '123 Temple Road',
      addressLine2: 'Sacred City, ST 12345',
      email: 'info@templetrust.org',
    },
  } as const;

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-yellow-50 to-orange-100">
   <Header/>
      <main className="flex-1 py-12 px-4">
        <div className="max-w-4xl mx-auto text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-6 text-orange-800">
            {t[lang].heroTitle}
          </h2>
          <p className="text-xl text-gray-700 mb-8">
            {t[lang].heroSubtitle}
          </p>
          <div className="flex justify-center gap-4">
            <button className="bg-orange-600 hover:bg-orange-700 text-white font-semibold py-3 px-8 rounded-lg shadow-lg transition" onClick={() => window.location.href = '/register'}>
              {t[lang].getStarted}
            </button>
            <button 
              className="border-2 border-orange-600 text-orange-600 hover:bg-orange-50 font-semibold py-3 px-8 rounded-lg transition"
              onClick={() => window.location.href = '/login'}
            >
              {t[lang].signIn}
            </button>
            <button
              className="border-2 border-slate-600 text-slate-600 hover:bg-slate-50 font-semibold py-3 px-8 rounded-lg transition"
              onClick={() => window.location.href = '/pricing'}
            >
              View Pricing
            </button>
          </div>
        </div>

        <section className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-white rounded-xl shadow-md p-6 flex flex-col items-center text-center hover:scale-105 transition-transform">
            <span className="text-3xl mb-2">🙏</span>
            <h2 className="font-semibold text-lg mb-1">{t[lang].dailyPrayers}</h2>
            <p className="text-gray-500">{t[lang].dailyPrayersDesc}</p>
          </div>
          <div className="bg-white rounded-xl shadow-md p-6 flex flex-col items-center text-center hover:scale-105 transition-transform">
            <span className="text-3xl mb-2">🏛️</span>
            <h2 className="font-semibold text-lg mb-1">{t[lang].sacredArchitecture}</h2>
            <p className="text-gray-500">{t[lang].sacredArchitectureDesc}</p>
          </div>
          <div className="bg-white rounded-xl shadow-md p-6 flex flex-col items-center text-center hover:scale-105 transition-transform">
            <span className="text-3xl mb-2">👥</span>
            <h2 className="font-semibold text-lg mb-1">{t[lang].community}</h2>
            <p className="text-gray-500">{t[lang].communityDesc}</p>
          </div>
        </section>
      </main>

      <footer className="bg-orange-800 text-white py-8 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center">
            <a 
              href="https://xesstechlink.com/" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="hover:underline inline-block"
            >
              Powered by @xesstechlink
            </a>
          </div>
      {/*    <div>
            <h3 className="text-xl font-bold mb-4">{t[lang].templeTrust}</h3>
            <p className="text-orange-100">
              {t[lang].preservingSince}
            </p>
          </div>
          <div>
            <h3 className="text-xl font-bold mb-4">{t[lang].quickLinks}</h3>
            <ul className="space-y-2">
              <li><a href="#" className="text-orange-200 hover:text-white">{t[lang].aboutUs}</a></li>
              <li><a href="#" className="text-orange-200 hover:text-white">{t[lang].eventsCalendar}</a></li>
              <li><a href="#" className="text-orange-200 hover:text-white">{t[lang].volunteer}</a></li>
            </ul>
          </div>
          <div>
            <h3 className="text-xl font-bold mb-4">{t[lang].contact}</h3>
            <p className="text-orange-100">
              {t[lang].addressLine1}<br />
              {t[lang].addressLine2}<br />
              {t[lang].email}
            </p>
          </div>*/}
        </div>
      </footer>
    </div>
  );
}
