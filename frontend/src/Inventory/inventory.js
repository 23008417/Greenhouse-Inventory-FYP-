import React from 'react';
import { 
  Search, Filter, ArrowUpDown, Plus, Download, Sprout
} from 'lucide-react';

const App = () => {
  return (
    <div className="min-h-screen bg-[#F9FAFB] p-8 font-sans text-slate-900 flex justify-center">
      <div className="w-full max-w-[1200px]">
        
        {/* Page Title */}
        <div className="flex items-center gap-3 mb-6">
          <Sprout className="w-7 h-7 text-slate-900" strokeWidth={2} />
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Inventory</h1>
        </div>

        {/* Main Content Card */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden flex flex-col">
          
          {/* Top Toolbar - Disabled State */}
          <div className="px-6 py-4 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-4">
            {/* Search Bar (Disabled) */}
            <div className="relative w-full sm:w-80 cursor-not-allowed">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input 
                type="text" 
                disabled
                placeholder="Search plants" 
                className="w-full pl-10 pr-4 py-2 bg-[#F2F2F2] border border-[#D1D1D1] rounded text-sm text-gray-400 placeholder-gray-400 focus:outline-none cursor-not-allowed"
              />
            </div>
            
            {/* Action Buttons (Disabled) */}
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button disabled className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-[#F2F2F2] border border-[#D1D1D1] rounded text-sm font-normal text-gray-400 cursor-not-allowed">
                <Filter size={16} className="text-gray-400" /> Filter
              </button>
              <button disabled className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-[#F2F2F2] border border-[#D1D1D1] rounded text-sm font-normal text-gray-400 cursor-not-allowed">
                <ArrowUpDown size={16} className="text-gray-400" /> Sort
              </button>
            </div>
          </div>

          {/* Empty State Content */}
          <div className="flex flex-col justify-start px-8 md:px-16 pt-12 pb-16">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-12 w-full">
              
              {/* Left Text Content */}
              <div className="flex-1 w-full max-w-lg text-left">
                <h2 className="text-2xl font-semibold text-slate-900 mb-3">Add your plants</h2>
                <p className="text-slate-500 text-base mb-8 leading-normal max-w-sm">
                  Start by filling your greenhouse with plants you’re growing and tracking.
                </p>
                
                <div className="flex items-center gap-3">
                  <button className="flex items-center gap-2 px-5 py-2.5 bg-[#108A57] hover:bg-[#0e7a4d] text-white rounded text-sm font-medium shadow-sm transition-colors">
                    <Plus size={18} /> Add plant
                  </button>
                  <button className="flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-200 hover:bg-gray-50 text-slate-600 rounded text-sm font-medium shadow-sm transition-colors">
                    <Download size={18} /> Import
                  </button>
                </div>
              </div>

              {/* Right Image Grid */}
              <div className="flex-1 w-full max-w-[400px] flex justify-end">
                <div className="grid grid-cols-2 gap-4 w-full">
                  {/* Basil */}
                  <div className="aspect-[4/3] bg-[#F9FAFB] rounded-lg overflow-hidden p-4 flex items-center justify-center">
                    <img 
                      src="https://images.unsplash.com/photo-1618375569909-3c8616cf7733?auto=format&fit=crop&w=400&q=80" 
                      alt="Basil" 
                      className="w-full h-full object-contain mix-blend-multiply"
                    />
                  </div>
                  
                  {/* Bok Choy */}
                  <div className="aspect-[4/3] bg-[#F9FAFB] rounded-lg overflow-hidden p-4 flex items-center justify-center">
                    <img 
                      src="https://images.unsplash.com/photo-1627308595229-7830a5c91f9f?auto=format&fit=crop&w=400&q=80" 
                      alt="Bok Choy" 
                      className="w-full h-full object-contain mix-blend-multiply"
                    />
                  </div>

                  {/* Strawberries */}
                  <div className="aspect-[4/3] bg-[#F9FAFB] rounded-lg overflow-hidden p-4 flex items-center justify-center">
                    <img 
                      src="https://images.unsplash.com/photo-1518635017498-87f514b751ba?auto=format&fit=crop&w=400&q=80" 
                      alt="Strawberries" 
                      className="w-full h-full object-contain mix-blend-multiply"
                    />
                  </div>

                  {/* Peppers */}
                  <div className="aspect-[4/3] bg-[#F9FAFB] rounded-lg overflow-hidden p-4 flex items-center justify-center">
                    <img 
                      src="https://images.unsplash.com/photo-1563565375-f3fdf5dec24e?auto=format&fit=crop&w=400&q=80" 
                      alt="Peppers" 
                      className="w-full h-full object-contain mix-blend-multiply"
                    />
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

export default App;