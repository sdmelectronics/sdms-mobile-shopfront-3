
import { Link } from "react-router-dom";
import { Smartphone, Mail, MapPin, Phone, Facebook, Twitter, Instagram } from "lucide-react";

export const Footer = () => {
  return (
    <footer className="bg-warm-panel text-white pb-20 md:pb-12">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Company Info */}
          <div>
            <div className="flex items-center space-x-2 mb-4">
              <div className="w-9 h-9 bg-gradient-to-br from-warm-accent to-warm-accentPress rounded-xl flex items-center justify-center">
                <Smartphone className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold font-display">SDM Electronics</span>
            </div>
            <p className="text-white/60 mb-4">
              Uganda's premier destination for quality electronics and gadgets.
              Serving customers with genuine products and excellent service.
            </p>
            <div className="flex space-x-4">
              <Facebook className="w-5 h-5 text-white/60 hover:text-warm-accent cursor-pointer transition-colors" />
              <Twitter className="w-5 h-5 text-white/60 hover:text-warm-accent cursor-pointer transition-colors" />
              <Instagram className="w-5 h-5 text-white/60 hover:text-warm-accent cursor-pointer transition-colors" />
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Quick Links</h3>
            <ul className="space-y-2">
              <li><Link to="/products" className="text-gray-400 hover:text-white transition-colors">All Products</Link></li>
              <li><a href="/products?category=smartphones" className="text-gray-400 hover:text-white transition-colors">Smartphones</a></li>
              <li><Link to="/products?category=laptops" className="text-gray-400 hover:text-white transition-colors">Laptops</Link></li>
              <li><Link to="/products?category=audio" className="text-gray-400 hover:text-white transition-colors">Audio Devices</Link></li>
              <li><Link to="/products?category=wearables" className="text-gray-400 hover:text-white transition-colors">Wearables</Link></li>
            </ul>
          </div>

          {/* Customer Service */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Customer Service</h3>
            <ul className="space-y-2">
              <li><a href="/aboutUsPage" className="text-gray-400 hover:text-white transition-colors">About Us</a></li>
              <li><a href="/ContactUsPage" className="text-gray-400 hover:text-white transition-colors">Contact Us</a></li>
              {/* <li><Link to="/shipping" className="text-gray-400 hover:text-white transition-colors">Shipping Info</Link></li>
              <li><Link to="/returns" className="text-gray-400 hover:text-white transition-colors">Returns</Link></li>
              <li><Link to="/faq" className="text-gray-400 hover:text-white transition-colors">FAQ</Link></li> */}
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Contact Info</h3>
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <MapPin className="w-5 h-5 text-warm-accent mt-0.5 flex-shrink-0" />
                <span className="text-gray-400">
                  Arua Park Plaza Shop Number C1-287<br />
                  William Street Kampala-Uganda
                </span>
              </div>
              <div className="flex items-center space-x-3">
                <Phone className="w-5 h-5 text-warm-accent" />
                <span className="text-gray-400">+256755869853</span>
              </div>
              <div className="flex items-center space-x-3">
                <Mail className="w-5 h-5 text-warm-accent" />
                <span className="text-gray-400">sdmelectronics256@gmail.com</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-white/10 mt-8 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
          

            <div className="flex space-x-6 mt-4 md:mt-0">
              <Link to="/privacy" className="text-gray-400 hover:text-white text-sm transition-colors">
                Privacy Policy
              </Link>
              <Link to="/terms" className="text-gray-400 hover:text-white text-sm transition-colors">
                Terms of Service
              </Link>
            </div>
          </div>
          <p className="text-gray-400 text-sm">
              © 2024 SDM Electronics. All rights reserved.
            </p>
            <footer className="text-center text-gray-500 text-sm py-4">
  Created by <a href="https://kiram.netlify.app" className="text-warm-accent hover:underline">Akram Dev</a>
</footer>
        </div>
      </div>
    </footer>
  );
};
