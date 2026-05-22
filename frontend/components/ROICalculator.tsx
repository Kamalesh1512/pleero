'use client';

import { useState } from 'react';

export default function ROICalculator() {
  const [monthlyRefunds, setMonthlyRefunds] = useState(250);
  const [averageOrderValue, setAverageOrderValue] = useState(75);

  // Formula: (refunds × AOV × 0.15 acceptance rate × 1.1 bonus) - 99 subscription
  const calculateROI = () => {
    const retainedRevenue = monthlyRefunds * averageOrderValue * 0.15 * 1.1;
    const netRetained = retainedRevenue - 99;
    return Math.max(0, netRetained);
  };

  const roi = calculateROI();
  const formattedROI = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(roi);

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-8 border border-blue-200">
      <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center">
        Calculate Your Revenue Retention
      </h3>

      <div className="space-y-6 max-w-md mx-auto">
        {/* Monthly Refunds Input */}
        <div>
          <label htmlFor="refunds" className="block text-sm font-medium text-gray-700 mb-2">
            Monthly refund requests
          </label>
          <input
            id="refunds"
            type="number"
            min="0"
            step="10"
            value={monthlyRefunds}
            onChange={(e) => setMonthlyRefunds(Math.max(0, parseInt(e.target.value) || 0))}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
          />
        </div>

        {/* Average Order Value Input */}
        <div>
          <label htmlFor="aov" className="block text-sm font-medium text-gray-700 mb-2">
            Average order value ($)
          </label>
          <input
            id="aov"
            type="number"
            min="0"
            step="5"
            value={averageOrderValue}
            onChange={(e) => setAverageOrderValue(Math.max(0, parseInt(e.target.value) || 0))}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
          />
        </div>

        {/* Result */}
        <div className="bg-white rounded-lg p-6 shadow-md border-2 border-blue-500">
          <div className="text-center">
            <p className="text-sm font-medium text-gray-600 mb-2">You could retain</p>
            <p className="text-4xl font-bold text-blue-600 mb-2">{formattedROI}</p>
            <p className="text-sm text-gray-600">per month with Pleero</p>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-200">
            <p className="text-xs text-gray-500 text-center">
              Based on 15% offer acceptance rate × 10% bonus
            </p>
          </div>
        </div>

        {/* Assumptions */}
        <div className="text-xs text-gray-600 space-y-1">
          <p>• Assumes 15% of customers accept store credit offers (industry average)</p>
          <p>• 10% bonus on accepted offers (default Pleero setting)</p>
          <p>• Net of $99/month subscription fee</p>
        </div>
      </div>
    </div>
  );
}
