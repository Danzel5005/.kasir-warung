import { useState, useEffect, useCallback, useMemo } from 'react';
import { dataApi } from '../services/api';
import { formatCurrency, formatDateTime, formatRelativeTime, getPaymentLabel } from '../utils/formatters';

export default function RiwayatView({ user }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [filters, setFilters] = useState({ startDate: '', endDate: '', limit: 500 });
  const [search, setSearch] = useState('');
  const [selectedTrx, setSelectedTrx] = useState(null);

  const load = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const result = await dataApi.getRiwayat(filters);
      setData(result);
      setError(null);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load history');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    load(true);
    const interval = setInterval(() => load(false), 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [load]);

  const transactions = data?.data || [];

  // Client-side search filter
  const filteredTransactions = useMemo(() => {
    if (!search.trim()) return transactions;
    const q = search.toLowerCase();
    return transactions.filter(t => {
      return (
        String(t.id || '').toLowerCase().includes(q) ||
        String(t.metodeBayar || '').toLowerCase().includes(q) ||
        String(t.customerNama || t.customer || t.pelanggan || '').toLowerCase().includes(q) ||
        String(t.total || '').includes(q)
      );
    });
  }, [transactions, search]);

  const handleFilterChange = (newFilters) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading transaction history...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-red-800 mb-2">Error Loading Data</h3>
        <p className="text-red-600">{error}</p>
        <button
          onClick={() => load(true)}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Riwayat Transaksi</h1>
          <p className="text-gray-500 text-sm mt-1">
            {filteredTransactions.length} transaksi • Last updated: {lastUpdated ? formatRelativeTime(lastUpdated) : '-'}
          </p>
        </div>
        <button
          onClick={() => load(false)}
          className="mt-3 sm:mt-0 inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Dari Tanggal</label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => handleFilterChange({ startDate: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Sampai Tanggal</label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => handleFilterChange({ endDate: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Cari</label>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ID, metode, dll..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={() => {
                setFilters({ startDate: '', endDate: '', limit: 500 });
                setSearch('');
              }}
              className="w-full px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200 transition-colors"
            >
              Reset Filter
            </button>
          </div>
        </div>
      </div>

      {/* Transaction List */}
      <div className="space-y-3">
        {filteredTransactions.length > 0 ? (
          filteredTransactions.map((trx) => (
            <TransactionCard
              key={trx.id}
              transaction={trx}
              onClick={() => setSelectedTrx(trx)}
            />
          ))
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-gray-500">Tidak ada transaksi ditemukan</p>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedTrx && (
        <TransactionModal transaction={selectedTrx} onClose={() => setSelectedTrx(null)} />
      )}
    </div>
  );
}

function TransactionCard({ transaction, onClick }) {
  const isVoid = transaction.status === 'voided' || transaction.voided === true;
  const itemCount = (transaction.items || []).length;

  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-lg border p-4 cursor-pointer transition-all hover:shadow-md ${
        isVoid ? 'border-red-200 opacity-75' : 'border-gray-200 hover:border-blue-300'
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`px-2 py-1 rounded text-xs font-semibold ${
              isVoid ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
            }`}>
              TRX #{String(transaction.id).substring(0, 8)}
            </span>
            <span className="px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-700">
              {getPaymentLabel(transaction.metodeBayar)}
            </span>
            {isVoid && (
              <span className="px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-700">
                VOID
              </span>
            )}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500">
            <span>🕐 {formatDateTime(transaction.createdAt || transaction.date)}</span>
            <span>📦 {itemCount} item</span>
            {transaction.shiftInfo && (
              <span>👤 {transaction.shiftInfo.operator || 'N/A'}</span>
            )}
          </div>
        </div>
        <div className="text-right">
          <p className="text-lg font-bold text-gray-800">
            {formatCurrency(transaction.total)}
          </p>
          {transaction.paid != null && Number(transaction.paid) !== Number(transaction.total) && (
            <p className="text-xs text-gray-500">
              Dibayar: {formatCurrency(transaction.paid)}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function TransactionModal({ transaction, onClose }) {
  const items = transaction.items || [];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-200 sticky top-0 bg-white">
          <div>
            <h3 className="text-lg font-semibold text-gray-800">
              Detail Transaksi
            </h3>
            <p className="text-sm text-gray-500">TRX #{String(transaction.id).substring(0, 12)}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4">
          {/* Info */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-500">Waktu</p>
              <p className="font-medium text-gray-800">{formatDateTime(transaction.createdAt)}</p>
            </div>
            <div>
              <p className="text-gray-500">Metode Bayar</p>
              <p className="font-medium text-gray-800">{getPaymentLabel(transaction.metodeBayar)}</p>
            </div>
            <div>
              <p className="text-gray-500">Status</p>
              <p className={`font-medium ${transaction.status === 'voided' ? 'text-red-600' : 'text-green-600'}`}>
                {transaction.status === 'voided' ? 'VOID' : 'Selesai'}
              </p>
            </div>
            <div>
              <p className="text-gray-500">Operator</p>
              <p className="font-medium text-gray-800">{transaction.shiftInfo?.operator || '-'}</p>
            </div>
          </div>

          {/* Items */}
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-2">Item ({items.length})</h4>
            <div className="space-y-2">
              {items.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{item.nama || item.name || 'Unknown'}</p>
                    <p className="text-xs text-gray-500">
                      {item.qty} × {formatCurrency(item.harga || item.price || 0)}
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-gray-700">
                    {formatCurrency((item.harga || item.price || 0) * (item.qty || 0))}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Totals */}
          <div className="border-t border-gray-200 pt-4 space-y-2">
            {transaction.subtotal != null && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Subtotal</span>
                <span className="text-gray-800">{formatCurrency(transaction.subtotal)}</span>
              </div>
            )}
            <div className="flex justify-between text-lg font-bold">
              <span className="text-gray-800">Total</span>
              <span className="text-green-600">{formatCurrency(transaction.total)}</span>
            </div>
            {transaction.paid != null && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Dibayar</span>
                <span className="text-gray-800">{formatCurrency(transaction.paid)}</span>
              </div>
            )}
            {transaction.kembalian != null && Number(transaction.kembalian) > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Kembalian</span>
                <span className="text-gray-800">{formatCurrency(transaction.kembalian)}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
