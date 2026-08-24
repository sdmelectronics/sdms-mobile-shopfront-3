import { useState } from "react";
import { WHATSAPP_NUMBER } from '@/lib/contact';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCart } from "@/hooks/useCart";
import { CartItems } from "@/components/CartItems";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

/**
 * A v4 UUID for rows we create.
 *
 * crypto.randomUUID needs a secure context and is missing on older mobile
 * Safari, so fall back rather than break checkout on someone's phone.
 */
const newId = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

const Checkout = () => {
  const { items, total, clearCart, addToRecentProducts } = useCart();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [customerData, setCustomerData] = useState({
    firstName: "",
    // lastName: "",
    phone: "",
    // email: "",
    address: "",
    // city: "",
    // district: "",
    notes: ""
  });

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-UG', {
      style: 'currency',
      currency: 'UGX',
      minimumFractionDigits: 0
    }).format(price);
  };

  const handleInputChange = (field: string, value: string) => {
    setCustomerData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (items.length === 0) {
      toast({
        title: "Cart Empty",
        description: "Please add items to your cart before checking out",
        variant: "destructive",
      });
      return;
    }

    if (!customerData.firstName || !customerData.phone) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // Ids are generated here rather than read back from the database.
      //
      // Reading a row back after insert requires a SELECT policy, and the only
      // way to grant that to an anonymous shopper is to make every order and
      // every customer readable by everyone — which is exactly the leak this
      // avoids. Generating the ids client-side lets the storefront write its
      // order without ever being able to read anyone else's.
      const customerId = newId();
      const orderId = newId();

      const { error: customerError } = await supabase
        .from('customers')
        .insert([{
          id: customerId,
          first_name: customerData.firstName,
          phone: customerData.phone,
          address: customerData.address || null,
        }]);

      if (customerError) throw customerError;

      // Generate order number
      const { data: orderNumber, error: orderNumberError } = await supabase
        .rpc('generate_order_number');

      if (orderNumberError) throw orderNumberError;

      const orderTotal = total;

      const itemsList = items.map(item =>
        `${item.name} - Qty: ${item.quantity} - ${formatPrice(item.price * item.quantity)}`
      ).join('\n');

      const customerDetails = [
        `Name: ${customerData.firstName}`,
        `Phone: ${customerData.phone}`,
        // customerData.lastName && `Last Name: ${customerData.lastName}`,
        // customerData.email && `Email: ${customerData.email}`,
        customerData.address && `Address: ${customerData.address}`,
        // customerData.city && `City: ${customerData.city}`,
        // customerData.district && `District: ${customerData.district}`
      ].filter(Boolean).join('\n');

      const message = `New Order: ${orderNumber}

Customer Details:
${customerDetails}

Order Details:
${itemsList}

Subtotal: ${formatPrice(total)}
Shipping: To be confirmed by seller
Total (excluding shipping): ${formatPrice(orderTotal)}

${customerData.notes ? `Notes: ${customerData.notes}` : ''}`;

      const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;

      // The chat URL is stored with the order rather than patched in
      // afterwards, so the storefront needs no UPDATE permission on orders at
      // all — which is what stops anyone flipping an order to "delivered".
      const { error: orderError } = await supabase
        .from('orders')
        .insert([{
          id: orderId,
          customer_id: customerId,
          order_number: orderNumber,
          subtotal: total,
          shipping_fee: null,
          total: orderTotal,
          payment_method: 'whatsapp',
          status: 'pending',
          notes: customerData.notes || null,
          whatsapp_chat_url: whatsappUrl,
        }]);

      if (orderError) throw orderError;

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(items.map(item => ({
          order_id: orderId,
          product_id: item.id,
          quantity: item.quantity,
          unit_price: item.price,
          total_price: item.price * item.quantity,
        })));

      if (itemsError) throw itemsError;

      // Add purchased items to recent products
      addToRecentProducts(items);
      
      clearCart();
      window.open(whatsappUrl, '_blank');

      toast({
        title: "Order Sent",
        description: "You'll be redirected to WhatsApp. The seller will confirm your shipping fee there.",
      });

    } catch (error) {
      console.error('Checkout error:', error);
      toast({
        title: "Error",
        description: "Failed to place order. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Checkout</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div>
          <h2 className="text-xl font-semibold mb-4">Your Order</h2>
          <CartItems />
        </div>

        <div>
          <Card>
            <CardHeader>
              <CardTitle>Customer Details</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="firstName">Full Name *</Label>
                  <Input
                    id="firstName"
                    value={customerData.firstName}
                    onChange={(e) => handleInputChange('firstName', e.target.value)}
                    required
                  />
                </div>

                {/* <div>
                  <Label htmlFor="lastName">Last Name *</Label>
                  <Input
                    id="lastName"
                    value={customerData.lastName}
                    onChange={(e) => handleInputChange('lastName', e.target.value)}
                    required
                  />
                </div> */}

                <div>
                  <Label htmlFor="phone">Phone Number *</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={customerData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    placeholder="e.g., +256700000000"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="address">Address (Optional)</Label>
                  <Input
                    id="address"
                    value={customerData.address}
                    onChange={(e) => handleInputChange('address', e.target.value)}
                  />
                </div>

                {/* <div>
                  <Label htmlFor="email">Email (Optional)</Label>
                  <Input
                    id="email"
                    type="email"
                    value={customerData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                  />
                </div>

               

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="city">City (Optional)</Label>
                    <Input
                      id="city"
                      value={customerData.city}
                      onChange={(e) => handleInputChange('city', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="district">District (Optional)</Label>
                    <Input
                      id="district"
                      value={customerData.district}
                      onChange={(e) => handleInputChange('district', e.target.value)}
                    />
                  </div>
                </div> */}

                <div>
                  <Label htmlFor="notes">Order Notes (Optional)</Label>
                  <Textarea
                    id="notes"
                    value={customerData.notes}
                    onChange={(e) => handleInputChange('notes', e.target.value)}
                    placeholder="Any special instructions..."
                  />
                </div>

                <div className="pt-4 border-t">
                  <div className="text-sm text-gray-600 italic mb-2">
                    * Shipping fee will be confirmed by the seller after reviewing your location. <span className="text-green-600 font-medium">Some products may qualify for free delivery.</span>
                  </div>

                  <div className="flex justify-between items-center mb-2">
                    <span>Subtotal:</span>
                    <span>{formatPrice(total)}</span>
                  </div>

                  <div className="flex justify-between items-center text-lg font-semibold border-t pt-2">
                    <span>Total (excluding shipping):</span>
                    <span>{formatPrice(total)}</span>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-orange-500 hover:bg-orange-600 text-white"
                  disabled={loading || items.length === 0}
                >
                  {loading ? 'Processing...' : 'Place Order via WhatsApp'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
