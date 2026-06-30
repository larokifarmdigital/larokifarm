'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

/**
 * Form de filtros del historial. Persiste todo en la URL para que sea
 * enlazable y para que el Server Component re-renderice con los datos
 * filtrados al cambiar searchParams.
 */
export function HistoryFilters({ showBusinessFilter }: { showBusinessFilter: boolean }) {
  const router = useRouter();
  const sp = useSearchParams();

  const [desde, setDesde] = useState(sp.get('desde') ?? '');
  const [hasta, setHasta] = useState(sp.get('hasta') ?? '');
  const [estado, setEstado] = useState(sp.get('estado') ?? '');
  const [proveedor, setProveedor] = useState(sp.get('proveedor') ?? '');
  const [businessSlug, setBusinessSlug] = useState(sp.get('business') ?? '');

  // Si la URL cambia desde fuera (paginación), refresca el formulario.
  useEffect(() => {
    setDesde(sp.get('desde') ?? '');
    setHasta(sp.get('hasta') ?? '');
    setEstado(sp.get('estado') ?? '');
    setProveedor(sp.get('proveedor') ?? '');
    setBusinessSlug(sp.get('business') ?? '');
  }, [sp]);

  function applyFilters(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (desde) params.set('desde', desde);
    if (hasta) params.set('hasta', hasta);
    if (estado) params.set('estado', estado);
    if (proveedor.trim()) params.set('proveedor', proveedor.trim());
    if (businessSlug.trim()) params.set('business', businessSlug.trim());
    // Reset page al filtrar
    params.delete('page');
    router.push(`/historial?${params.toString()}`);
  }

  function clearFilters() {
    setDesde('');
    setHasta('');
    setEstado('');
    setProveedor('');
    setBusinessSlug('');
    router.push('/historial');
  }

  return (
    <form
      onSubmit={applyFilters}
      className="grid grid-cols-1 gap-3 rounded-md border border-gray-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-6"
    >
      <label className="text-sm">
        <span className="block text-gray-600">Desde</span>
        <input
          type="date"
          value={desde}
          onChange={(e) => setDesde(e.target.value)}
          className="mt-1 w-full rounded border border-gray-300 px-2 py-1"
        />
      </label>
      <label className="text-sm">
        <span className="block text-gray-600">Hasta</span>
        <input
          type="date"
          value={hasta}
          onChange={(e) => setHasta(e.target.value)}
          className="mt-1 w-full rounded border border-gray-300 px-2 py-1"
        />
      </label>
      <label className="text-sm">
        <span className="block text-gray-600">Estado</span>
        <select
          value={estado}
          onChange={(e) => setEstado(e.target.value)}
          className="mt-1 w-full rounded border border-gray-300 px-2 py-1"
        >
          <option value="">Todos</option>
          <option value="OK">OK</option>
          <option value="DISCREPANCIAS">Discrepancias</option>
          <option value="ERROR">Error</option>
        </select>
      </label>
      <label className="text-sm">
        <span className="block text-gray-600">Proveedor</span>
        <input
          type="text"
          value={proveedor}
          onChange={(e) => setProveedor(e.target.value)}
          placeholder="Nestlé, Peroxfarma…"
          className="mt-1 w-full rounded border border-gray-300 px-2 py-1"
        />
      </label>
      {showBusinessFilter && (
        <label className="text-sm">
          <span className="block text-gray-600">Negocio (slug)</span>
          <input
            type="text"
            value={businessSlug}
            onChange={(e) => setBusinessSlug(e.target.value)}
            placeholder="larokifarm"
            className="mt-1 w-full rounded border border-gray-300 px-2 py-1"
          />
        </label>
      )}
      <div className="flex items-end gap-2">
        <button
          type="submit"
          className="rounded-md bg-blue-600 px-3 py-1 text-sm font-medium text-white hover:bg-blue-700"
        >
          Filtrar
        </button>
        <button
          type="button"
          onClick={clearFilters}
          className="rounded-md border border-gray-300 px-3 py-1 text-sm text-gray-700 hover:bg-gray-50"
        >
          Limpiar
        </button>
      </div>
    </form>
  );
}
