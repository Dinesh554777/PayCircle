import { Link } from 'react-router-dom';
import { 
  FiZap, FiClock, FiPieChart, FiCheckCircle, 
  FiArrowRight, FiStar, FiTrendingUp 
} from 'react-icons/fi';

export default function Home() {
  return (
    <div className="bg-white">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-blue-50 to-white pt-24 pb-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="text-4xl md:text-6xl font-extrabold text-gray-900 tracking-tight leading-tight mb-8">
              AI-Powered Smart <span className="text-blue-600">Group Payment</span> & Collection Platform
            </h1>
            <p className="text-lg md:text-xl text-gray-600 mb-10 leading-relaxed max-w-2xl mx-auto">
              Simplify payment collection, automate reminders, and track contributions in real time.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Link to="/register" className="bg-blue-600 text-white px-8 py-4 rounded-full font-semibold text-lg hover:bg-blue-700 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 flex items-center justify-center">
                Get Started for Free <FiArrowRight className="ml-2" />
              </Link>
              <Link to="/features" className="bg-white text-blue-600 border border-blue-200 px-8 py-4 rounded-full font-semibold text-lg hover:bg-blue-50 hover:border-blue-300 hover:shadow transition-all duration-300 flex items-center justify-center">
                See How It Works
              </Link>
            </div>
          </div>
        </div>
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-72 h-72 rounded-full bg-green-100 opacity-50 blur-3xl"></div>
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-96 h-96 rounded-full bg-blue-100 opacity-50 blur-3xl"></div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Powerful Features</h2>
            <p className="text-gray-600 max-w-2xl mx-auto text-lg">Everything you need to manage group finances effortlessly.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="group p-8 rounded-2xl bg-white border border-gray-100 shadow-sm hover:shadow-xl hover:border-blue-100 transition-all duration-300 hover:-translate-y-1">
              <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center mb-6 group-hover:bg-blue-600 group-hover:text-white text-blue-600 transition-colors duration-300">
                <FiZap size={28} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Instant Collection</h3>
              <p className="text-gray-600 leading-relaxed">Collect payments from multiple people instantly. Send requests via secure links or emails.</p>
            </div>
            {/* Feature 2 */}
            <div className="group p-8 rounded-2xl bg-white border border-gray-100 shadow-sm hover:shadow-xl hover:border-green-100 transition-all duration-300 hover:-translate-y-1">
              <div className="w-14 h-14 bg-green-100 rounded-xl flex items-center justify-center mb-6 group-hover:bg-green-500 group-hover:text-white text-green-600 transition-colors duration-300">
                <FiClock size={28} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">AI Reminders</h3>
              <p className="text-gray-600 leading-relaxed">Smart AI automated reminders chase up pending payments without the awkwardness.</p>
            </div>
            {/* Feature 3 */}
            <div className="group p-8 rounded-2xl bg-white border border-gray-100 shadow-sm hover:shadow-xl hover:border-blue-100 transition-all duration-300 hover:-translate-y-1">
              <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center mb-6 group-hover:bg-blue-600 group-hover:text-white text-blue-600 transition-colors duration-300">
                <FiPieChart size={28} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Real-time Analytics</h3>
              <p className="text-gray-600 leading-relaxed">Track who has paid and who hasn't with beautiful dashboards and real-time alerts.</p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">How It Works</h2>
            <p className="text-gray-600 max-w-2xl mx-auto text-lg">Set up your payment collection in three simple steps.</p>
          </div>
          <div className="flex flex-col md:flex-row justify-center items-center gap-12 relative">
            {/* Connecting Line */}
            <div className="hidden md:block absolute top-1/2 left-[15%] right-[15%] h-0.5 bg-gradient-to-r from-blue-200 to-green-200 z-0"></div>
            
            {/* Step 1 */}
            <div className="relative z-10 flex flex-col items-center text-center max-w-xs">
              <div className="w-16 h-16 bg-blue-600 text-white rounded-full flex items-center justify-center text-2xl font-bold shadow-lg mb-6 ring-4 ring-white">1</div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Create Campaign</h3>
              <p className="text-gray-600">Set a target amount and deadline for your group collection.</p>
            </div>
            {/* Step 2 */}
            <div className="relative z-10 flex flex-col items-center text-center max-w-xs">
              <div className="w-16 h-16 bg-blue-600 text-white rounded-full flex items-center justify-center text-2xl font-bold shadow-lg mb-6 ring-4 ring-white">2</div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Invite Participants</h3>
              <p className="text-gray-600">Share a simple link or add emails. AI handles the invites.</p>
            </div>
            {/* Step 3 */}
            <div className="relative z-10 flex flex-col items-center text-center max-w-xs">
              <div className="w-16 h-16 bg-green-500 text-white rounded-full flex items-center justify-center text-2xl font-bold shadow-lg mb-6 ring-4 ring-white">3</div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Track & Collect</h3>
              <p className="text-gray-600">Watch the funds come in while our system chases stragglers.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row items-center gap-16">
            <div className="lg:w-1/2">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6 leading-tight">Why thousands of teams choose PayCircle</h2>
              <p className="text-gray-600 text-lg mb-8 leading-relaxed">
                Whether you're organizing a team gift, splitting bills, or running a club, we remove the friction and awkwardness of asking for money.
              </p>
              <ul className="space-y-4">
                {[
                  'Bank-grade security and encryption',
                  'No hidden fees or sneaky charges',
                  'Instant payouts to your bank account',
                  'Seamless mobile and desktop experience'
                ].map((benefit, i) => (
                  <li key={i} className="flex items-center text-gray-700">
                    <FiCheckCircle className="text-green-500 mr-3 shrink-0" size={20} />
                    <span>{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="lg:w-1/2">
              <div className="bg-gradient-to-br from-blue-50 to-white border border-gray-100 rounded-3xl p-8 shadow-xl">
                <div className="flex items-center justify-between mb-8 pb-8 border-b border-gray-200">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
                      <FiTrendingUp size={24} />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 font-medium">Total Collected</p>
                      <p className="text-2xl font-bold text-gray-900">$12,450.00</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-500 font-medium">Target</p>
                    <p className="text-xl font-bold text-gray-900">$15,000</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="w-full bg-gray-100 rounded-full h-3">
                    <div className="bg-green-500 h-3 rounded-full" style={{ width: '83%' }}></div>
                  </div>
                  <p className="text-sm text-green-600 font-medium text-right">83% Completed</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-24 bg-blue-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Loved by Organizers</h2>
            <p className="text-blue-100 max-w-2xl mx-auto text-lg">Don't just take our word for it.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              { name: 'Sarah J.', role: 'Office Manager', text: 'PayCircle saved me hours of chasing people for the team holiday party. The AI reminders are magic!' },
              { name: 'Mike T.', role: 'Sports Coach', text: 'Collecting fees for the season has never been easier. Everyone gets their own link and I track it all from my phone.' },
              { name: 'Emily R.', role: 'Event Planner', text: 'The interface is stunning and my clients trust it because it looks so professional. Highly recommended.' }
            ].map((testimonial, i) => (
              <div key={i} className="bg-white rounded-2xl p-8 shadow-lg transform hover:-translate-y-2 transition-all duration-300">
                <div className="flex text-yellow-400 mb-4">
                  {[...Array(5)].map((_, j) => <FiStar key={j} fill="currentColor" />)}
                </div>
                <p className="text-gray-700 mb-6 italic">"{testimonial.text}"</p>
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-gradient-to-r from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white font-bold mr-3">
                    {testimonial.name.charAt(0)}
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900">{testimonial.name}</h4>
                    <p className="text-sm text-gray-500">{testimonial.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Call To Action */}
      <section className="py-24 bg-white relative overflow-hidden">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <h2 className="text-3xl md:text-5xl font-bold text-gray-900 mb-6">Ready to stop chasing payments?</h2>
          <p className="text-xl text-gray-600 mb-10">Join thousands of smart organizers today. It takes 2 minutes to create your first campaign.</p>
          <Link to="/register" className="inline-flex bg-green-500 text-white px-10 py-5 rounded-full font-bold text-lg hover:bg-green-600 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 items-center">
            Create Free Account
          </Link>
        </div>
        {/* Decorative elements */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full h-full max-w-5xl bg-gradient-to-b from-blue-50 to-transparent opacity-50 rounded-full blur-3xl -z-0"></div>
      </section>
    </div>
  );
}
