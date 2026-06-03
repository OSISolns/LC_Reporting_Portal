const fs = require('fs');
const file = '/home/noble/Documents/LC_APPS/LC_Reporting_Portal/frontend/src/pages/MasterModule.jsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Add ChevronLeft, ChevronRight
content = content.replace(
  "import { Database, Package, Scale, Truck, DollarSign, Plus, RefreshCw, Loader2, ArrowLeft, Building2, Edit2, Trash2, X, AlertTriangle } from 'lucide-react';",
  "import { Database, Package, Scale, Truck, DollarSign, Plus, RefreshCw, Loader2, ArrowLeft, Building2, Edit2, Trash2, X, AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react';"
);

// 2. Add state and effect
const stateToAdd = `
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 25;

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, searchTerm]);

  const renderPagination = (totalItems) => {
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    if (totalPages <= 1) return null;

    return (
      <div className="flex justify-between items-center px-6 py-4 border-t border-slate-100 bg-slate-50/50">
        <span className="text-xs text-slate-500 font-bold">
          Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems} entries
        </span>
        <div className="flex gap-2">
          <button 
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 disabled:opacity-50 hover:bg-slate-50 transition-colors"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="text-xs font-bold text-slate-700 px-3 py-1.5 bg-white border border-slate-200 rounded-lg">
            Page {currentPage} of {totalPages}
          </span>
          <button 
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
            className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 disabled:opacity-50 hover:bg-slate-50 transition-colors"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    );
  };
`;
content = content.replace(
  "const [searchTerm, setSearchTerm] = useState('');",
  "const [searchTerm, setSearchTerm] = useState('');\n" + stateToAdd
);

// 3. Replace items table
content = content.replace(
  /\{items\s*\.filter\(([\s\S]*?)\)\s*\.map\(\(item, idx\) => \(([\s\S]*?)\)\)\}/,
  `{(() => {
                          const filtered = items.filter($1);
                          const paginated = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
                          return (
                            <>
                              {paginated.map((item, idx) => ($2))}
                            </>
                          );
                        })()}`
);

// Add pagination under items table
content = content.replace(
  /<\/table>\s*<\/div>\s*<\/div>\s*\)}/g,
  (match, offset, string) => {
    // We only want to replace the first one (Items) differently?
    // Actually let's just do it for all using a function.
    return match;
  }
);

// Let's use a simpler regex for each tab to inject pagination below the table div.
content = content.replace(
  /(<div className="overflow-x-auto p-6">[\s\S]*?<\/table>\s*<\/div>)/g,
  `$1\n                  {(() => {
                    const dataMap = {
                      'items': items,
                      'departments': departments,
                      'uoms': uoms,
                      'vendors': vendors,
                      'prices': prices
                    };
                    let filtered = dataMap[activeTab] || [];
                    if (activeTab === 'items') filtered = filtered.filter(item => item.name?.toLowerCase().includes(searchTerm.toLowerCase()) || item.sku?.toLowerCase().includes(searchTerm.toLowerCase()) || item.category?.toLowerCase().includes(searchTerm.toLowerCase()));
                    else if (activeTab === 'departments') filtered = filtered.filter(dept => dept.name?.toLowerCase().includes(searchTerm.toLowerCase()));
                    else if (activeTab === 'uoms') filtered = filtered.filter(u => u.name?.toLowerCase().includes(searchTerm.toLowerCase()) || u.abbreviation?.toLowerCase().includes(searchTerm.toLowerCase()));
                    else if (activeTab === 'vendors') filtered = filtered.filter(v => v.name?.toLowerCase().includes(searchTerm.toLowerCase()) || v.contact?.toLowerCase().includes(searchTerm.toLowerCase()));
                    else if (activeTab === 'prices') filtered = filtered.filter(p => (p.item_name || p.name)?.toLowerCase().includes(searchTerm.toLowerCase()));
                    return renderPagination(filtered.length);
                  })()}`
);

// Update maps for all other tabs too
content = content.replace(
  /\{departments\s*\.filter\(([\s\S]*?)\)\s*\.map\(\(dept, idx\) => \(([\s\S]*?)\)\)\}/,
  `{(() => {
                          const filtered = departments.filter($1);
                          const paginated = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
                          return (
                            <>
                              {paginated.map((dept, idx) => ($2))}
                            </>
                          );
                        })()}`
);

content = content.replace(
  /\{uoms\s*\.filter\(([\s\S]*?)\)\s*\.map\(\(u, idx\) => \(([\s\S]*?)\)\)\}/,
  `{(() => {
                          const filtered = uoms.filter($1);
                          const paginated = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
                          return (
                            <>
                              {paginated.map((u, idx) => ($2))}
                            </>
                          );
                        })()}`
);

content = content.replace(
  /\{vendors\s*\.filter\(([\s\S]*?)\)\s*\.map\(\(v, idx\) => \(([\s\S]*?)\)\)\}/,
  `{(() => {
                          const filtered = vendors.filter($1);
                          const paginated = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
                          return (
                            <>
                              {paginated.map((v, idx) => ($2))}
                            </>
                          );
                        })()}`
);

content = content.replace(
  /\{prices\s*\.filter\(([\s\S]*?)\)\s*\.map\(\(p, idx\) => \(([\s\S]*?)\)\)\}/,
  `{(() => {
                          const filtered = prices.filter($1);
                          const paginated = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
                          return (
                            <>
                              {paginated.map((p, idx) => ($2))}
                            </>
                          );
                        })()}`
);

fs.writeFileSync(file, content);
console.log("Done");
