import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { useBackgroundPattern } from '../components/BackgroundPattern'
import { 
  Building2, 
  Users, 
  Calendar, 
  CreditCard, 
  Shield, 
  Zap, 
  Check,
  ArrowRight,
  Star,
  Phone,
  Mail,
  MapPin,
  ChevronRight,
  Sparkles
} from 'lucide-react'

export default function Home() {
  const navigate = useNavigate()
  const [showDemo, setShowDemo] = useState(false)

  const openDemo = () => setShowDemo(true)
  const closeDemo = () => setShowDemo(false)

  // Para "Comenzar Gratis" - salta la selección de plan
  const openFreeRegistration = () => {
    navigate('/alta-administrador?plan=basico&skipPlan=1')
  }

  // Para "Comenzar Ahora" desde la sección de precios - muestra selección de plan
  const openRegistration = (plan?: 'basico' | 'profesional' | 'empresarial') => {
    const selectedPlan = plan || 'basico'
    navigate(`/alta-administrador?plan=${selectedPlan}`)
  }

  const bgPattern = useBackgroundPattern('community')

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950" style={bgPattern}>
      <Navbar />

      {/* Hero Section - Modern & Bold */}
      <section className="relative pt-32 pb-20 lg:pt-40 lg:pb-32 overflow-hidden">
        {/* Background Elements */}
        <div className="absolute inset-0 bg-gradient-to-br from-sky-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-950 dark:to-gray-900" />
        <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-sky-100/50 to-transparent dark:from-sky-900/20 dark:to-transparent" />
        <div className="absolute top-20 left-10 w-72 h-72 bg-sky-400/20 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-blue-400/20 rounded-full blur-3xl" />
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="text-center lg:text-left">
              <div className="inline-flex items-center space-x-2 px-4 py-2 bg-sky-100 dark:bg-sky-900/30 rounded-full mb-6">
                <Sparkles className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                <span className="text-sm font-semibold text-sky-700 dark:text-sky-300">La plataforma #1 en gestión de condominios</span>
              </div>
              
              <h1 className="text-5xl lg:text-7xl font-black text-gray-900 dark:text-white mb-6 leading-tight">
                Gestiona tu
                <span className="block bg-gradient-to-r from-sky-500 via-blue-500 to-indigo-500 bg-clip-text text-transparent">
                  Condominio
                </span>
                con Facilidad
              </h1>
              
              <p className="text-xl text-gray-600 dark:text-gray-400 mb-8 max-w-lg mx-auto lg:mx-0">
                Administra pagos, reservaciones, incidencias y comunicación con residentes. 
                Todo en una plataforma moderna, segura y fácil de usar.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <button 
                  onClick={openFreeRegistration}
                  className="group flex items-center justify-center space-x-2 px-8 py-4 bg-gradient-to-r from-sky-500 to-blue-600 text-white rounded-2xl font-bold text-lg shadow-2xl shadow-sky-500/30 hover:shadow-sky-500/50 hover:scale-105 transition-all duration-300"
                >
                  <span>Comenzar Gratis</span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </button>
                <button onClick={openDemo} className="flex items-center justify-center space-x-2 px-8 py-4 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-2xl font-bold text-lg hover:border-sky-500 hover:text-sky-600 dark:hover:text-sky-400 transition-all duration-300">
                  <span>Ver Demo</span>
                </button>
              </div>

              {/* Stats */}
              <div className="mt-12 grid grid-cols-3 gap-8">
                <div>
                  <p className="text-3xl lg:text-4xl font-black text-sky-600 dark:text-sky-400">500+</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Condominios</p>
                </div>
                <div>
                  <p className="text-3xl lg:text-4xl font-black text-sky-600 dark:text-sky-400">50K+</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Residentes</p>
                </div>
                <div>
                  <p className="text-3xl lg:text-4xl font-black text-sky-600 dark:text-sky-400">99.9%</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Uptime</p>
                </div>
              </div>
            </div>

            {/* Hero Image/Card */}
            <div className="relative lg:pl-8">
              <div className="relative bg-white dark:bg-gray-800 rounded-3xl shadow-2xl p-6 border border-gray-200 dark:border-gray-700">
                <img 
                  src="https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800&h=500&fit=crop"
                  alt="Condominio moderno"
                  className="rounded-2xl w-full h-64 lg:h-80 object-cover"
                />
                
                {/* Floating Cards */}
                <div className="absolute -left-6 top-1/4 bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-xl border border-gray-100 dark:border-gray-700">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center">
                      <Check className="w-6 h-6 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900 dark:text-white">Pago Confirmado</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Cuota Enero 2026</p>
                    </div>
                  </div>
                </div>
                
                <div className="absolute -right-6 bottom-1/4 bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-xl border border-gray-100 dark:border-gray-700">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-sky-100 dark:bg-sky-900/30 rounded-xl flex items-center justify-center">
                      <Calendar className="w-6 h-6 text-sky-600 dark:text-sky-400" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900 dark:text-white">Nueva Reservación</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Salón de eventos</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 lg:py-32 bg-white dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="inline-block px-4 py-1.5 bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300 rounded-full text-sm font-semibold mb-4">
              Características
            </span>
            <h2 className="text-4xl lg:text-5xl font-black text-gray-900 dark:text-white mb-4">
              Todo lo que necesitas para
              <span className="block bg-gradient-to-r from-sky-500 to-blue-600 bg-clip-text text-transparent">
                administrar mejor
              </span>
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              Herramientas diseñadas para simplificar la gestión diaria y mejorar la experiencia de los residentes
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <FeatureCard
              icon={<Building2 className="w-7 h-7" />}
              title="Gestión de Unidades"
              description="Administra todas las unidades, propietarios e inquilinos desde un panel centralizado."
              color="sky"
            />
            <FeatureCard
              icon={<Users className="w-7 h-7" />}
              title="Portal de Residentes"
              description="Los residentes acceden a su información, pagos y servicios las 24 horas."
              color="blue"
            />
            <FeatureCard
              icon={<Calendar className="w-7 h-7" />}
              title="Reservaciones"
              description="Sistema inteligente para reservar áreas comunes y amenidades del condominio."
              color="indigo"
            />
            <FeatureCard
              icon={<CreditCard className="w-7 h-7" />}
              title="Facturación Automática"
              description="Genera y envía estados de cuenta automáticamente. Recibe pagos en línea."
              color="violet"
            />
            <FeatureCard
              icon={<Shield className="w-7 h-7" />}
              title="Seguridad y Control"
              description="Control de accesos, bitácoras de visitantes y reportes de seguridad."
              color="purple"
            />
            <FeatureCard
              icon={<Zap className="w-7 h-7" />}
              title="Notificaciones"
              description="Mantén a todos informados con notificaciones push, email y SMS."
              color="fuchsia"
            />
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 lg:py-32 bg-gray-50 dark:bg-gray-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="inline-block px-4 py-1.5 bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300 rounded-full text-sm font-semibold mb-4">
              Precios
            </span>
            <h2 className="text-4xl lg:text-5xl font-black text-gray-900 dark:text-white mb-4">
              Planes para cada
              <span className="block bg-gradient-to-r from-sky-500 to-blue-600 bg-clip-text text-transparent">
                condominio
              </span>
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-400">
              Precios alineados a tu tamaño. Todos los planes incluyen 30 días de prueba.
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <PricingCard
              name="Básico"
              price="$49"
              period="/unidad/mes"
              description="Ideal para condominios pequeños de 1 a 20 unidades"
              features={[
                '1 a 20 unidades',
                'Gestión de residentes',
                'Cobros y pagos',
                'Incidencias básicas',
                '1 administrador',
                'Soporte por email'
              ]}
              planId="basico"
              onSelect={openRegistration}
            />
            <PricingCard
              name="Profesional"
              price="$39"
              period="/unidad/mes"
              description="Para condominios medianos de 21 a 100 unidades"
              features={[
                '21 a 100 unidades',
                'Todo lo del plan Básico',
                'Reportes avanzados',
                'Comunicaciones y encuestas',
                'Reserva de amenidades',
                '3 administradores',
                'Soporte prioritario',
                'Plan recomendado'
              ]}
              planId="profesional"
              highlighted={true}
              onSelect={openRegistration}
            />
            <PricingCard
              name="Empresarial"
              price="$29"
              period="/unidad/mes"
              description="Para desarrollos grandes de 101 a 500 unidades"
              features={[
                '101 a 500 unidades',
                'Todo del plan Profesional',
                'Integraciones avanzadas',
                'API personalizada',
                'Multi-condominio',
                'Administradores ilimitados',
                'Soporte 24/7',
                'Capacitación incluida'
              ]}
              planId="empresarial"
              onSelect={openRegistration}
            />
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 lg:py-32 bg-white dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="inline-block px-4 py-1.5 bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300 rounded-full text-sm font-semibold mb-4">
              Testimonios
            </span>
            <h2 className="text-4xl lg:text-5xl font-black text-gray-900 dark:text-white">
              Nuestros clientes
              <span className="block bg-gradient-to-r from-sky-500 to-blue-600 bg-clip-text text-transparent">
                nos recomiendan
              </span>
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <TestimonialCard
              quote="DomusCond ha transformado la manera en que administramos nuestro condominio. Los residentes están más felices y nosotros ahorramos horas de trabajo."
              author="María González"
              role="Administradora"
              company="Torres del Valle"
            />
            <TestimonialCard
              quote="El sistema de reservaciones y pagos en línea ha sido un cambio radical. Ya no tenemos filas ni quejas por falta de información."
              author="Carlos Martínez"
              role="Presidente"
              company="Residencial Los Pinos"
            />
            <TestimonialCard
              quote="El soporte es excepcional. Siempre están disponibles para ayudarnos y las actualizaciones constantes mejoran la plataforma."
              author="Ana Rodríguez"
              role="Contadora"
              company="Condominio San Miguel"
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 lg:py-32 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-sky-500 via-blue-600 to-indigo-700" />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48Y2lyY2xlIGN4PSIzMCIgY3k9IjMwIiByPSIyIi8+PC9nPjwvZz48L3N2Zz4=')] opacity-30" />
        
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl lg:text-6xl font-black text-white mb-6">
            ¿Listo para modernizar
            <span className="block">tu condominio?</span>
          </h2>
          <p className="text-xl text-sky-100 mb-10 max-w-2xl mx-auto">
            Únete a cientos de condominios que ya confían en DomusCond para su gestión diaria.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button 
              onClick={openFreeRegistration}
              className="group flex items-center justify-center space-x-2 px-10 py-5 bg-white text-sky-600 rounded-2xl font-bold text-lg shadow-2xl hover:shadow-white/20 hover:scale-105 transition-all duration-300"
            >
              <span>Comenzar Prueba Gratuita</span>
              <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
            <button className="flex items-center justify-center space-x-2 px-10 py-5 border-2 border-white/50 text-white rounded-2xl font-bold text-lg hover:bg-white/10 transition-all duration-300">
              <Phone className="w-5 h-5" />
              <span>Hablar con Ventas</span>
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer id="contact" className="bg-gray-900 dark:bg-gray-950 text-gray-400 pt-20 pb-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
            <div>
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-12 h-12 bg-gradient-to-br from-sky-400 to-blue-600 rounded-xl flex items-center justify-center">
                  <Building2 className="w-7 h-7 text-white" />
                </div>
                <span className="text-2xl font-bold text-white">DomusCond</span>
              </div>
              <p className="text-gray-400 mb-6">
                La plataforma más completa para la gestión de condominios en México.
              </p>
              <div className="flex space-x-4">
                <a href="#" className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center hover:bg-sky-600 transition-colors">
                  <span className="sr-only">Facebook</span>
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M18.77,7.46H14.5v-1.9c0-.9.6-1.1,1-1.1h3V.5h-4.33C10.24.5,9.5,3.44,9.5,5.32v2.15h-3v4h3v12h5v-12h3.85l.42-4Z"/></svg>
                </a>
                <a href="#" className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center hover:bg-sky-600 transition-colors">
                  <span className="sr-only">Twitter</span>
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/></svg>
                </a>
                <a href="#" className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center hover:bg-sky-600 transition-colors">
                  <span className="sr-only">LinkedIn</span>
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                </a>
              </div>
            </div>
            
            <div>
              <h3 className="text-white font-bold text-lg mb-6">Producto</h3>
              <ul className="space-y-4">
                <li><a href="#features" className="hover:text-sky-400 transition-colors">Características</a></li>
                <li><a href="#pricing" className="hover:text-sky-400 transition-colors">Precios</a></li>
                <li><a href="#" className="hover:text-sky-400 transition-colors">Integraciones</a></li>
                <li><a href="#" onClick={(e) => { e.preventDefault(); openDemo() }} className="hover:text-sky-400 transition-colors">Demo</a></li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-white font-bold text-lg mb-6">Empresa</h3>
              <ul className="space-y-4">
                <li><a href="#" className="hover:text-sky-400 transition-colors">Acerca de</a></li>
                <li><a href="#" className="hover:text-sky-400 transition-colors">Blog</a></li>
                <li><a href="#" className="hover:text-sky-400 transition-colors">Empleos</a></li>
                <li><a href="#" className="hover:text-sky-400 transition-colors">Contacto</a></li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-white font-bold text-lg mb-6">Contacto</h3>
              <ul className="space-y-4">
                <li className="flex items-center space-x-3">
                  <Mail className="w-5 h-5 text-sky-400" />
                  <span>contacto@domuscond.com</span>
                </li>
                <li className="flex items-center space-x-3">
                  <Phone className="w-5 h-5 text-sky-400" />
                  <span>+52 (55) 1234-5678</span>
                </li>
                <li className="flex items-start space-x-3">
                  <MapPin className="w-5 h-5 text-sky-400 mt-0.5" />
                  <span>Ciudad de México, México</span>
                </li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center">
            <p className="text-sm">&copy; 2026 DomusCond. Todos los derechos reservados.</p>
            <div className="flex space-x-6 mt-4 md:mt-0">
              <a href="#" className="text-sm hover:text-sky-400 transition-colors">Privacidad</a>
              <a href="#" className="text-sm hover:text-sky-400 transition-colors">Términos</a>
              <a href="#" className="text-sm hover:text-sky-400 transition-colors">Cookies</a>
            </div>
          </div>
        </div>
      </footer>

      {/* Demo Video Modal */}
      {showDemo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={closeDemo}>
          <div className="relative w-full max-w-4xl mx-4" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={closeDemo}
              className="absolute -top-10 right-0 text-white/80 hover:text-white text-sm font-medium transition-colors"
            >
              Cerrar ✕
            </button>
            <video
              src="/video_vivaldi.mp4"
              controls
              autoPlay
              className="w-full rounded-2xl shadow-2xl"
            />
          </div>
        </div>
      )}
    </div>
  )
}

// Feature Card Component
interface FeatureCardProps {
  icon: React.ReactNode
  title: string
  description: string
  color: 'sky' | 'blue' | 'indigo' | 'violet' | 'purple' | 'fuchsia'
}

function FeatureCard({ icon, title, description, color }: FeatureCardProps) {
  const colorClasses = {
    sky: 'from-sky-500 to-sky-600 shadow-sky-500/25',
    blue: 'from-blue-500 to-blue-600 shadow-blue-500/25',
    indigo: 'from-indigo-500 to-indigo-600 shadow-indigo-500/25',
    violet: 'from-violet-500 to-violet-600 shadow-violet-500/25',
    purple: 'from-purple-500 to-purple-600 shadow-purple-500/25',
    fuchsia: 'from-fuchsia-500 to-fuchsia-600 shadow-fuchsia-500/25',
  }

  return (
    <div className="group p-8 bg-gray-50 dark:bg-gray-800 rounded-3xl hover:bg-white dark:hover:bg-gray-700 border border-gray-100 dark:border-gray-700 hover:border-gray-200 dark:hover:border-gray-600 hover:shadow-2xl transition-all duration-500 hover:-translate-y-2">
      <div className={`w-16 h-16 bg-gradient-to-br ${colorClasses[color]} rounded-2xl flex items-center justify-center text-white mb-6 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
        {icon}
      </div>
      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">{title}</h3>
      <p className="text-gray-600 dark:text-gray-400 leading-relaxed">{description}</p>
    </div>
  )
}

// Pricing Card Component
interface PricingCardProps {
  name: string
  price: string
  period: string
  description: string
  features: string[]
  highlighted?: boolean
  planId: 'basico' | 'profesional' | 'empresarial'
  onSelect: (planId: 'basico' | 'profesional' | 'empresarial') => void
}

function PricingCard({ name, price, period, description, features, highlighted = false, planId, onSelect }: PricingCardProps) {
  return (
    <div className={`relative p-8 rounded-3xl transition-all duration-500 ${
      highlighted 
        ? 'bg-gradient-to-br from-sky-500 via-blue-600 to-indigo-700 text-white shadow-2xl shadow-sky-500/30 scale-105 lg:scale-110' 
        : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-sky-300 dark:hover:border-sky-600 hover:shadow-xl'
    }`}>
      {highlighted && (
        <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
          <span className="px-4 py-1.5 bg-amber-400 text-amber-900 rounded-full text-sm font-bold shadow-lg">
            Más Popular
          </span>
        </div>
      )}
      
      <div className="mb-6">
        <h3 className={`text-2xl font-bold mb-2 ${highlighted ? 'text-white' : 'text-gray-900 dark:text-white'}`}>
          {name}
        </h3>
        <p className={`text-sm ${highlighted ? 'text-sky-100' : 'text-gray-500 dark:text-gray-400'}`}>
          {description}
        </p>
      </div>
      
      <div className="mb-8">
        <span className={`text-5xl font-black ${highlighted ? 'text-white' : 'text-gray-900 dark:text-white'}`}>
          {price}
        </span>
        <span className={highlighted ? 'text-sky-100' : 'text-gray-500 dark:text-gray-400'}>
          {period}
        </span>
      </div>
      
      <ul className="space-y-4 mb-8">
        {features.map((feature, index) => (
          <li key={index} className="flex items-start space-x-3">
            <Check className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
              highlighted ? 'text-sky-200' : 'text-green-500'
            }`} />
            <span className={highlighted ? 'text-sky-50' : 'text-gray-600 dark:text-gray-400'}>
              {feature}
            </span>
          </li>
        ))}
      </ul>
      
      <button
        onClick={() => onSelect(planId)}
        className={`w-full py-4 px-6 rounded-xl font-bold text-lg transition-all duration-300 ${
        highlighted
          ? 'bg-white text-sky-600 hover:bg-sky-50 shadow-lg hover:shadow-xl'
          : 'bg-gradient-to-r from-sky-500 to-blue-600 text-white hover:shadow-lg hover:shadow-sky-500/30'
      }`}>
        Comenzar Ahora
      </button>
    </div>
  )
}

// Testimonial Card Component
interface TestimonialCardProps {
  quote: string
  author: string
  role: string
  company: string
}

function TestimonialCard({ quote, author, role, company }: TestimonialCardProps) {
  return (
    <div className="p-8 bg-gray-50 dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 hover:shadow-xl transition-all duration-500">
      <div className="flex space-x-1 mb-4">
        {[...Array(5)].map((_, i) => (
          <Star key={i} className="w-5 h-5 fill-amber-400 text-amber-400" />
        ))}
      </div>
      <p className="text-gray-600 dark:text-gray-400 mb-6 leading-relaxed italic">"{quote}"</p>
      <div className="flex items-center space-x-4">
        <div className="w-12 h-12 bg-gradient-to-br from-sky-400 to-blue-600 rounded-full flex items-center justify-center text-white font-bold">
          {author.split(' ').map(n => n[0]).join('')}
        </div>
        <div>
          <p className="font-bold text-gray-900 dark:text-white">{author}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">{role}, {company}</p>
        </div>
      </div>
    </div>
  )
}
