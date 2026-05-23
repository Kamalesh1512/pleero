'use client';

import { useState } from 'react';

export default function ROICalculator() {
  const [monthlyRefunds, setMonthlyRefunds] = useState(250);
  const [averageOrderValue, setAverageOrderValue] = useState(75);

  // 15% acceptance rate × 10% bonus, net of $99/mo subscription
  const roi = Math.max(0, monthlyRefunds * averageOrderValue * 0.15 * 1.1 - 99);
  const formattedROI = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(roi);

  return (
    <div className="space-y-5 max-w-md mx-auto">
      <div>
        <label htmlFor="refunds" className="block text-[13px] font-medium text-[#374151] mb-2">
          Monthly refund requests
        </label>
        <input
          id="refunds"
          type="number"
          min="0"
          step="10"
          value={monthlyRefunds}
          onChange={(e) => setMonthlyRefunds(Math.max(0, parseInt(e.target.value) || 0))}
          className="w-full px-4 py-3 border-[1.5px] border-black/[0.12] rounded-[10px] text-[15px] text-[#0B0C0E] focus:outline-none focus:border-[#0B0C0E] transition-colors"
        />
      </div>

      <div>
        <label htmlFor="aov" className="block text-[13px] font-medium text-[#374151] mb-2">
          Average order value ($)
        </label>
        <input
          id="aov"
          type="number"
          min="0"
          step="5"
          value={averageOrderValue}
          onChange={(e) => setAverageOrderValue(Math.max(0, parseInt(e.target.value) || 0))}
          className="w-full px-4 py-3 border-[1.5px] border-black/[0.12] rounded-[10px] text-[15px] text-[#0B0C0E] focus:outline-none focus:border-[#0B0C0E] transition-colors"
        />
      </div>

      {/* Result */}
      <div className="bg-[#F0FDF4] rounded-xl p-5 sm:p-6 border-2 border-[#86EFAC]">
        <div className="text-center">
          <p className="text-[13px] font-medium text-[#6B7280] mb-1.5">You could retain</p>
          <p className="font-mono-brand text-[36px] sm:text-[42px] font-bold text-[#16A34A] mb-1.5">
            {formattedROI}
          </p>
          <p className="text-[13px] text-[#6B7280]">per month with Pleero</p>
        </div>
        <div className="mt-4 pt-4 border-t border-[#86EFAC]/60">
          <p className="text-[11px] text-[#6B7280] text-center">
            Based on 15% offer acceptance rate × 10% bonus
          </p>
        </div>
      </div>

      {/* Assumptions */}
      <div className="text-[12px] text-[#6B7280] space-y-1">
        <p>• Assumes 15% of customers accept store credit offers (industry average)</p>
        <p>• 10% bonus on accepted offers (default Pleero setting)</p>
        <p>• Net of $99/month subscription fee</p>
      </div>
    </div>
  );
}
