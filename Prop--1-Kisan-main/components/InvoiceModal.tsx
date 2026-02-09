import React from 'react';
import { Order } from '../types';
import { Button, Card } from './UI';
import { X, Download, Printer, CheckCircle } from 'lucide-react';

interface InvoiceModalProps {
  order: Order | null;
  onClose: () => void;
}

export function InvoiceModal({ order, onClose }: InvoiceModalProps) {
  if (!order) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in">
      <Card className="w-full max-w-2xl bg-white shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header Actions */}
        <div className="flex justify-between items-center p-4 border-b border-slate-100 bg-slate-50 print:hidden">
            <h3 className="font-bold text-slate-700">Digital Invoice / Contract</h3>
            <div className="flex gap-2">
                <Button variant="outline" onClick={handlePrint}>
                    <Printer className="w-4 h-4 mr-2" /> Print
                </Button>
                <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                    <X className="w-5 h-5 text-slate-500" />
                </button>
            </div>
        </div>

        {/* Invoice Content */}
        <div className="flex-1 overflow-y-auto p-8 bg-white" id="invoice-content">
            {/* Brand Header */}
            <div className="flex justify-between items-start mb-8 border-b-2 border-slate-900 pb-6">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center text-white font-bold text-lg">K</div>
                        <span className="text-2xl font-black text-slate-900 tracking-tight">KisanSetu</span>
                    </div>
                    <p className="text-sm text-slate-500 font-medium">Fair Agri-Commerce Network</p>
                </div>
                <div className="text-right">
                    <h1 className="text-3xl font-black text-slate-200 uppercase tracking-widest mb-1">Invoice</h1>
                    <p className="font-bold text-slate-900">#{order.id.toUpperCase()}</p>
                    <p className="text-sm text-slate-500">{new Date(order.date).toLocaleDateString()}</p>
                </div>
            </div>

            {/* Parties */}
            <div className="grid grid-cols-2 gap-12 mb-10">
                <div>
                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Seller (Farmer)</h4>
                    <div className="font-bold text-lg text-slate-900">{order.farmerName}</div>
                    <div className="text-sm text-slate-600 mt-1">{order.farmerLocation}</div>
                    <div className="flex items-center gap-1 mt-2 text-xs font-bold text-green-600">
                        <CheckCircle className="w-3 h-3" /> Verified Farmer
                    </div>
                </div>
                <div>
                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Buyer</h4>
                    <div className="font-bold text-lg text-slate-900">{order.buyerName}</div>
                    <div className="text-sm text-slate-600 mt-1">{order.buyerLocation}</div>
                </div>
            </div>

            {/* Line Items */}
            <table className="w-full mb-8">
                <thead>
                    <tr className="border-b border-slate-200">
                        <th className="text-left py-3 text-xs font-black text-slate-400 uppercase tracking-widest">Description</th>
                        <th className="text-right py-3 text-xs font-black text-slate-400 uppercase tracking-widest">Qty</th>
                        <th className="text-right py-3 text-xs font-black text-slate-400 uppercase tracking-widest">Price</th>
                        <th className="text-right py-3 text-xs font-black text-slate-400 uppercase tracking-widest">Amount</th>
                    </tr>
                </thead>
                <tbody>
                    <tr className="border-b border-slate-100">
                        <td className="py-4">
                            <div className="font-bold text-slate-900">{order.cropName}</div>
                            <div className="text-xs text-slate-500">Grade A • Fresh Harvest</div>
                        </td>
                        <td className="text-right py-4 font-medium text-slate-700">{order.quantity} kg</td>
                        <td className="text-right py-4 font-medium text-slate-700">₹{(order.totalAmount / order.quantity).toFixed(2)}</td>
                        <td className="text-right py-4 font-bold text-slate-900">₹{order.totalAmount.toLocaleString()}</td>
                    </tr>
                </tbody>
                <tfoot>
                    <tr>
                        <td colSpan={3} className="pt-4 text-right text-sm font-medium text-slate-500">Subtotal</td>
                        <td className="pt-4 text-right font-bold text-slate-900">₹{order.totalAmount.toLocaleString()}</td>
                    </tr>
                    <tr>
                        <td colSpan={3} className="pt-2 text-right text-sm font-medium text-slate-500">Platform Fee (0%)</td>
                        <td className="pt-2 text-right font-bold text-slate-900">₹0</td>
                    </tr>
                    <tr>
                        <td colSpan={3} className="pt-4 text-right text-xl font-black text-slate-900">Total</td>
                        <td className="pt-4 text-right text-xl font-black text-green-600">₹{order.totalAmount.toLocaleString()}</td>
                    </tr>
                </tfoot>
            </table>

            {/* Terms */}
            <div className="bg-slate-50 p-6 rounded-xl border border-slate-100">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Terms & Conditions</h4>
                <ul className="text-xs text-slate-500 space-y-2 list-disc pl-4">
                    <li>Payment is held in escrow until delivery is confirmed by the buyer.</li>
                    <li>Quality disputes must be raised within 24 hours of delivery.</li>
                    <li>Transport arrangements are subject to availability.</li>
                    <li>This is a computer-generated invoice and needs no signature.</li>
                </ul>
            </div>
        </div>
      </Card>
    </div>
  );
}
