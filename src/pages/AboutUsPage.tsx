import React from 'react';
import { Users, Award, Truck, Shield } from 'lucide-react';

const AboutUsPage = () => {
  return (
    <div className="min-h-screen bg-warm-bg">
      {/* Hero Section */}
      <div className="bg-warm-hero text-warm-ink">
        <div className="container mx-auto px-4 lg:px-8 py-16">
          <div className="text-center">
            <span className="text-warm-accent font-bold uppercase tracking-[0.14em] text-xs">Since 2014 · Kampala</span>
            <h1 className="text-4xl lg:text-6xl font-bold mb-4 mt-3">About SDM Electronics</h1>
            <p className="text-xl lg:text-2xl text-warm-muted max-w-3xl mx-auto">
              Uganda's premier destination for quality electronics and exceptional customer service
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 lg:px-8 py-16">
        {/* Story Section */}
        <div className="mb-16">
          <div className="max-w-4xl mx-auto text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-800 mb-6">Our Story</h2>
            <p className="text-lg text-gray-600 leading-relaxed mb-6">
              Founded with a vision to make quality electronics accessible to every Ugandan, SDM Electronics has grown from a small local shop to one of Uganda's most trusted electronics retailers. We believe that technology should enhance lives, and we're committed to bringing you the latest innovations at the best prices.
            </p>
            <p className="text-lg text-gray-600 leading-relaxed">
              Our journey began with a simple promise: to provide genuine electronics, exceptional service, and unbeatable value. Today, we continue to honor that promise while serving thousands of satisfied customers across Uganda.
            </p>
          </div>
        </div>

        {/* Values Section */}
        <div className="mb-16">
          <h2 className="text-3xl lg:text-4xl font-bold text-gray-800 text-center mb-12">Why Choose SDM Electronics?</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center p-6 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow">
              <div className="w-16 h-16 bg-gradient-to-r from-orange-500 to-orange-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Award className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-3">Quality Guaranteed</h3>
              <p className="text-gray-600">Only genuine products from trusted brands with full warranty coverage.</p>
            </div>

            <div className="text-center p-6 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow">
              <div className="w-16 h-16 bg-gradient-to-r from-orange-500 to-orange-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Truck className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-3">Free Delivery</h3>
              <p className="text-gray-600">Fast and free delivery nationwide to bring your electronics right to your door.</p>
            </div>

            <div className="text-center p-6 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow">
              <div className="w-16 h-16 bg-gradient-to-r from-orange-500 to-orange-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-3">Expert Support</h3>
              <p className="text-gray-600">Our knowledgeable team is always ready to help you find the perfect electronics.</p>
            </div>

            <div className="text-center p-6 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow">
              <div className="w-16 h-16 bg-gradient-to-r from-orange-500 to-orange-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-3">Secure Shopping</h3>
              <p className="text-gray-600">Safe and secure transactions with multiple payment options for your convenience.</p>
            </div>
          </div>
        </div>

        {/* Stats Section */}
        <div className="bg-warm-panel rounded-2xl p-8 lg:p-12 text-white mb-16">
          <div className="grid md:grid-cols-3 gap-8 text-center">
            <div>
              <div className="text-4xl lg:text-5xl font-bold mb-2 text-warm-accent">5000+</div>
              <div className="text-lg text-white/80">Happy Customers</div>
            </div>
            <div>
              <div className="text-4xl lg:text-5xl font-bold mb-2 text-warm-accent">10,000+</div>
              <div className="text-lg text-white/80">Products Delivered</div>
            </div>
            <div>
              <div className="text-4xl lg:text-5xl font-bold mb-2 text-warm-accent">5+</div>
              <div className="text-lg text-white/80">Years of Excellence</div>
            </div>
          </div>
        </div>

        {/* Mission Statement */}
        <div className="text-center max-w-4xl mx-auto">
          <h2 className="text-3xl lg:text-4xl font-bold text-gray-800 mb-6">Our Mission</h2>
          <p className="text-xl text-gray-600 leading-relaxed">
            To democratize access to quality electronics across Uganda by providing genuine products, exceptional customer service, and competitive prices that make technology accessible to everyone.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AboutUsPage;