
import { MapPin, Phone, Mail, Clock, Star, MessageCircle, Headphones, Heart } from 'lucide-react';


const ContactUsPage = () => {
    
      return (
        <div className="min-h-screen bg-warm-bg">
          {/* Hero Section */}
          <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
            <div className="container mx-auto px-4 lg:px-8 py-16">
              <div className="text-center">
                <h1 className="text-4xl lg:text-6xl font-bold mb-4">Contact Us</h1>
                <p className="text-xl lg:text-2xl text-white/90 max-w-3xl mx-auto">
                  Get in touch with SDM Electronics - We're here to help you find the perfect electronics
                </p>
              </div>
            </div>
          </div>
    
          <div className="container mx-auto px-4 lg:px-8 py-16">
            <div className="grid lg:grid-cols-2 gap-16">
              {/* Contact Information */}
              <div>
                <h2 className="text-3xl font-bold text-gray-800 mb-8">Get In Touch</h2>
                
                <div className="space-y-6 mb-12">
                  <div className="flex items-start space-x-4">
                    <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-orange-600 rounded-full flex items-center justify-center flex-shrink-0">
                      <Phone className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-gray-800 mb-2">Phone</h3>
                      <p className="text-gray-600">Call us for immediate assistance</p>
                      <a href="tel:+256755869853" className="block text-orange-600 hover:text-orange-700 font-medium">
                        0755 869 853
                      </a>
                      <a href="tel:+256705095221" className="block text-orange-600 hover:text-orange-700 font-medium">
                        0705 095 221
                      </a>
                    </div>
                  </div>
    
                  <div className="flex items-start space-x-4">
                    <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-orange-600 rounded-full flex items-center justify-center flex-shrink-0">
                      <Mail className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-gray-800 mb-2">Email</h3>
                      <p className="text-gray-600">Send us your questions anytime</p>
                      <a href="mailto:sdmelectronics256@gmail.com" className="text-orange-600 hover:text-orange-700 font-medium">
                        sdmelectronics256@gmail.com
                      </a>
                    </div>
                  </div>
    
                  <div className="flex items-start space-x-4">
                    <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-orange-600 rounded-full flex items-center justify-center flex-shrink-0">
                      <MapPin className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-gray-800 mb-2">Location</h3>
                      <p className="text-gray-600">Visit our showroom</p>
                      <p className="text-gray-700 font-medium">
                        Arua Park Plaza, Shop C2-386<br />
                        Kampala, Uganda
                      </p>
                    </div>
                  </div>
    
                  <div className="flex items-start space-x-4">
                    <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-orange-600 rounded-full flex items-center justify-center flex-shrink-0">
                      <Clock className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-gray-800 mb-2">Business Hours</h3>
                      <div className="text-gray-600 space-y-1">
                        <p>Monday - Friday: 8:00 AM - 8:00 PM</p>
                        <p>Saturday: 9:00 AM - 6:00 PM</p>
                        <p>Sunday: 10:00 AM - 4:00 PM</p>
                      </div>
                    </div>
                  </div>
                </div>
    
                {/* Quick Stats */}
                <div className="bg-white rounded-xl p-6 shadow-md">
                  <h3 className="text-xl font-semibold text-gray-800 mb-4">Why Customers Love Us</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center">
                      <div className="flex items-center justify-center mb-2">
                        <Star className="w-5 h-5 text-yellow-500 fill-current" />
                        <span className="text-2xl font-bold text-gray-800 ml-1">4.8</span>
                      </div>
                      <p className="text-sm text-gray-600">Customer Rating</p>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-gray-800 mb-2">24hrs</div>
                      <p className="text-sm text-gray-600">Response Time</p>
                    </div>
                  </div>
                </div>
              </div>
    
              {/* Contact Methods Grid */}
              <div>
                <div className="bg-white rounded-xl shadow-lg p-8">
                  <h2 className="text-3xl font-bold text-gray-800 mb-6 text-center">How Can We Help You?</h2>
                  
                  <div className="grid md:grid-cols-2 gap-6 mb-8">
                    {/* WhatsApp Card */}
                    <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-xl p-6 hover:shadow-md transition-shadow cursor-pointer group">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                          <MessageCircle className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-gray-800">WhatsApp Us</h3>
                          <p className="text-sm text-gray-600">Quick responses, instant support</p>
                        </div>
                      </div>
                      <div className="mt-4">
                        <a 
                          href="https://wa.me/256755869853" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="inline-flex items-center text-green-600 font-medium hover:text-green-700"
                        >
                          Chat with us now →
                        </a>
                      </div>
                    </div>
    
                    {/* Call Card */}
                    <div className="bg-gradient-to-br from-warm-accentSoft to-warm-accentTint border border-warm-line rounded-xl p-6 hover:shadow-md transition-shadow cursor-pointer group">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-warm-accent rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                          <Headphones className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-gray-800">Call Us Direct</h3>
                          <p className="text-sm text-gray-600">Speak to our experts</p>
                        </div>
                      </div>
                      <div className="mt-4 flex flex-col gap-1">
                        <a
                          href="tel:+256755869853"
                          className="inline-flex items-center text-warm-accent font-medium hover:text-warm-accentPress"
                        >
                          0755 869 853 →
                        </a>
                        <a
                          href="tel:+256705095221"
                          className="inline-flex items-center text-warm-accent font-medium hover:text-warm-accentPress"
                        >
                          0705 095 221 →
                        </a>
                      </div>
                    </div>
    
                    {/* Email Card */}
                    <div className="bg-gradient-to-br from-orange-50 to-orange-100 border border-orange-200 rounded-xl p-6 hover:shadow-md transition-shadow cursor-pointer group">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-orange-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                          <Mail className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-gray-800">Email Support</h3>
                          <p className="text-sm text-gray-600">Detailed inquiries welcome</p>
                        </div>
                      </div>
                      <div className="mt-4">
                        <a 
                          href="mailto:info@sdmelectronics.ug" 
                          className="inline-flex items-center text-orange-600 font-medium hover:text-orange-700"
                        >
                          Send us an email →
                        </a>
                      </div>
                    </div>
    
                    {/* Visit Store Card */}
                    <div className="bg-gradient-to-br from-warm-hero to-warm-surface border border-warm-line rounded-xl p-6 hover:shadow-md transition-shadow cursor-pointer group">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-warm-ink rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                          <MapPin className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-gray-800">Visit Our Store</h3>
                          <p className="text-sm text-gray-600">See products in person</p>
                        </div>
                      </div>
                      <div className="mt-4">
                        <span className="inline-flex items-center text-warm-ink font-medium">
                          Kampala CBD →
                        </span>
                      </div>
                    </div>
                  </div>
    
                  {/* Quick Response Promise */}
                  <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl p-6 text-white text-center">
                    <div className="flex items-center justify-center mb-3">
                      <Heart className="w-6 h-6 text-white mr-2" />
                      <span className="text-lg font-semibold">Our Promise to You</span>
                    </div>
                    <p className="text-white/90 mb-4">
                      We respond to all inquiries within 2 hours during business hours. 
                      Your satisfaction is our priority!
                    </p>
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <div className="text-2xl font-bold">2hrs</div>
                        <div className="text-sm text-white/80">Response Time</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold">100%</div>
                        <div className="text-sm text-white/80">Genuine Products</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold">24/7</div>
                        <div className="text-sm text-white/80">WhatsApp Support</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    };
    
    export default ContactUsPage;