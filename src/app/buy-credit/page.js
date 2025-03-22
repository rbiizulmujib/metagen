'use client';
import { Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import supabase from '@/lib/supabase';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
// import { Toaster } from "@/components/ui/toaster";
import { Toaster } from "@/components/ui/sonner"

export default function PricingPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [price1] = useState(24000);
    const [price2] = useState(59000);
    const [price3] = useState(199000);
    const [dialogMessage, setDialogMessage] = useState(""); 
    const [showDialog, setShowDialog] = useState(false);
    const [user, setUser] = useState(null);
    const [initializing, setInitializing] = useState(true);

    // Check if user is logged in
    useEffect(() => {
        async function checkUserSession() {
            try {
                const { data: { session }, error } = await supabase.auth.getSession();
                
                if (error) {
                    console.error('Error fetching session:', error);
                    throw error;
                }
                
                if (!session || !session.user) {
                    // Redirect to login if no session found
                    router.push('/login');
                    return;
                }
                
                setUser(session.user);
                setInitializing(false);
            } catch (error) {
                console.error('Session check error:', error);
                router.push('/login');
            }
        }
        
        checkUserSession();
    }, [router]);
    
    // Load Midtrans Snap.js on component mount
    useEffect(() => {
        // Create script element for Midtrans Snap
        const midtransScriptUrl = 'https://app.sandbox.midtrans.com/snap/snap.js';
        const clientKey = 'YOUR-MIDTRANS-CLIENT-KEY'; // Replace with your actual client key
        
        const script = document.createElement('script');
        script.src = `${midtransScriptUrl}`;
        script.setAttribute('data-client-key', clientKey);
        script.async = true;
        
        document.body.appendChild(script);
        
        return () => {
            // Clean up script when component unmounts
            if (document.body.contains(script)) {
                document.body.removeChild(script);
            }
        };
    }, []);

    // Function to update user credits in Supabase
    const updateUserCredits = async (creditAmount) => {
        try {
            // First, get the current credits value
            const { data: userData, error: fetchError } = await supabase
                .from('users')
                .select('credits')
                .eq('email', user.email)
                .single();
                
            if (fetchError) throw fetchError;
            
            // Calculate new credits value
            const currentCredits = userData?.credits || 0;
            const newCredits = currentCredits + creditAmount;
            
            // Update the user's credits
            const { error: updateError } = await supabase
                .from('users')
                .update({ credits: newCredits })
                .eq('email', user.email);
                
            if (updateError) throw updateError;
            
            return true;
        } catch (error) {
            console.error('Error updating credits:', error);
            return false;
        }
    };

    const handlePayment = async (price) => {
        // Check if user is logged in
        if (!user) {
            toast({
                title: "Authentication required",
                description: "Please log in to continue with your purchase.",
                variant: "destructive",
            });
            router.push('/login');
            return;
        }
        
        setLoading(true);
        
        // Generate unique order ID
        const orderId = 'ORDER-' + new Date().getTime();
        
        // Determine credit amount and plan details based on price
        let planName = "Explore";
        let creditAmount = 100; // Default for Explore plan
        
        if (price === price2) {
            planName = "Pro";
            creditAmount = 250;
        } else if (price === price3) {
            planName = "Premium";
            creditAmount = 1000;
        }
        
        const itemDetails = [{ 
            id: 'plan-' + planName.toLowerCase(), 
            price: price,
            quantity: 1, 
            name: `${planName} Plan - ${creditAmount} Credits` 
        }];
        
        // Use actual user data for customer details
        const customerDetails = {
            first_name: user.user_metadata?.full_name?.split(' ')[0] || "Customer",
            last_name: user.user_metadata?.full_name?.split(' ').slice(1).join(' ') || "Name",
            email: user.email,
            phone: user.phone || user.user_metadata?.phone || "08123456789"
        };
    
        try {
            // Call your payment API
            const response = await fetch('/api/payment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    orderId, 
                    grossAmount: price, 
                    itemDetails, 
                    customerDetails 
                }),
            });
    
            const data = await response.json();
    
            if (data.token) {
                // Check if window.snap is available
                if (typeof window.snap !== 'undefined') {
                    window.snap.pay(data.token, {
                        onSuccess: async function() {
                            // Update user credits in database
                            const updateSuccess = await updateUserCredits(creditAmount);
                            
                            if (updateSuccess) {
                                setDialogMessage(`Payment successful! ${creditAmount} credits have been added to your account.`);
                            } else {
                                setDialogMessage("Payment successful, but we couldn't update your credits. Please contact support.");
                            }
                            
                            setShowDialog(true);
                            
                            // Log the transaction
                            await supabase.from('transactions').insert({
                                user_email: user.email,
                                amount: price,
                                credits: creditAmount,
                                plan_name: planName,
                                order_id: orderId,
                                status: 'success'
                            });
                            
                            // Redirect to success page
                            setTimeout(() => {
                                router.push('/app');
                            }, 2000);
                        },
                        onPending: async function() {
                            setDialogMessage("Waiting for payment confirmation...");
                            setShowDialog(true);
                            
                            // Log the pending transaction
                            await supabase.from('transactions').insert({
                                user_email: user.email,
                                amount: price,
                                credits: creditAmount,
                                plan_name: planName,
                                order_id: orderId,
                                status: 'pending'
                            });
                        },
                        onError: async function() {
                            setDialogMessage("Payment failed! Please try again or contact support.");
                            setShowDialog(true);
                            
                            // Log the failed transaction
                            await supabase.from('transactions').insert({
                                user_email: user.email,
                                amount: price,
                                credits: creditAmount,
                                plan_name: planName,
                                order_id: orderId,
                                status: 'failed'
                            });
                        },
                        onClose: function() {
                            setDialogMessage("You closed the payment window without completing the transaction.");
                            setShowDialog(true);
                        },
                    });
                } else {
                    console.error("Snap.js not loaded properly");
                    setDialogMessage("Payment system is not ready. Please try again in a moment.");
                    setShowDialog(true);
                }
            } else {
                setDialogMessage("Failed to create transaction.");
                setShowDialog(true);
            }
        } catch (error) {
            console.error("Error creating transaction:", error);
            setDialogMessage("An error occurred while processing your payment.");
            setShowDialog(true);
        }
    
        setLoading(false);
    };

  // Show loading state if still checking authentication
  if (initializing) {
    return (
      <div className="container mx-auto py-16 px-4 flex justify-center items-center min-h-[50vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-lg">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-16 px-4">
      <div className="text-center mb-16">
        <h1 className="text-4xl font-bold tracking-tight mb-4">Simple, Transparent Pricing</h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Choose the plan that's right for you and get started with our platform today.
        </p>
        {user && (
          <div className="mt-4 p-3 bg-muted rounded-md inline-block">
            <p className="font-medium">Logged in as: {user.email}</p>
          </div>
        )}
      </div>

      <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
        {/* Explore Plan */}
        <Card className="flex flex-col border-border">
          <CardHeader className="pb-8">
            <CardTitle className="text-2xl">Explore</CardTitle>
            <CardDescription>Perfect for getting started</CardDescription>
            <div className="mt-4">
              <span className="text-4xl font-bold">Rp {price1.toLocaleString("id-ID")}</span>
            </div>
          </CardHeader>
          <CardContent className="flex-grow">
            <div className="space-y-4">
              <div className="flex items-center">
                <Check className="mr-2 h-4 w-4 text-primary" />
                <span>100 Credits</span>
              </div>
              <div className="flex items-center">
                <Check className="mr-2 h-4 w-4 text-primary" />
                <span>Basic features</span>
              </div>
              <div className="flex items-center">
                <Check className="mr-2 h-4 w-4 text-primary" />
                <span>Email support</span>
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button 
              className="w-full" 
              disabled={loading}
              onClick={() => handlePayment(price1)}
            >
              {loading ? 'Processing...' : 'Get Started'}
            </Button>
          </CardFooter>
        </Card>

        {/* Pro Plan */}
        <Card className="flex flex-col border-primary relative">
          <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-primary text-primary-foreground px-3 py-1 rounded-full text-sm font-medium">
            Most Popular
          </div>
          <CardHeader className="pb-8">
            <CardTitle className="text-2xl">Pro</CardTitle>
            <CardDescription>Best value for professionals</CardDescription>
            <div className="mt-4">
              <span className="text-4xl font-bold">Rp {price2.toLocaleString("id-ID")}</span>
            </div>
          </CardHeader>
          <CardContent className="flex-grow">
            <div className="space-y-4">
              <div className="flex items-center">
                <Check className="mr-2 h-4 w-4 text-primary" />
                <span>250 Credits</span>
              </div>
              <div className="flex items-center">
                <Check className="mr-2 h-4 w-4 text-primary" />
                <span>All Explore features</span>
              </div>
              <div className="flex items-center">
                <Check className="mr-2 h-4 w-4 text-primary" />
                <span>Priority support</span>
              </div>
              <div className="flex items-center">
                <Check className="mr-2 h-4 w-4 text-primary" />
                <span>Advanced analytics</span>
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button 
              className="w-full" 
              disabled={loading}
              onClick={() => handlePayment(price2)}
            >
              {loading ? 'Processing...' : 'Get Started'}
            </Button>
          </CardFooter>
        </Card>

        {/* Premium Plan */}
        <Card className="flex flex-col border-border">
          <CardHeader className="pb-8">
            <CardTitle className="text-2xl">Premium</CardTitle>
            <CardDescription>For power users and teams</CardDescription>
            <div className="mt-4">
              <span className="text-4xl font-bold">Rp {price3.toLocaleString("id-ID")}</span>
            </div>
          </CardHeader>
          <CardContent className="flex-grow">
            <div className="space-y-4">
              <div className="flex items-center">
                <Check className="mr-2 h-4 w-4 text-primary" />
                <span>1,000 Credits</span>
              </div>
              <div className="flex items-center">
                <Check className="mr-2 h-4 w-4 text-primary" />
                <span>All Pro features</span>
              </div>
              <div className="flex items-center">
                <Check className="mr-2 h-4 w-4 text-primary" />
                <span>Dedicated support</span>
              </div>
              <div className="flex items-center">
                <Check className="mr-2 h-4 w-4 text-primary" />
                <span>Custom integrations</span>
              </div>
              <div className="flex items-center">
                <Check className="mr-2 h-4 w-4 text-primary" />
                <span>Team collaboration</span>
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button 
              className="w-full" 
              variant="outline"
              disabled={loading}
              onClick={() => handlePayment(price3)}
            >
              {loading ? 'Processing...' : 'Get Started'}
            </Button>
          </CardFooter>
        </Card>
      </div>
      
      {/* Status Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Payment Status</DialogTitle>
          </DialogHeader>
          <p>{dialogMessage}</p>
        </DialogContent>
      </Dialog>
      
      {/* Add Toaster component to the DOM */}
      <Toaster />
    </div>
  )
}
